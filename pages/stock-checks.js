// ============================================================
// pages/stock-checks.js – History of Stock Checks
// ============================================================

PAGES['stock-checks'] = {
  _checks: [],
  _products: [],
  _warehouses: [],
  _filters: {
    startDate: '',
    endDate: '',
    warehouseId: ''
  },

  async render() {
    const el = document.getElementById('page-stock-checks');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:#E3F2FD;color:#1976D2">
            <span class="material-icons">fact_check</span>
          </div>
          <div>
            <h2 class="page-title">ประวัตินับสต๊อก</h2>
            <p class="page-subtitle">ดูประวัติการบันทึกยอดนับจริง (ผลต่างระหว่างระบบและยอดจริง)</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="PAGES['stock-checks'].load()">
            <span class="material-icons">refresh</span> โหลดใหม่
          </button>
        </div>
      </div>

      <div class="card mb-4">
        <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end;">
          <div style="flex:1; min-width:200px;">
            <label class="form-label">ตั้งแต่วันที่</label>
            <input type="date" class="form-control" id="sc-start" onchange="PAGES['stock-checks'].updateFilters()">
          </div>
          <div style="flex:1; min-width:200px;">
            <label class="form-label">ถึงวันที่</label>
            <input type="date" class="form-control" id="sc-end" onchange="PAGES['stock-checks'].updateFilters()">
          </div>
          <div style="flex:1; min-width:200px;">
            <label class="form-label">คลังสินค้า</label>
            <select class="form-control" id="sc-wh" onchange="PAGES['stock-checks'].updateFilters()">
              <option value="">ทั้งหมด</option>
            </select>
          </div>
          <div style="flex:none;">
            <button class="btn btn-primary" onclick="PAGES['stock-checks'].loadData()">ค้นหา</button>
          </div>
        </div>
      </div>

      <div id="sc-content"></div>
    `;

    // Set default dates (Today)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('sc-start').value = today;
    document.getElementById('sc-end').value = today;
    this._filters.startDate = today;
    this._filters.endDate = today;

    await this.load();
  },

  updateFilters() {
    this._filters.startDate = document.getElementById('sc-start').value;
    this._filters.endDate = document.getElementById('sc-end').value;
    this._filters.warehouseId = document.getElementById('sc-wh').value;
  },

  async load() {
    try {
      UI.loading(true);
      const [pRes, wRes] = await Promise.all([
        API.getProducts(),
        API.getWarehouses()
      ]);
      this._products = pRes.products || [];
      this._warehouses = (wRes.warehouses || []).filter(w => w.type === 'central');

      const whSelect = document.getElementById('sc-wh');
      whSelect.innerHTML = '<option value="">คลังกลางทั้งหมด</option>';
      this._warehouses.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = w.name;
        whSelect.appendChild(opt);
      });

      if (this._warehouses.length > 0) {
        whSelect.value = this._warehouses[0].id;
        this._filters.warehouseId = this._warehouses[0].id;
      }

      await this.loadData();
    } catch (e) {
      UI.toast('เกิดข้อผิดพลาดในการโหลดข้อมูลตั้งต้น', 'error');
    } finally {
      UI.loading(false);
    }
  },

  async loadData() {
    try {
      UI.loading(true);
      const { startDate, endDate, warehouseId } = this._filters;
      const res = await API.getStockChecks(warehouseId, startDate, endDate);
      this._checks = res.checks || [];
      this.renderList();
    } catch (e) {
      document.getElementById('sc-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    } finally {
      UI.loading(false);
    }
  },

  renderList() {
    const container = document.getElementById('sc-content');
    if (this._checks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-icons" style="font-size: 64px; color: #ccc;">history</span>
          <h3>ไม่พบประวัตินับสต๊อก</h3>
          <p class="text-muted">ในวันที่และคลังที่คุณเลือก</p>
        </div>
      `;
      return;
    }

    let html = '';
    this._checks.forEach(check => {
      const dateStr = new Date(check.date).toLocaleString('th-TH');
      const whName = (this._warehouses.find(w => String(w.id) === String(check.warehouseId)) || {}).name || check.warehouseId;
      
      let items = [];
      try { items = JSON.parse(check.items || '[]'); } catch(e) {}

      let itemsHtml = `
        <table class="table" style="margin-top: 12px; font-size: 0.95em;">
          <thead>
            <tr>
              <th style="width:50px;">ลำดับ</th>
              <th>สินค้า</th>
              <th style="text-align:right;">ยอดในระบบ</th>
              <th style="text-align:right;">ยอดนับจริง</th>
              <th style="text-align:right;">ผลต่าง</th>
            </tr>
          </thead>
          <tbody>
      `;

      items.forEach((it, idx) => {
        const prod = this._products.find(p => String(p.id) === String(it.productId)) || { name: 'ไม่ทราบชื่อ', code: '' };
        const codeStr = prod.code ? `[${prod.code}] ` : '';
        const diffColor = it.diff === 0 ? '#555' : (it.diff > 0 ? 'var(--success)' : 'var(--danger)');
        const diffText = it.diff === 0 ? '-' : (it.diff > 0 ? '+' + UI.currency(it.diff, 0) : UI.currency(it.diff, 0));

        itemsHtml += `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${codeStr}${prod.name}</td>
            <td style="text-align:right;">${UI.currency(it.expected, 0)}</td>
            <td style="text-align:right; font-weight:600; color:var(--primary);">${UI.currency(it.actual, 0)}</td>
            <td style="text-align:right; font-weight:600; color:${diffColor}">${diffText}</td>
          </tr>
        `;
      });

      itemsHtml += '</tbody></table>';

      html += `
        <div class="card mb-4">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 12px;">
            <div>
              <div style="font-weight: 600; font-size: 1.1em; color: var(--primary);">
                <span class="material-icons" style="font-size: 18px; vertical-align: text-bottom;">store</span> ${whName}
              </div>
              <div class="text-muted" style="font-size: 0.9em;">
                <span class="material-icons" style="font-size: 14px; vertical-align: text-bottom;">event</span> ${dateStr}
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: #E3F2FD; color: #1976D2;">${check.id}</span><br>
              <small class="text-muted">โดย: ${check.username}</small>
            </div>
          </div>
          ${check.note ? `<div style="margin-bottom: 12px; color: #666;"><strong>หมายเหตุ:</strong> ${check.note}</div>` : ''}
          ${itemsHtml}
        </div>
      `;
    });

    container.innerHTML = html;
  }
};
