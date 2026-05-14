// ============================================================
// pages/shops.js – Shop management
// ============================================================

PAGES['shops'] = {
  _shops: [],
  _users: [],
  _search: '',
  _formMap: null,
  _formMarker: null,

  async render() {
    const el = document.getElementById('page-shops');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#FF6D00,#E65100)">
            <span class="material-icons">storefront</span>
          </div>
          <div>
            <h2 class="page-title">รายชื่อร้านค้า</h2>
            <p class="page-subtitle">จัดการข้อมูลพิกัด รูปภาพ และพนักงานดูแลร้านค้าในระบบ (Shop Directory)</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="PAGES.shops.openAdd()">
            <span class="material-icons">add_business</span> เพิ่มร้านค้าใหม่
          </button>
        </div>
      </div>
      <div class="filter-card">
        <form onsubmit="event.preventDefault()">
          <div class="form-group" style="flex:1;min-width:260px">
            <label>ค้นหาร้านค้า</label>
            <input type="text" placeholder="ค้นหาชื่อร้าน, รหัส หรือเบอร์โทร..." oninput="PAGES.shops.doSearch(this.value)" />
          </div>
          <button type="button" class="btn btn-secondary btn-sm" style="height:42px" onclick="PAGES.shops.load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
        </form>
      </div>

      <div id="shops-list">${UI.spinner()}</div>
    `;
    await this.load();
  },

  async load() {
    try {
      const [sr, ur] = await Promise.all([API.getShops(), API.getUsers()]);
      this._shops = sr.shops || [];
      this._users = ur.users || [];
      this.renderList();
    } catch (e) {
      document.getElementById('shops-list').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
  },

  doSearch(v) {
    this._search = v.toLowerCase();
    this.renderList();
  },

  filtered() {
    if (!this._search) return this._shops;
    return this._shops.filter(s => 
      s.name.toLowerCase().includes(this._search) ||
      s.id.toLowerCase().includes(this._search) ||
      (s.phone && s.phone.includes(this._search))
    );
  },

  renderList() {
    const data = this.filtered();
    const container = document.getElementById('shops-list');
    
    if (!data.length) {
      container.innerHTML = UI.emptyState('storefront', 'ไม่พบข้อมูลร้านค้า', 'ลองใช้คำค้นหาอื่น หรือเพิ่มร้านค้าใหม่');
      return;
    }

    container.innerHTML = `
      <div class="grid-3">
        ${data.map(s => {
          const seller = this._users.find(u => u.id === s.salesPersonId);
          const defaultWhImg = 'https://storage.googleapis.com/fastwork-static/6fb5cf34-a09d-440e-a059-599144515c1d.jpg';
          return `
            <div class="card shop-card">
              <div style="position:relative">
                ${UI.image(s.imageUrl, 'shop-img', 'width:100%;height:140px;object-fit:cover;border-radius:12px;margin-bottom:12px;display:block')}
                <div class="badge badge-gray" style="position:absolute;top:8px;left:8px;box-shadow:var(--shadow-sm);backdrop-filter:blur(4px);background:rgba(255,255,255,0.7);color:var(--text-main)">${s.id}</div>
              </div>
              
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:4px;color:var(--primary)">${s.name}</h3>
                <div style="display:flex;gap:4px">
                  <button class="btn-icon" title="แก้ไข" onclick="PAGES.shops.openEdit('${s.id}')"><span class="material-icons">edit</span></button>
                  <button class="btn-icon text-danger" title="ลบ" onclick="PAGES.shops.doDelete('${s.id}')"><span class="material-icons">delete</span></button>
                </div>
              </div>

              <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;display:flex;align-items:center;gap:4px">
                <span class="material-icons" style="font-size:14px">person</span>
                ดูแลโดย: ${seller?.displayName || 'ไม่ระบุ'}
              </div>
              
              <div class="info-list">
                <div class="info-item">
                  <span class="material-icons">location_on</span>
                  <span>${s.address || 'ไม่มีข้อมูลที่อยู่'}</span>
                </div>
                <div class="info-item">
                  <span class="material-icons">phone</span>
                  <span>${s.phone || '-'}</span>
                </div>
                ${s.lat && s.lng ? `
                  <div class="info-item">
                    <span class="material-icons" style="color:var(--green)">map</span>
                    <span style="color:var(--green)">มีพิกัดพิกัดแผนที่</span>
                  </div>
                ` : `
                  <div class="info-item">
                    <span class="material-icons" style="color:var(--text-muted)">location_off</span>
                    <span style="color:var(--text-muted)">ยังไม่ได้ปักหมุด</span>
                  </div>
                `}
              </div>
              
              <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:8px">
                <button class="btn btn-secondary btn-sm btn-full" onclick="showPage('shop-stock'); PAGES['shop-stock'].setShop('${s.id}')">
                  <span class="material-icons">inventory_2</span> สต็อกในร้าน
                </button>
                ${s.lat && s.lng ? `
                  <button class="btn btn-accent btn-sm" onclick="showPage('shop-map'); PAGES['shop-map'].focusShop('${s.id}')">
                    <span class="material-icons">explore</span>
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  openAdd() { this._openForm(); },
  openEdit(id) { this._openForm(this._shops.find(s => s.id === id)); },

  _openForm(shop = null) {
    const isEdit = !!shop;
    const s = shop || { name: '', address: '', lat: 13.736, lng: 100.523, ownerName: '', phone: '', salesPersonId: AUTH.getUser().id, imageUrl: '' };
    const defaultWhImg = 'https://storage.googleapis.com/fastwork-static/6fb5cf34-a09d-440e-a059-599144515c1d.jpg';

    openModal(isEdit ? 'แก้ไขร้านค้า' : 'เพิ่มร้านค้าใหม่', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div class="form-group">
            <label>ชื่อร้านค้า *</label>
            <input id="sf-name" value="${s.name}" placeholder="เช่น ร้านป้าแดง สาขา 1" />
          </div>
          <div class="form-group">
            <label>URL รูปภาพร้านค้า</label>
            <input id="sf-image" value="${s.imageUrl}" placeholder="วางลิงก์รูปภาพที่นี่" oninput="document.getElementById('sf-preview').src = this.value || '${defaultWhImg}'" />
            <div style="margin-top:8px">
              <img id="sf-preview" src="${s.imageUrl || defaultWhImg}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;border:1px solid var(--border)" onerror="this.src='${defaultWhImg}'" />
            </div>
          </div>
          <div class="form-group">
            <label>ที่อยู่ / รายละเอียดสถานที่</label>
            <textarea id="sf-address" rows="2" placeholder="ที่อยู่ร้านค้า">${s.address}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>ละติจูด</label>
              <input type="number" id="sf-lat" value="${s.lat}" step="0.000001" readonly />
            </div>
            <div class="form-group">
              <label>ลองจิจูด</label>
              <input type="number" id="sf-lng" value="${s.lng}" step="0.000001" readonly />
            </div>
          </div>
          <div class="form-group">
            <label>พนักงานขายที่รับผิดชอบ</label>
            <select id="sf-sales">
              ${this._users.filter(u => u.role === 'sell' || u.role === 'admin' || u.role === 'stock').map(u => `
                <option value="${u.id}" ${u.id === s.salesPersonId ? 'selected' : ''}>${u.displayName}</option>
              `).join('')}
            </select>
          </div>
        </div>
        
        <div>
          <label style="display:block;margin-bottom:8px;font-size:0.85rem;font-weight:600">คลิกบนแผนที่เพื่อปักหมุดตำแหน่งร้าน</label>
          <div id="sf-map-picker" style="height:350px;width:100%;border-radius:8px;border:1px solid var(--border)"></div>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:8px">
            <span class="material-icons" style="font-size:12px;vertical-align:middle">info</span> 
            ซูมและคลิกเลือกจุดที่ต้องการ พิกัดจะถูกอัปเดตอัตโนมัติ
          </p>
        </div>
      </div>
      
      <div class="form-row" style="margin-top:16px">
        <div class="form-group">
          <label>ชื่อเจ้าของร้าน</label>
          <input id="sf-owner" value="${s.ownerName}" placeholder="ชื่อ-นามสกุล" />
        </div>
        <div class="form-group">
          <label>เบอร์โทรศัพท์</label>
          <input id="sf-phone" value="${s.phone}" placeholder="08x-xxx-xxxx" />
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES.shops.saveForm('${isEdit ? s.id : ''}')">
        <span class="material-icons">save</span> บันทึกข้อมูล
      </button>
    `, '900px');

    // Init Map Picker
    setTimeout(() => this.initMapPicker(s.lat, s.lng), 100);
  },

  initMapPicker(lat, lng) {
    if (this._formMap) {
      this._formMap.remove();
      this._formMap = null;
    }

    this._formMap = L.map('sf-map-picker').setView([lat || 13.736, lng || 100.523], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this._formMap);

    this._formMarker = L.marker([lat || 13.736, lng || 100.523], { draggable: false }).addTo(this._formMap);

    this._formMap.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this._formMarker.setLatLng([lat, lng]);
      document.getElementById('sf-lat').value = lat.toFixed(6);
      document.getElementById('sf-lng').value = lng.toFixed(6);
    });
  },

  async saveForm(id) {
    const data = {
      id: id || undefined,
      name: document.getElementById('sf-name').value.trim(),
      imageUrl: document.getElementById('sf-image').value.trim(),
      address: document.getElementById('sf-address').value.trim(),
      lat: Number(document.getElementById('sf-lat').value) || 0,
      lng: Number(document.getElementById('sf-lng').value) || 0,
      ownerName: document.getElementById('sf-owner').value.trim(),
      phone: document.getElementById('sf-phone').value.trim(),
      salesPersonId: document.getElementById('sf-sales').value,
      active: true
    };

    if (!data.name) return UI.toast('กรุณาระบุชื่อร้านค้า', 'warning');

    try {
      UI.loading(true);
      if (id) await API.updateShop(data);
      else await API.createShop(data);
      closeModal();
      UI.toast(id ? 'แก้ไขข้อมูลเรียบร้อย' : 'เพิ่มร้านค้าเรียบร้อย', 'success');
      await this.load();
    } catch (e) {
      UI.toast(e.message, 'error');
    } finally { UI.loading(false); }
  },

  async doDelete(id) {
    if (!await UI.confirm('ยืนยันการลบ', 'คุณต้องการลบร้านค้านี้ใช่หรือไม่?', 'ลบทิ้ง')) return;
    try {
      UI.loading(true);
      await API.deleteShop(id);
      UI.toast('ลบร้านค้าเรียบร้อย', 'success');
      await this.load();
    } catch (e) {
      UI.toast(e.message, 'error');
    } finally { UI.loading(false); }
  }
};
