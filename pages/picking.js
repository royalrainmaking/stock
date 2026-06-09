// ============================================================
// pages/picking.js – Stock picking and dispatch waitlist
// ============================================================

PAGES['picking'] = {
  _tasks: [],
  _products: [],
  _warehouses: [],
  _setSelections: {}, // Maps `${taskId}_${itemIdx}` to array of picked products

  async render() {
    const el = document.getElementById('page-picking');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:#E6F4EA;color:var(--c-transaction)">
            <span class="material-icons">fact_check</span>
          </div>
          <div>
            <h2 class="page-title">รอจัดสินค้า</h2>
            <p class="page-subtitle">รายการเบิกที่รอการจัดของและส่งมอบให้พนักงาน – Picking Queue</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="PAGES['picking'].load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
        </div>
      </div>

      <div id="picking-queue" class="picking-queue-container">
        ${UI.spinner()}
      </div>
    `;
    await this.load();
  },

  async load() {
    try {
      const [pRes, tRes, wRes] = await Promise.all([
        API.getProducts(),
        API.getPickingTasks(),
        API.getWarehouses()
      ]);
      this._products = pRes.products || [];
      this._tasks = tRes.tasks || [];
      this._warehouses = wRes.warehouses || [];
      
      // Update badge globally if available
      if (typeof UI.setBadge === 'function') {
        UI.setBadge('picking', this._tasks.length);
      }
      
      this.renderQueue();
    } catch(e) {
      document.getElementById('picking-queue').innerHTML = `
        <div class="alert alert-danger">${e.message}</div>
      `;
    }
  },

  renderQueue() {
    const el = document.getElementById('picking-queue');
    if (!this._tasks.length) {
      el.innerHTML = UI.emptyState('fact_check', 'ไม่มีรายการรอจัดสินค้า', 'ทุกรายการถูกดำเนินการหมดแล้ว เยี่ยมมาก!');
      return;
    }

    el.innerHTML = this._tasks.map((task, idx) => {
      const items = task.items || [];
      const normalItems = items.filter(i => !i.isSet);
      const setItems = items.filter(i => i.isSet);
      
      // Aggregate sets
      const setCats = {};
      setItems.forEach(item => {
        (item.rules || []).forEach(r => {
          if (!r.category) return;
          const normCat = r.category.trim().toLowerCase().replace(/[\s\.]+/g, '');
          if (!setCats[normCat]) {
            setCats[normCat] = { reqQty: 0, unit: r.unit, allowedProducts: null, display: r.category };
          }
          setCats[normCat].reqQty += r.qty * item.qty;
          
          if (r.allowedProducts && Array.isArray(r.allowedProducts)) {
            if (setCats[normCat].allowedProducts === null) {
              setCats[normCat].allowedProducts = [...r.allowedProducts];
            } else {
              r.allowedProducts.forEach(pid => {
                if (!setCats[normCat].allowedProducts.includes(pid)) {
                  setCats[normCat].allowedProducts.push(pid);
                }
              });
            }
          }
        });
      });
      // Handle null overrides (if any set rule has no restriction, the whole category has no restriction)
      setItems.forEach(item => {
        (item.rules || []).forEach(r => {
          if (!r.category) return;
          const normCat = r.category.trim().toLowerCase().replace(/[\s\.]+/g, '');
          if (!r.allowedProducts) {
            setCats[normCat].allowedProducts = null;
          }
        });
      });

      // Merge normal items into setCats if they share the same category
      for (let i = normalItems.length - 1; i >= 0; i--) {
        const nItem = normalItems[i];
        const p = this._products.find(prod => String(prod.id) === String(nItem.productId));
        if (p && p.category) {
          const normCat = p.category.trim().toLowerCase().replace(/[\s\.]+/g, '');
          if (setCats[normCat]) {
            // Category exists in sets! Merge this normal item into it.
            setCats[normCat].reqQty += Number(nItem.qty);
            setCats[normCat].minProds = setCats[normCat].minProds || {};
            setCats[normCat].minProds[p.id] = (setCats[normCat].minProds[p.id] || 0) + Number(nItem.qty);
            
            // Ensure product is allowed in this category
            if (setCats[normCat].allowedProducts !== null) {
              if (!setCats[normCat].allowedProducts.includes(p.id)) {
                setCats[normCat].allowedProducts.push(p.id);
              }
            }
            // Remove from normal items rendering
            normalItems.splice(i, 1);
          }
        }
      }

      const fromWh = this._warehouses.find(w => String(w.id).trim() === String(task.fromWhId).trim()) || {};
      const toWh   = this._warehouses.find(w => String(w.id).trim() === String(task.toWhId).trim()) || {};

      return `
        <div class="picking-card card mb-16 animate-in" style="animation-delay: ${idx * 0.1}s">
          <div class="picking-card-header">
            <div class="picking-info">
              <div class="picking-meta">
                <span class="material-icons" style="font-size:14px;vertical-align:middle">person</span> ${task.requestedBy}
                <span class="material-icons" style="font-size:14px;vertical-align:middle;margin-left:8px">schedule</span> ${UI.dateTimeStr(task.createdAt)}
              </div>
            </div>
            <div class="picking-wh">
              <div class="wh-path">
                <div style="display:flex;align-items:center;gap:6px">
                  ${UI.avatar(fromWh.employeeAvatar || fromWh.avatar, fromWh.name, 28, 'warehouse')}
                  <span class="wh-name">${fromWh.name || task.fromWhId}</span>
                </div>
                <span class="material-icons wh-arrow">arrow_forward</span>
                <div style="display:flex;align-items:center;gap:6px">
                  ${UI.avatar(toWh.employeeAvatar || toWh.avatar, toWh.employeeName || toWh.name, 28, toWh.type === 'central' ? 'warehouse' : 'user')}
                  <span class="wh-name highlight">${toWh.employeeName || toWh.name || task.toWhId}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="picking-items">

            <!-- Normal Items -->
            ${(() => {
              normalItems.sort((a, b) => {
                const idxA = this._products.findIndex(p => String(p.id) === String(a.productId));
                const idxB = this._products.findIndex(p => String(p.id) === String(b.productId));
                return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
              });
              return normalItems.map(item => {
              const p = this._products.find(x => x.id === item.productId) || {};
              return `
                <div class="picking-item-row">
                  <div class="item-img-mini">
                    ${UI.image(p.imageUrl, '', 'width:40px;height:40px;object-fit:cover;border-radius:4px;')}
                  </div>
                  <div class="item-details">
                    <div class="item-name">${p.name || item.productId}</div>
                    <div class="item-code">
                      ${p.code || ''}
                      ${p.category ? `<span style="margin-left:6px;padding:2px 6px;background:var(--bg-hover);border-radius:4px;font-size:0.7rem;color:var(--text-secondary)">${p.category}</span>` : ''}
                    </div>
                  </div>
                  <div class="item-qty" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px">
                    <div style="font-size:0.75rem; color:var(--text-muted);">
                      ขอเบิก: <span style="font-weight:700; color:var(--text-primary)">${item.qty}</span> ${item.unit || ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:6px">
                      <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:600">จัดจริง:</div>
                      <input type="number" class="qty-input-inline" data-task="${task.id}" data-pid="${item.productId}" data-unit="${item.unit || p.unit}" value="${item.qty}" min="0" style="font-weight:bold; color:var(--primary); font-size:1rem; border:2px solid var(--primary-light); background:#F0F4FF;" />
                      <span class="qty-unit" style="font-weight:600">${item.unit || 'หน่วย'}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('');
            })()}

            <!-- Aggregated Set Categories -->
            ${(() => {
              const keys = Object.keys(setCats);
              keys.sort((catA, catB) => {
                const idxA = this._products.findIndex(p => (p.category || '').trim().toLowerCase().replace(/[\s\.]+/g, '') === catA);
                const idxB = this._products.findIndex(p => (p.category || '').trim().toLowerCase().replace(/[\s\.]+/g, '') === catB);
                return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
              });
              return keys.map(normCat => {
              const g = setCats[normCat];
              const prods = this._products.filter(p => {
                const pCatNorm = (p.category || '').trim().toLowerCase().replace(/[\s\.]+/g, '');
                return pCatNorm === normCat && (!g.allowedProducts || g.allowedProducts.includes(p.id));
              });
              
              return `
                <div style="margin-top:16px; border:2px dashed var(--border); border-radius:8px; overflow:hidden;">
                  <div style="background:#f8f9fa; padding:10px 14px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:700; color:var(--text-primary); font-size:0.9rem">รวมหมวด ${g.display}</div>
                    <div class="set-cat-req-badge" id="req-badge-${task.id}-${normCat}" data-task="${task.id}" data-cat="${normCat}" data-req="${g.reqQty}" style="background:#FFF3E0; color:#E65100; padding:4px 10px; border-radius:12px; font-size:0.8rem; font-weight:bold;">
                      จัดแล้ว 0 / ${g.reqQty} ${g.unit}
                    </div>
                  </div>
                  <div style="padding:8px 0;">
                    ${prods.length === 0 ? `<div class="text-center text-muted" style="font-size:0.8rem; padding:10px">ไม่มีสินค้าที่อนุญาตในหมวดนี้</div>` : ''}
                    ${prods.map(p => {
                      const minQty = (g.minProds && g.minProds[p.id]) || 0;
                      return `
                      <div class="picking-item-row" style="border-bottom:none; margin-bottom:4px; padding:6px 14px; ${minQty > 0 ? 'background:#F0F4FF; border-radius:6px;' : ''}">
                        <div class="item-img-mini">
                          ${UI.image(p.imageUrl, '', 'width:36px;height:36px;object-fit:cover;border-radius:4px;')}
                        </div>
                        <div class="item-details">
                          <div class="item-name" style="font-size:0.85rem">${p.name}</div>
                          <div class="item-code" style="font-size:0.7rem">${p.code || ''} ${minQty > 0 ? `<span class="badge badge-primary" style="font-size:0.6rem">ล็อกขั้นต่ำ ${minQty}</span>` : ''}</div>
                        </div>
                        <div class="item-qty" style="display:flex; align-items:center; gap:6px">
                          <input type="number" class="qty-input-inline set-input" data-task="${task.id}" data-cat="${normCat}" data-pid="${p.id}" data-unit="${p.unit}" value="${minQty}" min="${minQty}" onchange="if(this.value < ${minQty}) this.value = ${minQty}; PAGES.picking.validateSets('${task.id}')" oninput="PAGES.picking.validateSets('${task.id}')" style="font-weight:bold; color:var(--primary); font-size:1rem; border:1px solid var(--border); width:70px; text-align:center;" />
                          <span class="qty-unit" style="font-size:0.8rem; font-weight:600">${p.unit}</span>
                        </div>
                      </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('');
            })()}

          </div>

          ${task.note ? `<div class="picking-note"><strong>หมายเหตุ:</strong> ${task.note}</div>` : ''}

          <div class="picking-actions">
            <button class="btn btn-secondary" onclick="PAGES['picking'].reject('${task.id}')">
              <span class="material-icons">cancel</span> ยกเลิก
            </button>
            <button class="btn btn-primary" onclick="PAGES['picking'].confirm('${task.id}')">
              <span class="material-icons">check_circle</span> ยืนยันจัดของ
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // Auto-validate sets on initial render
    setTimeout(() => {
      this._tasks.forEach(t => this.validateSets(t.id));
    }, 100);
  },
  
  validateSets(taskId) {
    const badges = document.querySelectorAll(`.set-cat-req-badge[data-task="${taskId}"]`);
    let allValid = true;
    
    badges.forEach(badge => {
      const cat = badge.dataset.cat;
      const reqQty = parseInt(badge.dataset.req) || 0;
      const inputs = document.querySelectorAll(`.set-input[data-task="${taskId}"][data-cat="${cat}"]`);
      
      let total = 0;
      inputs.forEach(inp => total += (parseInt(inp.value) || 0));
      
      badge.innerHTML = `จัดแล้ว ${total} / ${reqQty} ${badge.innerHTML.split(' ')[4] || ''}`;
      
      if (total === reqQty) {
        badge.style.background = '#E8F5E9';
        badge.style.color = '#2E7D32';
      } else {
        badge.style.background = '#FFF3E0';
        badge.style.color = '#E65100';
        allValid = false;
      }
      badge.dataset.valid = (total === reqQty) ? '1' : '0';
    });
    
    return allValid;
  },

  async confirm(id) {
    const task = this._tasks.find(t => t.id === id);
    if (!task) return;
    
    // Check if Sets are completed
    const badges = document.querySelectorAll(`.set-cat-req-badge[data-task="${id}"]`);
    for (let badge of Array.from(badges)) {
      if (badge.dataset.valid !== '1') {
        return UI.toast(`กรุณาจัดสินค้าหมวด ${badge.dataset.cat} ให้ครบตามจำนวน (${badge.innerText})`, 'warning');
      }
    }
    
    let updatedItems = [];
    
    // Normal items
    task.items.filter(i => !i.isSet).forEach(item => {
      const inp = document.querySelector(`.qty-input-inline[data-task="${id}"][data-pid="${item.productId}"]:not(.set-input)`);
      if (inp) {
        const qty = parseInt(inp.value) || 0;
        if (qty > 0) {
          const existing = updatedItems.find(i => i.productId === item.productId && !i.isSet);
          if (existing) {
            existing.qty += qty;
          } else {
            updatedItems.push({
              productId: item.productId,
              qty: qty,
              unit: inp.dataset.unit || 'หน่วย'
            });
          }
        }
      }
    });

    // Set items
    task.items.filter(i => i.isSet).forEach(item => {
       // Find all inputs for this set's categories
       let pickedComponents = [];
       const inputs = document.querySelectorAll(`.set-input[data-task="${id}"]`);
       
       Array.from(inputs).forEach(inp => {
          // Verify if this input belongs to this set's rules
          // Since we aggregate inputs by category per task, we can just distribute them.
          // But actually `item` (the Set) needs its components. 
          // If we have multiple sets in a task sharing categories, this is tricky.
          // In picking.js, the UI aggregates by category. So all inputs belong to the task generally.
          // We can just assign the total picked components to the FIRST set and empty the rest, 
          // OR we can just pass ALL picked set components in ONE of the set items.
       });
       // Actually, easier approach: just pass all picked set components in each Set object 
       // but we only need to deduct them ONCE per task!
       // Let's just collect all picked set components for the entire task.
    });
    
    // Collect all set components for the task
    let allPickedSetComponents = [];
    const setInputs = document.querySelectorAll(`.set-input[data-task="${id}"]`);
    Array.from(setInputs).forEach(inp => {
      const qty = parseInt(inp.value) || 0;
      if (qty > 0) {
        const existing = allPickedSetComponents.find(i => i.productId === inp.dataset.pid);
        if (existing) {
           existing.qty += qty;
        } else {
           allPickedSetComponents.push({
             productId: inp.dataset.pid,
             qty: qty,
             unit: inp.dataset.unit || 'หน่วย'
           });
        }
      }
    });

    // Now push the Set items
    // To prevent deducting components multiple times if there are multiple sets, 
    // we assign ALL components to the first Set item, and empty components for others.
    let isFirstSet = true;
    task.items.filter(i => i.isSet).forEach(item => {
       updatedItems.push({
          isSet: true,
          productId: item.productId,
          qty: item.qty,
          unit: item.unit,
          pickedComponents: isFirstSet ? allPickedSetComponents : []
       });
       isFirstSet = false;
    });

    if (updatedItems.length === 0) {
      if (!await UI.confirm('ยืนยันรายการ', 'คุณระบุจำนวนเป็น 0 ทั้งหมด ระบบจะโอนสต็อกเป็น 0 และปิดรายการ คุณต้องการดำเนินการใช่หรือไม่?')) return;
    } else {
      if (!await UI.confirm('ยืนยันรายการ', 'กดยืนยันเมื่อจัดสินค้าใส่รถพนักงานเรียบร้อยแล้ว สต็อกจะถูกโอนตามจำนวนที่ระบุ')) return;
    }

    try {
      UI.loading(true);
      await API.confirmPicking(id, updatedItems);
      UI.toast('จัดของสำเร็จและโอนสต็อกตามจริงแล้ว ✅', 'success');
      await this.load();
    } catch(e) {
      UI.toast(e.message, 'error');
    } finally { UI.loading(false); }
  },

  async reject(id) {
    if (!await UI.confirm('ยกเลิกรายการ', 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำขอนี้?', 'ยกเลิกคำขอ')) return;
    try {
      UI.loading(true);
      await API.rejectPicking(id);
      UI.toast('ยกเลิกคำขอแล้ว', 'info');
      await this.load();
    } catch(e) {
      UI.toast(e.message, 'error');
    } finally { UI.loading(false); }
  }
};
