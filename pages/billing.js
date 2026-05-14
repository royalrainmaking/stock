// ============================================================
// pages/billing.js – Daily billing with Premium Receipt & Images
// ============================================================

PAGES['billing'] = {
  _date: '',
  _billings: [],

  async render() {
    this._date = UI.todayISO();
    const el = document.getElementById('page-billing');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#E91E8C,#AD1457)">
            <span class="material-icons">payments</span>
          </div>
          <div>
            <h2 class="page-title">คิดเงินพนักงาน</h2>
            <p class="page-subtitle">หักยอดขายรายวันและออกใบเสร็จรับเงิน</p>
          </div>
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
    this.injectStyles();
    await this.load();
  },

  injectStyles() {
    if (document.getElementById('billing-premium-style')) return;
    const s = document.createElement('style');
    s.id = 'billing-premium-style';
    s.innerHTML = `
      .receipt-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid var(--border-light); }
      .receipt-header-new { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); padding: 25px; color: #fff; }
      .receipt-brand { font-size: 1.5rem; font-weight: 900; letter-spacing: 1px; }
      .receipt-doc-no { font-size: 0.7rem; opacity: 0.8; font-family: monospace; }
      .receipt-status-badge { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.7rem; border: 1px solid rgba(255,255,255,0.4); }
      .receipt-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 20px; font-size: 0.75rem; }
      .meta-item { display: flex; align-items: center; gap: 6px; opacity: 0.9; }
      .receipt-content { padding: 25px; }
      .receipt-table-new { width: 100%; border-collapse: collapse; }
      .receipt-table-new th { text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); padding-bottom: 10px; border-bottom: 1px solid var(--bg-base); }
      .receipt-table-new td { padding: 12px 0; border-bottom: 1px solid var(--bg-base); font-size: 0.85rem; }
      .receipt-summary { margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--bg-base); }
      .summary-line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem; color: var(--text-secondary); }
      .grand-total { font-size: 1.5rem; font-weight: 900; color: var(--primary); margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--bg-base); }
      .receipt-footer-new { padding: 0 25px 25px 25px; text-align: center; font-size: 0.75rem; }
      .receipt-note { background: var(--bg-base); padding: 10px; border-radius: 8px; font-size: 0.7rem; text-align: left; }
      @media print {
        body * { visibility: hidden !important; }
        #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
        #receipt-print-area { 
          position: absolute !important; 
          left: 0 !important; 
          top: 0 !important; 
          width: 80mm !important; 
          margin: 0 !important; 
          padding: 5mm !important; 
          border: none !important;
          box-shadow: none !important;
          font-size: 10pt !important;
        }
        .receipt-header-new { 
          background: #000 !important; 
          color: #fff !important; 
          padding: 10px !important;
          border-radius: 0 !important;
        }
        .receipt-card { border: none !important; border-radius: 0 !important; width: 80mm !important; }
        .receipt-table-new th, .receipt-table-new td { font-size: 9pt !important; padding: 4px 0 !important; border-bottom: 1px dashed #ccc !important; }
        .no-print, .modal-header, .modal-footer, .receipt-status-badge { display: none !important; }
        .receipt-summary { border-top: 2px dashed #000 !important; }
      }
      /* Screen style for thermal preview */
      .receipt-card { max-width: 350px; margin: 0 auto; border-radius: 8px; }
    `;
    document.head.appendChild(s);
  },

  setDate(d) { this._date = d; this.load(); },

  async load() {
    try {
      UI.loading(true);
      const res = await API.getBillingList(this._date);
      // กรองเฉพาะพนักงานที่ยังไม่ได้คิดเงิน และมีสต็อกที่ต้องจ่ายเงิน (totalUnits > 0)
      this._billings = (res.billings || []).filter(b => !b.billed && b.totalUnits > 0).map(b => {
        return {
          ...b,
          _stock: b._stockSummary || [],
          _totalAmt: b.totalAmt,
          _totalUnits: b.totalUnits
        };
      });
      this.renderList();
    } catch(e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  },

  renderList() {
    const container = document.getElementById('billing-body');
    if (!this._billings.length) {
      container.innerHTML = UI.emptyState('payments', 'ไม่มีรายการรอคิดเงิน', 'พนักงานทุกคนเคลียร์ยอดครบแล้ว หรือยังไม่มีพนักงานที่มีสินค้าในคลัง');
      return;
    }
    container.innerHTML = `<div class="grid-2">${this._billings.map((b, i) => `
      <div class="card p-20" style="border-top: 4px solid var(--primary)">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px">
          <div style="display:flex; gap:12px; align-items:center">
            ${UI.avatar(b.employee?.avatar, b.employee?.displayName, 48)}
            <div>
              <div class="fw-bold" style="font-size:1.1rem">${b.employee?.displayName}</div>
              <div class="text-muted" style="font-size:0.8rem">${b.warehouseName}</div>
            </div>
          </div>
          <div class="text-end">
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700">ยอดเงินคงค้าง</div>
            <div class="fw-bold" style="font-size:1.5rem; color:var(--success)">฿${UI.currency(b._totalAmt)}</div>
          </div>
        </div>
        <div style="background:var(--bg-base); border-radius:12px; padding:15px; margin-bottom:20px">
          <div style="font-size:0.75rem; font-weight:800; color:var(--text-secondary); margin-bottom:12px; display:flex; align-items:center; gap:5px">
            <span class="material-icons" style="font-size:14px">inventory</span> สรุปสินค้าคงเหลือ (หักฝากวาง)
          </div>
          ${b._stock.map(s => {
            const sold = s.qty - (s.consigned||0);
            if (sold <= 0) return '';
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; margin-bottom:6px; padding-bottom:4px; border-bottom:1px dashed rgba(0,0,0,0.05)">
                <div style="display:flex; align-items:center; gap:8px">
                  <img src="${s.product?.imageUrl || ''}" style="width:24px; height:24px; border-radius:4px; object-fit:cover; border:1px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.05)" onerror="this.src='https://via.placeholder.com/24'"/>
                  <span style="font-weight:600; color:var(--text-primary)">${s.product?.name}</span>
                </div>
                <span style="font-weight:800; color:var(--primary)">${sold} <small style="font-weight:400; color:var(--text-muted)">${s.product?.unit || 'ขวด'}</small></span>
              </div>
            `;
          }).join('')}
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:900; margin-top:12px; padding-top:8px; border-top:1px solid rgba(0,0,0,0.1); color:var(--primary)">
            <span>รวมขายสุทธิ</span>
            <span>${b._totalUnits} ชิ้น</span>
          </div>
        </div>

        <button class="btn btn-primary btn-block btn-lg" onclick="PAGES.billing.openBilling(${i})">
          <span class="material-icons">receipt</span> คิดเงินพนักงาน
        </button>
      </div>
    `).join('')}</div>`;
  },

  openBilling(idx) {
    const b = this._billings[idx];
    openModal(`คิดเงิน: ${b.employee?.displayName}`, `
      <div class="table-wrap" style="max-height:400px; overflow-y:auto; margin-bottom:20px">
        <table class="table" style="font-size:0.8rem">
          <thead>
            <tr><th style="width:50px">รูป</th><th>สินค้า</th><th class="td-right">ในคลัง</th><th class="td-right">ฝาก</th><th class="td-right">ขาย</th><th class="td-right">รวมเงิน</th></tr>
          </thead>
          <tbody>
            ${b._stock.map(s => {
              const sold = s.qty - (s.consigned||0);
              return `
                <tr>
                  <td><img src="${s.product?.imageUrl || ''}" style="width:36px; height:36px; border-radius:4px; object-fit:cover" onerror="this.src='https://via.placeholder.com/40'"/></td>
                  <td>
                    <div class="fw-bold">${s.product?.name}</div>
                    <div class="text-muted" style="font-size:0.6rem">@ ฿${UI.currency(s.product?.sellWholesale)}</div>
                  </td>
                  <td class="td-right">${s.qty}</td>
                  <td class="td-right text-warning">${s.consigned||0}</td>
                  <td class="td-right text-primary fw-bold">${sold}</td>
                  <td class="td-right fw-bold">฿${UI.currency(sold * (s.product?.sellWholesale||0))}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="form-group"><label>หมายเหตุ</label><input type="text" id="bill-note" placeholder="..." /></div>
      <div style="background:var(--bg-base); padding:15px; border-radius:12px; text-align:center">
        <div class="text-muted" style="font-size:0.8rem">ยอดเงินสุทธิที่ต้องส่ง</div>
        <div class="fw-bold" style="font-size:2rem; color:var(--success)">฿${UI.currency(b._totalAmt)}</div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-success" onclick="PAGES.billing.confirmBilling(${idx})">ยืนยันและออกใบเสร็จ</button>
    `, 'max-width:650px');
  },

  async confirmBilling(idx) {
    const b = this._billings[idx];
    const note = document.getElementById('bill-note')?.value || '';
    try {
      UI.loading(true);
      const items = b._stock.map(s => ({
        productId: s.productId, productName: s.product?.name, unit: s.product?.unit,
        qty: s.qty, consigned: s.consigned || 0, sold: s.qty - (s.consigned || 0),
        pricePerUnit: s.product?.sellWholesale || 0, imageUrl: s.product?.imageUrl,
        expiryDate: s.expiryDate
      }));
      const res = await API.doBilling({ warehouseId: b.warehouseId, employeeId: b.employee?.id, date: this._date, totalAmt: b._totalAmt, totalUnits: b._totalUnits, note, items });
      closeModal();
      this.showReceipt({ billId: res.billId || 'B-'+Date.now(), date: this._date, employeeName: b.employee?.displayName, whName: b.warehouseName, totalAmt: b._totalAmt, items: items.filter(it => it.sold > 0), note });
      await this.load();
    } catch(e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  },

  showReceipt(data) {
    const vat = data.totalAmt * (CONFIG.VAT_RATE || 0.07);
    const subtotal = data.totalAmt - vat;
    openModal(`ใบเสร็จรับเงินสำเร็จ`, `
      <div class="receipt-card" id="receipt-print-area">
        <div class="receipt-header-new">
          <div style="display:flex; justify-content:space-between; align-items:flex-start">
            <div><div class="receipt-brand">${CONFIG.APP_NAME}</div><div class="receipt-doc-no">REF: ${data.billId}</div></div>
            <div class="receipt-status-badge">PAID</div>
          </div>
          <div class="receipt-meta-grid">
            <div class="meta-item"><span class="material-icons">event</span> ${UI.dateStr(data.date)}</div>
            <div class="meta-item"><span class="material-icons">person</span> ${data.employeeName}</div>
            <div class="meta-item"><span class="material-icons">inventory_2</span> ${data.whName}</div>
          </div>
        </div>
        <div class="receipt-content">
          <table class="receipt-table-new">
            <thead><tr><th>รายการ</th><th style="text-align:right">จำนวน</th><th style="text-align:right">รวม</th></tr></thead>
            <tbody>
              ${data.items.map(it => `
                <tr>
                  <td>
                    <div class="fw-bold" style="font-size:0.85rem">${it.productName}</div>
                    <div class="text-muted" style="font-size:0.65rem">@ ฿${UI.currency(it.pricePerUnit)}</div>
                  </td>
                  <td style="text-align:right; white-space:nowrap">${it.sold} <small style="color:var(--text-muted)">${it.unit || 'ขวด'}</small></td>
                  <td style="text-align:right; font-weight:700">฿${UI.currency(it.sold * it.pricePerUnit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="receipt-summary">
            <div class="summary-line"><span>รวมเงิน</span><span>฿${UI.currency(subtotal)}</span></div>
            <div class="summary-line"><span>ภาษี (7%)</span><span>฿${UI.currency(vat)}</span></div>
            <div class="summary-line grand-total"><span>ยอดสุทธิ</span><span>฿${UI.currency(data.totalAmt)}</span></div>
          </div>
        </div>
        <div class="receipt-footer-new">${data.note ? `<div class="receipt-note"><strong>หมายเหตุ:</strong> ${data.note}</div>` : ''}<div style="margin-top:10px">ขอบคุณที่ใช้บริการ StockFanggie</div></div>
        <div class="no-print" style="padding:20px; display:flex; flex-wrap:wrap; gap:8px">
          <button class="btn btn-primary" style="flex:1; min-width:120px; font-size:0.8rem; padding:8px" onclick="window.print()">
            <span class="material-icons" style="font-size:16px">print</span> พิมพ์
          </button>
          <button class="btn btn-success" style="flex:1; min-width:120px; font-size:0.8rem; padding:8px" onclick="PAGES.billing.saveReceiptImage()">
            <span class="material-icons" style="font-size:16px">image</span> บันทึกรูป
          </button>
          <button class="btn btn-secondary" style="width:100%; font-size:0.8rem; padding:8px; margin-top:4px" onclick="closeModal()">ปิดหน้าต่าง</button>
        </div>
      </div>
    `, ``, 'max-width:550px');
  },

  async saveReceiptImage() {
    const el = document.getElementById('receipt-print-area');
    if (!el) return;
    
    try {
      UI.loading(true);
      // Hide buttons temporarily for clean image
      const noPrint = el.querySelector('.no-print');
      if (noPrint) noPrint.style.display = 'none';

      const canvas = await html2canvas(el, {
        scale: 2, // Higher quality
        useCORS: true,
        backgroundColor: '#f5f7fb'
      });

      if (noPrint) noPrint.style.display = 'flex';

      const link = document.createElement('a');
      link.download = `Receipt-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      UI.toast('บันทึกรูปภาพสำเร็จ', 'success');
    } catch (e) {
      UI.toast('บันทึกรูปภาพไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      UI.loading(false);
    }
  }
};
