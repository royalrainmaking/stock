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
};

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
      // Auth
      case 'changePassword': result = doChangePassword(user, body.oldPw, body.newPw); break;

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
      case 'consignFromEmployee': result = consignFromEmployee(user, body); break;
      case 'adjustStock': result = adjustStock(user, body); break;

      // Billing
      case 'getBillingList': result = getBillingList(e.parameter.date); break;
      case 'doBilling': result = doBilling(user, body); break;
      case 'getBillingDetail': result = getBillingDetail(e.parameter.billingId); break;
      case 'generateTaxInvoice': result = generateTaxInvoice(user, e.parameter.billingId); break;

      // Reports
      case 'getDashboard': result = getDashboard(user, e.parameter); break;
      case 'getSalesReport': result = getSalesReport(e.parameter); break;
      case 'getLogs': result = getLogs(e.parameter); break;

      // Orders
      case 'getOrders': result = getOrders(); break;
      case 'orderRequest': result = orderRequest(user, body); break;

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
  }
  return sheet;
}

function initSheet(sheet, name) {
  const headers = {
    [SN.USERS]: ['id','username','passwordHash','displayName','email','role','active','isEmployee','createdAt'],
    [SN.PRODUCTS]: ['id','code','name','category','unit','unitsPerCase','costNoVat','costVat','empNoVat','empVat','fridgeNoVat','fridgeVat','sellPrice','imageUrl','active','createdAt'],
    [SN.WAREHOUSES]: ['id','name','type','location','employeeId','active','createdAt'],
    [SN.CENTRAL_STOCK]: ['productId','warehouseId','qty','unit','lastUpdated'],
    [SN.EMPLOYEE_STOCK]: ['productId','warehouseId','qty','consigned','unit','lastUpdated'],
    [SN.TRANSACTIONS]: ['id','type','fromWarehouseId','toWarehouseId','productId','qty','unit','costVat','docNo','note','userId','username','createdAt'],
    [SN.BILLING]: ['id','warehouseId','employeeId','date','totalAmt','totalUnits','note','userId','createdAt','items'],
    [SN.LOGS]: ['id','ts','userId','username','action','detail','ip'],
    [SN.ORDERS]: ['id','date','requestedBy','userId','status','note','items','createdAt'],
  };
  if (headers[name]) {
    sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
    sheet.getRange(1, 1, 1, headers[name].length).setFontWeight('bold');
  }
}

function sheetData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function findRow(sheet, col, value) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIdx = headers.indexOf(col);
  for (let i = 1; i < data.length; i++) {
    if (data[i][colIdx] == value) return i + 1;
  }
  return -1;
}

function updateRow(sheet, rowNum, data) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : sheet.getRange(rowNum, headers.indexOf(h)+1).getValue());
  sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
}

function appendRow(sheet, data) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
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
  return users.find(u => String(u.id) === String(t.userId) && (u.active === true || u.active === 'TRUE' || u.active === 'true')) || null;
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
  if (!username || !password) throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  const users = sheetData(getSheet(SN.USERS));
  const user = users.find(u => String(u.username).toLowerCase().trim() === String(username).toLowerCase().trim());
  if (!user) throw new Error('ไม่พบชื่อผู้ใช้: ' + username);
  const isActive = (user.active === true || user.active === 'TRUE' || user.active === 'true');
  if (!isActive) throw new Error('บัญชีนี้ถูกปิดใช้งาน');
  
  const hash = hashPassword(password);
  // กรณีรหัสผ่านตรงกับ Hash หรือ รหัสผ่านที่กรอกตรงกับค่าในชีทเป๊ะๆ (กรณีไม่ได้รหัสผ่านแบบ Hash)
  if (hash !== user.passwordHash && password !== user.passwordHash) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }
  const token = generateToken(user.id);
  writeLog(user, 'login', 'เข้าสู่ระบบ');
  return {
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, email: user.email, role: user.role, isEmployee: user.isEmployee }
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

function getColIndex(sheet, colName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(colName) + 1;
}

// ── USERS ────────────────────────────────────────────────────
function getUsers(user) {
  requireRole(user, 'admin');
  const users = sheetData(getSheet(SN.USERS)).map(u => ({
    id: u.id, username: u.username, displayName: u.displayName,
    email: u.email, role: u.role, active: u.active == true || u.active === 'TRUE',
    isEmployee: u.isEmployee == true || u.isEmployee === 'TRUE',
  }));
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
    email: data.email || '', role: data.role || 'stock',
    active: true, isEmployee: data.isEmployee || false,
    createdAt: new Date().toISOString(),
  };
  appendRow(getSheet(SN.USERS), newUser);
  writeLog(user, 'createUser', `สร้างผู้ใช้ ${data.username}`);
  return { success: true, user: newUser };
}

