// ============================================================
// pages/users.js – User management (Admin only)
// ============================================================

PAGES['users'] = {
  _users: [],
  _search: '',

  async render() {
    const el = document.getElementById('page-users');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">จัดการผู้ใช้</h2>
          <p class="page-subtitle">สร้าง / แก้ไข / ลบ ผู้ใช้งานและกำหนดสิทธิ์</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="PAGES.users.openAdd()"><span class="material-icons">add</span> เพิ่มผู้ใช้</button>
        </div>
      </div>
      <div class="card mb-16">
        <div class="search-bar">
          <span class="search-icon"><span class="material-icons">search</span></span>
          <input type="text" placeholder="ค้นหาชื่อหรือ username..." oninput="PAGES.users.doSearch(this.value)" />
        </div>
      </div>
      <div class="card">
        <div id="users-table">${UI.spinner()}</div>
      </div>
    `;
    await this.load();
  },

  async load() {
    try {
      const res = await API.getUsers();
      this._users = res.users || [];
      this.renderTable();
    } catch(e) {
      document.getElementById('users-table').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  doSearch(v) { this._search = v.toLowerCase(); this.renderTable(); },

  filtered() {
    if (!this._search) return this._users;
    return this._users.filter(u =>
      u.username?.toLowerCase().includes(this._search) ||
      u.displayName?.toLowerCase().includes(this._search) ||
      u.email?.toLowerCase().includes(this._search)
    );
  },

  renderTable() {
    const data = this.filtered();
    if (!data.length) {
      document.getElementById('users-table').innerHTML = UI.emptyState('group', 'ไม่พบผู้ใช้', 'ลองเปลี่ยนคำค้นหา หรือเพิ่มผู้ใช้ใหม่');
      return;
    }
    const roleCounts = { admin: 0, stock: 0, cashier: 0 };
    this._users.forEach(u => { if (roleCounts[u.role] !== undefined) roleCounts[u.role]++; });

    document.getElementById('users-table').innerHTML = `
      <div class="mini-cards mb-16">
        <div class="mini-card"><div class="mini-val text-primary-color">${this._users.length}</div><div class="mini-label">ผู้ใช้ทั้งหมด</div></div>
        <div class="mini-card"><div class="mini-val" style="color:var(--primary-light)">${roleCounts.admin}</div><div class="mini-label">Admin</div></div>
        <div class="mini-card"><div class="mini-val" style="color:var(--accent)">${roleCounts.stock}</div><div class="mini-label">Stock</div></div>
        <div class="mini-card"><div class="mini-val" style="color:var(--secondary)">${roleCounts.cashier}</div><div class="mini-label">Cashier</div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>Avatar</th><th>ชื่อแสดง</th><th>Username</th>
            <th>Email</th><th>Role</th><th>สถานะ</th><th class="td-center">จัดการ</th>
          </tr></thead>
          <tbody>
            ${data.map((u, i) => `
              <tr>
                <td class="text-muted">${i+1}</td>
                <td>
                  <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem">
                    ${(u.displayName||u.username||'?').charAt(0).toUpperCase()}
                  </div>
                </td>
                <td class="td-bold">${u.displayName || '-'}</td>
                <td><code style="color:var(--primary-light);font-size:0.82rem">${u.username}</code></td>
                <td style="font-size:0.82rem;color:var(--text-secondary)">${u.email || '-'}</td>
                <td>${UI.roleBadge(u.role)}</td>
                <td>
                  <span class="status-dot ${u.active ? 'dot-green' : 'dot-red'}"></span>
                  ${u.active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                </td>
                <td class="td-center">
                  <div style="display:flex;gap:6px;justify-content:center">
                    <button class="btn btn-secondary btn-xs" onclick="PAGES.users.openEdit('${u.id}')"><span class="material-icons">edit</span> แก้ไข</button>
                    ${u.role !== 'admin' ? `<button class="btn btn-danger btn-xs" onclick="PAGES.users.doDelete('${u.id}')"><span class="material-icons">delete</span></button>` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  openAdd() { this._openForm(null); },
  openEdit(id) { this._openForm(this._users.find(u => u.id === id)); },

  _openForm(user) {
    const isEdit = !!user;
    const u = user || { username: '', displayName: '', email: '', role: 'stock', active: true, isEmployee: false };
    openModal(isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่', `
      <div class="form-row">
        <div class="form-group"><label>ชื่อแสดง *</label><input id="uf-name" value="${u.displayName||''}" placeholder="ชื่อ นามสกุล" /></div>
        <div class="form-group"><label>Username *</label><input id="uf-user" value="${u.username||''}" placeholder="username" ${isEdit?'readonly style="opacity:0.6"':''} /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input id="uf-email" type="email" value="${u.email||''}" placeholder="email@example.com" /></div>
        <div class="form-group"><label>Role *</label>
          <select id="uf-role">
            <option value="stock" ${u.role==='stock'?'selected':''}>Stock – คลังสินค้า</option>
            <option value="cashier" ${u.role==='cashier'?'selected':''}>Cashier – แคชเชียร์</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>Admin – ผู้ดูแลระบบ</option>
          </select>
        </div>
      </div>
      ${!isEdit ? `
        <div class="form-group"><label>รหัสผ่านเริ่มต้น *</label>
          <div class="password-wrap">
            <input type="password" id="uf-pass" placeholder="รหัสผ่านเริ่มต้น (ผู้ใช้เปลี่ยนได้ทีหลัง)" />
            <button type="button" class="pwd-toggle" onclick="togglePassword('uf-pass',this)">👁</button>
          </div>
        </div>
      ` : ''}
      <div style="display:flex;align-items:center;gap:10px">
        <label class="toggle"><input type="checkbox" id="uf-active" ${u.active?'checked':''}><span class="toggle-slider"></span></label>
        <span style="font-size:0.88rem">เปิดใช้งาน</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <label class="toggle"><input type="checkbox" id="uf-emp" ${u.isEmployee?'checked':''}><span class="toggle-slider"></span></label>
        <span style="font-size:0.88rem">เป็นพนักงาน (มีคลังพนักงาน)</span>
      </div>
      ${isEdit ? `
        <div class="alert alert-info">
          💡 หากต้องการรีเซ็ตรหัสผ่าน กรุณาให้ผู้ใช้เปลี่ยนเองในหน้า "เปลี่ยนรหัสผ่าน"
        </div>
      ` : ''}
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES.users.saveForm('${isEdit ? u.id : ''}')">
        ${isEdit ? '<span class="material-icons">save</span> บันทึก' : '<span class="material-icons">add</span> สร้างผู้ใช้'}
      </button>
    `);
  },

  async saveForm(id) {
    const get = (i) => document.getElementById(i);
    const data = {
      id: id || undefined,
      displayName: get('uf-name')?.value?.trim(),
      username: get('uf-user')?.value?.trim(),
      email: get('uf-email')?.value?.trim(),
      role: get('uf-role')?.value,
      active: get('uf-active')?.checked,
      isEmployee: get('uf-emp')?.checked,
      password: id ? undefined : get('uf-pass')?.value,
    };
    if (!data.displayName || !data.username) return UI.toast('กรุณากรอกชื่อและ Username', 'warning');
    if (!id && !data.password) return UI.toast('กรุณากรอกรหัสผ่านเริ่มต้น', 'warning');
    try {
      UI.loading(true);
      if (id) await API.updateUser(data);
      else await API.createUser(data);
      closeModal();
      UI.toast(id ? 'แก้ไขผู้ใช้เรียบร้อย ✅' : 'สร้างผู้ใช้เรียบร้อย ✅', 'success');
      await this.load();
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  },

  async doDelete(id) {
    const u = this._users.find(x => x.id === id);
    if (!await UI.confirm('ลบผู้ใช้', `ยืนยันลบ "${u?.displayName}"? การกระทำนี้ไม่สามารถย้อนกลับได้`, 'ลบ')) return;
    try {
      UI.loading(true);
      await API.deleteUser(id);
      UI.toast('ลบผู้ใช้เรียบร้อย ✅', 'success');
      await this.load();
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
