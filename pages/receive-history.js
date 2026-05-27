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
      const [prodRes, whRes, userRes, supRes] = await Promise.all([
        API.getProducts(),
        API.getWarehouses(),
        API.getUsers(),
        API.getSuppliers ? API.getSuppliers() : Promise.resolve({ suppliers: [] })
      ]);
      
      this._products = prodRes.products || [];
      this._warehouses = whRes.warehouses || [];
      this._users = userRes.users || [];
      this._suppliers = supRes.suppliers || [];
      
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
                     <div class="text-muted" style="font-size:0.7rem">${items.length} ชนิด</div>
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
                    <div style="font-size:0.7rem;color:var(--text-muted);font-weight:normal;margin-top:2px;">
                      <span style="color:var(--primary);font-weight:bold">${p.category || '-'}</span> | รหัส: ${p.code || '-'}
                    </div>
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
      ${AUTH.isAdmin() ? `<button class="btn btn-warning" onclick="PAGES['receive-history'].openEdit('${record.docNo || record.id}')"><span class="material-icons">edit</span> แก้ไขข้อมูล</button>` : ''}
      <button class="btn btn-secondary" onclick="closeModal()">ปิด</button>
    `, '1200px');
  },

  openEdit(id) {
    const record = this._history.find(h => String(h.docNo) === String(id) || String(h.id) === String(id));
    if (!record) return;
    this._editingRecord = JSON.parse(JSON.stringify(record));
    this._renderEditModal();
  },

  _renderEditModal() {
    const record = this._editingRecord;
    const wh = this._warehouses.find(w => w.id === record.toWarehouseId) || {};
    
    // Header Inputs
    let html = `
      <div style="background:var(--bg-app); padding:16px; border-radius:8px; margin-bottom:16px;">
        <div class="grid-2 mb-16">
          <div class="form-group">
            <label>วันที่รับสินค้า</label>
            <input type="text" value="${UI.dateTimeStr(record.createdAt)}" disabled class="input" style="background:#f1f3f4" />
            <input type="hidden" id="rh-edit-createdAt" value="${record.createdAt}" />
            <input type="hidden" id="rh-edit-originalKey" value="${record.docNo || (record.createdAt + '_' + record.username)}" />
            <input type="hidden" id="rh-edit-warehouseId" value="${record.toWarehouseId}" />
          </div>
          <div class="form-group">
            <label>คลังสินค้า</label>
            <input type="text" value="${wh.name || record.toWarehouseId}" disabled class="input" style="background:#f1f3f4" />
          </div>
        </div>
        <div class="grid-3 mb-16">
          <div class="form-group">
            <label>ใบรับสินค้าเลขที่</label>
            <input type="text" id="rh-edit-docNo" value="${record.docNo || ''}" class="input" />
          </div>
          <div class="form-group">
            <label>ใบสั่งซื้อเลขที่ [P/O No.]</label>
            <input type="text" id="rh-edit-poNo" value="${record.poNo || ''}" class="input" />
          </div>
          <div class="form-group">
            <label>ใบกำกับภาษีเลขที่</label>
            <input type="text" id="rh-edit-taxInvoiceNo" value="${record.taxInvoiceNo || ''}" class="input" />
          </div>
        </div>
        <div class="grid-2 mb-16">
          <div class="form-group">
            <label>ผู้จำหน่าย (Supplier)</label>
            <select id="rh-edit-supplier" class="input">
              <option value="">-- ไม่ระบุ --</option>
              ${this._suppliers.map(s => `<option value="${s.id}" ${record.supplierId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>หมายเหตุ</label>
            <input type="text" id="rh-edit-note" value="${record.note || ''}" class="input" />
          </div>
        </div>
      </div>
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;font-size:1.1rem;color:var(--primary)">รายการสินค้า</h3>
        <button class="btn btn-primary btn-sm" onclick="PAGES['receive-history'].openEditProductPicker()">
          <span class="material-icons">add</span> เพิ่มสินค้า
        </button>
      </div>

      <div class="table-wrap" style="flex:1;min-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
        <table class="table table-sm" style="margin:0">
          <thead style="position:sticky;top:0;z-index:10;background:var(--bg-card)">
            <tr>
              <th width="40">รูป</th>
              <th>สินค้า</th>
              <th width="120" class="td-right">จำนวน</th>
              <th width="140" class="td-center">วันหมดอายุ</th>
              <th width="60" class="td-center">ลบ</th>
            </tr>
          </thead>
          <tbody id="rh-edit-items-tbody">
            ${this._renderEditItems()}
          </tbody>
        </table>
      </div>
    `;

    openModal('แก้ไขประวัติการรับสินค้า (Edit Receive)', html, `
      <button class="btn btn-secondary" onclick="PAGES['receive-history'].viewDetail('${record.docNo || record.id}')">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES['receive-history'].saveEdit()">บันทึกการเปลี่ยนแปลง</button>
    `, '1200px');
  },

  _renderEditItems() {
    const items = this._editingRecord.items || [];
    if (!items.length) {
      return `<tr><td colspan="5" class="td-center text-muted" style="padding:24px">ไม่มีรายการสินค้า</td></tr>`;
    }
    return items.map((it, idx) => {
      const p = this._products.find(x => x.id === it.productId) || {};
      return `
        <tr>
          <td>
            ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:34px;height:34px;border-radius:4px;object-fit:contain;background:#fff;border:1px solid #eee" />` : '<div class="product-img-placeholder" style="width:34px;height:34px;font-size:16px"><span class="material-icons" style="font-size:16px">inventory_2</span></div>'}
          </td>
          <td>
            <div class="td-bold" style="font-size:0.85rem">${p.name || it.productId}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);font-weight:normal;margin-top:2px;">
              <span style="color:var(--primary);font-weight:bold">${p.category || '-'}</span> | รหัส: ${p.code || '-'}
            </div>
          </td>
          <td class="td-right">
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px">
              <input type="number" min="0" value="${it.qty}" style="width:70px;height:30px;padding:4px;text-align:center;border:1px solid var(--border);border-radius:4px" onchange="PAGES['receive-history'].updateEditItem(${idx}, 'qty', this.value)" />
              <span>${p.unit || ''}</span>
            </div>
          </td>
          <td class="td-center">
            <input type="date" value="${it.expiryDate ? UI.dateStr(it.expiryDate, 'YYYY-MM-DD') : ''}" style="width:125px;height:30px;padding:4px;font-size:0.8rem;border:1px solid var(--border);border-radius:4px" onchange="PAGES['receive-history'].updateEditItem(${idx}, 'expiryDate', this.value)" />
          </td>
          <td class="td-center">
            <button class="btn btn-danger btn-icon" style="width:26px;height:26px;padding:0;min-width:auto" onclick="PAGES['receive-history'].removeEditItem(${idx})"><span class="material-icons" style="font-size:14px">close</span></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  updateEditItem(idx, field, val) {
    if (this._editingRecord.items[idx]) {
      this._editingRecord.items[idx][field] = val;
    }
  },

  removeEditItem(idx) {
    this._editingRecord.items.splice(idx, 1);
    document.getElementById('rh-edit-items-tbody').innerHTML = this._renderEditItems();
  },

  openEditProductPicker() {
    const html = `
      <div class="mb-16">
        <div class="search-bar">
          <span class="search-icon"><span class="material-icons">search</span></span>
          <input type="text" id="rh-picker-search" placeholder="พิมพ์ชื่อ, รหัส เพื่อค้นหาสินค้า..." oninput="PAGES['receive-history'].filterEditPicker(this.value)" />
        </div>
      </div>
      <div class="product-picker-grid" id="rh-picker-grid" style="position:relative">
        ${this._products.map(p => `
          <div class="picker-item" onclick="PAGES['receive-history'].addEditItem('${p.id}')">
            ${UI.image(p.imageUrl, 'p-img')}
            <div class="p-info">
              <div class="p-code">${p.code}</div>
              <div class="p-name">${p.name}</div>
              <div class="p-cat">${p.category || '-'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    const div = document.createElement('div');
    div.id = 'rh-edit-picker-overlay';
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    div.innerHTML = `
      <div style="background:var(--bg-card);border-radius:12px;width:900px;max-width:95%;max-height:90vh;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0">เลือกสินค้าเพิ่ม</h3>
          <button class="btn btn-icon" onclick="document.getElementById('rh-edit-picker-overlay').remove()"><span class="material-icons">close</span></button>
        </div>
        <div style="padding:20px;overflow-y:auto;flex:1">
          ${html}
        </div>
      </div>
    `;
    document.body.appendChild(div);
    setTimeout(() => document.getElementById('rh-picker-search')?.focus(), 100);
  },

  filterEditPicker(q) {
    q = q.toLowerCase();
    const grid = document.getElementById('rh-picker-grid');
    grid.innerHTML = this._products.filter(p =>
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.code || '').toLowerCase().includes(q) ||
      String(p.category || '').toLowerCase().includes(q)
    ).map(p => `
      <div class="picker-item" onclick="PAGES['receive-history'].addEditItem('${p.id}')">
        ${UI.image(p.imageUrl, 'p-img')}
        <div class="p-info">
          <div class="p-code">${p.code}</div>
          <div class="p-name">${p.name}</div>
          <div class="p-cat">${p.category || '-'}</div>
        </div>
      </div>
    `).join('');
  },

  addEditItem(productId) {
    const p = this._products.find(x => x.id === productId);
    if (!p) return;
    this._editingRecord.items.push({
      productId: p.id,
      qty: 1,
      unit: p.unit || 'หน่วย',
      expiryDate: ''
    });
    document.getElementById('rh-edit-items-tbody').innerHTML = this._renderEditItems();
    document.getElementById('rh-edit-picker-overlay').remove();
  },

  async saveEdit() {
    const originalKey = document.getElementById('rh-edit-originalKey').value;
    const docNo = document.getElementById('rh-edit-docNo').value.trim();
    const poNo = document.getElementById('rh-edit-poNo').value.trim();
    const taxInvoiceNo = document.getElementById('rh-edit-taxInvoiceNo').value.trim();
    const note = document.getElementById('rh-edit-note').value.trim();
    const supplierId = document.getElementById('rh-edit-supplier').value;
    const createdAt = document.getElementById('rh-edit-createdAt').value;
    const warehouseId = document.getElementById('rh-edit-warehouseId').value;
    
    let supplierName = '';
    if (supplierId) {
      const sup = this._suppliers.find(s => s.id === supplierId);
      supplierName = sup ? sup.name : '';
    }

    const items = this._editingRecord.items.filter(it => Number(it.qty) > 0);
    if (items.length === 0) {
      return UI.toast('ไม่สามารถบันทึกบิลที่ไม่มีสินค้าได้ (หากต้องการลบ ให้ใช้การปรับสต๊อก)', 'warning');
    }

    const newRecord = {
      docNo, poNo, taxInvoiceNo, note, supplierId, supplier: supplierName,
      createdAt, toWarehouseId: warehouseId, items
    };

    UI.loading(true);
    try {
      await API.updateReceiveHistory({ originalKey, newRecord });
      UI.toast('บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
      closeModal();
      this.fetchAndRender(); // refresh table
    } catch(e) {
      UI.toast(e.message, 'error');
    } finally {
      UI.loading(false);
    }
  }
};
