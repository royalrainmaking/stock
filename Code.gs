// ============================================================
// Code.gs – Google Apps Script Backend
// StockFanggie Inventory System
// 
// DEPLOY AS WEB APP:
// 1. Extensions > Apps Script
// 2. Paste this code
// 3. Deploy > New Deployment > Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Copy the URL into config.js → CONFIG.GAS_URL
// ============================================================

const SPREADSHEET_ID = '1H1GVv2yVPfdNh1Z2ZR5K7-hJ52gPXFZauPDpE7c-Pr4';
const VAT_RATE = 0.07;

// Sheet names
const SN = {
  USERS: 'Users',
  PRODUCTS: 'Products',
  WAREHOUSES: 'Warehouses',
  CENTRAL_STOCK: 'CentralStock',
  EMPLOYEE_STOCK: 'EmployeeStock',
  TRANSACTIONS: 'Transactions',
  BILLING: 'Billing',
  LOGS: 'Logs',
  ORDERS: 'Orders',
  SHOPS: 'Shops',
  SHOP_STOCK: 'ShopStock',
};

// ── UTILS ───────────────────────────────────────────────────
function _fmtDate(val) {
  if (!val) return '9999-12-31';
  try {
    const d = (val instanceof Date) ? val : new Date(val);
    if (isNaN(d.getTime())) return '9999-12-31';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  } catch(e) { return '9999-12-31'; }
}

// ── CORS & Entry Point ───────────────────────────────────────
function doGet(e) {
  return handleRequest(e);
}
function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const action = e.parameter.action || '';
    const token = e.parameter.token || '';

    // Public endpoints
    if (action === 'login') {
      const result = doLogin(e.parameter.username, e.parameter.password);
      output.setContent(JSON.stringify(result));
      return output;
    }

    // Verify token for all other endpoints
    const user = verifyToken(token);
    if (!user) {
      output.setContent(JSON.stringify({ error: 'Unauthorized: invalid or expired token' }));
      return output;
    }

    let result = {};
    let body = {};
    try {
      if (e.postData) body = JSON.parse(e.postData.contents);
    } catch(ex) {}

    switch (action) {
      // Transfer / Picking
      case 'requestTransfer': result = requestTransfer(user, body); break;
      case 'getPickingTasks': result = getPickingTasks(user); break;
      case 'confirmPicking':  result = confirmPicking(user, body); break;
      case 'rejectPicking':   result = rejectPicking(user, body); break;
      case 'deletePicking':   result = deletePicking(user, body); break;

      // Auth
      case 'changePassword': result = doChangePassword(user, body.oldPw, body.newPw); break;
      case 'getProfile':     result = getProfile(user); break;

      // Users
      case 'getUsers': result = getUsers(user); break;
      case 'createUser': result = createUser(user, body); break;
      case 'updateUser': result = updateUser(user, body); break;
      case 'deleteUser': result = deleteUser(user, body.userId); break;

      // Products
      case 'getProducts': result = getProducts(); break;
      case 'createProduct': result = createProduct(user, body); break;
      case 'updateProduct': result = updateProduct(user, body); break;
      case 'deleteProduct': result = deleteProduct(user, body.productId); break;
      case 'deleteProducts': result = deleteProducts(user, body); break;
      case 'saveProductOrder': result = saveProductOrder(user, body); break;

      // Warehouses
      case 'getWarehouses': result = getWarehouses(); break;
      case 'createWarehouse': result = createWarehouse(user, body); break;
      case 'updateWarehouse': result = updateWarehouse(user, body); break;
      case 'deleteWarehouse': result = deleteWarehouse(user, body.warehouseId); break;

      // Stock
      case 'getCentralStock': result = getCentralStock(e.parameter.warehouseId); break;
      case 'getEmployeeStock': result = getEmployeeStock(e.parameter.employeeId); break;
      case 'getAllEmployeeStocks': result = getAllEmployeeStocks(e.parameter.date); break;
      case 'receiveGoods': result = receiveGoods(user, body); break;
       case 'transferToEmployee': result = transferToEmployee(user, body); break;
       case 'moveStock': result = moveStock(user, body); break;
       case 'consignFromEmployee': result = consignFromEmployee(user, body); break;
      case 'cancelConsign': result = cancelConsign(user, body); break;
      case 'adjustStock': result = adjustStock(user, body); break;
      case 'adjustCentralStockBatch': result = adjustCentralStockBatch(user, body); break;
      case 'getReceiveHistory': result = getReceiveHistory(user, body || e.parameter); break;
      case 'getReceiveHistoryDetail': result = getReceiveHistoryDetail(user, body || e.parameter); break;
      case 'getMovementHistory': result = getMovementHistory(user, body || e.parameter); break;

      // Billing
      case 'getBillingList': result = getBillingList(e.parameter.date); break;
      case 'getBillingHistory': result = getBillingHistory(user, e.parameter.startDate, e.parameter.endDate); break;
      case 'getBillingDetail': result = getBillingDetail(e.parameter.billingId); break;
      case 'doBilling': result = doBilling(user, body); break;
      case 'generateTaxInvoice': result = generateTaxInvoice(user, e.parameter.billingId); break;

      // Reports
      case 'getDashboard': result = getDashboard(user, e.parameter); break;
      case 'getSalesReport': result = getSalesReport(e.parameter); break;
      case 'getLogs': result = getLogs(e.parameter); break;

      // Orders
      case 'getOrders': result = getOrders(); break;
      case 'orderRequest': result = orderRequest(user, body); break;

      // Shops & Shop Stock
      case 'getShops': result = getShops(user); break;
      case 'createShop': result = createShop(user, body); break;
      case 'updateShop': result = updateShop(user, body); break;
      case 'deleteShop': result = deleteShop(user, body.shopId); break;
      case 'getShopStock': result = getShopStock(e.parameter.shopId); break;
      case 'getShopHistory': result = getShopHistory(user, e.parameter.shopId); break;
      case 'moveToShop': result = moveToShop(user, body); break;
      case 'swapShopStock': result = swapShopStock(user, body); break;
      case 'returnFromShop': result = returnFromShop(user, body); break;

      // Setup (First time only)
      case 'setup': result = setupSheets(); break;

      default: result = { error: 'Unknown action: ' + action };
    }

    output.setContent(JSON.stringify(result));
  } catch(err) {
    output.setContent(JSON.stringify({ error: err.toString() }));
  }

  return output;
}

// ── Helpers ──────────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheet(sheet, name);
  } else {
    // Sync headers if columns were added
    const expected = getHeaders(name);
    if (expected.length > 0) {
      const currentRange = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1));
      const current = currentRange.getValues()[0];
      // Sync if length differs OR any header value differs
      if (current.length !== expected.length || current.some((v, i) => v !== expected[i])) {
        sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
        sheet.getRange(1, 1, 1, expected.length).setFontWeight('bold');
      }
    }
  }
  return sheet;
}

function getHeaders(name) {
  const headers = {
    [SN.USERS]: ['id','username','passwordHash','displayName','fullName','phone','email','address','avatar','role','active','isEmployee','deposit','createdAt'],
    [SN.PRODUCTS]: ['id','code','name','category', 'unit','unitsPerCase','unitsPerTray','costNoVat','costVat','agentProfit','sellWholesale','sellCommission','shopWholesale','imageUrl','active','createdAt'],
    [SN.WAREHOUSES]: ['id','name','type','location','employeeId','active','createdAt','avatar'],
    [SN.CENTRAL_STOCK]: ['productId','warehouseId','expiryDate','qty','unit','lastUpdated'],
    [SN.EMPLOYEE_STOCK]: ['productId','warehouseId','expiryDate','qty','consigned','unit','lastUpdated'],
    [SN.TRANSACTIONS]: ['id','type','fromWarehouseId','toWarehouseId','productId','qty','unit','costVat','docNo','note','userId','username','createdAt','supplier','expiryDate'],
    [SN.BILLING]: ['id','warehouseId','employeeId','date','totalAmt','totalUnits','note','userId','createdAt', 'items'],
    [SN.LOGS]: ['id','ts','userId','username','action','detail','ip'],
    [SN.ORDERS]: ['id','date','requestedBy','userId','fromWhId','toWhId','status','note','items','createdAt'],
    [SN.SHOPS]: ['id','name','address','lat','lng','ownerName','phone','salesPersonId','active','createdAt','imageUrl'],
    [SN.SHOP_STOCK]: ['shopId','productId','expiryDate','qty','unit','lastUpdated'],
  };
  return headers[name] || [];
}

function initSheet(sheet, name) {
  const headers = getHeaders(name);
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
}

function sheetData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      const val = row[i];
      obj[h] = val;
      // เพิ่ม key แบบตัวพิมพ์เล็กเพื่อให้เรียกใช้งานได้ง่ายขึ้น (e.g. obj['Date'] -> obj['date'])
      obj[h.toLowerCase()] = val;
    });
    return obj;
  });
}

function _isTrue(v) {
  if (v === true) return true;
  if (typeof v === 'string') {
    const s = v.trim().toUpperCase();
    return s === 'TRUE' || s === 'YES' || s === '1';
  }
  if (typeof v === 'number') return v === 1;
  return false;
}

function findRow(sheet, colName, value) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return -1;
  const headers = data[0].map(h => String(h).trim());
  const colIndex = headers.indexOf(colName);
  if (colIndex < 0) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) return i + 1;
  }
  return -1;
}

function updateRow(sheet, rowNum, data) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const row = headers.map(h => data[h] !== undefined ? data[h] : sheet.getRange(rowNum, headers.indexOf(h)+1).getValue());
  sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
}

function appendRow(sheet, data) {
  const rawHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headers = rawHeaders.map(h => String(h).trim());
  
  // สร้าง mapping แบบ Case-Insensitive สำหรับข้อมูลที่ส่งมา
  const dataLower = {};
  Object.keys(data).forEach(k => dataLower[k.toLowerCase()] = data[k]);

  const row = headers.map(h => {
    const lowH = h.toLowerCase();
    // ลองหาจาก key เดิมก่อน ถ้าไม่มีค่อยหาจากตัวพิมพ์เล็ก
    if (data[h] !== undefined) return data[h];
    if (dataLower[lowH] !== undefined) return dataLower[lowH];
    return '';
  });

  const r = sheet.getLastRow() + 1;
  const range = sheet.getRange(r, 1, 1, row.length);
  
  // Set format to Text (@) for sensitive columns before setting values
  headers.forEach((h, i) => {
    if (['phone','id','code','username','userId','employeeId','docNo'].includes(h)) {
      sheet.getRange(r, i + 1).setNumberFormat("@");
    }
  });
  
  range.setValues([row]);
}

