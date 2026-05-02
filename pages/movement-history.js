// ============================================================
// pages/movement-history.js – Detailed stock movement history
// ============================================================

PAGES['movement-history'] = {
  _history: [],
  _warehouses: [],
  _products: [],
  _users: [],,

  async render() {
    const el = document.getElementById('page-movement-history');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">ประวัติการย้ายคลังสินค้า</h2>
          <p class="page-subtitle">ตรวจสอบประวัติการโอนย้ายสินค้าระหว่างคลังทั้งหมดในระบบ</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="PAGES['movement-history'].load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
        </div>
      </div>
      
      <div id="mh-summary-ribbon" class="grid-3 mb-16">
        <div class="stat-card blue"><div class="stat-bg-icon"><span class="material-icons">swap_horiz</span></div><div class="stat-label">จำนวนการย้ายทั้งหมด</div><div id="mh-sum-count" class="stat-value">0</div></div>
        <div class="stat-card green"><div class="stat-bg-icon"><span class="material-icons">inventory_2</span></div><div class="stat-label">รวมสินค้าที่ย้าย</div><div id="mh-sum-units" class="stat-value">0</div></div>
        <div class="stat-card purple"><div class="stat-bg-icon"><span class="material-icons">payments</span></div><div class="stat-label">รวมมูลค่าสินค้า (EST)</div><div id="mh-sum-value" class="stat-value">฿0</div></div>
      </div>

      <div class="card mb-16">
        <form id="mh-filter-form" onsubmit="PAGES['movement-history'].applyFilter(event)" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group mb-0" style="width:150px">
            <label>วันที่เริ่มต้น</label>
            <input type="date" id="mh-start-date" onchange="PAGES['movement-history'].applyFilter()" />
          </div>
          <div class="form-group mb-0" style="width:150px">
            <label>วันที่สิ้นสุด</label>
            <input type="date" id="mh-end-date" onchange="PAGES['movement-history'].applyFilter()" />
          </div>
          <div class="form-group mb-0" style="flex:1;min-width:200px">
            <label>ค้นหา (รายละเอียด, รหัส)</label>
            <input type="text" id="mh-query" placeholder="ระบุคำค้นหา..." oninput="PAGES['movement-history'].applyFilter()" />
          </div>
          <button type="submit" class="btn btn-primary" style="height:42px">
            <span class="material-icons">search</span> ค้นหา
          </button>
        </form>
      </div>

      <div id="mh-list" class="grid-1">
        ${UI.spinner()}
      </div>
    `;

    // Default dates (last 30 days)
    const end = new Date();
    const start = new Date(); start.setDate(start.getDate() - 30);
    document.getElementById('mh-start-date').value = start.toISOString().split('T')[0];
    document.getElementById('mh-end-date').value = end.toISOString().split('T')[0];

    await this.load();
  },

  async load() {
    try {
      const startDate = document.getElementById('mh-start-date').value;
      const endDate = document.getElementById('mh-end-date').value;
      
      const [hRes, wRes, pRes, uRes] = await Promise.all([
        API.getMovementHistory({ startDate, endDate }),
        API.getWarehouses(),
        API.getProducts(),
        API.getUsers()
      ]);
      this._history = hRes.history || [];
      this._warehouses = wRes.warehouses || [];
      this._products = pRes.products || [];
      this._users = uRes.users || [];
      
      this.applyFilter();
    } catch(e) {
      UI.toast('โหลดประวัติล้มเหลว: ' + e.message, 'error');
    }
  },

  applyFilter(e) {
    if (e) e.preventDefault();
    const q = (document.getElementById('mh-query')?.value || '').toLowerCase().trim();
    
    const filtered = this._history.filter(h => {
      const matchQuery = !q || h.id.toLowerCase().includes(q) || h.username.toLowerCase().includes(q);
      return matchQuery;
    });

    // Update summary stats
    let totalCount = filtered.length;
    let totalUnits = 0;
    let totalValue = 0;
    filtered.forEach(h => {
      (h.items || []).forEach(it => {
        const p = this._products.find(x => x.id === it.productId) || {};
        totalUnits += Number(it.qty) || 0;
        totalValue += (Number(it.qty) || 0) * (p.costVat || 0);
      });
    });

    document.getElementById('mh-sum-count').textContent = totalCount;
    document.getElementById('mh-sum-units').textContent = UI.currency(totalUnits, 0);
    document.getElementById('mh-sum-value').textContent = `฿${UI.currency(totalValue, 0)}`;

    this.renderList(filtered);
  },

  renderList(data) {
    const el = document.getElementById('mh-list');
    if (!data.length) {
      el.innerHTML = UI.emptyState('history', 'ไม่พบประวัติการย้ายคลัง', 'ลองเปลี่ยนเงื่อนไขการค้นหาหรือช่วงวันที่');
      return;
    }

    el.innerHTML = `
      <div class="table-wrap card" style="padding:0">
        <table style="border:none">
          <thead>
            <tr>
              <th>วันที่/เวลา</th>
              <th>รายละเอียด/รหัส</th>
              <th>คลังต้นทาง</th>
              <th>คลังปลายทาง</th>
              <th class="td-right">สินค้า</th>
              <th class="td-right">มูลค่ารวม (EST)</th>
              <th>ทำรายการโดย</th>
              <th class="td-center"></th>
            </tr>
          </thead>
          <tbody>
            ${data.map((h, idx) => {
              const fromWh = this._warehouses.find(w => w.id === h.fromWarehouseId) || { name: h.fromWarehouseId };
              const toWh = this._warehouses.find(w => w.id === h.toWarehouseId) || { name: h.toWarehouseId };
              const dt = UI.dateTimeParts(h.createdAt);
              const items = h.items || [];
              const totalVal = items.reduce((sum, item) => {
                const p = this._products.find(x => x.id === item.productId) || {};
                return sum + (Number(item.qty) * (p.costVat || 0));
              }, 0);
              
              return `
                <tr class="animate-in" style="animation-delay: ${idx * 0.03}s; border-bottom:1px solid var(--border-light)">
                  <td style="font-size:0.8rem">
                    <div class="fw-bold">${dt.date}</div>
                    <div style="color:var(--text-muted)">${dt.time} น.</div>
                  </td>
                  <td>
                    <div class="fw-bold" style="color:var(--primary); font-family:monospace">${h.id.slice(0,8)}...</div>
                    <div style="font-size:0.7rem;color:var(--text-muted)">Internal Movement</div>
                  </td>
                  <td style="font-size:0.85rem">
                    <div style="display:flex;align-items:center;gap:6px">
                      ${UI.avatar(fromWh.avatar, fromWh.name, 26)}
                      <span title="${fromWh.name}">${fromWh.name}</span>
                    </div>
                  </td>
                  <td style="font-size:0.85rem">
                    <div style="display:flex;align-items:center;gap:6px">
                      ${UI.avatar(toWh.employeeAvatar || toWh.avatar, toWh.employeeName || toWh.name, 26)}
                      <span title="${toWh.employeeName || toWh.name}">${toWh.employeeName || toWh.name}</span>
                    </div>
                  </td>
                  <td class="td-right">
                    <div class="fw-bold" style="color:var(--primary)">${items.length} รายการ</div>
                    <div style="font-size:0.7rem;color:var(--text-muted)">Items</div>
                  </td>
                  <td class="td-right">
                    <div class="fw-bold" style="color:var(--success)">฿${UI.currency(totalVal, 0)}</div>
                  </td>
                  <td style="font-size:0.85rem">
                    <div style="display:flex;align-items:center;gap:8px">
                      ${(() => {
                        const u = this._users.find(ux => ux.username === h.username);
                        return UI.avatar(u?.avatar, h.username, 24);
                      })()}
                      <div class="fw-bold">${h.username}</div>
                    </div>
                  </td>
                  <td class="td-center">
                    <button class="btn btn-secondary btn-xs" onclick="PAGES['movement-history'].viewDetail('${h.createdAt}_${h.userId}')">
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

  viewDetail(groupKey) {
    const h = this._history.find(x => (x.createdAt + '_' + x.userId) === groupKey);
    if (!h) return;

    const fromWh = this._warehouses.find(w => w.id === h.fromWarehouseId) || { name: h.fromWarehouseId };
    const toWh = this._warehouses.find(w => w.id === h.toWarehouseId) || { name: h.toWarehouseId };

    const body = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;font-size:0.9rem">
        <div>
          <div style="color:var(--text-muted);margin-bottom:4px">ข้อมูลเบื้องต้น</div>
          <div class="fw-bold">วัน/เวลา: ${UI.dateTimeStr(h.createdAt)}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <span style="color:var(--text-muted)">ผู้นำเข้า:</span>
            ${(() => {
              const u = this._users.find(ux => ux.username === h.username);
              return UI.avatar(u?.avatar, h.username, 22);
            })()}
            <span class="fw-bold">${h.username}</span>
          </div>
          ${h.note ? `<div style="margin-top:8px; font-style:italic">"${h.note}"</div>` : ''}
        </div>
        <div>
          <div style="color:var(--text-muted);margin-bottom:4px">เส้นทาง</div>
          <div>ต้นทาง: <strong>${fromWh.name}</strong></div>
          <div>ปลายทาง: <strong>${toWh.employeeName || toWh.name}</strong></div>
        </div>
      </div>

      <div class="table-wrap" style="max-height:400px;overflow-y:auto; border-radius:12px; border:1px solid var(--border)">
        <table class="table-sm">
          <thead>
            <tr style="background:var(--bg-card2)">
              <th>สินค้า</th>
              <th class="td-center">วันหมดอายุ</th>
              <th class="td-right">จำนวน</th>
            </tr>
          </thead>
          <tbody>
            ${h.items.map(it => {
              const p = this._products.find(x => x.id === it.productId) || {};
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:12px">
                      <div class="item-img-mini" style="width:36px;height:36px;flex-shrink:0">
                        ${p.imageUrl ? `<img src="${p.imageUrl}" />` : '<span class="material-icons" style="font-size:18px;color:var(--text-muted)">inventory_2</span>'}
                      </div>
                      <div>
                        <div class="fw-bold" style="font-size:0.85rem">${p.name || it.productId}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">${p.code || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td class="td-center" style="font-size:0.85rem">
                    ${it.expiryDate && it.expiryDate !== '9999-12-31' ? UI.dateStr(it.expiryDate) : '-'}
                  </td>
                  <td class="td-right fw-bold" style="color:var(--primary);font-size:1rem">
                    ${UI.currency(it.qty, 0)} ${it.unit}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    openModal(`รายละเอียดการย้ายสต็อก`, body, `<button class="btn btn-secondary" onclick="closeModal()">ปิด</button>`, '700px');
  }
};
