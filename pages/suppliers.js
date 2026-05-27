// ============================================================
// pages/suppliers.js – Supplier Management
// ============================================================

PAGES['suppliers'] = {
  _suppliers: [],

  async render() {
    const el = document.getElementById('page-suppliers');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#00796B,#004D40)">
            <span class="material-icons">local_shipping</span>
          </div>
          <div>
            <h2 class="page-title">จัดการผู้จำหน่าย</h2>
            <p class="page-subtitle">เพิ่ม ลบ หรือแก้ไขข้อมูล Supplier</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="PAGES['suppliers'].load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
          <button class="btn btn-primary btn-sm" onclick="PAGES['suppliers'].openModal()">
            <span class="material-icons">add</span> เพิ่มผู้จำหน่าย
          </button>
        </div>
      </div>
      <div id="suppliers-content">${UI.spinner()}</div>
    `;
    await this.load();
  },

  async load() {
    try {
      const res = await API.getSuppliers();
      this._suppliers = res.suppliers || [];
      this.renderTable();
    } catch(e) {
      document.getElementById('suppliers-content').innerHTML = `
        <div class="alert alert-danger">${e.message}</div>
      `;
    }
  },

  renderTable() {
    const el = document.getElementById('suppliers-content');
    if (!this._suppliers.length) {
      el.innerHTML = UI.emptyState('local_shipping', 'ไม่มีผู้จำหน่าย', 'คลิกปุ่ม "เพิ่มผู้จำหน่าย" ด้านบน');
      return;
    }
    el.innerHTML = `
      <div class="card p-0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อผู้จำหน่าย</th>
                <th>เบอร์โทร</th>
                <th>ที่อยู่</th>
                <th class="td-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${this._suppliers.map(s => `
                <tr>
                  <td class="text-muted" style="font-family:monospace">${s.id}</td>
                  <td class="td-bold">${s.name}</td>
                  <td>${s.phone || '-'}</td>
                  <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${s.address || '-'}</td>
                  <td class="td-right">
                    <button class="btn-icon" onclick="PAGES['suppliers'].openModal('${s.id}')">
                      <span class="material-icons">edit</span>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="PAGES['suppliers'].delete('${s.id}')">
                      <span class="material-icons">delete</span>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openModal(id = null) {
    let s = { id: '', name: '', address: '', phone: '', fax: '', taxId: '' };
    if (id) {
      const found = this._suppliers.find(x => x.id === id);
      if (found) s = { ...found };
    }
    const isNew = !id;

    openModal(isNew ? 'เพิ่มผู้จำหน่ายใหม่' : 'แก้ไขผู้จำหน่าย', `
      <form id="supplier-form" onsubmit="event.preventDefault(); PAGES['suppliers'].save()">
        <input type="hidden" id="sp-id" value="${s.id}" />
        
        <div class="form-group">
          <label>ชื่อผู้จำหน่าย / บริษัท *</label>
          <input type="text" id="sp-name" value="${s.name}" required />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>เบอร์โทรศัพท์</label>
            <input type="text" id="sp-phone" value="${s.phone}" />
          </div>
          <div class="form-group">
            <label>เบอร์แฟกซ์</label>
            <input type="text" id="sp-fax" value="${s.fax}" />
          </div>
        </div>

        <div class="form-group">
          <label>เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
          <input type="text" id="sp-taxid" value="${s.taxId}" />
        </div>

        <div class="form-group">
          <label>ที่อยู่</label>
          <textarea id="sp-address" rows="3">${s.address}</textarea>
        </div>
      </form>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button type="submit" form="supplier-form" class="btn btn-primary">บันทึก</button>
    `);
  },

  async save() {
    const data = {
      id: document.getElementById('sp-id').value,
      name: document.getElementById('sp-name').value,
      phone: document.getElementById('sp-phone').value,
      fax: document.getElementById('sp-fax').value,
      taxId: document.getElementById('sp-taxid').value,
      address: document.getElementById('sp-address').value,
    };
    try {
      UI.loading(true);
      if (data.id) {
        await API.updateSupplier(data);
        UI.toast('แก้ไขข้อมูลผู้จำหน่ายสำเร็จ', 'success');
      } else {
        delete data.id;
        await API.createSupplier(data);
        UI.toast('เพิ่มผู้จำหน่ายสำเร็จ', 'success');
      }
      closeModal();
      await this.load();
    } catch(e) {
      UI.toast(e.message, 'error');
    } finally {
      UI.loading(false);
    }
  },

  async delete(id) {
    if (!await UI.confirm('ลบผู้จำหน่าย', 'ยืนยันการลบผู้จำหน่ายนี้หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้', 'ลบเลย')) return;
    try {
      UI.loading(true);
      await API.deleteSupplier(id);
      UI.toast('ลบผู้จำหน่ายเรียบร้อย', 'success');
      await this.load();
    } catch(e) {
      UI.toast(e.message, 'error');
    } finally {
      UI.loading(false);
    }
  }
};
