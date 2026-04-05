// ============================================================
// pages/receive-goods.js – Receive goods into central warehouse
// ============================================================

PAGES['receive-goods'] = {
  _products: [],
  _warehouses: [],
  _items: [],

  async render() {
    const el = document.getElementById('page-receive-goods');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">รับสินค้าเข้าคลัง</h2>
          <p class="page-subtitle">บันทึกสินค้าที่รับเข้าคลังกลาง</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">ข้อมูลการรับสินค้า</div>
          <div class="form-group"><label>คลังที่รับสินค้า *</label>
            <select id="rg-warehouse"><option value="">-- เลือกคลัง --</option></select>
          </div>
          <div class="form-group"><label>วันที่รับ</label>
            <input type="date" id="rg-date" value="${UI.todayISO()}" />
          </div>
          <div class="form-group"><label>เลขที่เอกสาร (ใบส่งของ)</label>
            <input type="text" id="rg-docno" placeholder="เช่น RC2604001" />
          </div>
          <div class="form-group"><label>หมายเหตุ</label>
            <textarea id="rg-note" rows="2" placeholder="หมายเหตุเพิ่มเติม..."></textarea>
          </div>
        </div>
        <div class="card">
          <div class="card-title">เพิ่มรายการสินค้า</div>
          <div class="form-group"><label>เลือกสินค้า</label>
            <select id="rg-product" onchange="PAGES['receive-goods'].onProductChange()">
              <option value="">-- เลือกสินค้า --</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group"><label>จำนวน (กล่อง/ลัง)</label>
              <input type="number" id="rg-cases" min="0" value="0" oninput="PAGES['receive-goods'].calcQty()" />
            </div>
            <div class="form-group"><label>จำนวน (หน่วย)</label>
              <input type="number" id="rg-units" min="0" value="0" oninput="PAGES['receive-goods'].calcQty()" />
            </div>
          </div>
          <div class="form-group"><label>รวม (หน่วย)</label>
            <input type="number" id="rg-total" readonly style="background:var(--bg-card2)" />
          </div>
          <div class="form-group"><label>ราคาต้นทุน/หน่วย (VAT)</label>
            <input type="number" id="rg-cost" step="0.01" placeholder="0.00" />
          </div>
          <button class="btn btn-accent btn-full" onclick="PAGES['receive-goods'].addItem()"><span class="material-icons">add</span> เพิ่มรายการ</button>
        </div>
      </div>

      <!-- Items list -->
      <div class="card mt-16">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="card-title" style="margin:0">รายการสินค้าที่รับ</div>
          <button class="btn btn-primary" onclick="PAGES['receive-goods'].submit()" id="rg-submit-btn"><span class="material-icons">save</span> บันทึกรับสินค้า</button>
        </div>
        <div id="rg-items-list">
          ${UI.emptyState('move_to_inbox', 'ยังไม่มีรายการ', 'เพิ่มสินค้าจากฝั่งซ้ายก่อน')}
        </div>
      </div>
    `;
    await this.loadData();
  },

  async loadData() {
    try {
      const [pr, whr] = await Promise.all([API.getProducts(), API.getWarehouses()]);
      this._products = pr.products || [];
      this._warehouses = (whr.warehouses || []).filter(w => w.type === 'central');
      this._items = [];

      const selWh = document.getElementById('rg-warehouse');
      if (selWh) selWh.innerHTML = '<option value="">-- เลือกคลัง --</option>' +
        this._warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

      const selProd = document.getElementById('rg-product');
      if (selProd) selProd.innerHTML = '<option value="">-- เลือกสินค้า --</option>' +
        this._products.map(p => `<option value="${p.id}" data-upc="${p.unitsPerCase}" data-cost="${p.costVat}">${p.code} – ${p.name}</option>`).join('');
    } catch(e) {
      UI.toast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error');
    }
  },

  onProductChange() {
    const sel = document.getElementById('rg-product');
    const opt = sel?.options[sel.selectedIndex];
    if (opt) {
      const cost = opt.dataset.cost || '';
      const costEl = document.getElementById('rg-cost');
      if (costEl) costEl.value = cost;
      this.calcQty();
    }
  },

  calcQty() {
    const sel = document.getElementById('rg-product');
    const opt = sel?.options[sel?.selectedIndex];
    const upc = parseInt(opt?.dataset.upc) || 1;
    const cases = parseInt(document.getElementById('rg-cases')?.value) || 0;
    const units = parseInt(document.getElementById('rg-units')?.value) || 0;
    const total = cases * upc + units;
    const el = document.getElementById('rg-total');
    if (el) el.value = total;
  },

  addItem() {
    const productId = document.getElementById('rg-product')?.value;
    const total = parseInt(document.getElementById('rg-total')?.value) || 0;
    const cost = parseFloat(document.getElementById('rg-cost')?.value) || 0;
    if (!productId) return UI.toast('กรุณาเลือกสินค้า', 'warning');
    if (total <= 0) return UI.toast('กรุณากรอกจำนวนที่ถูกต้อง', 'warning');
    const product = this._products.find(p => p.id === productId);
    // Merge if same product
    const existing = this._items.find(i => i.productId === productId);
    if (existing) {
      existing.qty += total;
    } else {
      this._items.push({ productId, qty: total, unit: product?.unit || 'หน่วย', costVat: cost, product });
    }
    this.renderItems();
    // Reset fields
    document.getElementById('rg-product').value = '';
    document.getElementById('rg-cases').value = '0';
    document.getElementById('rg-units').value = '0';
    document.getElementById('rg-total').value = '';
    document.getElementById('rg-cost').value = '';
  },

  removeItem(idx) {
    this._items.splice(idx, 1);
    this.renderItems();
  },

  renderItems() {
    const el = document.getElementById('rg-items-list');
    if (!this._items.length) {
      el.innerHTML = UI.emptyState('move_to_inbox', 'ยังไม่มีรายการ', 'เพิ่มสินค้าจากฝั่งซ้ายก่อน');
      return;
    }
    const total = this._items.reduce((a, i) => a + i.qty * i.costVat, 0);
    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>สินค้า</th><th class="td-right">จำนวน</th><th>หน่วย</th>
            <th class="td-right">ราคา/หน่วย</th><th class="td-right">รวม</th><th></th>
          </tr></thead>
          <tbody>
            ${this._items.map((item, i) => `
              <tr>
                <td>${i+1}</td>
                <td class="td-bold">${item.product?.name || item.productId}</td>
                <td class="td-right">${UI.currency(item.qty, 0)}</td>
                <td>${item.unit}</td>
                <td class="td-right">฿${UI.currency(item.costVat)}</td>
                <td class="td-right fw-bold">฿${UI.currency(item.qty * item.costVat)}</td>
                <td><button class="btn btn-danger btn-xs" onclick="PAGES['receive-goods'].removeItem(${i})"><span class="material-icons">close</span></button></td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg-card2)">
              <td colspan="5" class="td-right fw-bold">มูลค่ารวมทั้งหมด</td>
              <td class="td-right fw-bold text-success">฿${UI.currency(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  async submit() {
    const warehouseId = document.getElementById('rg-warehouse')?.value;
    if (!warehouseId) return UI.toast('กรุณาเลือกคลัง', 'warning');
    if (!this._items.length) return UI.toast('กรุณาเพิ่มรายการสินค้า', 'warning');
    try {
      UI.loading(true);
      await API.receiveGoods({
        warehouseId,
        date: document.getElementById('rg-date')?.value,
        docNo: document.getElementById('rg-docno')?.value,
        note: document.getElementById('rg-note')?.value,
        items: this._items.map(i => ({ productId: i.productId, qty: i.qty, unit: i.unit, costVat: i.costVat })),
      });
      UI.toast('บันทึกรับสินค้าเรียบร้อย ✅', 'success');
      this._items = [];
      this.renderItems();
      document.getElementById('rg-docno').value = '';
      document.getElementById('rg-note').value = '';
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
