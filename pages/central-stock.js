// ============================================================
// pages/central-stock.js – Central warehouse inventory (Card UI)
// ============================================================
// ── Edit Batch Modal (global helper) ────────────────────────
function csOpenEditBatch(warehouseId, productId, expiryDate, currentQty, unit) {
  const canEdit = AUTH.hasRole('admin', 'stock');
  if (!canEdit) return;

  // Build modal HTML
  const modalHtml = `
    <div id="cs-edit-modal-backdrop" style="
      position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9998;
      display:flex;align-items:center;justify-content:center;
      animation:fadeIn 0.15s ease;
    " onclick="if(event.target===this)csCloseEditBatch()">
      <div style="
        background:var(--bg-card);border-radius:16px;padding:28px;width:100%;max-width:420px;
        box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;
        animation:slideUp 0.2s ease;
      ">
        <button onclick="csCloseEditBatch()" style="
          position:absolute;top:14px;right:14px;background:none;border:none;
          cursor:pointer;color:var(--text-muted);font-size:20px;padding:4px;
        "><span class="material-icons">close</span></button>

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
          <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center">
            <span class="material-icons" style="color:#fff;font-size:20px">edit</span>
          </div>
          <div>
            <div style="font-weight:800;font-size:1.1rem">แก้ไขล็อตสินค้า</div>
            <div style="font-size:0.85rem;color:var(--text-muted)">คลัง: ${warehouseId} · สินค้า: ${productId}</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">วันหมดอายุ</label>
          <input type="date" id="cs-edit-expiry" class="form-control"
            value="${(!expiryDate || expiryDate === '9999-12-31') ? '' : expiryDate}" />
          <small style="color:var(--text-muted)">เว้นว่างไว้หากไม่ระบุวันหมดอายุ</small>
        </div>

        <div class="form-group">
          <label class="form-label">จำนวน (${unit || 'หน่วย'})</label>
          <input type="number" id="cs-edit-qty" class="form-control"
            value="${currentQty}" min="0" step="1" />
        </div>

        <div id="cs-edit-error" class="alert alert-danger hidden" style="margin-bottom:8px"></div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button class="btn btn-secondary" onclick="csCloseEditBatch()">ยกเลิก</button>
          <button class="btn btn-primary" id="cs-edit-save-btn"
            onclick="csSaveEditBatch('${warehouseId}','${productId}','${expiryDate}','${unit}')">
            <span class="material-icons" style="font-size:16px">save</span> บันทึก
          </button>
        </div>
      </div>
    </div>
  `;

  // Remove old modal if exists
  const old = document.getElementById('cs-edit-modal-backdrop');
  if (old) old.remove();

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  setTimeout(() => document.getElementById('cs-edit-qty')?.focus(), 100);
}

function csCloseEditBatch() {
  const el = document.getElementById('cs-edit-modal-backdrop');
  if (el) el.remove();
}

