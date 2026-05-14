// ============================================================
// pages/products.js – Product management (Admin only)
// ============================================================

PAGES['products'] = {
  _products: [],
  _search: '',

  async render() {
    const el = document.getElementById('page-products');
    el.innerHTML = `
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
        <div class="page-actions">
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
    `;
    await this.load();
  },

  async load() {
    try {
      const res = await API.getProducts();
      this._products = res.products || [];
      this.renderTable();
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
    document.getElementById('products-table').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th>
            <th>รูป</th>
            <th>ข้อมูลสินค้า</th>
            <th>หมวดหมู่</th>
            <th class="td-center">บรรจุภัณฑ์</th>
            <th class="td-right">ต้นทุนรวม VAT</th>
            <th class="td-right">ส่งเซลล์</th>
            <th class="td-right">ค่าคอมฯ</th>
            <th class="td-right">ส่งร้านค้า</th>
            <th class="td-center">จัดการ</th>
          </tr></thead>
          <tbody>
            ${data.map(p => `
              <tr style="transition:var(--transition)" onpointerenter="this.style.background='var(--bg-hover)'" onpointerleave="this.style.background='transparent'">
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
                <td class="td-right td-bold" style="color:var(--text-primary)">฿${UI.currency(p.costVat)}</td>
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
  }
};
