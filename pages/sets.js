// ============================================================
// pages/sets.js – Product Sets management (Admin only)
// ============================================================

PAGES['sets'] = {
  _sets: [],
  _search: '',

  async render() {
    const el = document.getElementById('page-sets');
    el.innerHTML = `
      <div id="sets-list-view">
        <div class="page-header">
          <div class="page-title-wrap">
            <div class="page-title-icon" style="background:#E3F2FD;color:#1976D2">
              <span class="material-icons">collections_bookmark</span>
            </div>
            <div>
              <h2 class="page-title">จัดการเซ็ตสินค้า</h2>
              <p class="page-subtitle">สร้างและแก้ไขการจัดเซ็ตสินค้าสำหรับเบิก</p>
            </div>
          </div>
          <div class="page-actions" style="display:flex;gap:10px">
            <button class="btn btn-primary" onclick="PAGES.sets.openAdd()">
              <span class="material-icons">add_circle</span> เพิ่มเซ็ตใหม่
            </button>
          </div>
        </div>

        <div class="filter-card">
          <form onsubmit="event.preventDefault()">
            <div class="form-group" style="flex:1;min-width:260px">
              <label>ค้นหาเซ็ต</label>
              <input type="text" placeholder="ค้นหาด้วยชื่อเซ็ต หรือรหัส..." id="set-search" oninput="PAGES.sets.doSearch(this.value)" />
            </div>
            <button type="button" class="btn btn-secondary btn-sm" style="height:42px" onclick="PAGES.sets.load()">
              <span class="material-icons">refresh</span> รีเฟรช
            </button>
          </form>
        </div>
        <div class="card">
          <div id="sets-table">${UI.skeletonTable(4, 5)}</div>
        </div>
      </div>
      
      <div id="sets-form-view" style="display:none"></div>
    `;
    await this.load();
  },

  async load() {
    try {
      await MASTER_DATA.load();
      const res = await API.getSets();
      this._sets = res.sets || [];
      this.renderTable();
    } catch (e) {
      document.getElementById('sets-table').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  doSearch(v) {
    this._search = v.toLowerCase();
    this.renderTable();
  },

  filtered() {
    if (!this._search) return this._sets;
    return this._sets.filter(s =>
      s.name.toLowerCase().includes(this._search) ||
      s.code.toLowerCase().includes(this._search)
    );
  },

  renderTable() {
    const data = this.filtered();
    if (!data.length) {
      document.getElementById('sets-table').innerHTML = UI.emptyState('collections_bookmark', 'ไม่พบเซ็ตสินค้า', 'ลองเปลี่ยนคำค้นหา หรือเพิ่มเซ็ตใหม่');
      return;
    }

    document.getElementById('sets-table').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th>
            <th>รายละเอียดเซ็ต</th>
            <th>รายการสินค้าในเซ็ต</th>
            <th class="td-center">จัดการ</th>
          </tr></thead>
          <tbody>
            ${data.map((s, i) => `
              <tr style="transition:var(--transition)" 
                  onpointerenter="this.style.background='var(--bg-hover)'" 
                  onpointerleave="this.style.background='transparent'">
                <td class="text-muted">${i + 1}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:12px">
                    ${UI.image(s.imageUrl, '', 'width:40px;height:40px;object-fit:cover;border-radius:4px;')}
                    <div>
                      <div style="font-weight:600">${s.code}</div>
                      <div style="font-size:0.85rem;color:var(--text-secondary)">${s.name}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style="display:flex;flex-wrap:wrap;gap:4px">
                  ${(s.items || []).map(it => `<span class="badge badge-gray" style="font-size:0.75rem">${it.category} x${it.qty} ${it.unit}</span>`).join('')}
                  </div>
                </td>
                <td class="td-center">
                  <div style="display:flex;gap:6px;justify-content:center">
                    <button class="btn btn-secondary btn-icon" onclick="PAGES.sets.openEdit('${s.id}')" title="แก้ไข"><span class="material-icons" style="font-size:16px">edit</span></button>
                    <button class="btn btn-danger btn-icon" onclick="PAGES.sets.doDelete('${s.id}')" title="ลบ"><span class="material-icons" style="font-size:16px">delete</span></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="text-muted mt-8" style="font-size:0.82rem">แสดง ${data.length} รายการ</div>
    `;
  },

  openAdd() { this._openForm(null); },
  openEdit(id) { this._openForm(this._sets.find(s => s.id === id)); },

  _openForm(setObj) {
    const isEdit = !!setObj;
    const s = setObj || { code: '', name: '', items: [] };

    // Store items temporarily for editing
    this._tempItems = [...(s.items || [])];

    document.getElementById('sets-list-view').style.display = 'none';
    const formView = document.getElementById('sets-form-view');
    formView.style.display = 'block';

    formView.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <button class="btn btn-secondary btn-icon" onclick="PAGES.sets.closeForm()" style="margin-right:12px">
            <span class="material-icons">arrow_back</span>
          </button>
          <div class="page-title-icon" style="background:#E3F2FD;color:#1976D2">
            <span class="material-icons">${isEdit ? 'edit' : 'add_circle'}</span>
          </div>
          <div>
            <h2 class="page-title">${isEdit ? 'แก้ไขเซ็ตสินค้า' : 'เพิ่มเซ็ตใหม่'}</h2>
            <p class="page-subtitle">${isEdit ? 'รหัสเซ็ต: ' + s.code : 'ระบุรายละเอียดเซ็ตที่ต้องการสร้าง'}</p>
          </div>
        </div>
        <div class="page-actions" style="display:flex;gap:10px">
          <button class="btn btn-secondary" onclick="PAGES.sets.closeForm()">ยกเลิก</button>
          <button class="btn btn-primary" onclick="PAGES.sets.saveForm('${isEdit ? s.id : ''}')">
            ${isEdit ? '<span class="material-icons">save</span> บันทึกข้อมูล' : '<span class="material-icons">add</span> บันทึก'}
          </button>
        </div>
      </div>
      
      <div class="card" style="margin-bottom:20px">
        <h3 style="margin-top:0;margin-bottom:16px;font-size:1.1rem;color:var(--text-primary)">ข้อมูลทั่วไป</h3>
        <div class="form-row">
          <div class="form-group"><label>รหัสเซ็ต *</label><input id="set-code" value="${s.code}" placeholder="เช่น S-001" /></div>
          <div class="form-group"><label>ชื่อเซ็ต *</label><input id="set-name" value="${s.name}" placeholder="เช่น Set 1 (นม 85ml)" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>URL รูปภาพ (ไม่บังคับ)</label><input id="set-imageUrl" value="${s.imageUrl || ''}" placeholder="https://..." /></div>
        </div>
      </div>
      
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="margin:0;font-size:1.1rem;color:var(--text-primary)">รายการสินค้าในเซ็ต</h3>
          <button class="btn btn-secondary btn-sm" onclick="PAGES.sets.addRuleRow()">
            <span class="material-icons">add</span> เพิ่มหมวดหมู่
          </button>
        </div>
        
        <div id="set-rules-container">
          <!-- Rules will be rendered here -->
        </div>
      </div>
    `;

    this.renderRules();
  },

  closeForm() {
    document.getElementById('sets-form-view').style.display = 'none';
    document.getElementById('sets-list-view').style.display = 'block';
  },

  renderRules() {
    const container = document.getElementById('set-rules-container');
    if (!container) return;

    if (this._tempItems.length === 0) {
      container.innerHTML = `<div class="alert alert-info text-center" style="font-size:0.85rem">ยังไม่มีรายการสินค้าในเซ็ต กดปุ่ม "เพิ่มหมวดหมู่" ด้านบน</div>`;
      return;
    }

    // Use the existing categories from products
    const categories = [...new Set(MASTER_DATA.products.map(p => p.category).filter(Boolean))];
    const unitOptions = ['ขวด', 'ถ้วย', 'ชิ้น', 'แพ็ค', 'กล่อง', 'ถุง'];

    container.innerHTML = this._tempItems.map((rule, index) => {
      const categoryProducts = rule.category ? MASTER_DATA.products.filter(p => p.category === rule.category) : [];
      const allowedHtml = categoryProducts.length > 0 ? `
        <div style="width:100%; margin-top:12px; font-size:0.8rem; background:var(--bg-card); padding:12px; border-radius:6px; border:1px solid var(--border);">
          <div style="font-weight:600; margin-bottom:10px; color:var(--text-secondary)">เฉพาะสินค้าที่อนุญาตในหมวดนี้:</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:8px;">
            ${categoryProducts.map(p => {
        const isChecked = !rule.allowedProducts || rule.allowedProducts.includes(p.id);
        return `
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer; background:var(--bg-body); padding:8px; border-radius:6px; border:1px solid var(--border); transition:var(--transition);"
                       onpointerenter="this.style.borderColor='var(--primary)'" onpointerleave="this.style.borderColor='var(--border)'">
                  <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="PAGES.sets.toggleProduct('${index}', '${p.id}', this.checked)" />
                  <img src="${p.imageUrl || 'https://via.placeholder.com/60?text=No+Img'}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;flex-shrink:0;border:1px solid #eee" onerror="this.src='https://via.placeholder.com/60?text=No+Img'" />
                  <div style="display:flex; flex-direction:column; overflow:hidden;">
                    <div style="font-weight:600; font-size:0.8rem; color:var(--text-primary); line-height:1.2;">${p.name}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;"><span style="font-family:monospace">[${p.code || '-'}]</span> ${p.category || ''}</div>
                  </div>
                </label>
              `;
      }).join('')}
          </div>
        </div>
      ` : '';

      return `
      <div class="form-row" style="background:var(--bg-card2); padding:12px; border-radius:8px; margin-bottom:8px; align-items:flex-start; flex-wrap:wrap">
        <div style="display:flex; flex:1; width:100%; gap:8px; align-items:flex-end;">
          <div class="form-group" style="flex:2">
            <label style="font-size:0.75rem">หมวดหมู่สินค้า</label>
            <select class="rule-cat" onchange="PAGES.sets.updateRule(${index}, 'category', this.value)">
              <option value="">-- เลือกหมวดหมู่ --</option>
              ${categories.map(c => `<option value="${c}" ${rule.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1">
            <label style="font-size:0.75rem">จำนวน</label>
            <input type="number" min="1" class="rule-qty" value="${rule.qty || 1}" oninput="PAGES.sets.updateRule(${index}, 'qty', Number(this.value))" />
          </div>
          <div class="form-group" style="flex:1">
            <label style="font-size:0.75rem">หน่วย</label>
            <select class="rule-unit" onchange="PAGES.sets.updateRule(${index}, 'unit', this.value)">
              ${unitOptions.map(u => `<option value="${u}" ${rule.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-danger btn-icon" style="height:42px; width:42px; margin-bottom:6px" onclick="PAGES.sets.removeRuleRow(${index})">
            <span class="material-icons" style="font-size:18px">delete</span>
          </button>
        </div>
        ${allowedHtml}
      </div>
    `}).join('');
  },

  addRuleRow() {
    this._tempItems.push({ category: '', qty: 1, unit: 'ขวด' });
    this.renderRules();
  },

  removeRuleRow(index) {
    this._tempItems.splice(index, 1);
    this.renderRules();
  },

  updateRule(index, field, value) {
    if (this._tempItems[index]) {
      this._tempItems[index][field] = value;
      if (field === 'category') {
        delete this._tempItems[index].allowedProducts;
        this.renderRules();
      }
    }
  },

  toggleProduct(index, productId, isChecked) {
    const rule = this._tempItems[index];
    if (!rule) return;
    if (!rule.allowedProducts) {
      const allProds = MASTER_DATA.products.filter(p => p.category === rule.category).map(p => p.id);
      rule.allowedProducts = allProds;
    }

    if (isChecked) {
      if (!rule.allowedProducts.includes(productId)) rule.allowedProducts.push(productId);
    } else {
      rule.allowedProducts = rule.allowedProducts.filter(id => id !== productId);
    }
  },

  async saveForm(id) {
    const data = {
      id: id || undefined,
      code: document.getElementById('set-code').value.trim(),
      name: document.getElementById('set-name').value.trim(),
      imageUrl: document.getElementById('set-imageUrl')?.value.trim() || '',
      items: this._tempItems
    };

    if (!data.code || !data.name) return UI.toast('กรุณากรอกรหัสและชื่อเซ็ต', 'warning');

    // Filter out incomplete rules
    const validItems = this._tempItems.filter(item => item.category && item.category.trim() !== '' && item.qty > 0);
    if (validItems.length === 0) return UI.toast('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ', 'warning');

    data.items = validItems;

    try {
      UI.loading(true);
      if (id) await API.updateSet(data);
      else await API.createSet(data);
      this.closeForm();
      UI.toast(id ? 'แก้ไขเซ็ตเรียบร้อย ✅' : 'เพิ่มเซ็ตเรียบร้อย ✅', 'success');
      await this.load();
      await MASTER_DATA.load(); // Refresh global data
    } catch (e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  },

  async doDelete(id) {
    const s = this._sets.find(x => x.id === id);
    if (!await UI.confirm('ลบเซ็ตสินค้า', `ยืนยันลบเซ็ต "${s?.name}"?`, 'ลบ')) return;
    try {
      UI.loading(true);
      await API.deleteSet(id);
      UI.toast('ลบเซ็ตสินค้าเรียบร้อย ✅', 'success');
      await this.load();
      await MASTER_DATA.load(); // Refresh global data
    } catch (e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
