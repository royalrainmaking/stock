// ============================================================
// app.js – Main application controller
// ============================================================


const APP = {
  async init() {
    AUTH.init();
    if (AUTH.isLoggedIn()) {
      await this.onLoginSuccess(AUTH.getUser(), false);
    }
  },

  async onLoginSuccess(user, isNewLogin = true) {
    // Update nav
    document.getElementById('nav-username').textContent = user.displayName || user.username;
    document.getElementById('nav-avatar').textContent = (user.displayName || user.username).charAt(0).toUpperCase();
    const roleBadge = document.getElementById('nav-role-badge');
    roleBadge.textContent = UI.roleLabel(user.role).toUpperCase();
    roleBadge.className = `nav-badge badge-${user.role}`;

    // Build sidebar
    buildSidebar();

    // Switch screens
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('main-app').classList.remove('hidden');

    // Show default page for role
    const defaultPages = {
      admin: 'dashboard',
      stock: 'central-stock',
      cashier: 'billing',
    };
    const startPage = defaultPages[user.role] || 'central-stock';
    showPage(startPage);

    if (isNewLogin) {
      UI.toast(`ยินดีต้อนรับ ${user.displayName || user.username}!`, 'success');
    }
  },
};

// ── Bootstrap ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => APP.init());
