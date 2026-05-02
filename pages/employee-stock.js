// ============================================================
// pages/employee-stock.js – Employee warehouse inventory (Card/Table UI)
// ============================================================

PAGES['employee-stock'] = {
  _warehouses: [],
  _allStock: [],
  _products: [],
  _selectedWh: '',
  _search: '',
  _viewMode: 'card',

  async render() {
    const el = document.getElementById('page-employee-stock');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">คลังสินค้าพนักงาน</h2>
          <p class="page-subtitle">ตรวจสอบสินค้าคงคลังและยอดขายสะสมรายบุคคล (Employee Inventory)</p>
        </div>
        <div class="page-actions">
          ${AUTH.hasRole('admin', 'stock') ? '<button class="btn btn-primary btn-sm" onclick="showPage(\'transfer\')"><span class="material-icons">add_circle</span> เบิกสินค้าให้พนักงาน</button>' : ''}
          ${AUTH.hasRole('admin', 'stock') ? '<button class="btn btn-secondary btn-sm" onclick="showPage(\'consign\')"><span class="material-icons">undo</span> รับฝากกลับ</button>' : ''}
        </div>
      </div>

      <div class="card mb-16">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <div class="form-group" style="margin:0">
            <select id="es-wh-filter" onchange="PAGES['employee-stock'].setWh(this.value)" style="min-width:240px">
              <option value="">-- ทุกพนักงาน --</option>
            </select>
          </div>
          <div class="search-bar" style="flex:1;min-width:180px">
            <span class="search-icon"><span class="material-icons">search</span></span>
            <input type="text" placeholder="ค้นหาสินค้า..." oninput="PAGES['employee-stock'].doSearch(this.value)" />
          </div>
          <div style="display:flex;gap:4px;background:var(--bg-card2);border-radius:8px;padding:3px">
            <button id="es-view-card" class="btn btn-sm btn-primary" onclick="PAGES['employee-stock'].setView('card')" title="Card View">
              <span class="material-icons">grid_view</span>
            </button>
            <button id="es-view-table" class="btn btn-sm btn-secondary" onclick="PAGES['employee-stock'].setView('table')" title="Table View">
              <span class="material-icons">table_rows</span>
            </button>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="PAGES['employee-stock'].load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
        </div>
      </div>

      <div id="es-content">${UI.spinner()}</div>
    `;
    await this.load();
  },

  setWh(v) { this._selectedWh = v; this.renderContent(); },
  doSearch(v) { this._search = v.toLowerCase(); this.renderContent(); },
  setView(mode) {
    this._viewMode = mode;
    document.getElementById('es-view-card')?.classList.toggle('btn-primary', mode === 'card');
    document.getElementById('es-view-card')?.classList.toggle('btn-secondary', mode !== 'card');
    document.getElementById('es-view-table')?.classList.toggle('btn-primary', mode === 'table');
    document.getElementById('es-view-table')?.classList.toggle('btn-secondary', mode !== 'table');
    this.renderContent();
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

  async load() {
    try {
      const [stockRes, whRes, prRes] = await Promise.all([
        API.getAllEmployeeStocks(),
        API.getWarehouses(),
        API.getProducts(),
      ]);
      this._allStock = stockRes.warehouses || [];
      this._warehouses = (whRes.warehouses || []).filter(w => w.type === 'employee');
      this._products = prRes.products || [];

      const sel = document.getElementById('es-wh-filter');
      if (sel) {
        sel.innerHTML = '<option value="">-- ทุกพนักงาน --</option>' +
          this._warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
        sel.value = this._selectedWh;
      }
      this.renderContent();
    } catch (e) {
      document.getElementById('es-content').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    }
  },

  renderContent() {
    const data = this._allStock.filter(d =>
      (!this._selectedWh || d.warehouse.id === this._selectedWh)
    );
    if (!data.length) {
      document.getElementById('es-content').innerHTML = UI.emptyState('person_pin', 'ไม่มีคลังพนักงาน', 'สร้างคลังพนักงานก่อนในหน้า "จัดการคลัง"');
      return;
    }

    document.getElementById('es-content').innerHTML = data.map(d => {
      const emp = d.employee || {};
      const wh = d.warehouse || {};
      let stock = d.stock || [];

      if (this._search) {
        stock = stock.filter(s => s.product?.name?.toLowerCase().includes(this._search));
      }

      // Grouping logic for this employee
      const grouped = {};
      stock.forEach(s => {
        const pid = s.productId;
        if (!grouped[pid]) {
          grouped[pid] = {
            product: s.product,
            productId: pid,
            unit: s.unit || s.product?.unit || 'หน่วย',
            totalQty: 0,
            totalConsigned: 0,
            batches: []
          };
        }
        grouped[pid].totalQty += s.qty;
        grouped[pid].totalConsigned += (s.consigned || 0);
        grouped[pid].batches.push(s);
      });

      const productList = Object.values(grouped);
      // Sort
      productList.sort((a, b) => {
        const idxA = this._products.findIndex(p => p.id === a.productId);
        const idxB = this._products.findIndex(p => p.id === b.productId);
        return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
      });

      const totalWholesale = stock.reduce((a, s) => a + (s.qty - (s.consigned || 0)) * (s.product?.sellWholesale || 0), 0);
      const totalCommission = stock.reduce((a, s) => a + (s.qty - (s.consigned || 0)) * (s.product?.sellCommission || 0), 0);
      const maxTotalQty = Math.max(...productList.map(p => p.totalQty), 1);

      return `
        <div class="card mb-16">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="border:2px solid #fff;border-radius:50%;box-shadow:var(--shadow)">
                ${UI.avatar(emp.avatar, emp.displayName, 46)}
              </div>
              <div>
                <div style="font-weight:800;font-size:1.2rem;line-height:1.2;color:var(--text-primary)">${emp.displayName || 'พนักงาน'}</div>
                <div style="font-size:0.95rem;color:var(--primary);font-weight:600;display:flex;align-items:center;gap:4px">
                  <span class="material-icons" style="font-size:16px">store</span> ${wh.name}
                </div>
              </div>
            </div>
            <div style="display:flex;gap:10px;align-items:center">
               <div class="badge badge-blue" style="padding:6px 14px;font-size:0.95rem">ยอดส่งเงิน: ฿${UI.currency(totalWholesale, 0)}</div>
               <div class="badge badge-pink" style="padding:6px 14px;font-size:0.95rem">ค่าคอมฯ: ฿${UI.currency(totalCommission, 0)}</div>
            </div>
          </div>
          
          ${this._viewMode === 'card'
            ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
                 ${productList.map(p => this._renderEmpCard(p, maxTotalQty)).join('')}
               </div>`
            : this._renderEmpTable(productList, totalWholesale, totalCommission)
          }
        </div>
      `;
    }).join('');
  },

  _renderEmpCard(p, maxTotalQty) {
    const qty = p.totalQty;
    const sold = qty - p.totalConsigned;
    const wholesalePrice = p.product?.sellWholesale || 0;
    const commissionPrice = p.product?.sellCommission || 0;
    const barColor = qty === 0 ? 'var(--danger)' : qty <= 5 ? 'var(--warning)' : 'var(--success)';

    const batchRows = p.batches.map(b => {
      const st = this._getExpiryStatus(b.expiryDate);
      const bSold = b.qty - (b.consigned || 0);
      return `
        <div style="padding:6px 0;border-bottom:1px solid var(--bg-card2);font-size:0.75rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px">
            <div style="display:flex;align-items:center;gap:4px">
              <span style="font-family:monospace;font-weight:700">${UI.dateStr(b.expiryDate) || 'ไม่ระบุ'}</span>
              <small style="color:${st.color};font-size:0.6rem">(${st.label})</small>
            </div>
            <div style="font-weight:800;color:var(--text-primary)">${UI.currency(b.qty, 0)} <small style="font-weight:400">หน่วย</small></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--text-muted)">
             <span>ฝากคืน: ${UI.currency(b.consigned || 0, 0)}</span>
             <span class="text-success fw-bold">ขายสุทธิ: ${UI.currency(bSold, 0)}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="background:#fff;border:1.5px solid ${qty <= 5 ? 'var(--warning)' : 'var(--border)'};border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--shadow)">
        <div style="display:flex;gap:12px">
          <div style="width:50px;height:50px;flex-shrink:0;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border-light);overflow:hidden;display:flex;align-items:center;justify-content:center">
             ${UI.image(p.product?.imageUrl, 'product-img')}
          </div>
          <div>
            <div style="font-size:0.75rem;color:var(--primary);font-weight:700">${p.product?.code || '-'}</div>
            <div style="font-weight:800;font-size:1.1rem;line-height:1.2">${p.product?.name || p.productId}</div>
          </div>
        </div>
        
        <div style="background:var(--bg-card2);padding:12px;border-radius:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="border-right:1px solid var(--border)">
             <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">ถือครองรวม</div>
             <div style="font-size:1.6rem;font-weight:900;color:${barColor};line-height:1">${UI.currency(qty, 0)} <small style="font-weight:400;font-size:0.85rem">${p.unit}</small></div>
          </div>
          <div style="padding-left:4px">
             <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">ขายสุทธิรวม</div>
             <div style="font-size:1.6rem;font-weight:900;color:var(--success);line-height:1">${UI.currency(sold, 0)} <small style="font-weight:400;font-size:0.85rem;color:var(--text-secondary)">${p.unit}</small></div>
          </div>
        </div>

        <div style="font-size:0.75rem;padding-top:4px;border-top:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-muted)">ราคาส่ง:</span>
            <span style="font-weight:700">฿${UI.currency(sold * wholesalePrice, 0)}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-muted)">ค่าคอมฯ:</span>
            <span style="font-weight:700;color:#BE185D">฿${UI.currency(sold * commissionPrice, 0)}</span>
          </div>
        </div>

        <div style="font-size:0.65rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-top:4px;display:flex;align-items:center;gap:4px">
          <span class="material-icons" style="font-size:14px">inventory_2</span> รายละเอียดตามล็อต
        </div>
        <div style="max-height:120px;overflow-y:auto;padding-right:4px">
          ${batchRows}
        </div>
      </div>
    `;
  },

  _renderEmpTable(productList, totalWholesale, totalCommission) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>รูป</th><th>ชื่อสินค้า</th>
            <th class="td-center">วันหมดอายุ (รายละเอียดล็อต)</th>
            <th class="td-right">ถือครองรวม</th>
            <th class="td-right">ฝากคืน</th>
            <th class="td-right">ขายสุทธิ</th>
            <th class="td-right">รวมส่งเงิน</th>
            <th class="td-right">รวมค่าคอมฯ</th>
          </tr></thead>
          <tbody>
            ${productList.map((p, i) => {
              const qty = p.totalQty;
              const con = p.totalConsigned;
              const sold = qty - con;
              const whAmt = sold * (p.product?.sellWholesale || 0);
              const commAmt = sold * (p.product?.sellCommission || 0);

              const batchHtml = p.batches.map(b => {
                const st = this._getExpiryStatus(b.expiryDate);
                const bSold = b.qty - (b.consigned || 0);
                return `<div style="font-size:0.75rem;display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #eee;padding:2px 0">
                  <span style="color:${st.color};font-weight:700">${UI.dateStr(b.expiryDate)}</span>
                  <span style="font-weight:800">${UI.currency(b.qty, 0)} <small style="font-weight:400;color:#999">(ขาย ${UI.currency(bSold, 0)})</small></span>
                </div>`;
              }).join('');

              return `<tr>
                <td class="text-muted">${i+1}</td>
                <td>${UI.image(p.product?.imageUrl, 'product-img')}</td>
                <td class="td-bold">${p.product?.name || p.productId}</td>
                <td><div style="min-width:160px">${batchHtml}</div></td>
                <td class="td-right td-bold">${UI.currency(qty, 0)}</td>
                <td class="td-right text-warning">${UI.currency(con, 0)}</td>
                <td class="td-right td-bold text-success">${UI.currency(sold, 0)}</td>
                <td class="td-right td-bold text-primary">฿${UI.currency(whAmt, 0)}</td>
                <td class="td-right td-bold" style="color:#BE185D">฿${UI.currency(commAmt, 0)}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg-card2); font-weight:bold">
              <td colspan="7" class="td-right">ยอดรวมทั้งหมดของพนักงาน</td>
              <td class="td-right text-primary">฿${UI.currency(totalWholesale, 0)}</td>
              <td class="td-right" style="color:#BE185D">฿${UI.currency(totalCommission, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }
};
