// ============================================================
// pages/employee-stock.js – Employee warehouse inventory
// ============================================================

PAGES['employee-stock'] = {
  _warehouses: [],
  _allStock: [],
  _selectedWh: '',
  _search: '',

  async render() {
    const el = document.getElementById('page-employee-stock');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">คลังพนักงาน</h2>
          <p class="page-subtitle">ดูสินค้าคงคลังในมือพนักงานแต่ละคน</p>
        </div>
        <div class="page-actions">
          ${AUTH.hasRole('admin','stock') ? '<button class="btn btn-primary" onclick="showPage(\'transfer\')">🔄 เบิกสินค้าให้พนักงาน</button>' : ''}
          ${AUTH.hasRole('admin','stock') ? '<button class="btn btn-secondary" onclick="showPage(\'consign\')">↩️ รับฝากกลับ</button>' : ''}
        </div>
      </div>
      <div class="card mb-16">
        <div class="input-group" style="margin:0;align-items:center">
          <div class="form-group" style="margin:0">
            <select id="es-wh-filter" onchange="PAGES['employee-stock'].setWh(this.value)" style="min-width:240px">
              <option value="">-- ทุกพนักงาน --</option>
            </select>
          </div>
          <div class="search-bar">
            <span class="search-icon"><span class="material-icons">search</span></span>
            <input type="text" placeholder="ค้นหาสินค้า..." oninput="PAGES['employee-stock'].doSearch(this.value)" />
          </div>
          <button class="btn btn-secondary btn-sm" onclick="PAGES['employee-stock'].load()">🔄 รีเฟรช</button>
        </div>
      </div>
      <div id="es-content">${UI.spinner()}</div>
    `;
    await this.load();
  },

  setWh(v) { this._selectedWh = v; this.renderContent(); },
  doSearch(v) { this._search = v.toLowerCase(); this.renderContent(); },

  async load() {
    try {
      const [stockRes, whRes] = await Promise.all([
        API.getAllEmployeeStocks(),
        API.getWarehouses(),
      ]);
      this._allStock = stockRes.warehouses || [];
      this._warehouses = (whRes.warehouses || []).filter(w => w.type === 'employee');

      const sel = document.getElementById('es-wh-filter');
      if (sel) {
        sel.innerHTML = '<option value="">-- ทุกพนักงาน --</option>' +
          this._warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
        sel.value = this._selectedWh;
      }
      this.renderContent();
    } catch(e) {
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
      const stock = this._search
        ? d.stock.filter(s => s.product?.name?.toLowerCase().includes(this._search))
        : d.stock;
      const totalQty = stock.reduce((a, s) => a + s.qty, 0);
      const totalConsigned = stock.reduce((a, s) => a + (s.consigned||0), 0);
      const netSell = stock.reduce((a, s) => a + (s.qty - (s.consigned||0)) * (s.product?.empVat||0), 0);

      return `
        <div class="card mb-16">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem">
                ${(emp.displayName||'?').charAt(0)}
              </div>
              <div>
                <div style="font-weight:700;font-size:1rem">${emp.displayName||'พนักงาน'}</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">${wh.name}</div>
              </div>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <div class="mini-card" style="min-width:100px;text-align:center;padding:8px 16px">
                <div class="mini-val text-primary-color">${UI.currency(totalQty,0)}</div>
                <div class="mini-label">หน่วยทั้งหมด</div>
              </div>
              <div class="mini-card" style="min-width:100px;text-align:center;padding:8px 16px">
                <div class="mini-val text-warning">${UI.currency(totalConsigned,0)}</div>
                <div class="mini-label">ฝากคืน</div>
              </div>
              <div class="mini-card" style="min-width:120px;text-align:center;padding:8px 16px">
                <div class="mini-val text-success">฿${UI.currency(netSell,0)}</div>
                <div class="mini-label">ยอดขายประมาณ</div>
              </div>
              ${d.billed
                ? '<span class="badge badge-green">✅ คิดเงินแล้ว</span>'
                : '<span class="badge badge-yellow">⏳ ยังไม่คิดเงิน</span>'
              }
            </div>
          </div>
          ${stock.length
            ? `<div class="table-wrap">
                <table>
                  <thead><tr>
                    <th>#</th><th>รูป</th><th>สินค้า</th>
                    <th class="td-right">คงเหลือ</th>
                    <th class="td-right">ฝากคืน</th>
                    <th class="td-right">ขายสุทธิ</th>
                    <th class="td-right">ราคา/หน่วย</th>
                    <th class="td-right">ยอดรวม</th>
                  </tr></thead>
                  <tbody>
                    ${stock.map((s,i) => {
                      const sold = s.qty - (s.consigned||0);
                      const amt = sold * (s.product?.empVat||0);
                      return `<tr>
                        <td class="text-muted">${i+1}</td>
                        <td>${s.product?.imageUrl ? `<img src="${s.product.imageUrl}" class="product-img" />` : '<div class="product-img-placeholder"><span class="material-icons">inventory_2</span></div>'}</td>
                        <td class="td-bold">${s.product?.name||s.productId}</td>
                        <td class="td-right">${UI.currency(s.qty,0)}</td>
                        <td class="td-right text-warning">${UI.currency(s.consigned||0,0)}</td>
                        <td class="td-right td-bold">${UI.currency(sold,0)}</td>
                        <td class="td-right">฿${UI.currency(s.product?.empVat)}</td>
                        <td class="td-right text-success fw-bold">฿${UI.currency(amt)}</td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background:var(--bg-card2)">
                      <td colspan="7" class="td-right fw-bold">ยอดรวมทั้งหมด</td>
                      <td class="td-right fw-bold text-success">฿${UI.currency(netSell)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>`
            : UI.emptyState('inventory_2', 'ไม่มีสินค้าในคลัง', 'ยังไม่มีการเบิกสินค้าให้พนักงานคนนี้')
          }
        </div>
      `;
    }).join('');
  }
};
