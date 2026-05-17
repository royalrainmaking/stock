// ============================================================
// pages/cancel-consign.js – Cancel consigned status to settle payment
// Redesigned to be perfectly consistent with consign, transfer, and receive-goods.
// ============================================================

PAGES['cancel-consign'] = {
  _employees: [],
  _items: [],
  _stock: [],
  _selectedEmpWh: '',
  _clockInterval: null,

  async render() {
    const el = document.getElementById('page-cancel-consign');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#F57C00,#E65100)">
            <span class="material-icons">undo</span>
          </div>
          <div>
            <h2 class="page-title">ยกเลิกฝากสินค้า (Cancel Consign)</h2>
            <p class="page-subtitle">เปลี่ยนสถานะสินค้า "ฝากคืน" กลับมาเป็น "พร้อมคิดเงิน" เพื่อให้เก็บยอดขายประจำวันได้</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="showPage('movement-history')">
            <span class="material-icons">history</span> ดูประวัติการทำรายการ
          </button>
        </div>
      </div>

      <div class="grid-2">
        <!-- 1. Source (Employee) -->
        <div class="card step-card">
          <div class="step-badge">1</div>
          <div class="card-title"><span class="material-icons" style="color:#F57C00">person_pin</span>คลังพนักงาน</div>
          <div class="form-group">
            <label>เลือกคลังพนักงาน *</label>
            <div id="re-emp-picker-btn" class="product-picker-trigger" onclick="PAGES['cancel-consign'].openEmployeePicker()">
              <div id="re-emp-thumb" class="product-thumb-preview" style="border-radius:50%;overflow:hidden;background:var(--bg-card2);display:flex;align-items:center;justify-content:center"><span class="material-icons">person</span></div>
              <div class="product-info-preview">
                <div id="re-emp-name" class="p-name">คลิกเพื่อเลือกพนักงาน</div>
                <div id="re-emp-meta" class="p-meta">เลือกว่าต้องการยกเลิกฝากสินค้าของใคร</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Transaction Info -->
        <div class="card step-card">
          <div class="step-badge">2</div>
          <div class="card-title"><span class="material-icons" style="color:#1A73E8">lock_clock</span>ข้อมูลการทำรายการ</div>
          <div class="form-group"><label>วันที่ทำรายการ</label>
            <div id="re-datetime-display" style="
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
              <span id="re-datetime-text" style="letter-spacing:0.02em"></span>
            </div>
          </div>
          <div style="background:var(--bg-base); border:1px dashed var(--border); border-radius:12px; padding:12px; display:flex; gap:10px; align-items:flex-start">
            <span class="material-icons" style="color:var(--warning); font-size:20px; flex-shrink:0">info_outline</span>
            <p style="font-size:0.8rem; line-height:1.4; color:var(--text-secondary); margin:0">
              การยกเลิกฝาก จะย้ายสินค้าฝากคืน (Consigned) กลับมาเป็นสินค้าปกติพร้อมจำหน่าย เพื่อทำการคิดเงินในระบบ
            </p>
          </div>
        </div>
      </div>

      <!-- 3. Product Selection -->
      <div class="card mt-16 step-card">
        <div class="step-badge">3</div>
        <div class="card-title"><span class="material-icons" style="color:#00897B">inventory</span>เลือกรายการสินค้าที่ต้องการยกเลิกฝาก</div>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px">กรุณาเลือกคลังพนักงาน (ด้านบน) ก่อนกดเลือกสินค้า</p>
        <button id="re-picker-btn" class="btn btn-primary btn-full btn-picker-disabled" style="height:60px; font-size:1.1rem; border-radius:16px; box-shadow:var(--shadow-lg)" onclick="PAGES['cancel-consign'].openProductPicker()" disabled>
          <span class="material-icons" style="font-size:24px; margin-right:8px">lock</span> กรุณาเลือกคลังพนักงานก่อน
        </button>
      </div>

      <!-- 4. Summary and Submit -->
      <div class="card mt-16 step-card">
        <div class="step-badge">4</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
          <div class="card-title" style="margin:0">4. รายการที่จะยกเลิกฝาก (เพื่อคิดเงินจริง)</div>
          <button class="btn btn-primary" onclick="PAGES['cancel-consign'].submit()" id="re-submit-btn" disabled>
            <span class="material-icons">payments</span> ยืนยันการยกเลิกฝาก (คิดเงิน)
          </button>
        </div>
        <div id="re-selected-list">
          ${UI.emptyState('shopping_basket', 'ยังไม่ได้เลือกรายการ', 'กรุณากดเลือกสินค้าจากรายการที่ฝากไว้')}
        </div>
      </div>
    `;

    const thumb = document.getElementById('re-emp-thumb');
    if (thumb) thumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';

    await this.loadData();

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
    const el = document.getElementById('re-datetime-text');
    if (el) el.textContent = `${dd}/${mm}/${yyyy}   ${hh}:${min}`;
  },

  async loadData() {
    try {
      const [wRes] = await Promise.all([API.getWarehouses()]);
      this._employees = (wRes.warehouses || []).filter(w => w.type === 'employee');
      
      const thumb = document.getElementById('re-emp-thumb');
      if (thumb && !this._selectedEmpWh) {
        thumb.innerHTML = '<span class="material-icons">person</span>';
      }
    } catch(e) { 
      UI.toast('โหลดข้อมูลพนักงานไม่สำเร็จ: ' + e.message, 'error'); 
    }
  },

  openEmployeePicker() {
    if (!this._employees || !this._employees.length) return UI.toast('ไม่พบคลังพนักงานในระบบ', 'info');
    
    const html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding-top:8px;">
      ${this._employees.map(w => {
        const avHtml = UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40);
        return `
          <div class="card" style="cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);transition:all 0.2s" onclick="PAGES['cancel-consign'].selectEmployee('${w.id}')" onpointerenter="this.style.borderColor='var(--primary)';this.style.transform='translateY(-2px)'" onpointerleave="this.style.borderColor='var(--border)';this.style.transform='none'">
            ${avHtml}
            <div>
              <div style="font-weight:700;font-size:0.95rem">${w.employeeName || 'พนักงาน'}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${w.name}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>`;
    openModal('เลือกพนักงานที่จะยกเลิกฝากสินค้า', html, `<button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>`);
  },

  async selectEmployee(whId) {
    const w = this._employees.find(x => x.id === whId);
    if (!w) return;
    this._selectedEmpWh = whId;
    this._items = [];
    
    document.getElementById('re-emp-thumb').innerHTML = UI.avatar(w.employeeAvatar || w.avatar, w.employeeName || w.name, 40);
    document.getElementById('re-emp-name').textContent = w.employeeName || w.name;
    document.getElementById('re-emp-name').style.color = 'var(--primary)';
    document.getElementById('re-emp-meta').textContent = w.name;
    document.getElementById('re-emp-picker-btn').classList.add('selected');
    
    closeModal();
    await this.loadStock(whId);
  },

  async loadStock(whId) {
    const pickerBtn = document.getElementById('re-picker-btn');
    const thumb = document.getElementById('re-emp-thumb');
    
    if (pickerBtn) {
      pickerBtn.disabled = true;
      pickerBtn.classList.add('btn-picker-disabled');
      pickerBtn.innerHTML = '<span class="material-icons rotating">sync</span> กำลังโหลดสต็อกสินค้าฝาก...';
    }
    if (thumb) {
      thumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';
    }
    
    try {
      const w = this._employees.find(x => x.id === whId);
      const res = await API.getEmployeeStock(w?.employeeId || whId);
      
      this._stock = (res.stock || []).filter(s => 
        String(s.warehouseId).trim() === String(whId).trim() && Number(s.consigned) > 0
      );
      this._items = [];
      this.renderSelected(); 
      
      if (thumb) {
        thumb.innerHTML = UI.avatar(w?.employeeAvatar || w?.avatar, w?.employeeName || w?.name, 40);
      }
      
      if (pickerBtn) {
        pickerBtn.disabled = false;
        pickerBtn.classList.remove('btn-picker-disabled');
        pickerBtn.innerHTML = '<span class="material-icons" style="font-size:24px; margin-right:8px">add_circle</span> กดเพื่อเลือกสินค้า';
      }
    } catch(e) {
      UI.toast('โหลดรายการสต็อกไม่สำเร็จ: ' + e.message, 'error');
      if (thumb) thumb.innerHTML = '<span class="material-icons">person</span>';
    }
  },

  openProductPicker() {
    if (!this._selectedEmpWh) return UI.toast('กรุณาเลือกคลังพนักงานก่อนค้นหาสินค้า', 'warning');
    if (!this._stock.length) return UI.toast('คลังนี้ไม่มีสินค้าฝากคงเหลือ', 'warning');

    const whName = document.getElementById('re-emp-name')?.textContent || 'คลังพนักงาน';
    openModal(`เลือกสินค้าที่จะยกเลิกฝาก (${whName})`, `
      <div class="mb-16">
        <div class="search-bar">
          <span class="material-icons">search</span>
          <input type="text" id="re-picker-query" placeholder="พิมพ์ชื่อสินค้าหรือรหัสเพื่อค้นหา..." oninput="PAGES['cancel-consign'].filterPicker(this.value)" autofocus />
        </div>
      </div>
      <div id="re-picker-grid" class="product-picker-grid">
        ${this.renderPickerGrid(this._stock)}
      </div>

      <!-- Qty Popup -->
      <div id="re-qty-popup" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);background:rgba(0,0,0,0.4);animation: fadeIn 0.2s ease">
        <div style="background:#fff;border-radius:var(--radius-lg);padding:24px;width:300px;box-shadow:var(--shadow-lg);border:1px solid var(--border);animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)">
          <div style="text-align:center;margin-bottom:16px">
            <h3 id="re-pop-title" style="margin:0;font-size:1.1rem;color:var(--primary);font-weight:700">ระบุจำนวนที่จะยกเลิกฝาก</h3>
            <p id="re-pop-tray-label" style="margin:4px 0 0;font-size:0.75rem;color:var(--text-muted)">-</p>
            <div id="re-pop-stock" style="margin-top:8px;font-size:0.85rem;font-weight:700;color:var(--danger)">ยอดฝากอยู่: 0</div>
          </div>
          
          <input type="hidden" id="re-pop-pid" />
          <input type="hidden" id="re-pop-expiry-val" />
          
          <div class="form-group" style="margin-bottom:12px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">📦 จำนวน (ถาด)</label>
            <input type="number" id="re-pop-trays" min="0" placeholder="0" style="font-size:1.2rem;height:45px;text-align:center;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" oninput="PAGES['cancel-consign'].popCalc()" />
          </div>
          
          <div class="form-group" style="margin-bottom:16px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">🍼 <span id="re-pop-unit-label">จำนวน (เศษ)</span></label>
            <input type="number" id="re-pop-units" min="0" placeholder="0" style="font-size:1.2rem;height:45px;text-align:center;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" oninput="PAGES['cancel-consign'].popCalc()" />
          </div>
          
          <div style="background:var(--bg-card2);padding:10px;border-radius:var(--radius-sm);text-align:center;margin-bottom:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">รวมยกเลิกฝากทั้งสิ้น</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--primary)"><span id="re-pop-total">0</span> <span id="re-pop-unit-text" style="font-size:0.9rem;font-weight:400">หน่วย</span></div>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button class="btn btn-secondary" style="height:40px" onclick="document.getElementById('re-qty-popup').classList.add('hidden')">ยกเลิก</button>
            <button class="btn btn-primary" style="height:40px" onclick="PAGES['cancel-consign'].popAdd()">ตกลง</button>
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
    if (!items.length) return '<div class="text-center p-20 text-muted">ไม่พบสินค้าที่ฝากไว้</div>';
    
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
            
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px; border-bottom:1px solid var(--border-light); padding-bottom:4px">ล็อตสินค้าที่ฝากไว้:</div>
            <div class="batch-selector-container">
              ${g.batches.sort((a,b) => (a.expiryDate||'9999').localeCompare(b.expiryDate||'9999')).map(s => `
                <div class="batch-badge" onclick="PAGES['cancel-consign'].showQtyInput('${s.productId}', '${s.expiryDate || ''}')">
                   <span class="material-icons" style="font-size:14px; margin-right:4px">event_note</span>
                   <div style="flex:1">
                     <div class="batch-exp">EXP: ${UI.dateStr(s.expiryDate) || '-'}</div>
                     <div class="batch-qty">ฝากอยู่: ${UI.currency(s.consigned, 0)} ${p?.unit || ''}</div>
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
    const s = this._stock.find(x => x.productId === id && (x.expiryDate || '') === (expiryDate || ''));
    const p = s?.product;
    if (!p) return;

    document.getElementById('re-pop-pid').value = id;
    document.getElementById('re-pop-expiry-val').value = expiryDate || '';
    document.getElementById('re-pop-title').textContent = p.name;
    document.getElementById('re-pop-tray-label').textContent = `บรรจุ 1 ถาด = ${p.unitsPerTray || 0} ${p.unit}`;
    document.getElementById('re-pop-unit-label').textContent = `จำนวน (เศษ/${p.unit || 'หน่วย'})`;
    document.getElementById('re-pop-unit-text').textContent = p.unit || 'หน่วย';
    document.getElementById('re-pop-stock').innerHTML = `ล็อตหมดอายุ: <span style="color:var(--primary)">${UI.dateStr(expiryDate) || '-'}</span><br>ยอดฝากคืนคงเหลือ: ${UI.currency(s.consigned, 0)} ${p.unit}`;

    document.getElementById('re-pop-trays').value = '';
    document.getElementById('re-pop-units').value = '';
    document.getElementById('re-pop-total').textContent = 0;

    document.getElementById('re-qty-popup').classList.remove('hidden');
    setTimeout(() => document.getElementById('re-pop-trays').focus(), 100);
  },

  popCalc() {
    const id = document.getElementById('re-pop-pid').value;
    const expiryDate = document.getElementById('re-pop-expiry-val').value;
    const s = this._stock.find(x => x.productId === id && (x.expiryDate || '') === (expiryDate || ''));
    if (!s) return;
    const p = s.product;
    const trays = parseInt(document.getElementById('re-pop-trays').value) || 0;
    const units = parseInt(document.getElementById('re-pop-units').value) || 0;
    const total = (trays * (p.unitsPerTray || 0)) + units;
    document.getElementById('re-pop-total').textContent = UI.currency(total, 0);

    const totEl = document.getElementById('re-pop-total');
    if (total > s.consigned) totEl.style.color = 'var(--danger)';
    else totEl.style.color = 'var(--primary)';
  },

  popAdd() {
    const id = document.getElementById('re-pop-pid').value;
    const expiryDate = document.getElementById('re-pop-expiry-val').value;
    const s = this._stock.find(x => x.productId === id && (x.expiryDate || '') === (expiryDate || ''));
    const p = s?.product;
    if (!p) return;

    const trays = parseInt(document.getElementById('re-pop-trays').value) || 0;
    const units = parseInt(document.getElementById('re-pop-units').value) || 0;
    const total = (trays * (p.unitsPerTray || 0)) + units;

    if (total <= 0) return UI.toast('กรุณาระบุจำนวน', 'warning');
    if (total > s.consigned) return UI.toast(`จำนวนเกินยอดฝากที่มี (ฝากอยู่ ${s.consigned} ${p.unit})`, 'error');

    const existing = this._items.find(i => i.productId === id && (i.expiryDate || '') === (expiryDate || ''));
    if (existing) {
      if ((existing.qty + total) > s.consigned) return UI.toast(`รวมแล้วเกินยอดฝากที่มี`, 'error');
      existing.qty += total;
    } else {
      this._items.push({ productId: id, expiryDate, qty: total, unit: p.unit || 'หน่วย', product: p, maxReturn: s.consigned });
    }

    UI.toast(`เพิ่ม ${p.name} เรียบร้อย`, 'success');
    document.getElementById('re-qty-popup').classList.add('hidden');
    this.renderSelected();
  },

  filterPicker(query) {
    const q = query.toLowerCase();
    const filtered = this._stock.filter(s => {
      const p = s.product;
      return p && (p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    });
    document.getElementById('re-picker-grid').innerHTML = this.renderPickerGrid(filtered);
  },

  removeItem(idx) {
    this._items.splice(idx, 1);
    this.renderSelected();
  },

  renderSelected() {
    const el = document.getElementById('re-selected-list');
    if (!this._items.length) {
      el.innerHTML = UI.emptyState('shopping_basket', 'ยังไม่ได้เลือกรายการ', 'กรุณากดเลือกสินค้าจากรายการที่ฝากไว้');
      this.checkReady();
      return;
    }

    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>สินค้า</th><th>หมดวันที่</th><th class="td-right">ยอดฝากเดิม</th><th class="td-right">ยกเลิกฝาก</th><th>หน่วย</th><th></th></tr></thead>
          <tbody>
            ${this._items.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="td-bold">${it.product?.name || it.productId}</td>
                <td style="font-size:0.85rem;color:var(--text-muted)">${UI.dateStr(it.expiryDate)}</td>
                <td class="td-right">${UI.currency(it.maxReturn, 0)}</td>
                <td class="td-right fw-bold text-primary">${UI.currency(it.qty, 0)}</td>
                <td>${it.unit}</td>
                <td class="td-center"><button class="btn btn-danger btn-xs" onclick="PAGES['cancel-consign'].removeItem(${idx})"><span class="material-icons">close</span></button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    this.checkReady();
  },

  checkReady() {
    const btn = document.getElementById('re-submit-btn');
    if (!btn) return;
    btn.disabled = !(this._selectedEmpWh && this._items.length);
  },

  async submit() {
    if (!this._selectedEmpWh) return UI.toast('กรุณาเลือกพนักงาน', 'warning');
    if (!this._items.length) return UI.toast('กรุณาเพิ่มรายการสินค้า', 'warning');

    if (!await UI.confirm('ยืนยันระบบ', 'ยืนยันระบบจะเปลี่ยนสถานะสินค้าช่อง "ฝาก" ให้เป็น "พร้อมคิดเงิน" ใช่หรือไม่?')) return;

    try {
      UI.loading(true);
      await API.cancelConsign({
        warehouseId: this._selectedEmpWh,
        items: this._items.map(it => ({ productId: it.productId, expiryDate: it.expiryDate, qty: it.qty }))
      });
      UI.toast('ระบบเปลี่ยนสถานะเป็นพร้อมคิดเงินเรียบร้อยแล้ว ✅', 'success');
      
      // Reset variables
      this._items = [];
      this._selectedEmpWh = '';
      this._stock = [];
      this.render(); // Reset layout
    } catch(e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
