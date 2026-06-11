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
          <div class="page-title-icon" style="background:#FCE4EC;color:var(--c-finance)">
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

      <div id="bh-summary-ribbon" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <div class="stat-card blue" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">receipt_long</span></div><div class="stat-label" style="font-size:0.75rem">จำนวนบิลทั้งหมด</div><div id="bh-sum-count" class="stat-value" style="font-size:1.1rem">0</div></div>
        <div class="stat-card green" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">inventory_2</span></div><div class="stat-label" style="font-size:0.75rem">รวมจำนวนชิ้น</div><div id="bh-sum-pieces" class="stat-value" style="font-size:1.1rem">0</div></div>
        <div class="stat-card orange" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">shopping_cart</span></div><div class="stat-label" style="font-size:0.75rem">ต้นทุนรวม (VAT)</div><div id="bh-sum-cost" class="stat-value" style="font-size:1.1rem">฿0</div></div>
        <div class="stat-card purple" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">monetization_on</span></div><div class="stat-label" style="font-size:0.75rem">คอมเอเจนซี่</div><div id="bh-sum-agent" class="stat-value" style="font-size:1.1rem">฿0</div></div>
        <div class="stat-card dark" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">payments</span></div><div class="stat-label" style="font-size:0.75rem">ยอดขายสุทธิ</div><div id="bh-sum-value" class="stat-value" style="font-size:1.1rem">฿0</div></div>
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
          <div class="form-group" style="width:160px">
            <label>พนักงาน</label>
            <select id="bh-employee" onchange="PAGES['billing-history'].applyFilters()">
              <option value="">-- ทั้งหมด --</option>
            </select>
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
      const [res, pRes, sRes] = await Promise.all([
        API.getBillingHistory(this._filters.startDate, this._filters.endDate),
        API.getProducts(),
        API.getSets()
      ]);
      this._billings = res.billings || [];
      this._products = pRes.products || [];
      this._sets = sRes?.sets || [];
      this._mergedProducts = [...this._products, ...this._sets.map(s => ({...s, isSet: true}))];
      
      const emps = Array.from(new Set(this._billings.map(b => b.employee?.displayName))).filter(Boolean).sort();
      const empSelect = document.getElementById('bh-employee');
      if (empSelect) {
        empSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>' + 
          emps.map(e => `<option value="${e}">${e}</option>`).join('');
      }

      this.applyFilters();
    } catch(e) {
      container.innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  applyFilters(e) {
    if (e) e.preventDefault();
    const q = (document.getElementById('bh-query')?.value || '').toLowerCase().trim();
    const emp = document.getElementById('bh-employee')?.value;
    const filtered = this._billings.filter(b => {
      const matchSearch = !q || b.id.toLowerCase().includes(q) || 
                          (b.employee?.displayName || '').toLowerCase().includes(q) ||
                          (b.warehouseName || '').toLowerCase().includes(q);
      const matchEmp = !emp || b.employee?.displayName === emp;
      return matchSearch && matchEmp;
    });

    // Update stats
    const totalCount = filtered.length;
    let sumPieces = 0;
    let sumCost = 0;
    let sumWholesale = 0;
    let sumAgentComm = 0;
    let sumSaleComm = 0;

    filtered.forEach(b => {
      const items = JSON.parse(b.items || '[]');
      items.forEach(it => {
        const qty = Number(it.sold) || 0;
        const p = this._mergedProducts.find(x => x.id === it.productId) || {};
        let cost = 0, wholesale = 0, saleComm = 0, pieces = 0;

        if (p.isSet && p.items) {
          p.items.forEach(subIt => {
            let subP = null;
            if (subIt.allowedProducts?.length) subP = this._products.find(x => subIt.allowedProducts.includes(x.id));
            if (!subP && subIt.category) subP = this._products.find(x => x.category === subIt.category);
            const subQty = Number(subIt.qty) || 0;
            pieces += subQty;
            if (subP) {
              cost += (Number(subP.costVat) || 0) * subQty;
              wholesale += (Number(subP.sellWholesale) || 0) * subQty;
            }
          });
          const billedPrice = Number(it.pricePerUnit) || wholesale;
          sumCost += cost * qty;
          sumWholesale += billedPrice * qty; // Use billed price or fallback
          sumAgentComm += (wholesale - cost) * qty;
          sumPieces += pieces * qty;
        } else {
          sumCost += (Number(p.costVat) || 0) * qty;
          sumWholesale += (Number(it.pricePerUnit) || Number(p.sellWholesale) || 0) * qty;
          sumAgentComm += ((Number(it.pricePerUnit) || Number(p.sellWholesale) || 0) - (Number(p.costVat) || 0)) * qty;
          sumPieces += qty;
        }
      });
    });

    const animateStat = (id, val, isCurrency = true) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('animate-in');
        void el.offsetWidth;
        el.textContent = isCurrency ? `฿${UI.currency(val, 2)}` : UI.currency(val, 0);
        el.classList.add('animate-in');
      }
    };

    animateStat('bh-sum-count', totalCount, false);
    animateStat('bh-sum-pieces', sumPieces, false);
    animateStat('bh-sum-cost', sumCost);
    animateStat('bh-sum-agent', sumAgentComm);
    animateStat('bh-sum-value', sumWholesale);

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
              <th class="td-right">สินค้า</th>
              <th class="td-right">รายละเอียดเงินรวม</th>
              <th class="td-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((b, idx) => {
              const items = JSON.parse(b.items || '[]');
              let tCost = 0, tWholesale = 0, tSaleComm = 0, tAgentComm = 0, totalPieces = 0, setQty = 0;
              
              items.forEach(it => {
                const qty = Number(it.sold) || 0;
                const p = this._mergedProducts?.find(x => x.id === it.productId) || {};
                let cost = 0, wholesale = 0, saleComm = 0, pieces = 0;

                if (p.isSet && p.items) {
                  setQty += qty;
                  p.items.forEach(subIt => {
                    let subP = null;
                    if (subIt.allowedProducts?.length) subP = this._products?.find(x => subIt.allowedProducts.includes(x.id));
                    if (!subP && subIt.category) subP = this._products?.find(x => x.category === subIt.category);
                    const subQty = Number(subIt.qty) || 0;
                    pieces += subQty;
                    if (subP) {
                      cost += (Number(subP.costVat) || 0) * subQty;
                      wholesale += (Number(subP.sellWholesale) || 0) * subQty;
                      saleComm += (Number(subP.sellCommission) || 0) * subQty;
                    }
                  });
                  const billedPrice = Number(it.pricePerUnit) || wholesale;
                  tCost += cost * qty;
                  tWholesale += billedPrice * qty;
                  tAgentComm += (billedPrice - cost) * qty; // Ensure mathematically correct
                  totalPieces += pieces * qty;
                } else {
                  const billedPrice = Number(it.pricePerUnit) || Number(p.sellWholesale) || 0;
                  const cost = Number(p.costVat) || 0;
                  tCost += cost * qty;
                  tWholesale += billedPrice * qty;
                  tAgentComm += (billedPrice - cost) * qty; // Ensure mathematically correct
                  totalPieces += qty;
                }
              });

              return `
              <tr class="animate-in" style="animation-delay: ${idx * 0.03}s; border-bottom:1px solid var(--border-light)">
                <td style="font-size:0.82rem">
                  <div class="fw-bold" style="display:flex; align-items:center; gap:4px">
                    ${UI.dateStr(b.date)}
                    ${AUTH.isAdmin() ? `<span class="material-icons text-primary" style="font-size:14px; cursor:pointer;" onclick="PAGES['billing-history'].editDate('${b.id}', '${b.date}')" title="แก้ไขวันที่">edit</span>` : ''}
                  </div>
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
                <td class="td-right">
                  <div class="fw-bold" style="color:var(--primary)">${UI.currency(totalPieces, 0)} ชิ้น</div>
                  ${setQty > 0 ? `<div style="font-size:0.75rem;color:var(--info);margin-top:2px;font-weight:600;"><span class="material-icons" style="font-size:12px;vertical-align:middle;">inventory_2</span> (มีเซ็ต ${UI.currency(setQty, 0)} เซ็ต)</div>` : ''}
                  <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;">จาก ${items.length} รายการ</div>
                </td>
                <td class="td-right">
                  <div style="display:flex;flex-direction:column;gap:2px;font-size:0.75rem;">
                    <div style="display:flex;justify-content:space-between;width:140px;margin-left:auto;">
                      <span style="color:var(--text-muted)">ต้นทุน:</span>
                      <span>฿${UI.currency(tCost, 2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;width:140px;margin-left:auto;">
                      <span style="color:var(--text-muted)">คอมเอเจนซี่:</span>
                      <span style="color:var(--pink)">฿${UI.currency(tAgentComm, 2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;width:140px;margin-left:auto;border-top:1px dashed var(--border-light);padding-top:2px;margin-top:2px;">
                      <span style="color:var(--text-muted)">รวม:</span>
                      <span class="fw-bold" style="color:var(--success)">฿${UI.currency(b.totalAmt, 2)}</span>
                    </div>
                  </div>
                </td>
                <td class="td-center">
                  <div style="display:flex;gap:6px;justify-content:center">
                    <button class="btn btn-primary btn-xs" onclick="PAGES['billing-history'].reprintBilling('${b.id}')">
                      <span class="material-icons">print</span> พิมพ์ใบเสร็จ
                    </button>
                  </div>
                </td>
              </tr>
              `;
            }).join('')}
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
      const unpackedItems = {};
      items.forEach(it => {
         if (!unpackedItems[it.productId]) unpackedItems[it.productId] = { ...it, sold: 0, setSource: 0 };
         unpackedItems[it.productId].sold += it.sold;
      });
      const finalItems = Object.values(unpackedItems).filter(it => it.sold > 0);
      
      const body = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;font-size:0.9rem">
          <div>
            <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:4px">ข้อมูลรายการ</div>
            <div class="fw-bold">เลขอ้างอิง: ${b.id}</div>
            <div style="display:flex; align-items:center; gap:5px">
              วันที่: ${UI.dateStr(b.date)} 
              ${AUTH.isAdmin() ? `<button class="btn btn-secondary btn-xs" onclick="PAGES['billing-history'].editDate('${b.id}', '${b.date}')" style="padding:2px; height:20px"><span class="material-icons" style="font-size:14px">edit</span></button>` : ''}
            </div>
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
              ${finalItems.map(it => {
                let displayStr = `${UI.currency(it.sold, 0)} ${it.unit || ''}`;
                return `
                <tr>
                  <td>
                    <div class="fw-bold">${it.productName || it.productId}</div>
                    <div class="text-muted" style="font-size:0.65rem">[${it.productCode || '-'}] ${it.productCategory || ''}</div>
                  </td>
                  <td class="td-right">${displayStr}</td>
                  <td class="td-right">฿${UI.currency(it.pricePerUnit)}</td>
                  <td class="td-right text-primary-color fw-bold">฿${UI.currency(it.sold * it.pricePerUnit)}</td>
                </tr>
                `;
              }).join('')}
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
      let financeItems = b.financeItems || [];

      // Unpack items for receipt exactly like doBilling did
      const groupedReceipt = {};
      items.forEach(it => {
         if (!groupedReceipt[it.productId]) groupedReceipt[it.productId] = { ...it, sold: 0 };
         groupedReceipt[it.productId].sold += it.sold;
      });
      const finalReceiptItems = Object.values(groupedReceipt).filter(it => it.sold > 0);

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
        items: finalReceiptItems,
        financeItems: financeItems,
        note: b.note
      });
      
      UI.loading(false);
    } catch(e) {
      UI.loading(false);
      UI.toast('Reprint ไม่สำเร็จ: ' + e.message, 'error');
    }
  },

  editDate(id, oldDate) {
    const body = `
      <div class="form-group">
        <label>เลือกวันที่ใหม่สำหรับบิล <b>${id}</b></label>
        <input type="date" id="bh-edit-date-input" value="${oldDate}" style="font-size:1.1rem; padding:10px; width:100%; border:1px solid var(--border-color); border-radius:8px;" />
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES['billing-history'].saveEditDate('${id}', '${oldDate}')">บันทึกวันที่</button>
    `;

    openModal('แก้ไขวันที่', body, footer, '400px');
  },

  saveEditDate(id, oldDate) {
    const newDate = document.getElementById('bh-edit-date-input').value;
    if (!newDate) {
      UI.toast('กรุณาเลือกวันที่', 'warning');
      return;
    }
    if (newDate === oldDate) {
      closeModal();
      return;
    }

    closeModal();
    UI.loading(true);
    API.updateBillingDate(id, newDate).then(() => {
      UI.toast('แก้ไขวันที่สำเร็จ');
      this.load();
    }).catch(e => {
      UI.loading(false);
      UI.toast('แก้ไขวันที่ไม่สำเร็จ: ' + e.message, 'error');
    });
  }
};