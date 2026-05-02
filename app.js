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
    const navAvatar = document.getElementById('nav-avatar');
    // We can just use the innerHTML output of UI.avatar (with size set to 100% since it's inside a flex container)
    // Actually our UI.avatar returns a fixed size element, but we can override its styles or just let it render standard 36px.
    // The navAvatar div is: <div id="nav-avatar" class="nav-avatar"></div>  (36x36 from CSS).
    navAvatar.style.background = 'none';
    navAvatar.innerHTML = UI.avatar(user.avatar, user.displayName || user.username, 36);

    const roleBadge = document.getElementById('nav-role-badge');
    roleBadge.textContent = UI.roleLabel(user.role).toUpperCase();
    roleBadge.className = `nav-badge badge-${user.role}`;

    // Build sidebar
    buildSidebar();

    // Start auto-refresh for badges (Picking tasks, etc.)
    UI.startAutoRefresh();

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
