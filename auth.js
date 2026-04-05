// ============================================================
// auth.js – Authentication and session management
// ============================================================

const AUTH = {
  _session: null,

  init() {
    const saved = localStorage.getItem(CONFIG.SESSION_KEY);
    if (saved) {
      try { this._session = JSON.parse(saved); } catch (e) { this._session = null; }
    }
  },

  setSession(token, user) {
    this._session = { token, user, loginAt: Date.now() };
    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(this._session));
  },

  clearSession() {
    this._session = null;
    localStorage.removeItem(CONFIG.SESSION_KEY);
  },

  isLoggedIn() { return !!this._session && !!this._session.token; },
  getToken() { return this._session ? this._session.token : ''; },
  getUser() { return this._session ? this._session.user : null; },
  getRole() { return this._session?.user?.role || ''; },

  hasRole(...roles) { return roles.includes(this.getRole()); },
  isAdmin() { return this.getRole() === ROLES.ADMIN; },
  isStock() { return this.getRole() === ROLES.STOCK; },
  isCashier() { return this.getRole() === ROLES.CASHIER; },

  can(action) {
    const role = this.getRole();
    const perms = {
      // admin can do everything
      admin: ['all'],
      stock: ['view_central_stock', 'receive_goods', 'transfer', 'consign', 'order_request', 'view_products'],
      cashier: ['view_central_stock', 'billing', 'order_to_central', 'tax_invoice', 'view_products'],
    };
    const userPerms = perms[role] || [];
    return userPerms.includes('all') || userPerms.includes(action);
  },
};

// ── Login form handler ───────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  const spinner = btn.querySelector('.btn-spinner');
  const text = btn.querySelector('.btn-text');

  errEl.classList.add('hidden');
  btn.disabled = true;
  spinner.classList.remove('hidden');
  text.classList.add('hidden');

  try {
    const res = await API.login(username, password);
    AUTH.setSession(res.token, res.user);
    await APP.onLoginSuccess(res.user);
  } catch (err) {
    errEl.textContent = err.message || 'เข้าสู่ระบบไม่สำเร็จ';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
    text.classList.remove('hidden');
  }
});

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '<span class="material-icons">visibility_off</span>';
  } else {
    input.type = 'password';
    btn.innerHTML = '<span class="material-icons">visibility</span>';
  }
}

function logout() {
  AUTH.clearSession();
  closeUserMenu();
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('login-form').reset();
  UI.toast('ออกจากระบบเรียบร้อย', 'info');
}
