// ============================================================
// pages/consign.js – Consign goods back from employee
// ============================================================

PAGES['consign'] = {
  _employeeWarehouses: [],
  _employeeStock: [],
  _items: [],
  _selectedWh: '',

  async render() {
    const el = document.getElementById('page-consign');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#E91E8C,#AD1457)">
            <span class="material-icons">assignment_return</span>
          </div>
          <div>
            <h2 class="page-title">รับฝากสินค้าคืน</h2>
            <p class="page-subtitle">บันทึกสินค้าที่พนักงานฝากคืนเข้าระบบ</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="showPage('movement-history')">
            <span class="material-icons">history</span> ดูประวัติการทำรายการ
          </button>
        </div>
      </div>
      <div class="grid-2">
        <!-- 1. Source Info -->
        <div class="card step-card">
          <div class="step-badge">1</div>
          <div class="card-title"><span class="material-icons" style="color:#E91E8C">person_pin</span>คลังพนักงาน</div>
          <div class="form-group">
            <label>เลือกพนักงานที่ฝากคืน *</label>
            <div id="co-emp-picker-btn" class="product-picker-trigger" onclick="PAGES.consign.openEmployeePicker()">
              <div id="co-emp-thumb" class="product-thumb-preview" style="border-radius:50%;overflow:hidden;background:var(--bg-card2);display:flex;align-items:center;justify-content:center"><span class="material-icons">person</span></div>
              <div class="product-info-preview">
                <div id="co-emp-name" class="p-name">คลิกเพื่อเลือกพนักงาน</div>
                <div id="co-emp-meta" class="p-meta">เลือกว่ารับฝากสินค้าคืนจากใคร</div>
              </div>
            </div>
            <input type="hidden" id="co-wh" value="" />
          </div>
        </div>

        <!-- 2. Configuration -->
        <div class="card step-card">
          <div class="step-badge">2</div>
          <div class="card-title"><span class="material-icons" style="color:#1A73E8">edit_note</span>ข้อมูลการฝาก</div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label>วันที่ทำรายการ</label>
              ${AUTH.isAdmin() 
                ? `<input type="date" id="co-date" value="${new Date().toISOString().split('T')[0]}" style="height:45px; width:100%; border-radius:12px; padding:0 16px; border:1px solid var(--border)" />`
                : `<div id="co-date-display" style="padding:10px 14px; background:var(--bg-card2); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:0.95rem; font-weight:700; color:var(--text-secondary)"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">lock_clock</span> <span id="co-date-text"></span></div>`
              }
            </div>
            <div class="form-group"><label>เวลา</label>
              ${AUTH.isAdmin()
                ? `<input type="time" id="co-time" value="${new Date().toTimeString().substring(0,5)}" style="height:45px; width:100%; border-radius:12px; padding:0 16px; border:1px solid var(--border)" />`
                : `<div id="co-time-display" style="padding:10px 14px; background:var(--bg-card2); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:0.95rem; font-weight:700; color:var(--primary)"><span id="co-time-text"></span> น.</div>`
              }
            </div>
          </div>
          <div class="form-group"><label>หมายเหตุ</label>
            <textarea id="co-note" rows="2" placeholder="เหตุผลการฝากหรือรายละเอียดเพิ่มเติม..." style="border-radius:12px; padding:12px"></textarea>
          </div>
        </div>
      </div>

      <!-- 3. Product Selection -->
      <div class="card mt-16 step-card">
        <div class="step-badge">3</div>
        <div class="card-title"><span class="material-icons" style="color:#00897B">inventory</span>เลือกรายการสินค้า</div>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px">กรุณาเลือกคลังพนักงาน (ด้านบน) ก่อนกดเลือกสินค้า</p>
        <button id="co-picker-btn" class="btn btn-primary btn-full btn-picker-disabled" style="height:60px; font-size:1.1rem; border-radius:16px; box-shadow:var(--shadow-lg)" onclick="PAGES.consign.openProductPicker()" disabled>
          <span class="material-icons" style="font-size:24px; margin-right:8px">lock</span> กรุณาเลือกคลังพนักงานก่อน
        </button>
      </div>

      <!-- 4. Summary -->
      <div class="card mt-16 step-card">
        <div class="step-badge">4</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
          <div class="card-title" style="margin:0">4. รายการที่ต้องการฝากคืน</div>
          <button class="btn btn-primary" onclick="PAGES.consign.submit()">
            <span class="material-icons">check_circle</span> ยืนยันการบันทึกรับฝากคืน
          </button>
        </div>
        <div id="co-items-list">
          ${UI.emptyState('undo', 'ยังไม่มีรายการ', 'กรุณาเลือกพนักงานและเพิ่มสินค้าที่จะฝากคืน')}
        </div>
      </div>
    `;
    const thumb = document.getElementById('co-emp-thumb');
    if (thumb) thumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';

    await this.loadWarehouses();

    // Live clock
    this._updateClock();
    if (this._clockInterval) clearInterval(this._clockInterval);
    this._clockInterval = setInterval(() => this._updateClock(), 1000);
  },

  _updateClock() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const el = document.getElementById('co-datetime-text');
    if (el) el.textContent = `${dd}/${mm}/${yyyy}   ${hh}:${min}`;
    const dateText = document.getElementById('co-date-text');
    const timeText = document.getElementById('co-time-text');
    if (dateText) dateText.textContent = `${dd}/${mm}/${yyyy}`;
    if (timeText) timeText.textContent = `${hh}:${min}`;
  },

  async loadWarehouses() {
    try {
      const res = await API.getWarehouses();
      this._employeeWarehouses = (res.warehouses || []).filter(w => w.type === 'employee');

      const thumb = document.getElementById('co-emp-thumb');
      if (thumb && !this._selectedWh) {
        thumb.innerHTML = '<span class="material-icons">person</span>';
      }
    } catch(e) {
      UI.toast('โหลดรายชื่อพนักงานไม่สำเร็จ', 'error');
    }
  },

  openEmployeePicker() {
    if (!this._employeeWarehouses || !this._employeeWarehouses.length) return UI.toast('ไม่พบคลังพนักงานในระบบ', 'info');
    
    const html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding-top:8px;">
      ${this._employeeWarehouses.map(w => {
        const avHtml = UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40);
          
        return `
          <div class="card" style="cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);transition:all 0.2s" onclick="PAGES.consign.selectEmployee('${w.id}')" onpointerenter="this.style.borderColor='var(--primary)';this.style.transform='translateY(-2px)'" onpointerleave="this.style.borderColor='var(--border)';this.style.transform='none'">
            ${avHtml}
            <div>
              <div style="font-weight:700;font-size:0.95rem">${w.employeeName || 'พนักงาน'}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${w.name}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>`;
    openModal('เลือกพนักงานที่ฝากคืน', html, `<button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>`);
  },

  selectEmployee(whId) {
    const w = this._employeeWarehouses.find(x => x.id === whId);
    if (!w) return;
    document.getElementById('co-wh').value = w.id;
    
    const thumb = document.getElementById('co-emp-thumb');
    thumb.innerHTML = UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40);
    
    document.getElementById('co-emp-name').textContent = w.employeeName || w.name;
    document.getElementById('co-emp-name').style.color = 'var(--primary)';
    document.getElementById('co-emp-meta').textContent = w.name;
    document.getElementById('co-emp-picker-btn').classList.add('selected');
    closeModal();

    // Load inventory for the selected user
    this.loadEmpStock(w.id);
  },

  async loadEmpStock(whId) {
    if (!whId) {
      this._selectedWh = '';
      this._items = [];
      this._employeeStock = [];
      this.renderItems();
      return;
    }

    try {
      const pickerBtn = document.getElementById('co-picker-btn');
      const thumb = document.getElementById('co-emp-thumb');

      if (pickerBtn) {
        pickerBtn.disabled = true;
        pickerBtn.classList.add('btn-picker-disabled');
        pickerBtn.innerHTML = '<span class="material-icons rotating">sync</span> กำลังโหลดสต็อก...';
      }

      if (thumb) {
        thumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';
      }

      const wh = this._employeeWarehouses.find(w => w.id === whId);
      const res = await API.getEmployeeStock(wh?.employeeId || whId);
      
      const newStock = (res.stock || []).filter(s => String(s.warehouseId).trim() === String(whId).trim());
      
      this._employeeStock = newStock;
      this._selectedWh = whId; 
      this._items = [];
      this.renderItems();

      if (thumb) {
        thumb.innerHTML = UI.avatar(wh?.employeeAvatar || wh?.avatar, wh?.employeeName || wh?.name, 40);
      }

      if (pickerBtn) {
        pickerBtn.disabled = false;
        pickerBtn.classList.remove('btn-picker-disabled');
        pickerBtn.innerHTML = '<span class="material-icons" style="font-size:24px">add_circle</span> กดเพื่อเลือกสินค้า';
      }
    } catch(e) { 
      this._selectedWh = '';
      this._employeeStock = [];
      UI.toast('โหลดสต็อกพนักงานไม่สำเร็จ: ' + e.message, 'error'); 
      const thumb = document.getElementById('co-emp-thumb');
      if (thumb) thumb.innerHTML = '<span class="material-icons">person</span>';
    }
  },

  openProductPicker() {
    if (!this._selectedWh) return UI.toast('กรุณาเลือกคลังพนักงานก่อนค้นหาสินค้า', 'warning');
    if (!this._employeeStock.length) return UI.toast('คลังนี้ไม่มีสินค้าคงเหลือ', 'warning');

    const productsInStock = this._employeeStock.filter(s => Number(s.qty) > 0);
    if (!productsInStock.length) return UI.toast('คลังนี้ไม่มีสินค้าคงเหลือ', 'warning');

    const whName = document.getElementById('co-emp-name')?.textContent || 'คลังพนักงาน';
    openModal(`เลือกสินค้าที่จะรับฝากคืน (${whName})`, `
      <div class="mb-16">
        <div class="search-bar">
          <span class="material-icons">search</span>
          <input type="text" id="co-picker-query" placeholder="รับฝากอะไรดี? ค้นหาโดยชื่อหรือรหัส..." oninput="PAGES.consign.filterPicker(this.value)" autofocus />
        </div>
      </div>
      <div id="co-picker-grid" class="product-picker-grid">
        ${this.renderPickerGrid(productsInStock)}
      </div>

      <!-- Qty Popup -->
      <div id="co-qty-popup" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);background:rgba(0,0,0,0.4);animation: fadeIn 0.2s ease">
        <div style="background:#fff;border-radius:var(--radius-lg);padding:24px;width:300px;box-shadow:var(--shadow-lg);border:1px solid var(--border);animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)">
          <div style="text-align:center;margin-bottom:16px">
            <h3 id="co-pop-title" style="margin:0;font-size:1.1rem;color:var(--primary);font-weight:700">ระบุจำนวนรับฝาก</h3>
            <p id="co-pop-tray-label" style="margin:4px 0 0;font-size:0.75rem;color:var(--text-muted)">-</p>
            <div id="co-pop-stock" style="margin-top:8px;font-size:0.85rem;font-weight:700;color:var(--danger)">สต็อก: 0</div>
          </div>
          
          <input type="hidden" id="co-pop-pid" />
          <input type="hidden" id="co-pop-expiry-val" />
          
          <div class="form-group" style="margin-bottom:12px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">📦 จำนวน (ถาด)</label>
            <input type="number" id="co-pop-trays" min="0" placeholder="0" style="font-size:1.2rem;height:45px;text-align:center;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" oninput="PAGES.consign.popCalc()" />
          </div>
          
          <div class="form-group" style="margin-bottom:16px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">🍼 <span id="co-pop-unit-label">จำนวน (เศษ)</span></label>
            <input type="number" id="co-pop-units" min="0" placeholder="0" style="font-size:1.2rem;height:45px;text-align:center;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" oninput="PAGES.consign.popCalc()" />
          </div>
          
          <div style="background:var(--bg-card2);padding:10px;border-radius:var(--radius-sm);text-align:center;margin-bottom:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">รวมรับคืนทั้งสิ้น</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--primary)"><span id="co-pop-total">0</span> <span id="co-pop-unit-text" style="font-size:0.9rem;font-weight:400">หน่วย</span></div>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button class="btn btn-secondary" style="height:40px" onclick="document.getElementById('co-qty-popup').classList.add('hidden')">ยกเลิก</button>
            <button class="btn btn-primary" style="height:40px" onclick="PAGES.consign.popAdd()">ตกลง</button>
          </div>
        </div>
      </div>
      <style>
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes popIn { from { transform:scale(0.9); opacity:0; } to { transform:scale(1); opacity:1; } }
      </style>
    `, `<button class="btn btn-secondary" onclick="closeModal()">ปิดหน้าต่าง</button>`, '850px');
  },

  renderPickerGrid(items) {
    if (!items.length) return '<div class="text-center p-20 text-muted">ไม่พบสินค้าในสต็อก</div>';
    
    // Group by productId
    const groups = {};
    items.forEach(s => {
      const pid = s.productId;
      if (!groups[pid]) groups[pid] = { product: s.product, batches: [] };
      groups[pid].batches.push(s);
    });

    return Object.values(groups).map(g => {
      const p = g.product;
      return `
        <div class="picker-item no-hover" style="cursor:default; height:auto; min-height:180px">
          ${UI.image(p?.imageUrl, 'p-img', 'object-fit:contain; background:#f9f9f9')}
          <div class="p-info" style="width:100%">
            <div class="p-code">${p?.code || '-'}</div>
            <div class="p-name" style="font-size:0.9rem; font-weight:700; color:var(--text-main); margin-bottom:8px">${p?.name || g.product.id}</div>
            
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px; border-bottom:1px solid var(--border-light); padding-bottom:4px">ล็อตสินค้าที่มี:</div>
            <div class="batch-selector-container">
              ${g.batches.sort((a,b) => (a.expiryDate||'9999').localeCompare(b.expiryDate||'9999')).map(s => `
                <div class="batch-badge" onclick="PAGES.consign.showQtyInput('${s.productId}', '${s.expiryDate || ''}')">
                   <span class="material-icons" style="font-size:14px; margin-right:4px">event_note</span>
                   <div style="flex:1">
                     <div class="batch-exp">EXP: ${UI.dateStr(s.expiryDate) || '-'}</div>
                     <div class="batch-qty">${UI.currency(s.qty, 0)} ${p?.unit || ''}</div>
                   </div>
                   <span class="material-icons" style="font-size:16px; color:var(--primary)">add_circle_outline</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  showQtyInput(id, expiryDate) {
    const s = this._employeeStock.find(x => x.productId === id && (x.expiryDate || '') === (expiryDate || ''));
    const p = s?.product;
    if (!p) return;

    document.getElementById('co-pop-pid').value = id;
    document.getElementById('co-pop-expiry-val').value = expiryDate || '';
    document.getElementById('co-pop-title').textContent = p.name;
    document.getElementById('co-pop-tray-label').textContent = `บรรจุ 1 ถาด = ${p.unitsPerTray || 0} ${p.unit}`;
    document.getElementById('co-pop-unit-label').textContent = `จำนวน (เศษ/${p.unit || 'หน่วย'})`;
    document.getElementById('co-pop-unit-text').textContent = p.unit || 'หน่วย';
    document.getElementById('co-pop-stock').innerHTML = `ล็อตหมดอายุ: <span style="color:var(--primary)">${UI.dateStr(expiryDate) || '-'}</span><br>สต็อกใคลัง: ${UI.currency(s.qty, 0)} ${p.unit}`;

    document.getElementById('co-pop-trays').value = '';
    document.getElementById('co-pop-units').value = '';
    document.getElementById('co-pop-total').textContent = 0;

    document.getElementById('co-qty-popup').classList.remove('hidden');
    setTimeout(() => document.getElementById('co-pop-trays').focus(), 100);
  },

  popCalc() {
    const id = document.getElementById('co-pop-pid').value;
    const expiryDate = document.getElementById('co-pop-expiry-val').value;
    const s = this._employeeStock.find(x => x.productId === id && (x.expiryDate || '') === (expiryDate || ''));
    if (!s) return;
    const p = s.product;
    const trays = parseInt(document.getElementById('co-pop-trays').value) || 0;
    const units = parseInt(document.getElementById('co-pop-units').value) || 0;
    const total = (trays * (p.unitsPerTray || 0)) + units;
    document.getElementById('co-pop-total').textContent = UI.currency(total, 0);

    const totEl = document.getElementById('co-pop-total');
    if (total > s.qty) totEl.style.color = 'var(--danger)';
    else totEl.style.color = 'var(--primary)';
  },

  popAdd() {
    const id = document.getElementById('co-pop-pid').value;
    const expiryDate = document.getElementById('co-pop-expiry-val').value;
    const s = this._employeeStock.find(x => x.productId === id && (x.expiryDate || '') === (expiryDate || ''));
    const p = s?.product;
    if (!p) return;

    const trays = parseInt(document.getElementById('co-pop-trays').value) || 0;
    const units = parseInt(document.getElementById('co-pop-units').value) || 0;
    const total = (trays * (p.unitsPerTray || 0)) + units;

    if (total <= 0) return UI.toast('กรุณาระบุจำนวน', 'warning');
    if (total > s.qty) return UI.toast(`สต็อกไม่เพียงพอ (คงเหลือ ${s.qty} ${p.unit})`, 'error');

    const existing = this._items.find(i => i.productId === id && (i.expiryDate || '') === (expiryDate || ''));
    if (existing) {
      if ((existing.qty + total) > s.qty) return UI.toast(`รวมแล้วเกินสต็อกที่มี`, 'error');
      existing.qty += total;
    } else {
      this._items.push({ productId: id, expiryDate, qty: total, unit: p.unit || 'หน่วย', product: p });
    }

    UI.toast(`เพิ่ม ${p.name} เรียบร้อย`, 'success');
    document.getElementById('co-qty-popup').classList.add('hidden');
    this.renderItems();
  },

  filterPicker(query) {
    const q = query.toLowerCase();
    const filtered = this._employeeStock.filter(s => {
      const p = s.product;
      return p && (p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    });
    document.getElementById('co-picker-grid').innerHTML = this.renderPickerGrid(filtered);
  },

  adjustQty(delta) { /* Obsolete */ },
  addItem() { /* Obsolete */ },

  removeItem(idx) { this._items.splice(idx, 1); this.renderItems(); },

  renderItems() {
    const el = document.getElementById('co-items-list');
    if (!this._items.length) {
      el.innerHTML = UI.emptyState('undo', 'ยังไม่มีรายการ', 'เลือกสินค้าและจำนวนที่ฝาก');
      return;
    }
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>สินค้า</th><th>วันหมดอายุ</th><th class="td-right">จำนวนฝาก</th><th>หน่วย</th><th></th></tr></thead>
        <tbody>
          ${this._items.map((item, i) => `
            <tr>
              <td>${i+1}</td>
              <td class="td-bold">${item.product?.name||item.productId}</td>
              <td style="font-size:0.85rem; color:var(--text-secondary)">${UI.dateStr(item.expiryDate) || '-'}</td>
              <td class="td-right text-warning fw-bold">${UI.currency(item.qty,0)}</td>
              <td>${item.unit}</td>
              <td><button class="btn btn-danger btn-xs" onclick="PAGES.consign.removeItem(${i})"><span class="material-icons">close</span></button></td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>
    `;
  },

  async submit() {
    if (!this._selectedWh) return UI.toast('กรุณาเลือกพนักงาน', 'warning');
    if (!this._items.length) return UI.toast('กรุณาเพิ่มรายการ', 'warning');
    try {
      UI.loading(true);
      let submitDate;
      const adminDate = document.getElementById('co-date')?.value;
      const adminTime = document.getElementById('co-time')?.value;
      if (adminDate && adminTime) {
        submitDate = new Date(`${adminDate}T${adminTime}:00`).toISOString();
      } else {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        submitDate = `${yyyy}-${mm}-${dd}`;
      }

      await API.consignFromEmployee({
        fromWarehouseId: this._selectedWh,
        date: submitDate,
        note: document.getElementById('co-note')?.value,
        items: this._items.map(i => ({ productId: i.productId, expiryDate: i.expiryDate, qty: i.qty })),
      });
      UI.toast('บันทึกการฝากสินค้าเรียบร้อย ✅', 'success');
      this._items = [];
      this.renderItems();
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
