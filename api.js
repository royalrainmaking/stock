// ============================================================
// api.js – All Google Apps Script API calls
// ============================================================

const API = {
  _call(action, params = {}) {
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', AUTH.getToken());
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v);
    });
    return fetch(url.toString())
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        return data;
      });
  },

  _post(action, body = {}) {
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', AUTH.getToken());
    return fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        return data;
      });
  },

  // ── Auth ──────────────────────────────
  login(username, password) {
    return this._call('login', { username, password });
  },
  changePassword(oldPw, newPw) {
    return this._post('changePassword', { oldPw, newPw });
  },

  // ── Users ─────────────────────────────
  getUsers() { return this._call('getUsers'); },
  createUser(data) { return this._post('createUser', data); },
  updateUser(data) { return this._post('updateUser', data); },
  deleteUser(userId) { return this._post('deleteUser', { userId }); },

  // ── Products ──────────────────────────
  getProducts() { return this._call('getProducts'); },
  createProduct(data) { return this._post('createProduct', data); },
  updateProduct(data) { return this._post('updateProduct', data); },
  deleteProduct(productId) { return this._post('deleteProduct', { productId }); },

  // ── Warehouses ────────────────────────
  getWarehouses() { return this._call('getWarehouses'); },
  createWarehouse(data) { return this._post('createWarehouse', data); },
  updateWarehouse(data) { return this._post('updateWarehouse', data); },
  deleteWarehouse(warehouseId) { return this._post('deleteWarehouse', { warehouseId }); },

  // ── Stock Operations ──────────────────
  getCentralStock(warehouseId) { return this._call('getCentralStock', { warehouseId }); },
  getEmployeeStock(employeeId) { return this._call('getEmployeeStock', { employeeId }); },
  getAllEmployeeStocks(date) { return this._call('getAllEmployeeStocks', { date }); },

  receiveGoods(data) { return this._post('receiveGoods', data); },
  transferToEmployee(data) { return this._post('transferToEmployee', data); },
  consignFromEmployee(data) { return this._post('consignFromEmployee', data); },
  adjustStock(data) { return this._post('adjustStock', data); },
  orderRequest(data) { return this._post('orderRequest', data); },

  // ── Billing ───────────────────────────
  getBillingList(date) { return this._call('getBillingList', { date }); },
  doBilling(data) { return this._post('doBilling', data); },
  getBillingDetail(billingId) { return this._call('getBillingDetail', { billingId }); },
  generateTaxInvoice(billingId) { return this._call('generateTaxInvoice', { billingId }); },

  // ── Reports ───────────────────────────
  getDashboard(period, year, month, day) { return this._call('getDashboard', { period, year, month, day }); },
  getSalesReport(startDate, endDate, warehouseId) { return this._call('getSalesReport', { startDate, endDate, warehouseId }); },
  getLogs(startDate, endDate, userId, action, page) { return this._call('getLogs', { startDate, endDate, userId, action, page }); },
  getOrders() { return this._call('getOrders'); },
};

