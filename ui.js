// ============================================================
// ui.js – Global UI utilities (toast, modal, sidebar, etc.)
// ============================================================

// Global page registry – must be declared before any page files load
const PAGES = {};

const UI = {
  // ── Toast notifications ──────────────────────────────────
  toast(message, type = 'info', duration = 3500) {
    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon"><span class="material-icons">${icons[type] || 'info'}</span></span><span>${message}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  // ── Loading overlay ──────────────────────────────────────
  loading(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden', !show);
  },

  // ── Number format ────────────────────────────────────────
  currency(n, decimals = 2) {
    if (isNaN(n) || n === null || n === '') return '—';
    return Number(n).toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },
  num(n) { return Number(n) || 0; },

  // ── Date format ──────────────────────────────────────────
  dateStr(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  dateTimeStr(d) {
    const p = this.dateTimeParts(d);
    return p.date ? `${p.date} ${p.time}` : '-';
  },
  
  dateTimeParts(d) {
    if (!d) return { date: '', time: '' };
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return { date: String(d), time: '' };
    return {
      date: dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
    };
  },

  todayISO() { return new Date().toISOString().split('T')[0]; },

  avatar(url, name, size = 40, type = 'user', className = '') {
    const defaultUser = 'https://storage.googleapis.com/fastwork-static/748949a9-a424-466f-a248-e75d2b682171.jpg';
    const defaultWh = 'https://storage.googleapis.com/fastwork-static/6fb5cf34-a09d-440e-a059-599144515c1d.jpg';
    const placeholder = (type === 'warehouse' || type === 'store' || type === 'shop') ? defaultWh : defaultUser;

    const fallbackHTML = `<img src="${placeholder}" class="${className}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0" />`;

    // ตรวจสอบค่าว่างหรือค่าที่ผิดพลาดจากระบบหลังบ้าน
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null' || url === 'undefined') return fallbackHTML;
    
    const cleanUrl = url.trim();
    const isValidUrl = /^(http|https|\/|data:)/.test(cleanUrl);
    if (!isValidUrl) return fallbackHTML;

    let finalUrl = cleanUrl;
    // รองรับ Google Drive Link
    if (cleanUrl.includes('drive.google.com')) {
      const match = cleanUrl.match(/id=([a-zA-Z0-9_-]{28,})/ ) || cleanUrl.match(/file\/d\/([a-zA-Z0-9_-]{28,})/);
      if (match) {
        finalUrl = `https://lh3.googleusercontent.com/d/${match[1]}=w400-h400`;
      }
    }

    return `<img src="${finalUrl}" class="${className}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.onerror=null; this.src='${placeholder}'" />`;
  },

  image(url, className = '', style = '') {
    const defaultImg = 'https://storage.googleapis.com/fastwork-static/inventory-placeholder.png'; 
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null') {
      return `<div class="product-img-placeholder ${className}" style="${style}"><span class="material-icons">inventory_2</span></div>`;
    }

    let finalUrl = url.trim();
    if (url.includes('drive.google.com')) {
      const match = url.match(/id=([a-zA-Z0-9_-]{28,})/ ) || url.match(/file\/d\/([a-zA-Z0-9_-]{28,})/);
      if (match) {
        finalUrl = `https://lh3.googleusercontent.com/d/${match[1]}=w400-h400`;
      }
    }

    return `<img src="${finalUrl}" class="${className}" style="${style}" onerror="this.onerror=null; this.src='https://storage.googleapis.com/fastwork-static/6fb5cf34-a09d-440e-a059-599144515c1d.jpg'" />`;
  },

  // ── Debounce ─────────────────────────────────────────────
  debounce(fn, ms = 300) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  // ── Build bar chart ─────────────────────────────────────
  barChart(data, opts = {}) {
    const max = Math.max(...data.map(d => d.value), 1);
    const color = opts.color || 'var(--primary)';
    const colorEnd = opts.colorEnd || 'var(--primary-dark)';
    return `<div class="chart-wrap" style="height:${opts.height || 200}px">
      ${data.map(d => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;">
          <div style="font-size:0.8rem;color:var(--text-muted)">${UI.currency(d.value, 0)}</div>
          <div class="chart-bar" title="${d.label}: ${UI.currency(d.value, 0)}"
            style="width:100%;height:${Math.max(4, Math.round((d.value / max) * 100))}%;background:linear-gradient(180deg,${color},${colorEnd})"></div>
          <div style="font-size:0.85rem;color:var(--text-secondary);text-align:center">${d.label}</div>
        </div>
      `).join('')}
    </div>`;
  },

  // ── Confirm dialog ───────────────────────────────────────
  async confirm(title, message, dangerLabel = 'ยืนยัน') {
    return new Promise(resolve => {
      openModal(title, `
        <p style="color:var(--text-secondary);line-height:1.6">${message}</p>
      `, `
        <button class="btn btn-secondary" onclick="closeModal(); window._confirmRes(false)">ยกเลิก</button>
        <button class="btn btn-danger" onclick="closeModal(); window._confirmRes(true)">${dangerLabel}</button>
      `);
      window._confirmRes = resolve;
    });
  },

  // ── Role badge html ──────────────────────────────────────
  roleBadge(role) {
    const map = {
      admin: ['badge-admin', 'Admin'],
      stock: ['badge-stock', 'Stock'],
      cashier: ['badge-cashier', 'Cashier'],
      employee: ['badge-blue', 'Employee'],
      sell: ['badge-green', 'Sales'],
      customer: ['badge-yellow', 'Customer'],
      part_time: ['badge-gray', 'Part-time']
    };
    const [cls, label] = map[role] || ['badge-gray', role || 'User'];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  // ── Format role for display ──────────────────────────────
  roleLabel(role) {
    const map = {
      admin: 'ผู้ดูแลระบบ',
      stock: 'พนักงานสต็อก',
      cashier: 'แคชเชียร์',
      employee: 'พนักงานทั่วไป',
      sell: 'พนักงานขาย',
      customer: 'ลูกค้า',
      part_time: 'พนักงานชั่วคราว'
    };
    return map[role] || role;
  },

  // ── Status badge ─────────────────────────────────────────
  statusBadge(billed) {
    return billed
      ? '<span class="badge badge-green"><span class="material-icons" style="font-size:12px;vertical-align:middle;margin-right:2px">check_circle</span>คิดเงินแล้ว</span>'
      : '<span class="badge badge-yellow"><span class="material-icons" style="font-size:12px;vertical-align:middle;margin-right:2px">schedule</span>รอคิดเงิน</span>';
  },

  // ── Empty state ──────────────────────────────────────────
  emptyState(icon, title, detail) {
    // icon can be a Material Icons name (string without emoji) or a full HTML span
    const iconHtml = icon.startsWith('<') ? icon : `<span class="material-icons">${icon}</span>`;
    return `<div class="empty-state"><div class="empty-icon">${iconHtml}</div><h4>${title}</h4><p>${detail}</p></div>`;
  },

  // ── Spinner / Skeleton inline ───────────────────────────
  spinner() {
    return `<div style="padding:24px">
      ${[100,70,45,80,55].map(w => `<div class="skeleton skel-row" style="width:${w}%"></div>`).join('')}
    </div>`;
  },

  skeletonTable(cols = 5, rows = 5) {
    const hd = Array(cols).fill('<th><div class="skeleton skel-row w100"></div></th>').join('');
    const td = Array(cols).fill('<td><div class="skeleton skel-row w70"></div></td>').join('');
    const tr = Array(rows).fill(`<tr>${td}</tr>`).join('');
    return `<div class="table-wrap card" style="padding:0"><table><thead><tr>${hd}</tr></thead><tbody>${tr}</tbody></table></div>`;
  },

  // ── Simple paginator ─────────────────────────────────────
  paginator(current, total, onPage) {
    if (total <= 1) return '';
    const pages = Math.min(7, total);
    let html = '<div class="pagination">';
    html += `<button onclick="${onPage}(${Math.max(1, current - 1)})" ${current === 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= total; i++) {
      if (total > 7 && i > 2 && i < total - 1 && Math.abs(i - current) > 2) {
        if (i === 3 || i === total - 2) html += '<span style="padding:0 4px;color:var(--text-muted)">…</span>';
        continue;
      }
      html += `<button class="${i === current ? 'active' : ''}" onclick="${onPage}(${i})">${i}</button>`;
    }
    html += `<button onclick="${onPage}(${Math.min(total, current + 1)})" ${current === total ? 'disabled' : ''}>›</button>`;
    html += '</div>';
    return html;
  },

  // ── Badges ──────────────────────────────────────────────
  _badges: {},
  setBadge(id, count) {
    this._badges[id] = count;
    const el = document.getElementById(`badge-${id}`);
    if (el) {
      el.textContent = count > 0 ? count : '';
      el.style.display = count > 0 ? 'inline-flex' : 'none';
      if (count > 0) el.classList.add('pulse');
      else el.classList.remove('pulse');
    }
  },

  // ── Background Refresh ──────────────────────────────────
  _refreshInterval: null,
  async refreshBadges() {
    const role = AUTH.getRole();
    if (!role || (role !== 'admin' && role !== 'stock')) return;
    try {
      const res = await API.getPickingTasks();
      const count = (res.tasks || []).length;
      this.setBadge('picking', count);
    } catch (e) { console.error('Badge refresh failed', e); }
  },

  startAutoRefresh(ms = 60000) {
    if (this._refreshInterval) clearInterval(this._refreshInterval);
    this.refreshBadges(); // First pull
    this._refreshInterval = setInterval(() => this.refreshBadges(), ms);
  },

  stopAutoRefresh() {
    if (this._refreshInterval) clearInterval(this._refreshInterval);
    this._refreshInterval = null;
  },
  async refreshBadges() {
    try {
      const res = await API.getPickingTasks();
      const count = res.tasks?.length || 0;
      this.setBadge('picking', count);
    } catch (e) { }
  }
};

