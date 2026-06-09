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
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:#FFF8E1;color:var(--c-stock)">
            <span class="material-icons">person_pin</span>
          </div>
          <div>
            <h2 class="page-title">คลังสินค้าพนักงาน</h2>
            <p class="page-subtitle">ตรวจสอบสินค้าคงคลังและยอดขายสะสมรายบุคคล</p>
          </div>
        </div>
        <div class="page-actions">
          ${AUTH.hasRole('admin', 'stock') ? '<button class="btn btn-primary btn-sm" onclick="showPage(\'transfer\')"><span class="material-icons">add_circle</span> เบิกสินค้าให้พนักงาน</button>' : ''}
          ${AUTH.hasRole('admin', 'stock') ? '<button class="btn btn-secondary btn-sm" onclick="showPage(\'consign\')"><span class="material-icons">undo</span> รับฝากกลับ</button>' : ''}
        </div>
      </div>


      <div class="card mb-16">
        <div style="display:flex; flex-direction:column; gap:16px">
          <!-- Employee Avatar Selector -->
          <div style="width:100%; display:flex; flex-direction:column; gap:8px">
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em">เลือกคลังพนักงาน</div>
            <div id="es-wh-selector" class="avatar-selector-row" style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; padding:4px 0">
              <!-- Avatar items will be injected here -->
            </div>
          </div>
          
          <div class="section-divider" style="margin:0; opacity:0.5"></div>
          
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0">
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
      </div>
      <style>
        .avatar-select-item { box-shadow:var(--shadow-sm); }
        .avatar-select-item:hover { transform:translateY(-2px); box-shadow:var(--shadow-lg); }
      </style>

      <div id="es-content">${UI.spinner()}</div>
    `;
    await this.load();
  },

  setWh(v) { 
    this._selectedWh = v; 
    this.renderWarehouses();
    this.renderContent(); 
  },
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

  showWhLoading(show) {
    const selector = document.getElementById('es-wh-selector');
    if (!selector) return;
    const activeItem = selector.querySelector('.avatar-select-item[style*="border-color:var(--primary)"]') 
      || selector.querySelector('.avatar-select-item[style*="border-color: var(--primary)"]');
    if (!activeItem) return;
    
    const avatarEl = activeItem.querySelector('div:first-child') || activeItem.querySelector('.user-avatar') || activeItem.querySelector('.avatar-placeholder');
    if (!avatarEl) return;

    if (show) {
      if (!activeItem._originalAvatarHtml) {
        activeItem._originalAvatarHtml = avatarEl.innerHTML;
        activeItem._originalAvatarBg = avatarEl.style.background;
      }
      avatarEl.style.background = 'none';
      avatarEl.innerHTML = '<span class="material-icons rotating" style="color:var(--primary); font-size:24px">sync</span>';
    } else {
      if (activeItem._originalAvatarHtml) {
        avatarEl.innerHTML = activeItem._originalAvatarHtml;
        avatarEl.style.background = activeItem._originalAvatarBg || '';
        delete activeItem._originalAvatarHtml;
        delete activeItem._originalAvatarBg;
      }
    }
  },

  async load() {
    this.showWhLoading(true);
    try {
      const [stockRes] = await Promise.all([
        API.getAllEmployeeStocks(),
        MASTER_DATA.load()
      ]);
      this._allStock = stockRes.warehouses || [];
      this._warehouses = MASTER_DATA.warehouses.filter(w => w.type === 'employee');
      this._products = MASTER_DATA.products || [];

      this.renderWarehouses();
      this.renderContent();
    } catch (e) {
      document.getElementById('es-content').innerHTML = `<div class="alert alert-danger"><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">warning</span>${e.message}</div>`;
    } finally {
      this.showWhLoading(false);
    }
  },

  renderWarehouses() {
    const container = document.getElementById('es-wh-selector');
    if (!container) return;

    let html = '';
    
    this._warehouses.forEach(w => {
      const isActive = this._selectedWh === w.id;
      const activeStyle = isActive 
        ? 'border-color:var(--primary); background:var(--bg-card); box-shadow:var(--shadow-lg); transform:translateY(-2px)' 
        : 'border-color:var(--border-light); background:transparent';
      
      const stockItem = this._allStock.find(item => item.warehouse.id === w.id) || {};
      const emp = stockItem.employee || {};
      const avHtml = UI.avatar(emp.avatar || w.avatar, emp.displayName || w.name, 42);

      html += `
        <div class="avatar-select-item" onclick="PAGES['employee-stock'].setWh('${w.id}')" style="
          display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; padding:6px 12px;
          border-radius:12px; border:2px solid; transition:all 0.2s; min-width:90px; text-align:center; ${activeStyle}
        " onpointerenter="this.style.borderColor='var(--primary)'" onpointerleave="this.style.borderColor='${isActive ? 'var(--primary)' : 'var(--border-light)'}'">
          ${avHtml}
          <div style="font-size:0.75rem; font-weight:700; color:${isActive ? 'var(--primary)' : 'var(--text-secondary)'}">${emp.displayName || w.name}</div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  renderContent() {
    if (!this._selectedWh) {
      document.getElementById('es-content').innerHTML = UI.emptyState(
        'person_search', 
        'กรุณาเลือกพนักงาน', 
        'คลิกที่รูปโปรไฟล์พนักงานด้านบนเพื่อดูข้อมูลคลังสินค้าและยอดขายสะสม'
      );
      return;
    }

    const data = this._allStock.filter(d => d.warehouse.id === this._selectedWh);
    
    if (!data.length) {
      document.getElementById('es-content').innerHTML = UI.emptyState('person_pin', 'ไม่พบข้อมูล', 'ไม่มีข้อมูลคลังสินค้าสำหรับพนักงานที่เลือก');
      return;
    }

    document.getElementById('es-content').innerHTML = data.map(d => {
      const emp = d.employee || {};
      const wh = d.warehouse || {};
      let stock = d.stock || [];

      if (this._search) {
        stock = stock.filter(s => {
          let name = s.product?.name;
          if (!name) {
             const set = MASTER_DATA.sets.find(set => set.id === s.productId);
             if (set) name = set.name;
          }
          return (name || '').toLowerCase().includes(this._search);
        });
      }

      // Grouping logic for this employee
      const grouped = {};
      stock.forEach(s => {
        const pid = s.productId;
        if (!grouped[pid]) {
          let p = s.product;
          if (!p || !p.name) {
             const setObj = MASTER_DATA.sets.find(set => set.id === pid);
             if (setObj) {
                let cost = 0;
                let wholesale = 0;
                (setObj.items || []).forEach(it => {
                  let cp = null;
                  if (it.allowedProducts && it.allowedProducts.length > 0) {
                    cp = MASTER_DATA.products.find(x => it.allowedProducts.includes(x.id));
                  }
                  if (!cp && it.category) {
                    cp = MASTER_DATA.products.find(x => x.category === it.category);
                  }
                  if (cp) {
                    cost += (Number(cp.costVat) || 0) * (Number(it.qty) || 0);
                    wholesale += (Number(cp.sellWholesale) || 0) * (Number(it.qty) || 0);
                  }
                });
                
                p = {
                   id: setObj.id,
                   name: setObj.name,
                   code: setObj.code,
                   imageUrl: setObj.imageUrl,
                   category: 'เซ็ตสินค้า',
                   unit: 'เซ็ต',
                   sellWholesale: wholesale,
                   sellCommission: 100 - wholesale,
                   isSet: true
                };
             }
          }
          
          grouped[pid] = {
            product: p,
            productId: pid,
            unit: s.unit || p?.unit || 'หน่วย',
            totalQty: 0,
            totalConsigned: 0,
            batches: [],
            isSet: p?.isSet || false
          };
        }
        grouped[pid].totalQty += s.qty;
        grouped[pid].totalConsigned += (s.consigned || 0);
        grouped[pid].batches.push(s);
      });

      const productList = Object.values(grouped).filter(p => p.totalQty > 0);
      const normalProducts = productList.filter(p => !p.isSet);
      const setProducts = productList.filter(p => p.isSet);

      // Sort: Normal products
      normalProducts.sort((a, b) => {
        const idxA = this._products.findIndex(p => p.id === a.productId);
        const idxB = this._products.findIndex(p => p.id === b.productId);
        return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
      });
      
      // Sort sets by name
      setProducts.sort((a, b) => (a.product?.name || '').localeCompare(b.product?.name || ''));

      const normalWholesale = normalProducts.reduce((a, p) => a + (p.totalQty - p.totalConsigned) * (p.product?.sellWholesale || 0), 0);
      const normalCommission = normalProducts.reduce((a, p) => a + (p.totalQty - p.totalConsigned) * (p.product?.sellCommission || 0), 0);
      
      const setWholesale = setProducts.reduce((a, p) => a + (p.totalQty - p.totalConsigned) * (p.product?.sellWholesale || 0), 0);
      const setCommission = setProducts.reduce((a, p) => a + (p.totalQty - p.totalConsigned) * (p.product?.sellCommission || 0), 0);

      const totalWholesale = normalWholesale + setWholesale;
      const totalCommission = normalCommission + setCommission;
      
      const renderSection = (title, items, icon, sectionWholesale, sectionCommission) => {
        if (!items.length) return '';
        const maxQty = Math.max(...items.map(p => p.totalQty), 1);
        return `
          <div style="margin-bottom:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--border);flex-wrap:wrap;gap:8px">
              <div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:1.1rem;color:var(--text-primary);">
                <span class="material-icons" style="color:var(--primary)">${icon}</span>
                ${title} <span class="badge badge-gray" style="font-size:0.8rem">${items.length} รายการ</span>
              </div>
              <div style="display:flex;gap:12px;font-size:0.9rem;font-weight:bold;background:var(--bg-card2);padding:4px 12px;border-radius:20px;">
                <span class="text-primary">ส่งเงิน: ฿${UI.currency(sectionWholesale, 2)}</span>
                <span style="color:#BE185D">คอมฯ: ฿${UI.currency(sectionCommission, 2)}</span>
              </div>
            </div>
            ${this._viewMode === 'card'
              ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
                   ${items.map(p => this._renderEmpCard(p, maxQty)).join('')}
                 </div>`
              : this._renderEmpTable(items, null, null)
            }
          </div>
        `;
      };

      return `
        <div class="card mb-16">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
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
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
               <button class="btn btn-secondary btn-sm" onclick="PAGES['employee-stock'].viewDailyWithdrawal('${wh.id}', '${emp.displayName || wh.name}')" title="ดูประวัติการเบิกรายวันแยกตามครั้ง">
                 <span class="material-icons">history</span> ประวัติการเบิก
               </button>
               <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
                 <div style="display:flex;gap:6px">
                   <div class="badge badge-blue" style="padding:6px 14px;font-size:0.95rem">ยอดส่งเงินรวม: ฿${UI.currency(totalWholesale, 2)}</div>
                   <div class="badge badge-pink" style="padding:6px 14px;font-size:0.95rem">ค่าคอมฯรวม: ฿${UI.currency(totalCommission, 2)}</div>
                 </div>
               </div>
            </div>
          </div>
          
          ${renderSection('สินค้าเขต', normalProducts, 'inventory_2', normalWholesale, normalCommission)}
          ${renderSection('สินค้าจัดเซ็ต', setProducts, 'category', setWholesale, setCommission)}
        </div>
      `;
    }).join('');
  },

  _renderEmpCard(p, maxTotalQty) {
    const qty = p.totalQty;
    const sold = qty - p.totalConsigned;
    const wholesalePrice = p.product?.sellWholesale || 0;
    const commissionPrice = p.product?.sellCommission || 0;
    const barColor = qty === 0 ? 'var(--danger)' : 'var(--primary)';

    const batchRows = p.batches.filter(b => b.qty > 0).map(b => {
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
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--shadow)">
        <div style="display:flex;gap:12px">
          <div style="width:50px;height:50px;flex-shrink:0;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border-light);overflow:hidden;display:flex;align-items:center;justify-content:center">
             ${UI.image(p.product?.imageUrl, 'product-img')}
          </div>
          <div>
            <div style="font-size:0.75rem;color:var(--primary);font-weight:700">${p.product?.code || '-'}</div>
            <div style="font-weight:800;font-size:1.1rem;line-height:1.2">${p.product?.name || p.productId}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${p.product?.category || ''}</div>
          </div>
        </div>
        
        <div style="background:var(--bg-card2);padding:12px;border-radius:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px">
          <div style="border-right:1px solid var(--border)">
             <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase">ถือครอง</div>
             <div style="font-size:1.3rem;font-weight:900;color:${barColor};line-height:1">${UI.currency(qty, 0)} <small style="font-weight:400;font-size:0.75rem">${p.unit}</small></div>
          </div>
          <div style="border-right:1px solid var(--border);padding-left:6px">
             <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase">ฝากคืน</div>
             <div style="font-size:1.3rem;font-weight:900;color:var(--warning);line-height:1">${UI.currency(p.totalConsigned || 0, 0)} <small style="font-weight:400;font-size:0.75rem;color:var(--text-secondary)">${p.unit}</small></div>
          </div>
          <div style="padding-left:6px">
             <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase">ขายสุทธิ</div>
             <div style="font-size:1.3rem;font-weight:900;color:var(--success);line-height:1">${UI.currency(sold, 0)} <small style="font-weight:400;font-size:0.75rem;color:var(--text-secondary)">${p.unit}</small></div>
          </div>
        </div>

        <div style="font-size:0.75rem;padding-top:4px;border-top:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-muted)">ราคาส่ง:</span>
            <span style="font-weight:700">฿${UI.currency(sold * wholesalePrice, 2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-muted)">ค่าคอมฯ:</span>
            <span style="font-weight:700;color:#BE185D">฿${UI.currency(sold * commissionPrice, 2)}</span>
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

              const batchHtml = p.batches.filter(b => b.qty > 0).map(b => {
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
                <td>
                  <div class="td-bold">${p.product?.name || p.productId}</div>
                  <div style="font-size:0.65rem;color:var(--text-muted)"><span style="font-family:monospace">[${p.product?.code || '-'}]</span> ${p.product?.category || ''}</div>
                </td>
                <td><div style="min-width:160px">${batchHtml}</div></td>
                <td class="td-right td-bold">${UI.currency(qty, 0)}</td>
                <td class="td-right text-warning">${UI.currency(con, 0)}</td>
                <td class="td-right td-bold text-success">${UI.currency(sold, 0)}</td>
                <td class="td-right td-bold text-primary">฿${UI.currency(whAmt, 2)}</td>
                <td class="td-right td-bold" style="color:#BE185D">฿${UI.currency(commAmt, 2)}</td>
              </tr>`;
            }).join('')}
          </tbody>
          ${totalWholesale !== null ? `
          <tfoot>
            <tr style="background:var(--bg-card2); font-weight:bold">
              <td colspan="7" class="td-right">ยอดรวม</td>
              <td class="td-right text-primary">฿${UI.currency(totalWholesale, 2)}</td>
              <td class="td-right" style="color:#BE185D">฿${UI.currency(totalCommission, 2)}</td>
            </tr>
          </tfoot>
          ` : ''}
        </table>
      </div>
    `;
  },

  async viewDailyWithdrawal(whId, empName) {
    const today = new Date().toISOString().split('T')[0];
    
    const body = `
      <div style="margin-bottom:16px; background:var(--bg-card2); padding:16px; border-radius:12px; display:flex; align-items:center; gap:12px;">
        <label style="font-weight:bold; margin:0">เลือกวันที่:</label>
        <input type="date" id="es-dw-date" class="form-control" value="${today}" onchange="PAGES['employee-stock'].loadDailyWithdrawal('${whId}')" style="max-width:200px">
      </div>
      <div id="es-dw-content">
        ${UI.spinner()}
      </div>
    `;
    
    openModal(`ประวัติการเบิก: ${empName}`, body, `<button class="btn btn-secondary" onclick="closeModal()">ปิด</button>`, '700px');
    
    this.loadDailyWithdrawal(whId);
  },

  async loadDailyWithdrawal(whId) {
    const contentDiv = document.getElementById('es-dw-content');
    if (!contentDiv) return;
    
    const dateStr = document.getElementById('es-dw-date').value;
    if (!dateStr) return;
    
    try {
      contentDiv.innerHTML = UI.spinner();
      const res = await API.getOrders();
      const orders = res.orders || [];
      
      // Filter for withdrawals to this employee warehouse on the selected date
      const dwOrders = orders.filter(o => 
        (o.id.startsWith('REQ') || o.id.startsWith('TR')) &&
        String(o.toWhId).trim() === String(whId).trim() &&
        o.createdAt && o.createdAt.startsWith(dateStr)
      );
      
      this._currentOrders = dwOrders; // Store locally for printing
      
      if (dwOrders.length === 0) {
        contentDiv.innerHTML = UI.emptyState('history', `ไม่พบรายการเบิกในวันที่ ${UI.dateStr(dateStr)}`, 'พนักงานคนนี้ไม่มีรายการเบิกสินค้าในวันที่คุณเลือก');
        return;
      }
      
      // Sort by time (newest first or oldest first? let's do chronological: oldest first)
      dwOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      let html = `<div style="font-weight:700; margin-bottom:16px; color:var(--primary); font-size:1.1rem">
        📌 ในวันที่ ${UI.dateStr(dateStr)} มีการเบิกทั้งหมด ${dwOrders.length} ครั้ง
      </div>`;
      
      dwOrders.forEach((o, index) => {
        const timeStr = UI.dateTimeParts(o.createdAt).time;
        
        let statusBadge = '';
        if (o.status === 'pending') statusBadge = '<span class="badge badge-yellow">รอจัดสินค้า</span>';
        else if (o.status === 'completed') statusBadge = '<span class="badge badge-green">จัดเสร็จแล้ว</span>';
        else if (o.status === 'rejected') statusBadge = '<span class="badge badge-red">ถูกปฏิเสธ</span>';
        
        const itemsHtml = (o.items || []).map(it => {
          const p = this._products.find(x => x.id === it.productId) || {};
          return `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed var(--border-light); font-size:0.9rem;">
              <div style="display:flex; align-items:center; gap:8px">
                 ${UI.image(p.imageUrl, '', 'width:32px;height:32px;object-fit:cover;border-radius:4px;')}
                 <div>
                   <div style="font-weight:600">${p.name || it.productId}</div>
                   <div style="font-size:0.7rem;color:var(--text-muted)">${p.category || ''}</div>
                 </div>
              </div>
              <div style="font-weight:800; color:var(--primary); font-size:1.1rem; display:flex; align-items:center;">
                 ${it.qty} <small style="font-weight:400; font-size:0.8rem; margin-left:4px">${it.unit || p.unit || 'หน่วย'}</small>
              </div>
            </div>
          `;
        }).join('');
        
        html += `
          <div style="background:#fff; border:1px solid var(--border); border-radius:12px; margin-bottom:16px; box-shadow:var(--shadow-sm); overflow:hidden;">
            <div style="background:var(--bg-card2); padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border);">
              <div style="display:flex; align-items:center; gap:12px">
                <div style="background:var(--primary); color:#fff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.9rem">
                  ${index + 1}
                </div>
                <div>
                  <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem">เวลา ${timeStr} น.</div>
                  <div style="font-size:0.7rem; color:var(--text-muted)">เลขที่รายการ: ${o.id}</div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:10px">
                ${statusBadge}
                <button class="btn btn-secondary btn-sm" onclick="PAGES['employee-stock'].printOrderBill('${o.id}')" title="พิมพ์บิล">
                  <span class="material-icons" style="font-size:16px">print</span> พิมพ์บิล
                </button>
              </div>
            </div>
            <div style="padding:8px 16px;">
              ${itemsHtml}
              ${o.note ? `<div style="margin-top:12px; padding:10px; background:#FEF9C3; border-radius:8px; font-size:0.85rem; color:#854D0E">
                <span class="material-icons" style="font-size:16px; vertical-align:middle">info</span> <strong>หมายเหตุ:</strong> ${o.note}
              </div>` : ''}
            </div>
          </div>
        `;
      });
      
      contentDiv.innerHTML = html;
      
    } catch (e) {
      contentDiv.innerHTML = `<div class="alert alert-danger"><span class="material-icons">error</span> ${e.message}</div>`;
    }
  },

  async printOrderBill(orderId) {
    try {
      const order = (this._currentOrders || []).find(o => o.id === orderId);
      if (!order) throw new Error('ไม่พบข้อมูลบิล โปรดโหลดหน้านี้ใหม่');
      
      UI.loading(true);
      if (!MASTER_DATA._loaded) await MASTER_DATA.load();
      
      const products = MASTER_DATA.products || [];
      const warehouses = MASTER_DATA.warehouses || [];
      
      const fromWh = warehouses.find(w => w.id === order.fromWhId) || { name: order.fromWhId };
      const toWh = warehouses.find(w => w.id === order.toWhId) || { name: order.toWhId };
      
      let totalQty = 0;
      let totalAmount = 0;
      
      const itemsHtml = (order.items || []).map((it, idx) => {
        const p = products.find(x => x.id === it.productId) || {};
        const price = p.sellWholesale || 0;
        const qty = Number(it.qty) || 0;
        const rowTotal = price * qty;
        totalQty += qty;
        totalAmount += rowTotal;
        return `
          <tr>
            <td>${idx + 1}. ${p.name || it.productId}</td>
            <td class="text-right">${qty}</td>
            <td class="text-right">${UI.currency(price, 2)}</td>
            <td class="text-right">${UI.currency(rowTotal, 2)}</td>
          </tr>
        `;
      }).join('');
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>ใบเบิกสินค้า ${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
            body { font-family: 'Sarabun', sans-serif; font-size: 14px; margin: 0; padding: 20px; color: #000; background: #f5f5f5; }
            .bill-wrapper { max-width: 480px; margin: 0 auto; background: #fff; border: 1px solid #ddd; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; }
            @media print {
              body { background: #fff; padding: 0; margin: 0; }
              .bill-wrapper { border: none; box-shadow: none; max-width: 100%; padding: 0; margin: 0; }
              .no-print { display: none !important; }
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .header h2 { margin: 0 0 5px 0; font-size: 22px; font-weight: 700; }
            .header p { margin: 0 0 15px 0; font-size: 14px; color: #555; }
            .info-box { border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; font-size: 14px; line-height: 1.6; }
            .info-row { display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            th { border-bottom: 2px solid #000; padding: 8px 0; text-align: left; font-weight: 600; }
            td { padding: 8px 0; vertical-align: top; border-bottom: 1px dashed #ccc; }
            th.text-right, td.text-right { text-align: right; }
            .summary-box { border-top: 2px solid #000; margin-top: -20px; padding-top: 10px; }
            .summary-row { display: flex; justify-content: space-between; font-size: 16px; margin-bottom: 5px; }
            .grand-total { font-weight: 700; font-size: 18px; border-bottom: 3px double #000; padding-bottom: 5px; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
            .sig-box { width: 45%; }
            .sig-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="no-print text-center" style="margin-bottom:20px;">
            <button onclick="window.print()" style="padding:10px 20px; font-size:16px; font-family:'Sarabun'; background:#1976d2; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.2);">🖨️ พิมพ์บิล</button>
            <button onclick="window.close()" style="padding:10px 20px; font-size:16px; font-family:'Sarabun'; background:#e0e0e0; color:#333; border:none; border-radius:6px; cursor:pointer; font-weight:bold; margin-left:10px;">ปิดหน้าต่าง</button>
          </div>
          <div class="bill-wrapper">
            <div class="header text-center">
              <h2>ใบเบิกสินค้า / ใบส่งของ</h2>
              <p>เอกสารแสดงรายการเบิกสินค้าให้พนักงาน</p>
            </div>
            <div class="info-box">
              <div class="info-row">
                <div><b>เลขที่:</b> ${order.id}</div>
                <div><b>วันที่:</b> ${UI.dateStr(order.createdAt)}</div>
              </div>
              <div class="info-row">
                <div><b>ผู้ขอเบิก (พนักงาน):</b> ${order.requestedBy || toWh.employeeName || toWh.name}</div>
                <div><b>เวลา:</b> ${UI.dateTimeParts(order.createdAt).time} น.</div>
              </div>
              <div class="info-row">
                <div><b>เบิกจากคลัง:</b> ${fromWh.name}</div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th class="text-right">จำนวน</th>
                  <th class="text-right">ราคา/หน่วย</th>
                  <th class="text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="summary-box">
              <div class="summary-row">
                <div>รวมจำนวนสุทธิ:</div>
                <div>${totalQty} ชิ้น</div>
              </div>
              <div class="summary-row grand-total">
                <div>รวมเป็นเงิน (ราคาส่ง):</div>
                <div>${UI.currency(totalAmount, 2)} บาท</div>
              </div>
            </div>
            
            ${order.note ? `<div style="margin-top:20px; font-size:13px;"><b>หมายเหตุ:</b> ${order.note}</div>` : ''}
            
            <div class="signatures">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div>( .................................................. )</div>
                <div style="margin-top:5px">ผู้รับของ (พนักงาน)</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div>( .................................................. )</div>
                <div style="margin-top:5px">ผู้จ่ายของ/คลังสินค้า</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank', 'width=600,height=800');
      printWindow.document.write(html);
      printWindow.document.close();
      
    } catch (e) {
      UI.toast(e.message, 'error');
    } finally {
      UI.loading(false);
    }
  }
};
