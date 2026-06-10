// ============================================================
// pages/finance.js – Employee Finance Summary
// ============================================================

PAGES['finance'] = {
  _data: [],
  _employees: [],
  _selectedEmp: '',
  _viewMode: 'daily', // 'daily' | 'monthly'
  _filterDate: '',
  _filterMonth: '',

  async render() {
    const el = document.getElementById('page-finance');
    
    // Set default filters to today/this month
    if (!this._filterDate) {
      const now = new Date();
      this._filterDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      this._filterMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:#E3F2FD;color:#1565C0">
            <span class="material-icons">account_balance_wallet</span>
          </div>
          <div>
            <h2 class="page-title">ระบบบัญชีพนักงาน (Finance)</h2>
            <p class="page-subtitle">ดูสุขภาพการเงินและประวัติการชำระเงินของพนักงาน</p>
          </div>
        </div>
        <div class="page-actions" style="display:flex; gap:10px;">
          <button class="btn btn-primary" onclick="PAGES.finance.load()"><span class="material-icons">refresh</span> รีเฟรช</button>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-weight:bold; margin-bottom:10px; color:var(--text-main);">เลือกพนักงาน:</div>
        <div id="finance-emp-avatars" style="display:flex; gap:15px; overflow-x:auto; padding-bottom:10px;">
           ${UI.emptyState('hourglass_empty', 'กำลังโหลดรายชื่อพนักงาน...')}
        </div>
      </div>

      <div id="finance-prompt-state">
         ${UI.emptyState('person_search', 'กรุณาเลือกพนักงาน', 'โปรดเลือกพนักงานจากตัวเลือกด้านบนเพื่อดูข้อมูลบัญชีการเงิน')}
      </div>

      <div id="finance-content-wrap" style="display:none;">
        <div style="margin-bottom:10px; font-weight:bold; color:var(--text-main); font-size:1.1rem;">
          <span class="material-icons" style="vertical-align:middle; font-size:1.2rem; margin-right:5px; color:var(--primary)">insights</span> 
          ภาพรวมสุขภาพการเงิน (สะสมทั้งหมดตั้งแต่เริ่มงาน)
        </div>
        <div id="finance-summary-cards" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:15px; margin-bottom:30px;">
          <!-- Loading... -->
        </div>

        <div class="card" id="finance-table-card">
          <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <span><span class="material-icons">list_alt</span> รายละเอียดการรับชำระ</span>
            <div style="display:flex; gap:10px; align-items:center;">
              <select id="fin-view-mode" class="input" style="max-width:150px;" onchange="PAGES.finance.onViewModeChange()">
                <option value="daily" ${this._viewMode === 'daily' ? 'selected' : ''}>ดูแบบรายวัน</option>
                <option value="monthly" ${this._viewMode === 'monthly' ? 'selected' : ''}>ดูแบบรายเดือน</option>
              </select>
              
              <div id="fin-date-wrap" style="display:${this._viewMode === 'daily' ? 'block' : 'none'}">
                <input type="date" id="fin-date" class="input" style="max-width:180px;" value="${this._filterDate}" onchange="PAGES.finance.onFilterChange()" />
              </div>
              
              <div id="fin-month-wrap" style="display:${this._viewMode === 'monthly' ? 'block' : 'none'}">
                <input type="month" id="fin-month" class="input" style="max-width:180px;" value="${this._filterMonth}" onchange="PAGES.finance.onFilterChange()" />
              </div>
            </div>
          </div>
          <div id="finance-table-wrap">
             ${UI.emptyState('hourglass_empty', 'กำลังเตรียมข้อมูล...')}
          </div>
        </div>
      </div>
    `;

    await this.loadEmployees();
    await this.load();
  },

  async loadEmployees() {
    try {
      const res = await API.getUsers();
      this._employees = (res.users || []).filter(u => u.role === 'employee');
      this.renderAvatars();
    } catch(e) {
      console.error(e);
      document.getElementById('finance-emp-avatars').innerHTML = `<div style="color:var(--danger)">ไม่สามารถโหลดรายชื่อพนักงานได้</div>`;
    }
  },

  renderAvatars() {
    const el = document.getElementById('finance-emp-avatars');
    if (!el) return;
    
    if (this._employees.length === 0) {
      el.innerHTML = `<div style="color:var(--text-muted)">ไม่มีพนักงานในระบบ</div>`;
      return;
    }

    el.innerHTML = this._employees.map(u => {
      const isSelected = this._selectedEmp === u.id;
      const bg = isSelected ? 'var(--primary)' : 'var(--bg-card2)';
      const color = isSelected ? '#fff' : 'var(--text-main)';
      const border = isSelected ? '2px solid var(--primary-dark)' : '2px solid transparent';
      const name = u.displayName || u.username;
      const initial = name.charAt(0).toUpperCase();

      return `
        <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer; min-width:80px; transition:transform 0.2s;" 
             onclick="PAGES.finance.selectEmployee('${u.id}')"
             onmouseover="this.style.transform='scale(1.05)'"
             onmouseout="this.style.transform='scale(1)'">
          <div style="width:60px; height:60px; border-radius:50%; background:${bg}; color:${color}; border:${border}; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:bold; margin-bottom:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
            ${u.avatar ? `<img src="${u.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />` : initial}
          </div>
          <div style="font-size:0.85rem; text-align:center; font-weight:${isSelected ? 'bold' : 'normal'}; color:${isSelected ? 'var(--primary)' : 'var(--text-muted)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;">
            ${name}
          </div>
        </div>
      `;
    }).join('');
  },

  selectEmployee(empId) {
    this._selectedEmp = empId;
    this.renderAvatars(); // Re-render to update selected state
    this.load();
  },

  onViewModeChange() {
    this._viewMode = document.getElementById('fin-view-mode').value;
    document.getElementById('fin-date-wrap').style.display = this._viewMode === 'daily' ? 'block' : 'none';
    document.getElementById('fin-month-wrap').style.display = this._viewMode === 'monthly' ? 'block' : 'none';
    this.renderTable();
  },

  onFilterChange() {
    if (this._viewMode === 'daily') {
      this._filterDate = document.getElementById('fin-date').value;
    } else {
      this._filterMonth = document.getElementById('fin-month').value;
    }
    this.renderTable();
  },

  async load() {
    if (!this._selectedEmp) {
      document.getElementById('finance-content-wrap').style.display = 'none';
      document.getElementById('finance-prompt-state').style.display = 'block';
      return;
    }
    
    document.getElementById('finance-content-wrap').style.display = 'block';
    document.getElementById('finance-prompt-state').style.display = 'none';

    try {
      UI.loading(true);
      // Pass empty string for month to get ALL TIME data for the employee
      const res = await API.getEmployeeFinance(this._selectedEmp, '');
      this._data = res.finance || [];
      
      this.renderSummary();
      this.renderTable();
    } catch(e) {
      UI.toast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      UI.loading(false);
    }
  },

  renderSummary() {
    // Default expected categories to 0
    const categories = {
      'เงินประกัน': 0,
      'ชำระหนี้': 0,
      'ฝากเงิน': 0,
      'ค่าเช่าซื้อรถ/พ่วง': 0,
      'ค่าเช่ารถ': 0,
      'ค่าหลอด': 0,
      'ค่าถุง': 0,
      'อื่นๆ': 0
    };
    
    let totalGoods = 0;
    let totalFees = 0;
    
    this._data.forEach(item => {
      const amt = Number(item.amount) || 0;
      if (item.category === 'ค่าสินค้า') {
        totalGoods += amt;
      } else {
        if (categories[item.category] === undefined) categories[item.category] = 0;
        categories[item.category] += amt;
        totalFees += amt;
      }
    });

    const cardsHtml = `
      <div class="card" style="background:var(--success-light); border:1px solid var(--success);">
        <div style="font-size:0.8rem; color:var(--success);">ยอดรวมค่าสินค้า (สะสม)</div>
        <div style="font-size:1.8rem; font-weight:bold; color:var(--success);">฿${UI.currency(totalGoods)}</div>
      </div>
      <div class="card" style="background:var(--warning-light); border:1px solid var(--warning);">
        <div style="font-size:0.8rem; color:var(--warning);">ยอดรวมค่าธรรมเนียม/อื่นๆ (สะสม)</div>
        <div style="font-size:1.8rem; font-weight:bold; color:var(--warning);">฿${UI.currency(totalFees)}</div>
      </div>
      <div class="card" style="background:var(--primary-light); border:1px solid var(--primary);">
        <div style="font-size:0.8rem; color:var(--primary);">ยอดรับรวมทั้งสิ้น (สะสม)</div>
        <div style="font-size:1.8rem; font-weight:bold; color:var(--primary);">฿${UI.currency(totalGoods + totalFees)}</div>
      </div>
    `;

    const extraCards = Object.keys(categories)
      .filter(c => c !== 'ค่าสินค้า')
      .map(c => `
        <div class="card" style="padding:15px;">
          <div style="font-size:0.8rem; color:var(--text-muted);">${c}</div>
          <div style="font-size:1.4rem; font-weight:bold; color:var(--text-main);">฿${UI.currency(categories[c])}</div>
        </div>
      `).join('');

    const el = document.getElementById('finance-summary-cards');
    if (el) el.innerHTML = cardsHtml + extraCards;
  },

  renderTable() {
    const el = document.getElementById('finance-table-wrap');
    
    const filterValue = this._viewMode === 'daily' ? this._filterDate : this._filterMonth;

    if (!filterValue) {
      el.innerHTML = UI.emptyState('calendar_today', `กรุณาเลือก${this._viewMode === 'daily' ? 'วันที่' : 'เดือน'}เพื่อดูรายละเอียด`);
      return;
    }

    // Filter by the selected date or month
    const filteredData = this._data.filter(item => {
      // item.date is usually YYYY-MM-DD
      return (item.date || '').startsWith(filterValue);
    });

    if (!filteredData.length) {
      el.innerHTML = UI.emptyState('receipt_long', `ไม่มีรายการบัญชีใน${this._viewMode === 'daily' ? 'วันที่' : 'เดือน'}ที่เลือก`);
      return;
    }

    // Sort by createdAt DESC
    const sorted = [...filteredData].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    let html = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${this._viewMode === 'daily' ? 'เวลา' : 'วันที่'}</th>
              <th>พนักงาน</th>
              <th>รหัสบิลอ้างอิง</th>
              <th>หมวดหมู่</th>
              <th class="td-right">จำนวนเงิน</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
    `;

    let totalInTable = 0;

    sorted.forEach(item => {
      totalInTable += Number(item.amount) || 0;
      const emp = this._employees.find(e => e.id === item.employeeId);
      const empName = emp ? (emp.displayName || emp.username) : item.employeeId;
      
      let catColor = 'var(--text-main)';
      if (item.category === 'ค่าสินค้า') catColor = 'var(--success)';
      else if (item.amount > 0) catColor = 'var(--warning)';

      const timeStr = new Date(item.createdAt).toLocaleTimeString();
      const dateStr = UI.dateStr(item.date);
      const displayDate = this._viewMode === 'daily' 
        ? `<span style="font-size:0.85rem; color:var(--text-muted)">${timeStr}</span>`
        : `${dateStr}<br><span style="font-size:0.75rem; color:var(--text-muted)">${timeStr}</span>`;

      html += `
        <tr>
          <td>${displayDate}</td>
          <td class="fw-bold text-primary">${empName}</td>
          <td><span style="font-family:monospace; background:var(--bg-card2); padding:2px 6px; border-radius:4px;">${item.billingId || '-'}</span></td>
          <td><span style="font-weight:bold; color:${catColor}">${item.category}</span></td>
          <td class="td-right fw-bold">฿${UI.currency(item.amount)}</td>
          <td><span style="font-size:0.85rem; color:var(--text-muted);">${item.note || '-'}</span></td>
        </tr>
      `;
    });

    html += `
          </tbody>
          <tfoot>
            <tr style="background:var(--bg-card2); font-weight:bold;">
              <td colspan="4" class="td-right">รวมยอดในตารางนี้:</td>
              <td class="td-right" style="color:var(--primary)">฿${UI.currency(totalInTable)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    el.innerHTML = html;
  }
};
