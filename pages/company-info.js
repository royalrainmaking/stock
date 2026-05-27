// ============================================================
// pages/company-info.js – Company Info Management
// ============================================================

PAGES['company-info'] = {
  _info: null,

  async render() {
    const el = document.getElementById('page-company-info');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#3F51B5,#1A237E)">
            <span class="material-icons">business</span>
          </div>
          <div>
            <h2 class="page-title">ข้อมูลบริษัท</h2>
            <p class="page-subtitle">ตั้งค่าและแก้ไขรายละเอียดของบริษัท</p>
          </div>
        </div>
      </div>
      <div id="company-content" class="grid-2">
        ${UI.spinner()}
      </div>
    `;
    await this.load();
  },

  async load() {
    try {
      const res = await API.getCompanyInfo();
      this._info = res.companyInfo || { name: '', address: '', phone: '', fax: '', taxId: '' };
      this.renderForm();
    } catch(e) {
      document.getElementById('company-content').innerHTML = `
        <div class="alert alert-danger">${e.message}</div>
      `;
    }
  },

  renderForm() {
    const el = document.getElementById('company-content');
    const info = this._info;
    el.innerHTML = `
      <div class="card">
        <div class="card-title">แก้ไขข้อมูลบริษัท</div>
        <form id="company-form" onsubmit="event.preventDefault(); PAGES['company-info'].save()">
          <div class="form-group">
            <label>ชื่อบริษัท *</label>
            <input type="text" id="ci-name" value="${info.name || ''}" required />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>เบอร์โทรศัพท์</label>
              <input type="text" id="ci-phone" value="${info.phone || ''}" />
            </div>
            <div class="form-group">
              <label>เบอร์แฟกซ์</label>
              <input type="text" id="ci-fax" value="${info.fax || ''}" />
            </div>
          </div>

          <div class="form-group">
            <label>เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
            <input type="text" id="ci-taxid" value="${info.taxId || ''}" />
          </div>

          <div class="form-group">
            <label>ที่อยู่</label>
            <textarea id="ci-address" rows="4">${info.address || ''}</textarea>
          </div>

          <div style="margin-top:24px;text-align:right">
            <button type="submit" class="btn btn-primary" style="min-width:150px">
              <span class="material-icons">save</span> บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
      <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:var(--bg-card2)">
        <div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#3F51B5,#1A237E);display:flex;align-items:center;justify-content:center;color:#fff;margin-bottom:20px">
          <span class="material-icons" style="font-size:60px">business</span>
        </div>
        <h3 style="margin-bottom:8px">${info.name || 'ไม่มีชื่อบริษัท'}</h3>
        <p style="color:var(--text-muted);font-size:0.9rem">${info.taxId ? 'TAX ID: '+info.taxId : ''}</p>
        <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:10px">${info.address || ''}</p>
      </div>
    `;
  },

  async save() {
    const data = {
      name: document.getElementById('ci-name').value,
      phone: document.getElementById('ci-phone').value,
      fax: document.getElementById('ci-fax').value,
      taxId: document.getElementById('ci-taxid').value,
      address: document.getElementById('ci-address').value,
    };
    try {
      UI.loading(true);
      await API.saveCompanyInfo(data);
      UI.toast('บันทึกข้อมูลบริษัทสำเร็จ', 'success');
      await this.load();
    } catch(e) {
      UI.toast(e.message, 'error');
    } finally {
      UI.loading(false);
    }
  }
};
