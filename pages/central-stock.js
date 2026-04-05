// ============================================================
// pages/central-stock.js – Central warehouse inventory view
// ============================================================

PAGES['central-stock'] = {
  _stock: [],
  _warehouses: [],
  _selectedWh: '',
  _search: '',

  async render() {
    const el = document.getElementById('page-central-stock');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">คลังกลาง</h2>
          <p class="page-subtitle">ดูสินค้าคงคลังในคลังกลางทั้งหมด</p>
        </div>
        <div class="page-actions">
          ${AUTH.isAdmin() ? '<button class="btn btn-secondary" onclick="showPage(\'receive-goods\')"><span class="material-icons">move_to_inbox</span> รับสินค้าเข้าคลัง</button>' : ''}
          ${AUTH.hasRole('admin','stock') ? '<button class="btn btn-primary" onclick="showPage(\'transfer\')"><span class="material-icons">swap_horiz</span> เบิกสินค้า</button>' : ''}
        </div>
      </div>
      <div class="card mb-16">
        <div class="input-group" style="margin:0;align-items:center">
          <div class="form-group" style="margin:0">
            <select id="cs-wh-filter" onchange="PAGES['central-stock'].setWh(this.value)" style="min-width:220px">
              <option value="">-- ทุกคลัง --</option>
            </select>
          </div>
          <div class="search-bar">
            <span class="search-icon"><span class="material-icons">search</span></span>
            <input type="text" placeholder="ค้นหาสินค้า..." oninput="PAGES['central-stock'].doSearch(this.value)" />
          </div>
          <button class="btn btn-secondary btn-sm" onclick="PAGES['central-stock'].load()"><span class="material-icons">refresh</span> รีเฟรช</button>
        </div>
      </div>
      <div id="cs-summary" class="stats-grid" style="margin-bottom:16px"></div>
      <div class="card">
        <div id="cs-table">${UI.spinner()}</div>
      </div>
    `;
    await this.loadWarehouses();
    await this.load();
  },

  async loadWarehouses() {
    const res = await API.getWarehouses();
    this._warehouses = (res.warehouses || []).filter(w => w.type === 'central');
    const sel = document.getElementById('cs-wh-filter');
    if (sel) {
      sel.innerHTML = '<option value="">-- ทุกคลัง --</option>' +
        this._warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
      sel.value = this._selectedWh;
    }
  },

  setWh(v) { this._selectedWh = v; this.load(); },
  doSearch(v) { this._search = v.toLowerCase(); this.renderTable(); },

  async load() {
    try {
      const res = await API.getCentralStock(this._selectedWh);
      this._stock = res.stock || [];
      this.renderSummary();
      this.renderTable();
    } catch(e) {
      document.getElementById('cs-table').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  renderSummary() {
    const total = this._stock.reduce((a,s) => a + s.qty, 0);
    const skus = new Set(this._stock.map(s => s.productId)).size;
    const whs = new Set(this._stock.map(s => s.warehouseId)).size;
    const lowStock = this._stock.filter(s => s.qty <= 10).length;
    document.getElementById('cs-summary').innerHTML = `
      <div class="stat-card purple"><div class="stat-bg-icon"><span class="material-icons">inventory_2</span></div>
        <div class="stat-label">สินค้าคงเหลือรวม</div>
        <div class="stat-value text-primary-color">${UI.currency(total, 0)}</div>
        <div class="stat-sub">หน่วย</div>
      </div>
      <div class="stat-card green"><div class="stat-bg-icon"><span class="material-icons">label</span></div>
        <div class="stat-label">จำนวน SKU</div>
        <div class="stat-value" style="color:var(--accent)">${skus}</div>
        <div class="stat-sub">รายการสินค้า</div>
      </div>
      <div class="stat-card orange"><div class="stat-bg-icon"><span class="material-icons">warehouse</span></div>
        <div class="stat-label">จำนวนคลัง</div>
        <div class="stat-value" style="color:var(--warning)">${whs}</div>
        <div class="stat-sub">คลังกลาง</div>
      </div>
      <div class="stat-card pink"><div class="stat-bg-icon"><span class="material-icons">warning</span></div>
        <div class="stat-label">สต็อกต่ำ (≤10)</div>
        <div class="stat-value" style="color:var(--danger)">${lowStock}</div>
        <div class="stat-sub">รายการ</div>
      </div>
    `;
  },

  renderTable() {
    const data = this._search
      ? this._stock.filter(s => s.product?.name?.toLowerCase().includes(this._search) || s.product?.code?.toLowerCase().includes(this._search))
      : this._stock;

    if (!data.length) {
      document.getElementById('cs-table').innerHTML = UI.emptyState('warehouse', 'ไม่มีข้อมูลสินค้าในคลัง', 'ลองเปลี่ยนตัวกรอง หรือรับสินค้าเข้าคลังก่อน');
      return;
    }
    document.getElementById('cs-table').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>รูป</th><th>รหัส</th><th>ชื่อสินค้า</th><th>คลัง</th>
            <th class="td-right">คงเหลือ</th><th>หน่วย</th>
            <th class="td-right">ต้นทุน/หน่วย (VAT)</th>
            <th class="td-right">มูลค่ารวม</th>
            <th>สถานะ</th>
          </tr></thead>
          <tbody>
            ${data.map((s, i) => {
              const low = s.qty <= 10;
              const totalVal = (s.product?.costVat || 0) * s.qty;
              return `<tr>
                <td class="text-muted">${i+1}</td>
                  <td>
                   ${s.product?.imageUrl
                    ? `<img src="${s.product.imageUrl}" class="product-img" alt="${s.product.name}" onerror="this.parentElement.innerHTML='<div class=\\'product-img-placeholder\\'><span class=\\'material-icons\\'>inventory_2</span></div>'" />`
                    : '<div class="product-img-placeholder"><span class="material-icons">inventory_2</span></div>'
                  }
                </td>
                <td><code style="color:var(--primary-light);font-size:0.8rem">${s.product?.code||'-'}</code></td>
                <td class="td-bold">${s.product?.name||s.productId}</td>
                <td style="font-size:0.82rem">${s.warehouse?.name||s.warehouseId}</td>
                <td class="td-right td-bold ${low?'text-danger':'text-success'}">${UI.currency(s.qty, 0)}</td>
                <td>${s.unit||s.product?.unit||'-'}</td>
                <td class="td-right">฿${UI.currency(s.product?.costVat)}</td>
                <td class="td-right fw-bold">฿${UI.currency(totalVal)}</td>
                <td>${low ? '<span class="badge badge-red"><span class="material-icons" style="font-size:12px;vertical-align:middle">warning</span> ต่ำ</span>' : '<span class="badge badge-green"><span class="material-icons" style="font-size:12px;vertical-align:middle">check_circle</span> ปกติ</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg-card2)">
              <td colspan="8" class="td-right fw-bold">มูลค่าสินค้าคงคลังรวม</td>
              <td class="td-right fw-bold text-success">฿${UI.currency(data.reduce((a,s)=>a+(s.product?.costVat||0)*s.qty,0))}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="text-muted mt-8" style="font-size:0.82rem">แสดง ${data.length} รายการ</div>
    `;
  }
};
