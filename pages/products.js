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
        <div>
          <h2 class="page-title">จัดการสินค้า</h2>
          <p class="page-subtitle">เพิ่ม / แก้ไข / ลบ รายการสินค้าในระบบ</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="PAGES.products.openAdd()"><span class="material-icons">add</span> เพิ่มสินค้า</button>
        </div>
      </div>
      <div class="card mb-16">
        <div class="input-group" style="margin:0">
          <div class="search-bar">
            <span class="search-icon"><span class="material-icons">search</span></span>
            <input type="text" placeholder="ค้นหาสินค้า..." id="product-search" oninput="PAGES.products.doSearch(this.value)" />
          </div>
        </div>
      </div>
      <div class="card">
        <div id="products-table">${UI.spinner()}</div>
      </div>
    `;
    await this.load();
  },

  async load() {
    try {
      const res = await API.getProducts();
      this._products = res.products || [];
      this.renderTable();
    } catch(e) {
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
      (p.category||'').toLowerCase().includes(this._search)
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
            <th>รหัส</th><th>ชื่อสินค้า</th><th>หมวด</th><th>หน่วย</th>
            <th class="td-right">ต้นทุน (บวก VAT)</th>
            <th class="td-right">ราคาพนักงาน</th>
            <th class="td-right">ราคาขาย</th>
            <th class="td-center">รูป</th>
            <th class="td-center">จัดการ</th>
          </tr></thead>
          <tbody>
            ${data.map(p => `
              <tr>
                <td><code style="color:var(--primary-light);font-size:0.82rem">${p.code}</code></td>
                <td class="td-bold">${p.name}</td>
                <td><span class="badge badge-gray">${p.category||'-'}</span></td>
                <td>${p.unit}</td>
                <td class="td-right">฿${UI.currency(p.costVat)}</td>
                <td class="td-right">฿${UI.currency(p.empVat)}</td>
                <td class="td-right text-success fw-bold">฿${UI.currency(p.sellPrice)}</td>
                <td class="td-center">
                  ${p.imageUrl
                    ? `<img src="${p.imageUrl}" class="product-img" alt="${p.name}" onerror="this.style.display='none'" />`
                    : '<div class="product-img-placeholder"><span class="material-icons">inventory_2</span></div>'
                  }
                </td>
                <td class="td-center">
                  <div style="display:flex;gap:6px;justify-content:center">
                    <button class="btn btn-secondary btn-xs" onclick="PAGES.products.openEdit('${p.id}')"><span class="material-icons">edit</span></button>
                    <button class="btn btn-danger btn-xs" onclick="PAGES.products.doDelete('${p.id}')"><span class="material-icons">delete</span></button>
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
    const p = product || { code:'', name:'', category:'', unit:'ขวด', unitsPerCase:'', costNoVat:'', costVat:'', empNoVat:'', empVat:'', fridgeNoVat:'', fridgeVat:'', sellPrice:'', imageUrl:'' };
    openModal(isEdit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่', `
      <div class="form-row">
        <div class="form-group"><label>รหัสสินค้า *</label><input id="pf-code" value="${p.code}" placeholder="P10400" /></div>
        <div class="form-group"><label>หมวดหมู่</label><input id="pf-cat" value="${p.category||''}" placeholder="100ml" /></div>
      </div>
      <div class="form-group"><label>ชื่อสินค้า *</label><input id="pf-name" value="${p.name}" placeholder="ชื่อสินค้า" /></div>
      <div class="form-row">
        <div class="form-group"><label>หน่วย</label>
          <select id="pf-unit">
            ${['ขวด','ถุง','กล่อง','ชิ้น','อัน','แพ็ค'].map(u=>`<option ${p.unit===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>จำนวน/ลัง</label><input id="pf-upc" type="number" value="${p.unitsPerCase||''}" placeholder="64" /></div>
      </div>
      <hr class="section-divider" />
      <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:8px">💰 ราคา (กรอกบาท)</p>
      <div class="form-row">
        <div class="form-group"><label>ต้นทุน (ไม่รวม VAT)</label><input id="pf-costnoVat" type="number" step="0.01" value="${p.costNoVat||''}" /></div>
        <div class="form-group"><label>ต้นทุน (รวม VAT)</label><input id="pf-costvat" type="number" step="0.01" value="${p.costVat||''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ราคาพนักงาน (ไม่รวม VAT)</label><input id="pf-empnoVat" type="number" step="0.01" value="${p.empNoVat||''}" /></div>
        <div class="form-group"><label>ราคาพนักงาน (รวม VAT)</label><input id="pf-empvat" type="number" step="0.01" value="${p.empVat||''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ราคาตู้แช่ (ไม่รวม VAT)</label><input id="pf-fridgenoVat" type="number" step="0.01" value="${p.fridgeNoVat||''}" /></div>
        <div class="form-group"><label>ราคาตู้แช่ (รวม VAT)</label><input id="pf-fridgevat" type="number" step="0.01" value="${p.fridgeVat||''}" /></div>
      </div>
      <div class="form-group"><label>ราคาขาย</label><input id="pf-sell" type="number" step="0.01" value="${p.sellPrice||''}" /></div>
      <div class="form-group"><label>URL รูปสินค้า (Google Drive / URL)</label><input id="pf-img" value="${p.imageUrl||''}" placeholder="https://..." /></div>
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
      unit: get('pf-unit'), unitsPerCase: Number(get('pf-upc')),
      costNoVat: Number(get('pf-costnoVat')), costVat: Number(get('pf-costvat')),
      empNoVat: Number(get('pf-empnoVat')), empVat: Number(get('pf-empvat')),
      fridgeNoVat: Number(get('pf-fridgenoVat')), fridgeVat: Number(get('pf-fridgevat')),
      sellPrice: Number(get('pf-sell')), imageUrl: get('pf-img'),
    };
    if (!data.code || !data.name) return UI.toast('กรุณากรอกรหัสและชื่อสินค้า', 'warning');
    try {
      UI.loading(true);
      if (id) await API.updateProduct(data);
      else await API.createProduct(data);
      closeModal();
      UI.toast(id ? 'แก้ไขสินค้าเรียบร้อย ✅' : 'เพิ่มสินค้าเรียบร้อย ✅', 'success');
      await this.load();
    } catch(e) {
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
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