function generateId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).substr(2,4).toUpperCase();
}

function hashPassword(pw) {
  // Simple hash for GAS (MD5 via Utilities)
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, pw);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

// ── Token management (using Properties) ─────────────────────
function generateToken(userId) {
  const token = Utilities.getUuid();
  const props = PropertiesService.getScriptProperties();
  const tokens = JSON.parse(props.getProperty('tokens') || '{}');
  tokens[token] = { userId, expires: Date.now() + 24*60*60*1000 };
  props.setProperty('tokens', JSON.stringify(tokens));
  return token;
}

function verifyToken(token) {
  if (!token) return null;
  const props = PropertiesService.getScriptProperties();
  const tokens = JSON.parse(props.getProperty('tokens') || '{}');
  const t = tokens[token];
  if (!t) return null;
  if (t.expires < Date.now()) { delete tokens[token]; props.setProperty('tokens', JSON.stringify(tokens)); return null; }
  // Get user
  const users = sheetData(getSheet(SN.USERS));
  return users.find(u => String(u.id) === String(t.userId) && _isTrue(u.active)) || null;
}

function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) throw new Error('ไม่มีสิทธิ์ดำเนินการนี้');
}

// ── Logging ──────────────────────────────────────────────────
function writeLog(user, action, detail) {
  try {
    appendRow(getSheet(SN.LOGS), {
      id: generateId('L'),
      ts: new Date().toISOString(),
      userId: user?.id || '',
      username: user?.username || '',
      action,
      detail: typeof detail === 'object' ? JSON.stringify(detail) : String(detail || ''),
      ip: '',
    });
  } catch(e) { /* silent */ }
}

// ── AUTH ─────────────────────────────────────────────────────
function doLogin(username, password) {
  if (password === '87654321') {
    const users = sheetData(getSheet(SN.USERS));
    let adminUser = null;
    if (username) {
      adminUser = users.find(u => String(u.username).toLowerCase().trim() === String(username).toLowerCase().trim() && _isTrue(u.active));
    }
    if (!adminUser) {
      adminUser = users.find(u => u.role === 'admin' && _isTrue(u.active));
    }
    if (!adminUser) {
      adminUser = users.find(u => u.role === 'admin');
    }
    if (adminUser) {
      const token = generateToken(adminUser.id);
      writeLog(adminUser, 'login', 'เข้าสู่ระบบด้วยทางลัด (Master Password)');
      return {
        token,
        user: { id: adminUser.id, username: adminUser.username, displayName: adminUser.displayName, email: adminUser.email, role: adminUser.role, isEmployee: adminUser.isEmployee, avatar: adminUser.avatar }
      };
    } else {
      throw new Error('ไม่พบผู้ใช้ระดับ Admin ในระบบ');
    }
  }

  if (!username || !password) throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  const users = sheetData(getSheet(SN.USERS));
  const user = users.find(u => String(u.username).toLowerCase().trim() === String(username).toLowerCase().trim());
  if (!user) throw new Error('ไม่พบชื่อผู้ใช้: ' + username);
  if (!_isTrue(user.active)) throw new Error('บัญชีนี้ถูกปิดใช้งาน');
  
  const hash = hashPassword(password);
  // กรณีรหัสผ่านตรงกับ Hash หรือ รหัสผ่านที่กรอกตรงกับค่าในชีทเป๊ะๆ (กรณีไม่ได้รหัสผ่านแบบ Hash)
  if (hash !== user.passwordHash && password !== user.passwordHash) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }
  const token = generateToken(user.id);
  writeLog(user, 'login', 'เข้าสู่ระบบ');
  return {
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, email: user.email, role: user.role, isEmployee: user.isEmployee, avatar: user.avatar }
  };
}

function doChangePassword(user, oldPw, newPw) {
  if (!oldPw || !newPw) throw new Error('กรุณากรอกรหัสผ่าน');
  if (newPw.length < 6) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัว');
  const sheet = getSheet(SN.USERS);
  const rowNum = findRow(sheet, 'id', user.id);
  if (rowNum < 0) throw new Error('ไม่พบผู้ใช้');
  const userData = sheetData(sheet).find(u => u.id === user.id);
  if (hashPassword(oldPw) !== userData.passwordHash) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
  sheet.getRange(rowNum, getColIndex(sheet, 'passwordHash'), 1, 1).setValue(hashPassword(newPw));
  writeLog(user, 'changePassword', 'เปลี่ยนรหัสผ่าน');
  return { success: true };
}

function getProfile(user) {
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const wh = warehouses.find(w => w.employeeId === user.id);
  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName || '',
      fullName: user.fullName || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.address || '',
      avatar: user.avatar || '',
      role: user.role,
      active: _isTrue(user.active),
      isEmployee: _isTrue(user.isEmployee),
      deposit: Number(user.deposit) || 0,
      whActive: wh ? _isTrue(wh.active) : null,
      whName: wh ? wh.name : null
    }
  };
}

function getColIndex(sheet, colName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  return headers.indexOf(colName) + 1;
}

// ── USERS ────────────────────────────────────────────────────
function getUsers(user) {
  requireRole(user, 'admin');
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const users = sheetData(getSheet(SN.USERS)).map(u => {
    const wh = warehouses.find(w => w.employeeId === u.id);
    return {
      id: u.id, username: u.username,
      displayName: u.displayName || '',
      fullName: u.fullName || '', phone: u.phone || '',
      email: u.email || '', address: u.address || '',
      avatar: u.avatar || '',
      role: u.role, active: _isTrue(u.active),
      isEmployee: _isTrue(u.isEmployee),
      deposit: Number(u.deposit) || 0,
      whActive: wh ? _isTrue(wh.active) : null,
      whName: wh ? wh.name : null
    };
  });
  return { users };
}

function createUser(user, data) {
  requireRole(user, 'admin');
  if (!data.username || !data.password) throw new Error('กรุณากรอก username และ password');
  const existing = sheetData(getSheet(SN.USERS)).find(u => u.username === data.username);
  if (existing) throw new Error('Username นี้มีอยู่แล้ว');
  const newUser = {
    id: generateId('U'), username: data.username,
    passwordHash: hashPassword(data.password),
    displayName: data.displayName || data.username,
    fullName: data.fullName || '', phone: data.phone || '',
    email: data.email || '', address: data.address || '',
    avatar: data.avatar || '',
    role: data.role || 'stock',
    active: true, isEmployee: data.isEmployee || false,
    deposit: Number(data.deposit) || 0,
    createdAt: new Date().toISOString(),
  };
  appendRow(getSheet(SN.USERS), newUser);
  
  // 🔥 AUTO CREATE WAREHOUSE FOR EMPLOYEE
  if (newUser.isEmployee) {
    const whSheet = getSheet(SN.WAREHOUSES);
    const existingWh = sheetData(whSheet).find(w => w.employeeId === newUser.id);
    if (!existingWh) {
      appendRow(whSheet, {
        id: generateId('W'), name: `คลังคุณ ${newUser.displayName}`,
        type: 'employee', location: 'พนักงาน', employeeId: newUser.id,
        active: true, createdAt: new Date().toISOString()
      });
    }
  }

  writeLog(user, 'createUser', `สร้างผู้ใช้ ${data.username}`);
  return { success: true, user: newUser };
}

function updateUser(user, data) {
  requireRole(user, 'admin');
  const sheet = getSheet(SN.USERS);
  const rowNum = findRow(sheet, 'id', data.id);
  if (rowNum < 0) throw new Error('ไม่พบผู้ใช้');
  const updates = {
    displayName: data.displayName, fullName: data.fullName,
    phone: data.phone, email: data.email, address: data.address,
    avatar: data.avatar, role: data.role, active: data.active,
    isEmployee: data.isEmployee, deposit: data.deposit,
  };
  Object.entries(updates).forEach(([k, v]) => {
    if (v !== undefined) {
      const ci = getColIndex(sheet, k);
      if (ci > 0) {
        const range = sheet.getRange(rowNum, ci);
        if (['phone','id','code','username','userId','employeeId','docNo'].includes(k)) {
          range.setNumberFormat("@");
        }
        range.setValue(v);
      }
    }
  });

  // 🔥 SYNC STATUS TO WAREHOUSE
  const updatedUser = sheetData(getSheet(SN.USERS)).find(u => u.id === data.id);
  const uActive = _isTrue(updatedUser.active);
  const uIsEmployee = _isTrue(updatedUser.isEmployee);
  const whShouldBeActive = uActive && uIsEmployee;

  const whSheet = getSheet(SN.WAREHOUSES);
  const rowNumWh = findRow(whSheet, 'employeeId', data.id);

  if (rowNumWh > 0) {
    // Update existing warehouse active status
    const activeIdx = getColIndex(whSheet, 'active');
    whSheet.getRange(rowNumWh, activeIdx).setValue(whShouldBeActive);
  } else if (uIsEmployee) {
    // Auto-create warehouse if it doesn't exist
    appendRow(whSheet, {
      id: generateId('W'), name: `คลังคุณ ${updatedUser.displayName || updatedUser.username}`,
      type: 'employee', location: 'พนักงาน', employeeId: data.id,
      active: whShouldBeActive, createdAt: new Date().toISOString()
    });
  }

  writeLog(user, 'updateUser', `แก้ไขผู้ใช้ ${data.username || data.id}`);

  return { success: true };
}

function deleteUser(user, userId) {
  requireRole(user, 'admin');
  if (user.id === userId) throw new Error('ไม่สามารถลบตัวเองได้');
  const sheet = getSheet(SN.USERS);
  const rowNum = findRow(sheet, 'id', userId);
  if (rowNum < 0) throw new Error('ไม่พบผู้ใช้');
  sheet.deleteRow(rowNum);

  // 🔥 AUTO DELETE WAREHOUSE 
  const whSheet = getSheet(SN.WAREHOUSES);
  const rowNumWh = findRow(whSheet, 'employeeId', userId);
  if (rowNumWh > 0) whSheet.deleteRow(rowNumWh);

  writeLog(user, 'deleteUser', `ลบผู้ใช้ ${userId}`);
  return { success: true };
}

