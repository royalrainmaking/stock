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
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:#F3E5F5;color:var(--c-history)">
            <span class="material-icons">manage_search</span>
          </div>
          <div>
            <h2 class="page-title">ประวัติการเบิกสินค้า</h2>
            <p class="page-subtitle">ตรวจสอบสถานะรายการขอเบิกและการจัดส่งสินค้าทั้งหมด</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="PAGES['transfer-history'].load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
        </div>
      </div>


      <div id="th-summary-ribbon" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <div class="stat-card blue" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">local_shipping</span></div><div class="stat-label" style="font-size:0.75rem">ใบเบิกทั้งหมด</div><div id="th-sum-count" class="stat-value" style="font-size:1.1rem">0</div></div>
        <div class="stat-card green" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">inventory_2</span></div><div class="stat-label" style="font-size:0.75rem">รวมจำนวนชิ้น</div><div id="th-sum-pieces" class="stat-value" style="font-size:1.1rem">0</div></div>
        <div class="stat-card orange" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">shopping_cart</span></div><div class="stat-label" style="font-size:0.75rem">ต้นทุนรวม (VAT)</div><div id="th-sum-cost" class="stat-value" style="font-size:1.1rem">฿0</div></div>
        <div class="stat-card purple" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">monetization_on</span></div><div class="stat-label" style="font-size:0.75rem">คอมเอเจนซี่</div><div id="th-sum-agent" class="stat-value" style="font-size:1.1rem">฿0</div></div>
        <div class="stat-card pink" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">card_giftcard</span></div><div class="stat-label" style="font-size:0.75rem">คอมเซลล์</div><div id="th-sum-sale" class="stat-value" style="font-size:1.1rem">฿0</div></div>
        <div class="stat-card dark" style="padding:12px 16px;"><div class="stat-bg-icon"><span class="material-icons">payments</span></div><div class="stat-label" style="font-size:0.75rem">มูลค่ารวม (เบิกออก)</div><div id="th-sum-value" class="stat-value" style="font-size:1.1rem">฿0</div></div>
      </div>

      <div class="filter-card">
        <form id="th-filter-form" onsubmit="PAGES['transfer-history'].applyFilter(event)">
          <div class="form-group" style="width:150px">
            <label>วันที่เริ่มต้น</label>
            <input type="date" id="th-start-date" onchange="PAGES['transfer-history'].applyFilter()" />
          </div>
          <div class="form-group" style="width:150px">
            <label>วันที่สิ้นสุด</label>
            <input type="date" id="th-end-date" onchange="PAGES['transfer-history'].applyFilter()" />
          </div>
          <div class="form-group" style="width:160px">
            <label>สถานะ</label>
            <select id="th-status" onchange="PAGES['transfer-history'].applyFilter()">
              <option value="">-- ทั้งหมด --</option>
              <option value="pending">⏳ รอจัดสินค้า</option>
              <option value="completed">✅ จัดเสร็จแล้ว</option>
              <option value="rejected">❌ ถูกปฏิเสธ</option>
            </select>
          </div>
          <div class="form-group" style="width:160px">
            <label>พนักงาน</label>
            <select id="th-employee" onchange="PAGES['transfer-history'].applyFilter()">
              <option value="">-- ทั้งหมด --</option>
            </select>
          </div>
          <div class="form-group" style="width:160px">
            <label>คลังปลายทาง</label>
            <select id="th-warehouse" onchange="PAGES['transfer-history'].applyFilter()">
              <option value="">-- ทั้งหมด --</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;min-width:200px">
            <label>ค้นหา (เลขอ้างอิง, พนักงาน)</label>
            <input type="text" id="th-query" placeholder="ระบุคำค้นหา..." oninput="PAGES['transfer-history'].applyFilter()" />
          </div>
          <button type="submit" class="btn btn-primary" style="height:42px">
            <span class="material-icons">search</span> ค้นหา
          </button>
        </form>
      </div>

      <div id="th-list" class="grid-1">
        ${UI.skeletonTable(6, 8)}
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
      const [oRes, pRes, wRes, sRes] = await Promise.all([
        API.getOrders(),
        API.getProducts(),
        API.getWarehouses(),
        API.getSets()
      ]);
      this._orders = (oRes.orders || []).filter(o => o.id?.startsWith('REQ') || o.id?.startsWith('TR'));
      this._products = pRes.products || [];
      this._warehouses = wRes.warehouses || [];
      this._sets = sRes?.sets || [];
      this._mergedProducts = [...this._products, ...this._sets.map(s => ({...s, isSet: true}))];

      // Populate employee dropdown
      const emps = Array.from(new Set(this._orders.map(o => o.requestedBy))).filter(Boolean).sort();
      const empSelect = document.getElementById('th-employee');
      if (empSelect) {
        empSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>' + 
          emps.map(e => `<option value="${e}">${e}</option>`).join('');
      }

      // Populate destination warehouse dropdown
      const destWhSelect = document.getElementById('th-warehouse');
      if (destWhSelect) {
        const destWhIds = Array.from(new Set(this._orders.map(o => o.toWhId))).filter(Boolean);
        const whOptions = destWhIds.map(id => {
          const w = this._warehouses.find(x => x.id === id);
          return `<option value="${id}">${w ? (w.employeeName || w.name) : id}</option>`;
        });
        destWhSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>' + whOptions.join('');
      }

      this.applyFilter();
    } catch(e) {
      UI.toast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error');
    }
  },

  applyFilter(e) {
    if (e) e.preventDefault();
    const q = document.getElementById('th-query')?.value.toLowerCase().trim();
    const s = document.getElementById('th-status')?.value;
    const emp = document.getElementById('th-employee')?.value;
    const wh = document.getElementById('th-warehouse')?.value;
    const startDate = document.getElementById('th-start-date').value;
    const endDate = document.getElementById('th-end-date').value;
    
    const filtered = this._orders.filter(o => {
      const matchSearch = !q || o.id.toLowerCase().includes(q) || (o.requestedBy||'').toLowerCase().includes(q);
      const matchStatus = !s || o.status === s;
      const matchEmp = !emp || o.requestedBy === emp;
      const matchWh = !wh || o.toWhId === wh;
      const billDate = o.date || o.createdAt?.split('T')[0] || '';
      const matchDate = (!startDate || billDate >= startDate) && (!endDate || billDate <= endDate);
      
      return matchSearch && matchStatus && matchEmp && matchWh && matchDate;
    });

    // Update summary stats
    const totalCount = filtered.length;
    let sumPieces = 0;
    let sumCost = 0;
    let sumWholesale = 0;
    let sumAgentComm = 0;
    let sumSaleComm = 0;

    filtered.forEach(o => {
      (o.items || []).forEach(it => {
        const p = this._mergedProducts.find(x => x.id === it.productId) || {};
        let cost = 0, wholesale = 0, saleComm = 0, pieces = 0;
        const qty = Number(it.qty) || 0;

        if (p.isSet) {
          if (it.pickedComponents && it.pickedComponents.length > 0) {
            it.pickedComponents.forEach(subIt => {
              const subP = this._products.find(x => x.id === subIt.productId) || {};
              sumCost += (Number(subP.costVat) || 0) * (Number(subIt.qty) || 0);
              sumWholesale += (Number(subP.sellWholesale) || 0) * (Number(subIt.qty) || 0);
              sumSaleComm += (Number(subP.sellCommission) || 0) * (Number(subIt.qty) || 0);
              sumAgentComm += ((Number(subP.sellWholesale) || 0) - (Number(subP.costVat) || 0)) * (Number(subIt.qty) || 0);
              sumPieces += (Number(subIt.qty) || 0);
            });
          } else if (p.items) {
            let cost = 0, wholesale = 0, saleComm = 0, pieces = 0;
            p.items.forEach(subIt => {
              let subP = null;
              if (subIt.allowedProducts?.length) subP = this._products.find(x => subIt.allowedProducts.includes(x.id));
              if (!subP && subIt.category) subP = this._products.find(x => x.category === subIt.category);
              if (subP) {
                cost += (Number(subP.costVat) || 0) * (Number(subIt.qty) || 0);
                wholesale += (Number(subP.sellWholesale) || 0) * (Number(subIt.qty) || 0);
              }
              pieces += (Number(subIt.qty) || 0);
            });
            sumCost += cost * qty;
            sumWholesale += wholesale * qty;
            sumSaleComm += 0 * qty; // Salesperson gets no component commission from sets
            sumAgentComm += (wholesale - cost) * qty;
            sumPieces += pieces * qty;
          }
        } else {
          sumCost += (Number(p.costVat) || 0) * qty;
          sumWholesale += (Number(p.sellWholesale) || 0) * qty;
          const sComm = (Number(p.sellCommission) || 0) * qty;
          sumSaleComm += sComm;
          sumAgentComm += (((Number(p.sellWholesale) || 0) - (Number(p.costVat) || 0)) * qty) - sComm;
          sumPieces += qty;
        }
      });
    });

    // Animate summary updates
    const animateStat = (id, val, isCurrency = true) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('animate-in');
        void el.offsetWidth; // trigger reflow
        el.textContent = isCurrency ? `฿${UI.currency(val, 2)}` : UI.currency(val, 0);
        el.classList.add('animate-in');
      }
    };

    animateStat('th-sum-count', totalCount, false);
    animateStat('th-sum-pieces', sumPieces, false);
    animateStat('th-sum-cost', sumCost);
    animateStat('th-sum-agent', sumAgentComm);
    animateStat('th-sum-sale', sumSaleComm);
    animateStat('th-sum-value', sumWholesale);

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
              
              let totalPieces = 0;
              let setQty = 0;
              let tCost = 0, tWholesale = 0, tSaleComm = 0, tAgentComm = 0;

              items.forEach(item => {
                const qty = Number(item.qty) || 0;
                const p = this._mergedProducts.find(x => x.id === item.productId) || {};
                
                if (p.isSet) {
                  setQty += qty;
                  if (item.pickedComponents && item.pickedComponents.length > 0) {
                    item.pickedComponents.forEach(subIt => {
                      const subP = this._products.find(x => x.id === subIt.productId) || {};
                      const subQty = Number(subIt.qty) || 0;
                      totalPieces += subQty;
                      tCost += (Number(subP.costVat) || 0) * subQty;
                      tWholesale += (Number(subP.sellWholesale) || 0) * subQty;
                      tSaleComm += (Number(subP.sellCommission) || 0) * subQty;
                      tAgentComm += ((Number(subP.sellWholesale) || 0) - (Number(subP.costVat) || 0)) * subQty;
                    });
                  } else if (p.items) {
                    let cost = 0, wholesale = 0, saleComm = 0, pieces = 0;
                    p.items.forEach(subIt => {
                      let subP = null;
                      if (subIt.allowedProducts?.length) subP = this._products.find(x => subIt.allowedProducts.includes(x.id));
                      if (!subP && subIt.category) subP = this._products.find(x => x.category === subIt.category);
                      const subQty = Number(subIt.qty) || 0;
                      pieces += subQty;
                      if (subP) {
                        cost += (Number(subP.costVat) || 0) * subQty;
                        wholesale += (Number(subP.sellWholesale) || 0) * subQty;
                        saleComm += (Number(subP.sellCommission) || 0) * subQty;
                      }
                    });
                    tCost += cost * qty;
                    tWholesale += wholesale * qty;
                    tSaleComm += saleComm * qty;
                    tAgentComm += (wholesale - cost) * qty;
                    totalPieces += pieces * qty;
                  }
                } else {
                  totalPieces += qty;
                  tCost += (Number(p.costVat) || 0) * qty;
                  tWholesale += (Number(p.sellWholesale) || 0) * qty;
                  tSaleComm += (Number(p.sellCommission) || 0) * qty;
                  tAgentComm += ((Number(p.sellWholesale) || 0) - (Number(p.costVat) || 0)) * qty;
                }
              });

              let statusBadge = '';
              if (o.status === 'pending') statusBadge = '<span class="badge badge-yellow">รอจัดสินค้า</span>';
              else if (o.status === 'completed') statusBadge = '<span class="badge badge-green">จัดเสร็จแล้ว</span>';
              else if (o.status === 'rejected') statusBadge = '<span class="badge badge-red">ถูกปฏิเสธ</span>';

              return `
                <tr class="animate-in" style="animation-delay: ${idx * 0.03}s; border-bottom:1px solid var(--border-light)">
                <td style="font-size:0.82rem">
                  <div class="fw-bold text-primary-color">${UI.dateStr(o.date || o.createdAt)}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">${UI.dateTimeParts(o.createdAt).time} น.</div>
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
                        ${UI.avatar(fromWh.avatar, fromWh.name, 22, fromWh.type === 'central' ? 'warehouse' : 'user')}
                        <span style="max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${fromWh.name}">${fromWh.name}</span>
                      </div>
                      <span class="material-icons" style="font-size:14px;color:var(--text-muted)">arrow_forward</span>
                      <div style="display:flex;align-items:center;gap:4px">
                        ${UI.avatar(toWh.employeeAvatar || toWh.avatar, toWh.employeeName || toWh.name, 22, toWh.type === 'central' ? 'warehouse' : 'user')}
                        <span style="max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${toWh.employeeName || toWh.name}">${toWh.employeeName || toWh.name}</span>
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
                      <div style="display:flex;justify-content:space-between;width:140px;margin-left:auto;">
                        <span style="color:var(--text-muted)">คอมเซลล์:</span>
                        <span style="color:var(--pink)">฿${UI.currency(tSaleComm, 2)}</span>
                      </div>
                      <div style="display:flex;justify-content:space-between;width:140px;margin-left:auto;border-top:1px dashed var(--border-light);padding-top:2px;margin-top:2px;">
                        <span style="color:var(--text-muted)">รวม:</span>
                        <span class="fw-bold" style="color:var(--success)">฿${UI.currency(tWholesale, 2)}</span>
                      </div>
                    </div>
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
              const p = this._mergedProducts.find(x => x.id === it.productId) || {};
              const setObj = p.isSet ? p : null;
              
              const displayName = setObj ? setObj.name : (p.name || it.productId);
              const displayCode = setObj ? setObj.code : (p.code || '-');
              const displayCat = setObj ? 'เซ็ตสินค้า' : (p.category || '');
              const displayImg = setObj ? setObj.imageUrl : p.imageUrl;
              const unit = setObj ? 'เซ็ต' : (it.unit || p.unit || 'หน่วย');

              let subItemsHtml = '';
              if (setObj && (it.pickedComponents || setObj.items)) {
                 const isPicked = it.pickedComponents && it.pickedComponents.length > 0;
                 const componentsToRender = isPicked ? it.pickedComponents : (setObj.items || []);
                 
                 if (componentsToRender.length > 0) {
                   subItemsHtml = `
                      <div style="margin-top:8px; background:var(--bg-base); padding:8px 12px; border-radius:6px; font-size:0.75rem; border:1px solid var(--border-light)">
                        <div style="color:var(--text-secondary); margin-bottom:4px">📌 ส่วนประกอบในเซ็ต (รวมที่เบิกทั้งหมด):</div>
                        <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
                          ${componentsToRender.map(subIt => {
                            const subP = this._products.find(x => x.id === subIt.productId) || {};
                            const name = isPicked ? (subP.name || subIt.productId) : (subIt.category ? `สินค้าในหมวด ${subIt.category}` : 'สินค่าย่อย');
                            const qty = isPicked ? subIt.qty : (subIt.qty * (Number(it.qty) || 1));
                            const unit = isPicked ? (subIt.unit || subP.unit || 'หน่วย') : (subIt.unit || 'หน่วย');
                            const imgHtml = (isPicked && subP.imageUrl) ? UI.image(subP.imageUrl, '', 'width:20px;height:20px;object-fit:cover;border-radius:3px;') : '<span class="material-icons" style="font-size:14px;color:var(--text-muted)">inventory_2</span>';
                            return `
                              <div style="display:flex; align-items:center; gap:8px;">
                                <div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;background:var(--bg-body);border-radius:3px;flex-shrink:0;">
                                  ${imgHtml}
                                </div>
                                <div style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
                                <div style="color:var(--primary);font-weight:bold">${qty} <span style="font-weight:normal;color:var(--text-muted)">${unit}</span></div>
                              </div>
                            `;
                          }).join('')}
                        </div>
                      </div>
                   `;
                 }
              }

              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:flex-start;gap:12px">
                      <div class="item-img-mini" style="width:36px;height:36px;flex-shrink:0">
                        ${UI.image(displayImg, '', 'width:40px;height:40px;object-fit:cover;border-radius:4px;')}
                      </div>
                      <div>
                        <div class="fw-bold" style="font-size:0.85rem">${displayName}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)"><span style="font-family:monospace">[${displayCode}]</span> ${displayCat}</div>
                        ${subItemsHtml}
                      </div>
                    </div>
                  </td>
                  <td class="td-right fw-bold" style="color:var(--primary);font-size:0.9rem">${UI.currency(it.qty, 0)} ${unit}</td>
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
