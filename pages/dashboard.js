// ============================================================
// pages/dashboard.js – Premium Interactive Admin Dashboard
// ============================================================

PAGES['dashboard'] = {
  _period: 'week', // 'day', 'week', 'month', 'year', 'custom'
  _filterStartDate: '',
  _filterEndDate: '',
  _selectedEmployeeId: '', // '' = All
  
  _products: [],
  _users: [],
  _warehouses: [],
  _centralStock: [],
  _employeeStock: [],
  
  _rawFinance: [],
  _rawBillings: [],
  
  _filteredFinance: [],
  _filteredBillings: [],
  
  _activeHealthTab: 'central', // 'central' or 'employee'
  _selectedHealthStatus: 'lowStock', // 'safe', 'lowStock', 'outOfStock', 'expired', 'expiring'

  async render() {
    const el = document.getElementById('page-dashboard');
    
    // Set default dates if empty
    if (!this._filterStartDate) {
      this.setDefaultDates();
    }

    el.innerHTML = `
      <div class="page-header no-print">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:#E8F0FE;color:var(--primary)">
            <span class="material-icons">dashboard</span>
          </div>
          <div>
            <h2 class="page-title">แดชบอร์ดอัจฉริยะ</h2>
            <p class="page-subtitle">วิเคราะห์ข้อมูล ยอดขาย สุขภาพคลัง และการพยากรณ์สั่งของ</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="window.print()">
            <span class="material-icons">print</span> พิมพ์รายงาน
          </button>
          <button class="btn btn-primary" onclick="PAGES.dashboard.load(true)">
            <span class="material-icons">refresh</span> รีเฟรชข้อมูล
          </button>
        </div>
      </div>

      <!-- Filters Panel -->
      <div class="db-filter-bar no-print">
        <div class="db-filter-item">
          <label><span class="material-icons" style="font-size:16px;">date_range</span> ช่วงเวลา</label>
          <div class="db-quick-ranges">
            <button class="db-quick-btn ${this._period==='day'?'active':''}" onclick="PAGES.dashboard.setPeriod('day')">วันนี้</button>
            <button class="db-quick-btn ${this._period==='week'?'active':''}" onclick="PAGES.dashboard.setPeriod('week')">7 วันล่าสุด</button>
            <button class="db-quick-btn ${this._period==='month'?'active':''}" onclick="PAGES.dashboard.setPeriod('month')">เดือนนี้</button>
            <button class="db-quick-btn ${this._period==='year'?'active':''}" onclick="PAGES.dashboard.setPeriod('year')">ปีนี้</button>
            <button class="db-quick-btn ${this._period==='custom'?'active':''}" onclick="PAGES.dashboard.setPeriod('custom')">กำหนดเอง</button>
          </div>
        </div>
        
        <div class="db-filter-item" style="max-width:200px;">
          <label>วันที่เริ่มต้น</label>
          <input type="date" id="db-start-date" class="db-filter-input" value="${this._filterStartDate}" ${this._period!=='custom'?'disabled':''} onchange="PAGES.dashboard.onDateChange()" />
        </div>
        
        <div class="db-filter-item" style="max-width:200px;">
          <label>วันที่สิ้นสุด</label>
          <input type="date" id="db-end-date" class="db-filter-input" value="${this._filterEndDate}" ${this._period!=='custom'?'disabled':''} onchange="PAGES.dashboard.onDateChange()" />
        </div>

        <div class="db-filter-item">
          <label><span class="material-icons" style="font-size:16px;">person</span> กรองรายคน (พนักงาน)</label>
          <select id="db-employee-select" class="db-filter-input" onchange="PAGES.dashboard.onEmployeeChange()">
            <option value="">ทั้งหมด (ทุกสาขา/พนักงาน)</option>
          </select>
        </div>
      </div>

      <!-- Dashboard Content Body -->
      <div id="dashboard-body-content">${UI.spinner()}</div>
    `;

    await this.load();
  },

  setDefaultDates() {
    const now = new Date();
    const todayStr = this.formatDateISO(now);
    
    if (this._period === 'day') {
      this._filterStartDate = todayStr;
      this._filterEndDate = todayStr;
    } else if (this._period === 'week') {
      const past = new Date();
      past.setDate(now.getDate() - 6);
      this._filterStartDate = this.formatDateISO(past);
      this._filterEndDate = todayStr;
    } else if (this._period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      this._filterStartDate = this.formatDateISO(startOfMonth);
      this._filterEndDate = todayStr;
    } else if (this._period === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      this._filterStartDate = this.formatDateISO(startOfYear);
      this._filterEndDate = todayStr;
    }
  },

  async setPeriod(period) {
    this._period = period;
    this.setDefaultDates();
    
    const startInput = document.getElementById('db-start-date');
    const endInput = document.getElementById('db-end-date');
    if (startInput && endInput) {
      startInput.value = this._filterStartDate;
      endInput.value = this._filterEndDate;
      startInput.disabled = (period !== 'custom');
      endInput.disabled = (period !== 'custom');
    }
    
    // Highlight active range button
    document.querySelectorAll('.db-quick-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    await this.load(true);
  },

  async onDateChange() {
    this._filterStartDate = document.getElementById('db-start-date').value;
    this._filterEndDate = document.getElementById('db-end-date').value;
    await this.load(true);
  },

  onEmployeeChange() {
    this._selectedEmployeeId = document.getElementById('db-employee-select').value;
    this.applyFiltersAndRender();
  },

  formatDateISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  },

  async load(forceReload = false) {
    try {
      if (forceReload || !this._products.length) {
        document.getElementById('dashboard-body-content').innerHTML = UI.spinner();
        
        // Fetch base Master Data
        await MASTER_DATA.load();
        this._products = MASTER_DATA.products || [];
        this._users = MASTER_DATA.users || [];
        this._warehouses = MASTER_DATA.warehouses || [];
        
        // Populate Employee dropdown
        const empSelect = document.getElementById('db-employee-select');
        if (empSelect) {
          const employees = this._users.filter(u => u.isEmployee || u.role === 'stock');
          let optionsHtml = '<option value="">ทั้งหมด (ทุกสาขา/พนักงาน)</option>';
          employees.forEach(emp => {
            optionsHtml += `<option value="${emp.id}" ${this._selectedEmployeeId === emp.id ? 'selected' : ''}>${emp.displayName || emp.username}</option>`;
          });
          empSelect.innerHTML = optionsHtml;
        }
        
        // Load Stock Data
        const [centralRes, empStockRes, financeRes] = await Promise.all([
          API.getCentralStock(''),
          API.getAllEmployeeStocks(''),
          API.getEmployeeFinance('', this._filterStartDate, this._filterEndDate)
        ]);

        this._centralStock = centralRes.stock || [];
        this._employeeStock = empStockRes.warehouses || [];
        this._rawFinance = financeRes.finance || [];
        this._rawBillings = financeRes.billings || [];
      }
      
      this.applyFiltersAndRender();
      
    } catch (e) {
      console.error(e);
      document.getElementById('dashboard-body-content').innerHTML = `
        <div class="alert alert-danger" style="margin-top:20px;">
          <span class="material-icons">warning</span>
          <span>โหลดข้อมูลแดชบอร์ดไม่สำเร็จ: ${e.message}</span>
        </div>
      `;
    }
  },

  applyFiltersAndRender() {
    const empId = this._selectedEmployeeId;
    
    // Filter Billings
    if (empId) {
      const empWhs = this._warehouses.filter(w => String(w.employeeId) === String(empId)).map(w => String(w.id));
      this._filteredBillings = this._rawBillings.filter(b => empWhs.includes(String(b.warehouseId)) || String(b.employeeId) === String(empId));
      this._filteredFinance = this._rawFinance.filter(f => String(f.employeeId) === String(empId));
    } else {
      this._filteredBillings = [...this._rawBillings];
      this._filteredFinance = [...this._rawFinance];
    }
    
    this.renderMetricsAndCharts();
  },

  renderMetricsAndCharts() {
    // 1. Calculations
    const totalSales = this._filteredBillings.reduce((sum, b) => sum + (Number(b.totalAmt) || 0), 0);
    const totalUnits = this._filteredBillings.reduce((sum, b) => sum + (Number(b.totalUnits) || 0), 0);
    const totalCash = this._filteredBillings.reduce((sum, b) => sum + (Number(b.cashPaid) || 0), 0);
    const totalTransfer = this._filteredBillings.reduce((sum, b) => sum + (Number(b.transferPaid) || 0), 0);
    
    // Deductions split
    let strawCost = 0;
    let bagCost = 0;
    let savings = 0;
    let vehicleLease = 0;
    let otherExpenses = 0;
    
    this._filteredFinance.forEach(f => {
      const amt = Number(f.amount) || 0;
      const cat = f.category || '';
      if (cat === 'ค่าหลอด') strawCost += amt;
      else if (cat === 'ค่าถุง') bagCost += amt;
      else if (cat === 'ฝากเงิน' || cat === 'เงินประกัน') savings += amt;
      else if (cat.includes('เช่า')) vehicleLease += amt;
      else otherExpenses += amt;
    });
    
    const totalDeductions = strawCost + bagCost + savings + vehicleLease + otherExpenses;
    const netEarning = totalSales - totalDeductions;

    // Render HTML structure
    const bodyEl = document.getElementById('dashboard-body-content');
    bodyEl.innerHTML = `
      <!-- Stats Summary -->
      <div class="db-grid">
        <div class="db-card blue">
          <div class="db-card-icon"><span class="material-icons">payments</span></div>
          <div class="db-card-title">ยอดขายรวม</div>
          <div class="db-card-value">฿${UI.currency(totalSales, 2)}</div>
          <div class="db-card-sub">
            <span class="material-icons" style="font-size:14px;">arrow_forward</span>
            <span>คิดเงินแล้ว ${this._filteredBillings.length} บิล</span>
          </div>
        </div>

        <div class="db-card green">
          <div class="db-card-icon"><span class="material-icons">shopping_bag</span></div>
          <div class="db-card-title">ปริมาณขายสะสม</div>
          <div class="db-card-value">${UI.currency(totalUnits, 0)} <span style="font-size:1rem; font-weight:normal;">หน่วย</span></div>
          <div class="db-card-sub">
            <span class="material-icons" style="font-size:14px;">trending_up</span>
            <span>เฉลี่ย ${totalUnits ? Math.round(totalSales/totalUnits) : 0} ฿ / หน่วย</span>
          </div>
        </div>

        <div class="db-card orange">
          <div class="db-card-icon"><span class="material-icons">account_balance_wallet</span></div>
          <div class="db-card-title">เงินโอนผ่านบัญชี</div>
          <div class="db-card-value">฿${UI.currency(totalTransfer, 2)}</div>
          <div class="db-card-sub">
            <span class="material-icons" style="font-size:14px;">savings</span>
            <span>คิดเป็น ${totalSales ? Math.round((totalTransfer/totalSales)*100) : 0}% ของยอดขาย</span>
          </div>
        </div>

        <div class="db-card purple">
          <div class="db-card-icon"><span class="material-icons">monetization_on</span></div>
          <div class="db-card-title">เงินสดหน้าร้าน</div>
          <div class="db-card-value">฿${UI.currency(totalCash, 2)}</div>
          <div class="db-card-sub">
            <span class="material-icons" style="font-size:14px;">price_check</span>
            <span>คิดเป็น ${totalSales ? Math.round((totalCash/totalSales)*100) : 0}% ของยอดขาย</span>
          </div>
        </div>
      </div>

      <!-- Charts grid -->
      <div class="grid-2 mb-24">
        <div class="db-chart-card">
          <div class="db-chart-title">แนวโน้มยอดขายสะสม</div>
          <div id="sales-trend-chart" style="min-height: 250px;"></div>
        </div>
        
        <div class="db-chart-card">
          <div class="db-chart-title">สัดส่วนพนักงานขาย (Revenue Contribution)</div>
          <div id="sales-contribution-chart" style="min-height: 250px;"></div>
        </div>
      </div>

      <!-- Financial Split & Expense Breakdown -->
      <div class="db-chart-card mb-24">
        <div class="db-chart-title">
          <span>การหารเงินและค่าใช้จ่าย (Sales Revenue Split & Deductions)</span>
          <span class="db-badge-pill" style="background:#E8F0FE;color:var(--primary);">สุทธิ ฿${UI.currency(netEarning, 2)}</span>
        </div>
        <div class="grid-2">
          <div id="sales-split-chart" style="min-height: 250px;"></div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>รายการการเงิน</th><th class="td-right">จำนวนเงิน</th><th>สัดส่วน</th></tr>
              </thead>
              <tbody>
                <tr><td>ยอดขายสินค้าทั้งหมด</td><td class="td-right td-bold">฿${UI.currency(totalSales, 2)}</td><td>100%</td></tr>
                <tr style="color:var(--danger)"><td>- ค่าหลอด</td><td class="td-right">-฿${UI.currency(strawCost, 2)}</td><td>${totalSales ? Math.round(strawCost/totalSales*100) : 0}%</td></tr>
                <tr style="color:var(--danger)"><td>- ค่าถุง</td><td class="td-right">-฿${UI.currency(bagCost, 2)}</td><td>${totalSales ? Math.round(bagCost/totalSales*100) : 0}%</td></tr>
                <tr style="color:var(--danger)"><td>- เงินสะสม / เงินประกัน</td><td class="td-right">-฿${UI.currency(savings, 2)}</td><td>${totalSales ? Math.round(savings/totalSales*100) : 0}%</td></tr>
                <tr style="color:var(--danger)"><td>- ค่าเช่ารถ / เช่าซื้อรถพ่วง</td><td class="td-right">-฿${UI.currency(vehicleLease, 2)}</td><td>${totalSales ? Math.round(vehicleLease/totalSales*100) : 0}%</td></tr>
                <tr style="color:var(--danger)"><td>- ค่าใช้จ่ายอื่นๆ หักบัญชี</td><td class="td-right">-฿${UI.currency(otherExpenses, 2)}</td><td>${totalSales ? Math.round(otherExpenses/totalSales*100) : 0}%</td></tr>
                <tr style="background:var(--bg-hover); font-weight:bold; color:var(--success);">
                  <td>คงเหลือสุทธิ (Net Earnings)</td>
                  <td class="td-right">฿${UI.currency(netEarning, 2)}</td>
                  <td>${totalSales ? Math.round(netEarning/totalSales*100) : 0}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Inventory Health Section -->
      <div class="db-chart-card mb-24">
        <div class="db-chart-title">
          <span><span class="material-icons" style="vertical-align:bottom;margin-right:6px">health_and_safety</span>ระบบตรวจสอบสุขภาพคลังสินค้า (Inventory Health)</span>
          <div class="tabs" style="margin-bottom:0; border-bottom:none;">
            <button class="tab ${this._activeHealthTab==='central'?'active':''}" onclick="PAGES.dashboard.setHealthTab('central')">คลังสินค้ากลาง</button>
            <button class="tab ${this._activeHealthTab==='employee'?'active':''}" onclick="PAGES.dashboard.setHealthTab('employee')">คลังพนักงาน</button>
          </div>
        </div>

        <div class="db-health-grid" id="db-health-grid-cards">
          <!-- Populated by JS -->
        </div>

        <div class="card" style="box-shadow:none; border: 1px solid var(--border-light); border-radius:12px;">
          <div class="card-title" id="db-health-detail-title">รายละเอียดสินค้า</div>
          <div class="table-wrap" style="border:none;">
            <table id="db-health-detail-table">
              <!-- Populated by JS -->
            </table>
          </div>
        </div>
      </div>

      <!-- Purchase Forecasting Section -->
      <div class="db-chart-card mb-24">
        <div class="db-chart-title">
          <span><span class="material-icons" style="vertical-align:bottom;margin-right:6px">online_prediction</span>พยากรณ์การสั่งซื้อสินค้าล่วงหน้า 7 วัน (7-Day Ordering Forecast)</span>
          <span style="font-size:0.85rem;font-weight:normal;color:var(--text-muted)">* อิงจากอัตราความเร็วการขายในรอบที่เลือก</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>สินค้า</th>
                <th>หมวดหมู่</th>
                <th class="td-right">ยอดขายเฉลี่ย (ชิ้น/วัน)</th>
                <th class="td-right">จำนวนคงเหลือปัจจุบัน</th>
                <th class="td-right">ความต้องการ 7 วัน</th>
                <th class="td-right">ควรสั่งซื้อเพิ่ม</th>
                <th>สถานะสต็อก</th>
              </tr>
            </thead>
            <tbody id="db-forecast-tbody">
              <!-- Populated by JS -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Render the interactive components
    this.renderCharts(totalSales);
    this.renderHealthSection();
    this.renderForecastSection();
  },

  renderCharts(totalSales) {
    if (!window.ApexCharts) {
      console.warn("ApexCharts not loaded yet.");
      return;
    }

    // 1. Sales Trend Chart
    const salesByDate = {};
    this._filteredBillings.forEach(b => {
      salesByDate[b.date] = (salesByDate[b.date] || 0) + (Number(b.totalAmt) || 0);
    });
    
    // Sort dates
    const sortedDates = Object.keys(salesByDate).sort();
    const trendData = sortedDates.map(date => ({
      x: UI.dateStr(date),
      y: salesByDate[date]
    }));

    const trendOptions = {
      chart: { type: 'area', height: 260, toolbar: { show: false }, fontFamily: 'Sarabun, sans-serif' },
      series: [{ name: 'ยอดขาย', data: trendData.map(d=>d.y) }],
      xaxis: { categories: trendData.map(d=>d.x) },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#1a73e8'],
      dataLabels: { enabled: false },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 90, 100] }
      },
      yaxis: { labels: { formatter: (val) => '฿' + UI.currency(val, 0) } }
    };
    new ApexCharts(document.getElementById("sales-trend-chart"), trendOptions).render();

    // 2. Sales Contribution Chart (Donut)
    const salesByEmp = {};
    this._filteredBillings.forEach(b => {
      const name = b.employee?.displayName || b.warehouseName || 'อื่นๆ';
      salesByEmp[name] = (salesByEmp[name] || 0) + (Number(b.totalAmt) || 0);
    });

    const contributionData = Object.entries(salesByEmp).map(([name, val]) => ({ name, val }));
    const donutOptions = {
      chart: { type: 'donut', height: 260, fontFamily: 'Sarabun, sans-serif' },
      series: contributionData.map(d => d.val),
      labels: contributionData.map(d => d.name),
      colors: ['#1a73e8', '#34a853', '#fbbc05', '#ea4335', '#a142f4', '#24b6f7'],
      legend: { position: 'bottom' },
      dataLabels: { enabled: true, formatter: (val) => Math.round(val) + '%' },
      tooltip: { y: { formatter: (val) => '฿' + UI.currency(val, 0) } }
    };
    new ApexCharts(document.getElementById("sales-contribution-chart"), donutOptions).render();

    // 3. Sales Split Bar Chart
    let strawCost = 0; let bagCost = 0; let savings = 0; let vehicleLease = 0; let otherExpenses = 0;
    this._filteredFinance.forEach(f => {
      const amt = Number(f.amount) || 0;
      const cat = f.category || '';
      if (cat === 'ค่าหลอด') strawCost += amt;
      else if (cat === 'ค่าถุง') bagCost += amt;
      else if (cat === 'ฝากเงิน' || cat === 'เงินประกัน') savings += amt;
      else if (cat.includes('เช่า')) vehicleLease += amt;
      else otherExpenses += amt;
    });
    const netEarning = totalSales - (strawCost + bagCost + savings + vehicleLease + otherExpenses);

    const splitOptions = {
      chart: { type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'Sarabun, sans-serif' },
      series: [{
        name: 'จำนวนเงิน',
        data: [
          { x: 'ยอดขายสินค้า', y: totalSales, fillColor: '#1a73e8' },
          { x: 'คงเหลือสุทธิ', y: netEarning, fillColor: '#34a853' },
          { x: 'ค่าหลอด', y: strawCost, fillColor: '#ea4335' },
          { x: 'ค่าถุง', y: bagCost, fillColor: '#ea4335' },
          { x: 'เงินฝากสะสม', y: savings, fillColor: '#fbbc05' },
          { x: 'ค่าเช่ารถ', y: vehicleLease, fillColor: '#e37405' },
          { x: 'ค่าหักอื่นๆ', y: otherExpenses, fillColor: '#7c7c7c' }
        ]
      }],
      plotOptions: { bar: { distributed: true, borderRadius: 6, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      legend: { show: false },
      yaxis: { labels: { formatter: (val) => '฿' + UI.currency(val, 0) } }
    };
    new ApexCharts(document.getElementById("sales-split-chart"), splitOptions).render();
  },

  setHealthTab(tab) {
    this._activeHealthTab = tab;
    this.renderHealthSection();
  },

  setHealthStatus(status) {
    this._selectedHealthStatus = status;
    
    // Toggle active class on cards
    document.querySelectorAll('.db-health-item').forEach(card => card.classList.remove('active'));
    const activeCard = document.querySelector(`.db-health-item[data-status="${status}"]`);
    if (activeCard) activeCard.classList.add('active');

    this.renderHealthDetailTable();
  },

  renderHealthSection() {
    let safeCount = 0;
    let lowCount = 0;
    let outCount = 0;
    let expiredCount = 0;
    let expiringCount = 0;

    const todayStr = this.formatDateISO(new Date());
    const limitExp = new Date();
    limitExp.setDate(limitExp.getDate() + 14); // 14 days near expiry
    const limitExpStr = this.formatDateISO(limitExp);

    if (this._activeHealthTab === 'central') {
      this._centralStock.forEach(item => {
        const qty = Number(item.qty) || 0;
        const p = this._products.find(x => x.id === item.productId) || {};
        const minVal = Number(p.minStock) || 10;
        
        // Expiry checks
        if (item.expiryDate && item.expiryDate !== '9999-12-31') {
          if (item.expiryDate < todayStr) { expiredCount++; return; }
          else if (item.expiryDate <= limitExpStr) { expiringCount++; return; }
        }

        if (qty <= 0) outCount++;
        else if (qty <= minVal) lowCount++;
        else safeCount++;
      });
    } else {
      // Employee stocks
      this._employeeStock.forEach(wh => {
        (wh.stock || []).forEach(item => {
          const qty = (Number(item.qty) || 0) + (Number(item.consigned) || 0);
          const p = this._products.find(x => x.id === item.productId) || {};
          const minVal = Number(p.minStock) || 5; // employee min stock defaults lower

          if (item.expiryDate && item.expiryDate !== '9999-12-31') {
            if (item.expiryDate < todayStr) { expiredCount++; return; }
            else if (item.expiryDate <= limitExpStr) { expiringCount++; return; }
          }

          if (qty <= 0) outCount++;
          else if (qty <= minVal) lowCount++;
          else safeCount++;
        });
      });
    }

    const gridEl = document.getElementById('db-health-grid-cards');
    gridEl.innerHTML = `
      <div class="db-health-item ${this._selectedHealthStatus==='safe'?'active':''}" data-status="safe" onclick="PAGES.dashboard.setHealthStatus('safe')">
        <div class="db-health-val" style="color:var(--success)">${safeCount}</div>
        <div class="db-health-label">ระดับปกติ (Safe)</div>
      </div>
      <div class="db-health-item ${this._selectedHealthStatus==='lowStock'?'active':''}" data-status="lowStock" onclick="PAGES.dashboard.setHealthStatus('lowStock')">
        <div class="db-health-val" style="color:var(--warning)">${lowCount}</div>
        <div class="db-health-label">ใกล้หมด (Low)</div>
      </div>
      <div class="db-health-item ${this._selectedHealthStatus==='outOfStock'?'active':''}" data-status="outOfStock" onclick="PAGES.dashboard.setHealthStatus('outOfStock')">
        <div class="db-health-val" style="color:var(--danger)">${outCount}</div>
        <div class="db-health-label">สินค้าหมด (Out)</div>
      </div>
      <div class="db-health-item ${this._selectedHealthStatus==='expired'?'active':''}" data-status="expired" onclick="PAGES.dashboard.setHealthStatus('expired')">
        <div class="db-health-val" style="color:#C62828">${expiredCount}</div>
        <div class="db-health-label">หมดอายุแล้ว</div>
      </div>
      <div class="db-health-item ${this._selectedHealthStatus==='expiring'?'active':''}" data-status="expiring" onclick="PAGES.dashboard.setHealthStatus('expiring')">
        <div class="db-health-val" style="color:#FFB300">${expiringCount}</div>
        <div class="db-health-label">ใกล้หมดอายุ (&lt;14วัน)</div>
      </div>
    `;

    this.renderHealthDetailTable();
  },

  renderHealthDetailTable() {
    const status = this._selectedHealthStatus;
    const tab = this._activeHealthTab;
    const tbodyEl = document.getElementById('db-health-detail-table');
    
    let items = [];
    const todayStr = this.formatDateISO(new Date());
    const limitExp = new Date();
    limitExp.setDate(limitExp.getDate() + 14);
    const limitExpStr = this.formatDateISO(limitExp);

    if (tab === 'central') {
      this._centralStock.forEach(item => {
        const qty = Number(item.qty) || 0;
        const p = this._products.find(x => x.id === item.productId) || {};
        const minVal = Number(p.minStock) || 10;
        const wh = this._warehouses.find(w => w.id === item.warehouseId) || {};
        
        let match = false;
        
        if (status === 'expired' && item.expiryDate && item.expiryDate !== '9999-12-31' && item.expiryDate < todayStr) match = true;
        else if (status === 'expiring' && item.expiryDate && item.expiryDate !== '9999-12-31' && item.expiryDate >= todayStr && item.expiryDate <= limitExpStr) match = true;
        else if (item.expiryDate && item.expiryDate !== '9999-12-31' && item.expiryDate < todayStr) { /* skip */ }
        else if (item.expiryDate && item.expiryDate !== '9999-12-31' && item.expiryDate <= limitExpStr) { /* skip */ }
        else if (status === 'outOfStock' && qty <= 0) match = true;
        else if (status === 'lowStock' && qty > 0 && qty <= minVal) match = true;
        else if (status === 'safe' && qty > minVal) match = true;

        if (match) {
          items.push({
            code: p.code || '-',
            name: p.name || item.productId,
            category: p.category || '-',
            imageUrl: p.imageUrl,
            productIndex: this._products.indexOf(p) !== -1 ? this._products.indexOf(p) : 9999,
            qty: qty,
            unit: item.unit || p.unit || 'หน่วย',
            whName: wh.name || 'คลังกลาง',
            expiry: item.expiryDate && item.expiryDate !== '9999-12-31' ? UI.dateStr(item.expiryDate) : '-'
          });
        }
      });
    } else {
      // Employee stock
      this._employeeStock.forEach(wh => {
        (wh.stock || []).forEach(item => {
          const qty = Number(item.qty) || 0;
          const consigned = Number(item.consigned) || 0;
          const totalQty = qty + consigned;
          const p = this._products.find(x => x.id === item.productId) || {};
          const minVal = Number(p.minStock) || 5;

          let match = false;
          
          if (status === 'expired' && item.expiryDate && item.expiryDate !== '9999-12-31' && item.expiryDate < todayStr) match = true;
          else if (status === 'expiring' && item.expiryDate && item.expiryDate !== '9999-12-31' && item.expiryDate >= todayStr && item.expiryDate <= limitExpStr) match = true;
          else if (item.expiryDate && item.expiryDate !== '9999-12-31' && item.expiryDate < todayStr) { /* skip */ }
          else if (item.expiryDate && item.expiryDate !== '9999-12-31' && item.expiryDate <= limitExpStr) { /* skip */ }
          else if (status === 'outOfStock' && totalQty <= 0) match = true;
          else if (status === 'lowStock' && totalQty > 0 && totalQty <= minVal) match = true;
          else if (status === 'safe' && totalQty > minVal) match = true;

          if (match) {
            items.push({
              code: p.code || '-',
              name: p.name || item.productId,
              category: p.category || '-',
              imageUrl: p.imageUrl,
              productIndex: this._products.indexOf(p) !== -1 ? this._products.indexOf(p) : 9999,
              qty: totalQty,
              detailStr: `(พกพ: ${qty} / ฝาก: ${consigned})`,
              unit: item.unit || p.unit || 'หน่วย',
              whName: wh.warehouse?.name || 'พนักงาน',
              expiry: item.expiryDate && item.expiryDate !== '9999-12-31' ? UI.dateStr(item.expiryDate) : '-'
            });
          }
        });
      });
    }

    document.getElementById('db-health-detail-title').textContent = `รายการสินค้าคลังที่อยู่ในสถิติ: ${status === 'safe' ? 'ระดับปกติ' : status === 'lowStock' ? 'สต็อกใกล้หมด' : status === 'outOfStock' ? 'หมดคลัง' : status === 'expired' ? 'หมดอายุ' : 'ใกล้หมดอายุ'} (${items.length} รายการ)`;

    if (!items.length) {
      tbodyEl.innerHTML = `<tr><td colspan="5" class="td-center text-muted">ไม่มีข้อมูลสินค้าในกลุ่มนี้</td></tr>`;
      return;
    }

    // เรียงตามการจัดการสินค้า
    items.sort((a, b) => a.productIndex - b.productIndex);

    tbodyEl.innerHTML = `
      <thead>
        <tr><th>สินค้า</th><th>หมวดหมู่</th><th>คลัง</th><th class="td-right">จำนวนคงเหลือ</th><th>วันหมดอายุ</th></tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                ${UI.image(item.imageUrl, 'product-img', 'width:36px; height:36px; border-radius:6px; object-fit:cover;')}
                <div>
                  <div class="td-bold">${item.name} <small style="font-weight:normal;color:var(--text-secondary)">${item.detailStr || ''}</small></div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">${item.code}</div>
                </div>
              </div>
            </td>
            <td>${item.category}</td>
            <td>${item.whName}</td>
            <td class="td-right td-bold">${UI.currency(item.qty, 0)} ${item.unit}</td>
            <td>${item.expiry}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
  },

  renderForecastSection() {
    const tbodyEl = document.getElementById('db-forecast-tbody');
    
    // Calculate date range in days
    const d1 = new Date(this._filterStartDate);
    const d2 = new Date(this._filterEndDate);
    const timeDiff = Math.abs(d2.getTime() - d1.getTime());
    const daysInPeriod = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1);

    // Sum product units sold
    const salesQty = {};
    this._filteredBillings.forEach(b => {
      let items = [];
      try { items = JSON.parse(b.items || '[]'); } catch(e) {}
      items.forEach(it => {
        salesQty[it.productId] = (salesQty[it.productId] || 0) + (Number(it.sold) || 0);
      });
    });

    // Sum current total stock
    const currentStockMap = {};
    this._centralStock.forEach(cs => {
      currentStockMap[cs.productId] = (currentStockMap[cs.productId] || 0) + (Number(cs.qty) || 0);
    });
    this._employeeStock.forEach(wh => {
      (wh.stock || []).forEach(es => {
        currentStockMap[es.productId] = (currentStockMap[es.productId] || 0) + (Number(es.qty) || 0) + (Number(es.consigned) || 0);
      });
    });

    const recommendations = [];

    this._products.forEach(p => {
      const sold = salesQty[p.id] || 0;
      const dailyVelocity = sold / daysInPeriod;
      const currentStock = currentStockMap[p.id] || 0;
      const demand7Days = Math.round(dailyVelocity * 7);
      
      const suggestedOrder = Math.max(0, demand7Days - currentStock);
      
      let statusHtml = '';
      if (suggestedOrder > 0) {
        statusHtml = `<span class="badge badge-red"><span class="material-icons" style="font-size:12px;vertical-align:middle;margin-right:2px">warning</span>ควรสั่งเพิ่ม</span>`;
      } else {
        statusHtml = `<span class="badge badge-green"><span class="material-icons" style="font-size:12px;vertical-align:middle;margin-right:2px">check_circle</span>สต็อกพอเพียง</span>`;
      }

      if (sold > 0 || currentStock > 0) {
        recommendations.push({
          p,
          productIndex: this._products.indexOf(p) !== -1 ? this._products.indexOf(p) : 9999,
          dailyVelocity,
          currentStock,
          demand7Days,
          suggestedOrder,
          statusHtml
        });
      }
    });

    // เรียงตามการจัดการสินค้า
    recommendations.sort((a,b) => a.productIndex - b.productIndex);

    if (!recommendations.length) {
      tbodyEl.innerHTML = `<tr><td colspan="7" class="td-center text-muted">ไม่มีข้อมูลประวัติขายเพื่อประเมินการพยากรณ์</td></tr>`;
      return;
    }

    tbodyEl.innerHTML = recommendations.map(rec => `
      <tr class="${rec.suggestedOrder > 0 ? 'bg-danger-light' : ''}">
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            ${UI.image(rec.p.imageUrl, 'product-img', 'width:36px; height:36px; border-radius:6px; object-fit:cover;')}
            <div>
              <div class="td-bold">${rec.p.name}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${rec.p.code}</div>
            </div>
          </div>
        </td>
        <td>${rec.p.category || '-'}</td>
        <td class="td-right td-bold">${UI.currency(rec.dailyVelocity, 2)}</td>
        <td class="td-right">${UI.currency(rec.currentStock, 0)} ${rec.p.unit}</td>
        <td class="td-right td-bold">${UI.currency(rec.demand7Days, 0)}</td>
        <td class="td-right td-bold text-danger">${rec.suggestedOrder > 0 ? UI.currency(rec.suggestedOrder, 0) + ' ' + rec.p.unit : '-'}</td>
        <td>${rec.statusHtml}</td>
      </tr>
    `).join('');
  }
};
