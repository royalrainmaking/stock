// ============================================================
// pages/receive-history.js – History of goods received
// ============================================================

PAGES['receive-history'] = {
  _logs: [],
  _history: [],
  _products: [],
  _warehouses: [],
  _filters: {
    startDate: '',
    endDate: '',
    warehouseId: '',
    query: ''
  },
  _users: [],

  async render() {
    const el = document.getElementById('page-receive-history');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#00796B,#004D40)">
            <span class="material-icons">history_edu</span>
          </div>
          <div>
            <h2 class="page-title">ประวัติการรับสินค้า</h2>
            <p class="page-subtitle">ตรวจสอบรายการรับสินค้าเข้าคลังกลางและการนำเข้าย้อนหลัง</p>
          </div>
        </div>
        <div class="page-actions">
           <button class="btn btn-secondary" onclick="PAGES['receive-history'].load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
        </div>
      </div>

      <div id="rh-summary-ribbon" class="grid-3 mb-16">
        <div class="stat-card blue"><div class="stat-bg-icon"><span class="material-icons">receipt_long</span></div><div class="stat-label">จำนวนบิลทั้งหมด</div><div id="rh-sum-count" class="stat-value">0</div></div>
        <div class="stat-card green"><div class="stat-bg-icon"><span class="material-icons">inventory_2</span></div><div class="stat-label">จำนวนสินค้าที่รับเข้า</div><div id="rh-sum-units" class="stat-value">0</div></div>
        <div class="stat-card purple"><div class="stat-bg-icon"><span class="material-icons">payments</span></div><div class="stat-label">รวมมูลค่าสินค้าประมาณการ</div><div id="rh-sum-value" class="stat-value">฿0</div></div>
      </div>

      <div class="filter-card">
        <form id="rh-filter-form" onsubmit="PAGES['receive-history'].applyFilters(event)">
          <div class="form-group" style="width:150px">
            <label>วันที่เริ่มต้น</label>
            <input type="date" id="rh-start-date" onchange="PAGES['receive-history'].applyFilters()" />
          </div>
          <div class="form-group" style="width:150px">
            <label>วันที่สิ้นสุด</label>
            <input type="date" id="rh-end-date" onchange="PAGES['receive-history'].applyFilters()" />
          </div>
          <div class="form-group" style="width:180px">
            <label>เลือกคลัง</label>
            <select id="rh-warehouse" onchange="PAGES['receive-history'].applyFilters()">
              <option value="">ทุกคลังสินค้า</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;min-width:200px">
            <label>ค้นหา (เลขอ้างอิง, พาร์ทเนอร์)</label>
            <input type="text" id="rh-query" placeholder="ระบุคำค้นหา..." oninput="PAGES['receive-history'].applyFilters()" />
          </div>
          <button type="submit" class="btn btn-primary" style="height:42px">
            <span class="material-icons">search</span> ค้นหา
          </button>
        </form>
      </div>

      <div id="rh-content">
        ${UI.skeletonTable(6, 8)}
      </div>
    `;

    // Set default dates (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    document.getElementById('rh-start-date').value = start.toISOString().split('T')[0];
    document.getElementById('rh-end-date').value = end.toISOString().split('T')[0];
    
    await this.load();
  },

  async load() {
    try {
      const [prodRes, whRes, userRes] = await Promise.all([
        API.getProducts(),
        API.getWarehouses(),
        API.getUsers()
      ]);
      
      this._products = prodRes.products || [];
      this._warehouses = whRes.warehouses || [];
      this._users = userRes.users || [];
      
      const whSelect = document.getElementById('rh-warehouse');
      if (whSelect) {
        whSelect.innerHTML = '<option value="">ทุกคลังสินค้า</option>' + 
          this._warehouses.filter(w => w.type === 'central').map(w => `<option value="${w.id}">${w.name}</option>`).join('');
      }

      await this.fetchAndRender();
    } catch (e) {
      document.getElementById('rh-content').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
  },

  async fetchAndRender() {
    const el = document.getElementById('rh-content');
    el.innerHTML = UI.skeletonTable(6, 8);
    const filters = {
      startDate: document.getElementById('rh-start-date').value,
      endDate: document.getElementById('rh-end-date').value,
      warehouseId: document.getElementById('rh-warehouse').value,
      query: (document.getElementById('rh-query')?.value || '').toLowerCase().trim()
    };

    try {
      const res = await API._call('getReceiveHistory', filters);
      let data = res.history || [];

      // Manual client-side filter for query if backend doesn't support it yet
      if (filters.query) {
        data = data.filter(h => 
          (h.docNo || '').toLowerCase().includes(filters.query) || 
          (h.supplier || '').toLowerCase().includes(filters.query)
        );
      }

      if (!data.length) {
        el.innerHTML = UI.emptyState('history', 'ไม่พบประวัติการรับสินค้า', 'ลองเปลี่ยนเงื่อนไขการค้นหาหรือช่วงวันที่');
        document.getElementById('rh-sum-count').textContent = '0';
        document.getElementById('rh-sum-units').textContent = '0';
        document.getElementById('rh-sum-value').textContent = '฿0';
        return;
      }

      this._history = data;
      this.renderTable(data);
    } catch(e) {
       el.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  },

  renderTable(history) {
    let totalValue = 0;
    let totalUnits = 0;
    history.forEach(h => {
      h.items.forEach(it => {
        const p = this._products.find(x => x.id === it.productId) || {};
        totalUnits += Number(it.qty) || 0;
        totalValue += (Number(it.qty) || 0) * (p.costVat || 0);
      });
    });
    
    document.getElementById('rh-sum-count').textContent = history.length;
    document.getElementById('rh-sum-units').textContent = UI.currency(totalUnits, 0);
    document.getElementById('rh-sum-value').textContent = `฿${UI.currency(totalValue, 0)}`;

    const el = document.getElementById('rh-content');
    el.innerHTML = `
      <div class="table-wrap card" style="padding:0">
        <table style="border:none">
          <thead>
            <tr>
              <th>วันที่/เวลา</th>
              <th>รายละเอียด/เลขที่เอกสาร</th>
              <th>คลังที่รับ</th>
              <th>ผู้จำหน่าย (Supplier)</th>
              <th class="td-right">สินค้า</th>
              <th class="td-right">มูลค่ารวม</th>
              <th class="td-center"></th>
            </tr>
          </thead>
          <tbody>
            ${history.map((h, idx) => {
              const wh = this._warehouses.find(w => w.id === h.toWarehouseId) || { name: h.toWarehouseId };
              const dateStr = UI.dateTimeStr(h.createdAt);
              const items = h.items || [];
              const totalVal = items.reduce((sum, item) => {
                 const p = this._products.find(x => x.id === item.productId) || {};
                 return sum + (Number(item.qty) * (p.costVat || 0));
              }, 0);
              const totalQty = items.reduce((a, b) => a + Number(b.qty), 0);

              return `
                <tr class="animate-in" style="animation-delay: ${idx * 0.03}s; border-bottom:1px solid var(--border-light)">
                  <td style="font-size:0.8rem">
                    <div class="fw-bold">${dateStr.split(' ')[0]}</div>
                    <div style="color:var(--text-muted)">${dateStr.split(' ')[1]} น.</div>
                  </td>
                  <td>
                    <div class="fw-bold" style="color:var(--primary)">${h.docNo || 'ไม่มีเลขอ้างอิง'}</div>
                    <div style="display:flex;align-items:center;gap:8px">
                      ${(() => {
                        const u = this._users.find(ux => ux.username === h.username);
                        return UI.avatar(u?.avatar, h.username, 24);
                      })()}
                      <div style="font-size:0.7rem;color:var(--text-muted)">โดย: ${h.username}</div>
                    </div>
                  </td>
                  <td style="font-size:0.85rem">
                    <div style="display:flex;align-items:center;gap:6px">
                      ${UI.avatar(wh.avatar, wh.name, 24, 'warehouse')}
                      <span>${wh.name}</span>
                    </div>
                  </td>
                  <td style="font-size:0.85rem">
                    <div class="fw-bold">${h.supplier || 'ไม่ระบุ'}</div>
                    ${h.note ? `<div class="text-muted" style="font-size:0.75rem">${h.note}</div>` : ''}
                  </td>
                  <td class="td-right">
                     <div class="fw-bold" style="color:var(--primary)">${UI.currency(totalQty, 0)}</div>
                     <div class="text-muted" style="font-size:0.7rem">${items.length} SKU</div>
                  </td>
                  <td class="td-right">
                    <div class="fw-bold" style="color:var(--success)">฿${UI.currency(totalVal, 0)}</div>
                  </td>
                  <td class="td-center">
                    <button class="btn btn-secondary btn-xs" onclick="PAGES['receive-history'].viewDetail(${idx})">
                      <span class="material-icons">visibility</span> รายละเอียด
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  applyFilters(e) {
    if (e) e.preventDefault();
    this.fetchAndRender();
  },

  async viewDetail(indexOrId) {
    if (typeof indexOrId === 'number' && this._history[indexOrId]) {
      this._renderDetail(this._history[indexOrId]);
      return;
    }
    UI.loading(true);
    try {
      const res = await API._call('getReceiveHistoryDetail', { id: indexOrId });
      if (res.record) this._renderDetail(res.record);
      else throw new Error('ไม่พบข้อมูล');
    } catch(e) {
      UI.toast(e.message, 'error');
    } finally {
      UI.loading(false);
    }
  },

  _renderDetail(record) {
    const items = record.items || [];
    const wh = this._warehouses.find(w => w.id === record.toWarehouseId) || {};

    let html = `
      <div style="margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:0.9rem">
        <div>
          <div class="text-muted">เลขที่เอกสาร:</div>
          <div class="td-bold" style="font-size:1.1rem">${record.docNo || '-'}</div>
          <div class="text-muted mt-8">คลัง:</div>
          <div>${wh.name || record.toWarehouseId}</div>
        </div>
        <div style="text-align:right">
          <div class="text-muted">วันที่รับสินค้า:</div>
          <div>${UI.dateTimeStr(record.createdAt)}</div>
          <div class="text-muted mt-8">ผู้บันทึก:</div>
          <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
            ${(() => {
              const u = this._users.find(ux => ux.username === record.username);
              return UI.avatar(u?.avatar, record.username, 24);
            })()}
            <div>${record.username}</div>
          </div>
        </div>
      </div>
      <div style="padding:12px; background:var(--bg-app); border-radius:8px; margin-bottom:16px; font-size:0.85rem">
         <strong>Supplier:</strong> ${record.supplier || '-'}<br/>
         <strong>หมายเหตุ:</strong> ${record.note || '-'}
      </div>
      <div class="table-wrap" style="max-height:400px;overflow-y:auto">
        <table class="table table-sm">
          <thead>
            <tr>
              <th width="40">รูป</th>
              <th>สินค้า</th>
              <th width="80" class="td-right">จำนวน</th>
              <th width="100">วันหมดอายุ</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => {
              const p = this._products.find(x => x.id === it.productId) || {};
              return `
                <tr>
                  <td>
                    ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:34px;height:34px;border-radius:4px;object-fit:contain;background:#fff;border:1px solid #eee" />` : '<div class="product-img-placeholder" style="width:34px;height:34px;font-size:16px"><span class="material-icons" style="font-size:16px">inventory_2</span></div>'}
                  </td>
                  <td>
                    <div class="td-bold" style="font-size:0.85rem">${p.name || it.productId}</div>
                    <div class="text-muted" style="font-size:0.7rem">${p.code || ''}</div>
                  </td>
                  <td class="td-right"><b>${UI.currency(it.qty, 0)}</b> ${p.unit || ''}</td>
                  <td class="td-center">
                    <span class="badge" style="background:#f1f3f4;color:#5f6368;font-size:0.7rem">${UI.dateStr(it.expiryDate) || '-'}</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    openModal('รายละเอียดการรับสินค้า', html, `
      <button class="btn btn-secondary" onclick="closeModal()">ปิด</button>
    `, '650px');
  }
};
