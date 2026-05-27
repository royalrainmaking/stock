// ============================================================
// pages/receive-goods.js – Receive goods into central warehouse
// ============================================================

PAGES['receive-goods'] = {
  _products: [],
  _warehouses: [],
  _items: [],
  _suppliers: [],

  async render() {
    const el = document.getElementById('page-receive-goods');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#1A73E8,#0D47A1)">
            <span class="material-icons">add_shopping_cart</span>
          </div>
          <div>
            <h2 class="page-title">รับสินค้าเข้าคลัง</h2>
            <p class="page-subtitle">บันทึกสินค้าเข้าคลังกลาง (Stock In)</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="showPage('receive-history')">
            <span class="material-icons">history</span> ดูประวัติการรับสินค้า
          </button>
        </div>
      </div>
      <div class="grid-2">
        <!-- 1. Warehouse Info -->
        <div class="card step-card">
          <div class="step-badge">1</div>
          <div class="card-title"><span class="material-icons" style="color:#1A73E8">warehouse</span>คลังที่รับสินค้า</div>
          <div class="form-group">
            <label>เลือกคลังกลางที่จะนำสินค้าเข้า *</label>
            <div id="rg-wh-picker-btn" class="product-picker-trigger" onclick="PAGES['receive-goods'].openCentralPicker()">
              <div id="rg-wh-thumb" class="product-thumb-preview" style="border-radius:50%;overflow:hidden;background:var(--bg-card2);display:flex;align-items:center;justify-content:center"><span class="material-icons">warehouse</span></div>
              <div class="product-info-preview">
                <div id="rg-wh-name" class="p-name">คลิกเพื่อเลือกคลังกลาง</div>
                <div id="rg-wh-meta" class="p-meta">คลังที่ต้องการนำสินค้าเข้า</div>
              </div>
            </div>
            <input type="hidden" id="rg-warehouse" value="" />
          </div>
          <div class="form-row">
            <div class="form-group"><label>วันที่รับสินค้า</label>
              ${AUTH.isAdmin() 
                ? `<input type="date" id="rg-date" value="${new Date().toISOString().split('T')[0]}" style="height:45px; width:100%; border-radius:12px; padding:0 16px; border:1px solid var(--border)" />`
                : `<div style="padding:10px 14px; background:var(--bg-card2); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:0.95rem; font-weight:700; color:var(--text-secondary)">${new Date().toLocaleDateString('th-TH', {year:'numeric', month:'long', day:'numeric'})}</div>`
              }
            </div>
            <div class="form-group"><label>เวลาที่รับ</label>
              ${AUTH.isAdmin()
                ? `<input type="time" id="rg-time" value="${new Date().toTimeString().substring(0,5)}" style="height:45px; width:100%; border-radius:12px; padding:0 16px; border:1px solid var(--border)" />`
                : `<div style="padding:10px 14px; background:var(--bg-card2); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:0.95rem; font-weight:700; color:var(--primary)">${new Date().toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} น.</div>`
              }
            </div>
          </div>
        </div>

        <!-- 2. Document Info -->
        <div class="card step-card">
          <div class="step-badge">2</div>
          <div class="card-title"><span class="material-icons" style="color:#9C27B0">description</span>รายละเอียดเอกสาร</div>
          
          <div class="form-row">
            <div class="form-group"><label>ใบสั่งซื้อเลขที่ (P/O No.)</label>
              <input type="text" id="rg-pono" placeholder="..." style="height:45px; border-radius:12px; padding:0 16px" />
            </div>
            <div class="form-group"><label>ใบกำกับภาษีเลขที่ (Tax Invoice No.)</label>
              <input type="text" id="rg-taxinvoice" placeholder="..." style="height:45px; border-radius:12px; padding:0 16px" />
            </div>
          </div>

          <div class="form-group"><label>เลขที่เอกสาร / บิลรับของ (ภายใน) *</label>
            <input type="text" id="rg-docno" placeholder="เช่น RC2604001" style="height:45px; border-radius:12px; padding:0 16px" />
          </div>

          <div class="form-group"><label>ผู้จำหน่าย (Supplier)</label>
            <select id="rg-supplier" style="height:45px; border-radius:12px; padding:0 16px; width:100%; border:1px solid var(--border)" onchange="PAGES['receive-goods'].onSupplierChange(this.value)">
              <option value="">-- เลือกผู้จำหน่าย --</option>
            </select>
          </div>
          <div id="rg-supplier-info" class="hidden" style="background:var(--bg-card2); padding:12px; border-radius:8px; font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;"></div>

          <div class="form-group"><label>หมายเหตุ</label>
            <input type="text" id="rg-note" placeholder="รายละเอียดอื่นๆ เพิ่มเติม..." style="height:45px; border-radius:12px; padding:0 16px" />
          </div>
        </div>
      </div>

      <!-- 3. Product Selection -->
      <div class="card mt-16 step-card">
        <div class="step-badge">3</div>
        <div class="card-title"><span class="material-icons" style="color:#00897B">inventory</span>เลือกรายการสินค้าที่จะรับเข้า</div>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px">กรุณาเลือกคลังที่จะรับสินค้า (ด้านบน) ก่อนกดเลือกสินค้า</p>
        <button id="rg-picker-btn" class="btn btn-primary btn-full btn-picker-disabled" style="height:60px; font-size:1.1rem; border-radius:16px; box-shadow:var(--shadow-lg)" onclick="PAGES['receive-goods'].openProductPicker()" disabled>
          <span class="material-icons" style="font-size:24px; margin-right:8px">lock</span> กรุณาเลือกคลังรับสินค้าก่อน
        </button>
      </div>

      <!-- 4. Summary List -->
      <div class="card mt-16 step-card">
        <div class="step-badge">4</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
          <div class="card-title" style="margin:0">4. รายการที่รอรับเข้า</div>
          <button class="btn btn-primary" onclick="PAGES['receive-goods'].submit()" id="rg-submit-btn">
            <span class="material-icons">save</span> ยืนยันการบันทึกรับสินค้า
          </button>
        </div>
        <div id="rg-items-list">
          ${UI.emptyState('move_to_inbox', 'ยังไม่มีรายการ', 'กรุณาระบุข้อมูลคลังและเพิ่มสินค้าที่จะรับเข้า')}
        </div>
      </div>
    `;
    // Global UI Loading indicator
    const whThumb = document.getElementById('rg-wh-thumb');
    if (whThumb) whThumb.innerHTML = '<span class="material-icons rotating" style="color:var(--primary)">sync</span>';

    await this.loadData();
  },

  async loadData() {
    try {
      const [pr, supps] = await Promise.all([API.getProducts(), API.getSuppliers()]);
      this._products = pr.products || [];
      this._suppliers = supps.suppliers || [];
      await this.loadWarehouses();
      this.renderSuppliers();
      this._items = [];
    } catch (e) {
      UI.toast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error');
    }
  },

  renderSuppliers() {
    const sel = document.getElementById('rg-supplier');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- เลือกผู้จำหน่าย --</option>' + 
      this._suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  },

  onSupplierChange(id) {
    const infoEl = document.getElementById('rg-supplier-info');
    if (!id) {
      infoEl.classList.add('hidden');
      return;
    }
    const s = this._suppliers.find(x => x.id === id);
    if (!s) return;
    infoEl.classList.remove('hidden');
    infoEl.innerHTML = `
      <div style="font-weight:bold; color:var(--text-primary); margin-bottom:4px">${s.name}</div>
      ${s.address ? `<div>${s.address}</div>` : ''}
      <div style="margin-top:4px">
        ${s.phone ? `<span><span class="material-icons" style="font-size:12px;vertical-align:middle">phone</span> ${s.phone}</span>` : ''}
        ${s.fax ? `<span style="margin-left:12px"><span class="material-icons" style="font-size:12px;vertical-align:middle">print</span> ${s.fax}</span>` : ''}
      </div>
      ${s.taxId ? `<div style="margin-top:4px; font-weight:bold">Tax ID: ${s.taxId}</div>` : ''}
    `;
  },

  async loadWarehouses() {
    try {
      const res = await API.getWarehouses();
      this._warehouses = (res.warehouses || []).filter(w => w.type === 'central');

      const whThumb = document.getElementById('rg-wh-thumb');
      if (whThumb && !document.getElementById('rg-warehouse').value) {
        whThumb.innerHTML = '<span class="material-icons">warehouse</span>';
      }
    } catch(e) {
      UI.toast('โหลดรายชื่อคลังไม่สำเร็จ', 'error');
    }
  },

  openCentralPicker() {
    if (!this._warehouses.length) return UI.toast('ไม่พบคลังกลางในระบบ', 'info');
    
    const html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding-top:8px;">
      ${this._warehouses.map(w => {
        const avHtml = UI.avatar(w.employeeAvatar || w.avatar, w.name, 40, 'warehouse');
        return `
          <div class="card" style="cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);transition:all 0.2s" onclick="PAGES['receive-goods'].selectCentral('${w.id}')" onpointerenter="this.style.borderColor='var(--primary)';this.style.transform='translateY(-2px)'" onpointerleave="this.style.borderColor='var(--border)';this.style.transform='none'">
            ${avHtml}
            <div>
              <div style="font-weight:700;font-size:0.95rem">${w.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${w.location || 'คลังกลาง'}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>`;
    openModal('เลือกคลังกลาง', html, `<button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>`);
  },

  selectCentral(whId) {
    const w = this._warehouses.find(x => x.id === whId);
    if (!w) return;
    document.getElementById('rg-warehouse').value = w.id;
    
    const thumb = document.getElementById('rg-wh-thumb');
    thumb.style.background = 'none';
    thumb.innerHTML = UI.avatar(w.employeeAvatar || w.avatar, w.name, 40, 'warehouse');
    
    document.getElementById('rg-wh-name').textContent = w.name;
    document.getElementById('rg-wh-name').style.color = 'var(--primary)';
    document.getElementById('rg-wh-meta').textContent = w.location || 'คลังกลาง';
    document.getElementById('rg-wh-picker-btn').classList.add('selected');

    const pickerBtn = document.getElementById('rg-picker-btn');
    if (pickerBtn) {
      pickerBtn.disabled = false;
      pickerBtn.classList.remove('btn-picker-disabled');
      pickerBtn.innerHTML = '<span class="material-icons" style="font-size:24px; margin-right:8px">add_circle_outline</span> กดเพื่อเลือกสินค้า';
    }

    closeModal();
  },

  openProductPicker() {
    openModal('เลือกสินค้า (ค้นหาจากรูป/รหัส)', `
      <div class="mb-16">
        <div class="search-bar">
          <span class="search-icon"><span class="material-icons">search</span></span>
          <input type="text" id="rg-picker-search" placeholder="พิมพ์ชื่อ, รหัส หรือ หมวดหมู่ เพื่อค้นหา..." oninput="PAGES['receive-goods'].filterPicker(this.value)" />
        </div>
      </div>
      <div class="product-picker-grid" id="rg-picker-grid" style="position:relative">
        ${this._products.map(p => `
          <div class="picker-item" onclick="PAGES['receive-goods'].showQtyInput('${p.id}', event)">
            ${UI.image(p.imageUrl, 'p-img')}
            <div class="p-info">
              <div class="p-code">${p.code}</div>
              <div class="p-name">${p.name}</div>
              <div class="p-cat">${p.category || '-'}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <!-- Elegant Inline Qty Popup Container -->
      <div id="rg-qty-popup" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);background:rgba(0,0,0,0.4);animation: fadeIn 0.2s ease">
        <div style="background:#fff;border-radius:var(--radius-lg);padding:24px;width:300px;box-shadow:var(--shadow-lg);border:1px solid var(--border);animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)">
          <div style="text-align:center;margin-bottom:16px">
            <h3 id="rg-pop-title" style="margin:0;font-size:1.1rem;color:var(--primary);font-weight:700">ระบุจำนวน</h3>
            <p id="rg-pop-tray-label" style="margin:4px 0 0;font-size:0.75rem;color:var(--text-muted)">-</p>
          </div>
          
          <input type="hidden" id="rg-pop-pid" />
          
          <div class="form-group" style="margin-bottom:12px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">📦 จำนวน (ถาด)</label>
            <input type="number" id="rg-pop-trays" min="0" placeholder="0" style="font-size:1.2rem;height:45px;text-align:center;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" oninput="PAGES['receive-goods'].popCalc()" />
          </div>
          
          <div class="form-group" style="margin-bottom:16px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">🍼 <span id="rg-pop-unit-label">จำนวน (เศษหน่วย)</span></label>
            <input type="number" id="rg-pop-units" min="0" placeholder="0" style="font-size:1.2rem;height:45px;text-align:center;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" oninput="PAGES['receive-goods'].popCalc()" />
          </div>
          
          <div class="form-group" style="margin-bottom:16px">
            <label style="font-size:0.8rem;color:var(--text-secondary)">📅 วันหมดอายุ</label>
            <input type="date" id="rg-pop-expiry" style="font-size:1rem;height:45px;padding:0 12px;border-radius:var(--radius-sm);border:1.5px solid var(--border-light)" />
          </div>
          
          <div style="background:var(--bg-card2);padding:10px;border-radius:var(--radius-sm);text-align:center;margin-bottom:20px">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">รวมรับเข้าทั้งสิ้น</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--primary)"><span id="rg-pop-total">0</span> <span id="rg-pop-unit-text" style="font-size:0.9rem;font-weight:400">หน่วย</span></div>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button class="btn btn-secondary" style="height:40px" onclick="document.getElementById('rg-qty-popup').classList.add('hidden')">ยกเลิก</button>
            <button class="btn btn-primary" style="height:40px" onclick="PAGES['receive-goods'].popAdd()">ตกลง</button>
          </div>
        </div>
      </div>
      <style>
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes popIn { from { transform:scale(0.9); opacity:0; } to { transform:scale(1); opacity:1; } }
      </style>
    `, '', '900px');
    setTimeout(() => document.getElementById('rg-picker-search').focus(), 100);
  },

  showQtyInput(id, event) {
    const p = this._products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('rg-pop-pid').value = p.id;
    document.getElementById('rg-pop-title').textContent = p.name;
    document.getElementById('rg-pop-tray-label').textContent = `บรรจุ 1 ถาด = ${p.unitsPerTray || 0} ${p.unit}`;
    document.getElementById('rg-pop-unit-label').textContent = `จำนวน (เศษ/${p.unit || 'หน่วย'})`;
    document.getElementById('rg-pop-unit-text').textContent = p.unit || 'หน่วย';
    document.getElementById('rg-pop-trays').value = '';
    document.getElementById('rg-pop-units').value = '';
    document.getElementById('rg-pop-expiry').value = '';
    document.getElementById('rg-pop-total').textContent = 0;
    document.getElementById('rg-qty-popup').classList.remove('hidden');
    setTimeout(() => document.getElementById('rg-pop-trays').focus(), 100);
  },

  popCalc() {
    const pid = document.getElementById('rg-pop-pid').value;
    const p = this._products.find(x => x.id === pid);
    const upt = p?.unitsPerTray || 0;
    const t = parseInt(document.getElementById('rg-pop-trays').value) || 0;
    const u = parseInt(document.getElementById('rg-pop-units').value) || 0;
    document.getElementById('rg-pop-total').textContent = (t * upt) + u;
  },

  popAdd() {
    const pid = document.getElementById('rg-pop-pid').value;
    const t = parseInt(document.getElementById('rg-pop-trays').value) || 0;
    const u = parseInt(document.getElementById('rg-pop-units').value) || 0;
    const expiry = document.getElementById('rg-pop-expiry').value;
    const p = this._products.find(x => x.id === pid);
    const upt = p?.unitsPerTray || 0;
    const total = (t * upt) + u;

    if (total <= 0) return UI.toast('กรุณากรอกจำนวน', 'warning');
    
    this.addItemDirect(pid, t, u, total, p.costVat || 0, expiry);
    document.getElementById('rg-qty-popup').classList.add('hidden');
    UI.toast('เพิ่มรายการเรียบร้อย: ' + p.name, 'success');
  },

  addItemDirect(productId, trays, remUnits, qty, costVat, expiryDate) {
    const product = this._products.find(p => p.id === productId);
    const existing = this._items.find(i => i.productId === productId && i.expiryDate === expiryDate);
    if (existing) {
      existing.trays += trays;
      existing.remUnits += remUnits;
      existing.qty += qty;
    } else {
      this._items.push({ 
        productId, trays, remUnits, qty, 
        unit: product?.unit || 'หน่วย', 
        costVat: product?.costVat || 0,
        costNoVat: product?.costNoVat || 0, 
        product, expiryDate 
      });
    }
    this.renderItems();
  },

  filterPicker(q) {
    q = q.toLowerCase();
    const grid = document.getElementById('rg-picker-grid');
    grid.innerHTML = this._products.filter(p =>
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.code || '').toLowerCase().includes(q) ||
      String(p.category || '').toLowerCase().includes(q)
    ).map(p => `
      <div class="picker-item" onclick="PAGES['receive-goods'].showQtyInput('${p.id}', event)">
        ${UI.image(p.imageUrl, 'p-img')}
        <div class="p-info">
          <div class="p-code">${p.code}</div>
          <div class="p-name">${p.name}</div>
          <div class="p-cat">${p.category || '-'}</div>
        </div>
      </div>
    `).join('');
  },

  calcQty() { /* Obsolete */ },
  addItem() { /* Obsolete */ },

  /* addItem was replaced by popAdd + addItemDirect */


  removeItem(idx) {
    this._items.splice(idx, 1);
    this.renderItems();
  },

  renderItems() {
    const el = document.getElementById('rg-items-list');
    if (!this._items.length) {
      el.innerHTML = UI.emptyState('move_to_inbox', 'ยังไม่มีรายการ', 'เพิ่มสินค้าจากฝั่งซ้ายก่อน');
      return;
    }

    // Sort items according to Master Product List order (Google Sheets order)
    this._items.sort((a, b) => {
      const idxA = this._products.findIndex(p => p.id === a.productId);
      const idxB = this._products.findIndex(p => p.id === b.productId);
      return (idxA !== -1 ? idxA : 9999) - (idxB !== -1 ? idxB : 9999);
    });

    const totalNoVat = this._items.reduce((a, i) => a + (i.qty * (i.costNoVat || 0)), 0);
    const totalVat = totalNoVat * (CONFIG.VAT_RATE || 0.07);
    const grandTotal = totalNoVat + totalVat;

    let rowsHTML = '';

    this._items.forEach((item, i) => {
      rowsHTML += `
        <tr style="transition:var(--transition)" onpointerenter="this.style.background='var(--bg-hover)'" onpointerleave="this.style.background='transparent'">
          <td class="td-center" style="color:var(--text-muted);font-size:0.8rem">${i + 1}</td>
          <td class="td-bold" style="font-size:0.95rem;color:var(--text-primary)">
            <div>${item.product?.name || item.product?.id || item.productId}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:normal;margin-top:2px;">
              <span style="color:var(--primary);font-weight:bold">${item.product?.category || '-'}</span> | รหัส: ${item.product?.code || '-'}
            </div>
          </td>
          <td class="td-right">
            <input type="number" min="0" value="${item.trays}" style="width:55px;height:32px;padding:4px;text-align:center;border:1px solid var(--border);border-radius:4px" onchange="PAGES['receive-goods'].updateItemField(${i}, 'trays', this.value)" />
          </td>
          <td class="td-right">
            <input type="number" min="0" value="${item.remUnits}" style="width:55px;height:32px;padding:4px;text-align:center;border:1px solid var(--border);border-radius:4px" onchange="PAGES['receive-goods'].updateItemField(${i}, 'remUnits', this.value)" />
          </td>
          <td class="td-center">
             <input type="date" value="${item.expiryDate || ''}" style="width:130px;height:32px;padding:4px;font-size:0.85rem;border:1px solid var(--border);border-radius:4px" onchange="PAGES['receive-goods'].updateItemField(${i}, 'expiryDate', this.value)" />
          </td>
          <td class="td-right" style="font-size:0.75rem;color:var(--text-secondary)">${item.unit}</td>
          <td class="td-right fw-bold" style="color:var(--primary);background:var(--bg-card2);font-size:1rem" id="rg-qty-${i}">${UI.currency(item.qty, 0)}</td>
          <td class="td-right">
            <input type="number" min="0" step="0.01" value="${item.costNoVat || 0}" style="width:80px;height:32px;padding:4px;text-align:right;border:1px solid var(--border);border-radius:4px" onchange="PAGES['receive-goods'].updateItemField(${i}, 'costNoVat', this.value)" />
          </td>
          <td class="td-right fw-bold" id="rg-tot-${i}" style="font-size:0.95rem">฿${UI.currency(item.qty * (item.costNoVat || 0))}</td>
          <td class="td-center">
            <button class="btn btn-danger btn-icon" style="width:28px;height:28px;padding:0;min-width:auto" onclick="PAGES['receive-goods'].removeItem(${i})"><span class="material-icons" style="font-size:16px">close</span></button>
          </td>
        </tr>
      `;
    });

    el.innerHTML = `
      <div class="table-wrap">
        <table style="border-collapse:separate;border-spacing:0">
          <thead style="position:sticky;top:0;z-index:10"><tr>
            <th class="td-center" style="width:40px">#</th>
            <th>รายการสินค้า</th>
            <th class="td-right" style="width:80px">ถาด</th>
            <th class="td-right" style="width:80px">เศษ</th>
            <th class="td-center" style="width:145px">วันหมดอายุ</th>
            <th style="width:50px"></th>
            <th class="td-right" style="width:110px;background:var(--bg-card2)">รวมทั้งหมด</th>
            <th class="td-right" style="width:110px">ราคาทุน(ไม่รวมVat)</th>
            <th class="td-right" style="width:110px">รวมเงิน</th>
            <th class="td-center" style="width:50px">คัดออก</th>
          </tr></thead>
          <tbody>${rowsHTML}</tbody>
          <tfoot>
            <tr style="background:var(--bg-card2)">
              <td colspan="7" class="td-right fw-bold" style="padding:8px 16px">รวมราคาสินค้า (ไม่รวม VAT)</td>
              <td class="td-right fw-bold" id="rg-total-novat" style="font-size:1rem;padding:8px 16px;color:var(--text-secondary)">฿${UI.currency(totalNoVat)}</td>
              <td></td>
            </tr>
            <tr style="background:var(--bg-card2)">
              <td colspan="7" class="td-right fw-bold" style="padding:8px 16px">ภาษีมูลค่าเพิ่ม (VAT 7%)</td>
              <td class="td-right fw-bold" id="rg-total-vat" style="font-size:1rem;padding:8px 16px;color:var(--text-secondary)">฿${UI.currency(totalVat)}</td>
              <td></td>
            </tr>
            <tr style="background:var(--bg-card2)">
              <td colspan="7" class="td-right fw-bold" style="padding:16px">มูลค่ารวมทั้งบิล (Grand Total)</td>
              <td class="td-right fw-bold text-success" id="rg-grand-total" style="font-size:1.1rem;padding:16px">฿${UI.currency(grandTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  updateItemField(idx, field, val) {
    const item = this._items[idx];
    if (!item) return;
    
    if (field === 'trays') item.trays = Math.max(0, parseInt(val) || 0);
    if (field === 'remUnits') item.remUnits = Math.max(0, parseInt(val) || 0);
    if (field === 'costNoVat') {
      item.costNoVat = Math.max(0, parseFloat(val) || 0);
      item.costVat = item.costNoVat * (1 + (CONFIG.VAT_RATE || 0.07));
    }
    if (field === 'expiryDate') item.expiryDate = val;

    const upt = item.product?.unitsPerTray || 0;
    item.qty = (item.trays * upt) + item.remUnits;

    // Direct DOM update to avoid focus loss
    const qtyEl = document.getElementById(`rg-qty-${idx}`);
    if (qtyEl) qtyEl.textContent = UI.currency(item.qty, 0) + ' ' + item.unit;
    
    const totEl = document.getElementById(`rg-tot-${idx}`);
    if (totEl) totEl.textContent = '฿' + UI.currency(item.qty * (item.costNoVat || 0));

    const totalNoVat = this._items.reduce((a, i) => a + (i.qty * (i.costNoVat || 0)), 0);
    const totalVat = totalNoVat * (CONFIG.VAT_RATE || 0.07);
    const grandTotal = totalNoVat + totalVat;

    const tNovatEl = document.getElementById('rg-total-novat');
    if (tNovatEl) tNovatEl.textContent = '฿' + UI.currency(totalNoVat);
    const tVatEl = document.getElementById('rg-total-vat');
    if (tVatEl) tVatEl.textContent = '฿' + UI.currency(totalVat);
    const grandEl = document.getElementById('rg-grand-total');
    if (grandEl) grandEl.textContent = '฿' + UI.currency(grandTotal);
  },

  async submit() {
    const warehouseId = document.getElementById('rg-warehouse')?.value;
    if (!warehouseId) return UI.toast('กรุณาเลือกคลัง', 'warning');
    if (!this._items.length) return UI.toast('กรุณาเพิ่มรายการสินค้า', 'warning');
    try {
      UI.loading(true);
      const adminDate = document.getElementById('rg-date')?.value;
      const adminTime = document.getElementById('rg-time')?.value;
      const submitDate = (adminDate && adminTime) 
        ? new Date(`${adminDate}T${adminTime}:00`).toISOString() 
        : new Date().toISOString();

      await API.receiveGoods({
        warehouseId,
        date: submitDate,
        supplierId: document.getElementById('rg-supplier')?.value,
        docNo: document.getElementById('rg-docno')?.value,
        poNo: document.getElementById('rg-pono')?.value,
        taxInvoiceNo: document.getElementById('rg-taxinvoice')?.value,
        note: document.getElementById('rg-note')?.value,
        items: this._items.map(i => ({ 
          productId: i.productId, qty: i.qty, unit: i.unit, 
          costVat: i.costVat, expiryDate: i.expiryDate 
        })),
      });
      UI.toast('บันทึกรับสินค้าเรียบร้อย ✅', 'success');
      this._items = [];
      this.renderItems();
      document.getElementById('rg-docno').value = '';
      document.getElementById('rg-pono').value = '';
      document.getElementById('rg-taxinvoice').value = '';
      document.getElementById('rg-note').value = '';
      document.getElementById('rg-supplier').value = '';
      document.getElementById('rg-supplier-info').classList.add('hidden');
      this.render(); // Re-render to update the display time if needed
    } catch (e) {
      UI.toast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { UI.loading(false); }
  }
};
