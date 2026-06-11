const fs = require('fs');

const empLogPath = 'C:\\Users\\obob\\.gemini\\antigravity-ide\\brain\\756a75be-99e1-4199-aa9c-0dd1a613d34a\\.system_generated\\tasks\\task-86.log';
const centralReportPath = 'C:\\Users\\obob\\.gemini\\antigravity-ide\\brain\\756a75be-99e1-4199-aa9c-0dd1a613d34a\\scratch\\central_report.json';

function main() {
  const centralData = JSON.parse(fs.readFileSync(centralReportPath, 'utf8'));
  const empData = JSON.parse(fs.readFileSync(empLogPath, 'utf8').substring(fs.readFileSync(empLogPath, 'utf8').indexOf('RESULT:\n') + 8).trim());
  const wh = empData.warehouses.find(w => w.warehouse.name.includes('senior ป๋อง'));

  console.log('--- EMP STOCK ITEMS ---');
  wh.stock.forEach(item => {
    console.log(`ID: ${item.productId}, Code: ${item.product.code}, Name: ${item.product.name} (${item.product.category}), Qty: ${item.qty}`);
  });

  console.log('--- CENTRAL REPORT ROWS FOR THESE ---');
  wh.stock.forEach(item => {
    const r = centralData.rows.find(row => String(row.id) === String(item.productId));
    if (r) {
      console.log(`ID: ${r.id}, Code: ${r.code}, Name: ${r.name} (${r.category}), Withdrawn: ${r.withdrawn}, txnAmount: ${r.txnAmount}, txnCommission: ${r.txnCommission}`);
    } else {
      console.log(`ID: ${item.productId} NOT FOUND in Central Report`);
    }
  });
}

main();