async function csSaveEditBatch(warehouseId, productId, originalExpiry, unit) {
  const errEl = document.getElementById('cs-edit-error');
  const btn   = document.getElementById('cs-edit-save-btn');
  const newQty    = parseInt(document.getElementById('cs-edit-qty')?.value, 10);
  const newExpiry = document.getElementById('cs-edit-expiry')?.value || '9999-12-31';

  errEl?.classList.add('hidden');
  if (isNaN(newQty) || newQty < 0) {
    errEl.textContent = 'กรุณากรอกจำนวนที่ถูกต้อง (≥ 0)';
    errEl?.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons" style="font-size:16px;animation:spin 1s linear infinite">refresh</span> กำลังบันทึก...';

  try {
    await API.adjustCentralStockBatch({
      warehouseId,
      productId,
      originalExpiry: originalExpiry || '9999-12-31',
      newExpiry,
      newQty,
      unit,
    });
    csCloseEditBatch();
    UI.toast('แก้ไขล็อตสินค้าเรียบร้อยแล้ว', 'success');
    await PAGES['central-stock'].load();
  } catch (e) {
    errEl.textContent = e.message || 'เกิดข้อผิดพลาด';
    errEl?.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons" style="font-size:16px">save</span> บันทึก';
  }
}

PAGES['central-stock'] = {
  _stock: [],
  _warehouses: [],
  _selectedWh: '',
  _search: '',
  _products: [],
  _viewMode: 'card', // 'card' | 'table'

  async render() {
    const el = document.getElementById('page-central-stock');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">คลังสินค้าส่วนกลาง</h2>
          <p class="page-subtitle">จัดการสต็อกและดูความเคลื่อนไหวสินค้าในคลังหลัก (Central Inventory)</p>
        </div>
        <div class="page-actions">
          ${AUTH.isAdmin() ? '<button class="btn btn-secondary btn-sm" onclick="showPage(\'receive-goods\')"><span class="material-icons">move_to_inbox</span> รับสินค้าเข้า</button>' : ''}
          ${AUTH.hasRole('admin', 'stock') ? '<button class="btn btn-primary btn-sm" onclick="showPage(\'transfer\')"><span class="material-icons">swap_horiz</span> เบิกสินค้า</button>' : ''}
        </div>
      </div>

      <!-- Filters -->
      <div class="card mb-16">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <div class="form-group" style="margin:0">
            <select id="cs-wh-filter" onchange="PAGES['central-stock'].setWh(this.value)" style="min-width:220px">
              <option value="">-- ทุกคลัง --</option>
            </select>
          </div>
          <div class="search-bar" style="flex:1;min-width:200px">
            <span class="search-icon"><span class="material-icons">search</span></span>
            <input type="text" placeholder="ค้นหาชื่อสินค้า, รหัส..." oninput="PAGES['central-stock'].doSearch(this.value)" />
          </div>
          <div style="display:flex;gap:4px;background:var(--bg-card2);border-radius:8px;padding:3px">
            <button id="cs-view-card" class="btn btn-sm btn-primary" onclick="PAGES['central-stock'].setView('card')" title="Card View">
              <span class="material-icons">grid_view</span>
            </button>
            <button id="cs-view-table" class="btn btn-sm btn-secondary" onclick="PAGES['central-stock'].setView('table')" title="Table View">
              <span class="material-icons">table_rows</span>
            </button>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="PAGES['central-stock'].load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div id="cs-summary" class="stats-grid" style="margin-bottom:16px"></div>

      <!-- Content -->
      <div id="cs-content">${UI.spinner()}</div>
    `;
    await this.loadWarehouses();
    await this.load();
  },

  async loadWarehouses() {
    const res = await API.getWarehouses();
    this._warehouses = (res.warehouses || []).filter(w => w.type === 'central');
    const sel = document.getElementById('cs-wh-filter');
    if (sel) {
      sel.innerHTML = '<option value="">-- ทุกคลัง --</option>' +
        this._warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
      sel.value = this._selectedWh;
    }
  },

  setWh(v) { this._selectedWh = v; this.load(); },
  doSearch(v) { this._search = v.toLowerCase(); this.renderContent(); },
  setView(mode) {
    this._viewMode = mode;
    document.getElementById('cs-view-card')?.classList.toggle('btn-primary', mode === 'card');
    document.getElementById('cs-view-card')?.classList.toggle('btn-secondary', mode !== 'card');
    document.getElementById('cs-view-table')?.classList.toggle('btn-primary', mode === 'table');
    document.getElementById('cs-view-table')?.classList.toggle('btn-secondary', mode !== 'table');
    this.renderContent();
  },

  async load() {
    try {
      const [stRes, prRes] = await Promise.all([API.getCentralStock(this._selectedWh), API.getProducts()]);
      this._stock = stRes.stock || [];
      this._products = prRes.products || [];
      this.renderSummary();
      this.renderContent();
    } catch (e) {
      document.getElementById('cs-content').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  renderSummary() {
    const total = this._stock.reduce((a, s) => a + s.qty, 0);
    const skus = new Set(this._stock.map(s => s.productId)).size;
    const low = this._stock.filter(s => s.qty <= 10).length;
    const val = this._stock.reduce((a, s) => a + (s.product?.costVat || 0) * s.qty, 0);
    document.getElementById('cs-summary').innerHTML = `
      <div class="stat-card purple"><div class="stat-bg-icon"><span class="material-icons">inventory_2</span></div>
        <div class="stat-label">สินค้าคงเหลือรวม</div>
        <div class="stat-value text-primary-color">${UI.currency(total, 0)}</div>
        <div class="stat-sub">หน่วยทั้งหมด</div>
      </div>
      <div class="stat-card green"><div class="stat-bg-icon"><span class="material-icons">label</span></div>
        <div class="stat-label">จำนวน SKU</div>
        <div class="stat-value" style="color:var(--accent)">${skus}</div>
        <div class="stat-sub">รายการสินค้า</div>
      </div>
      <div class="stat-card orange"><div class="stat-bg-icon"><span class="material-icons">payments</span></div>
        <div class="stat-label">มูลค่าคงคลัง</div>
        <div class="stat-value" style="color:var(--warning);font-size:1.4rem">฿${UI.currency(val, 0)}</div>
        <div class="stat-sub">ราคาทุน (VAT)</div>
      </div>
      <div class="stat-card pink"><div class="stat-bg-icon"><span class="material-icons">warning</span></div>
        <div class="stat-label">สต็อกต่ำ (≤10)</div>
        <div class="stat-value" style="color:var(--danger)">${low}</div>
        <div class="stat-sub">รายการ ต้องเติมสต็อก</div>
      </div>
    `;
  },

  renderContent() {
    const data = this._stock.filter(s =>
      (!this._selectedWh || s.warehouseId === this._selectedWh) &&
      (!this._search || s.product?.name?.toLowerCase().includes(this._search) || s.product?.code?.toLowerCase().includes(this._search))
    );
    if (!data.length) {
      document.getElementById('cs-content').innerHTML = UI.emptyState('warehouse', 'ไม่มีข้อมูลสินค้าในคลัง', 'ลองเปลี่ยนตัวกรอง หรือรับสินค้าเข้าคลังก่อน');
      return;
    }

    // Sort by Master Product List order
    data.sort((a, b) => {
      const idxA = this._products.findIndex(p => p.id === a.productId);
      const idxB = this._products.findIndex(p => p.id === b.productId);
      return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });

    document.getElementById('cs-content').innerHTML = this._viewMode === 'card'
      ? this._renderCards(data)
      : this._renderTable(data);
  },

  _getExpiryStatus(exp) {
    if (!exp || exp === '9999-12-31') return { label: 'ปกติ', color: 'var(--success)', bg: '#E6F4EA' };
    const d = new Date(exp);
    const now = new Date();
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    if (diff < 0) return { label: 'หมดอายุแล้ว', color: 'var(--danger)', bg: '#FCE8E6', alert: true };
    if (diff < 14) return { label: 'ใกล้หมดอายุ (<14ว)', color: '#D93025', bg: '#FEE2E2', alert: true };
    if (diff < 19) return { label: 'ระวัง (<19ว)', color: '#92400E', bg: '#FEF3C7' };
    return { label: 'ปกติ', color: 'var(--success)', bg: '#E6F4EA' };
  },

  // ── CARD MODE ────────────────────────────────────────────────
  _renderCards(data) {
    // Group by warehouse, then by product
    const groups = {};
    data.forEach(s => {
      const whId = s.warehouseId;
      if (!groups[whId]) groups[whId] = { name: s.warehouse?.name || whId, avatar: s.warehouse?.avatar || '', products: {} };

      const pid = s.productId;
      if (!groups[whId].products[pid]) {
        groups[whId].products[pid] = {
          product: s.product,
          productId: pid,
          unit: s.unit || s.product?.unit || 'หน่วย',
          totalQty: 0,
          batches: []
        };
      }
      groups[whId].products[pid].totalQty += s.qty;
      groups[whId].products[pid].batches.push(s);
    });

    // maxTotalQty for visual context if needed
    const allProducts = Object.values(groups).flatMap(g => Object.values(g.products));
    const maxTotalQty = Math.max(...allProducts.map(p => p.totalQty), 1);

    return Object.values(groups).map(group => {
      const productList = Object.values(group.products);
      // Sort by Product Name or Master List
      productList.sort((a, b) => {
        const idxA = this._products.findIndex(p => p.id === a.productId);
        const idxB = this._products.findIndex(p => p.id === b.productId);
        return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
      });

      return `
        <div class="card mb-16">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <div style="border:2px solid #fff;border-radius:50%;box-shadow:var(--shadow)">
               ${UI.avatar(group.avatar, group.name, 46, 'warehouse')}
            </div>
            <div>
              <div style="font-weight:800;font-size:1.2rem;color:var(--text-primary);line-height:1.2">${group.name}</div>
              <div style="font-size:0.9rem;color:var(--text-muted)">${productList.length} SKU · ${UI.currency(productList.reduce((a, p) => a + p.totalQty, 0), 0)} หน่วยรวม</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
            ${productList.map(p => this._renderProductCard(p, maxTotalQty)).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  _renderProductCard(p, maxTotalQty) {
    const qty = p.totalQty;
    const isLow = qty <= 10;
    const barColor = qty === 0 ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)';
    const totalVal = (p.product?.costVat || 0) * qty;

    // Build batch list
    const canEdit = AUTH.hasRole('admin', 'stock');
    const batchRows = p.batches.map(b => {
      const st = this._getExpiryStatus(b.expiryDate);
      const expiryStr = b.expiryDate || '9999-12-31';
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--bg-card2);font-size:0.8rem">
          <div style="display:flex;align-items:center;gap:6px">
            <span class="material-icons" style="font-size:12px;color:${st.color}">circle</span>
            <span style="font-family:monospace;font-weight:700">${UI.dateStr(b.expiryDate) || 'ไม่ระบุ'}</span>
            <small style="color:${st.color};font-size:0.65rem">(${st.label})</small>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="font-weight:800;color:var(--text-primary)">${UI.currency(b.qty, 0)}</div>
            ${canEdit ? `
              <button class="btn-icon" onclick="csOpenEditBatch('${b.warehouseId}', '${b.productId}', '${expiryStr}', ${b.qty}, '${p.unit}')" title="แก้ไขล็อตนี้">
                <span class="material-icons" style="font-size:14px">edit</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="
        background:#fff;border:1.5px solid ${isLow ? 'var(--warning)' : 'var(--border)'};
        border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;
        transition:all 0.2s;box-shadow:var(--shadow);position:relative;overflow:hidden;
      " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow-lg)'"
         onmouseout="this.style.transform='';this.style.boxShadow='var(--shadow)'">

        <div style="display:flex;gap:12px;align-items:flex-start">
          <!-- Image -->
          <div style="width:70px;height:70px;flex-shrink:0;background:var(--bg-card2);border-radius:12px;overflow:hidden;border:1px solid var(--border-light);display:flex;align-items:center;justify-content:center">
            ${UI.image(p.product?.imageUrl, 'product-img')}
          </div>
          <!-- Basic Info -->
          <div style="flex:1">
            <div style="font-size:0.8rem;color:var(--primary);font-weight:700;text-transform:uppercase">${p.product?.code || '-'}</div>
            <div style="font-weight:800;font-size:1.1rem;line-height:1.2;color:var(--text-primary)">${p.product?.name || p.productId}</div>
            <div style="font-size:0.9rem;color:var(--text-muted);margin-top:2px">${p.product?.category || ''}</div>
          </div>
        </div>

        <!-- Total Qty Row -->
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px;background:var(--bg-card2);border-radius:8px">
          <div>
            <div style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase">ยอดรวมคงเหลือ</div>
            <div style="font-size:1.8rem;font-weight:900;color:${barColor};line-height:1">${UI.currency(qty, 0)} <span style="font-size:0.85rem;font-weight:400;color:var(--text-secondary)">${p.unit}</span></div>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase">มูลค่ารวม</div>
            <div style="font-weight:700;color:var(--primary);font-size:1.1rem">฿${UI.currency(totalVal, 0)}</div>
          </div>
        </div>

        <!-- Breakdown Header -->
        <div style="font-size:0.7rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-top:4px">📦 รายละเอียดตามล็อต (FEFO)</div>
        <div style="max-height:150px;overflow-y:auto;padding-right:4px">
          ${batchRows}
        </div>

      </div>
    `;
  },

  // ── TABLE MODE ───────────────────────────────────────────────
  _renderTable(data) {
    // 1. Group items by Product ID
    const grouped = {};
    data.forEach(s => {
      const pid = s.productId;
      if (!grouped[pid]) {
        grouped[pid] = {
          product: s.product,
          productId: pid,
          whName: s.warehouse?.name || s.warehouseId,
          totalQty: 0,
          unit: s.unit || s.product?.unit || 'หน่วย',
          batches: []
        };
      }
      grouped[pid].totalQty += s.qty;
      grouped[pid].batches.push(s);
    });

    const totalVal = data.reduce((a, s) => a + (s.product?.costVat || 0) * s.qty, 0);
    const productList = Object.values(grouped);

    return `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>รูป</th><th>ชื่อสินค้า</th><th>คลัง</th>
              <th class="td-center">วันหมดอายุ (รายละเอียดล็อต)</th>
              <th class="td-right">เหลือรวม</th><th>หน่วย</th>
              <th class="td-right">มูลค่ารวม</th>
            </tr></thead>
            <tbody>
              ${productList.map((p, i) => {
      const low = p.totalQty <= 10;
      const cost = p.product?.costVat || 0;
      const canEdit = AUTH.hasRole('admin', 'stock');
      const batchHtml = p.batches.map(b => {
        const st = this._getExpiryStatus(b.expiryDate);
        const expiryStr = b.expiryDate || '9999-12-31';
        return `<div style="font-size:0.72rem;display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px dotted #eee">
                    <span style="color:${st.color};font-weight:700">${UI.dateStr(b.expiryDate)}</span>
                    <div style="display:flex;align-items:center;gap:4px">
                      <span style="font-weight:800">${UI.currency(b.qty, 0)}</span>
                      ${canEdit ? `
                        <button class="btn-icon" style="padding:2px" onclick="csOpenEditBatch('${b.warehouseId}', '${b.productId}', '${expiryStr}', ${b.qty}, '${p.unit}')">
                          <span class="material-icons" style="font-size:12px">edit</span>
                        </button>
                      ` : ''}
                    </div>
                  </div>`;
      }).join('');

      return `<tr>
                  <td class="text-muted">${i + 1}</td>
                  <td>${UI.image(p.product?.imageUrl, 'product-img')}</td>
                  <td class="td-bold">${p.product?.name || p.productId}</td>
                  <td style="font-size:0.8rem">${p.whName}</td>
                  <td><div style="min-width:140px">${batchHtml}</div></td>
                  <td class="td-right td-bold" style="color:${low ? 'var(--warning)' : 'var(--success)'}">${UI.currency(p.totalQty, 0)}</td>
                  <td>${p.unit}</td>
                  <td class="td-right fw-bold">฿${UI.currency(p.totalQty * cost, 0)}</td>
                </tr>`;
    }).join('')}
            </tbody>
            <tfoot>
              <tr style="background:var(--bg-card2)">
                <td colspan="7" class="td-right fw-bold">มูลค่าสต็อกรวม</td>
                <td class="td-right fw-bold text-primary-color">฿${UI.currency(totalVal, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }
};
