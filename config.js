// ============================================================
// config.js – Configuration for Google Apps Script endpoint
// ============================================================

const CONFIG = {
  // ── Google Apps Script URL (Copy URL ที่ได้จากการ Deploy Web App มาวางที่นี่) ───
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzD6AfHCVJJXYAmNz8zCRwwOvDxVZlu2ptqXYvixMkLhqIpDWbt-QEZ44tYG2UZhqtK/exec',

  // ── Demo Mode: true = ใช้ข้อมูล Demo (ไม่ต้อง GAS) ───────
  // ตั้งเป็น false และใส่ GAS_URL จริง เมื่อ Deploy แล้ว
  DEMO_MODE: false,

  // Google Sheets ID (from the URL)
  SHEET_ID: '1H1GVv2yVPfdNh1Z2ZR5K7-hJ52gPXFZauPDpE7c-Pr4',

  // App settings
  APP_NAME: 'StockFanggie',
  VERSION: '1.0.0',

  // Session key for localStorage
  SESSION_KEY: 'sfg_session',

  // Pagination
  PAGE_SIZE: 30,

  // VAT rate
  VAT_RATE: 0.07,
};

// Sheet names (must match exactly in Google Sheets)
const SHEETS = {
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

// Roles
const ROLES = {
  ADMIN: 'admin',
  STOCK: 'stock',
  CASHIER: 'cashier',
  EMPLOYEE: 'employee',
  SELL: 'sell',
  CUSTOMER: 'customer',
  PART_TIME: 'part_time',
};

// Transaction types
const TX_TYPES = {
  RECEIVE: 'receive',         // รับสินค้าเข้าคลังกลาง
  TRANSFER: 'transfer',       // เบิกสินค้าจากคลังกลาง→คลังพนักงาน
  CONSIGN: 'consign',         // ฝากสินค้าจากคลังพนักงานกลับ
  BILLING: 'billing',         // คิดเงินรายวัน
  ADJUST: 'adjust',           // ปรับยอด
  ORDER: 'order',             // สั่งสินค้าเข้า
};