// ── Demo/local mode when GAS not configured ──────────────────
const DEMO_DATA = {
  users: [
    { id: 'U001', username: 'admin', displayName: 'ผู้ดูแลระบบ', role: ROLES.ADMIN, email: 'admin@test.com', active: true },
    { id: 'U002', username: 'stock01', displayName: 'สต็อก อรุณ', role: ROLES.STOCK, email: 'stock@test.com', active: true },
    { id: 'U003', username: 'cashier01', displayName: 'แคชเชียร์ สมศรี', role: ROLES.CASHIER, email: 'cash@test.com', active: true },
    { id: 'U004', username: 'emp01', displayName: 'นาย ก. ทดสอบ', role: ROLES.STOCK, email: 'emp@test.com', active: true, isEmployee: true },
    { id: 'U005', username: 'emp02', displayName: 'นางสาว ข. ทดสอบ', role: ROLES.STOCK, email: 'emp2@test.com', active: true, isEmployee: true },
  ],
  products: [
    { id: 'P001', code: 'P10400', name: '100ml DR-1 M&M', category: '100ml', unit: 'ขวด', unitsPerCase: 64, costNoVat: 270.00, costVat: 289.00, empNoVat: 297.60, empVat: 318.43, fridgeNoVat: 310.00, fridgeVat: 331.70, sellPrice: 350.00, imageUrl: '' },
    { id: 'P002', code: 'P11100', name: '150ml ผลไม้รวม', category: '150ml', unit: 'ขวด', unitsPerCase: 24, costNoVat: 260.00, costVat: 278.20, empNoVat: 297.43, empVat: 318.25, fridgeNoVat: 320.00, fridgeVat: 342.40, sellPrice: 380.00, imageUrl: '' },
    { id: 'P003', code: 'P11501', name: '150ml ดีไลท์ น้ำตาลน้อย', category: '150ml', unit: 'ขวด', unitsPerCase: 24, costNoVat: 260.00, costVat: 278.20, empNoVat: 295.00, empVat: 315.65, fridgeNoVat: 318.00, fridgeVat: 340.26, sellPrice: 380.00, imageUrl: '' },
    { id: 'P004', code: 'P12100', name: '400ml บูลเบอร์รี่', category: '400ml', unit: 'ขวด', unitsPerCase: 12, costNoVat: 420.00, costVat: 449.40, empNoVat: 480.00, empVat: 513.60, fridgeNoVat: 510.00, fridgeVat: 545.70, sellPrice: 550.00, imageUrl: '' },
    { id: 'P005', code: 'P20100', name: '80g วุ้นมะพร้าว', category: '80g', unit: 'ถุง', unitsPerCase: 50, costNoVat: 100.00, costVat: 107.00, empNoVat: 115.00, empVat: 123.05, fridgeNoVat: 125.00, fridgeVat: 133.75, sellPrice: 140.00, imageUrl: '' },
  ],
  warehouses: [
    { id: 'W001', name: 'คลัง 1 (สาขา 00001)', type: 'central', location: 'DMP', active: true },
    { id: 'W002', name: 'คลัง 2 (สาขา 00002)', type: 'central', location: 'DMP', active: true },
    { id: 'EW001', name: 'คลังพนักงาน – นาย ก. ทดสอบ', type: 'employee', employeeId: 'U004', location: 'DMP', active: true },
    { id: 'EW002', name: 'คลังพนักงาน – นางสาว ข. ทดสอบ', type: 'employee', employeeId: 'U005', location: 'DMP', active: true },
  ],
  centralStock: [
    { productId: 'P001', warehouseId: 'W001', qty: 150, unit: 'ขวด' },
    { productId: 'P002', warehouseId: 'W001', qty: 80, unit: 'ขวด' },
    { productId: 'P003', warehouseId: 'W001', qty: 60, unit: 'ขวด' },
    { productId: 'P004', warehouseId: 'W001', qty: 24, unit: 'ขวด' },
    { productId: 'P005', warehouseId: 'W001', qty: 200, unit: 'ถุง' },
    { productId: 'P001', warehouseId: 'W002', qty: 96, unit: 'ขวด' },
    { productId: 'P002', warehouseId: 'W002', qty: 48, unit: 'ขวด' },
  ],
  employeeStock: [
    { productId: 'P001', warehouseId: 'EW001', qty: 20, consigned: 0, unit: 'ขวด' },
    { productId: 'P002', warehouseId: 'EW001', qty: 14, consigned: 0, unit: 'ขวด' },
    { productId: 'P005', warehouseId: 'EW001', qty: 45, consigned: 0, unit: 'ถุง' },
    { productId: 'P002', warehouseId: 'EW002', qty: 10, consigned: 2, unit: 'ขวด' },
    { productId: 'P004', warehouseId: 'EW002', qty: 7, consigned: 0, unit: 'ขวด' },
  ],
  transactions: [],
  billing: [],
  logs: [],
};

// Local demo API when DEMO_MODE is enabled or GAS_URL is placeholder
const IS_DEMO = CONFIG.DEMO_MODE || CONFIG.GAS_URL.includes('YOUR_SCRIPT_ID');

