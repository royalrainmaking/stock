// ============================================================
// pages/shop-map.js – Map view & Shop management (Merged)
// ============================================================

PAGES['shop-map'] = {
  _map: null,
  _markers: [],
  _shops: [],
  _users: [],
  _formMap: null,
  _formMarker: null,

  async render() {
    const el = document.getElementById('page-shop-map');
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">แผนที่ร้านค้า</h2>
          <p class="page-subtitle">แสดงตำแหน่งและจัดการร้านค้าทั้งหมดบนแผนที่</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="PAGES['shop-map'].openAdd()">
            <span class="material-icons">add_location_alt</span> เพิ่มร้านค้าใหม่
          </button>
        </div>
      </div>
      
      <div class="card" style="padding:0; overflow:hidden; position:relative">
        <div id="shop-map-container" style="height: calc(100vh - 200px); min-height: 500px; width:100%"></div>
        <div class="map-overlay-hint">
          <span class="material-icons">info</span> 
          คลิกบนพื้นที่ว่างในแผนที่เพื่อปักหมุดเพิ่มร้านค้าใหม่ได้ทันที
        </div>
      </div>
    `;
    
    // Custom style for the overlay hint
    if (!document.getElementById('map-hint-style')) {
      const s = document.createElement('style');
      s.id = 'map-hint-style';
      s.innerHTML = `
        .map-overlay-hint {
          position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
          background: rgba(255,255,255,0.9); padding: 8px 16px; border-radius: 30px;
          font-size: 0.8rem; font-weight: 600; color: var(--primary);
          box-shadow: var(--shadow); z-index: 1000; pointer-events: none;
          display: flex; align-items: center; gap: 6px; border: 1px solid var(--primary-light);
        }
      `;
      document.head.appendChild(s);
    }
    
    // Initialize map
    setTimeout(() => this.initMap(), 100);
  },

  async initMap() {
    if (this._map) {
      this._map.remove();
      this._map = null;
    }

    // Default center of Thailand
    this._map = L.map('shop-map-container').setView([13.736717, 100.523186], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this._map);

    // Map click to add
    this._map.on('click', (e) => {
      if (e.originalEvent.target.id === 'shop-map-container' || e.originalEvent.target.classList.contains('leaflet-container')) {
        this.openAdd(e.latlng.lat, e.latlng.lng);
      }
    });

    await this.loadData();
  },

  async loadData() {
    try {
      const [sr, ur] = await Promise.all([API.getShops(), API.getUsers()]);
      this._shops = sr.shops || [];
      this._users = ur.users || [];
      this.renderMarkers();
    } catch (e) {
      UI.toast('โหลดข้อมูลล้มเหลว: ' + e.message, 'error');
    }
  },

  renderMarkers() {
    this._markers.forEach(m => m.remove());
    this._markers = [];

    this._shops.forEach(s => {
      if (!s.lat || !s.lng) return;

      const defaultWhImg = 'https://storage.googleapis.com/fastwork-static/6fb5cf34-a09d-440e-a059-599144515c1d.jpg';
      const avatarUrl = s.imageUrl || defaultWhImg;
      
      const icon = L.divIcon({
        className: 'custom-shop-icon',
        html: `
          <div class="shop-marker-container">
            ${UI.avatar(s.imageUrl, s.name, 32, 'warehouse', 'shop-marker-avatar')}
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([s.lat, s.lng], { icon }).addTo(this._map);
      
      const seller = this._users.find(u => u.id === s.salesPersonId);
      
      marker.bindPopup(`
        <div style="font-family: 'Sarabun', sans-serif; min-width:220px">
          <div style="position:relative; margin-bottom:12px">
            ${UI.avatar(s.imageUrl, s.name, 120, 'warehouse', 'shop-popup-img')}
            <style>.shop-popup-img { width:100% !important; height:120px !important; border-radius:8px !important; object-fit:cover !important; }</style>
            <div style="position:absolute; top:8px; right:8px; display:flex; gap:4px">
               <button class="btn btn-accent btn-xs" onclick="PAGES['shop-map'].openEdit('${s.id}')" title="แก้ไข">
                 <span class="material-icons" style="font-size:14px">edit</span>
               </button>
               <button class="btn btn-danger btn-xs" onclick="PAGES['shop-map'].doDelete('${s.id}')" title="ลบ">
                 <span class="material-icons" style="font-size:14px">delete</span>
               </button>
            </div>
          </div>
          <strong style="font-size:1.1rem;color:var(--primary)">${s.name}</strong><br/>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">รหัส: ${s.id} | ดูแลโดย: ${seller?.displayName || '-'}</div>
          
          <div style="font-size:0.85rem;margin-bottom:12px;color:var(--text-secondary)">
            <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px">
              <span class="material-icons" style="font-size:16px">location_on</span>
              <span>${s.address || '-'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="material-icons" style="font-size:16px">phone</span>
              <span>${s.phone || '-'}</span>
            </div>
          </div>
          
          <button class="btn btn-primary btn-sm btn-full" onclick="showPage('shop-stock'); PAGES['shop-stock'].setShop('${s.id}')">
            <span class="material-icons" style="font-size:16px;vertical-align:middle">inventory_2</span> เข้าชมสต็อกสินค้า
          </button>
        </div>
      `);
      this._markers.push(marker);
    });
  },

  focusShop(shopId) {
    const shop = this._shops.find(s => s.id === shopId);
    if (shop && shop.lat && shop.lng) {
      setTimeout(() => {
        if (this._map) {
          this._map.setView([shop.lat, shop.lng], 15);
          const marker = this._markers.find(m => m.getLatLng().lat === shop.lat && m.getLatLng().lng === shop.lng);
          if (marker) marker.openPopup();
        }
      }, 500);
    }
  },

  // ── Management Logic ──────────────────

  openAdd(lat = 13.736, lng = 100.523) {
    this._openForm(null, lat, lng);
  },

  openEdit(id) {
    const shop = this._shops.find(s => s.id === id);
    if (shop) this._openForm(shop);
  },

  _openForm(shop = null, defLat, defLng) {
    const isEdit = !!shop;
    const s = shop || { name: '', address: '', lat: defLat, lng: defLng, ownerName: '', phone: '', salesPersonId: AUTH.getUser().id, imageUrl: '' };
    const defaultWhImg = 'https://storage.googleapis.com/fastwork-static/6fb5cf34-a09d-440e-a059-599144515c1d.jpg';

    openModal(isEdit ? 'แก้ไขข้อมูลร้านค้า' : 'เพิ่มร้านค้าใหม่', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div class="form-group">
            <label>ชื่อร้านค้า *</label>
            <input id="mf-name" value="${s.name}" placeholder="เช่น ร้านป้าแดง สาขา 1" />
          </div>
          <div class="form-group">
            <label>ที่อยู่ร้านค้า</label>
            <textarea id="mf-address" rows="2" placeholder="รายละเอียดที่ตั้ง">${s.address}</textarea>
          </div>
          <div class="form-group">
            <label>พนักงานขายที่รับผิดชอบ</label>
            <select id="mf-sales">
              ${this._users.filter(u => u.role === 'sell' || u.role === 'admin' || u.role === 'stock').map(u => `
                <option value="${u.id}" ${u.id === s.salesPersonId ? 'selected' : ''}>${u.displayName}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>ชื่อเจ้าของร้าน</label>
              <input id="mf-owner" value="${s.ownerName}" placeholder="ชื่อ-นามสกุล" />
            </div>
            <div class="form-group">
              <label>เบอร์โทร</label>
              <input id="mf-phone" value="${s.phone}" placeholder="08x-xxx-xxxx" />
            </div>
          </div>
          <div class="form-group">
            <label>URL รูปภาพร้านค้า</label>
            <input id="mf-image" value="${s.imageUrl}" placeholder="วางลิงก์รูปภาพที่นี่" oninput="document.getElementById('mf-preview').src = this.value || '${defaultWhImg}'" />
            <div style="margin-top:8px">
              <img id="mf-preview" src="${s.imageUrl || defaultWhImg}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;border:1px solid var(--border)" onerror="this.src='${defaultWhImg}'" />
            </div>
          </div>
          <input type="hidden" id="mf-lat" value="${s.lat}" />
          <input type="hidden" id="mf-lng" value="${s.lng}" />
        </div>
        
        <div>
          <label style="display:block;margin-bottom:8px;font-size:0.85rem;font-weight:600">ตำแหน่งพิกัด (คลิกบนแผนที่เพื่อเปลี่ยน)</label>
          <div id="mf-map-picker" style="height:350px;width:100%;border-radius:8px;border:1px solid var(--border)"></div>
          <div style="margin-top:8px; font-size:0.75rem; color:var(--text-secondary); display:flex; justify-content:space-between">
             <span>Lat: <span id="mf-lat-text">${Number(s.lat).toFixed(6)}</span></span>
             <span>Lng: <span id="mf-lng-text">${Number(s.lng).toFixed(6)}</span></span>
          </div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES['shop-map'].saveForm('${isEdit ? s.id : ''}')">
        <span class="material-icons">save</span> บันทึกข้อมูล
      </button>
    `, '900px');

    setTimeout(() => this.initMapPicker(s.lat, s.lng), 100);
  },

  initMapPicker(lat, lng) {
    if (this._formMap) {
      this._formMap.remove();
      this._formMap = null;
    }
    this._formMap = L.map('mf-map-picker').setView([lat || 13.736, lng || 100.523], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(this._formMap);
    this._formMarker = L.marker([lat || 13.736, lng || 100.523]).addTo(this._formMap);

    this._formMap.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this._formMarker.setLatLng([lat, lng]);
      document.getElementById('mf-lat').value = lat;
      document.getElementById('mf-lng').value = lng;
      document.getElementById('mf-lat-text').textContent = lat.toFixed(6);
      document.getElementById('mf-lng-text').textContent = lng.toFixed(6);
    });
  },

  async saveForm(id) {
    const data = {
      id: id || undefined,
      name: document.getElementById('mf-name').value.trim(),
      imageUrl: document.getElementById('mf-image').value.trim(),
      address: document.getElementById('mf-address').value.trim(),
      lat: Number(document.getElementById('mf-lat').value),
      lng: Number(document.getElementById('mf-lng').value),
      ownerName: document.getElementById('mf-owner').value.trim(),
      phone: document.getElementById('mf-phone').value.trim(),
      salesPersonId: document.getElementById('mf-sales').value,
      active: true
    };

    if (!data.name) return UI.toast('กรุณาระบุชื่อร้านค้า', 'warning');

    try {
      UI.loading(true);
      if (id) await API.updateShop(data);
      else await API.createShop(data);
      closeModal();
      UI.toast(id ? 'แก้ไขข้อมูลเรียบร้อย' : 'เพิ่มร้านค้าเรียบร้อย', 'success');
      await this.loadData();
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
      await this.loadData();
    } catch (e) {
      UI.toast(e.message, 'error');
    } finally { UI.loading(false); }
  }
};