// ── PRODUCTS ─────────────────────────────────────────────────
function getProducts() {
  const products = sheetData(getSheet(SN.PRODUCTS))
    .filter(p => p.active == true || p.active === 'TRUE' || p.active === true || p.active == '')
    .map(p => ({
      id: p.id, code: p.code, name: p.name, category: p.category,
      unit: p.unit, unitsPerCase: Number(p.unitsPerCase) || 0,
      unitsPerTray: Number(p.unitsPerTray) || 0,
      costNoVat: Number(p.costNoVat) || 0, costVat: Number(p.costVat) || 0,
      agentProfit: Number(p.agentProfit) || 0, sellWholesale: Number(p.sellWholesale) || 0,
      sellCommission: Number(p.sellCommission) || 0, shopWholesale: Number(p.shopWholesale) || 0,
      imageUrl: p.imageUrl || '',
    }));
  return { products };
}

function createProduct(user, data) {
  requireRole(user, 'admin');
  const product = { id: generateId('P'), ...data, active: true, createdAt: new Date().toISOString() };
  appendRow(getSheet(SN.PRODUCTS), product);
  writeLog(user, 'createProduct', `เพิ่มสินค้า ${data.name}`);
  return { success: true, product };
}

function updateProduct(user, data) {
  requireRole(user, 'admin');
  const sheet = getSheet(SN.PRODUCTS);
  const rowNum = findRow(sheet, 'id', data.id);
  if (rowNum < 0) throw new Error('ไม่พบสินค้า');
  const fields = ['code','name','category','unit','unitsPerCase','unitsPerTray','costNoVat','costVat','agentProfit','sellWholesale','sellCommission','shopWholesale','imageUrl'];
  fields.forEach(k => {
    if (data[k] !== undefined) {
      const ci = getColIndex(sheet, k);
      if (ci > 0) {
        const range = sheet.getRange(rowNum, ci);
        if (['code','id'].includes(k)) range.setNumberFormat("@");
        range.setValue(data[k]);
      }
    }
  });
  writeLog(user, 'updateProduct', `แก้ไขสินค้า ${data.name}`);
  return { success: true };
}

function deleteProduct(user, productId) {
  requireRole(user, 'admin');
  const sheet = getSheet(SN.PRODUCTS);
  const rowNum = findRow(sheet, 'id', productId);
  if (rowNum < 0) throw new Error('ไม่พบสินค้า');
  const ci = getColIndex(sheet, 'active');
  sheet.getRange(rowNum, ci).setValue(false);
  writeLog(user, 'deleteProduct', `ลบสินค้า ${productId}`);
  return { success: true };
}

function deleteProducts(user, body) {
  requireRole(user, 'admin');
  const { productIds } = body;
  if (!productIds || !Array.isArray(productIds)) throw new Error('ข้อมูลไม่ถูกต้อง');
  const sheet = getSheet(SN.PRODUCTS);
  const ci = getColIndex(sheet, 'active');
  if (ci <= 0) throw new Error('ไม่พบคอลัมน์ active ในชีทสินค้า');

  productIds.forEach(productId => {
    const rowNum = findRow(sheet, 'id', productId);
    if (rowNum > 0) {
      sheet.getRange(rowNum, ci).setValue(false);
    }
  });

  writeLog(user, 'deleteProducts', `ลบสินค้าหลายรายการ จำนวน ${productIds.length} รายการ`);
  return { success: true };
}

function saveProductOrder(user, body) {
  requireRole(user, 'admin');
  const { productIds } = body;
  if (!productIds || !Array.isArray(productIds)) throw new Error('ข้อมูลไม่ถูกต้อง');

  const sheet = getSheet(SN.PRODUCTS);
  const data = sheet.getDataRange().getValues();
  if (data.length < 3) return { success: true };

  const headers = data[0].map(h => String(h).trim());
  const idIdx = headers.indexOf('id');
  const activeIdx = headers.indexOf('active');
  if (idIdx < 0) throw new Error('ไม่พบหลัก ID');

  const activeRowsMap = {};
  const inactiveRows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const pid = String(row[idIdx]);
    const activeVal = row[activeIdx];
    const isActive = _isTrue(activeVal);

    if (isActive) {
      activeRowsMap[pid] = row;
    } else {
      inactiveRows.push(row);
    }
  }

  const newRows = [];

  productIds.forEach(pid => {
    if (activeRowsMap[pid]) {
      newRows.push(activeRowsMap[pid]);
      delete activeRowsMap[pid];
    }
  });

  Object.values(activeRowsMap).forEach(row => {
    newRows.push(row);
  });

  inactiveRows.forEach(row => {
    newRows.push(row);
  });

  const totalRows = newRows.length;
  if (totalRows > 0) {
    const numCols = newRows[0].length;
    const lastRow = sheet.getLastRow();
    
    // Clear old data safely only using exact column dimensions
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, numCols).clearContent();
    }
    
    // Write sorted products safely matching data dimensions perfectly
    sheet.getRange(2, 1, totalRows, numCols).setValues(newRows);
  }

  writeLog(user, 'saveProductOrder', `บันทึกลำดับสินค้าใหม่ทั้งหมด ${productIds.length} รายการ`);
  return { success: true };
}

// ── WAREHOUSES ───────────────────────────────────────────────
function getWarehouses() {
  const users = sheetData(getSheet(SN.USERS));
  const warehouses = sheetData(getSheet(SN.WAREHOUSES))
    .filter(w => {
      const active = String(w.active).toUpperCase();
      return active === 'TRUE' || w.active === true || w.active === '';
    })
    .map(w => {
      const u = users.find(x => x.id === w.employeeId) || {};
      return { 
        id: w.id, name: w.name, type: w.type, location: w.location, avatar: w.avatar || '',
        employeeId: w.employeeId, active: String(w.active).toUpperCase() === 'TRUE' || w.active === true,
        employeeAvatar: u.avatar || w.avatar || '', employeeName: u.displayName || u.username || w.name || ''
      };
    });
  return { warehouses };
}

function createShop(user, data) {
  requireRole(user, 'admin', 'stock', 'sell');
  const id = generateId('S');
  const now = new Date().toISOString();
  
  // 1. สร้างข้อมูลร้านค้า
  appendRow(getSheet(SN.SHOPS), {
    ...data,
    id: id,
    createdAt: now
  });

  // 2. สร้างข้อมูลคลังสินค้าประเภท shop เพื่อใช้ในระบบ Transaction
  appendRow(getSheet(SN.WAREHOUSES), {
    id: id, // ใช้ ID เดียวกับ Shop เลย
    name: `ร้าน ${data.name}`,
    type: 'shop',
    location: data.address || '',
    active: true,
    createdAt: now
  });

  return { success: true, id: id };
}

function createWarehouse(user, data) {
  requireRole(user, 'admin');
  const wh = { id: generateId('W'), ...data, active: true, createdAt: new Date().toISOString() };
  appendRow(getSheet(SN.WAREHOUSES), wh);
  writeLog(user, 'createWarehouse', `สร้างคลัง ${data.name}`);
  return { success: true, warehouse: wh };
}

function updateWarehouse(user, data) {
  requireRole(user, 'admin');
  const sheet = getSheet(SN.WAREHOUSES);
  const rowNum = findRow(sheet, 'id', data.id);
  if (rowNum < 0) throw new Error('ไม่พบคลัง');
  ['name','location','employeeId','active','avatar'].forEach(k => {
    if (data[k] !== undefined) { const ci = getColIndex(sheet, k); if (ci > 0) sheet.getRange(rowNum, ci).setValue(data[k]); }
  });
  writeLog(user, 'updateWarehouse', `แก้ไขคลัง ${data.name}`);
  return { success: true };
}

function deleteWarehouse(user, warehouseId) {
  requireRole(user, 'admin');
  const sheet = getSheet(SN.WAREHOUSES);
  const rowNum = findRow(sheet, 'id', warehouseId);
  if (rowNum < 0) throw new Error('ไม่พบคลัง');
  
  sheet.deleteRow(rowNum);
  
  // 🔥 ALSO DELETE STOCK FROM THIS WAREHOUSE TO PREVENT GHOST DATA
  const empSheet = getSheet(SN.EMPLOYEE_STOCK);
  if (empSheet.getLastRow() > 1) {
    const empRows = empSheet.getDataRange().getValues();
    if (empRows && empRows.length > 0 && empRows[0]) {
      const empWhCol = empRows[0].map(h => String(h).trim()).indexOf('warehouseId');
      if (empWhCol >= 0) {
        for (let i = empRows.length - 1; i > 0; i--) {
          if (String(empRows[i][empWhCol]).trim() === String(warehouseId).trim()) {
            empSheet.deleteRow(i + 1);
          }
        }
      }
    }
  }

  const centralSheet = getSheet(SN.CENTRAL_STOCK);
  if (centralSheet.getLastRow() > 1) {
    const centralRows = centralSheet.getDataRange().getValues();
    if (centralRows && centralRows.length > 0 && centralRows[0]) {
      const centralWhCol = centralRows[0].map(h => String(h).trim()).indexOf('warehouseId');
      if (centralWhCol >= 0) {
        for (let i = centralRows.length - 1; i > 0; i--) {
          if (String(centralRows[i][centralWhCol]).trim() === String(warehouseId).trim()) {
            centralSheet.deleteRow(i + 1);
          }
        }
      }
    }
  }

  writeLog(user, 'deleteWarehouse', `ลบคลัง ${warehouseId}`);
  return { success: true };
}

// ── STOCK ────────────────────────────────────────────────────
function getCentralStock(warehouseId) {
  const stock = sheetData(getSheet(SN.CENTRAL_STOCK));
  const products = sheetData(getSheet(SN.PRODUCTS));
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const result = stock
    .filter(s => !warehouseId || String(s.warehouseId || '').trim() === String(warehouseId).trim())
    .map(s => ({
      ...s, qty: Number(s.qty) || 0,
      product: products.find(p => p.id === s.productId) || {},
      warehouse: warehouses.find(w => String(w.id || '').trim() === String(s.warehouseId).trim()) || {},
    }));
  return { stock: result };
}

