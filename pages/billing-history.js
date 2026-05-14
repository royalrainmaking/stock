// ============================================================
// pages/billing-history.js – Billing history and details
// ============================================================

PAGES['billing-history'] = {
  _billings: [],
  _filters: { startDate: '', endDate: '' },

  async render() {
    // ตั้งค่าเริ่มต้นเป็นต้นเดือนปัจจุบัน เพื่อให้เห็นประวัติย้อนหลังทันที
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayISO = firstDay.getFullYear() + '-' + String(firstDay.getMonth() + 1).padStart(2, '0') + '-01';

    this._filters.startDate = this._filters.startDate || firstDayISO;
    this._filters.endDate = this._filters.endDate || UI.todayISO();

    const el = document.getElementById('page-billing-history');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#E91E8C,#AD1457)">
            <span class="material-icons">payments</span>
          </div>
          <div>
            <h2 class="page-title">ประวัติการคิดเงิน</h2>
            <p class="page-subtitle">ตรวจสอบรายการคิดเงินพนักงานย้อนหลังทั้งหมด</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="PAGES['billing-history'].load()">
            <span class="material-icons">refresh</span> รีเฟร็ช
          </button>
        </div>
      </div>

      <div id="bh-summary-ribbon" class="grid-3 mb-16">
        <div class="stat-card blue"><div class="stat-bg-icon"><span class="material-icons">receipt_long</span></div><div class="stat-label">จำนวนบิลทั้งหมด</div><div id="bh-sum-count" class="stat-value">0</div></div>
        <div class="stat-card green"><div class="stat-bg-icon"><span class="material-icons">shopping_bag</span></div><div class="stat-label">จำนวนสินค้าที่ขาย</div><div id="bh-sum-units" class="stat-value">0</div></div>
        <div class="stat-card purple"><div class="stat-bg-icon"><span class="material-icons">payments</span></div><div class="stat-label">รวมยอดขายสุทธิ</div><div id="bh-sum-value" class="stat-value">฿0</div></div>
      </div>

      <div class="filter-card">
        <form id="bh-filter-form" onsubmit="PAGES['billing-history'].applyFilters(event)">
          <div class="form-group" style="width:150px">
            <label>วันที่เริ่มต้น</label>
            <input type="date" id="bh-start-date" value="${this._filters.startDate}" onchange="PAGES['billing-history'].applyFilters()" />
          </div>
          <div class="form-group" style="width:150px">
            <label>วันที่สิ้นสุด</label>
            <input type="date" id="bh-end-date" value="${this._filters.endDate}" onchange="PAGES['billing-history'].applyFilters()" />
          </div>
          <div class="form-group" style="flex:1;min-width:200px">
            <label>ค้นหา (พนักงาน, เลขอ้างอิง)</label>
            <input type="text" id="bh-query" placeholder="ระบุคำค้นหา..." oninput="PAGES['billing-history'].applyFilters()" />
          </div>
          <button type="submit" class="btn btn-primary" style="height:42px">
            <span class="material-icons">search</span> ค้นหา
          </button>
        </form>
      </div>

      <div id="bh-list">${UI.skeletonTable(5, 8)}</div>
    `;
    await this.load();
  },

  async load() {
    this._filters.startDate = document.getElementById('bh-start-date').value;
    this._filters.endDate = document.getElementById('bh-end-date').value;
    const container = document.getElementById('bh-list');
    if (container) container.innerHTML = UI.skeletonTable(5, 8);

    try {
      const res = await API.getBillingHistory(this._filters.startDate, this._filters.endDate);
      this._billings = res.billings || [];
      this.applyFilters();
    } catch(e) {
      container.innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  applyFilters(e) {
    if (e) e.preventDefault();
    const q = (document.getElementById('bh-query')?.value || '').toLowerCase().trim();
    const filtered = this._billings.filter(b => 
      !q || b.id.toLowerCase().includes(q) || 
      (b.employee?.displayName || '').toLowerCase().includes(q) ||
      (b.warehouseName || '').toLowerCase().includes(q)
    );

    // Update stats
    const totalCount = filtered.length;
    const totalUnits = filtered.reduce((a, b) => a + (Number(b.totalUnits) || 0), 0);
    const totalAmt = filtered.reduce((a, b) => a + (Number(b.totalAmt) || 0), 0);

    document.getElementById('bh-sum-count').textContent = totalCount;
    document.getElementById('bh-sum-units').textContent = UI.currency(totalUnits, 0);
    document.getElementById('bh-sum-value').textContent = `฿${UI.currency(totalAmt, 0)}`;

    this.renderList(filtered);
  },

  renderList(data = this._billings) {
    const el = document.getElementById('bh-list');
    if (!data.length) {
      el.innerHTML = UI.emptyState('history', 'ไม่พบประวัติการคิดเงิน', 'ลองเปลี่ยนเงื่อนไขการค้นหาหรือช่วงวันที่');
      return;
    }

    el.innerHTML = `
      <div class="table-wrap card" style="padding:0">
        <table style="border:none">
          <thead>
            <tr>
              <th>วัน/เวลา</th>
              <th>เลขอ้างอิง</th>
              <th>พนักงาน / คลัง</th>
              <th class="td-right">หน่วยขาย</th>
              <th class="td-right">ยอดเงินรวม</th>
              <th class="td-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((b, idx) => `
              <tr class="animate-in" style="animation-delay: ${idx * 0.03}s; border-bottom:1px solid var(--border-light)">
                <td style="font-size:0.82rem">
                  <div class="fw-bold">${UI.dateStr(b.date)}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">${UI.dateTimeParts(b.createdAt).time} น.</div>
                </td>
                <td style="font-family:monospace;font-size:0.8rem;color:var(--primary)">${b.id}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    ${UI.avatar(b.employee?.avatar, b.employee?.displayName, 32)}
                    <div>
                      <div class="fw-bold" style="font-size:0.85rem">${b.employee?.displayName || 'พนักงาน'}</div>
                      <div style="font-size:0.7rem;color:var(--text-muted)">${b.warehouseName || b.warehouseId}</div>
                    </div>
                  </div>
                </td>
                <td class="td-right fw-bold">${UI.currency(b.totalUnits, 0)}</td>
                <td class="td-right text-success fw-bold">฿${UI.currency(b.totalAmt)}</td>
                <td class="td-center">
                  <div style="display:flex;gap:6px;justify-content:center">
                    <button class="btn btn-secondary btn-xs" onclick="PAGES['billing-history'].viewDetail('${b.id}')">
                      <span class="material-icons">visibility</span> รายละเอียด
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async viewDetail(id) {
    try {
      UI.loading(true);
      const res = await API.getBillingDetail(id);
      const b = res.billing;
      const items = JSON.parse(b.items || '[]');
      
      const body = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;font-size:0.9rem">
          <div>
            <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:4px">ข้อมูลรายการ</div>
            <div class="fw-bold">เลขอ้างอิง: ${b.id}</div>
            <div>วันที่: ${UI.dateStr(b.date)}</div>
            <div>เวลาบันทึก: ${UI.dateTimeStr(b.createdAt)}</div>
          </div>
          <div>
            <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:4px">ข้อมูลพนักงาน</div>
            <div class="fw-bold">${b.employee?.displayName || b.employeeId}</div>
            <div>${b.warehouseName || b.warehouseId}</div>
          </div>
        </div>

        <div class="table-wrap" style="max-height:400px;overflow-y:auto;margin-bottom:20px">
          <table class="table-sm">
            <thead>
              <tr style="background:var(--bg-card2)">
                <th>สินค้า</th>
                <th class="td-right">หน่วยขาย</th>
                <th class="td-right">ราคา</th>
                <th class="td-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => `
                <tr>
                  <td class="fw-bold">${it.productName || it.productId}</td>
                  <td class="td-right">${UI.currency(it.sold, 0)} ${it.unit || ''}</td>
                  <td class="td-right">฿${UI.currency(it.pricePerUnit)}</td>
                  <td class="td-right text-primary-color fw-bold">฿${UI.currency(it.sold * it.pricePerUnit)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="td-right fw-bold">ยอดขายสุทธิรวมทั้งสิ้น</td>
                <td class="td-right text-success fw-bold" style="font-size:1.1rem">฿${UI.currency(b.totalAmt)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        ${b.note ? `<div style="padding:12px;background:var(--bg-base);border-radius:8px;font-size:0.85rem">
          <strong>หมายเหตุ:</strong> ${b.note}
        </div>` : ''}
      `;

      UI.loading(false);
      openModal('รายละเอียดการคิดเงิน', body, `
        <button class="btn btn-secondary" onclick="closeModal()">ปิด</button>
        <button class="btn btn-success" onclick="PAGES['billing-history'].reprintBilling('${id}')">
           <span class="material-icons">print</span> พิมพ์ใบเสร็จ (Reprint)
        </button>
        <button class="btn btn-primary" onclick="PAGES['tax-invoice'].render(); showPage('tax-invoice')">
           <span class="material-icons">description</span> ใบกำกับภาษี
        </button>
      `, '650px');
    } catch(e) {
      UI.loading(false);
      UI.toast('โหลดรายละเอียดไม่สำเร็จ: ' + e.message, 'error');
    }
  },

  async reprintBilling(id) {
    try {
      UI.loading(true);
      const res = await API.getBillingDetail(id);
      const b = res.billing;
      const items = JSON.parse(b.items || '[]');
      
      // บังคับโหลด CSS ของใบเสร็จก่อนแสดงผล (สำคัญมากเพื่อให้หน้าตาเหมือนเดิม)
      if (typeof PAGES.billing.injectStyles === 'function') {
        PAGES.billing.injectStyles();
      }

      // เรียกใช้ฟังก์ชันแสดงใบเสร็จจากหน้า billing โดยตรง
      PAGES.billing.showReceipt({
        billId: b.id,
        date: b.date,
        employeeName: b.employee?.displayName || b.employeeId,
        whName: b.warehouseName || b.warehouseId,
        totalAmt: b.totalAmt,
        items: items,
        note: b.note
      });
      
      UI.loading(false);
    } catch(e) {
      UI.loading(false);
      UI.toast('Reprint ไม่สำเร็จ: ' + e.message, 'error');
    }
  }
};
