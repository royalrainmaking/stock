// ============================================================
// pages/finance.js – Branch Finance Summary Pivot Table
// ============================================================

PAGES['finance'] = {
  _financeData: [],
  _billingsData: [],
  _allFinanceData: null,
  _allBillingsData: null,
  _employees: [],
  _filterStartDate: '',
  _filterEndDate: '',
  _filterEmployee: '', // '' = All

  async render() {
    const el = document.getElementById('page-finance');
    
    // Set default filters to 1st of month - today
    if (!this._filterStartDate) {
      const now = new Date();
      this._filterStartDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      this._filterEndDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:#E3F2FD;color:#1565C0">
            <span class="material-icons">account_balance_wallet</span>
          </div>
          <div>
            <h2 class="page-title">ระบบบัญชีพนักงาน (Finance)</h2>
            <p class="page-subtitle">ดูภาพรวมการเงินและประวัติการชำระเงินของทั้งสาขา</p>
          </div>
        </div>
        <div class="page-actions" style="display:flex; gap:10px;">
          <button class="btn btn-primary" onclick="PAGES.finance.load(true)"><span class="material-icons">refresh</span> รีเฟรช</button>
        </div>
      </div>

      <div style="background:var(--bg-card); border-radius:12px; padding:20px; margin-bottom:20px; box-shadow:0 4px 6px rgba(0,0,0,0.05); display:flex; flex-wrap:wrap; gap:20px; align-items:flex-end; border:1px solid var(--border-light);">
        
        <div style="flex:1; min-width:200px;">
          <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:8px;">
            <span class="material-icons" style="font-size:16px; vertical-align:text-bottom;">person</span> เลือกพนักงาน
          </label>
          <select id="fin-emp" class="input" style="width:100%; border-radius:8px; border:1px solid var(--border-light); padding:10px; font-size:0.95rem; background:#f8fafc; transition:all 0.2s; cursor:pointer;" onchange="PAGES.finance.onFilterChange()">
            <option value="">ทั้งหมด (สาขา)</option>
            <!-- populated later -->
          </select>
        </div>

        <div style="flex:1; min-width:150px;">
          <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:8px;">
            <span class="material-icons" style="font-size:16px; vertical-align:text-bottom;">event</span> วันที่เริ่มต้น
          </label>
          <input type="date" id="fin-start" class="input" style="width:100%; border-radius:8px; border:1px solid var(--border-light); padding:10px; font-size:0.95rem; background:#fff; transition:all 0.2s; cursor:pointer;" value="${this._filterStartDate}" onchange="PAGES.finance.onFilterChange()" />
        </div>
        
        <div style="flex:1; min-width:150px;">
          <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:8px;">
            <span class="material-icons" style="font-size:16px; vertical-align:text-bottom;">event</span> วันที่สิ้นสุด
          </label>
          <input type="date" id="fin-end" class="input" style="width:100%; border-radius:8px; border:1px solid var(--border-light); padding:10px; font-size:0.95rem; background:#fff; transition:all 0.2s; cursor:pointer;" value="${this._filterEndDate}" onchange="PAGES.finance.onFilterChange()" />
        </div>

      </div>

      <div class="card" style="margin-bottom:20px; overflow:hidden;">
        <div class="card-title" style="padding:15px 20px; background:#f8fafc; border-bottom:1px solid var(--border-light); display:flex; align-items:center; gap:10px;">
          <span class="material-icons" style="color:var(--primary);">pivot_table_chart</span> 
          <span style="font-weight:bold; font-size:1.1rem; color:var(--text-main);">สรุปยอดเงิน</span>
        </div>
        <div id="finance-table-wrap" style="padding:0;">
           ${UI.emptyState('hourglass_empty', 'กำลังเตรียมข้อมูล...')}
        </div>
      </div>
    `;

    await this.loadEmployees();
    await this.load();
  },

  async loadEmployees() {
    try {
      await MASTER_DATA.load();
      const empWhs = MASTER_DATA.warehouses.filter(w => w.type === 'employee');
      this._employees = empWhs.map(w => {
        return {
          id: w.employeeId || w.id, // ID used in finance records
          displayName: w.name,
          warehouseId: String(w.id)
        };
      });
      
      const empSelect = document.getElementById('fin-emp');
      if (empSelect) {
         let optionsHtml = '<option value="">ทั้งหมด (สาขา)</option>';
         this._employees.forEach(e => {
            optionsHtml += `<option value="${e.id}" ${this._filterEmployee === e.id ? 'selected' : ''}>${e.displayName}</option>`;
         });
         empSelect.innerHTML = optionsHtml;
      }

    } catch(e) {
      console.error('Failed to load employees', e);
    }
  },

  onFilterChange() {
    this._filterEmployee = document.getElementById('fin-emp').value;
    this._filterStartDate = document.getElementById('fin-start').value;
    this._filterEndDate = document.getElementById('fin-end').value;
    
    if (this._allFinanceData) {
      this.applyFilters();
    } else {
      this.load();
    }
  },

  parseDate(val) {
    if (!val) return '9999-12-31';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '9999-12-31';
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    } catch (e) {
      return '9999-12-31';
    }
  },

  async load(force = false) {
    if (!this._filterStartDate || !this._filterEndDate) {
      document.getElementById('finance-table-wrap').innerHTML = UI.emptyState('calendar_today', `กรุณาเลือกช่วงเวลาให้ครบถ้วน`);
      return;
    }

    if (force || !this._allFinanceData) {
      try {
        document.getElementById('finance-table-wrap').innerHTML = UI.emptyState('hourglass_empty', 'กำลังโหลดข้อมูลทั้งหมด (ครั้งแรก)...');
        
        // Fetch branch-wide data with empty parameters to get ALL data once
        const res = await API.getEmployeeFinance('', '', '');
        this._allFinanceData = res.finance || [];
        this._allBillingsData = res.billings || [];
      } catch(e) {
        document.getElementById('finance-table-wrap').innerHTML = UI.emptyState('error', 'โหลดข้อมูลไม่สำเร็จ', e.message);
        UI.toast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error');
        return;
      }
    }
    
    this.applyFilters();
  },

  applyFilters() {
    const start = this._filterStartDate;
    const end = this._filterEndDate;
    const empFilter = this._filterEmployee;

    // Filter Finance Data
    this._financeData = this._allFinanceData.filter(f => {
       if (empFilter && String(f.employeeId) !== String(empFilter)) return false;
       const d = this.parseDate(f.date);
       return d >= start && d <= end;
    });

    // Resolve warehouseId for billings if employee is filtered
    let whFilterId = '';
    if (empFilter) {
       const emp = this._employees.find(e => String(e.id) === String(empFilter));
       if (emp) whFilterId = String(emp.warehouseId);
    }

    // Filter Billings Data
    this._billingsData = this._allBillingsData.filter(b => {
       if (whFilterId && String(b.warehouseId) !== String(whFilterId)) return false;
       const d = this.parseDate(b.date);
       return d >= start && d <= end;
    });

    this.renderPivotTable();
  },

  renderPivotTable() {
    const el = document.getElementById('finance-table-wrap');
    if (!this._financeData.length && !this._billingsData.length) {
      el.innerHTML = UI.emptyState('receipt_long', `ไม่มีรายการบัญชีในช่วงเวลาที่เลือก`);
      return;
    }

    // Prepare Categories (Columns)
    const predefinedCategories = [
      'ค่าสินค้า',
      'เงินประกัน',
      'ชำระหนี้',
      'ฝากเงิน',
      'ค่าเช่าซื้อรถ/พ่วง',
      'ค่าเช่ารถ',
      'ค่าหลอด',
      'ค่าถุง',
      'อื่นๆ'
    ];

    // Find all dynamic categories that might exist but are not in predefined list
    const dynamicCategories = new Set();
    this._financeData.forEach(item => {
      const cat = item.category || 'อื่นๆ';
      if (!predefinedCategories.includes(cat)) {
        dynamicCategories.add(cat);
      }
    });
    
    const categories = [...predefinedCategories, ...Array.from(dynamicCategories)];

    // Determine which employees to show
    let activeEmployees = this._employees;
    if (this._filterEmployee) {
       activeEmployees = this._employees.filter(e => e.id === this._filterEmployee);
    }

    // Data Structures
    // employeeData[empId][category] = amount
    const employeeData = {};
    const employeeTotals = {};
    const cashTotals = {};
    const transferTotals = {};
    
    // Column Totals
    const categoryTotals = {};
    categories.forEach(c => categoryTotals[c] = 0);
    let grandTotal = 0;
    let grandCash = 0;
    let grandTransfer = 0;

    activeEmployees.forEach(e => {
       employeeData[e.id] = {};
       categories.forEach(c => employeeData[e.id][c] = 0);
       employeeTotals[e.id] = 0;
       cashTotals[e.id] = 0;
       transferTotals[e.id] = 0;
    });

    // Fill Finance Data
    this._financeData.forEach(item => {
       const empId = String(item.employeeId);
       const cat = item.category || 'อื่นๆ';
       const amt = Number(item.amount) || 0;
       
       if (employeeData[empId]) {
           employeeData[empId][cat] += amt;
           employeeTotals[empId] += amt;
           categoryTotals[cat] += amt;
           grandTotal += amt;
       } else {
           // Fallback for ghost employees
           employeeData[empId] = {};
           categories.forEach(c => employeeData[empId][c] = 0);
           employeeTotals[empId] = 0;
           cashTotals[empId] = 0;
           transferTotals[empId] = 0;
           
           activeEmployees.push({ id: empId, displayName: `ID: ${empId}`, warehouseId: '' });
           employeeData[empId][cat] += amt;
           employeeTotals[empId] += amt;
           categoryTotals[cat] += amt;
           grandTotal += amt;
       }
    });

    // Fill Billings Data (Cash / Transfer)
    this._billingsData.forEach(b => {
       const emp = activeEmployees.find(e => e.warehouseId === String(b.warehouseId) || e.id === String(b.warehouseId));
       if (emp) {
          const cash = Number(b.cashPaid) || 0;
          const transfer = Number(b.transferPaid) || 0;
          cashTotals[emp.id] += cash;
          transferTotals[emp.id] += transfer;
          grandCash += cash;
          grandTransfer += transfer;
       }
    });

    // Filter categories that have > 0 total across the board to save space (except predefined ones)
    const activeCategories = categories.filter(c => predefinedCategories.includes(c) || categoryTotals[c] > 0);

    // Generate HTML
    // THEAD
    let theadHtml = `<tr>
      <th style="min-width:140px; width:140px; position:sticky; left:0; z-index:4; background:#f8fafc; border-bottom: 1px solid var(--border-light); border-right: 1px solid var(--border-light); box-shadow: 1px 0 0 var(--border-light); padding:12px 10px; font-size:0.85rem; white-space:nowrap;">พนักงาน</th>`;
    activeCategories.forEach(c => {
      let isBold = c === 'ค่าสินค้า';
      let color = c === 'ค่าสินค้า' ? 'var(--success)' : 'var(--text-main)';
      theadHtml += `<th style="text-align:right; min-width:120px; width:120px; padding:12px 10px; font-size:0.85rem; font-weight:${isBold?'bold':'600'}; color:${color}; border-bottom: 1px solid var(--border-light); border-right: 1px solid var(--border-light); white-space:nowrap;">${c}</th>`;
    });
    theadHtml += `<th style="text-align:right; min-width:120px; width:120px; background:#e0f2fe; color:var(--primary); position:sticky; right:0; z-index:3; padding:12px 10px; font-size:0.85rem; border-bottom: 1px solid var(--border-light); border-right: 1px solid var(--border-light); box-shadow: -1px 0 0 var(--border-light); white-space:nowrap;">รวมยอดสุทธิ</th>`;
    theadHtml += `<th style="text-align:right; min-width:120px; width:120px; background:#dcfce7; color:var(--success); position:sticky; z-index:3; padding:12px 10px; font-size:0.85rem; border-bottom: 1px solid var(--border-light); border-right: 1px solid var(--border-light); white-space:nowrap;">เงินสด</th>`;
    theadHtml += `<th style="text-align:right; min-width:120px; width:120px; background:#e0e7ff; color:#4338ca; position:sticky; z-index:3; padding:12px 10px; font-size:0.85rem; border-bottom: 1px solid var(--border-light); white-space:nowrap;">เงินโอน</th>`;
    theadHtml += `</tr>`;

    // TBODY
    let tbodyHtml = '';
    activeEmployees.forEach(e => {
       let rowHtml = `<tr>
         <td style="font-weight:600; color:var(--text-main); position:sticky; left:0; background:#fff; z-index:1; border-bottom: 1px solid var(--border-light); border-right: 1px solid var(--border-light); box-shadow: 1px 0 0 var(--border-light); padding:10px; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${e.displayName}
         </td>`;
       
       activeCategories.forEach(c => {
          const val = employeeData[e.id][c] || 0;
          let isGoods = c === 'ค่าสินค้า';
          let color = isGoods ? 'var(--success)' : 'var(--text-main)';
          rowHtml += `<td style="text-align:right; color:${val > 0 ? color : 'var(--text-muted)'}; padding:10px; font-size:0.85rem; border-bottom: 1px solid var(--border-light); border-right: 1px solid var(--border-light);">${val > 0 ? '฿' + UI.currency(val) : '-'}</td>`;
       });
       
       // Totals
       const rowTotal = employeeTotals[e.id] || 0;
       rowHtml += `<td style="text-align:right; font-weight:bold; color:var(--primary); background:#f0f9ff; position:sticky; right:0; z-index:2; padding:10px; font-size:0.85rem; border-bottom: 1px solid var(--border-light); border-right: 1px solid var(--border-light); box-shadow: -1px 0 0 var(--border-light);">฿${UI.currency(rowTotal)}</td>`;
       
       // Cash & Transfer
       const cash = cashTotals[e.id] || 0;
       const transfer = transferTotals[e.id] || 0;
       rowHtml += `<td style="text-align:right; font-weight:bold; color:var(--success); padding:10px; font-size:0.85rem; border-bottom: 1px solid var(--border-light); border-right: 1px solid var(--border-light);">${cash > 0 ? '฿' + UI.currency(cash) : '-'}</td>`;
       rowHtml += `<td style="text-align:right; font-weight:bold; color:#4338ca; padding:10px; font-size:0.85rem; border-bottom: 1px solid var(--border-light);">${transfer > 0 ? '฿' + UI.currency(transfer) : '-'}</td>`;
       
       rowHtml += `</tr>`;
       tbodyHtml += rowHtml;
    });

    // TFOOT (Grand Totals)
    let tfootHtml = `<tr style="background:var(--bg-card2);">
       <td style="font-weight:bold; color:var(--text-main); position:sticky; left:0; background:var(--bg-card2); z-index:3; border-right: 1px solid var(--border-light); box-shadow: 1px 0 0 var(--border-light); padding:12px 10px; font-size:0.9rem;">ยอดรวมทั้งสาขา</td>`;
    
    activeCategories.forEach(c => {
       const val = categoryTotals[c] || 0;
       let isGoods = c === 'ค่าสินค้า';
       let color = isGoods ? 'var(--success)' : 'var(--text-main)';
       tfootHtml += `<td style="text-align:right; font-weight:bold; color:${color}; padding:12px 10px; font-size:0.9rem; border-right: 1px solid var(--border-light); border-top: 1px solid var(--border-light);">฿${UI.currency(val)}</td>`;
    });
    
    tfootHtml += `<td style="text-align:right; font-weight:bold; color:var(--primary); background:#e0f2fe; position:sticky; right:0; z-index:3; padding:12px 10px; font-size:0.9rem; border-right: 1px solid var(--border-light); border-top: 1px solid var(--border-light); box-shadow: -1px 0 0 var(--border-light);">฿${UI.currency(grandTotal)}</td>`;
    tfootHtml += `<td style="text-align:right; font-weight:bold; color:var(--success); background:#dcfce7; padding:12px 10px; font-size:0.9rem; border-right: 1px solid var(--border-light); border-top: 1px solid var(--border-light);">฿${UI.currency(grandCash)}</td>`;
    tfootHtml += `<td style="text-align:right; font-weight:bold; color:#4338ca; background:#e0e7ff; padding:12px 10px; font-size:0.9rem; border-top: 1px solid var(--border-light);">฿${UI.currency(grandTransfer)}</td>`;
    tfootHtml += `</tr>`;

    el.innerHTML = `
      <div class="table-wrap" style="max-height:70vh; overflow-y:auto; overflow-x:auto; border:1px solid var(--border-light); border-radius:8px;">
        <table style="width:100%; border-collapse:separate; border-spacing:0; margin:0; table-layout:fixed;">
          <thead>
            ${theadHtml}
          </thead>
          <tbody>
            ${tbodyHtml}
          </tbody>
          <tfoot style="position:sticky; bottom:0; z-index:4; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);">
            ${tfootHtml}
          </tfoot>
        </table>
      </div>
    `;
  }
};
