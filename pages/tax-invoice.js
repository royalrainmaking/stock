// ============================================================
// pages/tax-invoice.js – Professional Tax Invoice (Bulk Selection)
// ============================================================

PAGES['tax-invoice'] = {
  _billings: [],
  _selectedIds: new Set(),
  _date: '',

  async render() {
    this._date = UI.todayISO();
    const el = document.getElementById('page-tax-invoice');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">ออกใบกำกับภาษี (Tax Invoice)</h2>
          <p class="page-subtitle">เลือกรายการคิดเงินเพื่อสร้างใบกำกับภาษีชุดใหญ่</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary btn-lg" id="ti-btn-generate" disabled onclick="PAGES['tax-invoice'].openInvoiceForm()">
            <span class="material-icons">description</span> สร้างใบกำกับภาษี (<span id="ti-selected-count">0</span>)
          </button>
        </div>
      </div>

      <div class="card mb-20">
        <div style="display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap">
          <div class="form-group" style="margin:0; flex:1; min-width:150px">
            <label>วันที่สรุปยอด</label>
            <input type="date" id="ti-date" value="${this._date}" onchange="PAGES['tax-invoice'].setDate(this.value)" />
          </div>
          <button class="btn btn-secondary" style="height:45px" onclick="PAGES['tax-invoice'].load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
          <button class="btn btn-outline" style="height:45px" onclick="PAGES['tax-invoice'].toggleSelectAll()">
            <span class="material-icons">done_all</span> เลือกทั้งหมด
          </button>
        </div>
      </div>

      <div id="ti-body">${UI.spinner()}</div>
    `;
    this.injectPrintStyles();
    await this.load();
  },

  injectPrintStyles() {
    if (document.getElementById('tax-invoice-print-styles')) return;
    const style = document.createElement('style');
    style.id = 'tax-invoice-print-styles';
    style.innerHTML = `
      .ti-invoice-container { background: #fff; padding: 40px; color: #000; font-family: 'Sarabun', sans-serif; line-height: 1.4; border: 1px solid #eee; }
      .ti-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
      .ti-brand-section { flex: 1; }
      .ti-doc-title { text-align: right; }
      .ti-doc-title h1 { margin: 0; font-size: 1.8rem; font-weight: 900; color: #000; }
      .ti-doc-title p { margin: 0; font-size: 0.9rem; color: #666; }
      .ti-info-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px; margin-bottom: 30px; }
      .ti-info-box h3 { font-size: 0.85rem; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; color: #555; }
      .ti-info-content { font-size: 0.9rem; }
      .ti-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      .ti-table th { background: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; font-size: 0.85rem; text-align: center; }
      .ti-table td { border: 1px solid #dee2e6; padding: 10px; font-size: 0.9rem; vertical-align: top; }
      .ti-summary-section { display: flex; justify-content: flex-end; }
      .ti-summary-table { width: 300px; }
      .ti-summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
      .ti-summary-row.grand-total { border-bottom: 2px double #000; font-weight: 900; font-size: 1.1rem; color: #000; }
      .ti-footer { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
      .ti-signature { border-top: 1px solid #333; padding-top: 10px; text-align: center; margin-top: 60px; font-size: 0.85rem; }
      
      @media print {
        body * { visibility: hidden !important; }
        #ti-invoice-print, #ti-invoice-print * { visibility: visible !important; }
        #ti-invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  },

  setDate(d) { this._date = d; this.load(); },

  async load() {
    try {
      UI.loading(true);
      const res = await API.getBillingList(this._date);
      this._billings = (res.billings || []).filter(b => b.billed);
      this._selectedIds.clear();
      this.renderList();
      this.updateSelectionUI();
    } catch(e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  },

  renderList() {
    const container = document.getElementById('ti-body');
    if (!this._billings.length) {
      container.innerHTML = UI.emptyState('receipt_long', 'ไม่พบรายการคิดเงิน', 'โปรดเลือกวันที่อื่นๆ หรือตรวจสอบว่ามีการคิดเงินพนักงานหรือยัง');
      return;
    }
    container.innerHTML = `<div class="grid-2">${this._billings.map((b, i) => `
      <div class="card p-15 ti-selectable-card ${this._selectedIds.has(b.billingId) ? 'selected' : ''}" onclick="PAGES['tax-invoice'].toggleSelect('${b.billingId}')">
        <div style="display:flex; gap:12px; align-items:center">
          <input type="checkbox" id="chk-${b.billingId}" ${this._selectedIds.has(b.billingId) ? 'checked' : ''} onclick="event.stopPropagation(); PAGES['tax-invoice'].toggleSelect('${b.billingId}')"/>
          <div style="flex:1">
            <div class="fw-bold">${b.employee?.displayName}</div>
            <div class="text-muted" style="font-size:0.75rem">${b.warehouseName}</div>
          </div>
          <div class="text-end">
            <div class="fw-bold" style="color:var(--success)">฿${UI.currency(b.totalAmt)}</div>
            <div style="font-size:0.7rem; color:var(--text-muted)">ID: ${b.billingId}</div>
          </div>
        </div>
      </div>
    `).join('')}</div>`;
  },

  toggleSelect(id) {
    if (this._selectedIds.has(id)) this._selectedIds.delete(id);
    else this._selectedIds.add(id);
    this.renderList();
    this.updateSelectionUI();
  },

  toggleSelectAll() {
    if (this._selectedIds.size === this._billings.length) this._selectedIds.clear();
    else this._billings.forEach(b => this._selectedIds.add(b.billingId));
    this.renderList();
    this.updateSelectionUI();
  },

  updateSelectionUI() {
    const count = this._selectedIds.size;
    document.getElementById('ti-selected-count').innerText = count;
    document.getElementById('ti-btn-generate').disabled = count === 0;
  },

  async openInvoiceForm() {
    const selectedBillings = this._billings.filter(b => this._selectedIds.has(b.billingId));
    openModal('กรอกข้อมูลผู้ซื้อ / ข้อมูลใบกำกับภาษี', `
      <div class="form-group"><label>ชื่อลูกค้า / นิติบุคคล</label><input type="text" id="cust-name" placeholder="บจก. ก้าวหน้า (ประเทศไทย)" /></div>
      <div class="form-group"><label>เลขประจำตัวผู้เสียภาษี</label><input type="text" id="cust-tax-id" maxlength="13" placeholder="0123456789012" /></div>
      <div class="form-group"><label>ที่อยู่</label><textarea id="cust-address" rows="3" placeholder="123/45 ถนน... เขต... จังหวัด..."></textarea></div>
      <div class="form-group"><label>หมายเหตุ (ถ้ามี)</label><input type="text" id="cust-note" placeholder="สาขาที่..." /></div>
      <div class="alert alert-info" style="font-size:0.8rem">รวมรายการคิดเงินจำนวน ${selectedBillings.length} รายการ</div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES['tax-invoice'].generateInvoice()">สร้างและพิมพ์ใบกำกับภาษี</button>
    `);
  },

  async generateInvoice() {
    const cust = {
      name: document.getElementById('cust-name').value || 'ลูกค้าทั่วไป',
      taxId: document.getElementById('cust-tax-id').value || '-',
      address: document.getElementById('cust-address').value || '-',
      note: document.getElementById('cust-note').value || ''
    };
    
    try {
      UI.loading(true);
      const selectedIds = Array.from(this._selectedIds);
      
      // ดึงรายละเอียดของแต่ละบิลที่เลือก
      const allItems = [];
      for (const bid of selectedIds) {
        const detail = await API.getBillingDetail(bid);
        const billItems = JSON.parse(detail.billing.items || '[]');
        allItems.push(...billItems);
      }

      // รวมรายการสินค้าที่เหมือนกัน (Merge items)
      const merged = {};
      allItems.forEach(it => {
        const key = it.productId;
        if (!merged[key]) {
          merged[key] = { ...it, totalSold: 0, totalAmt: 0 };
        }
        merged[key].totalSold += (Number(it.sold) || 0);
        merged[key].totalAmt += (Number(it.sold) || 0) * (Number(it.pricePerUnit) || 0);
      });

      const finalItems = Object.values(merged);
      const grandTotal = finalItems.reduce((sum, it) => sum + it.totalAmt, 0);
      const vat = grandTotal * (CONFIG.VAT_RATE || 0.07);
      const subtotal = grandTotal - vat;

      this.showInvoiceModal(cust, finalItems, grandTotal, subtotal, vat);
    } catch(e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  },

  showInvoiceModal(cust, items, total, sub, vat) {
    const invNo = 'TAX-' + Date.now().toString().slice(-8);
    const content = `
      <div id="ti-invoice-print" class="ti-invoice-container">
        <div class="ti-header">
          <div class="ti-brand-section">
            <h2 style="margin:0; font-size:1.5rem; color:var(--primary)">${CONFIG.APP_NAME}</h2>
            <div style="font-size:0.8rem; margin-top:5px">
              เลขประจำตัวผู้เสียภาษี: 0-9999-99999-99-9 (ตัวอย่าง)<br>
              123 ถนนเพชรเกษม แขวงบางแค เขตบางแค กรุงเทพฯ 10160
            </div>
          </div>
          <div class="ti-doc-title">
            <h1>ใบกำกับภาษี</h1>
            <p>TAX INVOICE</p>
            <div style="margin-top:10px; font-weight:bold; font-size:0.85rem">ต้นฉบับ (Original)</div>
          </div>
        </div>

        <div class="ti-info-grid">
          <div class="ti-info-box">
            <h3>ข้อมูลลูกค้า (Customer Info)</h3>
            <div class="ti-info-content">
              <strong>${cust.name}</strong><br>
              ที่อยู่: ${cust.address}<br>
              เลขประจำตัวผู้เสียภาษี: ${cust.taxId}
            </div>
          </div>
          <div class="ti-info-box">
            <h3>ข้อมูลเอกสาร (Document Info)</h3>
            <div class="ti-info-content">
              เลขที่เอกสาร: <strong>${invNo}</strong><br>
              วันที่ออกบิล: <strong>${UI.dateStr(this._date)}</strong><br>
              วันเวลาที่พิมพ์: ${new Date().toLocaleString('th-TH')}
            </div>
          </div>
        </div>

        <table class="ti-table">
          <thead>
            <tr>
              <th style="width:40px">ลำดับ</th>
              <th>รายการสินค้า</th>
              <th style="width:80px">จำนวน</th>
              <th style="width:100px">ราคา/หน่วย</th>
              <th style="width:120px">ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td style="text-align:center">${idx + 1}</td>
                <td>${it.productName || it.productId}</td>
                <td style="text-align:center">${it.totalSold} ${it.unit || 'ขวด'}</td>
                <td style="text-align:right">฿${UI.currency(it.pricePerUnit)}</td>
                <td style="text-align:right">฿${UI.currency(it.totalAmt)}</td>
              </tr>
            `).join('')}
            ${Array.from({length: Math.max(0, 8 - items.length)}).map(() => `<tr><td style="height:30px"></td><td></td><td></td><td></td><td></td></tr>`).join('')}
          </tbody>
        </table>

        <div class="ti-summary-section">
          <div class="ti-summary-table">
            <div class="ti-summary-row"><span>รวมเป็นเงิน (Sub Total)</span><span>฿${UI.currency(sub)}</span></div>
            <div class="ti-summary-row"><span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span><span>฿${UI.currency(vat)}</span></div>
            <div class="ti-summary-row grand-total"><span>จำนวนเงินทั้งสิ้นสุทธิ</span><span>฿${UI.currency(total)}</span></div>
          </div>
        </div>

        <div style="margin-top:20px; font-size:0.85rem">
          <strong>( ${this.moneyToThaiText(total)} )</strong>
        </div>

        <div class="ti-footer">
          <div class="ti-signature">
            ผู้รับเงิน (Recipient)
          </div>
          <div class="ti-signature">
            ผู้ได้รับมอบอำนาจ (Authorized Signature)
          </div>
        </div>
      </div>

      <div class="no-print" style="margin-top:20px; display:flex; gap:12px; justify-content:center">
        <button class="btn btn-primary btn-lg" onclick="window.print()">
          <span class="material-icons">print</span> พิมพ์ใบกำกับภาษี (A4)
        </button>
        <button class="btn btn-secondary btn-lg" onclick="closeModal()">ปิด</button>
      </div>
    `;
    openModal('', content, '', 'max-width:900px; background:#f0f2f5; padding:0');
  },

  moneyToThaiText(amount) {
    // Simple mock for thai text money
    return "สิบเอ็ดพันห้าร้อยยี่สิบบาทถ้วน"; // In real app, use a lib or logic
  }
};
