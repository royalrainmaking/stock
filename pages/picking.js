// ============================================================
// pages/picking.js – Stock picking and dispatch waitlist
// ============================================================

PAGES['picking'] = {
  _tasks: [],
  _products: [],
  _warehouses: [],

  async render() {
    const el = document.getElementById('page-picking');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#1565C0,#0D47A1)">
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
            ${items.map(item => {
              const p = this._products.find(x => x.id === item.productId) || {};
              return `
                <div class="picking-item-row">
                  <div class="item-img-mini">
                    ${p.imageUrl ? `<img src="${p.imageUrl}" onerror="this.src='https://placehold.co/40x40?text=?'" />` : '<span class="material-icons">inventory_2</span>'}
                  </div>
                  <div class="item-details">
                    <div class="item-name">${p.name || item.productId}</div>
                    <div class="item-code">${p.code || ''}</div>
                  </div>
                  <div class="item-qty">
                    <input type="number" class="qty-input-inline" data-task="${task.id}" data-pid="${item.productId}" value="${item.qty}" min="0" />
                    <span class="qty-unit">${item.unit || 'หน่วย'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${task.note ? `<div class="picking-note"><strong>หมายเหตุ:</strong> ${task.note}</div>` : ''}

          <div class="picking-actions">
            <button class="btn btn-secondary" onclick="PAGES['picking'].reject('${task.id}')">
              <span class="material-icons">cancel</span> ยกเลิก
            </button>
            <button class="btn btn-primary" onclick="PAGES['picking'].confirm('${task.id}')">
              <span class="material-icons">check_circle</span> จัดของเสร็จสมบูรณ์
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async confirm(id) {
    const inputs = document.querySelectorAll(`.qty-input-inline[data-task="${id}"]`);
    const updatedItems = Array.from(inputs).map(inp => ({
      productId: inp.dataset.pid,
      qty: parseInt(inp.value) || 0
    }));

    if (updatedItems.some(i => i.qty < 0)) return UI.toast('จำนวนสินค้าต้องไม่ติดลบ', 'warning');
    
    const isZero = updatedItems.every(i => i.qty === 0);
    const confirmMsg = isZero 
      ? 'คุณระบุจำนวนเป็น 0 ทั้งหมด ระบบจะโอนสต็อกเป็น 0 และปิดรายการ คุณต้องการดำเนินการใช่หรือไม่?'
      : 'กดยืนยันเมื่อจัดสินค้าใส่รถพนักงานเรียบร้อยแล้ว สต็อกจะถูกโอนตามจำนวนที่ระบุ';

    if (!await UI.confirm('ยืนยันรายการ', confirmMsg)) return;

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