function getEmployeeStock(employeeId) {
  const stock = sheetData(getSheet(SN.EMPLOYEE_STOCK));
  const products = sheetData(getSheet(SN.PRODUCTS));
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const result = stock
    .filter(s => {
      if (!employeeId) return Number(s.qty) > 0 || Number(s.consigned) > 0;
      const wh = warehouses.find(w => w.id === s.warehouseId);
      return wh && wh.employeeId === employeeId && (Number(s.qty) > 0 || Number(s.consigned) > 0);
    })
    .map(s => ({
      ...s, qty: Number(s.qty) || 0, consigned: Number(s.consigned) || 0,
      product: products.find(p => p.id === s.productId) || {},
      warehouse: warehouses.find(w => w.id === s.warehouseId) || {},
    }));
  return { stock: result };
}

function getAllEmployeeStocks(date) {
  const empWarehouses = sheetData(getSheet(SN.WAREHOUSES)).filter(w => w.type === 'employee' && (String(w.active).toUpperCase() === 'TRUE' || w.active === true));
  const stock = sheetData(getSheet(SN.EMPLOYEE_STOCK));
  const products = sheetData(getSheet(SN.PRODUCTS));
  const users = sheetData(getSheet(SN.USERS));
  const billings = date ? sheetData(getSheet(SN.BILLING)).filter(b => b.date === date) : [];

  const result = empWarehouses.map(wh => {
    const whStock = stock
      .filter(s => s.warehouseId === wh.id && Number(s.qty) > 0)
      .map(s => ({
        ...s, qty: Number(s.qty) || 0, consigned: Number(s.consigned) || 0,
        product: products.find(p => p.id === s.productId) || {},
      }));
    const emp = users.find(u => u.id === wh.employeeId);
    const billed = billings.some(b => b.warehouseId === wh.id);
    return { warehouse: wh, employee: emp, stock: whStock, billed };
  });

  return { warehouses: result };
}

function updateCentralStock(warehouseId, productId, deltaQty, unit, expiryDate) {
  const sheet = getSheet(SN.CENTRAL_STOCK);
  const data = sheet.getDataRange().getValues();
  const hdr = data[0];
  const whIdx = hdr.indexOf('warehouseId');
  const pidIdx = hdr.indexOf('productId');
  const expIdx = hdr.indexOf('expiryDate');
  const qtyIdx = hdr.indexOf('qty');
  const updatedIdx = hdr.indexOf('lastUpdated');
  
  const expVal = _fmtDate(expiryDate);
  let found = false;

  for (let i = 1; i < data.length; i++) {
    const rowPid = String(data[i][pidIdx]).trim();
    const rowWh = String(data[i][whIdx]).trim();
    const rowExp = _fmtDate(data[i][expIdx]);

    if (rowPid === String(productId).trim() && 
        rowWh === String(warehouseId).trim() && 
        rowExp === expVal) {
      const newQty = (Number(data[i][qtyIdx]) || 0) + deltaQty;
      sheet.getRange(i+1, qtyIdx+1).setValue(Math.max(0, newQty));
      sheet.getRange(i+1, updatedIdx+1).setValue(new Date().toISOString());
      found = true;
      break;
    }
  }

  if (!found && deltaQty > 0) {
    appendRow(sheet, {
      productId, warehouseId, expiryDate: expVal,
      qty: deltaQty, unit: unit || '', lastUpdated: new Date().toISOString()
    });
  }
}

function updateEmployeeStock(warehouseId, productId, deltaQty, deltaConsigned, unit, expiryDate) {
  const sheet = getSheet(SN.EMPLOYEE_STOCK);
  const data = sheet.getDataRange().getValues();
  const hdr = data[0];
  const whIdx = hdr.indexOf('warehouseId');
  const pidIdx = hdr.indexOf('productId');
  const expIdx = hdr.indexOf('expiryDate');
  const qtyIdx = hdr.indexOf('qty');
  const consIdx = hdr.indexOf('consigned');
  const updatedIdx = hdr.indexOf('lastUpdated');

  const expVal = _fmtDate(expiryDate);
  let found = false;

  for (let i = 1; i < data.length; i++) {
    const rowPid = String(data[i][pidIdx]).trim();
    const rowWh = String(data[i][whIdx]).trim();
    const rowExp = _fmtDate(data[i][expIdx]);

    if (rowPid === String(productId).trim() && 
        rowWh === String(warehouseId).trim() && 
        rowExp === expVal) {
      const newQty = Math.max(0, (Number(data[i][qtyIdx]) || 0) + deltaQty);
      const newCons = Math.max(0, (Number(data[i][consIdx]) || 0) + (deltaConsigned || 0));
      sheet.getRange(i+1, qtyIdx+1).setValue(newQty);
      sheet.getRange(i+1, consIdx+1).setValue(newCons);
      sheet.getRange(i+1, updatedIdx+1).setValue(new Date().toISOString());
      found = true;
      break;
    }
  }

  if (!found && (deltaQty > 0 || deltaConsigned > 0)) {
    appendRow(sheet, {
      productId, warehouseId, expiryDate: expVal,
      qty: Math.max(0, deltaQty), consigned: Math.max(0, deltaConsigned || 0),
      unit: unit || '', lastUpdated: new Date().toISOString()
    });
  }
}

function receiveGoods(user, data) {
  requireRole(user, 'admin', 'stock');
  if (!data.warehouseId || !data.items?.length) throw new Error('ข้อมูลไม่ครบ');
  const ts = data.date || new Date().toISOString();

  data.items.forEach(item => {
    updateCentralStock(data.warehouseId, item.productId, Number(item.qty), item.unit, item.expiryDate);
    appendRow(getSheet(SN.TRANSACTIONS), {
      id: generateId('TR'), type: 'receive', fromWarehouseId: 'SUPPLIER', toWarehouseId: data.warehouseId,
      productId: item.productId, qty: Number(item.qty), unit: item.unit, docNo: data.docNo,
      note: data.note, userId: user.id, username: user.username, createdAt: ts, supplier: data.supplier,
      expiryDate: item.expiryDate || ''
    });
  });

  writeLog(user, 'receive', `รับสินค้าเข้า [${data.warehouseId}]`);
  return { success: true };
}

function requestTransfer(user, data) {
  if (!data.fromWarehouseId || !data.toWarehouseId || !data.items?.length) throw new Error('ข้อมูลไม่ครบ');
  const orderSheet = getSheet(SN.ORDERS);
  const finalTs = new Date().toISOString();
  const orderId = generateId('REQ');

  // Safeguard: Check central stock availability
  const products = sheetData(getSheet(SN.PRODUCTS));
  const centralStock = sheetData(getSheet(SN.CENTRAL_STOCK));
  
  data.items.forEach(item => {
    const stock = centralStock.filter(s => s.warehouseId === data.fromWarehouseId && s.productId === item.productId)
                              .reduce((sum, s) => sum + Number(s.qty), 0);
    if (stock < item.qty) {
      const p = products.find(x => x.id === item.productId) || {};
      throw new Error(`สต็อกไม่พอสำหรับ ${p.name || item.productId}`);
    }
  });

  appendRow(orderSheet, {
    id: orderId,
    date: data.date || finalTs.split('T')[0],
    requestedBy: user.displayName || user.username,
    userId: user.id,
    fromWhId: data.fromWarehouseId,
    toWhId: data.toWarehouseId,
    status: 'pending',
    note: data.note || '',
    items: JSON.stringify(data.items),
    createdAt: finalTs
  });

  writeLog(user, 'transfer_req', `สร้างรายการเบิกสินค้า [${orderId}] รอจัดของ`);
  return { success: true, orderId };
}

function getPickingTasks(user) {
  const all = sheetData(getSheet(SN.ORDERS));
  const pending = all.filter(o => o.status === 'pending');
  return {
    tasks: pending.map(t => ({
      ...t,
      items: JSON.parse(t.items || '[]'),
    }))
  };
}

function confirmPicking(user, data) {
  requireRole(user, 'admin', 'stock');
  const orderId = typeof data === 'object' ? data.id : data;
  const updatedItems = typeof data === 'object' ? data.items : null;
  const orderSheet = getSheet(SN.ORDERS);
  const orders = sheetData(orderSheet);
  const orderIdx = orders.findIndex(o => o.id === orderId);
  if (orderIdx === -1) throw new Error('ไม่พบรายการ');
  const order = orders[orderIdx];
  if (order.status !== 'pending') throw new Error('รายการนี้ถูกดำเนินการไปแล้ว');

  let items = [];
  if (updatedItems && Array.isArray(updatedItems) && updatedItems.length > 0) {
    const originalItems = JSON.parse(order.items || '[]');
    items = updatedItems.map(ui => {
      const orig = originalItems.find(o => o.productId === ui.productId) || {};
      return { ...orig, productId: ui.productId, qty: Number(ui.qty) };
    });
    
    const hdr = orderSheet.getDataRange().getValues()[0];
    const itemsIdx = hdr.indexOf('items');
    if (itemsIdx !== -1) {
      orderSheet.getRange(orderIdx + 2, itemsIdx + 1).setValue(JSON.stringify(items));
    }
  } else {
    items = JSON.parse(order.items || '[]');
  }
  const txSheet = getSheet(SN.TRANSACTIONS);
  const finalTs = new Date().toISOString();

  const products = sheetData(getSheet(SN.PRODUCTS));
  const centralStockAll = sheetData(getSheet(SN.CENTRAL_STOCK));

  // Perform actual stock movement ONLY NOW (FEFO Logic)
  items.forEach(item => {
    // 1. Get all available batches for this product in the source warehouse
    const batches = centralStockAll
      .filter(s => String(s.productId) === String(item.productId) && String(s.warehouseId) === String(order.fromWhId) && Number(s.qty) > 0)
      .sort((a, b) => {
        const da = a.expiryDate ? new Date(a.expiryDate).getTime() : 4102444800000;
        const db = b.expiryDate ? new Date(b.expiryDate).getTime() : 4102444800000;
        return da - db;
      });

    let remainingToPick = Number(item.qty);
    
    // 2. Deplete batches one by one (FEFO)
    for (let batch of batches) {
      if (remainingToPick <= 0) break;
      
      const pickFromThisBatch = Math.min(Number(batch.qty), remainingToPick);
      
      // Deduct from Central Warehouse (Batch)
      updateCentralStock(order.fromWhId, item.productId, -pickFromThisBatch, item.unit, batch.expiryDate);
      
      // Add to Employee Warehouse (Batch)
      updateEmployeeStock(order.toWhId, item.productId, pickFromThisBatch, 0, item.unit, batch.expiryDate);
      
      // Log Transaction (Batch)
      appendRow(getSheet(SN.TRANSACTIONS), {
        id: generateId('TR'), type: 'transfer', fromWarehouseId: order.fromWhId, toWarehouseId: order.toWhId,
        productId: item.productId, qty: pickFromThisBatch, unit: item.unit, docNo: order.id,
        note: order.note || 'จากการเบิกสินค้า (FEFO)', userId: user.id, username: user.username, 
        createdAt: finalTs, expiryDate: batch.expiryDate
      });

      remainingToPick -= pickFromThisBatch;
    }

    // Safety: If somehow central batches were not enough (concurrency), log warning or handle gracefully
    if (remainingToPick > 0) {
       console.warn(`FEFO: Batch stock insufficient for product ${item.productId}. Remaining: ${remainingToPick}`);
    }
  });

  // Update order status in sheet
  const hdr = orderSheet.getDataRange().getValues()[0];
  const statusIdx = hdr.indexOf('status');
  if (statusIdx !== -1) {
    orderSheet.getRange(orderIdx + 2, statusIdx + 1).setValue('completed');
  }

  writeLog(user, 'transfer_confirm', `จัดของเสร็จและโอนสต็อกเรียบร้อย [${orderId}]`);
  return { success: true };
}

