// ============================================================
// pages/tax-invoice.js – Tax invoice generation (Cashier/Admin)
// ============================================================

PAGES['tax-invoice'] = {
  _billings: [],
  _date: '',

  async render() {
    this._date = UI.todayISO();
    const el = document.getElementById('page-tax-invoice');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">ใบภาษีซื้อ</h2>
          <p class="page-subtitle">สร้างและพิมพ์ใบภาษีซื้อจากการคิดเงิน</p>
        </div>
      </div>
      <div class="card mb-16">
        <div class="input-group" style="margin:0">
          <div class="form-group" style="margin:0">
            <label style="font-size:0.8rem;color:var(--text-muted)">วันที่</label>
            <input type="date" id="ti-date" value="${this._date}" style="min-width:150px" onchange="PAGES['tax-invoice'].setDate(this.value)" />
          </div>
          <button class="btn btn-primary" onclick="PAGES['tax-invoice'].load()"><span class="material-icons">search</span> โหลด</button>
        </div>
      </div>
      <div id="ti-body">${UI.spinner()}</div>
    `;
    await this.load();
  },

  setDate(d) { this._date = d; },

  async load() {
    try {
      const res = await API.getBillingList(this._date);
      this._billings = (res.billings || []).filter(b => b.billed);
      this.renderList();
    } catch(e) {
      document.getElementById('ti-body').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  renderList() {
    if (!this._billings.length) {
      document.getElementById('ti-body').innerHTML = UI.emptyState('receipt_long', 'ไม่พบข้อมูล', 'ยังไม่มีการคิดเงินในวันที่เลือก');
      return;
    }
    document.getElementById('ti-body').innerHTML = `
      <div class="grid-2">
        ${this._billings.map((b, i) => `
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div>
                <div class="fw-bold">${b.employee?.displayName || 'พนักงาน'}</div>
                <div style="font-size:0.78rem;color:var(--text-muted)">${b.warehouseName}</div>
              </div>
              <span class="badge badge-green"><span class="material-icons" style="font-size:14px">check_circle</span> คิดเงินแล้ว</span>
            </div>
            <div style="text-align:center;padding:12px;background:var(--bg-card2);border-radius:var(--radius-sm);margin-bottom:12px">
              <div style="font-size:1.5rem;font-weight:700;color:var(--success)">฿${UI.currency(b.totalAmt)}</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">${b.totalUnits || '-'} หน่วย</div>
            </div>
            <button class="btn btn-primary btn-full" onclick="PAGES['tax-invoice'].printInvoice(${i})">
              🖨️ พิมพ์ใบภาษี
            </button>
          </div>
        `).join('')}
      </div>
    `;
  },

  async printInvoice(idx) {
    const b = this._billings[idx];
    if (!b.billingId) {
      // Demo: generate invoice from billing data
      this.showPrintModal(b, null);
      return;
    }
    try {
      UI.loading(true);
      const res = await API.generateTaxInvoice(b.billingId);
      UI.loading(false);
      this.showPrintModal(b, res);
    } catch(e) {
      UI.loading(false);
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    }
  },

  showPrintModal(billing, invoiceData) {
    const invNo = invoiceData?.invoiceNumber || ('INV-' + this._date.replace(/-/g,'') + '-' + Math.floor(Math.random()*1000).toString().padStart(3,'0'));
    const totalAmt = billing.totalAmt || 0;
    const vatAmt = totalAmt * CONFIG.VAT_RATE / (1 + CONFIG.VAT_RATE);
    const amtNoVat = totalAmt - vatAmt;

    openModal('🧾 ใบกำกับภาษี', `
      <div id="invoice-print-area" style="font-family:var(--font);font-size:0.85rem">
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:1.2rem;font-weight:800">ใบกำกับภาษี</div>
          <div style="font-size:0.85rem;color:var(--text-secondary)">Tax Invoice</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <div><span class="text-muted">เลขที่:</span> <strong>${invNo}</strong></div>
          <div><span class="text-muted">วันที่:</span> <strong>${UI.dateStr(this._date)}</strong></div>
        </div>
        <hr class="section-divider" />
        <div style="margin-bottom:12px">
          <div><span class="text-muted">ชื่อ:</span> ${billing.employee?.displayName || '-'}</div>
          <div><span class="text-muted">คลัง:</span> ${billing.warehouseName || '-'}</div>
        </div>
        <hr class="section-divider" />
        <div style="display:flex;justify-content:space-between"><span>ยอดก่อน VAT:</span><strong>฿${UI.currency(amtNoVat)}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>VAT 7%:</span><strong>฿${UI.currency(vatAmt)}</strong></div>
        <hr class="section-divider" />
        <div style="display:flex;justify-content:space-between;font-size:1.1rem"><strong>รวมทั้งสิ้น:</strong><strong style="color:var(--success)">฿${UI.currency(totalAmt)}</strong></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ปิด</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ พิมพ์</button>
    `);
  }
};
