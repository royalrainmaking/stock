// ============================================================
// pages/dashboard.js – Admin Dashboard with charts
// ============================================================

PAGES['dashboard'] = {
  _period: 'week',
  _data: null,
  _products: [],

  async render() {
    const el = document.getElementById('page-dashboard');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">แดชบอร์ดภาพรวม</h2>
          <p class="page-subtitle">ข้อมูลวันที่ ${UI.dateStr(new Date())}</p>
        </div>
        <div class="page-actions">
          <div class="tabs" style="margin-bottom:0">
            <button class="tab ${this._period==='day'?'active':''}" onclick="PAGES.dashboard.setPeriod('day')">วันนี้</button>
            <button class="tab ${this._period==='week'?'active':''}" onclick="PAGES.dashboard.setPeriod('week')">สัปดาห์</button>
            <button class="tab ${this._period==='month'?'active':''}" onclick="PAGES.dashboard.setPeriod('month')">เดือน</button>
            <button class="tab ${this._period==='year'?'active':''}" onclick="PAGES.dashboard.setPeriod('year')">ปี</button>
          </div>
        </div>
      </div>
      <div id="dashboard-body">${UI.spinner()}</div>
    `;
    await this.load();
  },

  async setPeriod(p) {
    this._period = p;
    await this.render();
  },

  async load() {
    try {
      const now = new Date();
      const [res, prodRes] = await Promise.all([
        API.getDashboard(this._period, now.getFullYear(), now.getMonth()+1, now.getDate()),
        API.getProducts()
      ]);
      this._data = res;
      this._products = prodRes.products || [];
      this.renderBody(res);
    } catch(e) {
      document.getElementById('dashboard-body').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:18px;vertical-align:middle;margin-right:6px">warning</span>โหลดข้อมูลไม่สำเร็จ: ${e.message}</div>`;
    }
  },

  renderBody(data) {
    const chartData = this._period === 'year' ? data.salesByMonth : data.salesByDay;
    document.getElementById('dashboard-body').innerHTML = `
      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card purple">
          <div class="stat-bg-icon"><span class="material-icons">payments</span></div>
          <div class="stat-label">ยอดขายวันนี้</div>
          <div class="stat-value text-primary-color">฿${UI.currency(data.totalSalesToday, 0)}</div>
          <div class="stat-sub">รวม ${UI.currency(data.totalUnitsToday, 0)} หน่วย</div>
        </div>
        
        <div class="stat-card pink">
          <div class="stat-bg-icon"><span class="material-icons">group</span></div>
          <div class="stat-label">พนักงานที่ Active</div>
          <div class="stat-value" style="color:var(--secondary)">${data.activeEmployees}</div>
          <div class="stat-sub">คน</div>
        </div>

        <div class="stat-card red" style="background:#FCE8E6;border-color:#F8D7DA">
          <div class="stat-bg-icon"><span class="material-icons">cancel</span></div>
          <div class="stat-label" style="color:#C62828">หมดอายุแล้ว</div>
          <div class="stat-value" style="color:#C62828">${data.expiredCount || 0}</div>
          <div class="stat-sub">ล็อตสินค้า</div>
        </div>

        <div class="stat-card orange">
          <div class="stat-bg-icon"><span class="material-icons">timer</span></div>
          <div class="stat-label">ใกล้หมดอายุ (30ว)</div>
          <div class="stat-value" style="color:var(--warning)">${data.expiringCount || 0}</div>
          <div class="stat-sub">ล็อตสินค้า</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid-2">
        <div class="card">
          <div class="card-title">ยอดขาย${this._period==='year'?'รายเดือน':'รายวัน'}</div>
          ${UI.barChart(chartData || [], { color: 'var(--primary-light)', colorEnd: 'var(--primary-dark)', height: 200 })}
        </div>
        <div class="card">
          <div class="card-title">พยากรณ์ 3 วันข้างหน้า</div>
          ${UI.barChart((data.forecastNextDays||[]).map(d=>({label:d.date.slice(5),value:d.forecast})), { color: 'var(--accent)', colorEnd: '#00a07e', height: 200 })}
          <div class="alert alert-info mt-16" style="margin-top:12px">
            <span class="material-icons" style="font-size:18px;vertical-align:middle;margin-right:4px">lightbulb</span>ตัวเลขพยากรณ์อิงจากค่าเฉลี่ย 7 วันย้อนหลัง เพื่อช่วยวางแผนสั่งสินค้าล่วงหน้า
          </div>
        </div>
      </div>

      <!-- Top Products -->
      <div class="card mt-16">
        <div class="card-title"><span class="material-icons" style="vertical-align:middle;margin-right:8px">emoji_events</span>สินค้าขายดี${this._period==='year'?' (ปีนี้)':' (สัปดาห์นี้)'}</div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>สินค้า</th>
              <th class="td-right">จำนวน (หน่วย)</th>
              <th class="td-right">ยอดขาย (บาท)</th>
              <th>สัดส่วน</th>
            </tr></thead>
            <tbody>
              ${(data.topProducts||[]).map((p,i) => {
                const totalUnits = (data.topProducts||[]).reduce((a,x)=>a+x.units,0) || 1;
                const pct = Math.round((p.units/totalUnits)*100);
                return `<tr>
                  <td>${i+1}</td>
                  <td class="td-bold">
                    <div style="display:flex;align-items:center;gap:12px">
                      ${(() => {
                        const pFound = this._products.find(px => px.name === p.name);
                        return UI.image(pFound?.imageUrl, 'product-img', 'width:32px;height:32px;border-radius:4px');
                      })()}
                      <span>${p.name}</span>
                    </div>
                  </td>
                  <td class="td-right">${UI.currency(p.units, 0)}</td>
                  <td class="td-right text-success fw-bold">฿${UI.currency(p.revenue, 0)}</td>
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
  }
};
