// ============================================================
// pages/sales-report.js – Sales report with filters
// ============================================================

PAGES['sales-report'] = {
  _startDate: '',
  _endDate: '',
  _rows: [],
  _warehouses: [],
  _selectedWh: '',

  async render() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this._startDate = firstDay.toISOString().split('T')[0];
    this._endDate = UI.todayISO();

    const el = document.getElementById('page-sales-report');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#7B1FA2,#4A148C)">
            <span class="material-icons">bar_chart</span>
          </div>
          <div>
            <h2 class="page-title">รายงานยอดขาย</h2>
            <p class="page-subtitle">สรุปยอดขายรายวัน / รายเดือน / รายปี</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="PAGES['sales-report'].exportCSV()"><span class="material-icons">file_download</span> ส่งออก CSV</button>
        </div>
      </div>

      <div class="filter-card">
        <form onsubmit="PAGES['sales-report'].load(); event.preventDefault()">
          <div class="form-group" style="width:150px">
            <label>จากวันที่</label>
            <input type="date" id="sr-start" value="${this._startDate}" />
          </div>
          <div class="form-group" style="width:150px">
            <label>ถึงวันที่</label>
            <input type="date" id="sr-end" value="${this._endDate}" />
          </div>
          <div class="form-group" style="width:220px">
            <label>พนักงาน / คลัง</label>
            <select id="sr-wh"><option value="">-- ทุกคลัง --</option></select>
          </div>
          <button type="submit" class="btn btn-primary" style="height:42px">
            <span class="material-icons">search</span> ค้นหา
          </button>
        </form>
      </div>
      <div id="sr-summary" class="stats-grid" style="margin-bottom:16px"></div>
      <div class="card">
        <div id="sr-chart" style="margin-bottom:16px"></div>
        <div id="sr-table">${UI.spinner()}</div>
      </div>
    `;
    await this.loadWarehouses();
    await this.load();
  },

  async loadWarehouses() {
    const res = await API.getWarehouses();
    this._warehouses = (res.warehouses || []).filter(w => w.type === 'employee');
    const sel = document.getElementById('sr-wh');
    if (sel) sel.innerHTML = '<option value="">-- ทุกคลัง --</option>' +
      this._warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
  },

  async load() {
    const start = document.getElementById('sr-start')?.value || this._startDate;
    const end = document.getElementById('sr-end')?.value || this._endDate;
    const wh = document.getElementById('sr-wh')?.value || '';
    try {
      const res = await API.getSalesReport(start, end, wh);
      this._rows = res.rows || [];
      this.renderSummary();
      this.renderChart();
      this.renderTable();
    } catch(e) {
      document.getElementById('sr-table').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  renderSummary() {
    const totalRev = this._rows.reduce((a, r) => a + (r.revenue || 0), 0);
    const totalUnits = this._rows.reduce((a, r) => a + (r.units || 0), 0);
    const days = new Set(this._rows.map(r => r.date)).size;
    const avgPerDay = days ? totalRev / days : 0;
    document.getElementById('sr-summary').innerHTML = `
      <div class="stat-card purple"><div class="stat-bg-icon"><span class="material-icons">payments</span></div>
        <div class="stat-label">ยอดขายรวม</div>
        <div class="stat-value text-primary-color">฿${UI.currency(totalRev, 0)}</div>
      </div>
      <div class="stat-card green"><div class="stat-bg-icon"><span class="material-icons">inventory_2</span></div>
        <div class="stat-label">หน่วยรวม</div>
        <div class="stat-value" style="color:var(--accent)">${UI.currency(totalUnits, 0)}</div>
      </div>
      <div class="stat-card orange"><div class="stat-bg-icon"><span class="material-icons">today</span></div>
        <div class="stat-label">เฉลี่ย/วัน</div>
        <div class="stat-value" style="color:var(--warning)">฿${UI.currency(avgPerDay, 0)}</div>
      </div>
      <div class="stat-card pink"><div class="stat-bg-icon"><span class="material-icons">bar_chart</span></div>
        <div class="stat-label">จำนวนวันที่มียอด</div>
        <div class="stat-value" style="color:var(--secondary)">${days}</div>
        <div class="stat-sub">วัน</div>
      </div>
    `;
  },

  renderChart() {
    // Group by date
    const byDate = {};
    this._rows.forEach(r => {
      byDate[r.date] = (byDate[r.date] || 0) + r.revenue;
    });
    const chartData = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, value]) => ({ label: date.slice(5), value }));
    const el = document.getElementById('sr-chart');
    if (el && chartData.length) {
      el.innerHTML = `<div class="card-title">ยอดขายรายวัน (14 วันล่าสุด)</div>` + UI.barChart(chartData);
    }
  },

  renderTable() {
    if (!this._rows.length) {
      document.getElementById('sr-table').innerHTML = UI.emptyState('bar_chart', 'ไม่พบข้อมูล', 'ลองเปลี่ยนช่วงวันที่หรือตัวกรอง');
      return;
    }

    // Group by product
    const byProduct = {};
    this._rows.forEach(r => {
      if (!byProduct[r.product]) byProduct[r.product] = { name: r.product, units: 0, revenue: 0 };
      byProduct[r.product].units += r.units;
      byProduct[r.product].revenue += r.revenue;
    });
    const productRows = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);

    document.getElementById('sr-table').innerHTML = `
      <div class="tabs" id="sr-tabs" style="margin-bottom:16px">
        <button class="tab active" onclick="PAGES['sales-report'].showTab('detail',this)">รายละเอียด</button>
        <button class="tab" onclick="PAGES['sales-report'].showTab('product',this)">สรุปตามสินค้า</button>
      </div>
      <div id="sr-tab-detail">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>วันที่</th><th>สินค้า</th><th>คลัง/พนักงาน</th>
              <th class="td-right">หน่วย</th><th class="td-right">ยอดขาย (บาท)</th>
            </tr></thead>
            <tbody>
              ${this._rows.map((r, i) => `
                <tr>
                  <td class="text-muted">${i+1}</td>
                  <td>${UI.dateStr(r.date)}</td>
                  <td class="td-bold">${r.product}</td>
                  <td style="font-size:0.82rem">${r.warehouseName}</td>
                  <td class="td-right">${UI.currency(r.units, 0)}</td>
                  <td class="td-right text-success fw-bold">฿${UI.currency(r.revenue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div id="sr-tab-product" class="hidden">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>สินค้า</th>
              <th class="td-right">หน่วยรวม</th><th class="td-right">ยอดขายรวม</th>
              <th>สัดส่วน</th>
            </tr></thead>
            <tbody>
              ${productRows.map((p, i) => {
                const totalRev = productRows.reduce((a, x) => a+x.revenue, 0) || 1;
                const pct = Math.round(p.revenue/totalRev*100);
                return `<tr>
                  <td>${i+1}</td>
                  <td class="td-bold">${p.name}</td>
                  <td class="td-right">${UI.currency(p.units, 0)}</td>
                  <td class="td-right text-success fw-bold">฿${UI.currency(p.revenue)}</td>
                  <td style="min-width:120px">
                    <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
                    <small class="text-muted">${pct}%</small>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  showTab(tab, btn) {
    document.querySelectorAll('#sr-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('sr-tab-detail').classList.toggle('hidden', tab !== 'detail');
    document.getElementById('sr-tab-product').classList.toggle('hidden', tab !== 'product');
  },

  exportCSV() {
    if (!this._rows.length) return UI.toast('ไม่มีข้อมูลที่จะส่งออก', 'warning');
    const headers = ['วันที่', 'สินค้า', 'คลัง/พนักงาน', 'หน่วย', 'ยอดขาย(บาท)'];
    const rows = this._rows.map(r => [r.date, r.product, r.warehouseName, r.units, r.revenue]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff'+csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_report_${this._startDate}_${this._endDate}.csv`;
    link.click();
    UI.toast('ส่งออก CSV เรียบร้อย ✅', 'success');
  }
};
