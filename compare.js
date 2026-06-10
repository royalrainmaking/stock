const https = require('https');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzQhVkdkopAumInK9x-NU9y7bSVc3eHBJnF4vazJelRRqxev1wTAlgNPcny2e_wvUtVhg/exec';

function postGAS(action, payload) {
  return new Promise((resolve, reject) => {
    const dataString = `action=${action}&data=${encodeURIComponent(JSON.stringify(payload))}`;
    const urlObj = new URL(GAS_URL);
    
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(dataString)
      }
    }, (res) => {
      let body = '';
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect
        const redirObj = new URL(res.headers.location);
        const redirReq = https.request({
          hostname: redirObj.hostname,
          path: redirObj.pathname + redirObj.search,
          method: 'GET'
        }, (redirRes) => {
          let redirBody = '';
          redirRes.on('data', d => redirBody += d);
          redirRes.on('end', () => resolve(JSON.parse(redirBody)));
        });
        redirReq.on('error', reject);
        redirReq.end();
      } else {
        res.on('data', d => body += d);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch(e) { resolve({error: true, body}); }
        });
      }
    });
    
    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

async function analyze() {
  console.log("Fetching Central Stock...");
  const csRes = await postGAS('getCentralStock', {});
  const central = csRes.stock || [];
  
  console.log("Fetching Employee Stock...");
  const esRes = await postGAS('getAllEmployeeStocks', {});
  const empWarehouses = esRes.warehouses || [];
  
  console.log("Fetching Receive History...");
  const rhRes = await postGAS('getReceiveHistory', {});
  const history = rhRes.history || [];
  
  console.log("Fetching Products...");
  const pRes = await postGAS('getProducts', {});
  const products = pRes.products || [];

  const summary = {};
  
  // 1. Accumulate Received Qty
  history.forEach(h => {
    (h.items || []).forEach(it => {
      if (!summary[it.productId]) summary[it.productId] = { received: 0, current: 0, receivedVal: 0, currentVal: 0 };
      summary[it.productId].received += Number(it.qty) || 0;
      
      const p = products.find(x => x.id === it.productId) || {};
      const cNoVat = it.costNoVat || p.costNoVat || 0;
      const disc = it.discount || 0;
      summary[it.productId].receivedVal += (Number(it.qty) || 0) * Math.max(0, cNoVat - disc) * (1 + 0.07);
    });
  });

  // 2. Accumulate Central Stock
  central.forEach(s => {
    if (!summary[s.productId]) summary[s.productId] = { received: 0, current: 0, receivedVal: 0, currentVal: 0 };
    summary[s.productId].current += Number(s.qty) || 0;
  });

  // 3. Accumulate Employee Stock
  empWarehouses.forEach(wh => {
    (wh.stock || []).forEach(s => {
      if (!summary[s.productId]) summary[s.productId] = { received: 0, current: 0, receivedVal: 0, currentVal: 0 };
      summary[s.productId].current += Number(s.qty) || 0;
    });
  });

  // 4. Calculate Current Value using CURRENT costVat
  for (const pid in summary) {
    const p = products.find(x => x.id === pid) || {};
    summary[pid].currentVal = summary[pid].current * (Number(p.costVat) || 0);
  }

  // 5. Output differences
  console.log("--- Mismatches (Current < Received) ---");
  for (const pid in summary) {
    const diff = summary[pid].received - summary[pid].current;
    if (diff !== 0) {
      const p = products.find(x => x.id === pid) || {name: pid};
      console.log(`${p.name} (ID: ${pid}): Received=${summary[pid].received}, Current=${summary[pid].current}, Diff=${diff}`);
    }
  }

  let totRec = 0, totCur = 0, totRecVal = 0, totCurVal = 0;
  for (const pid in summary) {
    totRec += summary[pid].received;
    totCur += summary[pid].current;
    totRecVal += summary[pid].receivedVal;
    totCurVal += summary[pid].currentVal;
  }
  
  console.log("\n--- Totals ---");
  console.log(`Received Qty: ${totRec}`);
  console.log(`Current Qty: ${totCur}`);
  console.log(`Diff Qty: ${totRec - totCur}`);
  console.log(`Received Val: ${totRecVal.toFixed(2)}`);
  console.log(`Current Val: ${totCurVal.toFixed(2)}`);
}

analyze();
