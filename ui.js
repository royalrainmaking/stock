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
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  dateTimeStr(d) {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  todayISO() { return new Date().toISOString().split('T')[0]; },

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
          <div style="font-size:0.65rem;color:var(--text-muted)">${UI.currency(d.value, 0)}</div>
          <div class="chart-bar" title="${d.label}: ${UI.currency(d.value, 0)}"
            style="width:100%;height:${Math.max(4, Math.round((d.value/max)*100))}%;background:linear-gradient(180deg,${color},${colorEnd})"></div>
          <div style="font-size:0.68rem;color:var(--text-secondary);text-align:center">${d.label}</div>
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
    const map = { admin: ['badge-admin', 'Admin'], stock: ['badge-stock', 'Stock'], cashier: ['badge-cashier', 'Cashier'] };
    const [cls, label] = map[role] || ['badge-gray', role || ''];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  // ── Format role for display ──────────────────────────────
  roleLabel(role) {
    const map = { admin: 'ผู้ดูแลระบบ', stock: 'สต็อก', cashier: 'แคชเชียร์' };
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

  // ── Spinner inline ───────────────────────────────────────
  spinner() {
    return '<div style="display:flex;justify-content:center;padding:40px"><div class="spinner-ring"></div></div>';
  },

  // ── Simple paginator ─────────────────────────────────────
  paginator(current, total, onPage) {
    if (total <= 1) return '';
    const pages = Math.min(7, total);
    let html = '<div class="pagination">';
    html += `<button onclick="(${onPage})(${Math.max(1,current-1)})" ${current===1?'disabled':''}>‹</button>`;
    for (let i = 1; i <= total; i++) {
      if (total > 7 && i > 2 && i < total - 1 && Math.abs(i - current) > 2) {
        if (i === 3 || i === total - 2) html += '<span style="padding:0 4px;color:var(--text-muted)">…</span>';
        continue;
      }
      html += `<button class="${i===current?'active':''}" onclick="(${onPage})(${i})">${i}</button>`;
    }
    html += `<button onclick="(${onPage})(${Math.min(total,current+1)})" ${current===total?'disabled':''}>›</button>`;
    html += '</div>';
    return html;
  },
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
function buildSidebar() {
  const role = AUTH.getRole();
  const menu = getSidebarMenu(role);
  const container = document.getElementById('sidebar-menu');
  container.innerHTML = menu.map(section => `
    <div class="sidebar-section">${section.section}</div>
    ${section.items.map(item => `
      <button class="sidebar-item" data-page="${item.page}" onclick="showPage('${item.page}')">
        <span class="sidebar-icon"><span class="material-icons">${item.icon}</span></span>
        <span>${item.label}</span>
      </button>
    `).join('')}
  `).join('');
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
      section: 'คลังสินค้า',
      roles: ['admin', 'stock', 'cashier'],
      items: [
        { page: 'central-stock', icon: 'warehouse', label: 'คลังกลาง', roles: ['admin', 'stock', 'cashier'] },
        { page: 'employee-stock', icon: 'person_pin', label: 'คลังพนักงาน', roles: ['admin', 'stock', 'cashier'] },
      ]
    },
    {
      section: 'การดำเนินการ',
      roles: ['admin', 'stock', 'cashier'],
      items: [
        { page: 'receive-goods', icon: 'move_to_inbox', label: 'รับสินค้าเข้าคลัง', roles: ['admin', 'stock'] },
        { page: 'transfer', icon: 'swap_horiz', label: 'เบิกสินค้า', roles: ['admin', 'stock'] },
        { page: 'consign', icon: 'undo', label: 'รับฝากสินค้ากลับ', roles: ['admin', 'stock'] },
        { page: 'billing', icon: 'payments', label: 'คิดเงินพนักงาน', roles: ['admin', 'cashier'] },
        { page: 'tax-invoice', icon: 'receipt_long', label: 'ใบภาษีซื้อ', roles: ['admin', 'cashier'] },
        { page: 'order-request', icon: 'add_shopping_cart', label: 'แจ้งสั่งสินค้า', roles: ['admin', 'stock', 'cashier'] },
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
