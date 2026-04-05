// ============================================================
// pages/warehouses.js – Warehouse management (Admin)
// ============================================================

PAGES['warehouses'] = {
  _warehouses: [],
  _users: [],

  async render() {
    const el = document.getElementById('page-warehouses');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">จัดการคลัง</h2>
          <p class="page-subtitle">เพิ่ม / ลบ คลังกลางและคลังพนักงาน</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-accent" onclick="PAGES.warehouses.openAdd('central')"><span class="material-icons">warehouse</span> เพิ่มคลังกลาง</button>
          <button class="btn btn-primary" onclick="PAGES.warehouses.openAdd('employee')"><span class="material-icons">person_pin</span> เพิ่มคลังพนักงาน</button>
        </div>
      </div>
      <div id="wh-body">${UI.spinner()}</div>
    `;
    await this.load();
  },

  async load() {
    try {
      const [whr, ur] = await Promise.all([API.getWarehouses(), API.getUsers()]);
      this._warehouses = whr.warehouses || [];
      this._users = ur.users || [];
      this.renderBody();
    } catch(e) {
      document.getElementById('wh-body').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  renderBody() {
    const central = this._warehouses.filter(w => w.type === 'central');
    const employee = this._warehouses.filter(w => w.type === 'employee');

    document.getElementById('wh-body').innerHTML = `
      <div class="grid-2">
        <!-- Central Warehouses -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <h3 style="font-size:1rem;font-weight:700"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warehouse</span>คลังกลาง (${central.length})</h3>
            <button class="btn btn-accent btn-sm" onclick="PAGES.warehouses.openAdd('central')">+ เพิ่ม</button>
          </div>
          ${central.length ? central.map(w => this._whCard(w)).join('') : UI.emptyState('warehouse', 'ยังไม่มีคลังกลาง', '')}
        </div>
        <!-- Employee Warehouses -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <h3 style="font-size:1rem;font-weight:700"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">person_pin</span>คลังพนักงาน (${employee.length})</h3>
            <button class="btn btn-primary btn-sm" onclick="PAGES.warehouses.openAdd('employee')">+ เพิ่ม</button>
          </div>
          ${employee.length ? employee.map(w => this._whCard(w)).join('') : UI.emptyState('person_pin', 'ยังไม่มีคลังพนักงาน', '')}
        </div>
      </div>
    `;
  },

  _whCard(w) {
    const emp = w.type === 'employee' ? this._users.find(u => u.id === w.employeeId) : null;
    return `
      <div class="card mb-16" style="border-left:3px solid ${w.type==='central'?'var(--accent)':'var(--primary)'}">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div class="fw-bold">${w.name}</div>
            ${w.location ? `<div style="font-size:0.78rem;color:var(--text-muted)"><span class="material-icons" style="font-size:13px;vertical-align:middle">location_on</span> ${w.location}</div>` : ''}
            ${emp ? `<div style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px"><span class="material-icons" style="font-size:13px;vertical-align:middle">person</span> ${emp.displayName}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge ${w.active ? 'badge-green' : 'badge-gray'}">${w.active ? 'ใช้งาน' : 'ปิด'}</span>
            <button class="btn btn-secondary btn-xs" onclick="PAGES.warehouses.openEdit('${w.id}')"><span class="material-icons">edit</span></button>
            <button class="btn btn-danger btn-xs" onclick="PAGES.warehouses.doDelete('${w.id}')"><span class="material-icons">delete</span></button>
          </div>
        </div>
      </div>
    `;
  },

  openAdd(type) { this._openForm(null, type); },
  openEdit(id) { this._openForm(this._warehouses.find(w => w.id === id)); },

  _openForm(wh, defaultType = 'central') {
    const isEdit = !!wh;
    const w = wh || { name: '', type: defaultType, location: '', employeeId: '', active: true };
    const empUsers = this._users.filter(u => u.isEmployee || u.role === 'stock');
    openModal(isEdit ? 'แก้ไขคลัง' : 'เพิ่มคลังใหม่', `
      <div class="form-group"><label>ประเภทคลัง</label>
        <select id="wf-type" onchange="PAGES.warehouses.onTypeChange(this.value)">
          <option value="central" ${w.type==='central'?'selected':''}>คลังกลาง</option>
          <option value="employee" ${w.type==='employee'?'selected':''}>คลังพนักงาน</option>
        </select>
      </div>
      <div class="form-group"><label>ชื่อคลัง *</label>
        <input id="wf-name" value="${w.name||''}" placeholder="เช่น คลัง 1 (สาขา 00001)" />
      </div>
      <div class="form-group"><label>สถานที่ / สาขา</label>
        <input id="wf-loc" value="${w.location||''}" placeholder="เช่น DMP" />
      </div>
      <div id="wf-emp-group" ${w.type!=='employee'?'style="display:none"':''}>
        <div class="form-group"><label>พนักงานที่รับผิดชอบ</label>
          <select id="wf-emp">
            <option value="">-- เลือกพนักงาน --</option>
            ${empUsers.map(u => `<option value="${u.id}" ${w.employeeId===u.id?'selected':''}>${u.displayName} (${u.username})</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <label class="toggle"><input type="checkbox" id="wf-active" ${w.active?'checked':''}><span class="toggle-slider"></span></label>
        <span style="font-size:0.88rem">เปิดใช้งาน</span>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES.warehouses.saveForm('${isEdit ? w.id : ''}')">
        ${isEdit ? '<span class="material-icons">save</span> บันทึก' : '<span class="material-icons">add</span> สร้างคลัง'}
      </button>
    `);
  },

  onTypeChange(type) {
    const g = document.getElementById('wf-emp-group');
    if (g) g.style.display = type === 'employee' ? '' : 'none';
  },

  async saveForm(id) {
    const data = {
      id: id || undefined,
      name: document.getElementById('wf-name')?.value?.trim(),
      type: document.getElementById('wf-type')?.value,
      location: document.getElementById('wf-loc')?.value?.trim(),
      employeeId: document.getElementById('wf-emp')?.value || '',
      active: document.getElementById('wf-active')?.checked,
    };
    if (!data.name) return UI.toast('กรุณากรอกชื่อคลัง', 'warning');
    try {
      UI.loading(true);
      if (id) await API.updateWarehouse(data);
      else await API.createWarehouse(data);
      closeModal();
      UI.toast(id ? 'แก้ไขคลังเรียบร้อย ✅' : 'สร้างคลังเรียบร้อย ✅', 'success');
      await this.load();
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  },

  async doDelete(id) {
    const w = this._warehouses.find(x => x.id === id);
    if (!await UI.confirm('ลบคลัง', `ยืนยันลบคลัง "${w?.name}"? สินค้าในคลังนี้จะถูกลบด้วย`, 'ลบ')) return;
    try {
      UI.loading(true);
      await API.deleteWarehouse(id);
      UI.toast('ลบคลังเรียบร้อย ✅', 'success');
      await this.load();
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