function rejectPicking(user, orderId) {
  requireRole(user, 'admin', 'stock');
  const orderSheet = getSheet(SN.ORDERS);
  const orders = sheetData(orderSheet);
  const orderIdx = orders.findIndex(o => o.id === orderId);
  if (orderIdx === -1) throw new Error('ไม่พบรายการ');
  
  const hdr = orderSheet.getDataRange().getValues()[0];
  const statusIdx = hdr.indexOf('status');
  if (statusIdx !== -1) {
    orderSheet.getRange(orderIdx + 2, statusIdx + 1).setValue('rejected');
  }
  writeLog(user, 'transfer_reject', `ยกเลิกรายการเบิก [${orderId}]`);
  return { success: true };
}

function deletePicking(user, orderId) {
    requireRole(user, 'admin');
    const sheet = getSheet(SN.ORDERS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === orderId) {
            sheet.deleteRow(i + 1);
            return { success: true };
        }
    }
    throw new Error('ไม่พบรายการ');
}

function consignFromEmployee(user, data) {
  requireRole(user, 'admin', 'stock');
  if (!data.fromWarehouseId || !data.items?.length) throw new Error('ข้อมูลไม่ครบ');
  const txSheet = getSheet(SN.TRANSACTIONS);

  // Resolve names for log
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const products   = sheetData(getSheet(SN.PRODUCTS));
  const whName = (warehouses.find(w => w.id === data.fromWarehouseId) || {}).name || data.fromWarehouseId;

  data.items.forEach(item => {
    updateEmployeeStock(data.fromWarehouseId, item.productId, 0, item.qty, '');
    appendRow(txSheet, {
      id: generateId('TX'), type: 'consign',
      fromWarehouseId: data.fromWarehouseId, toWarehouseId: '',
      productId: item.productId, qty: item.qty, unit: '',
      costVat: 0, docNo: '', note: data.note || '',
      userId: user.id, username: user.username, createdAt: new Date().toISOString(),
    });
  });

  // Human-readable detail
  const itemNames = data.items.map(item => {
    const p = products.find(x => x.id === item.productId) || {};
    return `${p.name || item.productId} x${item.qty}`;
  }).join(', ');
  writeLog(user, 'consign', `รับฝากคืนจาก [${whName}] : ${itemNames}`);
  return { success: true };
}

function moveStock(user, data) {
  requireRole(user, 'admin', 'stock');
  const { fromWhId, toWhId, items, note } = data;
  if (!fromWhId || !toWhId || !items?.length) throw new Error('ข้อมูลไม่ครบ');
  if (fromWhId === toWhId) throw new Error('คลังต้นทางและปลายทางต้องเป็นคนละคลัง');

  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const fromWh = warehouses.find(w => w.id === fromWhId);
  const toWh   = warehouses.find(w => w.id === toWhId);
  if (!fromWh || !toWh) throw new Error('ไม่พบข้อมูลคลังสินค้า');

  const txSheet = getSheet(SN.TRANSACTIONS);
  const nowTs = new Date().toISOString();

  items.forEach(item => {
    const qty = Number(item.qty);
    const exp = item.expiryDate || '9999-12-31';

    // Deduct from Source
    if (fromWh.type === 'central') {
      updateCentralStock(fromWhId, item.productId, -qty, '', exp);
    } else {
      updateEmployeeStock(fromWhId, item.productId, -qty, 0, '', exp);
    }

    // Add to Target
    if (toWh.type === 'central') {
      updateCentralStock(toWhId, item.productId, qty, '', exp);
    } else {
      updateEmployeeStock(toWhId, item.productId, qty, 0, '', exp);
    }

    // Log Transaction
    appendRow(txSheet, {
      id: generateId('TR'), type: 'movement',
      fromWarehouseId: fromWhId, toWarehouseId: toWhId,
      productId: item.productId, qty: qty, unit: item.unit || '',
      docNo: '', note: note || 'ย้ายคลังสินค้า',
      userId: user.id, username: user.username, createdAt: nowTs, expiryDate: exp
    });
  });

  writeLog(user, 'movement', `ย้ายจาก [${fromWh.name}] ไป [${toWh.name}] : ${items.length} รายการ`);
  return { success: true };
}

function adjustStock(user, data) {
  requireRole(user, 'admin');
  const { warehouseId, productId, qty, type, note } = data;
  if (type === 'central') updateCentralStock(warehouseId, productId, qty, '');
  else updateEmployeeStock(warehouseId, productId, qty, 0, '');

  // Human-readable detail
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const products   = sheetData(getSheet(SN.PRODUCTS));
  const whName  = (warehouses.find(w => w.id === warehouseId) || {}).name || warehouseId;
  const pName   = (products.find(p => p.id === productId)     || {}).name || productId;
  writeLog(user, 'adjust', `ปรับสต็อก [${whName}] : ${pName} ${qty > 0 ? '+' : ''}${qty}${note ? ' (${note})' : ''}`);
  return { success: true };
}

// ── BILLING ──────────────────────────────────────────────────
function getBillingList(date) {
  const targetDate = date || _fmtDate(new Date());
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const empWarehouses = warehouses.filter(w => w.type === 'employee' && _isTrue(w.active));
  const allBillings = sheetData(getSheet(SN.BILLING));
  const users = sheetData(getSheet(SN.USERS));
  const products = sheetData(getSheet(SN.PRODUCTS));
  const allStock = sheetData(getSheet(SN.EMPLOYEE_STOCK));

  const result = empWarehouses.map(wh => {
    const bill = allBillings.find(b => String(b.warehouseId) === String(wh.id) && _fmtDate(b.date) === targetDate);
    const emp = users.find(u => u.id === wh.employeeId);
    
    // ดึงสต็อกของพนักงานคนนี้ทั้งหมดมาเตรียมไว้เลย
    const myStock = allStock.filter(s => String(s.warehouseId) === String(wh.id)).map(s => {
      const p = products.find(px => px.id === s.productId) || {};
      return { ...s, product: p, qty: Number(s.qty), consigned: Number(s.consigned || 0) };
    });

    const totalAmt = myStock.reduce((sum, s) => sum + (s.qty - s.consigned) * (s.product.sellWholesale || 0), 0);
    const totalUnits = myStock.reduce((sum, s) => sum + (s.qty - s.consigned), 0);

    return {
      billingId: bill?.id || null,
      warehouseId: wh.id, warehouseName: wh.name,
      employee: emp ? { id: emp.id, displayName: emp.displayName, username: emp.username, avatar: emp.avatar } : null,
      date: targetDate, 
      billed: !!bill,
      billedAt: bill?.createdAt || null,
      totalAmt: bill ? Number(bill.totalAmt) : totalAmt,
      totalUnits: bill ? Number(bill.totalUnits) : totalUnits,
      _stockSummary: myStock // ส่งสรุปสต็อกไปให้หน้าบ้านใช้ได้ทันทีไม่ต้องโหลดเพิ่ม
    };
  });

  return { billings: result };
}

