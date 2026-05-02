// ============================================================
// pages/order-request.js – Request product orders
// ============================================================

PAGES['order-request'] = {
  _products: [],
  _items: [],
  _orders: [],
  _users: [],

  async render() {
    const el = document.getElementById('page-order-request');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">แจ้งสั่งสินค้า</h2>
          <p class="page-subtitle">แจ้งความต้องการสั่งสินค้าเข้าคลังล่วงหน้า</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">สร้างใบสั่งสินค้า</div>
          <div class="form-group"><label>สินค้า</label>
            <select id="or-product"><option value="">-- เลือกสินค้า --</option></select>
          </div>
          <div class="form-row">
            <div class="form-group"><label>จำนวน (ลัง)</label><input type="number" id="or-cases" value="0" min="0" /></div>
            <div class="form-group"><label>จำนวน (หน่วย)</label><input type="number" id="or-units" value="0" min="0" /></div>
          </div>
          <div class="form-group"><label>วันที่ต้องการ</label>
            <input type="date" id="or-date" value="${getDateStr(3)}" />
          </div>
          <div class="form-group"><label>หมายเหตุ</label>
            <textarea id="or-note" rows="2" placeholder="เหตุผลหรือรายละเอียดเพิ่มเติม..."></textarea>
          </div>
          <button class="btn btn-accent btn-full" onclick="PAGES['order-request'].addItem()"><span class="material-icons">add</span> เพิ่มรายการ</button>

          <div id="or-items-list" class="mt-16"></div>
          <button class="btn btn-primary btn-full mt-8" id="or-submit-btn" onclick="PAGES['order-request'].submit()" style="display:none">
          <span class="material-icons">send</span> ส่งใบสั่งสินค้า
          </button>
        </div>

        <!-- Previous Orders -->
        <div class="card">
          <div class="card-title">ประวัติการสั่ง</div>
          <div id="or-history">${UI.spinner()}</div>
        </div>
      </div>
    `;
    await this.loadData();
  },

  async loadData() {
    try {
      const [pr, or, ur] = await Promise.all([API.getProducts(), API.getOrders(), API.getUsers()]);
      this._products = pr.products || [];
      this._orders = or.orders || [];
      this._users = ur.users || [];
      const sel = document.getElementById('or-product');
      if (sel) sel.innerHTML = '<option value="">-- เลือกสินค้า --</option>' +
        this._products.map(p => `<option value="${p.id}" data-upc="${p.unitsPerCase||1}">${p.code} – ${p.name}</option>`).join('');
      this.renderHistory();
    } catch(e) { UI.toast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error'); }
  },

  addItem() {
    const pid = document.getElementById('or-product')?.value;
    const cases = parseInt(document.getElementById('or-cases')?.value) || 0;
    const units = parseInt(document.getElementById('or-units')?.value) || 0;
    const sel = document.getElementById('or-product');
    const opt = sel?.options[sel.selectedIndex];
    const upc = parseInt(opt?.dataset.upc) || 1;
    const total = cases * upc + units;
    if (!pid) return UI.toast('กรุณาเลือกสินค้า', 'warning');
    if (total <= 0) return UI.toast('กรุณากรอกจำนวน', 'warning');
    const product = this._products.find(p => p.id === pid);
    const existing = this._items.find(i => i.productId === pid);
    if (existing) existing.qty += total;
    else this._items.push({ productId: pid, qty: total, unit: product?.unit || 'หน่วย', product });
    this.renderItems();
    document.getElementById('or-product').value = '';
    document.getElementById('or-cases').value = '0';
    document.getElementById('or-units').value = '0';
  },

  removeItem(idx) { this._items.splice(idx, 1); this.renderItems(); },

  renderItems() {
    const el = document.getElementById('or-items-list');
    const btn = document.getElementById('or-submit-btn');
    if (!this._items.length) {
      el.innerHTML = '';
      if (btn) btn.style.display = 'none';
      return;
    }
    if (btn) btn.style.display = '';
    el.innerHTML = `
      <div class="card-title" style="font-size:0.88rem;margin-bottom:8px">รายการที่จะสั่ง</div>
      <div class="table-wrap">
        <table><thead><tr><th>สินค้า</th><th class="td-right">จำนวน</th><th></th></tr></thead>
        <tbody>
          ${this._items.map((item, i) => `
            <tr>
              <td class="td-bold">${item.product?.name||item.productId}</td>
              <td class="td-right">${UI.currency(item.qty,0)} ${item.unit}</td>
              <td><button class="btn btn-danger btn-xs" onclick="PAGES['order-request'].removeItem(${i})"><span class="material-icons">close</span></button></td>
            </tr>
          `).join('')}
        </tbody>
        </table>
      </div>
    `;
  },

  async submit() {
    if (!this._items.length) return UI.toast('กรุณาเพิ่มรายการสินค้า', 'warning');
    try {
      UI.loading(true);
      await API.orderRequest({
        date: document.getElementById('or-date')?.value,
        note: document.getElementById('or-note')?.value,
        requestedBy: AUTH.getUser()?.displayName,
        items: this._items.map(i => ({ productId: i.productId, qty: i.qty, unit: i.unit })),
      });
      UI.toast('ส่งใบสั่งสินค้าเรียบร้อย ✅', 'success');
      this._items = [];
      this.renderItems();
      document.getElementById('or-note').value = '';
      await this.loadData();
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  },

  renderHistory() {
    const el = document.getElementById('or-history');
    if (!this._orders.length) {
      el.innerHTML = UI.emptyState('add_shopping_cart', 'ยังไม่มีประวัติการสั่ง', '');
      return;
    }
    el.innerHTML = this._orders.slice(0, 20).map(o => `
      <div class="card mb-8" style="padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">
          <div style="display:flex;align-items:center;gap:10px">
            ${(() => {
              const u = this._users.find(ux => ux.displayName === o.requestedBy || ux.username === o.requestedBy);
              return UI.avatar(u?.avatar, o.requestedBy, 32);
            })()}
            <div>
              <div class="fw-bold" style="font-size:0.88rem">${UI.dateStr(o.date)}</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">โดย ${o.requestedBy || '-'}</div>
            </div>
          </div>
          <span class="badge ${o.status === 'approved' ? 'badge-green' : o.status === 'rejected' ? 'badge-red' : 'badge-yellow'}">
            ${o.status === 'approved' ? '<span class="material-icons" style="font-size:12px;vertical-align:middle">check_circle</span> อนุมัติ' : o.status === 'rejected' ? '<span class="material-icons" style="font-size:12px;vertical-align:middle">cancel</span> ปฏิเสธ' : '<span class="material-icons" style="font-size:12px;vertical-align:middle">schedule</span> รอ'}
          </span>
        </div>
        ${o.note ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">${o.note}</div>` : ''}
      </div>
    `).join('');
  }
};