if (IS_DEMO) {
  console.info('🎮 Running in DEMO mode. Login: admin / cashier01 / stock01 with password "1234"');
  // Patch API to use demo data
  API.login = (username, password) => {
    const user = DEMO_DATA.users.find(u => u.username === username);
    if (!user) return Promise.reject(new Error('ไม่พบชื่อผู้ใช้'));
    if (password !== '1234') return Promise.reject(new Error('รหัสผ่านไม่ถูกต้อง'));
    return Promise.resolve({ token: 'demo-token-' + user.id, user });
  };
  API.getUsers = () => Promise.resolve({ users: DEMO_DATA.users });
  API.getProducts = () => Promise.resolve({ products: DEMO_DATA.products });
  API.getWarehouses = () => Promise.resolve({ warehouses: DEMO_DATA.warehouses });
  API.getCentralStock = (wid) => Promise.resolve({
    stock: DEMO_DATA.centralStock.filter(s => !wid || s.warehouseId === wid).map(s => ({
      ...s,
      product: DEMO_DATA.products.find(p => p.id === s.productId) || {},
      warehouse: DEMO_DATA.warehouses.find(w => w.id === s.warehouseId) || {},
    }))
  });
  API.getEmployeeStock = (eid) => Promise.resolve({
    stock: DEMO_DATA.employeeStock.filter(s => {
      const wh = DEMO_DATA.warehouses.find(w => w.id === s.warehouseId);
      return !eid || (wh && wh.employeeId === eid);
    }).map(s => ({
      ...s,
      product: DEMO_DATA.products.find(p => p.id === s.productId) || {},
      warehouse: DEMO_DATA.warehouses.find(w => w.id === s.warehouseId) || {},
    }))
  });
  API.getAllEmployeeStocks = () => Promise.resolve({
    warehouses: DEMO_DATA.warehouses.filter(w => w.type === 'employee').map(wh => ({
      warehouse: wh,
      employee: DEMO_DATA.users.find(u => u.id === wh.employeeId),
      stock: DEMO_DATA.employeeStock.filter(s => s.warehouseId === wh.id).map(s => ({
        ...s,
        product: DEMO_DATA.products.find(p => p.id === s.productId) || {},
      })),
      billed: false,
    }))
  });
  API.getDashboard = () => Promise.resolve({
    totalSalesToday: 18540,
    totalUnitsToday: 87,
    activeEmployees: 2,
    lowStockCount: 1,
    topProducts: [
      { name: '100ml DR-1 M&M', units: 32, revenue: 11200 },
      { name: '150ml ผลไม้รวม', units: 24, revenue: 9120 },
      { name: '80g วุ้นมะพร้าว', units: 31, revenue: 4340 },
    ],
    salesByDay: [
      { label: 'จ', value: 15200 }, { label: 'อ', value: 22400 }, { label: 'พ', value: 18900 },
      { label: 'พฤ', value: 27100 }, { label: 'ศ', value: 31500 }, { label: 'ส', value: 12800 }, { label: 'อา', value: 18540 },
    ],
    salesByMonth: Array.from({length: 12}, (_, i) => ({
      label: ['ม.ค','ก.พ','มี.ค','เม.ย','พ.ค','มิ.ย','ก.ค','ส.ค','ก.ย','ต.ค','พ.ย','ธ.ค'][i],
      value: Math.floor(Math.random() * 600000 + 200000)
    })),
    forecastNextDays: [
      { date: getDateStr(1), forecast: 21000 },
      { date: getDateStr(2), forecast: 23500 },
      { date: getDateStr(3), forecast: 19800 },
    ],
  });
  API.getBillingList = (date) => Promise.resolve({
    billings: DEMO_DATA.warehouses.filter(w => w.type === 'employee').map(wh => ({
      warehouseId: wh.id, warehouseName: wh.name,
      employee: DEMO_DATA.users.find(u => u.id === wh.employeeId),
      date, billed: false, billedAt: null, totalAmt: 0, totalUnits: 0,
    }))
  });
  API.getSalesReport = () => Promise.resolve({
    rows: [
      { date: todayStr(), product: '100ml DR-1 M&M', units: 32, revenue: 11200, warehouseName: 'คลังพนักงาน – นาย ก.' },
      { date: todayStr(), product: '150ml ผลไม้รวม', units: 24, revenue: 9120, warehouseName: 'คลังพนักงาน – นาย ก.' },
      { date: todayStr(), product: '80g วุ้นมะพร้าว', units: 31, revenue: 4340, warehouseName: 'คลังพนักงาน – นางสาว ข.' },
    ]
  });
  API.getLogs = () => Promise.resolve({
    logs: [
      { ts: new Date().toISOString(), user: 'admin', action: 'login', detail: 'เข้าสู่ระบบ' },
      { ts: new Date().toISOString(), user: 'stock01', action: 'transfer', detail: 'เบิก 100ml DR-1 M&M x20 → คลังพนักงาน นาย ก.' },
      { ts: new Date().toISOString(), user: 'cashier01', action: 'billing', detail: 'คิดเงิน นาย ก. วันนี้' },
    ],
    total: 3
  });
  API.receiveGoods = (data) => {
    data.items.forEach(item => {
      const existing = DEMO_DATA.centralStock.find(s => s.productId === item.productId && s.warehouseId === data.warehouseId);
      if (existing) existing.qty += item.qty;
      else DEMO_DATA.centralStock.push({ productId: item.productId, warehouseId: data.warehouseId, qty: item.qty, unit: item.unit });
    });
    return Promise.resolve({ success: true });
  };
  API.transferToEmployee = (data) => {
    data.items.forEach(item => {
      const cs = DEMO_DATA.centralStock.find(s => s.productId === item.productId && s.warehouseId === data.fromWarehouseId);
      if (cs) cs.qty = Math.max(0, cs.qty - item.qty);
      const es = DEMO_DATA.employeeStock.find(s => s.productId === item.productId && s.warehouseId === data.toWarehouseId);
      if (es) es.qty += item.qty;
      else DEMO_DATA.employeeStock.push({ productId: item.productId, warehouseId: data.toWarehouseId, qty: item.qty, consigned: 0, unit: item.unit });
    });
    return Promise.resolve({ success: true });
  };
  API.consignFromEmployee = (data) => {
    data.items.forEach(item => {
      const es = DEMO_DATA.employeeStock.find(s => s.productId === item.productId && s.warehouseId === data.fromWarehouseId);
      if (es) es.consigned += item.qty;
    });
    return Promise.resolve({ success: true });
  };
  API.doBilling = (data) => {
    return Promise.resolve({ success: true, billingId: 'B' + Date.now(), totalAmt: data.totalAmt || 0 });
  };
  API.createUser = (data) => {
    const user = { id: 'U' + Date.now(), ...data, active: true };
    DEMO_DATA.users.push(user);
    return Promise.resolve({ success: true, user });
  };
  API.updateUser = (data) => {
    const idx = DEMO_DATA.users.findIndex(u => u.id === data.id);
    if (idx >= 0) DEMO_DATA.users[idx] = { ...DEMO_DATA.users[idx], ...data };
    return Promise.resolve({ success: true });
  };
  API.deleteUser = (userId) => {
    DEMO_DATA.users = DEMO_DATA.users.filter(u => u.id !== userId);
    return Promise.resolve({ success: true });
  };
  API.createProduct = (data) => {
    const product = { id: 'P' + Date.now(), ...data };
    DEMO_DATA.products.push(product);
    return Promise.resolve({ success: true, product });
  };
  API.updateProduct = (data) => {
    const idx = DEMO_DATA.products.findIndex(p => p.id === data.id);
    if (idx >= 0) DEMO_DATA.products[idx] = { ...DEMO_DATA.products[idx], ...data };
    return Promise.resolve({ success: true });
  };
  API.deleteProduct = (productId) => {
    DEMO_DATA.products = DEMO_DATA.products.filter(p => p.id !== productId);
    return Promise.resolve({ success: true });
  };
  API.createWarehouse = (data) => {
    const wh = { id: 'W' + Date.now(), ...data, active: true };
    DEMO_DATA.warehouses.push(wh);
    return Promise.resolve({ success: true, warehouse: wh });
  };
  API.updateWarehouse = (data) => {
    const idx = DEMO_DATA.warehouses.findIndex(w => w.id === data.id);
    if (idx >= 0) DEMO_DATA.warehouses[idx] = { ...DEMO_DATA.warehouses[idx], ...data };
    return Promise.resolve({ success: true });
  };
  API.deleteWarehouse = (wid) => {
    DEMO_DATA.warehouses = DEMO_DATA.warehouses.filter(w => w.id !== wid);
    return Promise.resolve({ success: true });
  };
  API.changePassword = (op, np) => Promise.resolve({ success: true });
  API.orderRequest = (data) => Promise.resolve({ success: true });
  API.getOrders = () => Promise.resolve({ orders: [] });
  API.generateTaxInvoice = (bid) => Promise.resolve({ invoiceNumber: 'INV-' + Date.now(), items: [] });
}

// Helpers
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