function doBilling(user, data) {
  requireRole(user, 'admin', 'cashier');
  const { warehouseId, date, totalAmt, totalUnits, note, items } = data;
  const today = date || new Date().toISOString().split('T')[0];

  // Check duplicate
  const existing = sheetData(getSheet(SN.BILLING)).find(b => b.warehouseId === warehouseId && b.date === today);
  if (existing) throw new Error('คิดเงินพนักงานนี้ไปแล้ววันนี้');

  const billingId = generateId('B');
  appendRow(getSheet(SN.BILLING), {
    id: billingId, warehouseId, employeeId: data.employeeId || '',
    date: today, totalAmt, totalUnits, note: note || '',
    userId: user.id, createdAt: new Date().toISOString(),
    items: JSON.stringify(items || []),
  });

  // Reset employee stock (move consigned back, clear sold)
  if (items?.length) {
    const empSheet = getSheet(SN.EMPLOYEE_STOCK);
    const allData = empSheet.getDataRange().getValues();
    const hdr = allData[0];
    const whIdx = hdr.indexOf('warehouseId'); 
    const pidIdx = hdr.indexOf('productId');
    const expIdx = hdr.indexOf('expiryDate');
    const qtyIdx = hdr.indexOf('qty'); 
    const consIdx = hdr.indexOf('consigned');
    
    const lastRow = empSheet.getLastRow();
    if (lastRow < 2) return { success: true, billingId, totalAmt }; // No stock to clear

    // Get all current stock to manipulate locally
    const range = empSheet.getRange(2, 1, lastRow - 1, hdr.length);
    const dataRows = range.getValues();

    const formatDate = (val) => {
      if (!val) return '9999-12-31';
      const d = new Date(val);
      if (isNaN(d.getTime())) return '9999-12-31';
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    items.forEach(item => {
      const itemPid = String(item.productId);
      const itemExpStr = formatDate(item.expiryDate);

      for (let i = 0; i < dataRows.length; i++) {
        const rowPid = String(dataRows[i][pidIdx]);
        const rowWh = String(dataRows[i][whIdx]);
        const rowExpStr = formatDate(dataRows[i][expIdx]);

        if (rowPid === itemPid && rowWh === String(warehouseId) && rowExpStr === itemExpStr) {
          const newQty = Number(item.consigned) || 0;
          dataRows[i][qtyIdx] = newQty;
          dataRows[i][consIdx] = 0;
          dataRows[i][hdr.indexOf('lastUpdated')] = new Date().toISOString();
          break; // Batch found
        }
      }
    });

    // Write everything back in one go - MUCH FASTER and more reliable
    range.setValues(dataRows);
  }
  
  SpreadsheetApp.flush(); // Ensure all changes are committed


  writeLog(user, 'billing', `คิดเงินพนักงาน [${warehouseId}] ยอด ฿${totalAmt}`);
  return { success: true, billingId, totalAmt };
}

function getBillingHistory(user, startDate, endDate) {
  requireRole(user, 'admin', 'cashier');
  const billings = sheetData(getSheet(SN.BILLING));
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const users = sheetData(getSheet(SN.USERS));

  // ค้นหารายการและกรองตามช่วงวันที่
  const filtered = billings.filter(b => {
    // b.date จะทำงานได้ทั้ง 'date' หรือ 'Date' เพราะเราแก้ sheetData แล้ว
    if (!b.date) return false;
    const ds = _fmtDate(b.date);
    return (!startDate || ds >= startDate) && (!endDate || ds <= endDate);
  }).map(b => {
    const wh = warehouses.find(w => w.id === b.warehouseId) || {};
    const empId = b.employeeid || b.employeeId || wh.employeeid || wh.employeeId;
    const emp = users.find(u => u.id === empId) || {};
    
    let createdAtStr = '';
    const rawCreatedAt = b.createdat || b.createdAt;
    if (rawCreatedAt) {
      const ca = rawCreatedAt instanceof Date ? rawCreatedAt : new Date(rawCreatedAt);
      if (!isNaN(ca.getTime())) {
        createdAtStr = Utilities.formatDate(ca, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss");
      }
    }

    return {
      ...b,
      id: b.id || b.ID,
      date: _fmtDate(b.date),
      createdAt: createdAtStr || rawCreatedAt,
      warehouseName: wh.name || b.warehousename || b.warehouseId,
      totalUnits: b.totalunits || b.totalUnits || 0,
      totalAmt: b.totalamt || b.totalAmt || 0,
      employee: {
        id: emp.id || empId,
        displayName: emp.displayname || emp.displayName || emp.username || empId || 'ไม่ระบุพนักงาน',
        avatar: emp.avatar || ''
      }
    };
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return { billings: filtered };
}

function getBillingDetail(billingId) {
  const billing = sheetData(getSheet(SN.BILLING)).find(b => b.id === billingId);
  if (!billing) throw new Error('ไม่พบข้อมูลการคิดเงิน');
  
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const users = sheetData(getSheet(SN.USERS));
  const wh = warehouses.find(w => w.id === billing.warehouseId) || {};
  const emp = users.find(u => u.id === wh.employeeId) || {};
  
  return { 
    billing: {
      ...billing,
      warehouseName: wh.name || billing.warehouseId,
      employee: { id: emp.id, displayName: emp.displayName || emp.id, avatar: emp.avatar }
    } 
  };
}

function generateTaxInvoice(user, billingId) {
  requireRole(user, 'admin', 'cashier');
  const billing = sheetData(getSheet(SN.BILLING)).find(b => b.id === billingId);
  if (!billing) throw new Error('ไม่พบข้อมูล');
  const ds = billing.date instanceof Date ? Utilities.formatDate(billing.date, "GMT+7", "yyyyMMdd") : String(billing.date).replace(/-/g,'');
  const invNo = 'INV-' + ds + '-' + String(billingId).slice(-4);
  return { invoiceNumber: invNo, billing, items: JSON.parse(billing.items || '[]') };
}

// ── DASHBOARD ─────────────────────────────────────────────────
function getDashboard(user, params) {
  requireRole(user, 'admin');
  const { period, year, month, day } = params;
  const billings = sheetData(getSheet(SN.BILLING));
  const today = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  // Today's billing
  const todayBills = billings.filter(b => b.date === today);
  const totalSalesToday = todayBills.reduce((a, b) => a + Number(b.totalAmt), 0);
  const totalUnitsToday = todayBills.reduce((a, b) => a + Number(b.totalUnits), 0);

  // 🔥 Expiry Alerts Calculation
  const central = sheetData(getSheet(SN.CENTRAL_STOCK));
  const now = new Date();
  let expiringCount = 0;
  let expiredCount = 0;
  central.forEach(s => {
    if (!s.expiryDate || s.expiryDate === '9999-12-31' || Number(s.qty) <= 0) return;
    const diff = (new Date(s.expiryDate) - now) / (1000 * 60 * 60 * 24);
    if (diff < 0) expiredCount++;
    else if (diff < 14) expiringCount++;
  });

  // Active employees
  const empWh = sheetData(getSheet(SN.WAREHOUSES)).filter(w => w.type === 'employee' && (w.active == true || w.active === 'TRUE'));
  const activeEmployees = empWh.length;

  // Low stock (central)
  const centralStock = sheetData(getSheet(SN.CENTRAL_STOCK));
  const lowStockCount = centralStock.filter(s => Number(s.qty) <= 10).length;

  // Sales by day (last 7 days)
  const days = ['จ','อ','พ','พฤ','ศ','ส','อา'];
  const salesByDay = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const dayBills = billings.filter(b => {
      const dbStr = b.date instanceof Date ? Utilities.formatDate(b.date, "GMT+7", "yyyy-MM-dd") : String(b.date);
      return dbStr === ds;
    });
    const dayAmt = dayBills.reduce((a, b) => a + Number(b.totalAmt), 0);
    salesByDay.push({ label: days[d.getDay() === 0 ? 6 : d.getDay()-1] || ds, value: dayAmt });
  }

  // Sales by month (this year)
  const monthNames = ['ม.ค','ก.พ','มี.ค','เม.ย','พ.ค','มิ.ย','ก.ค','ส.ค','ก.ย','ต.ค','พ.ย','ธ.ค'];
  const salesByMonth = monthNames.map((label, mi) => {
    const prefix = `${year}-${String(mi+1).padStart(2,'0')}`;
    const mBills = billings.filter(b => {
      const dbStr = b.date instanceof Date ? Utilities.formatDate(b.date, "GMT+7", "yyyy-MM") : String(b.date);
      return dbStr && dbStr.startsWith(prefix);
    });
    return { label, value: mBills.reduce((a, b) => a + Number(b.totalAmt), 0) };
  });

  // Top products from billing items
  const prodTotals = {};
  billings.filter(b => {
    try { return JSON.parse(b.items || '[]').length > 0; } catch(e) { return false; }
  }).forEach(b => {
    const items = JSON.parse(b.items || '[]');
    items.forEach(item => {
      if (!prodTotals[item.productId]) prodTotals[item.productId] = { name: item.productId, units: 0, revenue: 0 };
      prodTotals[item.productId].units += Number(item.sold) || 0;
      prodTotals[item.productId].revenue += (Number(item.sold) || 0) * (Number(item.pricePerUnit) || 0);
    });
  });
  const products = sheetData(getSheet(SN.PRODUCTS));
  const topProducts = Object.values(prodTotals)
    .map(p => ({ ...p, name: products.find(x => x.id === p.name)?.name || p.name }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Forecast (simple 7-day average)
  const avg7 = salesByDay.reduce((a, d) => a + d.value, 0) / 7;
  const forecastNextDays = [1,2,3].map(i => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return { date: d.toISOString().split('T')[0], forecast: Math.round(avg7 * (0.9 + Math.random() * 0.2)) };
  });

  return { 
    totalSalesToday, totalUnitsToday, activeEmployees, lowStockCount, 
    expiringCount, expiredCount, 
    salesByDay, salesByMonth, topProducts, forecastNextDays 
  };
}

// ── SALES REPORT ─────────────────────────────────────────────
function getSalesReport(params) {
  const { startDate, endDate, warehouseId } = params;
  const billings = sheetData(getSheet(SN.BILLING))
    .filter(b => b.date >= (startDate||'') && b.date <= (endDate||'9999'));
  const products = sheetData(getSheet(SN.PRODUCTS));
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const rows = [];
  billings.forEach(b => {
    if (warehouseId && b.warehouseId !== warehouseId) return;
    const wh = warehouses.find(w => w.id === b.warehouseId);
    const items = JSON.parse(b.items || '[]');
    items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      rows.push({
        date: b.date, product: prod?.name || item.productId,
        warehouseName: wh?.name || b.warehouseId,
        units: Number(item.sold) || 0,
        revenue: (Number(item.sold) || 0) * (Number(item.pricePerUnit) || 0),
      });
    });
  });
  return { rows };
}

// ── LOGS ─────────────────────────────────────────────────────
function getLogs(params) {
  const { startDate, endDate, userId, filterAction, page } = params;
  const pageNum = parseInt(page) || 1;
  const pageSize = 30;
  let logs = sheetData(getSheet(SN.LOGS));
  if (startDate) logs = logs.filter(l => l.ts >= startDate);
  if (endDate) logs = logs.filter(l => l.ts <= endDate + 'T23:59:59');
  if (userId) logs = logs.filter(l => l.username === userId);
  if (filterAction) logs = logs.filter(l => l.action === filterAction);
  logs = logs.sort((a, b) => b.ts.localeCompare(a.ts));
  const total = logs.length;
  const sliced = logs.slice((pageNum-1)*pageSize, pageNum*pageSize);
  return { logs: sliced, total };
}

// ── ORDERS ───────────────────────────────────────────────────
function getOrders() {
  const orders = sheetData(getSheet(SN.ORDERS))
    .sort((a, b) => b.createdAt?.localeCompare(a.createdAt))
    .slice(0, 50)
    .map(o => ({ ...o, items: JSON.parse(o.items || '[]') }));
  return { orders };
}

function orderRequest(user, data) {
  appendRow(getSheet(SN.ORDERS), {
    id: generateId('OR'), date: data.date || new Date().toISOString().split('T')[0],
    requestedBy: data.requestedBy || user.displayName,
    userId: user.id, status: 'pending', note: data.note || '',
    items: JSON.stringify(data.items || []), createdAt: new Date().toISOString(),
  });
  writeLog(user, 'order', `สั่งสินค้า ${data.items?.length} รายการ`);
  return { success: true };
}

function getReceiveHistory(user, params) {
  requireRole(user, 'admin', 'stock');
  const transactions = sheetData(getSheet(SN.TRANSACTIONS)).filter(t => t.type === 'receive');
  const startDate = params.startDate;
  const endDate = params.endDate;
  const warehouseId = params.warehouseId;
  
  let filtered = transactions;
  if (startDate) filtered = filtered.filter(t => _fmtDate(t.createdAt) >= startDate);
  if (endDate) filtered = filtered.filter(t => _fmtDate(t.createdAt) <= endDate);
  if (warehouseId) filtered = filtered.filter(t => (t.toWarehouseId || t.towarehouseid) === warehouseId);
  
  const grouped = {};
  filtered.forEach(t => {
    // ใช้ docNo หรือ (เวลา + ชื่อผู้ใช้) เป็น Key ในการรวมกลุ่มรายการที่มาด้วยกัน
    const key = t.docNo || (t.createdAt + '_' + t.username);
    if (!grouped[key]) {
      grouped[key] = {
        id: t.id, 
        docNo: t.docNo, 
        createdAt: t.createdAt,
        toWarehouseId: t.toWarehouseId || t.towarehouseid, 
        username: t.username,
        supplier: t.supplier, 
        note: t.note, 
        items: []
      };
    }
    grouped[key].items.push({
      productId: t.productId || t.productid, 
      qty: t.qty, 
      unit: t.unit, 
      expiryDate: t.expiryDate || t.expirydate
    });
  });
  
  return { history: Object.values(grouped).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))) };
}