// ── Sidebar ───────────────────────────────────────────────
let sidebarOpen = false;
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('open', sidebarOpen);
  document.getElementById('sidebar-overlay').classList.toggle('hidden', !sidebarOpen);
}

// ── User dropdown ─────────────────────────────────────────
let userMenuOpen = false;
function toggleUserMenu() {
  userMenuOpen = !userMenuOpen;
  document.getElementById('user-dropdown').classList.toggle('hidden', !userMenuOpen);
}
function closeUserMenu() {
  userMenuOpen = false;
  document.getElementById('user-dropdown').classList.add('hidden');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-user')) closeUserMenu();
  if (!e.target.closest('.sidebar') && !e.target.closest('#menu-toggle') && sidebarOpen && window.innerWidth <= 900) {
    toggleSidebar();
  }
});

// ── Modal ─────────────────────────────────────────────────
function openModal(title, bodyHTML, footerHTML = '', maxWidth = '560px') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;
  document.querySelector('.modal-box').style.maxWidth = maxWidth;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Page navigation ───────────────────────────────────────
let currentPage = null;
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  // Show target
  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.remove('hidden');
    currentPage = pageId;
    // Trigger render
    const fn = PAGES[pageId];
    if (fn && typeof fn.render === 'function') fn.render();
  }
  // Update sidebar active
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
  // Close sidebar on mobile after nav
  if (window.innerWidth <= 900 && sidebarOpen) toggleSidebar();
}

