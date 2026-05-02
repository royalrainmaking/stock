// ============================================================
// pages/cancel-consign.js – Cancel consigned status to settle payment
// ============================================================

PAGES['cancel-consign'] = {
  _employees: [],
  _items: [],
  _stock: [],
  _selectedEmpWh: '',

  async render() {
    const el = document.getElementById('page-cancel-consign');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">ยกเลิกฝากสินค้า (Cancel Consign)</h2>
          <p class="page-subtitle">เปลี่ยนสถานะสินค้า "ฝากคืน" กลับมาเป็น "พร้อมคิดเงิน" เพื่อให้เก็บยอดขายประจำวันได้</p>
        </div>
      </div>

      <div class="grid-2">
        <!-- 1. Source (Employee) -->
        <div class="card">
          <div class="card-title">1. เลือกพนักงาน</div>
          <div class="form-group">
            <label>เลือกคลังพนักงาน *</label>
            <div id="re-emp-picker-btn" class="product-picker-trigger" onclick="PAGES['cancel-consign'].openEmployeePicker()">
              <div id="re-emp-thumb" class="product-thumb-preview" style="border-radius:50%;background:var(--bg-card2);display:flex;align-items:center;justify-content:center"><span class="material-icons">person</span></div>
              <div class="product-info-preview">
                <div id="re-emp-name" class="p-name">คลิกเพื่อเลือกพนักงาน</div>
                <div id="re-emp-meta" class="p-meta">เพื่อตรวจสอบรายการที่ฝากไว้</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="background:var(--bg-base); border:1px dashed var(--border)">
          <div style="text-align:center; padding:10px; color:var(--text-muted)">
            <span class="material-icons" style="font-size:32px; margin-bottom:8px">info_outline</span>
            <p style="font-size:0.85rem">การยกเลิกฝาก จะทำให้สินค้าถาดนั้น <br><strong>ถูกนำไปรวมคำนวณเงินในหน้า "คิดเงินพนักงาน"</strong></p>
          </div>
        </div>
      </div>

      <!-- 3. Items Selection -->
      <div class="card mt-16">
        <div class="card-title">3. รายการสินค้าที่ฝากไว้ (ยกไปยังวันถัดไป)</div>
        <div id="re-items-picker-container">
          ${UI.emptyState('person_search', 'กรุณาเลือกพนักงานก่อน', 'ระบบจะแสดงรายการสินค้าที่พนักงานคนนี้ฝากคืน/ยกไป')}
        </div>
      </div>

      <!-- 4. Summary and Submit -->
      <div class="card mt-16">
         <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="card-title" style="margin:0">4. รายการที่จะยกเลิกฝาก (เพื่อคิดเงินจริง)</div>
          <button class="btn btn-primary" onclick="PAGES['cancel-consign'].submit()" id="re-submit-btn" disabled>
            <span class="material-icons">payments</span> ยืนยันการยกเลิกฝาก (คิดเงิน)
          </button>
        </div>
        <div id="re-selected-list">
          ${UI.emptyState('shopping_basket', 'ยังไม่ได้เลือกรายการ', 'กรุณากดเลือกสินค้าจากรายการด้านบน')}
        </div>
      </div>
    `;

    await this.loadData();
  },

  async loadData() {
    try {
      const reThumb = document.getElementById('re-emp-thumb');
      if (reThumb) reThumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';
      
      const [wRes] = await Promise.all([API.getWarehouses()]);
      this._employees = (wRes.warehouses || []).filter(w => w.type === 'employee');
      
      if (reThumb) reThumb.innerHTML = '<span class="material-icons">person</span>';
    } catch(e) { UI.toast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error'); }
  },

  openEmployeePicker() {
    const html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding-top:8px;">
      ${this._employees.map(w => `
        <div class="card" style="cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px;" onclick="PAGES['cancel-consign'].selectEmployee('${w.id}')">
          ${UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40)}
          <div>
            <div style="font-weight:700;font-size:0.95rem">${w.employeeName || 'พนักงาน'}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${w.name}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
    openModal('เลือกพนักงานที่จะยกเลิกฝากสินค้า', html, `<button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>`);
  },

  async selectEmployee(whId) {
    const w = this._employees.find(x => x.id === whId);
    if (!w) return;
    this._selectedEmpWh = whId;
    this._items = [];
    
    document.getElementById('re-emp-thumb').innerHTML = UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40);
    document.getElementById('re-emp-name').textContent = w.employeeName || w.name;
    document.getElementById('re-emp-meta').textContent = w.name;
    
    closeModal();
    await this.loadStock(whId);
  },

  async loadStock(whId) {
    const container = document.getElementById('re-items-picker-container');
    const thumb = document.getElementById('re-emp-thumb');
    container.innerHTML = UI.spinner();
    if (thumb) thumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';
    
    try {
      const w = this._employees.find(x => x.id === whId);
      const res = await API.getEmployeeStock(w?.employeeId || whId);
      
      this._stock = (res.stock || []).filter(s => 
        String(s.warehouseId).trim() === String(whId).trim() && Number(s.consigned) > 0
      );
      this._items = [];
      this.renderStockPicker();
      this.renderSelected(); 
      
      if (thumb) thumb.innerHTML = UI.avatar(w?.employeeAvatar || w?.avatar, w?.employeeName || w?.name, 40);
    } catch(e) {
      container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
  },

  renderStockPicker() {
    const container = document.getElementById('re-items-picker-container');
    if (!this._stock.length) {
      container.innerHTML = UI.emptyState('task_alt', 'ไม่มีสินค้าฝากค้างอยู่', 'พนักงานคนนี้ไม่มีรายการสินค้าที่ระบุว่าฝากคืนไว้');
      return;
    }

    container.innerHTML = `
      <div class="product-picker-grid">
        ${this._stock.map((s, idx) => `
          <div class="picker-item" onclick="PAGES['cancel-consign'].addItem(${idx})">
            ${s.product?.imageUrl ? `<img src="${s.product.imageUrl}" />` : `<div class="p-img-placeholder"><span class="material-icons">inventory_2</span></div>`}
            <div class="p-info">
              <div class="p-code">${s.product?.code || '-'}</div>
              <div class="p-name">${s.product?.name || s.productId}</div>
              <div style="display:flex;justify-content:space-between;margin-top:8px">
                <span class="badge badge-yellow">ฝากอยู่: ${UI.currency(s.consigned, 0)}</span>
                <span style="font-size:0.7rem;color:var(--text-muted)">หมดอายุ: ${UI.dateStr(s.expiryDate)}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  addItem(idx) {
    const s = this._stock[idx];
    const existing = this._items.find(i => i.productId === s.productId && i.expiryDate === s.expiryDate);
    if (existing) return UI.toast('เลือกรายการนี้ไปแล้ว', 'warning');

    this._items.push({
      productId: s.productId,
      product: s.product,
      expiryDate: s.expiryDate,
      maxReturn: s.consigned,
      qty: s.consigned,
      unit: s.product?.unit || 'หน่วย'
    });
    this.renderSelected();
  },

  removeItem(idx) {
    this._items.splice(idx, 1);
    this.renderSelected();
  },

  setQty(idx, val) {
    const item = this._items[idx];
    const qty = Number(val);
    if (qty > item.maxReturn) {
      UI.toast(`จำนวนที่จะเปลี่ยนต้องไม่เกินจำนวนที่ฝากไว้ (${item.maxReturn})`, 'warning');
      item.qty = item.maxReturn;
    } else {
      item.qty = qty;
    }
    this.renderSelected(false);
  },

  renderSelected(full = true) {
    const el = document.getElementById('re-selected-list');
    if (!this._items.length) {
      el.innerHTML = UI.emptyState('shopping_basket', 'ยังไม่ได้เลือกรายการ', 'กรุณากดเลือกสินค้าจากรายการที่ฝากไว้ด้านบน');
      this.checkReady();
      return;
    }

    if (full) {
      el.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>สินค้า</th><th>หมดวันที่</th><th class="td-right">ฝากไว้</th><th class="td-right">ยกเลิกฝาก</th><th></th><th></th></tr></thead>
            <tbody>
              ${this._items.map((it, idx) => `
                <tr>
                  <td class="td-bold">${it.product?.name || it.productId}</td>
                  <td style="font-size:0.8rem;color:var(--text-muted)">${UI.dateStr(it.expiryDate)}</td>
                  <td class="td-right">${UI.currency(it.maxReturn, 0)}</td>
                  <td class="td-right">
                    <input type="number" class="qty-input" value="${it.qty}" onchange="PAGES['cancel-consign'].setQty(${idx}, this.value)" style="width:80px;text-align:right" />
                  </td>
                  <td>${it.unit}</td>
                  <td class="td-center"><button class="btn btn-danger btn-xs" onclick="PAGES['cancel-consign'].removeItem(${idx})"><span class="material-icons">close</span></button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    this.checkReady();
  },

  checkReady() {
    const btn = document.getElementById('re-submit-btn');
    if (!btn) return;
    btn.disabled = !(this._selectedEmpWh && this._items.length);
  },

  async submit() {
    if (!confirm('ยืนยันระบบจะเปลี่ยนสถานะสินค้าช่อง "ฝาก" ให้เป็น "พร้อมคิดเงิน" ใช่หรือไม่?')) return;
    try {
      UI.loading(true);
      await API.cancelConsign({
        warehouseId: this._selectedEmpWh,
        items: this._items.map(it => ({ productId: it.productId, expiryDate: it.expiryDate, qty: it.qty }))
      });
      UI.toast('ระบบเปลี่ยนสถานะเป็นพร้อมคิดเงินเรียบร้อยแล้ว ✅', 'success');
      this.render(); // Reset page
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