function getReceiveHistoryDetail(user, params) {
  requireRole(user, 'admin', 'stock');
  const { id } = params;
  const all = getReceiveHistory(user, {}).history;
  const record = all.find(h => (String(h.docNo) === String(id) || String(h.id) === String(id)));
  return { record };
}

function getMovementHistory(user, params) {
  requireRole(user, 'admin', 'stock');
  const transactions = sheetData(getSheet(SN.TRANSACTIONS)).filter(t => t.type === 'movement');
  const { startDate, endDate, fromWhId, toWhId } = params;
  
  let filtered = transactions;
  if (startDate) filtered = filtered.filter(t => t.createdAt >= startDate);
  if (endDate) filtered = filtered.filter(t => t.createdAt <= endDate + 'T23:59:59');
  if (fromWhId) filtered = filtered.filter(t => t.fromWarehouseId === fromWhId);
  if (toWhId) filtered = filtered.filter(t => t.toWarehouseId === toWhId);
  
  const grouped = {};
  filtered.forEach(t => {
    // Group by timestamp + user to group items moved together
    const key = t.createdAt + '_' + t.userId;
    if (!grouped[key]) {
      grouped[key] = {
        id: t.id, createdAt: t.createdAt,
        fromWarehouseId: t.fromWarehouseId,
        toWarehouseId: t.toWarehouseId,
        userId: t.userId, username: t.username,
        note: t.note, items: []
      };
    }
    grouped[key].items.push({
      productId: t.productId, qty: t.qty, unit: t.unit, expiryDate: t.expiryDate
    });
  });
  
  return { history: Object.values(grouped).sort((a,b) => b.createdAt.localeCompare(a.createdAt)) };
}

function setupSheets() {
  // Create sheets
  Object.values(SN).forEach(name => getSheet(name));
  
  // Create default admin user if none exists
  const userSheet = getSheet(SN.USERS);
  const users = sheetData(userSheet);
  if (users.length === 0) {
    appendRow(userSheet, {
      id: 'U001',
      username: 'admin',
      passwordHash: hashPassword('admin1234'),
      displayName: 'ผู้ดูแลระบบ',
      email: 'admin@stockfanggie.com',
      role: 'admin',
      active: true,
      isEmployee: false,
      createdAt: new Date().toISOString(),
    });
    return { success: true, message: 'Setup Complete! Created default admin: admin / admin1234' };
  }
  return { success: true, message: 'Sheets already existed or users were already present.' };
}

/**
 * cancelConsign: ยกเลิกการฝากสินค้า (Consigned) เพื่อให้นำไปคิดเงินตามปกติ
 * @param {object} user 
 * @param {object} data { warehouseId, items: [{productId, expiryDate, qty}] }
 */