// ── Sidebar menu builder ──────────────────────────────────
// Map section names to icon color classes
const SECTION_ICON_CLASS = {
  'ภาพรวม': 'ic-overview',
  'การทำรายการ': 'ic-transaction',
  'การเงิน': 'ic-finance',
  'ตรวจสอบสต็อก': 'ic-stock',
  'ประวัติรายการ': 'ic-history',
  'ระบบร้านค้า (Consignment)': 'ic-shop',
  'จัดการระบบ': 'ic-admin',
  'บัญชีผู้ใช้': 'ic-account',
};

function buildSidebar() {
  const role = AUTH.getRole();
  const menu = getSidebarMenu(role);
  const container = document.getElementById('sidebar-menu');
  container.innerHTML = menu.map(section => {
    const icClass = SECTION_ICON_CLASS[section.section] || '';
    return `
    <div class="sidebar-section">${section.section}</div>
    ${section.items.map(item => `
      <button class="sidebar-item" data-page="${item.page}" onclick="showPage('${item.page}')">
        <span class="sidebar-icon ${icClass}">
          <span class="material-icons">${item.icon}</span>
        </span>
        <span style="flex:1">${item.label}</span>
        ${item.badgeId ? `<span id="badge-${item.badgeId}" class="sidebar-badge" style="display:none"></span>` : ''}
      </button>
    `).join('')}
  `}).join('');
  UI.refreshBadges();
}

