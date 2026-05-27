// ============================================================
// pages/transfer.js – Transfer goods to employee warehouse
// ============================================================

PAGES['transfer'] = {
  _products: [],
  _centralWarehouses: [],
  _employeeWarehouses: [],
  _centralStock: [],
  _items: [],
  _selectedProduct: null,

  async render() {
    const el = document.getElementById('page-transfer');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#00897B,#00695C)">
            <span class="material-icons">swap_horiz</span>
          </div>
          <div>
            <h2 class="page-title">เบิกสินค้า</h2>
            <p class="page-subtitle">โอนสินค้าจากคลังกลาง → คลังพนักงาน</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="showPage('transfer-history')">
            <span class="material-icons">history</span> ดูประวัติการเบิก
          </button>
        </div>
      </div>

      <div class="grid-2">
        <!-- 1. Source Warehouse -->
        <div class="card step-card">
          <div class="step-badge">1</div>
          <div class="card-title"><span class="material-icons" style="color:#00897B">warehouse</span>คลังต้นทาง (คลังกลาง)</div>
          <div class="form-group">
            <label>เลือกคลังที่จะเบิกสินค้าออก *</label>
            <div id="tr-from-picker-btn" class="product-picker-trigger" onclick="PAGES.transfer.openCentralPicker()">
              <div id="tr-from-thumb" class="product-thumb-preview" style="border-radius:50%;overflow:hidden;background:var(--bg-card2);display:flex;align-items:center;justify-content:center"><span class="material-icons">warehouse</span></div>
              <div class="product-info-preview">
                <div id="tr-from-name" class="p-name">คลิกเพื่อเลือกคลังต้นทาง</div>
                <div id="tr-from-meta" class="p-meta">คลังที่จะเบิกสินค้าออกไป</div>
              </div>
            </div>
            <input type="hidden" id="tr-from" value="" onchange="PAGES.transfer.onFromWarehouseChange()" />
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label>วันที่เบิกสินค้า</label>
              ${AUTH.isAdmin() 
                ? `<input type="date" id="tr-date" value="${new Date().toISOString().split('T')[0]}" style="height:45px; width:100%; border-radius:12px; padding:0 16px; border:1px solid var(--border)" />`
                : `<div id="tr-date-display" style="padding:10px 14px; background:var(--bg-card2); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:0.95rem; font-weight:700; color:var(--text-secondary)"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">lock_clock</span> <span id="tr-date-text"></span></div>`
              }
            </div>
            <div class="form-group"><label>เวลาที่เบิก</label>
              ${AUTH.isAdmin()
                ? `<input type="time" id="tr-time" value="${new Date().toTimeString().substring(0,5)}" style="height:45px; width:100%; border-radius:12px; padding:0 16px; border:1px solid var(--border)" />`
                : `<div id="tr-time-display" style="padding:10px 14px; background:var(--bg-card2); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:0.95rem; font-weight:700; color:var(--primary)"><span id="tr-time-text"></span> น.</div>`
              }
            </div>
          </div>
        </div>

        <!-- 2. Target Warehouse & Note -->
        <div class="card step-card">
          <div class="step-badge">2</div>
          <div class="card-title"><span class="material-icons" style="color:#1A73E8">person_pin</span>คลังปลายทาง (พนักงาน)</div>
          <div class="form-group">
            <label>เลือกพนักงานที่จะรับของไป *</label>
            <div id="tr-emp-picker-btn" class="product-picker-trigger" onclick="PAGES.transfer.openEmployeePicker()">
              <div id="tr-emp-thumb" class="product-thumb-preview" style="border-radius:50%;overflow:hidden;background:var(--bg-card2);display:flex;align-items:center;justify-content:center"><span class="material-icons">person</span></div>
              <div class="product-info-preview">
                <div id="tr-emp-name" class="p-name">คลิกเพื่อเลือกพนักงาน</div>
                <div id="tr-emp-meta" class="p-meta">เพื่อนำสินค้าไปลงคลังพนักงาน</div>
              </div>
            </div>
            <input type="hidden" id="tr-to" value="" />
          </div>
          <div class="form-group"><label>หมายเหตุ</label>
            <textarea id="tr-note" rows="2" placeholder="เช่น เบิกไปขายที่สาขา... หรือรายละเอียดเพิ่มเติม" style="border-radius:12px; padding:12px"></textarea>
          </div>
        </div>
      </div>

      <!-- 3. Product Selection -->
      <div class="card mt-16 step-card">
        <div class="step-badge">3</div>
        <div class="card-title"><span class="material-icons" style="color:#9C27B0">inventory</span>เลือกรายการสินค้า</div>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px">กรุณาเลือกคลังต้นทางและปลายทางก่อนกดเลือกสินค้า</p>
        <button id="tr-picker-btn" class="btn btn-primary btn-full btn-picker-disabled" style="height:60px; font-size:1.1rem; border-radius:16px; box-shadow:var(--shadow-lg)" onclick="PAGES.transfer.openProductPicker()" disabled>
          <span class="material-icons" style="font-size:24px; margin-right:8px">lock</span> กรุณาเลือกคลังต้นทางก่อน
        </button>
      </div>

      <!-- 4. Summary Table -->
      <div class="card mt-16 step-card">
        <div class="step-badge">4</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
          <div class="card-title" style="margin:0">4. รายการที่ต้องการเบิก</div>
          <button class="btn btn-primary" onclick="PAGES.transfer.submit()">
            <span class="material-icons">send</span> ยืนยันการบันทึกใบเบิก
          </button>
        </div>
        <div id="tr-items-list"></div>
      </div>
    `;
    // UI Loading indicator
    const fThumb = document.getElementById('tr-from-thumb');
    const eThumb = document.getElementById('tr-emp-thumb');
    if (fThumb) fThumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';
    if (eThumb) eThumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';

    await this.loadData();
    this.renderItems();

    // Live clock – always on, no one can edit
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
    const textEl = document.getElementById('tr-datetime-text');
    if (textEl) textEl.textContent = `${dd}/${mm}/${yyyy}   ${hh}:${min}`;
    const dateText = document.getElementById('tr-date-text');
    const timeText = document.getElementById('tr-time-text');
    if (dateText) dateText.textContent = `${dd}/${mm}/${yyyy}`;
    if (timeText) timeText.textContent = `${hh}:${min}`;
  },

  async loadData() {
    try {
      const [pr, whr] = await Promise.all([API.getProducts(), API.getWarehouses()]);
      this._products = pr.products || [];
      this._centralWarehouses = (whr.warehouses || []).filter(w => w.type === 'central');
      this._employeeWarehouses = (whr.warehouses || []).filter(w => w.type === 'employee');
      this._items = [];

      // Reset thumbs to defaults
      const fThumb = document.getElementById('tr-from-thumb');
      const eThumb = document.getElementById('tr-emp-thumb');
      if (fThumb) fThumb.innerHTML = '<span class="material-icons">warehouse</span>';
      if (eThumb) eThumb.innerHTML = '<span class="material-icons">person</span>';
    } catch (e) {
      UI.toast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error');
    }
  },

  openCentralPicker() {
    if (!this._centralWarehouses || !this._centralWarehouses.length) return UI.toast('ไม่พบคลังกลางในระบบ', 'info');

    const html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding-top:8px;">
      ${this._centralWarehouses.map(w => {
        const avHtml = UI.avatar(w.employeeAvatar || w.avatar, w.name, 40, 'warehouse');
        return `
          <div class="card" style="cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);transition:all 0.2s" onclick="PAGES.transfer.selectCentral('${w.id}')" onpointerenter="this.style.borderColor='var(--primary)';this.style.transform='translateY(-2px)'" onpointerleave="this.style.borderColor='var(--border)';this.style.transform='none'">
            ${avHtml}
            <div>
              <div style="font-weight:700;font-size:0.95rem">${w.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${w.location || 'คลังกลาง'}</div>
            </div>
          </div>
        `;
    }).join('')}
    </div>`;
    openModal('เลือกคลังต้นทาง (คลังกลาง)', html, `<button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>`);
  },

  selectCentral(whId) {
    const w = this._centralWarehouses.find(x => x.id === whId);
    if (!w) return;

    const inputFrom = document.getElementById('tr-from');
    if (inputFrom.value !== w.id) {
      inputFrom.value = w.id;
      // Trigger onChange manually
      this.onFromWarehouseChange();
    }

    const thumb = document.getElementById('tr-from-thumb');
    thumb.style.background = 'none';
    thumb.innerHTML = UI.avatar(w.employeeAvatar || w.avatar, w.name, 40, 'warehouse');

    document.getElementById('tr-from-name').textContent = w.name;
    document.getElementById('tr-from-name').style.color = 'var(--primary)';
    document.getElementById('tr-from-meta').textContent = w.location || 'คลังกลาง';
    document.getElementById('tr-from-picker-btn').classList.add('selected');
    closeModal();
  },

  async onFromWarehouseChange() {
    const whId = document.getElementById('tr-from')?.value;
    if (!whId) {
      this._centralStock = [];
      return;
    }
    try {
      const pickerBtn = document.getElementById('tr-picker-btn');
      const fromThumb = document.getElementById('tr-from-thumb');

      if (pickerBtn) {
        pickerBtn.disabled = true;
        pickerBtn.classList.add('btn-picker-disabled');
        pickerBtn.innerHTML = '<span class="material-icons rotating" style="font-size:24px; margin-right:8px">sync</span> กำลังโหลดสต็อก...';
      }
      
      if (fromThumb) {
        fromThumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';
      }

      const res = await API.getCentralStock(whId);
      this._centralStock = res.stock || [];
      // Clear current selection
      this._selectedProduct = null;
      this._items = [];
      this.renderItems();

      if (fromThumb) {
        const wh = this._centralWarehouses.find(x => x.id === whId);
        fromThumb.innerHTML = UI.avatar(wh?.employeeAvatar || wh?.avatar, wh?.name, 40, 'warehouse');
      }

      if (pickerBtn) {
        pickerBtn.disabled = false;
        pickerBtn.classList.remove('btn-picker-disabled');
        pickerBtn.innerHTML = '<span class="material-icons" style="font-size:24px; margin-right:8px">add_circle</span> กดเพื่อเลือกสินค้าที่ต้องการเบิก';
      }
    } catch (e) {
      UI.toast('โหลดสต็อกไม่สำเร็จ: ' + e.message, 'error');
      const fromThumb = document.getElementById('tr-from-thumb');
      if (fromThumb) fromThumb.innerHTML = '<span class="material-icons">warehouse</span>';
    }
  },

  openEmployeePicker() {
    if (!this._employeeWarehouses || !this._employeeWarehouses.length) return UI.toast('ไม่พบคลังพนักงานในระบบ', 'info');

    const html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding-top:8px;">
      ${this._employeeWarehouses.map(w => {
        const avHtml = UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40);
        return `
          <div class="card" style="cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);transition:all 0.2s" onclick="PAGES.transfer.selectEmployee('${w.id}')" onpointerenter="this.style.borderColor='var(--primary)';this.style.transform='translateY(-2px)'" onpointerleave="this.style.borderColor='var(--border)';this.style.transform='none'">
            ${avHtml}
            <div>
              <div style="font-weight:700;font-size:0.95rem">${w.employeeName || 'พนักงาน'}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${w.name}</div>
            </div>
          </div>
        `;
    }).join('')}
    </div>`;
    openModal('เลือกคลังพนักงานปลายทาง', html, `<button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>`);
  },

  selectEmployee(whId) {
    const w = this._employeeWarehouses.find(x => x.id === whId);
    if (!w) return;
    document.getElementById('tr-to').value = w.id;

    const thumb = document.getElementById('tr-emp-thumb');
    if (thumb) {
      thumb.innerHTML = UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40, 'user');
    }

    document.getElementById('tr-emp-name').textContent = w.employeeName || w.name;
    document.getElementById('tr-emp-name').style.color = 'var(--primary)';
    document.getElementById('tr-emp-meta').textContent = w.name;
    document.getElementById('tr-emp-picker-btn').classList.add('selected');
    closeModal();
  },

  openProductPicker() {
    const whId = document.getElementById('tr-from')?.value;
    if (!whId) return UI.toast('กรุณาเลือกคลังต้นทางก่อนค้นหาสินค้า', 'warning');

    // Group central stock by product to show total available and nearest expiry (FEFO support)
    const grouped = {};
    const stockBatches = this._centralStock.filter(s => Number(s.qty) > 0);
    stockBatches.forEach(s => {
      const pid = s.productId;
      if (!grouped[pid]) {
        grouped[pid] = { ...s.product, productId: pid, totalQty: 0, nearestExp: '9999-12-31' };
      }
      grouped[pid].totalQty += Number(s.qty);
      if (s.expiryDate && s.expiryDate < grouped[pid].nearestExp) {
        grouped[pid].nearestExp = s.expiryDate;
      }
    });

    const productsInStock = Object.values(grouped);
    if (!productsInStock.length) return UI.toast('คลังนี้ไม่มีสินค้าคงเหลือ', 'warning');

    // Sort by Master Product List order
    productsInStock.sort((a,b) => {
      const idxA = this._products.findIndex(p => p.id === a.productId);
      const idxB = this._products.findIndex(p => p.id === b.productId);
      return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });

    openModal('เลือกสินค้าที่จะเบิก', `
      <div class="mb-16">
        <div class="search-bar">
          <span class="material-icons">search</span>
          <input type="text" id="tr-picker-query" placeholder="เบิกอะไรดี? ค้นหาชื่อหรือรหัส..." oninput="PAGES.transfer.filterPicker(this.value)" autofocus />
        </div>
      </div>
      <div id="tr-picker-grid" class="product-picker-grid">
        ${this.renderPickerGrid(productsInStock)}
      </div>

      <!-- Elegant Inline Qty Popup Container -->
      <div id="tr-qty-popup" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);background:rgba(0,0,0,0.4);animation: fadeIn 0.2s ease">
        <div style="background:#fff;border-radius:var(--radius-lg);padding:24px;width:300px;box-shadow:var(--shadow-lg);border:1px solid var(--border);animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)">
          <div style="text-align:center;margin-bottom:16px">
            <h3 id="tr-pop-title" style="margin:0;font-size:1.1rem;color:var(--primary);font-weight:700">ระบุจำนวนเบิก</h3>
            <p id="tr-pop-tray-label" style="margin:4px 0 0;font-size:0.75rem;color:var(--text-muted)">-</p>
            <div id="tr-pop-stock" style="margin-top:8px;font-size:0.85rem;font-weight:700;color:var(--danger)">สต็อก: 0</div>
          </div>
          
          <input type="hidden" id="tr-pop-pid" />
          
          <div class="form-group" style="margin-bottom:12px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">📦 จำนวน (ถาด)</label>
            <input type="number" id="tr-pop-trays" min="0" placeholder="0" style="font-size:1.2rem;height:45px;text-align:center;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" oninput="PAGES.transfer.popCalc()" />
          </div>
          
          <div class="form-group" style="margin-bottom:16px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">🍼 <span id="tr-pop-unit-label">จำนวน (เศษ)</span></label>
            <input type="number" id="tr-pop-units" min="0" placeholder="0" style="font-size:1.2rem;height:45px;text-align:center;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" oninput="PAGES.transfer.popCalc()" />
          </div>
          
          <div style="background:var(--bg-card2);padding:10px;border-radius:var(--radius-sm);text-align:center;margin-bottom:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">รวมเบิกทั้งสิ้น</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--primary)"><span id="tr-pop-total">0</span> <span id="tr-pop-unit-text" style="font-size:0.9rem;font-weight:400">หน่วย</span></div>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button class="btn btn-secondary" style="height:40px" onclick="document.getElementById('tr-qty-popup').classList.add('hidden')">ยกเลิก</button>
            <button class="btn btn-primary" style="height:40px" onclick="PAGES.transfer.popAdd()">ตกลง</button>
          </div>
        </div>
      </div>
      <style>
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes popIn { from { transform:scale(0.9); opacity:0; } to { transform:scale(1); opacity:1; } }
      </style>
    `, `<button class="btn btn-secondary" onclick="closeModal()">ปิดหน้าต่าง</button>`, '850px');
  },

  renderPickerGrid(products) {
    if (!products.length) return '<div class="text-center p-20 text-muted">ไม่พบสินค้า</div>';
    return products.map(p => {
      const st = PAGES['central-stock']._getExpiryStatus(p.nearestExp);
      return `
        <div class="picker-item" onclick="PAGES.transfer.showQtyInput('${p.id || p.productId}')">
          ${UI.image(p.imageUrl, 'p-img')}
          <div class="p-info">
            <div class="p-code">${p.code || '-'}</div>
            <div class="p-name" style="font-size:0.82rem">${p.name}</div>
            <div class="p-cat" style="font-size:0.7rem">${p.category || '-'}</div>
            <div style="font-size:0.8rem;margin-top:4px;color:var(--danger);font-weight:700">คงเหลือ: ${UI.currency(p.totalQty || p.stockQty, 0)} ${p.unit}</div>
            <div style="font-size:0.7rem;color:${st.color};font-weight:700">📌 ล็อตที่ใกล้หมดอายุที่สุด: ${UI.dateStr(p.nearestExp) || '-'}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  showQtyInput(id) {
    const s = this._centralStock.find(x => x.productId === id);
    const p = s?.product;
    if (!p) return;

    document.getElementById('tr-pop-pid').value = p.id;
    document.getElementById('tr-pop-title').textContent = p.name;
    document.getElementById('tr-pop-tray-label').textContent = `บรรจุ 1 ถาด = ${p.unitsPerTray || 0} ${p.unit}`;
    document.getElementById('tr-pop-unit-label').textContent = `จำนวน (เศษ/${p.unit || 'หน่วย'})`;
    document.getElementById('tr-pop-unit-text').textContent = p.unit || 'หน่วย';
    const totalQty = this._centralStock.filter(x => x.productId === id).reduce((a, b) => a + Number(b.qty), 0);
    document.getElementById('tr-pop-stock').textContent = `สต็อกคงเหลือรวม: ${UI.currency(totalQty, 0)} ${p.unit}`;

    document.getElementById('tr-pop-trays').value = '';
    document.getElementById('tr-pop-units').value = '';
    document.getElementById('tr-pop-total').textContent = 0;

    document.getElementById('tr-qty-popup').classList.remove('hidden');
    setTimeout(() => document.getElementById('tr-pop-trays').focus(), 100);
  },

  popCalc() {
    const id = document.getElementById('tr-pop-pid').value;
    const totalQty = this._centralStock.filter(x => x.productId === id).reduce((a, b) => a + Number(b.qty), 0);
    if (totalQty === 0) return;
    const s = this._centralStock.find(x => x.productId === id);
    if (!s) return;
    const p = s.product;
    const trays = parseInt(document.getElementById('tr-pop-trays').value) || 0;
    const units = parseInt(document.getElementById('tr-pop-units').value) || 0;
    const total = (trays * (p.unitsPerTray || 0)) + units;
    document.getElementById('tr-pop-total').textContent = UI.currency(total, 0);

    const totEl = document.getElementById('tr-pop-total');
    if (total > totalQty) totEl.style.color = 'var(--danger)';
    else totEl.style.color = 'var(--primary)';
  },

  popAdd() {
    const id = document.getElementById('tr-pop-pid').value;
    const totalQty = this._centralStock.filter(x => x.productId === id).reduce((a, b) => a + Number(b.qty), 0);
    const s = this._centralStock.find(x => x.productId === id);
    const p = s?.product;
    if (!p) return;

    const trays = parseInt(document.getElementById('tr-pop-trays').value) || 0;
    const units = parseInt(document.getElementById('tr-pop-units').value) || 0;
    const total = (trays * (p.unitsPerTray || 0)) + units;

    if (total <= 0) return UI.toast('กรุณาระบุจำนวน', 'warning');
    if (total > totalQty) return UI.toast(`สต็อกรวมไม่เพียงพอ (คงเหลือ ${totalQty} ${p.unit})`, 'error');

    // Add logic
    const existing = this._items.find(i => i.productId === id);
    if (existing) {
      if ((existing.qty + total) > totalQty) return UI.toast(`รวมแล้วเกินสต็อกรวมที่มี`, 'error');
      existing.trays += trays;
      existing.remUnits += units;
      existing.qty += total;
    } else {
      this._items.push({
        productId: p.id,
        trays, remUnits: units, qty: total, unit: p.unit, product: p
      });
    }

    UI.toast(`เพิ่ม ${p.name} เรียบร้อย`, 'success');
    document.getElementById('tr-qty-popup').classList.add('hidden');
    this.renderItems();
  },

  filterPicker(query) {
    const q = query.toLowerCase();
    // Consolidated filter
    const grouped = {};
    const stockBatches = this._centralStock.filter(s => Number(s.qty) > 0);
    stockBatches.forEach(s => {
      const prod = s.product;
      const pid = s.productId;
      if (prod && (prod.name.toLowerCase().includes(q) || (prod.code || '').toLowerCase().includes(q) || (prod.category || '').toLowerCase().includes(q))) {
        if (!grouped[pid]) {
          grouped[pid] = { ...prod, productId: pid, totalQty: 0, nearestExp: '9999-12-31' };
        }
        grouped[pid].totalQty += Number(s.qty);
        if (s.expiryDate && s.expiryDate < grouped[pid].nearestExp) {
          grouped[pid].nearestExp = s.expiryDate;
        }
      }
    });

    const filtered = Object.values(grouped);
    document.getElementById('tr-picker-grid').innerHTML = this.renderPickerGrid(filtered);
  },

  removeItem(idx) {
    this._items.splice(idx, 1);
    this.renderItems();
  },

  renderItems() {
    const el = document.getElementById('tr-items-list');
    if (!this._items.length) {
      el.innerHTML = UI.emptyState('swap_horiz', 'ยังไม่มีรายการ', 'เลือกสินค้าและจำนวนที่ต้องการเบิก');
      return;
    }

    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>สินค้า</th>
            <th class="td-right">จำนวนเบิก (ถาด)</th>
            <th class="td-right">เศษหน่วย</th>
            <th class="td-right">รวมเบิกทั้งหมด</th>
            <th class="td-center"></th>
          </tr></thead>
          <tbody>
            ${this._items.map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="td-bold">${item.product?.name || item.productId}</td>
                <td class="td-right">${UI.currency(item.trays, 0)} ถาด</td>
                <td class="td-right">${UI.currency(item.remUnits, 0)} ${item.unit}</td>
                <td class="td-right fw-bold" style="color:var(--accent)">${UI.currency(item.qty, 0)} ${item.unit}</td>
                <td class="td-center"><button class="btn btn-danger btn-xs" onclick="PAGES.transfer.removeItem(${i})"><span class="material-icons">close</span></button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async submit() {
    const fromId = document.getElementById('tr-from')?.value;
    const toId = document.getElementById('tr-to')?.value;

    if (!fromId) return UI.toast('กรุณาเลือกคลังต้นทาง', 'warning');
    if (!toId) return UI.toast('กรุณาเลือกคลังพนักงาน', 'warning');
    if (!this._items.length) return UI.toast('กรุณาเพิ่มสินค้าก่อนบันทึก', 'warning');
    if (fromId === toId) return UI.toast('คลังต้นทางและปลายทางห้ามเป็นคลังเดียวกัน', 'warning');

    let date, time;
    const adminDate = document.getElementById('tr-date')?.value;
    const adminTime = document.getElementById('tr-time')?.value;
    if (adminDate && adminTime) {
      date = adminDate;
      time = adminTime;
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      date = `${yyyy}-${mm}-${dd}`;
      time = `${hh}:${min}`;
    }

    try {
      UI.loading(true);
      await API.requestTransfer({
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        date: date,
        time: time,
        note: document.getElementById('tr-note')?.value,
        items: this._items.map(i => ({ productId: i.productId, qty: i.qty, unit: i.unit })),
      });

      UI.toast('สร้างรายการขอเบิกเรียบร้อยแล้ว ✅ รอพนักงานคลังจัดของ', 'success');
      this._items = [];
      this.renderItems();
      await this.loadData(); // Reload stock reference
    } catch (e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
