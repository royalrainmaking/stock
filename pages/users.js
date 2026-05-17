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
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#D93025,#B71C1C)">
            <span class="material-icons">group</span>
          </div>
          <div>
            <h2 class="page-title">จัดการผู้ใช้งาน</h2>
            <p class="page-subtitle">เพิ่ม แก้ไข และกำหนดสิทธิ์การใช้งานของพนักงาน</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="PAGES.users.openAdd()">
            <span class="material-icons">person_add</span> เพิ่มผู้ใช้ใหม่
          </button>
        </div>
      </div>

      <div class="filter-card">
        <form onsubmit="event.preventDefault()">
          <div class="form-group" style="flex:1;min-width:260px">
            <label>ค้นหาผู้ใช้งาน</label>
            <input type="text" placeholder="ค้นหาชื่อ, Username หรืออีเมล..." oninput="PAGES.users.doSearch(this.value)" />
          </div>
          <button type="button" class="btn btn-secondary btn-sm" style="height:42px" onclick="PAGES.users.load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
        </form>
      </div>
      <div class="card">
        <div id="users-table">${UI.skeletonTable(5, 5)}</div>
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
      <div class="stats-grid mb-16">
        <div class="stat-card purple"><div class="stat-bg-icon"><span class="material-icons">people</span></div><div class="stat-label">ผู้ใช้ทั้งหมด</div><div class="stat-value text-primary-color">${this._users.length}</div></div>
        <div class="stat-card green"><div class="stat-bg-icon"><span class="material-icons">admin_panel_settings</span></div><div class="stat-label">Admin</div><div class="stat-value" style="color:var(--primary-light)">${roleCounts.admin}</div></div>
        <div class="stat-card orange"><div class="stat-bg-icon"><span class="material-icons">inventory_2</span></div><div class="stat-label">Stock</div><div class="stat-value" style="color:var(--accent)">${roleCounts.stock}</div></div>
        <div class="stat-card pink"><div class="stat-bg-icon"><span class="material-icons">point_of_sale</span></div><div class="stat-label">Cashier</div><div class="stat-value" style="color:var(--secondary)">${roleCounts.cashier}</div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>Avatar</th><th>ชื่อแสดง / ชื่อจริง</th><th>Username</th>
            <th>เบอร์โทร / Email</th><th>Role</th><th>เงินประกัน</th><th>สถานะ</th><th class="td-center">จัดการ</th>
          </tr></thead>
          <tbody>
            ${data.map((u, i) => `
              <tr>
                <td class="text-muted">${i+1}</td>
                <td>
                  ${UI.avatar(u.avatar, u.displayName || u.username, 36)}
                </td>
                <td>
                  <div class="td-bold">${u.displayName || '-'}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">${u.fullName || ''}</div>
                </td>
                <td><code style="color:var(--primary-light);font-size:0.82rem">${u.username}</code></td>
                <td>
                  <div style="font-size:0.85rem">${u.phone || '-'}</div>
                  <div style="font-size:0.72rem;color:var(--text-muted)">${u.email || '-'}</div>
                </td>
                <td>${UI.roleBadge(u.role)}</td>
                <td class="td-right">฿${UI.currency(u.deposit || 0)}</td>
                <td>
                  <div style="display:flex;flex-direction:column;gap:4px">
                    <div>
                      <span class="status-dot ${u.active ? 'dot-green' : 'dot-red'}"></span>
                      <span style="font-size:0.85rem">${u.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</span>
                    </div>
                    ${u.whActive !== null ? `
                      <div style="font-size:0.72rem;color:var(--text-muted);display:flex;align-items:center;gap:4px">
                        <span class="status-dot ${u.whActive ? 'dot-green' : 'dot-red'}" style="width:6px;height:6px"></span>
                        ${u.whName}: ${u.whActive ? 'เปิด' : 'ปิด'}
                      </div>
                    ` : ''}
                  </div>
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
    const u = user || { username: '', displayName: '', fullName: '', phone: '', email: '', address: '', avatar: '', role: 'stock', active: true, isEmployee: false, deposit: 0 };
    openModal(isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่', `
      <div class="form-row">
        <div class="form-group"><label>ชื่อในระบบ (Display Name) *</label><input id="uf-name" value="${u.displayName||''}" placeholder="ชื่อเรียกสั้นๆ" /></div>
        <div class="form-group"><label>Username *</label><input id="uf-user" value="${u.username||''}" placeholder="username" ${isEdit?'readonly style="opacity:0.6"':''} /></div>
      </div>
      <div class="form-group"><label>ชื่อ-นามสกุล (Full Name) *</label><input id="uf-fullname" value="${u.fullName||''}" placeholder="ชื่อ และ นามสกุล จริง" /></div>
      <div class="form-row">
        <div class="form-group"><label>เบอร์โทรศัพท์</label><input id="uf-phone" value="${u.phone||''}" placeholder="08x-xxx-xxxx" /></div>
        <div class="form-group"><label>Email</label><input id="uf-email" type="email" value="${u.email||''}" placeholder="email@example.com" /></div>
      </div>
      <div class="form-group"><label>ที่อยู่</label><textarea id="uf-address" rows="2" placeholder="ที่อยู่ปัจจุบัน">${u.address||''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Role *</label>
          <select id="uf-role">
            <option value="admin" ${u.role==='admin'?'selected':''}>Admin – ผู้ดูแลระบบ</option>
            <option value="stock" ${u.role==='stock'?'selected':''}>Stock – คลังสินค้ากลาง</option>
            <option value="cashier" ${u.role==='cashier'?'selected':''}>Cashier – แคชเชียร์</option>
            <option value="employee" ${u.role==='employee'?'selected':''}>Employee – พนักงานทั่วไป</option>
            <option value="sell" ${u.role==='sell'?'selected':''}>Sales – พนักงานขาย</option>
            <option value="customer" ${u.role==='customer'?'selected':''}>Customer – ลูกค้า/ตัวแทน</option>
            <option value="part_time" ${u.role==='part_time'?'selected':''}>Part-time – พนักงานชั่วคราว</option>
          </select>
        </div>
        <div class="form-group"><label>เงินประกันสินค้า (บาท)</label><input type="number" id="uf-deposit" value="${u.deposit||0}" step="100" /></div>
      </div>
      <div class="form-group"><label>รูปภาพ Profile (URL)</label><input id="uf-avatar" value="${u.avatar||''}" placeholder="https://..." /></div>
      ${!isEdit ? `
        <div class="form-group"><label>รหัสผ่านเริ่มต้น *</label>
          <div class="password-wrap">
            <input type="password" id="uf-pass" placeholder="รหัสผ่านเริ่มต้น (ผู้ใช้สามารถเปลี่ยนทีหลังได้)" />
            <button type="button" class="pwd-toggle" onclick="togglePassword('uf-pass',this)">
              <span class="material-icons">visibility</span>
            </button>
          </div>
        </div>
      ` : ''}
      <div style="display:flex;gap:24px;margin-top:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <label class="toggle"><input type="checkbox" id="uf-active" ${u.active?'checked':''}><span class="toggle-slider"></span></label>
          <span style="font-size:0.88rem">เปิดใช้งาน</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <label class="toggle"><input type="checkbox" id="uf-emp" ${u.isEmployee?'checked':''}><span class="toggle-slider"></span></label>
          <span style="font-size:0.88rem">เป็นพนักงานขาย/เบิกสินค้าได้</span>
        </div>
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
      fullName: get('uf-fullname')?.value?.trim(),
      username: get('uf-user')?.value?.trim(),
      phone: get('uf-phone')?.value?.trim(),
      email: get('uf-email')?.value?.trim(),
      address: get('uf-address')?.value?.trim(),
      avatar: get('uf-avatar')?.value?.trim(),
      role: get('uf-role')?.value,
      active: get('uf-active')?.checked,
      isEmployee: get('uf-emp')?.checked,
      deposit: Number(get('uf-deposit')?.value) || 0,
      password: id ? undefined : get('uf-pass')?.value,
    };
    if (!data.displayName || !data.fullName || !data.username) return UI.toast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
    if (!id && !data.password) return UI.toast('กรุณากรอกรหัสผ่านเริ่มต้น', 'warning');
    try {
      UI.loading(true);
      if (id) await API.updateUser(data);
      else await API.createUser(data);
      closeModal();
      UI.toast(id ? 'แก้ไขผู้ใช้เรียบร้อย ✅' : 'สร้างผู้ใช้เรียบร้อย ✅', 'success');

      // Live-update current user's top-right profile header if they edited themselves
      const currentUser = AUTH.getUser();
      if (id && currentUser && currentUser.id === id) {
        const updatedUser = { ...currentUser, ...data };
        AUTH.setSession(AUTH.getToken(), updatedUser);
        document.getElementById('nav-username').textContent = updatedUser.displayName || updatedUser.username;
        const navAvatar = document.getElementById('nav-avatar');
        if (navAvatar) {
          navAvatar.style.background = 'none';
          navAvatar.innerHTML = UI.avatar(updatedUser.avatar, updatedUser.displayName || updatedUser.username, 36);
        }
      }

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
