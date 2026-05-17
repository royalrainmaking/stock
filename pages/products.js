// ============================================================
// pages/products.js – Product management (Admin only)
// ============================================================

PAGES['products'] = {
  _products: [],
  _search: '',
  _selectedIds: [],

  async render() {
    const el = document.getElementById('page-products');
    el.innerHTML = `
      <style>
        tr.dragging {
          opacity: 0.4;
          background: var(--bg-hover) !important;
          outline: 2px dashed var(--primary-light);
          cursor: grabbing;
        }
        tr[draggable="true"] {
          cursor: grab;
        }
        .drag-handle {
          cursor: grab;
          color: var(--text-muted);
          transition: color var(--transition);
          user-select: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .drag-handle:hover {
          color: var(--primary);
        }
        /* Bulk Action Bar Styles */
        .bulk-action-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: rgba(30, 41, 59, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 24px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
          opacity: 0;
        }
        .bulk-action-bar.visible {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
        .bulk-action-content {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .bulk-action-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .bulk-action-info .info-icon {
          color: var(--primary-light);
        }
        .bulk-action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bulk-action-buttons .btn {
          height: 36px;
          padding: 0 16px;
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
      </style>
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#D93025,#B71C1C)">
            <span class="material-icons">inventory</span>
          </div>
          <div>
            <h2 class="page-title">รายการสินค้า</h2>
            <p class="page-subtitle">จัดการข้อมูลสินค้า ราคาทุน และราคาจำหน่าย (Master Data)</p>
          </div>
        </div>
        <div class="page-actions" style="display:flex;gap:10px">
          <button class="btn btn-success hidden" id="save-order-btn" onclick="PAGES.products.saveOrder()" style="background:var(--success);border-color:var(--success);color:#fff">
            <span class="material-icons">save</span> บันทึกลำดับ
          </button>
          <button class="btn btn-primary" onclick="PAGES.products.openAdd()">
            <span class="material-icons">add_circle</span> เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      <div class="filter-card">
        <form onsubmit="event.preventDefault()">
          <div class="form-group" style="flex:1;min-width:260px">
            <label>ค้นหาสินค้า</label>
            <input type="text" placeholder="ค้นหาด้วยชื่อสินค้า, รหัส หรือหมวดหมู่..." id="product-search" oninput="PAGES.products.doSearch(this.value)" />
          </div>
          <button type="button" class="btn btn-secondary btn-sm" style="height:42px" onclick="PAGES.products.load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
        </form>
      </div>
      <div class="card">
        <div id="products-table">${UI.skeletonTable(6, 6)}</div>
      </div>
      
      <!-- Premium Glassmorphic Floating Bulk Action Bar -->
      <div id="bulk-action-bar" class="bulk-action-bar hidden">
        <div class="bulk-action-content">
          <div class="bulk-action-info">
            <span class="material-icons info-icon">check_box</span>
            <span id="bulk-select-count">เลือกอยู่ 0 รายการ</span>
          </div>
          <div class="bulk-action-buttons">
            <button class="btn btn-danger" onclick="PAGES.products.doBulkDelete()" style="background:var(--danger); border-color:var(--danger); color:#fff">
              <span class="material-icons">delete</span> ลบรายการที่เลือก
            </button>
            <button class="btn btn-secondary" onclick="PAGES.products.clearSelection()">
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    `;
    await this.load();
  },

  async load() {
    try {
      this._selectedIds = [];
      const res = await API.getProducts();
      this._products = res.products || [];
      this.renderTable();
      this.updateBulkActionBar();
      const btn = document.getElementById('save-order-btn');
      if (btn) btn.classList.add('hidden');
    } catch (e) {
      document.getElementById('products-table').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  doSearch(v) {
    this._search = v.toLowerCase();
    this.renderTable();
  },

  filtered() {
    if (!this._search) return this._products;
    return this._products.filter(p =>
      p.name.toLowerCase().includes(this._search) ||
      p.code.toLowerCase().includes(this._search) ||
      (p.category || '').toLowerCase().includes(this._search)
    );
  },

  renderTable() {
    const data = this.filtered();
    if (!data.length) {
      document.getElementById('products-table').innerHTML = UI.emptyState('inventory', 'ไม่พบสินค้า', 'ลองเปลี่ยนคำค้นหา หรือเพิ่มสินค้าใหม่');
      return;
    }
    const allFilteredSelected = data.length > 0 && data.every(p => this._selectedIds.includes(p.id));
    document.getElementById('products-table').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th style="width: 40px; text-align: center;">
              <input type="checkbox" id="select-all-products" onchange="PAGES.products.toggleSelectAll(this)" ${allFilteredSelected ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px; border-radius:4px" />
            </th>
            <th style="width: 40px;"></th>
            <th>#</th>
            <th>รูป</th>
            <th>ข้อมูลสินค้า</th>
            <th>หมวดหมู่</th>
            <th class="td-center">บรรจุภัณฑ์</th>
            <th class="td-right">ต้นทุน (ไม่รวม/รวม)</th>
            <th class="td-right">ส่งเซลล์</th>
            <th class="td-right">ค่าคอมฯ</th>
            <th class="td-right">ส่งร้านค้า</th>
            <th class="td-center">จัดการ</th>
          </tr></thead>
          <tbody>
            ${data.map(p => `
              <tr draggable="true"
                  data-id="${p.id}"
                  ondragstart="PAGES.products.dragStart(event, '${p.id}')"
                  ondragover="PAGES.products.dragOver(event, this)"
                  ondragend="PAGES.products.dragEnd(event)"
                  style="transition:var(--transition)" 
                  onpointerenter="this.style.background='var(--bg-hover)'" 
                  onpointerleave="this.style.background='transparent'">
                <td style="text-align: center;" onclick="event.stopPropagation()">
                  <input type="checkbox" class="product-select" data-id="${p.id}" ${this._selectedIds.includes(p.id) ? 'checked' : ''} onchange="PAGES.products.toggleSelectItem('${p.id}', this)" style="cursor:pointer; width:16px; height:16px; border-radius:4px" />
                </td>
                <td><span class="drag-handle material-icons" style="font-size:18px">drag_indicator</span></td>
                <td class="text-muted">${data.indexOf(p) + 1}</td>
                <td>${UI.image(p.imageUrl, 'product-img')}</td>
                <td>
                  <div class="td-bold" style="font-size:0.95rem">${p.name}</div>
                  <div style="font-size:0.75rem;color:var(--primary-light);font-family:monospace;font-weight:700">${p.code}</div>
                </td>
                <td><span class="badge badge-gray" style="font-weight:600">${p.category || '-'}</span></td>
                <td class="td-center">
                  <div style="font-size:0.8rem;color:var(--text-secondary)">📦 ${p.unitsPerCase || '-'} / 🍱 ${p.unitsPerTray || '-'}</div>
                  <div style="font-size:0.7rem;color:var(--text-muted)">หน่วย: ${p.unit}</div>
                </td>
                <td class="td-right">
                  <div style="font-size:0.8rem;color:var(--text-secondary)">฿${UI.currency(p.costNoVat)}</div>
                  <div class="td-bold" style="font-size:0.95rem;color:var(--text-primary)">฿${UI.currency(p.costVat)}</div>
                </td>
                <td class="td-right fw-bold" style="color:var(--primary)">฿${UI.currency(p.sellWholesale)}</td>
                <td class="td-right" style="color:#BE185D;font-weight:700">฿${UI.currency(p.sellCommission)}</td>
                <td class="td-right fw-bold" style="color:var(--accent)">฿${UI.currency(p.shopWholesale)}</td>
                <td class="td-center">
                  <div style="display:flex;gap:6px;justify-content:center">
                    <button class="btn btn-secondary btn-icon" onclick="PAGES.products.openEdit('${p.id}')" title="แก้ไข"><span class="material-icons" style="font-size:16px">edit</span></button>
                    <button class="btn btn-danger btn-icon" onclick="PAGES.products.doDelete('${p.id}')" title="ลบ"><span class="material-icons" style="font-size:16px">delete</span></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="text-muted mt-8" style="font-size:0.82rem">แสดง ${data.length} รายการ</div>
    `;
  },

  openAdd() { this._openForm(null); },
  openEdit(id) { this._openForm(this._products.find(p => p.id === id)); },

  _openForm(product) {
    const isEdit = !!product;
    const p = product || { code: '', name: '', category: '', unit: 'ขวด', unitsPerCase: '', unitsPerTray: '', costNoVat: '', costVat: '', agentProfit: '', sellWholesale: '', sellCommission: '', shopWholesale: '', imageUrl: '' };
    openModal(isEdit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่', `
      <div class="form-row">
        <div class="form-group"><label>รหัสสินค้า *</label><input id="pf-code" value="${p.code}" placeholder="P10400" /></div>
        <div class="form-group"><label>หมวดหมู่</label><input id="pf-cat" value="${p.category || ''}" placeholder="100ml" /></div>
      </div>
      <div class="form-group"><label>ชื่อสินค้า *</label><input id="pf-name" value="${p.name}" placeholder="ชื่อสินค้า" /></div>
        <div class="form-group"><label>หน่วยเรียกสินค้า</label>
          <select id="pf-unit">
            ${['ขวด', 'ถ้วย', 'ชุด', 'กล่อง', 'ชิ้น', 'อัน', 'แพ็ค'].map(u => `<option ${p.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>จำนวนขวด</label><input id="pf-upc" type="number" value="${p.unitsPerCase || ''}" placeholder="ตัวอย่าง 64" /></div>
        <div class="form-group"><label>จำนวน ขวด/ถาด</label><input id="pf-upt" type="number" value="${p.unitsPerTray || ''}" placeholder="ตัวอย่าง 30" /></div>
      </div>
      <hr class="section-divider" />
      <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:8px">💰 รายละเอียดราคา (บาท)</p>
      <div class="form-row">
        <div class="form-group"><label>ต้นทุน (ไม่รวม VAT)</label><input id="pf-costnoVat" type="number" step="0.01" value="${p.costNoVat || ''}" /></div>
        <div class="form-group"><label>ต้นทุน (รวม VAT)</label><input id="pf-costvat" type="number" step="0.01" value="${p.costVat || ''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>กำไรเอเย่นต์</label><input id="pf-agent" type="number" step="0.01" value="${p.agentProfit || ''}" /></div>
        <div class="form-group"><label>ราคาส่งเซลล์</label><input id="pf-sellwh" type="number" step="0.01" value="${p.sellWholesale || ''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ค่าคอมเซลล์</label><input id="pf-sellcom" type="number" step="0.01" value="${p.sellCommission || ''}" /></div>
        <div class="form-group"><label>ราคาส่งร้านค้า</label><input id="pf-shopwh" type="number" step="0.01" value="${p.shopWholesale || ''}" /></div>
      </div>
      <div class="form-group"><label>URL รูปสินค้า (Google Drive / URL)</label><input id="pf-img" value="${p.imageUrl || ''}" placeholder="https://..." /></div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES.products.saveForm('${isEdit ? p.id : ''}')">
        ${isEdit ? '<span class="material-icons">save</span> บันทึก' : '<span class="material-icons">add</span> เพิ่มสินค้า'}
      </button>
    `, '620px');
  },

  async saveForm(id) {
    const get = (i) => document.getElementById(i)?.value?.trim() || '';
    const data = {
      id: id || undefined,
      code: get('pf-code'), name: get('pf-name'), category: get('pf-cat'),
      unit: get('pf-unit'),
      unitsPerCase: Number(get('pf-upc')) || 0,
      unitsPerTray: Number(get('pf-upt')) || 0,
      costNoVat: Number(get('pf-costnoVat')),
      costVat: Number(get('pf-costvat')),
      agentProfit: Number(get('pf-agent')), sellWholesale: Number(get('pf-sellwh')),
      sellCommission: Number(get('pf-sellcom')), shopWholesale: Number(get('pf-shopwh')),
      imageUrl: get('pf-img'),
    };
    if (!data.code || !data.name) return UI.toast('กรุณากรอกรหัสและชื่อสินค้า', 'warning');
    try {
      UI.loading(true);
      if (id) await API.updateProduct(data);
      else await API.createProduct(data);
      closeModal();
      UI.toast(id ? 'แก้ไขสินค้าเรียบร้อย ✅' : 'เพิ่มสินค้าเรียบร้อย ✅', 'success');
      await this.load();
    } catch (e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  },

  async doDelete(id) {
    const p = this._products.find(x => x.id === id);
    if (!await UI.confirm('ลบสินค้า', `ยืนยันลบสินค้า "${p?.name}"? การกระทำนี้ไม่สามารถย้อนกลับได้`, 'ลบ')) return;
    try {
      UI.loading(true);
      await API.deleteProduct(id);
      UI.toast('ลบสินค้าเรียบร้อย ✅', 'success');
      await this.load();
    } catch (e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  },

  dragStart(e, id) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    
    const tr = e.target.closest('tr');
    if (tr) {
      tr.classList.add('dragging');
    }
  },

  dragOver(e, tr) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const draggedRow = document.querySelector('tr.dragging');
    if (!draggedRow || tr === draggedRow) return;
    
    const tbody = tr.parentNode;
    const rect = tr.getBoundingClientRect();
    const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    tbody.insertBefore(draggedRow, next ? tr.nextSibling : tr);
  },

  dragEnd(e) {
    const tr = document.querySelector('tr.dragging');
    if (tr) {
      tr.classList.remove('dragging');
    }
    
    const tbody = document.querySelector('#products-table tbody');
    if (tbody) {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const newOrderIds = rows.map(r => r.dataset.id);
      
      const reorderedProducts = [];
      newOrderIds.forEach(id => {
        const prod = this._products.find(p => p.id === id);
        if (prod) reorderedProducts.push(prod);
      });
      
      this._products.forEach(p => {
        if (!reorderedProducts.find(rp => rp.id === p.id)) {
          reorderedProducts.push(p);
        }
      });
      
      this._products = reorderedProducts;
      this.renderTable();
      
      const btn = document.getElementById('save-order-btn');
      if (btn) btn.classList.remove('hidden');
    }
  },

  async saveOrder() {
    try {
      UI.loading(true);
      const productIds = this._products.map(p => p.id);
      await API.saveProductOrder(productIds);
      UI.toast('บันทึกลำดับสินค้าเรียบร้อย ✅', 'success');
      const btn = document.getElementById('save-order-btn');
      if (btn) btn.classList.add('hidden');
      await this.load();
    } catch (e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  },

  toggleSelectAll(cb) {
    const checkboxes = document.querySelectorAll('.product-select');
    if (cb.checked) {
      this._selectedIds = this.filtered().map(p => p.id);
      checkboxes.forEach(c => c.checked = true);
    } else {
      this._selectedIds = [];
      checkboxes.forEach(c => c.checked = false);
    }
    this.updateBulkActionBar();
  },

  toggleSelectItem(id, cb) {
    if (cb.checked) {
      if (!this._selectedIds.includes(id)) this._selectedIds.push(id);
    } else {
      this._selectedIds = this._selectedIds.filter(x => x !== id);
    }
    
    const selectAll = document.getElementById('select-all-products');
    if (selectAll) {
      const data = this.filtered();
      selectAll.checked = data.length > 0 && data.every(fid => this._selectedIds.includes(fid.id));
    }
    this.updateBulkActionBar();
  },

  updateBulkActionBar() {
    const bar = document.getElementById('bulk-action-bar');
    const countEl = document.getElementById('bulk-select-count');
    if (!bar || !countEl) return;
    
    const count = this._selectedIds.length;
    countEl.textContent = `เลือกอยู่ ${count} รายการ`;
    
    if (count > 0) {
      bar.classList.remove('hidden');
      bar.offsetHeight; // Force reflow
      bar.classList.add('visible');
    } else {
      bar.classList.remove('visible');
      setTimeout(() => {
        if (this._selectedIds.length === 0) bar.classList.add('hidden');
      }, 300);
    }
  },

  clearSelection() {
    this._selectedIds = [];
    const selectAll = document.getElementById('select-all-products');
    if (selectAll) selectAll.checked = false;
    const checkboxes = document.querySelectorAll('.product-select');
    checkboxes.forEach(c => c.checked = false);
    this.updateBulkActionBar();
  },

  async doBulkDelete() {
    const count = this._selectedIds.length;
    if (count === 0) return;
    
    if (!await UI.confirm('ลบสินค้าหลายรายการ', `คุณยืนยันที่จะลบสินค้าที่เลือกทั้งหมด ${count} รายการหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`, 'ลบทั้งหมด')) return;
    
    try {
      UI.loading(true);
      await API.deleteProducts(this._selectedIds);
      UI.toast(`ลบสินค้าสำเร็จ ${count} รายการ ✅`, 'success');
      this._selectedIds = [];
      this.updateBulkActionBar();
      await this.load();
    } catch (e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