function getSidebarMenu(role) {
  const all = [
    {
      section: 'ภาพรวม',
      roles: ['admin', 'stock', 'cashier'],
      items: [
        { page: 'dashboard', icon: 'dashboard', label: 'แดชบอร์ด', roles: ['admin'] },
        { page: 'sales-report', icon: 'bar_chart', label: 'รายงานยอดขาย', roles: ['admin', 'cashier'] },
      ]
    },
    {
      section: 'การทำรายการ',
      roles: ['admin', 'stock', 'cashier'],
      items: [
        { page: 'receive-goods', icon: 'add_shopping_cart', label: 'รับสินค้าเข้า', roles: ['admin', 'stock'] },
        { page: 'transfer', icon: 'swap_horiz', label: 'เบิกสินค้า', roles: ['admin', 'stock', 'cashier'] },
        { page: 'consign', icon: 'assignment_return', label: 'ฝากสินค้า', roles: ['admin', 'stock'] },
        { page: 'cancel-consign', icon: 'undo', label: 'ยกเลิกฝาก', roles: ['admin', 'stock'] },
        { page: 'movement', icon: 'sync_alt', label: 'ย้ายสต็อก', roles: ['admin', 'stock'] },
        { page: 'picking', icon: 'fact_check', label: 'รอจัดสินค้า', roles: ['admin', 'stock'], badgeId: 'picking' },
      ]
    },
    {
      section: 'การเงิน',
      roles: ['admin', 'cashier'],
      items: [
        { page: 'billing', icon: 'payments', label: 'คิดเงินพนักงาน', roles: ['admin', 'cashier'] },
        { page: 'tax-invoice', icon: 'receipt', label: 'ใบกำกับภาษี', roles: ['admin', 'cashier'] },
      ]
    },
    {
      section: 'ตรวจสอบสต็อก',
      roles: ['admin', 'stock', 'cashier'],
      items: [
        { page: 'central-stock', icon: 'warehouse', label: 'คลังสินค้ากลาง', roles: ['admin', 'stock', 'cashier'] },
        { page: 'employee-stock', icon: 'person_pin', label: 'คลังพนักงาน', roles: ['admin', 'stock', 'cashier'] },
        { page: 'order-request', icon: 'playlist_add_check', label: 'แจ้งสั่งสินค้า', roles: ['admin', 'stock', 'cashier'] },
      ]
    },
    {
      section: 'ประวัติรายการ',
      roles: ['admin', 'stock', 'cashier'],
      items: [
        { page: 'billing-history', icon: 'payments', label: 'ประวัติคิดเงิน', roles: ['admin', 'cashier'] },
        { page: 'receive-history', icon: 'history_edu', label: 'ประวัติรับสินค้า', roles: ['admin', 'stock'] },
        { page: 'transfer-history', icon: 'manage_search', label: 'ประวัติการเบิก', roles: ['admin', 'stock', 'cashier'] },
        { page: 'movement-history', icon: 'timeline', label: 'ประวัติย้ายคลัง', roles: ['admin', 'stock'] },
      ]
    },
    {
      section: 'ระบบร้านค้า (Consignment)',
      roles: ['admin', 'stock', 'sell'],
      items: [
        { page: 'shop-map', icon: 'map', label: 'แผนที่ร้านค้า', roles: ['admin', 'stock', 'sell'] },
        { page: 'shop-stock', icon: 'inventory_2', label: 'สต็อกร้านค้า', roles: ['admin', 'stock', 'sell'] },
      ]
    },
    {
      section: 'จัดการระบบ',
      roles: ['admin'],
      items: [
        { page: 'products', icon: 'inventory', label: 'จัดการสินค้า', roles: ['admin'] },
        { page: 'warehouses', icon: 'store', label: 'จัดการคลัง', roles: ['admin'] },
        { page: 'users', icon: 'group', label: 'จัดการผู้ใช้', roles: ['admin'] },
        { page: 'logs', icon: 'history', label: 'บันทึกระบบ', roles: ['admin'] },
      ]
    },
    {
      section: 'บัญชีผู้ใช้',
      roles: ['admin', 'stock', 'cashier'],
      items: [
        { page: 'change-password', icon: 'lock', label: 'เปลี่ยนรหัสผ่าน', roles: ['admin', 'stock', 'cashier'] },
      ]
    }
  ];

  return all.map(section => ({
    section: section.section,
    items: section.items.filter(item => item.roles.includes(role)),
  })).filter(section => section.items.length > 0);
}
