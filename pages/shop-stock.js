// ============================================================
// pages/shop-stock.js – Consignment Inventory (Premium Compact UI)
// ============================================================

PAGES['shop-stock'] = {
  _selectedShopId: null,
  _selectedEmployeeId: null,
  _shops: [],
  _shopStock: [],
  _myStock: [],
  _products: [],
  _users: [],
  _cart: [],

  async render() {
    this._selectedEmployeeId = AUTH.getUser().id; 
    this._cart = [];
    
    const el = document.getElementById('page-shop-stock');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#795548,#5D4037)">
            <span class="material-icons">inventory_2</span>
          </div>
          <div>
            <h2 class="page-title">จัดการสต็อกร้านค้า</h2>
            <p class="page-subtitle">จัดการสินค้าฝากวาง สลับล็อต และรับคืนสินค้าจากร้านค้า</p>
          </div>
        </div>
        <div class="page-actions">
           <button class="btn btn-secondary btn-sm" onclick="PAGES['shop-stock'].openHistoryModal()">
            <span class="material-icons">history</span> ดูประวัติรายการร้านค้า
          </button>
        </div>
      </div>

      <div id="ss-main-container" class="ss-split-layout">
        <!-- Left Pane: Source -->
        <div class="ss-pane">
          <div class="ss-pane-header-complex">
            <div class="ss-header-top"><span class="material-icons" style="font-size:16px">account_circle</span> คลังต้นทาง</div>
            <div id="ss-emp-selector" class="ss-header-selector">${UI.spinner()}</div>
          </div>
          <div id="ss-my-stock-list" class="ss-pane-body">${UI.spinner()}</div>
        </div>

        <!-- Center Arrow -->
        <div class="ss-divider">
          <div class="ss-cart-badge-icon">
            <span class="material-icons">receipt_long</span>
            <div id="ss-cart-count" class="ss-badge hidden">0</div>
          </div>
        </div>

        <!-- Right Pane: Destination -->
        <div class="ss-pane">
          <div class="ss-pane-header-complex">
            <div class="ss-header-top" style="display:flex; justify-content:space-between">
               <span><span class="material-icons" style="font-size:16px">storefront</span> คลังร้านค้า</span>
               <button class="btn btn-xs btn-secondary" onclick="PAGES['shop-stock'].openHistoryModal()" style="padding:0 8px; height:18px; font-size:0.6rem">
                 <span class="material-icons" style="font-size:12px">history</span> ประวัติ
               </button>
            </div>
            <div id="ss-shop-selector" class="ss-header-selector">${UI.spinner()}</div>
          </div>
          <div id="ss-shop-stock-list" class="ss-pane-body">
            <div class="empty-state"><p>กรุณาเลือกร้านค้า</p></div>
          </div>
        </div>
      </div>

      <!-- Compact Cart Summary -->
      <div id="ss-cart-summary" class="ss-cart-panel hidden"></div>
    `;

    if (!document.getElementById('ss-compact-style')) {
      const s = document.createElement('style');
      s.id = 'ss-compact-style';
      s.innerHTML = `
        .ss-split-layout { display: grid; grid-template-columns: 1fr 60px 1fr; gap: 16px; height: calc(100vh - 280px); min-height: 400px; }
        .ss-pane { display: flex; flex-direction: column; background: #fff; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-sm); }
        
        .ss-pane-header-complex { background: var(--bg-base); border-bottom: 1px solid var(--border-light); padding: 10px; }
        .ss-header-top { font-weight: 700; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 4px; }
        .ss-header-selector { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
        
        .ss-thumb-mini { display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; min-width: 45px; opacity: 0.4; transition: 0.2s; }
        .ss-thumb-mini:hover { opacity: 0.7; }
        .ss-thumb-mini.active { opacity: 1; transform: translateY(-2px); }
        .ss-thumb-mini-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid transparent; background: #fff; padding: 1px; flex-shrink: 0; }
        .ss-thumb-mini.active .ss-thumb-mini-img { border-color: var(--primary); box-shadow: 0 4px 8px rgba(99,102,241,0.2); }
        .ss-thumb-mini-shop-img { border-radius: 4px; width: 44px; height: 32px; object-fit: cover; flex-shrink: 0; }
        .ss-thumb-mini-name { font-size: 0.6rem; font-weight: 600; text-align: center; white-space: nowrap; max-width: 50px; overflow: hidden; text-overflow: ellipsis; color: var(--text-secondary); }

        .ss-pane-body { padding: 10px; flex: 1; overflow-y: auto; background: #fff; }
        
        .ss-item-card { display: flex; gap: 8px; padding: 8px; background: #fff; border: 1px solid var(--border-light); border-radius: 6px; margin-bottom: 6px; cursor: pointer; align-items: center; }
        .ss-item-card:hover { border-color: var(--primary); background: var(--bg-hover); }
        .ss-item-img { width: 34px; height: 34px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: #eee; }
        .ss-item-title { font-weight: 700; font-size: 0.78rem; color: var(--text-primary); }
        .ss-item-sub { font-size: 0.7rem; color: var(--text-muted); }

        .ss-product-group { border: 1px solid var(--border-light); border-radius: 6px; overflow: hidden; margin-bottom: 10px; }
        .ss-product-header { padding: 6px 10px; background: var(--bg-base); border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 8px; }
        .ss-batch-row { display: flex; align-items: center; padding: 6px 10px; border-bottom: 1px dashed var(--border-light); gap: 8px; font-size: 0.75rem; }
        .ss-batch-info { flex: 1; display: flex; flex-direction: column; }
        .ss-batch-date { font-weight: 700; color: var(--text-secondary); }
        .ss-batch-status { font-size: 0.6rem; font-weight: 700; }
        
        .health-good .ss-batch-status { color: #10b981; }
        .health-warning { background: #fffbeb; }
        .health-danger { background: #fef2f2; }
        .health-danger .ss-batch-status { color: #ef4444; }

        .ss-divider { display: flex; align-items: center; justify-content: center; position: relative; }
        .ss-cart-badge-icon { width: 44px; height: 44px; border-radius: 50%; background: var(--bg-base); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-muted); position: relative; }
        .ss-badge { position: absolute; top: -5px; right: -5px; background: var(--primary); color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }

        .ss-cart-panel { 
          position: fixed; bottom: 20px; right: 20px; width: 400px; background: #fff; 
          border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--shadow-lg);
          overflow: hidden; display: flex; flex-direction: column; z-index: 1000;
        }
        .ss-cart-header { padding: 12px 16px; background: var(--primary); color: #fff; display: flex; justify-content: space-between; align-items: center; }
        .ss-cart-body { max-height: 300px; overflow-y: auto; padding: 12px; }
        .ss-cart-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-light); font-size: 0.75rem; }
        .ss-cart-footer { padding: 16px; background: var(--bg-base); border-top: 1px solid var(--border-light); }
        
        .type-tag { font-size: 0.6rem; font-weight: 800; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; }
        .tag-move { background: #e0e7ff; color: #4338ca; }
        .tag-return { background: #fee2e2; color: #b91c1c; }
        .tag-swap { background: #fef3c7; color: #92400e; }
      `;
      document.head.appendChild(s);
    }

    await this.loadInitial();
  },

  async loadInitial() {
    try {
      const [sr, ur, pr] = await Promise.all([API.getShops(), API.getUsers(), API.getProducts()]);
      this._shops = sr.shops || [];
      this._users = ur.users || [];
      this._products = pr.products || [];
      this.renderSelectors();
      await this.refreshAll();
    } catch (e) { UI.toast(e.message, 'error'); }
  },

  renderSelectors() {
    const isAdmin = AUTH.getRole() === 'admin';
    const myId = AUTH.getUser().id;

    const empArea = document.getElementById('ss-emp-selector');
    const emps = isAdmin ? this._users.filter(u => ['sell', 'admin', 'stock'].includes(u.role) && u.active && u.whActive) : [this._users.find(u => u.id === myId)];
    const defaultEmpImg = 'https://storage.googleapis.com/fastwork-static/748949a9-a424-466f-a248-e75d2b682171.jpg';
    
    empArea.innerHTML = emps.map(u => `
      <div class="ss-thumb-mini ${u.id === this._selectedEmployeeId ? 'active' : ''}" onclick="PAGES['shop-stock'].selectEmployee('${u.id}')">
        ${UI.avatar(u.avatar, u.displayName, 32, 'user', 'ss-thumb-mini-img')}
        <div class="ss-thumb-mini-name">${u.displayName}</div>
      </div>
    `).join('');

    const shopArea = document.getElementById('ss-shop-selector');
    const myShops = isAdmin ? this._shops : this._shops.filter(s => s.salesPersonId === myId);
    
    shopArea.innerHTML = myShops.map(s => `
      <div class="ss-thumb-mini ${s.id === this._selectedShopId ? 'active' : ''}" onclick="PAGES['shop-stock'].selectShop('${s.id}')">
        ${UI.avatar(s.imageUrl, s.name, 32, 'warehouse', 'ss-thumb-mini-img ss-thumb-mini-shop-img')}
        <div class="ss-thumb-mini-name">${s.name}</div>
      </div>
    `).join('');
  },

  async selectEmployee(id) {
    this._selectedEmployeeId = id;
    this._cart = [];
    this.renderSelectors();
    await this.refreshAll();
  },

  async selectShop(id) {
    this._selectedShopId = id;
    this._cart = [];
    this.renderSelectors();
    await this.refreshAll();
  },

  async refreshAll() {
    try {
      UI.loading(true);
      const [er, sr] = await Promise.all([
        API.getEmployeeStock(this._selectedEmployeeId),
        this._selectedShopId ? API.getShopStock(this._selectedShopId) : Promise.resolve({stock:[]})
      ]);
      this._myStock = er.stock || [];
      this._shopStock = sr.stock || [];
      this.renderMyStock();
      this.renderShopStock();
      this.renderCart();
    } catch (e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  },

  renderMyStock() {
    const container = document.getElementById('ss-my-stock-list');
    const groups = {};
    this._myStock.forEach(s => {
      if (Number(s.qty) <= 0) return;
      if (!groups[s.productId]) groups[s.productId] = { id: s.productId, batches: [] };
      groups[s.productId].batches.push(s);
    });
    
    if (Object.keys(groups).length === 0) {
      container.innerHTML = UI.emptyState('inventory', 'ไม่มีสินค้าในคลัง');
      return;
    }

    const now = new Date();
    container.innerHTML = Object.values(groups).map(g => {
      const p = this._products.find(px => px.id === g.id) || { name: 'Unknown', unit: '' };
      return `
        <div class="ss-product-group">
          <div class="ss-product-header">
            <img src="${p.imageUrl || ''}" class="ss-item-img" style="width:24px;height:24px" onerror="this.src='https://via.placeholder.com/30'" />
            <div class="ss-item-title" style="font-size:0.75rem">${p.name}</div>
          </div>
          <div class="ss-batch-list">
            ${g.batches.map(b => {
              const diffDays = Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24));
              let statusClass = 'health-good'; let statusLabel = 'ปกติ';
              if (diffDays <= 14) { statusClass = 'health-danger'; statusLabel = 'ต้องระวัง'; }
              else if (diffDays <= 30) { statusClass = 'health-warning'; statusLabel = 'ใกล้'; }
              return `
                <div class="ss-batch-row ${statusClass}" onclick="PAGES['shop-stock'].openMoveModal('${g.id}', '${b.expiryDate}')" style="cursor:pointer">
                  <div class="ss-batch-info">
                    <span class="ss-batch-date">${UI.dateStr(b.expiryDate)}</span>
                    <span class="ss-batch-status">${statusLabel} (${diffDays} ว.)</span>
                  </div>
                  <div class="ss-batch-qty" style="color:var(--primary)">${b.qty}</div>
                  <span class="material-icons" style="font-size:16px; color:var(--primary)">add_circle</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  renderShopStock() {
    const container = document.getElementById('ss-shop-stock-list');
    if (!this._selectedShopId) { container.innerHTML = UI.emptyState('storefront', 'เลือกร้านค้าปลายทาง'); return; }
    
    const groups = {};
    this._shopStock.forEach(s => {
      if (!groups[s.productId]) groups[s.productId] = { id: s.productId, batches: [] };
      groups[s.productId].batches.push(s);
    });
    
    if (Object.keys(groups).length === 0) { container.innerHTML = UI.emptyState('storefront', 'ไม่มีสินค้าฝากวาง'); return; }
    
    const now = new Date();
    container.innerHTML = Object.values(groups).map(g => {
      const p = this._products.find(px => px.id === g.id) || { name: 'Unknown', unit: '' };
      return `
        <div class="ss-product-group">
          <div class="ss-product-header">
            <img src="${p.imageUrl || ''}" class="ss-item-img" style="width:24px;height:24px" onerror="this.src='https://via.placeholder.com/30'" />
            <div class="ss-item-title" style="font-size:0.75rem">${p.name}</div>
          </div>
          <div class="ss-batch-list">
            ${g.batches.map(b => {
              const diffDays = Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24));
              let statusClass = 'health-good'; let statusLabel = 'ปกติ';
              if (diffDays <= 14) { statusClass = 'health-danger'; statusLabel = 'ต้องออก'; }
              else if (diffDays <= 30) { statusClass = 'health-warning'; statusLabel = 'ใกล้'; }
              return `
                <div class="ss-batch-row ${statusClass}">
                  <div class="ss-batch-info">
                    <span class="ss-batch-date">${UI.dateStr(b.expiryDate)}</span>
                    <span class="ss-batch-status">${statusLabel} (${diffDays} ว.)</span>
                  </div>
                  <div class="ss-batch-qty">${b.qty}</div>
                  <div style="display:flex;gap:4px">
                    <button class="btn btn-xs" style="padding:2px" onclick="PAGES['shop-stock'].openSwapModal('${g.id}', '${b.expiryDate}')"><span class="material-icons" style="font-size:14px">sync</span></button>
                    <button class="btn btn-xs btn-danger" style="padding:2px" onclick="PAGES['shop-stock'].openReturnModal('${g.id}', '${b.expiryDate}')"><span class="material-icons" style="font-size:14px">undo</span></button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  openMoveModal(pid, specificExp = null) {
    if (!this._selectedShopId) return UI.toast('กรุณาเลือกร้านค้าก่อน', 'warning');
    const p = this._products.find(px => px.id === pid);
    
    // หากไม่ได้ระบุล็อตมา (กรณีอนาคต) ให้เลือกตัวที่ใกล้หมดอายุที่สุด
    if (!specificExp) {
      const myBatches = this._myStock.filter(s => s.productId === pid && s.qty > 0).sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate));
      if (myBatches.length > 0) specificExp = myBatches[0].expiryDate;
    }
    
    if (!specificExp) return UI.toast('ไม่มีสินค้าในคลัง', 'warning');
    const batch = this._myStock.find(s => s.productId === pid && s.expiryDate === specificExp);

    openModal(`โอนเข้า: ${p.name}`, `
      <div style="text-align:center; margin-bottom:15px">
        <div class="text-muted" style="font-size:0.8rem">ล็อตวันหมดอายุ</div>
        <div class="fw-bold" style="font-size:1.1rem; color:var(--text-secondary)">${UI.dateStr(specificExp)}</div>
        <div class="ss-badge tag-move" style="margin-top:5px">คงเหลือในคลัง: ${batch.qty} ${p.unit}</div>
        <input type="hidden" id="mv-batch" value="${specificExp}" />
      </div>
      <div class="form-group">
        <label>จำนวนที่ต้องการโอน (${p.unit})</label>
        <input type="number" id="mv-qty" value="${batch.qty}" min="1" max="${batch.qty}" class="text-center" style="font-size:2rem; font-weight:800; color:var(--primary)" />
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES['shop-stock'].addToCart('move', '${pid}')">เพิ่มเข้าบิล</button>
    `);
  },

  openReturnModal(pid, exp) {
    const p = this._products.find(px => px.id === pid);
    const b = this._shopStock.find(s => s.productId === pid && s.expiryDate === exp);
    openModal(`คืนของ: ${p.name}`, `
      <div class="form-group">
        <label>ล็อต: ${UI.dateStr(exp)} | มี ${b.qty}</label>
        <input type="number" id="rt-qty" value="${b.qty}" min="1" max="${b.qty}" class="text-center" style="font-size:1.5rem" />
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-danger" onclick="PAGES['shop-stock'].addToCart('return', '${pid}', '${exp}')">เพิ่มเข้าบิล</button>
    `);
  },

  openSwapModal(pid, exp) {
    const p = this._products.find(px => px.id === pid);
    const b = this._shopStock.find(s => s.productId === pid && s.expiryDate === exp);
    const myBatches = this._myStock.filter(s => s.productId === pid && s.qty > 0);
    if (!myBatches.length) return UI.toast('คลังไม่มีของสลับ', 'warning');

    openModal(`สลับของ: ${p.name}`, `
      <div class="form-group">
        <label>สลับล็อต: ${UI.dateStr(exp)}</label>
        <select id="sw-new" class="mb-8">
          ${myBatches.map(mb => `<option value="${mb.expiryDate}">${UI.dateStr(mb.expiryDate)} (${mb.qty})</option>`).join('')}
        </select>
        <label>จำนวน</label>
        <input type="number" id="sw-qty" value="${b.qty}" min="1" max="${b.qty}" class="text-center" />
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-accent" onclick="PAGES['shop-stock'].addToCart('swap', '${pid}', '${exp}')">เพิ่มเข้าบิล</button>
    `);
  },

  addToCart(type, pid, exp = null) {
    const p = this._products.find(px => px.id === pid);
    const qtyInput = document.getElementById(type === 'move' ? 'mv-qty' : (type === 'return' ? 'rt-qty' : 'sw-qty'));
    const qty = Number(qtyInput.value);
    
    const item = { type, productId: pid, productName: p.name, qty, price: p.shopWholesale || 0, unit: p.unit };
    
    if (type === 'move') {
      const selectedExp = document.getElementById('mv-batch').value;
      const batch = this._myStock.find(s => s.productId === pid && s.expiryDate === selectedExp);
      if (qty > batch.qty) return UI.toast(`ล็อตนี้มีสินค้าเพียง ${batch.qty} ชิ้น`, 'warning');
      this._cart.push({ ...item, expiryDate: selectedExp });
    } else if (type === 'return') {
      this._cart.push({ ...item, expiryDate: exp });
    } else if (type === 'swap') {
      this._cart.push({ ...item, oldExpiry: exp, newExpiry: document.getElementById('sw-new').value });
    }
    closeModal();
    this.renderCart();
  },

  renderCart() {
    const panel = document.getElementById('ss-cart-summary');
    const badge = document.getElementById('ss-cart-count');
    const count = this._cart.length;
    
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);

    if (count === 0) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');

    let totalMove = 0; let totalReturn = 0;
    const rows = this._cart.map((it, idx) => {
      const amt = it.type === 'swap' ? 0 : it.qty * it.price;
      if (it.type === 'move') totalMove += amt;
      if (it.type === 'return') totalReturn += amt;
      return `
        <div class="ss-cart-row">
          <span class="type-tag tag-${it.type}">${it.type === 'move' ? 'IN' : (it.type === 'return' ? 'OUT' : 'SWAP')}</span>
          <div style="flex:1">
            <div class="fw-bold">${it.productName}</div>
            <div class="text-muted" style="font-size:0.6rem">${it.qty} ${it.unit} @ ${UI.currency(it.price)}</div>
          </div>
          <div class="fw-bold">${it.type === 'swap' ? '-' : UI.currency(amt)}</div>
          <button class="btn btn-xs btn-icon-danger" onclick="PAGES['shop-stock'].removeFromCart(${idx})"><span class="material-icons" style="font-size:14px">close</span></button>
        </div>
      `;
    }).join('');

    const netTotal = totalMove - totalReturn;
    panel.innerHTML = `
      <div class="ss-cart-header">
        <span style="font-weight:800; font-size:0.85rem">สรุปบิลปัจจุบัน (${count})</span>
        <button class="btn btn-xs" style="background:rgba(255,255,255,0.2); border:none; color:#fff" onclick="this.parentElement.parentElement.classList.add('hidden')">ซ่อน</button>
      </div>
      <div class="ss-cart-body">${rows}</div>
      <div class="ss-cart-footer">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.8rem">
          <div>ยอดสุทธิ:</div>
          <div class="fw-bold" style="font-size:1.1rem; color:var(--primary)">฿${UI.currency(netTotal)}</div>
        </div>
        <button class="btn btn-primary btn-block" onclick="PAGES['shop-stock'].confirmAll()">
          <span class="material-icons">check_circle</span> ยืนยันบันทึกบิล
        </button>
      </div>
    `;
  },

  removeFromCart(idx) {
    this._cart.splice(idx, 1);
    this.renderCart();
  },

  async confirmAll() {
    try {
      UI.loading(true);
      const docNo = 'SS-' + Date.now().toString().slice(-6); // Generate short unique docNo
      const moves = this._cart.filter(it => it.type === 'move');
      const returns = this._cart.filter(it => it.type === 'return');
      const swaps = this._cart.filter(it => it.type === 'swap');

      if (moves.length) await API.moveToShop({ shopId: this._selectedShopId, employeeId: this._selectedEmployeeId, items: moves, docNo });
      
      for (const r of returns) {
        await API.returnFromShop({ 
          shopId: this._selectedShopId, employeeId: this._selectedEmployeeId, 
          productId: r.productId, expiryDate: r.expiryDate, qty: r.qty, 
          refundAmount: r.qty * r.price, docNo 
        });
      }
      
      for (const s of swaps) {
        await API.swapShopStock({ 
          shopId: this._selectedShopId, employeeId: this._selectedEmployeeId, 
          productId: s.productId, oldExpiry: s.oldExpiry, newExpiry: s.newExpiry, qty: s.qty, docNo 
        });
      }

      UI.toast('บันทึกสำเร็จ', 'success');
      
      // แสดงใบเสร็จยืนยัน
      this.showShopReceipt({
        docNo,
        shopName: this._shops.find(s => s.id === this._selectedShopId)?.name || '-',
        employeeName: this._users.find(u => u.id === this._selectedEmployeeId)?.displayName || '-',
        items: [...this._cart],
        netTotal: moves.reduce((sum, it) => sum + (it.qty * it.price), 0) - returns.reduce((sum, it) => sum + (it.qty * it.price), 0)
      });

      this._cart = [];
      await this.refreshAll();
    } catch (e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  },

  showShopReceipt(data) {
    if (!document.getElementById('delivery-note-styles')) {
      const s = document.createElement('style');
      s.id = 'delivery-note-styles';
      s.innerHTML = `
        .dn-container { background: #fff; padding: 0; color: var(--text-primary); font-family: var(--font); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-lg); }
        .dn-header { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; padding: 30px 20px; text-align: center; position: relative; }
        .dn-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: rgba(0,0,0,0.1); }
        .dn-title { font-size: 1.5rem; font-weight: 900; letter-spacing: 1px; margin: 0; }
        .dn-subtitle { font-size: 0.7rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 3px; margin-top: 4px; }
        .dn-body { padding: 20px; }
        .dn-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; padding: 15px; background: var(--bg-base); border-radius: var(--radius-sm); border: 1px solid var(--border-light); }
        .dn-meta-item { display: flex; flex-direction: column; }
        .dn-label { font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800; margin-bottom: 2px; }
        .dn-value { font-size: 0.82rem; font-weight: 700; color: var(--text-primary); }
        .dn-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .dn-table th { text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); padding: 10px 0; border-bottom: 2px solid var(--bg-base); }
        .dn-table td { padding: 12px 0; border-bottom: 1px solid var(--bg-base); vertical-align: top; }
        .dn-item-name { font-weight: 700; font-size: 0.85rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
        .dn-item-type { font-size: 0.55rem; padding: 2px 6px; border-radius: 4px; font-weight: 900; text-transform: uppercase; }
        .dn-item-qty { font-weight: 800; color: var(--primary); font-size: 1rem; }
        .dn-total-row { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: var(--bg-base); border-radius: var(--radius-sm); border: 1px solid var(--border-light); }
        .dn-total-label { font-weight: 800; font-size: 0.85rem; color: var(--text-secondary); }
        .dn-total-value { font-size: 1.4rem; font-weight: 900; color: var(--primary); }
        .dn-footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px dashed var(--border-light); font-size: 0.7rem; color: var(--text-muted); }
        
        .tag-move-dn { background: #e0e7ff; color: #4338ca; }
        .tag-return-dn { background: #fee2e2; color: #b91c1c; }
        .tag-swap-dn { background: #fef3c7; color: #92400e; }

        @media print {
          body * { visibility: hidden !important; }
          #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border-radius: 0; }
          .no-print { display: none !important; }
        }
      `;
      document.head.appendChild(s);
    }

    const content = `
      <div class="dn-container" id="receipt-print-area">
        <div class="dn-header">
          <div class="dn-title">DELIVERY NOTE</div>
          <div class="dn-subtitle">ใบนำส่งสินค้า / ใบรับคืน</div>
        </div>

        <div class="dn-body">
          <div class="dn-meta">
            <div class="dn-meta-item">
              <span class="dn-label">เลขที่เอกสาร</span>
              <span class="dn-value" style="color:var(--primary)">${data.docNo}</span>
            </div>
            <div class="dn-meta-item">
              <span class="dn-label">วันที่ทำรายการ</span>
              <span class="dn-value">${UI.dateStr(new Date())}</span>
            </div>
            <div class="dn-meta-item">
              <span class="dn-label">พนักงานต้นทาง (FROM)</span>
              <span class="dn-value">${data.employeeName}</span>
            </div>
            <div class="dn-meta-item">
              <span class="dn-label">ร้านค้าปลายทาง (TO)</span>
              <span class="dn-value">${data.shopName}</span>
            </div>
          </div>

          <table class="dn-table">
            <thead>
              <tr>
                <th>รายละเอียดสินค้า</th>
                <th style="text-align:right">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(it => `
                <tr>
                  <td>
                    <div class="dn-item-name">
                      <span class="dn-item-type tag-${it.type}-dn">${it.type === 'move' ? 'IN' : (it.type === 'return' ? 'OUT' : 'SWAP')}</span>
                      ${it.productName}
                    </div>
                    <div style="font-size:0.65rem; color:var(--text-muted); margin-top:3px">ล็อต: ${UI.dateStr(it.expiryDate || it.newExpiry)} | @ ฿${UI.currency(it.price)}</div>
                  </td>
                  <td style="text-align:right">
                    <span class="dn-item-qty">${it.qty}</span> <small style="color:var(--text-muted)">${it.unit}</small>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="dn-total-row">
            <span class="dn-total-label">มูลค่าสินค้าสุทธิ (NET TOTAL)</span>
            <span class="dn-total-value">฿${UI.currency(data.netTotal)}</span>
          </div>

          <div class="dn-footer">
            <div style="font-weight:700">ยืนยันรายการจัดส่งสินค้าสำเร็จ</div>
            <div style="margin-top:4px; opacity:0.7">ระบบจัดการสต็อกอัจฉริยะ StockFanggie</div>
          </div>
        </div>

        <div class="no-print" style="padding:20px; display:flex; flex-wrap:wrap; gap:10px; background:var(--bg-base)">
          <button class="btn btn-primary" style="flex:1; min-width:140px; font-weight:700" onclick="window.print()">
            <span class="material-icons" style="font-size:18px">print</span> พิมพ์ใบส่งของ
          </button>
          <button class="btn btn-success" style="flex:1; min-width:140px; font-weight:700" onclick="PAGES['shop-stock'].saveReceiptImage()">
            <span class="material-icons" style="font-size:18px">image</span> บันทึกรูปภาพ
          </button>
          <button class="btn btn-secondary" style="width:100%; margin-top:5px" onclick="closeModal()">ปิดหน้าต่าง</button>
        </div>
      </div>
    `;

    openModal('จัดทำใบนำส่งสำเร็จ', content, '', '550px');
  },

  async saveReceiptImage() {
    const el = document.getElementById('receipt-print-area');
    if (!el) return;
    try {
      UI.loading(true);
      const noPrint = el.querySelector('.no-print');
      if (noPrint) noPrint.style.display = 'none';
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#f5f7fb' });
      if (noPrint) noPrint.style.display = 'flex';
      const link = document.createElement('a');
      link.download = `Delivery-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      UI.toast('บันทึกรูปภาพสำเร็จ', 'success');
    } catch (e) { UI.toast('บันทึกไม่สำเร็จ: ' + e.message, 'error'); } finally { UI.loading(false); }
  },

  async openHistoryModal() {
    if (!this._selectedShopId) return UI.toast('กรุณาเลือกร้านค้าก่อน', 'warning');
    const shop = this._shops.find(s => s.id === this._selectedShopId);
    
    try {
      UI.loading(true);
      const res = await API.getShopHistory(this._selectedShopId);
      const rawHistory = res.history || [];

      const groups = {};
      rawHistory.forEach(h => {
        const key = h.docNo || h.createdAt.slice(0, 16);
        if (!groups[key]) groups[key] = { id: key, ts: h.createdAt, items: [], netTotal: 0 };
        groups[key].items.push(h);
        groups[key].netTotal += (Number(h.costVat) || 0);
      });

      openModal(`ประวัติรายการ: ${shop.name}`, `
        <div style="max-height:550px; overflow-y:auto; padding:5px">
          ${Object.values(groups).map(g => {
            const types = [...new Set(g.items.map(it => it.type))];
            const operator = g.items[0]?.username || 'Unknown';
            return `
              <div class="card mb-16" style="padding:0; border:1px solid var(--border-light); overflow:hidden; box-shadow:var(--shadow-sm)">
                <div style="background:linear-gradient(to right, var(--bg-base), #fff); padding:12px 16px; border-bottom:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center">
                  <div style="display:flex; align-items:center; gap:12px">
                    ${UI.avatar(g.items[0]?.operatorAvatar, operator, 36)}
                    <div>
                      <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px">
                        <span style="font-weight:800; font-size:0.7rem; background:var(--primary); color:#fff; padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.5px">
                          ${g.id.startsWith('SS-') ? g.id : 'General'}
                        </span>
                        <span style="font-weight:700; font-size:0.8rem; color:var(--text-primary)">โดย ${operator}</span>
                      </div>
                      <div class="text-muted" style="font-size:0.65rem; display:flex; align-items:center; gap:4px">
                        <span class="material-icons" style="font-size:12px">schedule</span> ${UI.dateTimeStr(g.ts)}
                      </div>
                    </div>
                  </div>
                  <div class="text-end">
                    <div class="fw-bold" style="font-size:1.1rem; color:${g.netTotal >= 0 ? 'var(--primary)' : 'var(--danger)'}">
                      ${g.netTotal === 0 ? '-' : '฿' + UI.currency(g.netTotal)}
                    </div>
                    <div style="display:flex; gap:3px; justify-content:flex-end; margin-top:2px">
                      ${types.map(t => `<span class="type-tag tag-${t?.toLowerCase().includes('return') ? 'return' : (t?.toLowerCase().includes('swap') ? 'swap' : 'move')}" style="font-size:0.55rem">${t}</span>`).join('')}
                    </div>
                  </div>
                </div>
                <div style="padding:10px 15px">
                  <table style="width:100%; font-size:0.75rem; border-collapse:collapse">
                    <thead>
                      <tr style="color:var(--text-muted); border-bottom:1px solid var(--bg-base)">
                        <th style="text-align:left; padding:4px 0">สินค้า</th>
                        <th style="text-align:right; padding:4px 0">จำนวน</th>
                        <th style="text-align:right; padding:4px 0">ยอดเงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${g.items.map(it => `
                        <tr style="border-bottom:1px solid var(--bg-base)">
                          <td style="padding:6px 0">
                            <div class="fw-bold">${it.productName}</div>
                            <div class="text-muted" style="font-size:0.6rem">${it.note || ''}</div>
                          </td>
                          <td style="text-align:right; padding:6px 0">${it.qty} ${it.unit}</td>
                          <td style="text-align:right; padding:6px 0; font-weight:700; color:${Number(it.costVat) < 0 ? 'var(--danger)' : 'var(--text-primary)'}">
                            ${it.costVat && Number(it.costVat) !== 0 ? UI.currency(it.costVat) : '-'}
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }).join('')}
          ${rawHistory.length === 0 ? UI.emptyState('history', 'ยังไม่มีประวัติรายการ') : ''}
        </div>
      `, `
        <button class="btn btn-secondary" onclick="closeModal()">ปิดหน้าต่าง</button>
      `);
    } catch (e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  }
};