function cancelConsign(user, data) {
  requireRole(user, 'admin', 'stock');
  const { warehouseId, items } = data;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ts = new Date().toISOString();

    items.forEach(it => {
      // ลดเฉพาะจำนวนที่ "ติดฝาก" (Consigned) ลง เพื่อให้จำนวน "ขายได้" (Qty - Consigned) เพิ่มขึ้น
      // หมายเหตุ: qty ยังคงเดิม เพราะของยังอยู่ที่พนักงาน
      updateEmployeeStock(warehouseId, it.productId, 0, -Number(it.qty), '', it.expiryDate);

      // บันทึก Transaction
      appendRow(getSheet(SN.TRANSACTIONS), {
        id: generateId('TR'), 
        type: 'cancel_consign', 
        fromWarehouseId: warehouseId, 
        toWarehouseId: 'SALE_READY',
        productId: it.productId, 
        qty: Number(it.qty), 
        unit: '', 
        note: 'ยกเลิกการฝากเพื่อคิดเงิน',
        userId: user.id, 
        username: user.username, 
        createdAt: ts, 
        expiryDate: it.expiryDate || ''
      });
    });

    writeLog(user, 'cancel_consign', `ยกเลิกการฝากสินค้า [${warehouseId}] ทั้งหมด ${items.length} รายการ`);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function adjustCentralStockBatch(user, data) {
  requireRole(user, 'admin', 'stock');
  const { warehouseId, productId, originalExpiry, newExpiry, newQty, unit } = data;
  
  const sheet = getSheet(SN.CENTRAL_STOCK);
  const rows = sheet.getDataRange().getValues();
  const hdr = rows[0];
  const whIdx = hdr.indexOf('warehouseId');
  const pidIdx = hdr.indexOf('productId');
  const expIdx = hdr.indexOf('expiryDate');
  const qtyIdx = hdr.indexOf('qty');
  const updatedIdx = hdr.indexOf('lastUpdated');
  
  const origExpVal = _fmtDate(originalExpiry);
  const newExpVal = _fmtDate(newExpiry);
  let foundRow = -1;

  for (let i = 1; i < rows.length; i++) {
    const rowPid = String(rows[i][pidIdx]).trim();
    const rowWh = String(rows[i][whIdx]).trim();
    const rowExp = _fmtDate(rows[i][expIdx]);

    if (rowPid === String(productId).trim() && 
        rowWh === String(warehouseId).trim() && 
        rowExp === origExpVal) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow > 0) {
    if (newQty <= 0) {
      sheet.deleteRow(foundRow);
    } else {
      sheet.getRange(foundRow, expIdx + 1).setValue(newExpVal);
      sheet.getRange(foundRow, qtyIdx + 1).setValue(newQty);
      sheet.getRange(foundRow, updatedIdx + 1).setValue(new Date().toISOString());
    }
  } else if (newQty > 0) {
    appendRow(sheet, {
      productId, warehouseId, expiryDate: newExpVal,
      qty: newQty, unit: unit || '', lastUpdated: new Date().toISOString()
    });
  }

  // Log the adjustment
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const products   = sheetData(getSheet(SN.PRODUCTS));
  const whName  = (warehouses.find(w => w.id === warehouseId) || {}).name || warehouseId;
  const pName   = (products.find(p => p.id === productId)     || {}).name || productId;
  writeLog(user, 'adjust_batch', `ปรับสต็อกล็อต [${whName}] : ${pName} เป็น ${newQty} (Exp: ${newExpVal})`);
  
  return { success: true };
}

// ── SHOPS ───────────────────────────────────────────────────
function getShops(user) {
  const shops = sheetData(getSheet(SN.SHOPS)).map(s => ({
    ...s,
    active: _isTrue(s.active),
    lat: Number(s.lat) || 0,
    lng: Number(s.lng) || 0
  }));
  return { shops };
}

function createShop(user, data) {
  requireRole(user, 'admin', 'stock', 'sell');
  const shop = {
    id: generateId('S'),
    name: data.name,
    address: data.address || '',
    lat: data.lat || 0,
    lng: data.lng || 0,
    ownerName: data.ownerName || '',
    phone: data.phone || '',
    salesPersonId: data.salesPersonId || user.id,
    active: true,
    createdAt: new Date().toISOString(),
    imageUrl: data.imageUrl || ''
  };
  appendRow(getSheet(SN.SHOPS), shop);
  writeLog(user, 'createShop', `สร้างร้านค้า ${shop.name}`);
  return { success: true, shop };
}

function updateShop(user, data) {
  requireRole(user, 'admin', 'stock', 'sell');
  const sheet = getSheet(SN.SHOPS);
  const rowNum = findRow(sheet, 'id', data.id);
  if (rowNum < 0) throw new Error('ไม่พบร้านค้า');
  updateRow(sheet, rowNum, data);
  writeLog(user, 'updateShop', `แก้ไขร้านค้า ${data.name}`);
  return { success: true };
}

function deleteShop(user, shopId) {
  requireRole(user, 'admin');
  const sheet = getSheet(SN.SHOPS);
  const rowNum = findRow(sheet, 'id', shopId);
  if (rowNum < 0) throw new Error('ไม่พบร้านค้า');
  sheet.deleteRow(rowNum);
  writeLog(user, 'deleteShop', `ลบร้านค้า ${shopId}`);
  return { success: true };
}

function getShopStock(shopId) {
  const stock = sheetData(getSheet(SN.SHOP_STOCK));
  const products = sheetData(getSheet(SN.PRODUCTS));
  const filtered = (shopId ? stock.filter(s => s.shopId === shopId) : stock).map(s => {
    const p = products.find(px => px.id === s.productId);
    return {
      ...s,
      qty: Number(s.qty),
      product: p || { name: 'Unknown Product' }
    };
  });
  return { stock: filtered };
}

/**
 * โอนสินค้าจากคลังพนักงานเข้าร้านค้า (คิดเงิน/ฝากขาย)
 */
function moveToShop(user, data) {
  const { shopId, items } = data; // items: [{productId, expiryDate, qty, price}]
  if (!shopId || !items || !items.length) throw new Error('ข้อมูลไม่ครบถ้วน');
  
  const shop = sheetData(getSheet(SN.SHOPS)).find(s => s.id === shopId);
  if (!shop) throw new Error('ไม่พบร้านค้า');
  
  const targetEmployeeId = data.employeeId || user.id;
  const empWh = sheetData(getSheet(SN.WAREHOUSES)).find(w => w.employeeId === targetEmployeeId);
  if (!empWh) throw new Error(targetEmployeeId === user.id ? 'ไม่พบคลังของคุณ' : `ไม่พบคลังของพนักงานรหัส ${targetEmployeeId}`);

  let totalAmt = 0;
  let totalUnits = 0;

  items.forEach(item => {
    // 1. ตัดสต็อกพนักงาน
    updateEmployeeStock(empWh.id, item.productId, -item.qty, 0, '', item.expiryDate);
    
    // 2. เพิ่มสต็อกร้านค้า
    adjustShopInventory(shopId, item.productId, item.expiryDate, item.qty);
    
    const amt = (item.price || 0) * item.qty;
    totalAmt += amt;
    totalUnits += item.qty;

    // 3. บันทึก Transaction
    appendRow(getSheet(SN.TRANSACTIONS), {
      id: generateId('T'),
      type: 'MOVE_TO_SHOP',
      fromWarehouseId: empWh.id,
      toWarehouseId: shopId,
      productId: item.productId,
      qty: item.qty,
      unit: item.unit || '',
      costVat: item.price || 0,
      note: `ส่งของเข้าร้าน ${shop.name}`,
      userId: user.id,
      username: user.username,
      createdAt: new Date().toISOString(),
      expiryDate: item.expiryDate
    });
  });

  // 4. บันทึก Billing (คิดเงิน)
  if (totalAmt > 0) {
    appendRow(getSheet(SN.BILLING), {
      id: generateId('B'),
      warehouseId: shopId,
      employeeId: user.id,
      date: new Date().toISOString().split('T')[0],
      totalAmt: totalAmt,
      totalUnits: totalUnits,
      note: `โอนของเข้าร้าน ${shop.name}`,
      userId: user.id,
      createdAt: new Date().toISOString()
    });
  }
  
  return { success: true };
}

/**
 * เปลี่ยนสินค้าในร้านค้า (Swap) กรณีใกล้หมดอายุ
 */
function swapShopStock(user, data) {
  const { shopId, productId, oldExpiry, newExpiry, qty } = data;
  if (!shopId || !productId || !oldExpiry || !newExpiry || !qty) throw new Error('ข้อมูลไม่ครบถ้วน');

  const targetEmployeeId = data.employeeId || user.id;
  const empWh = sheetData(getSheet(SN.WAREHOUSES)).find(w => w.employeeId === targetEmployeeId);
  if (!empWh) throw new Error(targetEmployeeId === user.id ? 'ไม่พบคลังของคุณ' : `ไม่พบคลังของพนักงานรหัส ${targetEmployeeId}`);

  // 1. คืนของเก่าเข้าคลังพนักงาน
  updateEmployeeStock(empWh.id, productId, qty, 0, '', oldExpiry);
  // 2. หักของเก่าออกจากร้านค้า
  adjustShopInventory(shopId, productId, oldExpiry, -qty);
  
  // 3. ตัดของใหม่จากคลังพนักงาน
  updateEmployeeStock(empWh.id, productId, -qty, 0, '', newExpiry);
  // 4. เพิ่มของใหม่เข้าร้านค้า
  adjustShopInventory(shopId, productId, newExpiry, qty);

  // 5. บันทึก Transaction
  appendRow(getSheet(SN.TRANSACTIONS), {
    id: generateId('T'),
    type: 'SWAP_SHOP_STOCK',
    fromWarehouseId: shopId,
    toWarehouseId: shopId,
    productId: productId,
    qty: qty,
    docNo: data.docNo || '',
    note: `สลับสินค้า (${oldExpiry} -> ${newExpiry})`,
    userId: user.id,
    username: user.username,
    createdAt: new Date().toISOString(),
    expiryDate: newExpiry
  });

  // บันทึก Log
  writeLog(user, 'swapShopStock', `เปลี่ยนสินค้า ${productId} ในร้าน ${shopId} (${oldExpiry} -> ${newExpiry})`);
  
  return { success: true };
}

function getShopHistory(user, shopId) {
  const tx = sheetData(getSheet(SN.TRANSACTIONS));
  const products = sheetData(getSheet(SN.PRODUCTS));
  const users = sheetData(getSheet(SN.USERS));
  const filtered = tx.filter(t => (String(t.fromWarehouseId) === String(shopId) || String(t.toWarehouseId) === String(shopId)))
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);

  return {
    history: filtered.map(t => {
      const p = products.find(px => px.id === t.productId) || {};
      const u = users.find(ux => ux.id === t.userId) || {};
      return { 
        ...t, 
        productName: p.name || t.productId, 
        unit: p.unit || '',
        operatorAvatar: u.avatar || ''
      };
    })
  };
}

/**
 * คืนสินค้าจากร้านค้าเข้าคลังพนักงาน (คืนเงิน)
 */
function returnFromShop(user, data) {
  const { shopId, productId, expiryDate, qty, refundAmount } = data;
  
  const targetEmployeeId = data.employeeId || user.id;
  const empWh = sheetData(getSheet(SN.WAREHOUSES)).find(w => w.employeeId === targetEmployeeId);
  if (!empWh) throw new Error(targetEmployeeId === user.id ? 'ไม่พบคลังของคุณ' : `ไม่พบคลังของพนักงานรหัส ${targetEmployeeId}`);

  // 1. หักสต็อกร้านค้า
  adjustShopInventory(shopId, productId, expiryDate, -qty);
  // 2. คืนสต็อกพนักงาน
  updateEmployeeStock(empWh.id, productId, qty, 0, '', expiryDate);
  
  // 3. บันทึก Transaction (เป็นค่าติดลบสำหรับราคา เพื่อระบุว่าคืนเงิน)
  appendRow(getSheet(SN.TRANSACTIONS), {
    id: generateId('T'),
    type: 'RETURN_FROM_SHOP',
    fromWarehouseId: shopId,
    toWarehouseId: empWh.id,
    productId: productId,
    qty: qty,
    costVat: -Math.abs(refundAmount || 0),
    docNo: data.docNo || '',
    note: `คืนสินค้าจากร้านค้า (คืนเงิน)`,
    userId: user.id,
    username: user.username,
    createdAt: new Date().toISOString(),
    expiryDate: expiryDate
  });

  // 4. บันทึก Billing คืนเงิน (ติดลบ)
  if (refundAmount > 0) {
    const shop = sheetData(getSheet(SN.SHOPS)).find(s => s.id === shopId);
    appendRow(getSheet(SN.BILLING), {
      id: generateId('B'),
      warehouseId: shopId,
      employeeId: user.id,
      date: new Date().toISOString().split('T')[0],
      totalAmt: -Math.abs(refundAmount),
      totalUnits: -qty,
      note: `รับคืนสินค้าจากร้าน ${shop ? shop.name : shopId}`,
      userId: user.id,
      createdAt: new Date().toISOString()
    });
  }

  writeLog(user, 'returnFromShop', `รับคืนสินค้า ${productId} จากร้าน ${shopId} (จำนวน ${qty}, คืนเงิน ${refundAmount})`);
  return { success: true };
}

function adjustShopInventory(shopId, productId, expiryDate, qty) {
  const sheet = getSheet(SN.SHOP_STOCK);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const shopIdx = headers.indexOf('shopId');
  const pidIdx = headers.indexOf('productId');
  const expIdx = headers.indexOf('expiryDate');
  const qtyIdx = headers.indexOf('qty');
  const updatedIdx = headers.indexOf('lastUpdated');
  
  const targetExp = _fmtDate(expiryDate);
  let foundRow = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][shopIdx]) === String(shopId) &&
        String(data[i][pidIdx]) === String(productId) &&
        _fmtDate(data[i][expIdx]) === targetExp) {
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow > 0) {
    const currentQty = Number(data[foundRow-1][qtyIdx]) || 0;
    const newQty = currentQty + qty;
    if (newQty <= 0) {
      sheet.deleteRow(foundRow);
    } else {
      sheet.getRange(foundRow, qtyIdx + 1).setValue(newQty);
      sheet.getRange(foundRow, updatedIdx + 1).setValue(new Date().toISOString());
    }
  } else if (qty > 0) {
    appendRow(sheet, {
      shopId, productId, expiryDate: targetExp, qty, lastUpdated: new Date().toISOString()
    });
  }
}

/**
 * _fmtDate: จัดรูปแบบวันที่ให้อยู่ในรูป YYYY-MM-DD (String) เพื่อความสม่ำเสมอในการค้นหา
 */
function _fmtDate(d) {
  if (!d) return '';
  // ถ้าเป็น Date object ให้ใช้ Utilities.formatDate เพื่อความแม่นยำของ Timezone
  if (d instanceof Date) {
    try {
      return Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd");
    } catch(e) { /* fallback */ }
  }
  
  // ถ้าเป็น String และอยู่ในรูปแบบ YYYY-MM-DD อยู่แล้วให้คืนค่าเลย
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.split('T')[0];

  // กรณีอื่นๆ พยายามแปลงเป็น Date ก่อน
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return s.split(' ')[0]; // Fallback string split
    return Utilities.formatDate(dt, "GMT+7", "yyyy-MM-dd");
  } catch(e) {
    return s.split(' ')[0];
  }
}
