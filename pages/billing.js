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
    const container = document.getElementById('billing-body');
    if (container) container.innerHTML = UI.emptyState('hourglass_empty', 'กำลังโหลดข้อมูล...');
    
    try {
      const res = await API.getBillingList(this._date);
      // แสดงพนักงานทุกคนให้สามารถเลือกได้ใน Dropdown
      this._billings = (res.billings || []).map(b => {
        const stock = b._stockSummary || [];
        let calcTotalUnits = 0;
        stock.forEach(s => {
          const sold = s.qty - (s.consigned || 0);
          if (sold > 0) {
            let multiplier = 1;
            if (s.product?.isSet && s.product?.setItems) {
               multiplier = s.product.setItems.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
               // Fallback if multiplier is 0 for some reason
               if (multiplier === 0) multiplier = 1;
            }
            calcTotalUnits += sold * multiplier;
          }
        });

        return {
          ...b,
          _stock: stock,
          _totalAmt: b.totalAmt,
          _totalUnits: b.billed ? b.totalUnits : calcTotalUnits,
          _calcTotalUnits: calcTotalUnits // Always keep the accurate calculation
        };
      });
      this.renderList();
    } catch (e) { 
      if (container) container.innerHTML = UI.emptyState('error', 'เกิดข้อผิดพลาด', e.message);
      UI.toast(e.message, 'error'); 
    }
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
    if (idx === undefined || idx === null || idx === '') {
      container.innerHTML = '';
      return;
    }
    const i = parseInt(idx);
    const b = this._billings[i];
    
    const groupedItems = {};
    b._stock.forEach(s => {
      const sold = s.qty - (s.consigned || 0);
      if (!groupedItems[s.productId]) {
        groupedItems[s.productId] = { product: s.product, sold: 0, setSource: 0 };
      }
      groupedItems[s.productId].sold += sold;
    });
    const itemsToBill = Object.values(groupedItems).filter(it => it.sold > 0);

    itemsToBill.sort((a, b) => {
      const idxA = MASTER_DATA.products ? MASTER_DATA.products.findIndex(p => p.id === a.product?.id) : -1;
      const idxB = MASTER_DATA.products ? MASTER_DATA.products.findIndex(p => p.id === b.product?.id) : -1;
      return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
    });
    const totalComm = itemsToBill.reduce((sum, it) => sum + (it.product?.sellCommission || 0) * it.sold, 0);
    
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
            <span class="material-icons" style="font-size:14px">inventory</span>
            สรุปสินค้าคงเหลือ (หักฝากวาง)
          </div>
          ${(() => {
            if (!itemsToBill.length) return '<div class="text-center text-muted" style="padding:10px; font-size:0.8rem">ไม่มีรายการที่ต้องคิดเงิน</div>';
            
            const zoneItems = itemsToBill.filter(it => !it.product?.isSet);
            const setItems = itemsToBill.filter(it => it.product?.isSet);
            let html = '';

            const renderItem = (it) => {
              let displayStr = `${it.sold} <span style="font-size:0.65rem; font-weight:400;">${it.product?.unit || 'หน่วย'}</span>`;
              return `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; margin-bottom:6px; padding-bottom:6px; border-bottom:1px dashed rgba(0,0,0,0.05)">
                <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                  ${UI.image(it.product?.imageUrl, '', 'width:32px; height:32px; border-radius:4px; object-fit:cover; border:1px solid var(--border-light); box-shadow:0 2px 4px rgba(0,0,0,0.05); flex-shrink:0;')}
                  <div style="display:flex; flex-direction:column; overflow:hidden;">
                    <span style="font-weight:600; color:var(--text-primary); font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${it.product?.name}</span>
                    <span style="font-size:0.65rem; color:var(--text-muted);"><span style="font-family:monospace">[${it.product?.code || '-'}]</span></span>
                  </div>
                </div>
                <div style="display:flex; gap:12px; align-items:center; text-align:right; font-weight:600; margin-left:8px; flex-shrink:0;">
                  <div style="width:65px; color:var(--primary);">${displayStr}</div>
                  <div style="width:65px; color:#BE185D;"><span style="font-size:0.6rem; font-weight:400; color:var(--text-muted);">คอม</span><br/>฿${UI.currency((it.product?.sellCommission || 0) * it.sold)}</div>
                  <div style="width:65px; color:var(--success);"><span style="font-size:0.6rem; font-weight:400; color:var(--text-muted);">ราคา</span><br/>฿${UI.currency((it.product?.sellWholesale || 0) * it.sold)}</div>
                </div>
              </div>
              `;
            };

            if (zoneItems.length > 0) {
              const zoneTotal = zoneItems.reduce((sum, it) => sum + (it.product?.sellWholesale || 0) * it.sold, 0);
              const zoneComm = zoneItems.reduce((sum, it) => sum + (it.product?.sellCommission || 0) * it.sold, 0);
              html += `<div style="font-size:0.75rem; font-weight:800; color:var(--primary); margin:10px 0 6px 0; padding-bottom:4px; border-bottom:2px solid var(--primary);">สินค้าเขต</div>`;
              html += zoneItems.map(renderItem).join('');
              html += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; font-weight:800; background:rgba(0,0,0,0.02); padding:6px 8px; border-radius:4px; margin-top:4px; margin-bottom:8px; color:var(--text-secondary);">
                         <span>รวมสินค้าเขต</span>
                         <span><span style="color:#BE185D;">คอม: ฿${UI.currency(zoneComm)}</span> | <span style="color:var(--success);">ราคา: ฿${UI.currency(zoneTotal)}</span></span>
                       </div>`;
            }
            if (setItems.length > 0) {
              const setTotal = setItems.reduce((sum, it) => sum + (it.product?.sellWholesale || 0) * it.sold, 0);
              const setComm = setItems.reduce((sum, it) => sum + (it.product?.sellCommission || 0) * it.sold, 0);
              html += `<div style="font-size:0.75rem; font-weight:800; color:var(--primary); margin:10px 0 6px 0; padding-bottom:4px; border-bottom:2px solid var(--primary);">สินค้าเซ็ท</div>`;
              html += setItems.map(renderItem).join('');
              html += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; font-weight:800; background:rgba(0,0,0,0.02); padding:6px 8px; border-radius:4px; margin-top:4px; margin-bottom:8px; color:var(--text-secondary);">
                         <span>รวมสินค้าเซ็ท</span>
                         <span><span style="color:#BE185D;">คอม: ฿${UI.currency(setComm)}</span> | <span style="color:var(--success);">ราคา: ฿${UI.currency(setTotal)}</span></span>
                       </div>`;
            }
            return html;
          })()}
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:900; margin-top:12px; padding-top:8px; border-top:1px solid rgba(0,0,0,0.1); color:var(--primary)">
            <span>รวมขายสุทธิ</span>
            <span>${b._totalUnits} ชิ้น</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:900; margin-top:8px; color:#BE185D">
            <span>คอมมิชชั่นเซลล์ (หักออกไปแล้ว)</span>
            <span>฿${UI.currency(itemsToBill.reduce((sum, it) => sum + (it.product?.sellCommission || 0) * it.sold, 0))}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:1.1rem; font-weight:900; margin-top:12px; padding-top:12px; border-top:2px solid rgba(0,0,0,0.05); color:var(--success)">
            <span>ยอดเงินคงค้าง</span>
            <span>฿${UI.currency(b._totalAmt)}</span>
          </div>
        </div>

        ${b.billed ? `
          <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="btn btn-success btn-lg" disabled style="opacity:0.8; flex:1;">
              <span class="material-icons">check_circle</span> คิดเงินเรียบร้อยแล้ว
            </button>
            <button class="btn btn-primary btn-lg" style="flex:1;" onclick="PAGES.billing.openFinanceSettlement(${i})">
              <span class="material-icons">add_circle</span> คิดเงินเพิ่ม
            </button>
          </div>
        ` : `
          <button class="btn btn-primary btn-block btn-lg" onclick="PAGES.billing.openFinanceSettlement(${i})">
            <span class="material-icons">receipt</span> คิดเงินพนักงาน
          </button>
        `}
      </div>
    `;
  },
  openFinanceSettlement(idx) {
    const b = this._billings[idx];
    const note = document.getElementById('bill-note')?.value || '';
    
    const html = `
      <div style="background:var(--bg-base); padding:15px; border-radius:12px; margin-bottom:15px">
         <div class="text-muted" style="font-size:0.8rem">ยอดค่าสินค้าที่ต้องส่ง</div>
         <div class="fw-bold" style="font-size:1.5rem; color:var(--success)">฿${UI.currency(b._totalAmt)}</div>
         <input type="hidden" id="fin-goods-amt" value="${b._totalAmt}" />
      </div>
      
      <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div class="form-group"><label>เงินประกัน</label><input type="number" class="fin-input" id="fin-deposit" value="0" onfocus="this.select()" oninput="PAGES.billing.calcFinance()" /></div>
        <div class="form-group"><label>ชำระหนี้</label><input type="number" class="fin-input" id="fin-debt" value="0" onfocus="this.select()" oninput="PAGES.billing.calcFinance()" /></div>
        <div class="form-group"><label>ฝากเงิน</label><input type="number" class="fin-input" id="fin-save" value="0" onfocus="this.select()" oninput="PAGES.billing.calcFinance()" /></div>
        <div class="form-group"><label>ค่าเช่าซื้อรถ/พ่วง</label><input type="number" class="fin-input" id="fin-hire" value="0" onfocus="this.select()" oninput="PAGES.billing.calcFinance()" /></div>
        <div class="form-group"><label>ค่าเช่ารถ</label><input type="number" class="fin-input" id="fin-rent" value="0" onfocus="this.select()" oninput="PAGES.billing.calcFinance()" /></div>
        <div class="form-group"><label>ค่าหลอด</label><input type="number" class="fin-input" id="fin-straw" value="0" onfocus="this.select()" oninput="PAGES.billing.calcFinance()" /></div>
        <div class="form-group"><label>ค่าถุง</label><input type="number" class="fin-input" id="fin-bag" value="0" onfocus="this.select()" oninput="PAGES.billing.calcFinance()" /></div>
        <div class="form-group">
           <label>อื่นๆ</label>
           <div style="display:flex; gap:5px">
             <input type="text" id="fin-other-note" placeholder="ระบุชื่อค่าใช้จ่าย..." style="flex:2" />
             <input type="number" class="fin-input" id="fin-other" value="0" style="flex:1" onfocus="this.select()" oninput="PAGES.billing.calcFinance()" />
           </div>
        </div>
      </div>
      
      <div style="background:var(--bg-card2); padding:15px; border-radius:12px; margin-top:15px; border:2px solid var(--primary); text-align:center;">
         <div class="text-muted" style="font-size:0.9rem; font-weight:bold;">ยอดรวมที่ต้องชำระทั้งสิ้น</div>
         <div class="fw-bold" style="font-size:2.5rem; color:var(--primary)" id="fin-grand-total">฿${UI.currency(b._totalAmt)}</div>
         <input type="hidden" id="fin-grand-val" value="${b._totalAmt}" />
      </div>
      
      <h4 style="margin-top:20px; color:var(--text-secondary)">ช่องทางการชำระเงิน</h4>
      <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div class="form-group">
          <label>จ่ายเงินสด (บาท)</label>
          <input type="text" id="fin-cash" value="0" onfocus="this.select()" oninput="PAGES.billing.calcFinanceTransfer('cash')" onblur="this.value = (parseFloat(this.value.replace(/,/g, '')) || 0).toLocaleString('en-US')" style="font-size:1.5rem; height:50px; font-weight:bold; color:var(--success); text-align:center; border:2px solid var(--success)"/>
        </div>
        <div class="form-group">
          <label>เงินโอน (บาท)</label>
          <input type="text" id="fin-transfer" value="${Math.ceil(b._totalAmt).toLocaleString('en-US')}" onfocus="this.select()" oninput="PAGES.billing.calcFinanceTransfer('transfer')" onblur="this.value = (parseFloat(this.value.replace(/,/g, '')) || 0).toLocaleString('en-US')" style="font-size:1.5rem; height:50px; font-weight:bold; color:var(--primary); text-align:center; border:2px solid var(--primary)"/>
        </div>
      </div>
      <div class="form-group" style="margin-top:15px;"><label>หมายเหตุ</label><input type="text" id="bill-note" placeholder="..." /></div>
    `;

    openModal('ชำระเงินและปิดบิล', html, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES.billing.confirmBilling(${idx})"><span class="material-icons">payments</span> ยืนยันชำระเงินและออกใบเสร็จ</button>
    `, 'max-width:600px');
  },
  
  calcFinance() {
    const goods = parseFloat(document.getElementById('fin-goods-amt').value) || 0;
    const inputs = document.querySelectorAll('.fin-input');
    let totalFee = 0;
    inputs.forEach(el => totalFee += (parseFloat(el.value) || 0));
    
    const grand = goods + totalFee;
    document.getElementById('fin-grand-val').value = grand;
    document.getElementById('fin-grand-total').textContent = '฿' + UI.currency(grand);
    this.calcFinanceTransfer('cash');
  },
  
  calcFinanceTransfer(source) {
    const grand = parseFloat(document.getElementById('fin-grand-val').value) || 0;
    const cashEl = document.getElementById('fin-cash');
    const transferEl = document.getElementById('fin-transfer');
    
    let cash = parseFloat(cashEl.value.replace(/,/g, '')) || 0;
    let transfer = parseFloat(transferEl.value.replace(/,/g, '')) || 0;
    
    if (source === 'cash') {
       transfer = grand - cash;
       if (transfer < 0) transfer = 0;
       transfer = Math.ceil(transfer);
       transferEl.value = transfer.toLocaleString('en-US');
    } else if (source === 'transfer') {
       cash = grand - transfer;
       if (cash < 0) cash = 0;
       cash = Math.ceil(cash);
       cashEl.value = cash.toLocaleString('en-US');
    }
  },

  async confirmBilling(idx) {
    const isConfirmed = await new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);opacity:0;transition:opacity 0.2s;';
      overlay.innerHTML = `
        <div style="background:var(--bg-card, #fff);border-radius:20px;padding:32px 24px;max-width:400px;width:90%;text-align:center;box-shadow:0 15px 40px rgba(0,0,0,0.2);transform:translateY(20px) scale(0.95);transition:all 0.3s cubic-bezier(0.175,0.885,0.32,1.275);">
          <div style="width:72px;height:72px;border-radius:50%;background:#e3f2fd;color:#1a73e8;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
            <span class="material-icons" style="font-size:36px;">payments</span>
          </div>
          <h3 style="font-size:1.35rem;font-weight:700;margin-bottom:12px;color:var(--text-main, #202124);">ยืนยันการคิดเงิน</h3>
          <p style="color:var(--text-secondary, #5f6368);font-size:1rem;margin-bottom:24px;line-height:1.6;">
            คุณต้องการยืนยันการบันทึกการคิดเงินใช่หรือไม่?<br>
            <span style="color:#d93025;font-size:0.85rem;background:#fce8e6;padding:6px 10px;border-radius:6px;display:inline-block;margin-top:12px;font-weight:600;">
              * ระบบจะดำเนินการตัดสต็อกและบันทึกประวัติทันที
            </span>
          </p>
          <div style="display:flex;gap:12px;">
            <button class="btn btn-secondary" style="flex:1;padding:12px;border-radius:10px;font-size:1rem;font-weight:600;" id="custom-confirm-cancel">ยกเลิก</button>
            <button class="btn btn-primary" style="flex:1;padding:12px;border-radius:10px;font-size:1rem;font-weight:600;" id="custom-confirm-ok">ยืนยันบันทึก</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.children[0].style.transform = 'translateY(0) scale(1)';
      });

      const close = (result) => {
        overlay.style.opacity = '0';
        overlay.children[0].style.transform = 'translateY(20px) scale(0.95)';
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 200);
      };

      document.getElementById('custom-confirm-cancel').onclick = () => close(false);
      document.getElementById('custom-confirm-ok').onclick = () => close(true);
    });

    if (!isConfirmed) return;
    
    const b = this._billings[idx];
    const note = document.getElementById('bill-note')?.value || '';
    
    const cashPaid = parseFloat(document.getElementById('fin-cash')?.value.replace(/,/g, '')) || 0;
    const transferPaid = parseFloat(document.getElementById('fin-transfer')?.value.replace(/,/g, '')) || 0;
    
    const financeItems = [];
    financeItems.push({ category: 'ค่าสินค้า', amount: b._totalAmt });
    
    const addFee = (id, cat) => {
      const v = parseFloat(document.getElementById(id)?.value) || 0;
      if (v > 0) financeItems.push({ category: cat, amount: v });
    };
    addFee('fin-deposit', 'เงินประกัน');
    addFee('fin-debt', 'ชำระหนี้');
    addFee('fin-save', 'ฝากเงิน');
    addFee('fin-hire', 'ค่าเช่าซื้อรถ/พ่วง');
    addFee('fin-rent', 'ค่าเช่ารถ');
    addFee('fin-straw', 'ค่าหลอด');
    addFee('fin-bag', 'ค่าถุง');
    
    const otherVal = parseFloat(document.getElementById('fin-other')?.value) || 0;
    if (otherVal > 0) {
       financeItems.push({ category: 'อื่นๆ', amount: otherVal, note: document.getElementById('fin-other-note')?.value || '' });
    }

    try {
      UI.loading(true);
      const items = b._stock.map(s => {
        let enhancedSetItems = s.product?.setItems;
        if (s.product?.isSet && enhancedSetItems) {
          enhancedSetItems = enhancedSetItems.map(si => {
             const bp = MASTER_DATA.products ? MASTER_DATA.products.find(p => p.name === si.name) : null;
             return {
               ...si,
               productId: bp ? bp.id : si.name,
               productCode: bp ? bp.code : '-',
               productCategory: bp ? bp.category : '',
               unit: bp ? bp.unit : si.unit,
               pricePerUnit: bp ? bp.sellWholesale : 0
             };
          });
        }
        return {
          productId: s.productId, productName: s.product?.name, productCode: s.product?.code, productCategory: s.product?.category, unit: s.product?.unit,
          qty: s.qty, consigned: s.consigned || 0, sold: s.qty - (s.consigned || 0),
          pricePerUnit: s.product?.sellWholesale || 0, imageUrl: s.product?.imageUrl,
          expiryDate: s.expiryDate, isSet: s.product?.isSet, setItems: enhancedSetItems
        };
      });
      const res = await API.doBilling({ 
        warehouseId: b.warehouseId, employeeId: b.employee?.id, date: this._date, 
        totalAmt: b._totalAmt, totalUnits: b._calcTotalUnits, note, items,
        cashPaid, transferPaid, financeItems
      });
      closeModal();
      
      const groupedReceipt = {};
      items.forEach(it => {
         if (!groupedReceipt[it.productId]) groupedReceipt[it.productId] = { ...it, sold: 0 };
         groupedReceipt[it.productId].sold += it.sold;
      });
      const finalReceiptItems = Object.values(groupedReceipt).filter(it => it.sold > 0);
      
      await this.showReceipt({ billId: res.billId || 'B-' + Date.now(), date: this._date, employeeName: b.employee?.displayName, whName: b.warehouseName, totalAmt: b._totalAmt, items: finalReceiptItems, note });
      await this.load();
    } catch (e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  },







  async showReceipt(data) {
    let comp = { name: 'ห้างหุ้นส่วนจำกัด เจริญรุ่งเรือง รับทรัพย์ (สำนักงานใหญ่)', address: '', phone: '' };
    
    let financeHtml = '';
    let financeTotal = 0;
    
    // items with sold > 0 only!
    const activeItems = (data.items || []).filter(it => it.sold > 0);
    
    if (data.financeItems && data.financeItems.length > 0) {
      const extraItems = data.financeItems.filter(f => f.category !== 'ค่าสินค้า');
      if (extraItems.length > 0) {
        financeTotal = extraItems.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
        financeHtml = `
          <div style="margin-top: 10px;">
            <div style="font-weight:bold; margin-bottom:5px; font-size:0.8rem; border-bottom:1px solid #ddd; padding-bottom:3px;">รายการอื่นๆ เพิ่มเติม</div>
            <table class="a4-table" style="margin-bottom:10px;">
              <tbody>
                ${extraItems.map(f => `
                  <tr>
                    <td class="td-center" style="width:40px;">-</td>
                    <td>
                      <span class="bold" style="font-size:0.8rem;">${f.category}</span>
                      ${f.note ? `<span style="font-size:0.7rem; color:#777; margin-left:10px;">(${f.note})</span>` : ''}
                    </td>
                    <td class="td-right" style="width:50px;"></td>
                    <td class="td-right" style="width:70px;"></td>
                    <td class="td-right bold" style="width:90px;">฿${UI.currency(f.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

    const grandTotal = data.totalAmt + financeTotal;
    const subtotal = data.totalAmt;
    
    function thaiBahtText(amount) {
      if (isNaN(amount) || amount === 0) return 'ศูนย์บาทถ้วน';
      const numToThai = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
      const unitToThai = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
      let [baht, satang] = Number(amount).toFixed(2).split('.');
      
      let convert = (numStr) => {
        let res = '';
        let len = numStr.length;
        for (let i = 0; i < len; i++) {
          let n = parseInt(numStr[i]);
          if (n !== 0) {
            if (i === len - 1 && n === 1 && len > 1 && numStr[len - 2] !== '0') {
              res += 'เอ็ด';
            } else if (i === len - 2 && n === 2) {
              res += 'ยี่สิบ';
            } else if (i === len - 2 && n === 1) {
              res += 'สิบ';
            } else {
              res += numToThai[n] + unitToThai[len - i - 1];
            }
          }
        }
        return res;
      };
      
      let bahtText = convert(baht);
      let satangText = convert(satang);
      
      return (bahtText ? bahtText + 'บาท' : '') + (satangText ? satangText + 'สตางค์' : 'ถ้วน');
    }

    const html = `
      <style>
        .a4-wrapper { 
          background: #fff; 
          color: #333; 
          font-family: 'Sarabun', 'Prompt', sans-serif; 
          line-height: 1.2; 
          max-width: 210mm; /* A4 width */
          margin: 0 auto; 
          padding: 10mm; 
          box-sizing: border-box; 
        }
        .a4-header { display: flex; justify-content: space-between; border-bottom: 2px solid var(--primary); padding-bottom: 10px; margin-bottom: 10px; }
        .a4-title { color: var(--primary); font-size: 18px; font-weight: bold; margin: 0; }
        .a4-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 0.75rem; }
        .a4-table th { background: #f8f9fa; border: 1px solid #ddd; padding: 4px 6px; text-align: left; font-size: 0.75rem; }
        .a4-table td { border: 1px solid #ddd; padding: 4px 6px; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .a4-table .td-right { text-align: right; }
        .a4-table .td-center { text-align: center; }
        .a4-summary-box { display: flex; justify-content: flex-end; margin-bottom: 15px; }
        .a4-summary-table { width: 250px; border-collapse: collapse; font-size:0.75rem; }
        .a4-summary-table td { padding: 4px 6px; border: 1px solid #ddd; }
        .a4-summary-table .bold { font-weight: bold; }
        .a4-signatures { display: flex; justify-content: space-around; margin-top: 30px; text-align: center; font-size:0.8rem; }
        .a4-sign-line { width: 180px; border-bottom: 1px solid #333; margin-bottom: 5px; height: 25px; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 210mm !important; 
            height: 297mm !important;
            margin: 0; 
            padding: 10mm; 
            box-shadow: none; 
            border: none;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
          }
          #modal-overlay { display: block !important; position: absolute !important; padding: 0 !important; background: #fff !important; }
          .modal-box { display: block !important; max-width: none !important; border: none !important; box-shadow: none !important; overflow: visible !important; background: transparent !important; }
          .modal-header, .modal-footer { display: none !important; }
          .modal-body { padding: 0 !important; }
          .no-print { display: none !important; }
        }
      </style>

      <div class="a4-wrapper" id="receipt-print-area">
        <div class="a4-header">
          <div style="flex:1;">
            <h2 style="margin:0; font-size:1.2rem;">${comp.name}</h2>
            ${comp.address || comp.phone ? `<div style="font-size:0.75rem; color:#444; margin-top:4px;">
              ${comp.address}<br>
              ${comp.phone ? 'โทร: ' + comp.phone : ''}
            </div>` : ''}
          </div>
          <div style="text-align:right;">
            <h1 class="a4-title">ใบเสร็จรับเงิน</h1>
            <h3 style="margin:0; color:#777; font-weight:normal; font-size:0.9rem;">RECEIPT</h3>
            <table style="margin-top:5px; width:100%; font-size:0.75rem;">
              <tr><td style="text-align:right; color:#666; padding-right:5px;">เลขที่ (No):</td><td style="text-align:left; font-weight:bold;">${data.billId}</td></tr>
              <tr><td style="text-align:right; color:#666; padding-right:5px;">วันที่ (Date):</td><td style="text-align:left; font-weight:bold;">${UI.dateStr(data.date)}</td></tr>
            </table>
          </div>
        </div>

        <div style="border: 1px solid #ddd; border-radius: 4px; padding: 6px 10px; margin-bottom: 10px; display:flex;">
          <div style="flex:1;">
            <div style="font-size:0.7rem; color:#666; margin-bottom:1px;">ลูกค้า (Customer)</div>
            <div style="font-size:0.9rem; font-weight:bold;">${data.employeeName || '-'}</div>
          </div>
        </div>

        <table class="a4-table">
          <thead>
            <tr>
              <th class="td-center" style="width:40px;">ลำดับ<br>No.</th>
              <th>รายการสินค้า<br>Description</th>
              <th class="td-right" style="width:50px;">จำนวน<br>Qty</th>
              <th class="td-right" style="width:70px;">ราคา<br>Price</th>
              <th class="td-right" style="width:90px;">จำนวนเงิน<br>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${activeItems.map((it, idx) => {
              let setDetails = '';
              if (it.isSet && it.setItems && it.setItems.length > 0) {
                setDetails = `<span style="font-size:0.65rem; color:#666; margin-left:8px;">[ชุด: ${it.setItems.map(setIt => `${setIt.name} x${setIt.qty}`).join(', ')}]</span>`;
              }
              return `
              <tr>
                <td class="td-center">${idx + 1}</td>
                <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 350px;">
                  <span class="bold" style="font-size:0.75rem;">${it.productName}</span>
                  <span style="font-size:0.65rem; color:#777; margin-left:6px;">[${it.productCode || '-'}] ${it.productCategory || ''}</span>
                  ${setDetails}
                </td>
                <td class="td-right">${it.sold} ${it.unit || ''}</td>
                <td class="td-right">฿${UI.currency(it.pricePerUnit)}</td>
                <td class="td-right bold">฿${UI.currency(it.sold * it.pricePerUnit)}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        ${financeHtml}

        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top: 10px;">
          <div style="flex:1; padding-right:15px;">
            <div style="background:#f1f3f5; padding:8px; border-radius:4px; text-align:center; font-weight:bold; font-style:italic; font-size:0.8rem;">
              ( ${thaiBahtText(grandTotal)} )
            </div>
            ${data.note ? `<div style="margin-top:10px; padding:8px; border:1px dashed #ccc; border-radius:4px; font-size:0.75rem;"><strong>หมายเหตุ:</strong> ${data.note}</div>` : ''}
          </div>
          <div class="a4-summary-box">
            <table class="a4-summary-table">
              <tr>
                <td>รวมค่าสินค้า (Subtotal)</td>
                <td class="td-right bold">฿${UI.currency(subtotal)}</td>
              </tr>
              ${financeTotal > 0 ? `
              <tr>
                <td>รวมรายการอื่นๆ (Other Items)</td>
                <td class="td-right bold">฿${UI.currency(financeTotal)}</td>
              </tr>
              ` : ''}
              <tr style="background:#f8f9fa;">
                <td class="bold" style="font-size:0.9rem; padding:8px 6px;">จำนวนเงินรวมทั้งสิ้น</td>
                <td class="td-right bold" style="font-size:0.9rem; color:var(--primary); padding:8px 6px;">฿${UI.currency(grandTotal)}</td>
              </tr>
            </table>
          </div>
        </div>

        <div class="a4-signatures">
          <div>
            <div class="a4-sign-line"></div>
            <div>ผู้รับเงิน / Receiver</div>
            <div style="font-size:0.7rem; color:#666; margin-top:2px;">วันที่ / Date: ______/______/______</div>
          </div>
          <div>
            <div class="a4-sign-line"></div>
            <div>ผู้มีอำนาจลงนาม / Authorized Signature</div>
            <div style="font-size:0.7rem; color:#666; margin-top:2px;">วันที่ / Date: ______/______/______</div>
          </div>
        </div>

        <div class="no-print" style="margin-top: 20px; display:flex; gap:10px; justify-content:center;">
          <button class="btn btn-primary" onclick="window.print()" style="min-width:130px; padding:8px; font-size:0.85rem;"><span class="material-icons" style="font-size:18px; vertical-align:text-bottom;">print</span> พิมพ์ใบเสร็จ</button>
          <button class="btn btn-success" onclick="PAGES.billing.saveReceiptImage()" style="min-width:130px; padding:8px; font-size:0.85rem;"><span class="material-icons" style="font-size:18px; vertical-align:text-bottom;">image</span> บันทึกรูป</button>
          <button class="btn btn-secondary" onclick="closeModal()" style="min-width:130px; padding:8px; font-size:0.85rem;">ปิด</button>
        </div>
      </div>
    `;
    openModal('ใบเสร็จรับเงินสำเร็จ', html, '', '850px');
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
