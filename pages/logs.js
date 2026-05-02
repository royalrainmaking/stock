// ============================================================
// pages/logs.js – System transaction log viewer
// ============================================================

PAGES['logs'] = {
  _logs: [],
  _total: 0,
  _page: 1,
  _users: [],

  async render() {
    const el = document.getElementById('page-logs');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">บันทึกระบบ (Log)</h2>
          <p class="page-subtitle">ตรวจสอบการทำรายการทั้งหมด – user / วันที่ / เวลา / การกระทำ</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="PAGES.logs.exportCSV()">📤 ส่งออก CSV</button>
        </div>
      </div>
      <div class="card mb-16">
        <div class="input-group" style="margin:0;flex-wrap:wrap">
          <div class="form-group" style="margin:0">
            <label style="font-size:0.8rem;color:var(--text-muted)">จากวันที่</label>
            <input type="date" id="log-start" value="${getDateStr(-7)}" style="min-width:150px" />
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:0.8rem;color:var(--text-muted)">ถึงวันที่</label>
            <input type="date" id="log-end" value="${UI.todayISO()}" style="min-width:150px" />
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:0.8rem;color:var(--text-muted)">ผู้ใช้</label>
            <select id="log-user" style="min-width:160px"><option value="">-- ทุกผู้ใช้ --</option></select>
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:0.8rem;color:var(--text-muted)">ประเภท</label>
            <select id="log-action" style="min-width:160px">
              <option value="">-- ทุกประเภท --</option>
              <option value="login">เข้าสู่ระบบ</option>
              <option value="receive">รับสินค้า</option>
              <option value="transfer">เบิกสินค้า</option>
              <option value="consign">ฝากสินค้า</option>
              <option value="billing">คิดเงิน</option>
              <option value="adjust">ปรับยอด</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="PAGES.logs.load(1)"><span class="material-icons">search</span> ค้นหา</button>
        </div>
      </div>
      <div class="card">
        <div id="log-table">${UI.spinner()}</div>
      </div>
    `;
    await this.loadUsers();
    await this.load(1);
  },

  async loadUsers() {
    try {
      const res = await API.getUsers();
      this._users = res.users || [];
      const sel = document.getElementById('log-user');
      if (sel) sel.innerHTML = '<option value="">-- ทุกผู้ใช้ --</option>' +
        this._users.map(u => `<option value="${u.username}">${u.displayName} (${u.username})</option>`).join('');
    } catch(e) {}
  },

  async load(page = 1) {
    this._page = page;
    const start = document.getElementById('log-start')?.value;
    const end = document.getElementById('log-end')?.value;
    const user = document.getElementById('log-user')?.value;
    const action = document.getElementById('log-action')?.value;
    try {
      document.getElementById('log-table').innerHTML = UI.spinner();
      const res = await API.getLogs(start, end, user, action, page);
      this._logs = res.logs || [];
      this._total = res.total || 0;
      this.renderTable();
    } catch(e) {
      document.getElementById('log-table').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  renderTable() {
    if (!this._logs.length) {
      document.getElementById('log-table').innerHTML = UI.emptyState('history', 'ไม่พบข้อมูล Log', 'ลองเปลี่ยนช่วงเวลาหรือตัวกรอง');
      return;
    }

    const icon = (name) => `<span class="material-icons" style="font-size:16px;vertical-align:middle">${name}</span>`;
    const actionIcons = {
      login: icon('vpn_key'), logout: icon('logout'), receive: icon('move_to_inbox'), transfer: icon('swap_horiz'),
      consign: icon('undo'), billing: icon('payments'), adjust: icon('settings'), order: icon('shopping_cart'),
      create: icon('add'), update: icon('edit'), delete: icon('delete')
    };
    const actionColors = {
      login: 'badge-blue', receive: 'badge-green', transfer: 'badge-blue',
      consign: 'badge-yellow', billing: 'badge-green', adjust: 'badge-yellow',
      delete: 'badge-red', product: 'badge-blue', order: 'badge-accent'
    };

    const totalPages = Math.ceil(this._total / CONFIG.PAGE_SIZE);
    document.getElementById('log-table').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <span class="text-muted" style="font-size:0.82rem">พบ ${UI.currency(this._total, 0)} รายการ</span>
        <span class="text-muted" style="font-size:0.82rem">หน้า ${this._page} / ${totalPages || 1}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>วันที่ / เวลา</th><th>ผู้ใช้</th><th>ประเภท</th><th>รายละเอียด</th>
          </tr></thead>
          <tbody>
            ${this._logs.map((log, i) => `
              <tr>
                <td class="text-muted">${(this._page - 1) * CONFIG.PAGE_SIZE + i + 1}</td>
                <td style="white-space:nowrap;font-size:0.82rem">${UI.dateTimeStr(log.ts)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    ${(() => {
                      const u = this._users.find(ux => ux.username === log.username);
                      return UI.avatar(u?.avatar, log.username, 24);
                    })()}
                    <div class="fw-bold" style="font-size:0.88rem">${log.username || '-'}</div>
                  </div>
                </td>
                <td>
                  <span class="badge ${actionColors[log.action] || 'badge-gray'}">
                    ${actionIcons[log.action] || '•'} ${log.action}
                  </span>
                </td>
                <td style="font-size:0.87rem;color:var(--text-secondary)">${log.detail || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? UI.paginator(this._page, totalPages, `PAGES.logs.load`) : ''}
    `;
  },

  exportCSV() {
    if (!this._logs.length) return UI.toast('ไม่มีข้อมูล', 'warning');
    const headers = ['วันที่/เวลา', 'ผู้ใช้', 'ประเภท', 'รายละเอียด'];
    const rows = this._logs.map(l => [UI.dateTimeStr(l.ts), l.username, l.action, l.detail]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${(String(v)||'').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff'+csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `system_log_${UI.todayISO()}.csv`;
    link.click();
    UI.toast('ส่งออก CSV เรียบร้อย ✅', 'success');
  }
};
