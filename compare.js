const GAS_URL = 'https://script.google.com/macros/s/AKfycbzQhVkdkopAumInK9x-NU9y7bSVc3eHBJnF4vazJelRRqxev1wTAlgNPcny2e_wvUtVhg/exec';

async function fetchGAS(action, params = {}) {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v);
    }
  });
  
  const res = await fetch(url.toString(), { redirect: 'follow' });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function analyze() {
  console.log("Logging in...");
  const loginRes = await fetchGAS('login', { username: 'admin', password: '87654321' });
  const token = loginRes.token;

  console.log("Fetching Central Stock...");
  const csRes = await fetchGAS('getCentralStock', { token });
  const central = csRes.stock || [];
  
  console.log("Fetching Employee Stock...");
  const esRes = await fetchGAS('getAllEmployeeStocks', { token });
  const empWarehouses = esRes.warehouses || [];
  
  console.log("Fetching Receive History...");
  const rhRes = await fetchGAS('getReceiveHistory', { token, startDate: '2000-01-01', endDate: '2099-12-31' });
  const history = rhRes.history || [];
  
  console.log("Fetching Products...");
  const pRes = await fetchGAS('getProducts', { token });
  const products = pRes.products || [];

  console.log("Fetching Sets...");
  const sRes = await fetchGAS('getSets', { token });
  const sets = sRes.sets || [];

  console.log("Fetching Sales...");
  const salesRes = await fetchGAS('getSalesReport', { token, startDate: '2000-01-01', endDate: '2099-12-31' });
  const sales = salesRes.rows || [];

  console.log("Fetching Orders...");
  const oRes = await fetchGAS('getOrders', { token });
  const orders = oRes.orders || [];

  const summary = {};

  function addQty(pid, type, qty, cNoVat, disc, costVat, whId) {
    const setObj = sets.find(s => s.id === pid);
    if (setObj) {
      let actualComponents = {};
      let totalSetsPicked = 0;
      
      if (whId) {
         // Find actual picked components for this warehouse
         orders.forEach(o => {
            if (o.status === 'completed' && String(o.toWhId).trim() === String(whId).trim()) {
               (o.items || []).forEach(it => {
                  if (it.productId === pid && it.pickedComponents) {
                     totalSetsPicked += (Number(it.qty) || 0);
                     it.pickedComponents.forEach(pc => {
                        if (!actualComponents[pc.productId]) actualComponents[pc.productId] = 0;
                        actualComponents[pc.productId] += (Number(pc.qty) || 0);
                     });
                  }
               });
            }
         });
      }
      
      if (totalSetsPicked === 0) {
         // Fallback to global average if not found for warehouse
         orders.forEach(o => {
            if (o.status === 'completed') {
               (o.items || []).forEach(it => {
                  if (it.productId === pid && it.pickedComponents) {
                     totalSetsPicked += (Number(it.qty) || 0);
                     it.pickedComponents.forEach(pc => {
                        if (!actualComponents[pc.productId]) actualComponents[pc.productId] = 0;
                        actualComponents[pc.productId] += (Number(pc.qty) || 0);
                     });
                  }
               });
            }
         });
      }
      
      let enrichedSetItems = [];
      if (totalSetsPicked > 0) {
         for (const pcPid in actualComponents) {
            const cp = products.find(x => x.id === pcPid);
            enrichedSetItems.push({
               id: pcPid,
               qtyPerSet: actualComponents[pcPid] / totalSetsPicked,
               cp: cp
            });
         }
      } else {
         enrichedSetItems = (setObj.items || []).map(it => {
            let cp = null;
            if (it.allowedProducts && it.allowedProducts.length > 0) cp = products.find(x => it.allowedProducts.includes(x.id));
            if (!cp && it.category) cp = products.find(x => x.category === it.category);
            return {
               id: cp ? cp.id : `CAT_${it.category}`,
               qtyPerSet: Number(it.qty) || 1,
               cp: cp
            };
         });
      }
      
      enrichedSetItems.forEach(it => {
        const targetQty = qty * it.qtyPerSet;
        const tCNoVat = it.cp ? (Number(it.cp.costNoVat) || 0) : 0;
        doAddQty(it.id, type, targetQty, tCNoVat, disc, it.cp);
      });
      
    } else {
      const p = products.find(x => x.id === pid);
      doAddQty(pid, type, qty, cNoVat, disc, p);
    }
  }

  function doAddQty(pid, type, qty, cNoVat, disc, pObj) {
    if (!summary[pid]) summary[pid] = { received: 0, current: 0, sold: 0, receivedVal: 0, currentVal: 0, name: pObj ? pObj.name : pid };
    summary[pid][type] += qty;
    
    if (type === 'received') {
      const actualCost = Math.max(0, (cNoVat || (pObj ? pObj.costNoVat : 0)) - (disc || 0));
      summary[pid].receivedVal += qty * actualCost * 1.07;
    }
  }

  // 1. Accumulate Received Qty
  history.forEach(h => {
    (h.items || []).forEach(it => {
      const qty = Number(it.qty) || 0;
      const p = products.find(x => x.id === it.productId) || {};
      const cNoVat = it.costNoVat || p.costNoVat || 0;
      const disc = it.discount || 0;
      addQty(it.productId, 'received', qty, cNoVat, disc, 0);
    });
  });

  // 2. Accumulate Central Stock
  central.forEach(s => {
    addQty(s.productId, 'current', Number(s.qty) || 0, 0, 0, 0, 'CENTRAL');
  });

  // 3. Accumulate Employee Stock
  empWarehouses.forEach(wh => {
    (wh.stock || []).forEach(s => {
      addQty(s.productId, 'current', Number(s.qty) || 0, 0, 0, 0, wh.warehouse.id);
    });
  });

  // 4. Accumulate Sold Items
  sales.forEach(row => {
    addQty(row.productId, 'sold', Number(row.units) || 0, 0, 0, 0, row.warehouseId);
  });

  // 5. Calculate Current Value
  for (const pid in summary) {
    const p = products.find(x => x.id === pid) || {};
    summary[pid].currentVal = summary[pid].current * (Number(p.costVat) || 0);
  }

  // 6. Output differences
  console.log("--- Mismatches (Received !== Current + Sold) ---");
  for (const pid in summary) {
    const s = summary[pid];
    const totalAccounted = s.current + s.sold;
    const diff = s.received - totalAccounted;
    if (diff !== 0) {
      console.log(`${s.name} (ID: ${pid}): Received=${s.received}, Current=${s.current}, Sold=${s.sold}, Diff=${diff}`);
    }
  }

  // Print Totals
  let totRec = 0, totCur = 0, totSold = 0, totRecVal = 0, totCurVal = 0;
  for (const pid in summary) {
    totRec += summary[pid].received;
    totCur += summary[pid].current;
    totSold += summary[pid].sold;
    totRecVal += summary[pid].receivedVal;
    totCurVal += summary[pid].currentVal;
  }
  
  console.log("\n--- Totals ---");
  console.log(`Received Qty: ${totRec}`);
  console.log(`Current Qty: ${totCur}`);
  console.log(`Sold Qty: ${totSold}`);
  console.log(`Diff Qty (Received - Current - Sold): ${totRec - totCur - totSold}`);
  console.log(`Received Val: ${totRecVal.toFixed(2)}`);
  console.log(`Current Val: ${totCurVal.toFixed(2)}`);
}

analyze().catch(err => console.error("Error analyzing data:", err));
