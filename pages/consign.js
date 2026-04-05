// ============================================================
// pages/consign.js – Consign goods back from employee
// ============================================================

PAGES['consign'] = {
  _employeeWarehouses: [],
  _employeeStock: [],
  _items: [],
  _selectedWh: '',

  async render() {
    const el = document.getElementById('page-consign');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">รับฝากสินค้ากลับ</h2>
          <p class="page-subtitle">บันทึกสินค้าที่พนักงานฝากคืน (ยกไปวันถัดไป)</p>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">ข้อมูล</div>
          <div class="form-group"><label>คลังพนักงาน *</label>
            <select id="co-wh" onchange="PAGES.consign.loadEmpStock(this.value)">
              <option value="">-- เลือกพนักงาน --</option>
            </select>
          </div>
          <div class="form-group"><label>วันที่</label>
            <input type="date" id="co-date" value="${UI.todayISO()}" />
          </div>
          <div class="form-group"><label>หมายเหตุ</label>
            <textarea id="co-note" rows="2" placeholder="เหตุผลการฝาก..."></textarea>
          </div>
        </div>
        <div class="card">
          <div class="card-title">เพิ่มรายการฝาก</div>
          <div class="form-group"><label>สินค้า</label>
            <select id="co-product">
              <option value="">-- เลือกคลังพนักงานก่อน --</option>
            </select>
          </div>
          <div class="form-group"><label>จำนวนที่ฝาก *</label>
            <div class="qty-control">
              <button class="qty-btn" onclick="PAGES.consign.adjustQty(-1)">−</button>
              <input type="number" id="co-qty" class="qty-input" value="1" min="1" />
              <button class="qty-btn" onclick="PAGES.consign.adjustQty(1)">+</button>
            </div>
          </div>
          <button class="btn btn-warning btn-full" onclick="PAGES.consign.addItem()"><span class="material-icons">add</span> เพิ่มรายการ</button>
        </div>
      </div>

      <div class="card mt-16">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="card-title" style="margin:0">รายการที่ฝาก</div>
          <button class="btn btn-primary" onclick="PAGES.consign.submit()"><span class="material-icons">check_circle</span> บันทึกการฝาก</button>
        </div>
        <div id="co-items-list">
          ${UI.emptyState('undo', 'ยังไม่มีรายการ', 'เลือกสินค้าและจำนวนที่ฝาก')}
        </div>
      </div>
    `;
    await this.loadWarehouses();
  },

  async loadWarehouses() {
    const whr = await API.getWarehouses();
    this._employeeWarehouses = (whr.warehouses || []).filter(w => w.type === 'employee');
    const sel = document.getElementById('co-wh');
    if (sel) sel.innerHTML = '<option value="">-- เลือกพนักงาน --</option>' +
      this._employeeWarehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
  },

  async loadEmpStock(whId) {
    this._selectedWh = whId;
    this._items = [];
    this.renderItems();
    if (!whId) return;
    try {
      const wh = this._employeeWarehouses.find(w => w.id === whId);
      const res = await API.getEmployeeStock(wh?.employeeId || whId);
      this._employeeStock = (res.stock || []).filter(s => s.warehouseId === whId);
      const sel = document.getElementById('co-product');
      if (sel) sel.innerHTML = '<option value="">-- เลือกสินค้า --</option>' +
        this._employeeStock.map(s => `<option value="${s.productId}" data-qty="${s.qty}">${s.product?.name||s.productId} (มี ${s.qty} ${s.product?.unit||''})</option>`).join('');
    } catch(e) { UI.toast('โหลดสต็อกพนักงานไม่สำเร็จ: ' + e.message, 'error'); }
  },

  adjustQty(delta) {
    const el = document.getElementById('co-qty');
    if (el) el.value = Math.max(1, (parseInt(el.value)||0) + delta);
  },

  addItem() {
    const productId = document.getElementById('co-product')?.value;
    const qty = parseInt(document.getElementById('co-qty')?.value) || 0;
    if (!productId) return UI.toast('กรุณาเลือกสินค้า', 'warning');
    if (qty <= 0) return UI.toast('กรุณากรอกจำนวนที่ถูกต้อง', 'warning');
    const stock = this._employeeStock.find(s => s.productId === productId);
    if (qty > (stock?.qty || 0)) return UI.toast(`เกินสต็อก (มี ${stock?.qty||0})`, 'warning');
    const existing = this._items.find(i => i.productId === productId);
    if (existing) existing.qty += qty;
    else this._items.push({ productId, qty, unit: stock?.product?.unit || 'หน่วย', product: stock?.product });
    this.renderItems();
    document.getElementById('co-product').value = '';
    document.getElementById('co-qty').value = '1';
  },

  removeItem(idx) { this._items.splice(idx, 1); this.renderItems(); },

  renderItems() {
    const el = document.getElementById('co-items-list');
    if (!this._items.length) {
      el.innerHTML = UI.emptyState('undo', 'ยังไม่มีรายการ', 'เลือกสินค้าและจำนวนที่ฝาก');
      return;
    }
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>สินค้า</th><th class="td-right">จำนวนฝาก</th><th>หน่วย</th><th></th></tr></thead>
        <tbody>
          ${this._items.map((item, i) => `
            <tr>
              <td>${i+1}</td>
              <td class="td-bold">${item.product?.name||item.productId}</td>
              <td class="td-right text-warning fw-bold">${UI.currency(item.qty,0)}</td>
              <td>${item.unit}</td>
              <td><button class="btn btn-danger btn-xs" onclick="PAGES.consign.removeItem(${i})"><span class="material-icons">close</span></button></td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>
    `;
  },

  async submit() {
    if (!this._selectedWh) return UI.toast('กรุณาเลือกพนักงาน', 'warning');
    if (!this._items.length) return UI.toast('กรุณาเพิ่มรายการ', 'warning');
    try {
      UI.loading(true);
      await API.consignFromEmployee({
        fromWarehouseId: this._selectedWh,
        date: document.getElementById('co-date')?.value,
        note: document.getElementById('co-note')?.value,
        items: this._items.map(i => ({ productId: i.productId, qty: i.qty })),
      });
      UI.toast('บันทึกการฝากสินค้าเรียบร้อย ✅', 'success');
      this._items = [];
      this.renderItems();
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
