// ============================================================
// pages/movement.js – Inter-warehouse Stock Movement
// Handles Central-to-Central, Employee-to-Central, etc.
// ============================================================

PAGES.movement = {
  _fromWh: '',
  _toWh: '',
  _warehouses: [],
  _sourceStock: [],
  _items: [],
  _isSourceReady: false,

  async render() {
    const el = document.getElementById('page-movement');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#00838F,#006064)">
            <span class="material-icons">swap_horiz</span>
          </div>
          <div>
            <h2 class="page-title">ย้ายสินค้าระหว่างคลัง</h2>
            <p class="page-subtitle">โอนย้ายสินค้าระหว่างคลังหลักและคลังพนักงาน (Stock Movement)</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="showPage('movement-history')">
            <span class="material-icons">history</span> ดูประวัติย้ายคลัง
          </button>
        </div>
      </div>

      <div class="grid-2">
        <!-- Source Warehouse -->
        <div class="card step-card">
          <div class="step-badge">1</div>
          <div class="card-title"><span class="material-icons" style="color:#00838F">logout</span>คลังต้นทาง</div>
          <div class="form-group">
            <label>เลือกคลังที่จะย้ายของออก *</label>
            <div id="mv-from-btn" class="product-picker-trigger" onclick="PAGES.movement.openWarehousePicker('from')">
              <div id="mv-from-thumb" class="product-thumb-preview" style="border-radius:50%;overflow:hidden;background:var(--bg-card2);display:flex;align-items:center;justify-content:center"><span class="material-icons">logout</span></div>
              <div class="product-info-preview">
                <div id="mv-from-name" class="p-name">คลิกเพื่อเลือกคลังต้นทาง</div>
                <div id="mv-from-meta" class="p-meta">คลังที่ต้องการย้ายของออก</div>
              </div>
            </div>
            <input type="hidden" id="mv-from-val" value="" />
          </div>
          <div class="form-group"><label>วันที่ทำรายการ</label>
            <div id="mv-datetime-display" style="
              display:flex;align-items:center;gap:10px;
              background:var(--bg-card2);
              border:1.5px solid var(--border);
              border-radius:12px;
              padding:10px 16px;
              font-size:1.05rem;
              font-weight:600;
              color:var(--text-main);
              cursor:not-allowed;
              user-select:none;
              pointer-events:none;
            ">
              <span class="material-icons" style="font-size:18px;color:var(--primary)">lock_clock</span>
              <span id="mv-datetime-text" style="letter-spacing:0.02em"></span>
            </div>
          </div>
          <div id="mv-source-info" class="mt-16 hidden">
             <div class="alert alert-info" style="margin:0; padding:12px 15px; border-radius:12px">
               <div id="mv-source-status" style="font-size:0.85rem">กำลังโหลดข้อมูลสต็อก...</div>
             </div>
          </div>
        </div>

        <!-- Target Warehouse -->
        <div class="card step-card">
          <div class="step-badge">2</div>
          <div class="card-title"><span class="material-icons" style="color:#006064">login</span>คลังปลายทาง</div>
          <div class="form-group">
            <label>เลือกคลังที่จะรับของเข้า *</label>
            <div id="mv-to-btn" class="product-picker-trigger" onclick="PAGES.movement.openWarehousePicker('to')">
              <div id="mv-to-thumb" class="product-thumb-preview" style="border-radius:50%;overflow:hidden;background:var(--bg-card2);display:flex;align-items:center;justify-content:center"><span class="material-icons">login</span></div>
              <div class="product-info-preview">
                <div id="mv-to-name" class="p-name">คลิกเพื่อเลือกคลังปลายทาง</div>
                <div id="mv-to-meta" class="p-meta">คลังที่ต้องการรับของเข้า</div>
              </div>
            </div>
            <input type="hidden" id="mv-to-val" value="" />
          </div>
          <div class="form-group"><label>หมายเหตุ</label>
            <textarea id="mv-note" rows="2" placeholder="เหตุผลการย้ายหรือรายละเอียดเพิ่มเติม..." style="border-radius:12px; padding:12px"></textarea>
          </div>
        </div>
      </div>

      <div class="card mt-16 step-card">
        <div class="step-badge">3</div>
        <div class="card-title"><span class="material-icons" style="color:#9C27B0">inventory</span>เลือกรายการสินค้า</div>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px">กรุณาเลือกคลังต้นทางและปลายทางก่อนกดเลือกสินค้า</p>
        <button id="mv-picker-btn" class="btn btn-primary btn-full btn-picker-disabled" style="height:60px; border-radius:16px; font-size:1.1rem; box-shadow:var(--shadow-lg)" onclick="PAGES.movement.openProductPicker()" disabled>
          <span class="material-icons" style="font-size:24px; margin-right:8px">lock</span> กรุณาเลือกคลังต้นทางก่อน
        </button>
      </div>

      <div class="card mt-16 step-card">
        <div class="step-badge">4</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
          <div class="card-title" style="margin:0">4. รายการที่ต้องการย้าย</div>
          <button id="mv-submit-btn" class="btn btn-primary" onclick="PAGES.movement.submit()" disabled>
            <span class="material-icons">check_circle</span> ยืนยันการบันทึกการย้าย
          </button>
        </div>
        <div id="mv-items-list">
          ${UI.emptyState('swap_horiz', 'ยังไม่มีรายการ', 'เลือกคลังต้นทาง/ปลายทาง และสินค้าที่ต้องการย้าย')}
        </div>
      </div>

      <!-- Quantity Popup -->
      <div id="mv-qty-popup" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);background:rgba(0,0,0,0.4);animation: fadeIn 0.2s ease">
        <div style="background:#fff;border-radius:var(--radius-lg);padding:24px;width:300px;box-shadow:var(--shadow-lg);border:1px solid var(--border);animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)">
          <div style="text-align:center;margin-bottom:16px">
            <h3 id="mv-pop-title" style="margin:0;font-size:1.1rem;color:var(--primary);font-weight:700">ระบุจำนวน</h3>
            <p id="mv-pop-tray-label" style="margin:4px 0 0;font-size:0.75rem;color:var(--text-muted)">-</p>
            <div id="mv-pop-stock" style="margin-top:8px;font-size:0.85rem;font-weight:700;color:var(--danger)">-</div>
          </div>
          
          <input type="hidden" id="mv-pop-pid" />
          <input type="hidden" id="mv-pop-exp" />
          
          <div class="form-group" style="margin-bottom:12px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">📦 จำนวน (ถาด)</label>
            <input type="number" id="mv-pop-trays" min="0" placeholder="0" style="font-size:1.2rem;height:45px;text-align:center;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" oninput="PAGES.movement.popCalc()" />
          </div>
          
          <div class="form-group" style="margin-bottom:16px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">🍼 <span id="mv-pop-unit-label">จำนวน (เศษ)</span></label>
            <input type="number" id="mv-pop-units" min="0" placeholder="0" style="font-size:1.2rem;height:45px;text-align:center;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" oninput="PAGES.movement.popCalc()" />
          </div>
          
          <div style="background:var(--bg-card2);padding:10px;border-radius:var(--radius-sm);text-align:center;margin-bottom:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">รวมรับคืนทั้งสิ้น</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--primary)"><span id="mv-pop-total">0</span> <span id="mv-pop-unit-text" style="font-size:0.9rem;font-weight:400">หน่วย</span></div>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button class="btn btn-secondary" style="height:40px" onclick="document.getElementById('mv-qty-popup').classList.add('hidden')">ยกเลิก</button>
            <button class="btn btn-primary" style="height:40px" onclick="PAGES.movement.popAdd()">ตกลง</button>
          </div>
        </div>
      </div>
      <style>
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes popIn { from { transform:scale(0.9); opacity:0; } to { transform:scale(1); opacity:1; } }
      </style>
    `;

    const fThumb = document.getElementById('mv-from-thumb');
    const tThumb = document.getElementById('mv-to-thumb');
    if (fThumb) fThumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';
    if (tThumb) tThumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';

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
    const el = document.getElementById('mv-datetime-text');
    if (el) el.textContent = `${dd}/${mm}/${yyyy}   ${hh}:${min}`;
  },

  async loadWarehouses() {
    try {
      const res = await API.getWarehouses();
      this._warehouses = res.warehouses || [];

      const fThumb = document.getElementById('mv-from-thumb');
      const tThumb = document.getElementById('mv-to-thumb');
      if (fThumb && !this._fromWh) fThumb.innerHTML = '<span class="material-icons">logout</span>';
      if (tThumb && !this._toWh) tThumb.innerHTML = '<span class="material-icons">login</span>';
    } catch(e) { UI.toast('โหลดข้อมูลคลังล้มเหลว', 'error'); }
  },

  openWarehousePicker(type) {
    if (!this._warehouses.length) return;
    
    const html = `
      <div class="mb-16">
        <div class="search-bar">
          <span class="material-icons">search</span>
          <input type="text" id="mv-wh-picker-query" placeholder="ค้นหาชื่อคลังหรือพนักงาน..." oninput="PAGES.movement.filterWarehouses('${type}', this.value)" autofocus />
        </div>
      </div>
      <div id="mv-wh-picker-grid" class="warehouse-picker-grid">
        ${this.renderWarehousePickerGrid(type, '')}
      </div>
    `;

    const title = type === 'from' ? 'เลือกคลังต้นทาง (ย้ายออก)' : 'เลือกคลังปลายทาง (รับเข้า)';
    openModal(title, html, `<button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>`, '850px');
  },

  renderWarehousePickerGrid(type, query) {
    const q = query.toLowerCase().trim();
    const otherWhId = type === 'from' ? this._toWh : this._fromWh;
    
    const filtered = this._warehouses.filter(w => w.name.toLowerCase().includes(q) || (w.employeeName || '').toLowerCase().includes(q));
    
    const central = filtered.filter(w => w.type === 'central');
    const employee = filtered.filter(w => w.type === 'employee');

    const renderGroup = (label, list, icon) => {
      if (!list.length) return '';
      return `
        <div class="wh-picker-group">
          <div class="wh-group-label" style="font-size:0.85rem; font-weight:700; color:var(--text-muted); padding:0 0 8px 8px; border-bottom:1px solid var(--border-light); margin-bottom:12px; display:flex; align-items:center; gap:8px">
            <span class="material-icons" style="font-size:16px">${icon}</span> ${label.toUpperCase()} (${list.length})
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:120x; display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px">
            ${list.map(w => {
              const isSelected = w.id === otherWhId;
              const avHtml = UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40, w.type === 'central' ? 'warehouse' : 'user');
              
              const style = isSelected ? 'opacity:0.4; cursor:not-allowed; background:var(--bg-card2); pointer-events:none' : 'cursor:pointer';
              const onClick = isSelected ? '' : `onclick="PAGES.movement.selectWarehouse('${type}', '${w.id}')"`;
              
              return `
                <div class="card wh-picker-card" style="flex:1 1 200px; display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--border); transition:all 0.2s; ${style}" ${onClick} onpointerenter="if(!${isSelected}) {this.style.borderColor='var(--primary)';this.style.transform='translateY(-2px)'}" onpointerleave="if(!${isSelected}) {this.style.borderColor='var(--border)';this.style.transform='none'}">
                  ${avHtml}
                  <div style="overflow:hidden">
                    <div style="font-weight:700; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:${isSelected ? 'var(--text-muted)' : 'var(--text-main)'}">${w.name}</div>
                    <div style="font-size:0.7rem; color:${isSelected ? 'var(--text-muted)' : 'var(--text-muted)'}">${isSelected ? 'เลือกซ้ำไม่ได้' : (w.type === 'central' ? 'คลังส่วนกลาง' : (w.employeeName || 'พนักงาน'))}</div>
                  </div>
                  ${isSelected ? '<span class="material-icons" style="margin-left:auto; color:var(--text-muted); font-size:16px">lock</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    };

    if (!filtered.length) return `<div class="p-20 text-center text-muted">${UI.emptyState('search_off', 'ไม่พบคลังที่ค้นหา', 'ลองใช้ชื่ออื่นหรือตรวจสอบสถานะคลัง')}</div>`;

    return `
      ${renderGroup('คลังส่วนกลาง', central, 'business')}
      ${renderGroup('คลังบุคคล / คลังพนักงาน', employee, 'groups')}
    `;
  },

  filterWarehouses(type, q) {
    document.getElementById('mv-wh-picker-grid').innerHTML = this.renderWarehousePickerGrid(type, q);
  },

  selectWarehouse(type, whId) {
    const w = this._warehouses.find(x => x.id === whId);
    if (!w) return;
    
    console.log(`[Movement] Selecting Warehouse: ${w.name} (${type}) id: ${whId}`);
    
    // Safety check again
    const otherWhId = type === 'from' ? this._toWh : this._fromWh;
    if (whId === otherWhId) return UI.toast('ต้นทางและปลายทางต้องเป็นคนละคลัง', 'warning');

    if (type === 'from') {
       this._fromWh = whId;
       document.getElementById('mv-from-name').textContent = w.name;
       document.getElementById('mv-from-name').style.color = 'var(--primary)';
       document.getElementById('mv-from-meta').textContent = w.type === 'central' ? 'คลังส่วนกลาง' : (w.employeeName || w.name);
       const thumb = document.getElementById('mv-from-thumb');
       if (thumb) thumb.innerHTML = UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40, w.type === 'central' ? 'warehouse' : 'user');
       document.getElementById('mv-from-btn').classList.add('selected');
       this.loadSourceStock(whId);
    } else {
       this._toWh = whId;
       document.getElementById('mv-to-name').textContent = w.name;
       document.getElementById('mv-to-name').style.color = 'var(--primary)';
       document.getElementById('mv-to-meta').textContent = w.type === 'central' ? 'คลังส่วนกลาง' : (w.employeeName || w.name);
       const thumb = document.getElementById('mv-to-thumb');
       if (thumb) thumb.innerHTML = UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40, w.type === 'central' ? 'warehouse' : 'user');
       document.getElementById('mv-to-btn').classList.add('selected');
    }

    closeModal();
    this.updateUI();
  },

  async loadSourceStock(whId) {
    this._items = [];
    this._sourceStock = [];
    this._isSourceReady = false;
    this.renderItems();
    this.updateUI();

    const wh = this._warehouses.find(w => w.id === whId);
    if (!wh) return;

    try {
      const pickerBtn = document.getElementById('mv-picker-btn');
      const fromThumb = document.getElementById('mv-from-thumb');

      if (pickerBtn) {
        pickerBtn.innerHTML = '<span class="material-icons rotating" style="font-size:24px; margin-right:8px">sync</span> กำลังโหลดสต็อกต้นทาง...';
      }
      
      if (fromThumb) {
        fromThumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';
      }

      let res;
      if (wh.type === 'central') {
        res = await API.getCentralStock(whId);
      } else {
        res = await API.getEmployeeStock(wh.employeeId);
        res.stock = (res.stock || []).filter(s => s.warehouseId === whId);
      }

      this._sourceStock = res.stock || [];
      this._isSourceReady = true;

      // Restore thumb
      if (fromThumb) {
        fromThumb.innerHTML = UI.avatar(wh.employeeAvatar || wh.avatar, wh.employeeName || wh.name, 40, wh.type === 'central' ? 'warehouse' : 'user');
      }
      
      this.updateUI();
    } catch(e) {
      UI.toast('โหลดสต็อกต้นทางล้มเหลว', 'error');
      // Restore thumb on error
      const fromThumb = document.getElementById('mv-from-thumb');
      if (fromThumb) {
        fromThumb.innerHTML = wh.type === 'employee' ? UI.avatar(wh.employeeAvatar, wh.employeeName, 40, 'user') : UI.avatar(wh.avatar, wh.name, 40, 'warehouse');
      }
    }
  },

  updateUI() {
    const pickerBtn = document.getElementById('mv-picker-btn');
    const submitBtn = document.getElementById('mv-submit-btn');
    
    if (this._fromWh && this._isSourceReady) {
      pickerBtn.disabled = false;
      pickerBtn.classList.remove('btn-picker-disabled');
      pickerBtn.innerHTML = '<span class="material-icons" style="font-size:24px; margin-right:8px">add_circle</span> เลือกสินค้าเพื่อย้ายคลัง';
    } else if (this._fromWh) {
      pickerBtn.disabled = true;
      pickerBtn.classList.add('btn-picker-disabled');
      // Text set in loadSourceStock
    } else {
      pickerBtn.disabled = true;
      pickerBtn.classList.add('btn-picker-disabled');
      pickerBtn.innerHTML = '<span class="material-icons" style="font-size:24px; margin-right:8px">lock</span> กรุณาเลือกคลังต้นทางก่อน';
    }
    
    submitBtn.disabled = !(this._fromWh && this._toWh && this._items.length > 0);
  },

  openProductPicker() {
    if (!this._fromWh) return;
    const available = this._sourceStock.filter(s => Number(s.qty) > 0);
    if (!available.length) return UI.toast('คลังต้นทางไม่มีสินค้าคงเหลือ', 'warning');

    const whName = document.getElementById('mv-from-name').textContent;
    openModal(`เลือกสินค้าที่จะย้าย (${whName})`, `
      <div class="mb-16">
        <div class="search-bar">
          <span class="material-icons">search</span>
          <input type="text" id="mv-picker-query" placeholder="ย้ายสินค้าอะไร? ค้นหาโดยชื่อหรือรหัส..." oninput="PAGES.movement.filterPicker(this.value)" autofocus />
        </div>
      </div>
      <div id="mv-picker-grid" class="product-picker-grid">
        ${this.renderPickerGrid(available)}
      </div>
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
                <div class="batch-badge" onclick="PAGES.movement.showQtyInput('${s.productId}', '${s.expiryDate || ''}')">
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

  filterPicker(query) {
    const q = query.toLowerCase();
    const filtered = this._sourceStock.filter(s => {
      const p = s.product;
      return p && (p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    });
    document.getElementById('mv-picker-grid').innerHTML = this.renderPickerGrid(filtered);
  },

  showQtyInput(id, expiryDate) {
    const s = this._sourceStock.find(x => x.productId === id && (x.expiryDate || '') === (expiryDate || ''));
    const p = s?.product;
    if (!p) return;

    document.getElementById('mv-pop-pid').value = id;
    document.getElementById('mv-pop-exp').value = expiryDate || '';
    document.getElementById('mv-pop-title').textContent = p.name;
    document.getElementById('mv-pop-tray-label').textContent = `บรรจุ 1 ถาด = ${p.unitsPerTray || 0} ${p.unit}`;
    document.getElementById('mv-pop-unit-label').textContent = `จำนวน (เศษ/${p.unit || 'หน่วย'})`;
    document.getElementById('mv-pop-unit-text').textContent = p.unit || 'หน่วย';
    document.getElementById('mv-pop-stock').innerHTML = `คลังต้นทางล็อต: <span style="color:var(--primary)">${UI.dateStr(expiryDate) || '-'}</span><br>คงเหลือ: ${UI.currency(s.qty, 0)} ${p.unit}`;

    document.getElementById('mv-pop-trays').value = '';
    document.getElementById('mv-pop-units').value = '';
    document.getElementById('mv-pop-total').textContent = 0;

    document.getElementById('mv-qty-popup').classList.remove('hidden');
    setTimeout(() => document.getElementById('mv-pop-trays').focus(), 100);
  },

  popCalc() {
    const id = document.getElementById('mv-pop-pid').value;
    const expiryDate = document.getElementById('mv-pop-exp').value;
    const s = this._sourceStock.find(x => x.productId === id && (x.expiryDate || '') === (expiryDate || ''));
    if (!s) return;
    const p = s.product;
    const trays = parseInt(document.getElementById('mv-pop-trays').value) || 0;
    const units = parseInt(document.getElementById('mv-pop-units').value) || 0;
    const total = (trays * (p.unitsPerTray || 0)) + units;
    document.getElementById('mv-pop-total').textContent = UI.currency(total, 0);

    const totEl = document.getElementById('mv-pop-total');
    if (total > s.qty) totEl.style.color = 'var(--danger)';
    else totEl.style.color = 'var(--primary)';
  },

  popAdd() {
    const id = document.getElementById('mv-pop-pid').value;
    const expiryDate = document.getElementById('mv-pop-exp').value;
    const s = this._sourceStock.find(x => x.productId === id && (x.expiryDate || '') === (expiryDate || ''));
    const p = s?.product;
    if (!p) return;

    const trays = parseInt(document.getElementById('mv-pop-trays').value) || 0;
    const units = parseInt(document.getElementById('mv-pop-units').value) || 0;
    const total = (trays * (p.unitsPerTray || 0)) + units;

    if (total <= 0) return UI.toast('กรุณาระบุจำนวน', 'warning');
    if (total > s.qty) return UI.toast(`ล็อตที่เลือกมีสต็อกไม่พอ`, 'error');

    const existing = this._items.find(i => i.productId === id && (i.expiryDate || '') === (expiryDate || ''));
    if (existing) {
      if ((existing.qty + total) > s.qty) return UI.toast(`รวมแล้วเกินสต็อกที่มี`, 'error');
      existing.qty += total;
    } else {
      this._items.push({ productId: id, expiryDate, qty: total, unit: p.unit || 'หน่วย', product: p });
    }

    UI.toast(`เพิ่ม ${p.name} เรียบร้อย`, 'success');
    document.getElementById('mv-qty-popup').classList.add('hidden');
    this.renderItems();
    this.updateUI();
  },

  removeItem(idx) { this._items.splice(idx, 1); this.renderItems(); this.updateUI(); },

  renderItems() {
    const el = document.getElementById('mv-items-list');
    if (!this._items.length) {
      el.innerHTML = UI.emptyState('swap_horiz', 'ยังไม่มีรายการ', 'เลือกคลังต้นทาง/ปลายทาง และสินค้าที่ต้องการย้าย');
      return;
    }
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>สินค้า</th><th>วันหมดอายุ</th><th class="td-right">จำนวนย้าย</th><th>หน่วย</th><th></th></tr></thead>
        <tbody>
          ${this._items.map((item, i) => `
            <tr>
              <td>${i+1}</td>
              <td class="td-bold">
                <div>${item.product?.name||item.productId}</div>
                <div style="font-size:0.7rem; color:var(--text-muted)">${item.product?.code||''}</div>
              </td>
              <td style="font-size:0.85rem; color:var(--text-secondary)">${UI.dateStr(item.expiryDate) || '-'}</td>
              <td class="td-right text-primary fw-bold">${UI.currency(item.qty,0)}</td>
              <td>${item.unit}</td>
              <td><button class="btn btn-danger btn-xs" onclick="PAGES.movement.removeItem(${i})"><span class="material-icons" style="font-size:16px">close</span></button></td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>
    `;
  },

  async submit() {
    if (!this._fromWh || !this._toWh) return UI.toast('กรุณาเลือกคลังต้นทางและปลายทาง', 'warning');
    if (!this._items.length) return UI.toast('กรุณาเพิ่มรายการสินค้า', 'warning');
    try {
      UI.loading(true);
      await API.moveStock({
        fromWhId: this._fromWh,
        toWhId: this._toWh,
        note: document.getElementById('mv-note')?.value,
        items: this._items.map(i => ({ productId: i.productId, expiryDate: i.expiryDate, qty: i.qty, unit: i.unit })),
      });
      UI.toast('บันทึกการย้ายสต็อกเรียบร้อย ✅', 'success');
      this._items = [];
      this._fromWh = '';
      this._toWh = '';
      this._isSourceReady = false;
      this.render(); // Reset UI
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
