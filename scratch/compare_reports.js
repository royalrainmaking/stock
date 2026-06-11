const fs = require('fs');

const empLogPath = 'C:\\Users\\obob\\.gemini\\antigravity-ide\\brain\\756a75be-99e1-4199-aa9c-0dd1a613d34a\\.system_generated\\tasks\\task-86.log';
const centralReportPath = 'C:\\Users\\obob\\.gemini\\antigravity-ide\\brain\\756a75be-99e1-4199-aa9c-0dd1a613d34a\\scratch\\central_report.json';

function main() {
  try {
    const empContent = fs.readFileSync(empLogPath, 'utf8');
    const jsonStartIdx = empContent.indexOf('RESULT:\n') + 8;
    const jsonStr = empContent.substring(jsonStartIdx).trim();
    const empData = JSON.parse(jsonStr);

    const centralContent = fs.readFileSync(centralReportPath, 'utf8');
    const centralData = JSON.parse(centralContent);

    const wh = empData.warehouses.find(w => w.warehouse.name.includes('senior ป๋อง'));
    if (!wh) {
      console.log('Employee Warehouse senior ป๋อง not found');
      return;
    }

    console.log(`Comparing senior ป๋อง stock against Central Report withdrawn`);
    console.log('| Product | Emp Qty | Central Withdrawn | Qty Match? | Emp Wholesale | Central txnAmount (Cost) | Central txnCommission (AP) | Central Sum (Cost+AP) | Sum Match? |');
    console.log('|---|---|---|---|---|---|---|---|---|');

    wh.stock.forEach(item => {
      const p = item.product;
      const empQty = item.qty;

      // Find in central report rows
      const centralRow = centralData.rows.find(r => String(r.id) === String(p.id));
      const centralQty = centralRow ? centralRow.withdrawn : 0;
      const qtyMatch = empQty === centralQty ? '✅ Yes' : `❌ No (${empQty} vs ${centralQty})`;

      const empWholesale = empQty * (Number(p.sellWholesale) || 0);

      const centralTxnAmount = centralRow ? Number(centralRow.txnAmount) || 0 : 0;
      const centralTxnCommission = centralRow ? Number(centralRow.txnCommission) || 0 : 0;
      const centralSum = centralTxnAmount + centralTxnCommission;

      const sumMatch = Math.abs(empWholesale - centralSum) < 0.01 ? '✅ Yes' : `❌ No (฿${empWholesale.toFixed(2)} vs ฿${centralSum.toFixed(2)})`;

      console.log(`| ${p.name} | ${empQty} | ${centralQty} | ${qtyMatch} | ฿${empWholesale.toFixed(2)} | ฿${centralTxnAmount.toFixed(2)} | ฿${centralTxnCommission.toFixed(2)} | ฿${centralSum.toFixed(2)} | ${sumMatch} |`);
    });

    // Check if there are any products in Central Report that are withdrawn but not in Employee Stock
    centralData.rows.forEach(r => {
      if (r.withdrawn > 0) {
        const inEmp = wh.stock.find(item => String(item.product.id) === String(r.id));
        if (!inEmp) {
          console.log(`| **${r.name} (คลังกลางมีเบิก แต่คลังพนักงานไม่มี)** | 0 | ${r.withdrawn} | ❌ No (0 vs ${r.withdrawn}) | ฿0.00 | ฿${(r.txnAmount || 0).toFixed(2)} | ฿${(r.txnCommission || 0).toFixed(2)} | ฿${((r.txnAmount || 0) + (r.txnCommission || 0)).toFixed(2)} | ❌ No |`);
        }
      }
    });

  } catch (err) {
    console.error(err);
  }
}

main();
