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
          <div class="page-title-icon" style="background:#FCE4EC;color:var(--c-finance)">
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
            <input type="date" id="bill-date" value="${this._date}" style="min-width:150px" onchange="PAGES.billing.setDate(this.value)" ${!AUTH.isAdmin() ? 'disabled' : ''} />
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
      // แสดงพนักงานทุกคนให้สามารถเลือกได้ใน Dropdown
      this._billings = (res.billings || []).map(b => {
        return {
          ...b,
          _stock: b._stockSummary || [],
          _totalAmt: b.totalAmt,
          _totalUnits: b.totalUnits
        };
      });
      this.renderList();
    } catch (e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  },

  renderList() {
    const container = document.getElementById('billing-body');
    if (!this._billings.length) {
      container.innerHTML = UI.emptyState('payments', 'ไม่มีพนักงาน', 'ไม่พบพนักงานในระบบ หรือยังไม่มีคลังสินค้าพนักงาน');
      return;
    }

    let optionsHTML = '';
    this._billings.forEach((b, i) => {
       const statusIcon = b.billed ? '<span class="material-icons" style="color:var(--success); font-size:20px; position:absolute; bottom:-4px; right:-4px; background:#fff; border-radius:50%;">check_circle</span>' : '';
       const borderCol = b.billed ? 'var(--success)' : 'transparent';
       
       optionsHTML += `
         <div onclick="PAGES.billing.selectEmployee(${i})" 
              class="avatar-select-card"
              style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px; border:2px solid ${borderCol}; border-radius:12px; background:var(--bg-base); position:relative; transition:all 0.2s;">
           <div style="position:relative;">
             ${UI.avatar(b.employee?.avatar, b.employee?.displayName, 56)}
             ${statusIcon}
           </div>
           <div style="font-size:0.85rem; font-weight:600; text-align:center;">${b.employee?.displayName}</div>
         </div>
       `;
    });

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <label style="display:block; margin-bottom:12px; font-weight:600; color:var(--text-secondary);">เลือกพนักงานเพื่อคิดเงิน:</label>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap:16px;">
          ${optionsHTML}
        </div>
      </div>
      <div id="billing-employee-card"></div>
    `;
  },

  selectEmployee(idx) {
    const container = document.getElementById('billing-employee-card');
    if (!idx) {
      container.innerHTML = '';
      return;
    }
    const i = parseInt(idx);
    const b = this._billings[i];
    const totalComm = b._stock.reduce((sum, s) => {
      const sold = s.qty - (s.consigned || 0);
      return sum + (sold > 0 ? sold * (s.product?.sellCommission || 0) : 0);
    }, 0);
    
    container.innerHTML = `
      <div class="card p-20" style="border-top: 4px solid ${b.billed ? 'var(--success)' : 'var(--primary)'}; max-width: 600px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px">
          <div style="display:flex; gap:12px; align-items:center">
            ${UI.avatar(b.employee?.avatar, b.employee?.displayName, 48)}
            <div>
              <div class="fw-bold" style="font-size:1.1rem; display:flex; align-items:center; gap:4px">
                ${b.employee?.displayName}
                ${b.billed ? '<span class="material-icons" style="color:var(--success); font-size:1.2rem;">check_circle</span>' : ''}
              </div>
              <div class="text-muted" style="font-size:0.8rem">${b.warehouseName}</div>
            </div>
          </div>
        </div>
        <div style="background:var(--bg-base); border-radius:12px; padding:15px; margin-bottom:20px">
          <div style="font-size:0.75rem; font-weight:800; color:var(--text-secondary); margin-bottom:12px; display:flex; align-items:center; gap:5px">
            <span class="material-icons" style="font-size:14px">inventory</span> สรุปสินค้าคงเหลือ (หักฝากวาง)
          </div>
          ${(() => {
            const groupedItems = {};
            b._stock.forEach(s => {
              const sold = s.qty - (s.consigned || 0);
              if (!groupedItems[s.productId]) {
                groupedItems[s.productId] = { product: s.product, sold: 0 };
              }
              groupedItems[s.productId].sold += sold;
            });
            const itemsToBill = Object.values(groupedItems).filter(it => it.sold > 0);
            if (!itemsToBill.length) return '<div class="text-center text-muted" style="padding:10px; font-size:0.8rem">ไม่มีรายการที่ต้องคิดเงิน</div>';
            return itemsToBill.map(it => `
              <div style="display:flex; justify-content:space-between; align-items:flex-start; font-size:0.75rem; margin-bottom:6px; padding-bottom:6px; border-bottom:1px dashed rgba(0,0,0,0.05)">
                <div style="display:flex; align-items:flex-start; gap:8px; flex:1;">
                  ${UI.image(it.product?.imageUrl, '', 'width:32px; height:32px; border-radius:4px; object-fit:cover; border:1px solid var(--border-light); box-shadow:0 2px 4px rgba(0,0,0,0.05); margin-top:2px;')}
                  <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600; color:var(--text-primary); font-size:0.85rem">${it.product?.name}</span>
                    <span style="font-size:0.65rem; color:var(--text-muted)"><span style="font-family:monospace">[${it.product?.code || '-'}]</span> ${it.product?.category || ''}</span>
                    <span style="font-size:0.65rem; color:var(--text-secondary); margin-top:2px;">ราคา: ฿${UI.currency(it.product?.sellWholesale || 0)} | <span style="color:#BE185D;">คอม: ฿${UI.currency(it.product?.sellCommission || 0)}</span></span>
                  </div>
                </div>
                <div style="text-align:right;">
                  <span style="font-weight:800; color:var(--primary); font-size:0.95rem;">${it.sold} <small style="font-weight:400; color:var(--text-muted)">${it.product?.unit || 'หน่วย'}</small></span>
                  <div style="font-size:0.75rem; font-weight:700; color:var(--text-primary); margin-top:2px;">฿${UI.currency((it.product?.sellWholesale || 0) * it.sold)}</div>
                </div>
              </div>
            `).join('');
          })()}
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:900; margin-top:12px; padding-top:8px; border-top:1px solid rgba(0,0,0,0.1); color:var(--primary)">
            <span>รวมขายสุทธิ</span>
            <span>${b._totalUnits} ชิ้น</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:900; margin-top:8px; color:#BE185D">
            <span>รวมค่าคอมมิชชั่น</span>
            <span>฿${UI.currency(totalComm)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:1.1rem; font-weight:900; margin-top:12px; padding-top:12px; border-top:2px solid rgba(0,0,0,0.05); color:var(--success)">
            <span>ยอดเงินคงค้าง</span>
            <span>฿${UI.currency(b._totalAmt)}</span>
          </div>
        </div>

        ${b.billed ? `
          <button class="btn btn-success btn-block btn-lg" disabled style="opacity:0.8">
            <span class="material-icons">check_circle</span> คิดเงินเรียบร้อยแล้ว
          </button>
        ` : `
          <button class="btn btn-primary btn-block btn-lg" onclick="PAGES.billing.openBilling(${i})">
            <span class="material-icons">receipt</span> คิดเงินพนักงาน
          </button>
        `}
      </div>
    `;
  },

  openBilling(idx) {
    const b = this._billings[idx];
    const totalComm = b._stock.reduce((sum, s) => {
      const sold = s.qty - (s.consigned || 0);
      return sum + (sold > 0 ? sold * (s.product?.sellCommission || 0) : 0);
    }, 0);
    openModal(`คิดเงิน: ${b.employee?.displayName}`, `
      <div class="receipt-card" style="margin-bottom:16px; border:none; box-shadow:none; padding:12px">
        <div style="font-size:0.75rem; font-weight:800; color:var(--text-secondary); margin-bottom:12px; display:flex; align-items:center; gap:5px">
          <span class="material-icons" style="font-size:14px">receipt_long</span> สรุปรายการขาย (ไม่รวมสินค้าฝากคืน)
        </div>
        <div style="max-height:350px; overflow-y:auto; padding-right:8px">
          ${(() => {
            const groupedItems = {};
            b._stock.forEach(s => {
              const sold = s.qty - (s.consigned || 0);
              if (!groupedItems[s.productId]) {
                groupedItems[s.productId] = { product: s.product, sold: 0 };
              }
              groupedItems[s.productId].sold += sold;
            });
            const itemsToBill = Object.values(groupedItems).filter(it => it.sold > 0);
            if (!itemsToBill.length) return '<div class="text-center text-muted" style="padding:20px">ไม่มีรายการที่ต้องคิดเงิน</div>';
            return itemsToBill.map(it => {
              let setDetails = '';
              if (it.product?.isSet && it.product.setItems && it.product.setItems.length > 0) {
                setDetails = `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px; padding:4px 8px; background:var(--bg-base); border-radius:4px; border-left:2px solid var(--primary)">
                  <div style="font-weight:700; margin-bottom:2px">ประกอบด้วย:</div>
                  ${it.product.setItems.map(setIt => `• ${setIt.name} (${setIt.qty} ${setIt.unit})`).join('<br>')}
                </div>`;
              }
              return `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:8px 0; border-bottom:1px dashed var(--border-light)">
                  <div style="flex:1">
                    <div style="font-weight:700; font-size:0.85rem">${it.product?.name}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted)">[${it.product?.code || '-'}] ราคา: ฿${UI.currency(it.product?.sellWholesale || 0)} | <span style="color:#BE185D;">คอม: ฿${UI.currency(it.product?.sellCommission || 0)}</span></div>
                    ${setDetails}
                  </div>
                  <div style="text-align:right; margin-left:12px">
                    <div style="font-weight:800; color:var(--primary)">${it.sold} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:400">${it.product?.unit || 'หน่วย'}</span></div>
                    <div style="font-weight:700; font-size:0.9rem">฿${UI.currency(it.sold * (it.product?.sellWholesale || 0))}</div>
                  </div>
                </div>
              `;
            }).join('');
          })()}
        </div>
      </div>
      <div class="form-group"><label>หมายเหตุ</label><input type="text" id="bill-note" placeholder="..." /></div>
      <div style="background:var(--bg-base); padding:15px; border-radius:12px; text-align:center">
        <div class="text-muted" style="font-size:0.8rem">ยอดเงินสุทธิที่ต้องส่ง</div>
        <div class="fw-bold" style="font-size:2rem; color:var(--success)">฿${UI.currency(b._totalAmt)}</div>
        <div style="font-size:0.9rem; font-weight:700; color:#BE185D; margin-top:8px; padding-top:8px; border-top:1px dashed rgba(0,0,0,0.1);">
          รวมค่าคอมมิชชั่น: ฿${UI.currency(totalComm)}
        </div>
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
        productId: s.productId, productName: s.product?.name, productCode: s.product?.code, productCategory: s.product?.category, unit: s.product?.unit,
        qty: s.qty, consigned: s.consigned || 0, sold: s.qty - (s.consigned || 0),
        pricePerUnit: s.product?.sellWholesale || 0, imageUrl: s.product?.imageUrl,
        expiryDate: s.expiryDate, isSet: s.product?.isSet, setItems: s.product?.setItems
      }));
      const res = await API.doBilling({ warehouseId: b.warehouseId, employeeId: b.employee?.id, date: this._date, totalAmt: b._totalAmt, totalUnits: b._totalUnits, note, items });
      closeModal();
      
      const groupedReceipt = {};
      items.filter(it => it.sold > 0).forEach(it => {
         if (!groupedReceipt[it.productId]) groupedReceipt[it.productId] = { ...it, sold: 0 };
         groupedReceipt[it.productId].sold += it.sold;
      });
      
      this.showReceipt({ billId: res.billId || 'B-' + Date.now(), date: this._date, employeeName: b.employee?.displayName, whName: b.warehouseName, totalAmt: b._totalAmt, items: Object.values(groupedReceipt), note });
      await this.load();
    } catch (e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
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
              ${data.items.map(it => {
                let setDetails = '';
                if (it.isSet && it.setItems && it.setItems.length > 0) {
                  setDetails = `<div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">
                    [ชุดประกอบด้วย: ${it.setItems.map(setIt => `${setIt.name} x${setIt.qty}`).join(', ')}]
                  </div>`;
                }
                return `
                <tr>
                  <td>
                    <div class="fw-bold" style="font-size:0.85rem">${it.productName}</div>
                    <div class="text-muted" style="font-size:0.65rem">[${it.productCode || '-'}] ${it.productCategory || ''} | @ ฿${UI.currency(it.pricePerUnit)}</div>
                    ${setDetails}
                  </td>
                  <td style="text-align:right; white-space:nowrap; vertical-align:top">${it.sold} <small style="color:var(--text-muted)">${it.unit || 'หน่วย'}</small></td>
                  <td style="text-align:right; font-weight:700; vertical-align:top">฿${UI.currency(it.sold * it.pricePerUnit)}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="receipt-summary">
            <div class="summary-line"><span>รวมเงิน</span><span>฿${UI.currency(subtotal)}</span></div>
            <div class="summary-line"><span>ภาษี (7%)</span><span>฿${UI.currency(vat)}</span></div>
            <div class="summary-line grand-total"><span>ยอดสุทธิ</span><span>฿${UI.currency(data.totalAmt)}</span></div>
          </div>
        </div>
        <div class="receipt-footer-new">${data.note ? `<div class="receipt-note"><strong>หมายเหตุ:</strong> ${data.note}</div>` : ''}<div style="margin-top:10px">ขอบคุณที่ใช้บริการ ห้างหุ้นส่วนจำกัด เจริญรุ่งเรือง รับทรัพย์ (สำนักงานใหญ่)</div></div>
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
