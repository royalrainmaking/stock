// ============================================================
// pages/billing.js – Daily billing for employee inventory
// ============================================================

PAGES['billing'] = {
  _date: '',
  _billings: [],
  _detail: null,

  async render() {
    this._date = UI.todayISO();
    const el = document.getElementById('page-billing');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">คิดเงินพนักงาน</h2>
          <p class="page-subtitle">คำนวณยอดขายรายวันจากสินค้าในคลังพนักงาน หักสินค้าฝาก</p>
        </div>
        <div class="page-actions">
          <div class="form-group" style="margin:0;flex-direction:row;align-items:center;gap:8px">
            <label style="white-space:nowrap;color:var(--text-secondary)">วันที่:</label>
            <input type="date" id="bill-date" value="${this._date}" style="min-width:150px" onchange="PAGES.billing.setDate(this.value)" />
          </div>
          <button class="btn btn-secondary btn-sm" onclick="PAGES.billing.load()"><span class="material-icons">refresh</span> รีเฟรช</button>
        </div>
      </div>
      <div id="billing-body">${UI.spinner()}</div>
    `;
    await this.load();
  },

  setDate(d) { this._date = d; this.load(); },

  async load() {
    try {
      const res = await API.getBillingList(this._date);
      this._billings = res.billings || [];
      this.renderList();
    } catch(e) {
      document.getElementById('billing-body').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  renderList() {
    if (!this._billings.length) {
      document.getElementById('billing-body').innerHTML = UI.emptyState('payments', 'ไม่พบข้อมูล', 'ยังไม่มีคลังพนักงานที่ต้องคิดเงินในวันนี้');
      return;
    }
    document.getElementById('billing-body').innerHTML = `
      <div class="grid-2">
        ${this._billings.map((b, i) => `
          <div class="card" style="border-left:3px solid ${b.billed ? 'var(--success)' : 'var(--primary)'}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;font-weight:700">
                  ${(b.employee?.displayName||'?').charAt(0)}
                </div>
                <div>
                  <div class="fw-bold">${b.employee?.displayName||'พนักงาน'}</div>
                  <div style="font-size:0.78rem;color:var(--text-muted)">${b.warehouseName}</div>
                </div>
              </div>
              ${b.billed
                ? '<span class="badge badge-green"><span class="material-icons" style="font-size:12px;vertical-align:middle">check_circle</span> คิดเงินแล้ว</span>'
                : '<span class="badge badge-yellow"><span class="material-icons" style="font-size:12px;vertical-align:middle">schedule</span> รอคิดเงิน</span>'
              }
            </div>
            <div id="bill-stock-${i}" style="margin-bottom:12px">${UI.spinner()}</div>
            ${!b.billed ? `
              <button class="btn btn-primary btn-full" onclick="PAGES.billing.openBilling(${i})">
                <span class="material-icons">payment</span> คิดเงินพนักงานคนนี้
              </button>
            ` : `
              <div style="text-align:center;color:var(--text-muted);font-size:0.82rem">
                คิดเงินเมื่อ ${b.billedAt ? UI.dateTimeStr(b.billedAt) : 'วันนี้'}<br>
                ยอดรวม: <strong class="text-success">฿${UI.currency(b.totalAmt)}</strong>
              </div>
            `}
          </div>
        `).join('')}
      </div>
    `;
    // Load each employee's stock
    this._billings.forEach((b, i) => this.loadBillingStock(b, i));
  },

  async loadBillingStock(billing, idx) {
    const container = document.getElementById(`bill-stock-${idx}`);
    if (!container) return;
    try {
      const wh = { id: billing.warehouseId };
      const res = await API.getEmployeeStock(billing.employee?.id);
      const stock = (res.stock || []).filter(s => s.warehouseId === billing.warehouseId);
      const totalSell = stock.reduce((a, s) => a + (s.qty - (s.consigned||0)) * (s.product?.empVat||0), 0);
      const totalQty = stock.reduce((a, s) => a + s.qty, 0);
      const totalConsigned = stock.reduce((a, s) => a + (s.consigned||0), 0);
      const netQty = totalQty - totalConsigned;

      billing._stock = stock;
      billing._totalAmt = totalSell;
      billing._netQty = netQty;

      container.innerHTML = `
        <div class="mini-cards" style="margin-bottom:8px">
          <div class="mini-card"><div class="mini-val">${UI.currency(totalQty,0)}</div><div class="mini-label">สินค้าทั้งหมด</div></div>
          <div class="mini-card"><div class="mini-val text-warning">${UI.currency(totalConsigned,0)}</div><div class="mini-label">ฝากคืน</div></div>
          <div class="mini-card"><div class="mini-val text-primary-color">${UI.currency(netQty,0)}</div><div class="mini-label">ยอดขาย (หน่วย)</div></div>
        </div>
        <div style="text-align:center">
          <div style="font-size:1.6rem;font-weight:700;color:var(--success)">฿${UI.currency(totalSell)}</div>
          <div style="font-size:0.78rem;color:var(--text-muted)">ยอดขายสุทธิ</div>
        </div>
      `;
    } catch(e) {
      if (container) container.innerHTML = `<div class="text-muted" style="font-size:0.82rem">โหลดสต็อกไม่สำเร็จ</div>`;
    }
  },

  openBilling(idx) {
    const b = this._billings[idx];
    const stock = b._stock || [];
    const totalAmt = b._totalAmt || 0;
    const netQty = b._netQty || 0;

    openModal(`คิดเงิน – ${b.employee?.displayName}`, `
      <div class="alert alert-info">
        <span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">today</span>วันที่: ${UI.dateStr(this._date)} &nbsp;|&nbsp; คลัง: ${b.warehouseName}
      </div>
      <div class="table-wrap" style="max-height:300px;overflow-y:auto">
        <table>
          <thead><tr>
            <th>สินค้า</th><th class="td-right">ตั้งต้น</th>
            <th class="td-right">ฝากคืน</th><th class="td-right">ขาย</th>
            <th class="td-right">ราคา</th><th class="td-right">รวม</th>
          </tr></thead>
          <tbody>
            ${stock.map(s => {
              const sold = s.qty - (s.consigned||0);
              return `<tr>
                <td class="td-bold">${s.product?.name||s.productId}</td>
                <td class="td-right">${s.qty}</td>
                <td class="td-right text-warning">${s.consigned||0}</td>
                <td class="td-right text-primary-color fw-bold">${sold}</td>
                <td class="td-right">฿${UI.currency(s.product?.empVat)}</td>
                <td class="td-right text-success fw-bold">฿${UI.currency(sold * (s.product?.empVat||0))}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="text-align:center;padding:16px;background:var(--bg-card2);border-radius:var(--radius-sm)">
        <div style="font-size:2rem;font-weight:800;color:var(--success)">฿${UI.currency(totalAmt)}</div>
        <div style="color:var(--text-secondary)">ยอดขายสุทธิ ${UI.currency(netQty,0)} หน่วย</div>
      </div>
      <div class="form-group"><label>หมายเหตุ</label>
        <input type="text" id="bill-note" placeholder="หมายเหตุ..."/>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-success" onclick="PAGES.billing.confirmBilling(${idx})"><span class="material-icons">check_circle</span> ยืนยันคิดเงิน ฿${UI.currency(totalAmt)}</button>
    `);
  },

  async confirmBilling(idx) {
    const b = this._billings[idx];
    try {
      UI.loading(true);
      closeModal();
      await API.doBilling({
        warehouseId: b.warehouseId,
        employeeId: b.employee?.id,
        date: this._date,
        totalAmt: b._totalAmt,
        totalUnits: b._netQty,
        note: document.getElementById('bill-note')?.value || '',
        items: (b._stock||[]).map(s => ({
          productId: s.productId, qty: s.qty,
          consigned: s.consigned||0,
          sold: s.qty - (s.consigned||0),
          pricePerUnit: s.product?.empVat||0,
        })),
      });
      UI.toast(`คิดเงินเรียบร้อย ฿${UI.currency(b._totalAmt)} ✅`, 'success');
      b.billed = true;
      b.totalAmt = b._totalAmt;
      this.renderList();
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
