// ============================================================
// pages/transfer-history.js – Detailed transfer order history
// ============================================================

PAGES['transfer-history'] = {
  _orders: [],
  _products: [],
  _warehouses: [],

  async render() {
    const el = document.getElementById('page-transfer-history');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">ประวัติการเบิกสินค้า</h2>
          <p class="page-subtitle">ตรวจสอบสถานะรายการขอเบิกและการจัดส่งสินค้าทั้งหมด</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="PAGES['transfer-history'].load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
        </div>
      </div>

      <div id="th-summary-ribbon" class="grid-3 mb-16">
        <div class="stat-card blue"><div class="stat-bg-icon"><span class="material-icons">local_shipping</span></div><div class="stat-label">จำนวนใบเบิกทั้งหมด</div><div id="th-sum-count" class="stat-value">0</div></div>
        <div class="stat-card green"><div class="stat-bg-icon"><span class="material-icons">inventory_2</span></div><div class="stat-label">รวมสินค้าที่เบิก</div><div id="th-sum-units" class="stat-value">0</div></div>
        <div class="stat-card purple"><div class="stat-bg-icon"><span class="material-icons">payments</span></div><div class="stat-label">รวมมูลค่าสินค้า (EST)</div><div id="th-sum-value" class="stat-value">฿0</div></div>
      </div>

      <div class="card mb-16">
        <form id="th-filter-form" onsubmit="PAGES['transfer-history'].applyFilter(event)" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group mb-0" style="width:150px">
            <label>วันที่เริ่มต้น</label>
            <input type="date" id="th-start-date" onchange="PAGES['transfer-history'].applyFilter()" />
          </div>
          <div class="form-group mb-0" style="width:150px">
            <label>วันที่สิ้นสุด</label>
            <input type="date" id="th-end-date" onchange="PAGES['transfer-history'].applyFilter()" />
          </div>
          <div class="form-group mb-0" style="width:160px">
            <label>สถานะ</label>
            <select id="th-status" onchange="PAGES['transfer-history'].applyFilter()">
              <option value="">-- ทั้งหมด --</option>
              <option value="pending">⏳ รอจัดสินค้า</option>
              <option value="completed">✅ จัดเสร็จแล้ว</option>
              <option value="rejected">❌ ถูกปฏิเสธ</option>
            </select>
          </div>
          <div class="form-group mb-0" style="flex:1;min-width:200px">
            <label>ค้นหา (เลขอ้างอิง, พนักงาน)</label>
            <input type="text" id="th-query" placeholder="ระบุคำค้นหา..." oninput="PAGES['transfer-history'].applyFilter()" />
          </div>
          <button type="submit" class="btn btn-primary" style="height:42px">
            <span class="material-icons">search</span> ค้นหา
          </button>
        </form>
      </div>

      <div id="th-list" class="grid-1">
        ${UI.spinner()}
      </div>
    `;

    // Default dates (last 30 days)
    const end = new Date();
    const start = new Date(); start.setDate(start.getDate() - 30);
    document.getElementById('th-start-date').value = start.toISOString().split('T')[0];
    document.getElementById('th-end-date').value = end.toISOString().split('T')[0];

    await this.load();
  },

  async load() {
    try {
      const [oRes, pRes, wRes] = await Promise.all([
        API.getOrders(),
        API.getProducts(),
        API.getWarehouses()
      ]);
      this._orders = (oRes.orders || []).filter(o => o.id?.startsWith('REQ') || o.id?.startsWith('TR'));
      this._products = pRes.products || [];
      this._warehouses = wRes.warehouses || [];
      this.applyFilter();
    } catch(e) {
      UI.toast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error');
    }
  },

  applyFilter(e) {
    if (e) e.preventDefault();
    const q = document.getElementById('th-query')?.value.toLowerCase().trim();
    const s = document.getElementById('th-status')?.value;
    const startDate = document.getElementById('th-start-date').value;
    const endDate = document.getElementById('th-end-date').value;
    
    const filtered = this._orders.filter(o => {
      const matchSearch = !q || o.id.toLowerCase().includes(q) || (o.requestedBy||'').toLowerCase().includes(q);
      const matchStatus = !s || o.status === s;
      const createdAt = o.createdAt?.split('T')[0] || '';
      const matchDate = (!startDate || createdAt >= startDate) && (!endDate || createdAt <= endDate);
      
      return matchSearch && matchStatus && matchDate;
    });

    // Update summary stats
    const totalCount = filtered.length;
    let totalUnits = 0;
    let totalValue = 0;
    filtered.forEach(o => {
      (o.items || []).forEach(it => {
        const p = this._products.find(x => x.id === it.productId) || {};
        totalUnits += Number(it.qty) || 0;
        totalValue += (Number(it.qty) || 0) * (p.costVat || 0);
      });
    });

    document.getElementById('th-sum-count').textContent = totalCount;
    document.getElementById('th-sum-units').textContent = UI.currency(totalUnits, 0);
    document.getElementById('th-sum-value').textContent = `฿${UI.currency(totalValue, 0)}`;

    this.renderList(filtered);
  },

  renderList(orders) {
    const el = document.getElementById('th-list');
    if (!orders.length) {
      el.innerHTML = UI.emptyState('history', 'ไม่พบประวัติการเบิกสินค้า', 'ลองเปลี่ยนเงื่อนไขการค้นหาหรือช่วงวันที่');
      return;
    }

    el.innerHTML = `
      <div class="table-wrap card" style="padding:0">
        <table style="border:none">
          <thead>
            <tr>
              <th>วัน/เวลา</th>
              <th>พนักงาน/รายละเอียด</th>
              <th>เส้นทาง (ต้นทาง → ปลายทาง)</th>
              <th class="td-right">สินค้า</th>
              <th class="td-right">มูลค่ารวม (EST)</th>
              <th class="td-center">สถานะ</th>
              <th class="td-center"></th>
            </tr>
          </thead>
          <tbody>
            ${orders.map((o, idx) => {
              const items = o.items || [];
              const fromWh = this._warehouses.find(w => String(w.id).trim() === String(o.fromWhId).trim()) || { name: o.fromWhId };
              const toWh = this._warehouses.find(w => String(w.id).trim() === String(o.toWhId).trim()) || { name: o.toWhId };
              const dt = UI.dateTimeParts(o.createdAt);
              
              const totalVal = items.reduce((sum, item) => {
                const p = this._products.find(x => x.id === item.productId) || {};
                return sum + (Number(item.qty) * (p.costVat || 0));
              }, 0);

              let statusBadge = '';
              if (o.status === 'pending') statusBadge = '<span class="badge badge-yellow">รอจัดสินค้า</span>';
              else if (o.status === 'completed') statusBadge = '<span class="badge badge-green">จัดเสร็จแล้ว</span>';
              else if (o.status === 'rejected') statusBadge = '<span class="badge badge-red">ถูกปฏิเสธ</span>';

              return `
                <tr class="animate-in" style="animation-delay: ${idx * 0.03}s; border-bottom:1px solid var(--border-light)">
                  <td style="font-size:0.8rem">
                    <div class="fw-bold">${dt.date}</div>
                    <div style="color:var(--text-muted)">${dt.time} น.</div>
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div>
                        <div class="fw-bold">${o.requestedBy}</div>
                        <div style="font-size:0.7rem;color:var(--text-muted)">#${o.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style="font-size:0.75rem">
                    <div style="display:flex;align-items:center;gap:8px;max-width:300px">
                      <div style="display:flex;align-items:center;gap:4px">
                        ${UI.avatar(fromWh.avatar, fromWh.name, 22)}
                        <span style="max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${fromWh.name}">${fromWh.name}</span>
                      </div>
                      <span class="material-icons" style="font-size:14px;color:var(--text-muted)">arrow_forward</span>
                      <div style="display:flex;align-items:center;gap:4px">
                        ${UI.avatar(toWh.employeeAvatar || toWh.avatar, toWh.employeeName || toWh.name, 22)}
                        <span style="max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${toWh.employeeName || toWh.name}">${toWh.employeeName || toWh.name}</span>
                      </div>
                    </div>
                  </td>
                  <td class="td-right">
                    <div class="fw-bold" style="color:var(--primary)">${items.length} SKU</div>
                  </td>
                  <td class="td-right">
                    <div class="fw-bold" style="color:var(--success)">฿${UI.currency(totalVal, 0)}</div>
                  </td>
                  <td class="td-center">${statusBadge}</td>
                  <td class="td-center">
                    <button class="btn btn-secondary btn-xs" onclick="PAGES['transfer-history'].viewDetail('${o.id}')">
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

  viewDetail(orderId) {
    const o = this._orders.find(x => x.id === orderId);
    if (!o) return;
    
    const fromWh = this._warehouses.find(w => w.id === o.fromWhId) || {};
    const toWh = this._warehouses.find(w => w.id === o.toWhId) || {};
    const items = o.items || [];

    let statusHtml = '';
    if (o.status === 'pending') statusHtml = '<div class="alert alert-warning mb-16"><span class="material-icons">schedule</span> รายการนี้กำลังรอพนักงานคลังจัดของ</div>';
    else if (o.status === 'completed') statusHtml = '<div class="alert alert-success mb-16"><span class="material-icons">check_circle</span> รายการนี้จัดของและโอนสต็อกเสร็จสมบูรณ์แล้ว</div>';
    else if (o.status === 'rejected') statusHtml = '<div class="alert alert-danger mb-16"><span class="material-icons">cancel</span> รายการนี้ถูกปฏิเสธหรือยกเลิก</div>';

    const body = `
      ${statusHtml}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;font-size:0.88rem">
        <div>
          <div style="color:var(--text-muted);margin-bottom:4px">ข้อมูลเบื้องต้น</div>
          <div class="fw-bold">เลขอ้างอิง: ${o.id}</div>
          <div>วันที่ขอ: ${UI.dateTimeStr(o.createdAt)}</div>
          <div>โดย: ${o.requestedBy}</div>
        </div>
        <div>
          <div style="color:var(--text-muted);margin-bottom:4px">เส้นทาง</div>
          <div>จาก: <strong>${fromWh.name || o.fromWhId}</strong></div>
          <div>ถึง: <strong>${toWh.employeeName || toWh.name || o.toWhId}</strong></div>
        </div>
      </div>

      <div class="table-wrap" style="max-height:300px;overflow-y:auto">
        <table class="table-sm">
          <thead>
            <tr style="background:var(--bg-card2)">
              <th>สินค้า</th>
              <th class="td-right">จำนวน</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => {
              const p = this._products.find(x => x.id === it.productId) || {};
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:12px">
                      <div class="item-img-mini" style="width:36px;height:36px;flex-shrink:0">
                        ${p.imageUrl ? `<img src="${p.imageUrl}" onerror="this.src='https://placehold.co/40x40?text=?'" />` : '<span class="material-icons" style="font-size:18px;color:var(--text-muted)">inventory_2</span>'}
                      </div>
                      <div>
                        <div class="fw-bold" style="font-size:0.85rem">${p.name || it.productId}</div>
                        <div style="font-size:0.7rem;color:var(--text-muted)">${p.code || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td class="td-right fw-bold" style="color:var(--primary);font-size:0.9rem">${UI.currency(it.qty, 0)} ${it.unit}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      ${o.note ? `<div style="margin-top:16px;padding:12px;background:var(--bg-base);border-radius:8px;font-size:0.85rem">
        <strong>หมายเหตุ:</strong> ${o.note}
      </div>` : ''}
    `;

    openModal(`รายละเอียดใบเบิก ${o.id}`, body, `<button class="btn btn-secondary" onclick="closeModal()">ปิด</button>`, '600px');
  }
};
