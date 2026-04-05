// ============================================================
// pages/transfer.js – Transfer goods to employee warehouse
// ============================================================

PAGES['transfer'] = {
  _products: [],
  _centralWarehouses: [],
  _employeeWarehouses: [],
  _centralStock: [],
  _items: [],

  async render() {
    const el = document.getElementById('page-transfer');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">เบิกสินค้า</h2>
          <p class="page-subtitle">โอนสินค้าจากคลังกลางไปคลังพนักงาน</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">ข้อมูลการเบิก</div>
          <div class="form-group"><label>คลังต้นทาง (คลังกลาง) *</label>
            <select id="tr-from" onchange="PAGES.transfer.loadCentralStock()">
              <option value="">-- เลือกคลังต้นทาง --</option>
            </select>
          </div>
          <div class="form-group"><label>คลังปลายทาง (คลังพนักงาน) *</label>
            <select id="tr-to">
              <option value="">-- เลือกคลังพนักงาน --</option>
            </select>
          </div>
          <div class="form-group"><label>วันที่</label>
            <input type="date" id="tr-date" value="${UI.todayISO()}" />
          </div>
          <div class="form-group"><label>หมายเหตุ</label>
            <textarea id="tr-note" rows="2" placeholder="หมายเหตุ..."></textarea>
          </div>
        </div>
        <div class="card">
          <div class="card-title">เลือกสินค้า</div>
          <div class="form-group"><label>สินค้า (จากคลังต้นทาง)</label>
            <select id="tr-product" onchange="PAGES.transfer.onProductChange()">
              <option value="">-- เลือกสินค้าก่อน --</option>
            </select>
          </div>
          <div id="tr-stock-info" style="margin-bottom:12px"></div>
          <div class="form-group"><label>จำนวนที่ต้องการเบิก *</label>
            <div class="qty-control">
              <button class="qty-btn" onclick="PAGES.transfer.adjustQty(-1)">−</button>
              <input type="number" id="tr-qty" class="qty-input" value="1" min="1" />
              <button class="qty-btn" onclick="PAGES.transfer.adjustQty(1)">+</button>
            </div>
          </div>
          <button class="btn btn-accent btn-full" onclick="PAGES.transfer.addItem()"><span class="material-icons">add</span> เพิ่มรายการ</button>
        </div>
      </div>

      <div class="card mt-16">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="card-title" style="margin:0">รายการที่จะเบิก</div>
          <button class="btn btn-primary" onclick="PAGES.transfer.submit()"><span class="material-icons">check_circle</span> ยืนยันการเบิก</button>
        </div>
        <div id="tr-items-list">
          ${UI.emptyState('swap_horiz', 'ยังไม่มีรายการ', 'เลือกสินค้าและจำนวนที่ต้องการเบิก')}
        </div>
      </div>
    `;
    await this.loadData();
  },

  async loadData() {
    try {
      const [pr, whr] = await Promise.all([API.getProducts(), API.getWarehouses()]);
      this._products = pr.products || [];
      this._centralWarehouses = (whr.warehouses || []).filter(w => w.type === 'central');
      this._employeeWarehouses = (whr.warehouses || []).filter(w => w.type === 'employee');
      this._items = [];

      const selFrom = document.getElementById('tr-from');
      if (selFrom) selFrom.innerHTML = '<option value="">-- เลือกคลังต้นทาง --</option>' +
        this._centralWarehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

      const selTo = document.getElementById('tr-to');
      if (selTo) selTo.innerHTML = '<option value="">-- เลือกคลังพนักงาน --</option>' +
        this._employeeWarehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    } catch(e) { UI.toast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error'); }
  },

  async loadCentralStock() {
    const whId = document.getElementById('tr-from')?.value;
    if (!whId) return;
    try {
      const res = await API.getCentralStock(whId);
      this._centralStock = res.stock || [];
      const sel = document.getElementById('tr-product');
      if (sel) sel.innerHTML = '<option value="">-- เลือกสินค้า --</option>' +
        this._centralStock.map(s => `<option value="${s.productId}" data-qty="${s.qty}">${s.product?.name || s.productId} (คงเหลือ: ${s.qty} ${s.product?.unit||''})</option>`).join('');
    } catch(e) { UI.toast('โหลดสต็อกไม่สำเร็จ: ' + e.message, 'error'); }
  },

  onProductChange() {
    const sel = document.getElementById('tr-product');
    const opt = sel?.options[sel.selectedIndex];
    const maxQty = parseInt(opt?.dataset.qty) || 0;
    const infoEl = document.getElementById('tr-stock-info');
    if (!sel?.value) { if (infoEl) infoEl.innerHTML = ''; return; }
    if (infoEl) infoEl.innerHTML = `<div class="alert alert-info"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">inventory_2</span>คงเหลือในคลัง: <strong>${UI.currency(maxQty, 0)} หน่วย</strong></div>`;
    const qtyEl = document.getElementById('tr-qty');
    if (qtyEl) { qtyEl.max = maxQty; qtyEl.value = Math.min(1, maxQty); }
  },

  adjustQty(delta) {
    const el = document.getElementById('tr-qty');
    if (!el) return;
    const newVal = Math.max(1, (parseInt(el.value) || 0) + delta);
    el.value = newVal;
  },

  addItem() {
    const productId = document.getElementById('tr-product')?.value;
    const qty = parseInt(document.getElementById('tr-qty')?.value) || 0;
    if (!productId) return UI.toast('กรุณาเลือกสินค้า', 'warning');
    if (qty <= 0) return UI.toast('กรุณากรอกจำนวนที่ถูกต้อง', 'warning');
    const stockItem = this._centralStock.find(s => s.productId === productId);
    const maxQty = stockItem?.qty || 0;
    if (qty > maxQty) return UI.toast(`สต็อกไม่พอ (คงเหลือ ${maxQty} หน่วย)`, 'warning');
    const product = this._products.find(p => p.id === productId);
    const existing = this._items.find(i => i.productId === productId);
    if (existing) {
      if (existing.qty + qty > maxQty) return UI.toast(`รวมเกินสต็อก (คงเหลือ ${maxQty} หน่วย)`, 'warning');
      existing.qty += qty;
    } else {
      this._items.push({ productId, qty, unit: product?.unit || 'หน่วย', product, maxQty });
    }
    this.renderItems();
    document.getElementById('tr-product').value = '';
    document.getElementById('tr-qty').value = '1';
    document.getElementById('tr-stock-info').innerHTML = '';
  },

  removeItem(idx) { this._items.splice(idx, 1); this.renderItems(); },

  renderItems() {
    const el = document.getElementById('tr-items-list');
    if (!this._items.length) {
      el.innerHTML = UI.emptyState('swap_horiz', 'ยังไม่มีรายการ', 'เลือกสินค้าและจำนวนที่ต้องการเบิก');
      return;
    }
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>สินค้า</th><th class="td-right">จำนวน</th><th>หน่วย</th><th></th></tr></thead>
        <tbody>
          ${this._items.map((item, i) => `
            <tr>
              <td>${i+1}</td>
              <td class="td-bold">${item.product?.name || item.productId}</td>
              <td class="td-right">${UI.currency(item.qty, 0)}</td>
              <td>${item.unit}</td>
              <td><button class="btn btn-danger btn-xs" onclick="PAGES.transfer.removeItem(${i})"><span class="material-icons">close</span></button></td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>
    `;
  },

  async submit() {
    const fromId = document.getElementById('tr-from')?.value;
    const toId = document.getElementById('tr-to')?.value;
    if (!fromId) return UI.toast('กรุณาเลือกคลังต้นทาง', 'warning');
    if (!toId) return UI.toast('กรุณาเลือกคลังพนักงาน', 'warning');
    if (!this._items.length) return UI.toast('กรุณาเพิ่มรายการ', 'warning');
    try {
      UI.loading(true);
      await API.transferToEmployee({
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        date: document.getElementById('tr-date')?.value,
        note: document.getElementById('tr-note')?.value,
        items: this._items.map(i => ({ productId: i.productId, qty: i.qty, unit: i.unit })),
      });
      UI.toast('เบิกสินค้าเรียบร้อย ✅', 'success');
      this._items = [];
      this.renderItems();
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