function updateUser(user, data) {
  requireRole(user, 'admin');
  const sheet = getSheet(SN.USERS);
  const rowNum = findRow(sheet, 'id', data.id);
  if (rowNum < 0) throw new Error('ไม่พบผู้ใช้');
  const updates = {
    displayName: data.displayName, email: data.email,
    role: data.role, active: data.active, isEmployee: data.isEmployee,
  };
  Object.entries(updates).forEach(([k, v]) => {
    if (v !== undefined) {
      const ci = getColIndex(sheet, k);
      if (ci > 0) sheet.getRange(rowNum, ci).setValue(v);
    }
  });
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
  writeLog(user, 'deleteUser', `ลบผู้ใช้ ${userId}`);
  return { success: true };
}

// ── PRODUCTS ─────────────────────────────────────────────────
function getProducts() {
  const products = sheetData(getSheet(SN.PRODUCTS))
    .filter(p => p.active == true || p.active === 'TRUE' || p.active === true || p.active == '')
    .map(p => ({
      id: p.id, code: p.code, name: p.name, category: p.category,
      unit: p.unit, unitsPerCase: Number(p.unitsPerCase) || 1,
      costNoVat: Number(p.costNoVat) || 0, costVat: Number(p.costVat) || 0,
      empNoVat: Number(p.empNoVat) || 0, empVat: Number(p.empVat) || 0,
      fridgeNoVat: Number(p.fridgeNoVat) || 0, fridgeVat: Number(p.fridgeVat) || 0,
      sellPrice: Number(p.sellPrice) || 0, imageUrl: p.imageUrl || '',
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
  const fields = ['code','name','category','unit','unitsPerCase','costNoVat','costVat','empNoVat','empVat','fridgeNoVat','fridgeVat','sellPrice','imageUrl'];
  fields.forEach(k => {
    if (data[k] !== undefined) { const ci = getColIndex(sheet, k); if (ci > 0) sheet.getRange(rowNum, ci).setValue(data[k]); }
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

// ── WAREHOUSES ───────────────────────────────────────────────
function getWarehouses() {
  const warehouses = sheetData(getSheet(SN.WAREHOUSES))
    .filter(w => w.active == true || w.active === 'TRUE' || w.active == '')
    .map(w => ({ id: w.id, name: w.name, type: w.type, location: w.location, employeeId: w.employeeId, active: true }));
  return { warehouses };
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
  ['name','location','employeeId','active'].forEach(k => {
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
  const ci = getColIndex(sheet, 'active');
  sheet.getRange(rowNum, ci).setValue(false);
  writeLog(user, 'deleteWarehouse', `ลบคลัง ${warehouseId}`);
  return { success: true };
}

// ── STOCK ────────────────────────────────────────────────────
function getCentralStock(warehouseId) {
  const stock = sheetData(getSheet(SN.CENTRAL_STOCK));
  const products = sheetData(getSheet(SN.PRODUCTS));
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const result = stock
    .filter(s => !warehouseId || s.warehouseId === warehouseId)
    .map(s => ({
      ...s, qty: Number(s.qty) || 0,
      product: products.find(p => p.id === s.productId) || {},
      warehouse: warehouses.find(w => w.id === s.warehouseId) || {},
    }));
  return { stock: result };
}

function getEmployeeStock(employeeId) {
  const stock = sheetData(getSheet(SN.EMPLOYEE_STOCK));
  const products = sheetData(getSheet(SN.PRODUCTS));
  const warehouses = sheetData(getSheet(SN.WAREHOUSES));
  const result = stock
    .filter(s => {
      if (!employeeId) return true;
      const wh = warehouses.find(w => w.id === s.warehouseId);
      return wh && wh.employeeId === employeeId;
    })
    .map(s => ({
      ...s, qty: Number(s.qty) || 0, consigned: Number(s.consigned) || 0,
      product: products.find(p => p.id === s.productId) || {},
      warehouse: warehouses.find(w => w.id === s.warehouseId) || {},
    }));
  return { stock: result };
}

function getAllEmployeeStocks(date) {
  const empWarehouses = sheetData(getSheet(SN.WAREHOUSES)).filter(w => w.type === 'employee' && (w.active == true || w.active === 'TRUE'));
  const stock = sheetData(getSheet(SN.EMPLOYEE_STOCK));
  const products = sheetData(getSheet(SN.PRODUCTS));
  const users = sheetData(getSheet(SN.USERS));
  const billings = date ? sheetData(getSheet(SN.BILLING)).filter(b => b.date === date) : [];

  const result = empWarehouses.map(wh => {
    const whStock = stock
      .filter(s => s.warehouseId === wh.id)
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

function updateCentralStock(warehouseId, productId, deltaQty, unit) {
  const sheet = getSheet(SN.CENTRAL_STOCK);
  const data = sheetData(sheet);
  const existing = data.find(s => s.warehouseId === warehouseId && s.productId === productId);
  if (existing) {
    const rowNum = findRow(sheet, 'productId', productId);
    // find the correct row (matching both)
    const allData = sheet.getDataRange().getValues();
    const hdr = allData[0];
    const whIdx = hdr.indexOf('warehouseId');
    const pidIdx = hdr.indexOf('productId');
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][pidIdx] === productId && allData[i][whIdx] === warehouseId) {
        const qtyIdx = hdr.indexOf('qty');
        const newQty = (Number(allData[i][qtyIdx]) || 0) + deltaQty;
        sheet.getRange(i+1, qtyIdx+1).setValue(Math.max(0, newQty));
        sheet.getRange(i+1, hdr.indexOf('lastUpdated')+1).setValue(new Date().toISOString());
        return;
      }
    }
  } else {
    appendRow(sheet, { productId, warehouseId, qty: Math.max(0, deltaQty), unit: unit||'', lastUpdated: new Date().toISOString() });
  }
}

function updateEmployeeStock(warehouseId, productId, deltaQty, deltaConsigned, unit) {
  const sheet = getSheet(SN.EMPLOYEE_STOCK);
  const allData = sheet.getDataRange().getValues();
  const hdr = allData[0];
  const whIdx = hdr.indexOf('warehouseId');
  const pidIdx = hdr.indexOf('productId');
  const qtyIdx = hdr.indexOf('qty');
  const consIdx = hdr.indexOf('consigned');
  let found = false;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][pidIdx] === productId && allData[i][whIdx] === warehouseId) {
      const newQty = Math.max(0, (Number(allData[i][qtyIdx]) || 0) + deltaQty);
      const newCons = Math.max(0, (Number(allData[i][consIdx]) || 0) + (deltaConsigned || 0));
      sheet.getRange(i+1, qtyIdx+1).setValue(newQty);
      sheet.getRange(i+1, consIdx+1).setValue(newCons);
      sheet.getRange(i+1, hdr.indexOf('lastUpdated')+1).setValue(new Date().toISOString());
      found = true;
      break;
    }
  }
  if (!found && deltaQty > 0) {
    appendRow(sheet, { productId, warehouseId, qty: deltaQty, consigned: 0, unit: unit||'', lastUpdated: new Date().toISOString() });
  }
}

function receiveGoods(user, data) {
  requireRole(user, 'admin', 'stock');
  if (!data.warehouseId || !data.items?.length) throw new Error('ข้อมูลไม่ครบ');
  const txSheet = getSheet(SN.TRANSACTIONS);
  data.items.forEach(item => {
    updateCentralStock(data.warehouseId, item.productId, item.qty, item.unit);
    appendRow(txSheet, {
      id: generateId('TX'), type: 'receive',
      fromWarehouseId: '', toWarehouseId: data.warehouseId,
      productId: item.productId, qty: item.qty, unit: item.unit,
      costVat: item.costVat || 0, docNo: data.docNo || '',
      note: data.note || '', userId: user.id, username: user.username,
      createdAt: new Date().toISOString(),
    });
  });
  writeLog(user, 'receive', `รับ ${data.items.length} รายการ → ${data.warehouseId}`);
  return { success: true };
}

function transferToEmployee(user, data) {
  requireRole(user, 'admin', 'stock');
  if (!data.fromWarehouseId || !data.toWarehouseId || !data.items?.length) throw new Error('ข้อมูลไม่ครบ');
  const txSheet = getSheet(SN.TRANSACTIONS);
  const centralSheet = getSheet(SN.CENTRAL_STOCK);

  data.items.forEach(item => {
    // Check stock
    const cData = sheetData(centralSheet).find(s => s.warehouseId === data.fromWarehouseId && s.productId === item.productId);
    if (!cData || Number(cData.qty) < item.qty) throw new Error(`สต็อกไม่พอสำหรับ ${item.productId}`);
    updateCentralStock(data.fromWarehouseId, item.productId, -item.qty, item.unit);
    updateEmployeeStock(data.toWarehouseId, item.productId, item.qty, 0, item.unit);
    appendRow(txSheet, {
      id: generateId('TX'), type: 'transfer',
      fromWarehouseId: data.fromWarehouseId, toWarehouseId: data.toWarehouseId,
      productId: item.productId, qty: item.qty, unit: item.unit,
      costVat: 0, docNo: '', note: data.note || '',
      userId: user.id, username: user.username, createdAt: new Date().toISOString(),
    });
  });
  writeLog(user, 'transfer', `เบิก ${data.items.length} รายการ ${data.fromWarehouseId}→${data.toWarehouseId}`);
  return { success: true };
}

function consignFromEmployee(user, data) {
  requireRole(user, 'admin', 'stock');
  if (!data.fromWarehouseId || !data.items?.length) throw new Error('ข้อมูลไม่ครบ');
  const txSheet = getSheet(SN.TRANSACTIONS);
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
  writeLog(user, 'consign', `รับฝาก ${data.items.length} รายการ จาก ${data.fromWarehouseId}`);
  return { success: true };
}

function adjustStock(user, data) {
  requireRole(user, 'admin');
  const { warehouseId, productId, qty, type, note } = data;
  if (type === 'central') updateCentralStock(warehouseId, productId, qty, '');
  else updateEmployeeStock(warehouseId, productId, qty, 0, '');
  writeLog(user, 'adjust', `ปรับสต็อก ${productId} ${qty > 0 ? '+' : ''}${qty}`);
  return { success: true };
}

// ── BILLING ──────────────────────────────────────────────────
function getBillingList(date) {
  const today = date || new Date().toISOString().split('T')[0];
  const empWarehouses = sheetData(getSheet(SN.WAREHOUSES)).filter(w => w.type === 'employee' && (w.active == true || w.active === 'TRUE'));
  const billings = sheetData(getSheet(SN.BILLING)).filter(b => b.date === today);
  const users = sheetData(getSheet(SN.USERS));

  const result = empWarehouses.map(wh => {
    const bill = billings.find(b => b.warehouseId === wh.id);
    const emp = users.find(u => u.id === wh.employeeId);
    return {
      billingId: bill?.id || null,
      warehouseId: wh.id, warehouseName: wh.name,
      employee: emp ? { id: emp.id, displayName: emp.displayName, username: emp.username } : null,
      date: today, billed: !!bill,
      billedAt: bill?.createdAt || null,
      totalAmt: Number(bill?.totalAmt) || 0,
      totalUnits: Number(bill?.totalUnits) || 0,
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
    const whIdx = hdr.indexOf('warehouseId'); const pidIdx = hdr.indexOf('productId');
    const qtyIdx = hdr.indexOf('qty'); const consIdx = hdr.indexOf('consigned');
    items.forEach(item => {
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][pidIdx] === item.productId && allData[i][whIdx] === warehouseId) {
          empSheet.getRange(i+1, qtyIdx+1).setValue(item.consigned || 0);
          empSheet.getRange(i+1, consIdx+1).setValue(0);
          break;
        }
      }
    });
  }

  writeLog(user, 'billing', `คิดเงิน ${warehouseId} ฿${totalAmt}`);
  return { success: true, billingId, totalAmt };
}

function getBillingDetail(billingId) {
  const billing = sheetData(getSheet(SN.BILLING)).find(b => b.id === billingId);
  if (!billing) throw new Error('ไม่พบข้อมูลการคิดเงิน');
  return { billing };
}

function generateTaxInvoice(user, billingId) {
  requireRole(user, 'admin', 'cashier');
  const billing = sheetData(getSheet(SN.BILLING)).find(b => b.id === billingId);
  if (!billing) throw new Error('ไม่พบข้อมูล');
  const invNo = 'INV-' + billing.date.replace(/-/g,'') + '-' + billingId.slice(-4);
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
    const dayBills = billings.filter(b => b.date === ds);
    const dayAmt = dayBills.reduce((a, b) => a + Number(b.totalAmt), 0);
    salesByDay.push({ label: days[d.getDay() === 0 ? 6 : d.getDay()-1] || ds, value: dayAmt });
  }

  // Sales by month (this year)
  const monthNames = ['ม.ค','ก.พ','มี.ค','เม.ย','พ.ค','มิ.ย','ก.ค','ส.ค','ก.ย','ต.ค','พ.ย','ธ.ค'];
  const salesByMonth = monthNames.map((label, mi) => {
    const prefix = `${year}-${String(mi+1).padStart(2,'0')}`;
    const mBills = billings.filter(b => b.date && b.date.startsWith(prefix));
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

  return { totalSalesToday, totalUnitsToday, activeEmployees, lowStockCount, salesByDay, salesByMonth, topProducts, forecastNextDays };
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
  const { startDate, endDate, userId, action, page } = params;
  const pageNum = parseInt(page) || 1;
  const pageSize = 30;
  let logs = sheetData(getSheet(SN.LOGS));
  if (startDate) logs = logs.filter(l => l.ts >= startDate);
  if (endDate) logs = logs.filter(l => l.ts <= endDate + 'T23:59:59');
  if (userId) logs = logs.filter(l => l.username === userId);
  if (action) logs = logs.filter(l => l.action === action);
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
