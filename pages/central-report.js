const CentralReport = {
  _data: [],
  _billingReceived: 0,
  
  async render() {
    // Default to empty dates to show all-time data
    const firstDay = '';
    const today = '';

    document.getElementById('page-central-report').innerHTML = `
      <div class="page-header no-print">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:#E8F5E9;color:var(--success)">
            <span class="material-icons">account_balance</span>
          </div>
          <div>
            <h2 class="page-title">รายงานสรุปคลังกลาง (บริษัท)</h2>
            <p class="page-subtitle">ดูยอดรับเข้า เบิกออก คงเหลือ และผลต่างยอดเงิน</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="window.print()">
            <span class="material-icons">print</span> พิมพ์รายงาน
          </button>
        </div>
      </div>
      
      <div class="card mb-4 no-print">
        <div class="filter-bar" style="display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end;">
          <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
            <label>ตั้งแต่วันที่</label>
            <input type="date" id="cr-start-date" class="form-control" value="${firstDay}" onchange="CentralReport.loadData()">
          </div>
          <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
            <label>ถึงวันที่</label>
            <input type="date" id="cr-end-date" class="form-control" value="${today}" onchange="CentralReport.loadData()">
          </div>
          <div style="flex: 1;"></div>
          <div class="form-group" style="margin-bottom: 0;">
            <button class="btn btn-secondary" onclick="CentralReport.clearDates()" style="display: flex; align-items: center; gap: 6px;">
              <span class="material-icons" style="font-size: 18px;">history</span> ดูทั้งหมด (สะสม)
            </button>
          </div>
        </div>
      </div>

      <div id="cr-content">
        <div class="card text-center text-muted" style="padding: 40px;">
          กำลังโหลดข้อมูล...
        </div>
      </div>
    `;

    await this.loadData();
  },

  clearDates() {
    document.getElementById('cr-start-date').value = '';
    document.getElementById('cr-end-date').value = '';
    this.loadData();
  },

  async loadData() {
    const startDate = document.getElementById('cr-start-date').value;
    const endDate = document.getElementById('cr-end-date').value;
    const content = document.getElementById('cr-content');
    
    try {
      UI.loading(true);
      const res = await API.getCentralReport(startDate, endDate);
      this._data = res.rows || [];
      this._billingReceived = Number(res.totalBillingReceived) || 0;
      this._billingPieces = Number(res.totalBillingPieces) || 0;
      this._billingCost = Number(res.totalBillingCost) || 0;
      this._billingAgentComm = Number(res.totalBillingAgentComm) || 0;
      this._centralWhId = res.centralWhId;
      this.renderReport();
    } catch (e) {
      content.innerHTML = `<div class="card"><div class="alert alert-danger">เกิดข้อผิดพลาด: ${e.message}</div></div>`;
    } finally {
      UI.loading(false);
    }
  },

  renderReport() {
    const startDate = document.getElementById('cr-start-date').value;
    const endDate = document.getElementById('cr-end-date').value;

    const formatDt = (d) => {
      if (!d) return '';
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${Number(y) + 543}`;
    };

    let dateText = 'ทั้งหมด (สะสมตั้งแต่ต้น)';
    if (startDate && endDate) {
      if (startDate === endDate) {
        dateText = `วันที่ ${formatDt(startDate)}`;
      } else {
        dateText = `ตั้งแต่วันที่ ${formatDt(startDate)} ถึง ${formatDt(endDate)}`;
      }
    } else if (startDate) {
      dateText = `ตั้งแต่วันที่ ${formatDt(startDate)} เป็นต้นไป`;
    } else if (endDate) {
      dateText = `ถึงวันที่ ${formatDt(endDate)}`;
    }

    // 1. Calculate Totals FIRST
    let totalReceived = 0;
    let totalWithdrawn = 0;
    let totalExpectedBalance = 0;
    let totalAmount = 0;
    let totalCommission = 0;
    
    this._data.forEach((item) => {
      const withdrawn = Number(item.withdrawn) || 0;
      const price = Number(item.sellWholesale) || 0;
      const comm = Number(item.agentProfit) || 0;
      
      totalReceived += Number(item.received) || 0;
      totalWithdrawn += withdrawn;
      totalExpectedBalance += Number(item.balance) || 0;
      totalAmount += (item.txnAmount !== undefined ? Number(item.txnAmount) : withdrawn * price);
      totalCommission += (item.txnCommission !== undefined ? Number(item.txnCommission) : withdrawn * comm);
    });

    // 2. Generate HTML
    let html = `
      <!-- Print Version Header -->
      <div class="print-only" style="margin-bottom: 24px; border-bottom: 2px solid #222; padding-bottom: 12px; display: none;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h2 style="margin: 0; font-size: 24px; color: #222;">รายงานสรุปคลังกลาง (บริษัท)</h2>
            <div style="color: #555; font-size: 14px; margin-top: 4px;">ช่วงเวลา: ${dateText}</div>
          </div>
          <div style="text-align: right; color: #555; font-size: 12px;">
            พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')} เวลา ${new Date().toLocaleTimeString('th-TH')}
          </div>
        </div>
      </div>

      <!-- Summary Stats at the TOP -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;" class="no-print">
        <div class="stat-card blue">
          <div class="stat-bg-icon"><span class="material-icons">inventory_2</span></div>
          <div class="stat-label">มูลค่าสินค้าเบิกออก (จากตาราง)</div>
          <div class="stat-value">฿${UI.currency(totalAmount, 2)}</div>
        </div>
        <div class="stat-card green">
          <div class="stat-bg-icon"><span class="material-icons">payments</span></div>
          <div class="stat-label">ยอดเงินเข้า (จากประวัติคิดเงิน)</div>
          <div class="stat-value">฿${UI.currency(this._billingReceived, 2)}</div>
          <div class="stat-sub" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:var(--text-secondary)">ขายสุทธิ:</span>
              <span style="font-weight:700; color:var(--text-primary)">${UI.currency(this._billingPieces, 0)} ชิ้น</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:var(--text-secondary)">ต้นทุนรวม:</span>
              <span style="font-weight:600; color:var(--text-primary)">฿${UI.currency(this._billingCost, 2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="color:var(--text-secondary)">คอมฯ เอเจนซี่:</span>
              <span style="font-weight:600; color:#BE185D">฿${UI.currency(this._billingAgentComm, 2)}</span>
            </div>
          </div>
        </div>
        <div class="stat-card ${this._billingReceived - totalAmount !== 0 ? 'pink' : 'purple'}">
          <div class="stat-bg-icon"><span class="material-icons">account_balance_wallet</span></div>
          <div class="stat-label">ผลต่าง (เงินเข้า - เบิกออก)</div>
          <div class="stat-value" style="${this._billingReceived - totalAmount < 0 ? 'color: var(--danger)' : ''}">฿${UI.currency(this._billingReceived - totalAmount, 2)}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; position: relative; z-index: 1;">*เงินเข้าอาจน้อยกว่ายอดเบิก หากพนักงานขายของไม่หมด</div>
        </div>
      </div>

      <!-- Print Version Summary at the TOP -->
      <div class="print-only" style="margin-bottom: 24px; border: 1px solid #ddd; border-radius: 8px; padding: 16px; display: none;">
        <h3 style="margin-bottom: 12px; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 8px;">สรุปยอดเงินเข้า</h3>
        <div style="display: flex; justify-content: space-between;">
          <div>
            <div style="font-size: 12px; color: #666;">มูลค่าสินค้าเบิกออก</div>
            <div style="font-size: 18px; font-weight: bold;">฿${UI.currency(totalAmount, 2)}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #666;">ยอดเงินเข้าจริง</div>
            <div style="font-size: 18px; font-weight: bold;">฿${UI.currency(this._billingReceived, 2)}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #666;">ผลต่าง</div>
            <div style="font-size: 18px; font-weight: bold;">฿${UI.currency(this._billingReceived - totalAmount, 2)}</div>
          </div>
        </div>
      </div>

      <div class="card" style="padding: 0; overflow-x: auto;">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">ลำดับ</th>
              <th style="width: 60px;">รูปภาพ</th>
              <th>รหัส - ชื่อสินค้า</th>
              <th style="text-align: right;">รับเข้า</th>
              <th style="text-align: right;">เบิกออก</th>
              <th style="text-align: right;">ยอดคงเหลือ</th>
              <th style="text-align: center; width: 120px;" class="no-print">ยอดนับจริง</th>
              <th style="text-align: right;">มูลค่าเบิกออก<br><small class="text-muted">(บาท)</small></th>
              <th style="text-align: right;">ค่าคอมเบิกออก<br><small class="text-muted">(บาท)</small></th>
            </tr>
          </thead>
          <tbody>
    `;

    if (this._data.length === 0) {
      html += `<tr><td colspan="9" class="text-center text-muted" style="padding: 30px;">ไม่มีข้อมูลในช่วงเวลานี้</td></tr>`;
    } else {
      this._data.forEach((item, index) => {
        const received = Number(item.received) || 0;
        const withdrawn = Number(item.withdrawn) || 0;
        const balance = Number(item.balance) || 0;
        
        const price = Number(item.sellWholesale) || 0;
        const comm = Number(item.agentProfit) || 0;
        
        const amount = item.txnAmount !== undefined ? Number(item.txnAmount) : withdrawn * price;
        const commission = item.txnCommission !== undefined ? Number(item.txnCommission) : withdrawn * comm;

        const codeStr = item.code ? `<span style="color: var(--text-muted); font-size: 12px;">[${item.code}]</span> ` : '';
        const nameStr = item.name || 'ไม่ทราบชื่อสินค้า';
        const catStr = item.category ? `<div style="font-size: 12px; color: var(--primary); margin-top: 2px;"><span class="material-icons" style="font-size: 14px; vertical-align: middle;">label</span> ${item.category}</div>` : '';
        const imgHtml = item.image ? `<img src="${item.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : `<div style="width: 40px; height: 40px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center;"><span class="material-icons" style="color: #ccc; font-size: 20px;">image</span></div>`;

        html += `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>${imgHtml}</td>
            <td>
              <div style="font-weight: 500;">${codeStr}${nameStr}</div>
              ${catStr}
            </td>
            <td style="text-align: right; color: var(--primary); font-weight: 600;">${received > 0 ? UI.currency(received, 0) : '-'}</td>
            <td style="text-align: right; color: var(--danger); font-weight: 600;">${withdrawn > 0 ? UI.currency(withdrawn, 0) : '-'}</td>
            <td style="text-align: right; font-weight: 600; color: #555;" id="cr-balance-${item.id}">${UI.currency(balance, 0)}</td>
            <td style="text-align: center;" class="no-print">
              <div style="position: relative; width: 90px; margin: 0 auto;">
                <input type="number" class="form-control cr-actual-qty" data-pid="${item.id}" data-balance="${balance}" placeholder="-" style="width: 100%; text-align: center; height: 36px; font-weight: 600; font-size: 15px; border: 2px solid #e0e0e0; border-radius: 8px; background-color: #fafafa; color: var(--primary); transition: all 0.2s; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);" onfocus="this.style.borderColor='var(--primary)'; this.style.backgroundColor='#fff'; this.style.boxShadow='0 0 0 3px rgba(33, 150, 243, 0.15)';" onblur="this.style.borderColor='#e0e0e0'; this.style.backgroundColor='#fafafa'; this.style.boxShadow='inset 0 1px 2px rgba(0,0,0,0.05)';">
              </div>
            </td>
            <td style="text-align: right;">${amount > 0 ? UI.currency(amount, 2) : '-'}</td>
            <td style="text-align: right; color: var(--success);">${commission > 0 ? UI.currency(commission, 2) : '-'}</td>
          </tr>
        `;
      });

      // Total Row
      html += `
          </tbody>
          <tfoot>
            <tr style="background: var(--bg-color); font-weight: 600;">
              <td colspan="3" style="text-align: right;">รวมทั้งหมด:</td>
              <td style="text-align: right; color: var(--primary);">${UI.currency(totalReceived, 0)}</td>
              <td style="text-align: right; color: var(--danger);">${UI.currency(totalWithdrawn, 0)}</td>
              <td style="text-align: right;">${UI.currency(totalExpectedBalance, 0)}</td>
              <td style="text-align: center;" class="no-print">
                <button class="btn btn-primary btn-sm" onclick="CentralReport.saveAdjustments()" style="width: 100%;">บันทึกสต๊อก</button>
              </td>
              <td style="text-align: right;">฿${UI.currency(totalAmount, 2)}</td>
              <td style="text-align: right; color: var(--success);">฿${UI.currency(totalCommission, 2)}</td>
            </tr>
          </tfoot>
      `;
    }

    html += `
        </table>
      </div>
    `;

    document.getElementById('cr-content').innerHTML = html;
  },

  async saveAdjustments() {
    if (!this._centralWhId) {
      UI.toast('ไม่พบคลังกลางในระบบ', 'error');
      return;
    }

    const inputs = document.querySelectorAll('.cr-actual-qty');
    const adjustments = [];
    
    inputs.forEach(input => {
      const val = input.value;
      if (val === '') return; // Skip empty
      
      const newQty = Number(val);
      const balance = Number(input.dataset.balance);
      const pid = input.dataset.pid;
      
      const diff = newQty - balance;
      adjustments.push({ productId: pid, expected: balance, actual: newQty, diff });
    });

    if (adjustments.length === 0) {
      UI.toast('กรุณากรอกยอดนับจริงอย่างน้อย 1 รายการ', 'warning');
      return;
    }

    if (!confirm(`ยืนยันการบันทึกประวัตินับสต๊อกจำนวน ${adjustments.length} รายการ? (ไม่มีผลกระทบต่อสต๊อกระบบ)`)) return;

    try {
      UI.loading(true);
      await API.saveStockCheck({
        warehouseId: this._centralWhId,
        items: adjustments,
        note: 'บันทึกจากรายงานคลังกลาง'
      });
      UI.toast('บันทึกประวัตินับสต๊อกเรียบร้อยแล้ว!', 'success');
      // Clear inputs
      inputs.forEach(input => input.value = '');
    } catch (e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally {
      UI.loading(false);
    }
  }
};

PAGES['central-report'] = CentralReport;
