// ============================================================
// pages/tax-invoice.js – ใบกำกับภาษี / ใบส่งสินค้า / ใบแจ้งหนี้ + ใบเสร็จรับเงิน
// รูปแบบตามแบบฟอร์ม Excel (ธุรกิจผลิต-ซื้อ-ขาย)
//   • ใบกำกับภาษี/ส่งสินค้า/แจ้งหนี้ : 3 ฉบับ (สำหรับลูกค้า / บริษัท / บัญชี)
//   • ใบเสร็จรับเงิน                  : 2 ฉบับ (สำหรับลูกค้า / บัญชี)
// พิมพ์เป็น A4 หรือเลือก "บันทึกเป็น PDF" ในหน้าต่างพิมพ์ของเบราว์เซอร์
// ============================================================

PAGES['tax-invoice'] = {
  _billings: [],
  _selectedIds: new Set(),
  _date: '',
  _company: null,
  _doc: null,       // ข้อมูลเอกสารที่กำลังแสดงตัวอย่าง
  _tab: 'invoice',  // invoice | receipt

  ROWS_PER_PAGE: 22,

  // ── Render หน้ารายการเลือกบิล ────────────────────────────
  async render() {
    this._date = this._date || UI.todayISO();
    const el = document.getElementById('page-tax-invoice');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:#FCE4EC;color:var(--c-finance)">
            <span class="material-icons">receipt</span>
          </div>
          <div>
            <h2 class="page-title">ใบกำกับภาษี / ใบเสร็จรับเงิน</h2>
            <p class="page-subtitle">เลือกรายการคิดเงินพนักงาน เพื่อออกใบกำกับภาษี/ใบส่งสินค้า/ใบแจ้งหนี้ และใบเสร็จรับเงิน</p>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="ti-btn-generate" disabled onclick="PAGES['tax-invoice'].openInvoiceForm()">
            <span class="material-icons">description</span> สร้างเอกสาร (<span id="ti-selected-count">0</span>)
          </button>
        </div>
      </div>

      <div class="filter-card">
        <form onsubmit="event.preventDefault()">
          <div class="form-group" style="width:180px">
            <label>วันที่สรุปยอด</label>
            <input type="date" id="ti-date" value="${this._date}" onchange="PAGES['tax-invoice'].setDate(this.value)" />
          </div>
          <button type="button" class="btn btn-secondary" style="height:42px" onclick="PAGES['tax-invoice'].load()">
            <span class="material-icons">refresh</span> รีเฟรช
          </button>
          <button type="button" class="btn btn-secondary" style="height:42px" onclick="PAGES['tax-invoice'].toggleSelectAll()">
            <span class="material-icons">done_all</span> เลือกทั้งหมด
          </button>
        </form>
      </div>

      <div id="ti-body">${UI.spinner()}</div>
    `;
    this.injectPrintStyles();
    await this.load();
  },

  setDate(d) { this._date = d; this.load(); },

  async load() {
    try {
      UI.loading(true);
      const res = await API.getBillingList(this._date);
      this._billings = (res.billings || []).filter(b => b.billed);
      this._selectedIds.clear();
      this.renderList();
      this.updateSelectionUI();
    } catch (e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  },

  renderList() {
    const container = document.getElementById('ti-body');
    if (!this._billings.length) {
      container.innerHTML = UI.emptyState('receipt_long', 'ไม่พบรายการคิดเงิน', 'โปรดเลือกวันที่อื่นๆ หรือตรวจสอบว่ามีการคิดเงินพนักงานหรือยัง');
      return;
    }
    container.innerHTML = `<div class="grid-2">${this._billings.map(b => `
      <div class="card p-15 ti-selectable-card ${this._selectedIds.has(b.billingId) ? 'selected' : ''}" onclick="PAGES['tax-invoice'].toggleSelect('${b.billingId}')">
        <div style="display:flex; gap:12px; align-items:center">
          <input type="checkbox" id="chk-${b.billingId}" ${this._selectedIds.has(b.billingId) ? 'checked' : ''} onclick="event.stopPropagation(); PAGES['tax-invoice'].toggleSelect('${b.billingId}')"/>
          <div style="flex:1">
            <div class="fw-bold">${this.esc(b.employee?.displayName)}</div>
            <div class="text-muted" style="font-size:0.75rem">${this.esc(b.warehouseName)}</div>
          </div>
          <div class="text-end">
            <div class="fw-bold" style="color:var(--success)">฿${UI.currency(b.totalAmt)}</div>
            <div style="font-size:0.7rem; color:var(--text-muted)">ID: ${this.esc(b.billingId)}</div>
          </div>
        </div>
      </div>
    `).join('')}</div>`;
  },

  toggleSelect(id) {
    if (this._selectedIds.has(id)) this._selectedIds.delete(id);
    else this._selectedIds.add(id);
    this.renderList();
    this.updateSelectionUI();
  },

  toggleSelectAll() {
    if (this._selectedIds.size === this._billings.length) this._selectedIds.clear();
    else this._billings.forEach(b => this._selectedIds.add(b.billingId));
    this.renderList();
    this.updateSelectionUI();
  },

  updateSelectionUI() {
    const count = this._selectedIds.size;
    document.getElementById('ti-selected-count').innerText = count;
    document.getElementById('ti-btn-generate').disabled = count === 0;
  },

  // ── ฟอร์มกรอกข้อมูลลูกค้า/เอกสาร ─────────────────────────
  async openInvoiceForm() {
    const n = this._selectedIds.size;
    const last = this._lastCust() || {};
    const today = this._date || UI.todayISO();
    openModal('ข้อมูลลูกค้า / เอกสาร', `
      <div class="form-group"><label>นามลูกค้า</label><input type="text" id="ti-cust-name" value="${this.esc(last.name || '')}" placeholder="บริษัท ... จำกัด" /></div>
      <div class="form-group"><label>ที่อยู่</label><textarea id="ti-cust-address" rows="2" placeholder="เลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์">${this.esc(last.address || '')}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>เลขประจำตัวผู้เสียภาษี</label><input type="text" id="ti-cust-taxid" maxlength="13" value="${this.esc(last.taxId || '')}" /></div>
        <div class="form-group"><label>สาขา</label>
          <select id="ti-cust-branch-type" onchange="document.getElementById('ti-cust-branch-no').disabled = this.value !== 'branch'">
            <option value="hq">สำนักงานใหญ่</option>
            <option value="branch">สาขาที่</option>
          </select>
        </div>
        <div class="form-group"><label>รหัสสาขา</label><input type="text" id="ti-cust-branch-no" maxlength="5" placeholder="00001" disabled /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>เลขที่ใบกำกับภาษี</label><input type="text" id="ti-inv-no" value="${this.nextNo('IV', today)}" /></div>
        <div class="form-group"><label>เลขที่ใบเสร็จรับเงิน</label><input type="text" id="ti-rc-no" value="${this.nextNo('RE', today)}" /></div>
        <div class="form-group"><label>วันที่</label><input type="date" id="ti-doc-date" value="${today}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ส่วนลด (%)</label><input type="number" id="ti-discount" min="0" max="100" step="0.01" value="0" /></div>
        <div class="form-group"><label>ภาษีมูลค่าเพิ่ม (%)</label><input type="number" id="ti-vat" min="0" step="0.01" value="${(CONFIG.VAT_RATE || 0.07) * 100}" /></div>
      </div>
      <label style="display:flex;gap:8px;align-items:center;font-size:0.9rem;margin-bottom:12px">
        <input type="checkbox" id="ti-vat-incl" checked /> ราคาสินค้าในบิลรวม VAT แล้ว (ยอดสุทธิ = ยอดในบิล)
      </label>
      <div class="form-group"><label>การชำระเงิน (ใบเสร็จรับเงิน)</label>
        <select id="ti-pay-type" onchange="PAGES['tax-invoice'].onPayTypeChange()">
          <option value="transfer">เงินโอน</option>
          <option value="cash">เงินสด</option>
          <option value="cheque">เช็คธนาคาร</option>
        </select>
      </div>
      <div class="form-row" id="ti-cheque-row" style="display:none">
        <div class="form-group"><label>เช็คเลขที่</label><input type="text" id="ti-chq-no" /></div>
        <div class="form-group"><label>ลงวันที่</label><input type="date" id="ti-chq-date" /></div>
      </div>
      <div class="alert alert-info" style="font-size:0.8rem">รวมรายการคิดเงินจำนวน ${n} รายการ (รวมรายการสินค้าที่เหมือนกันให้อัตโนมัติ)</div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="PAGES['tax-invoice'].generate()">
        <span class="material-icons">print</span> สร้างและดูตัวอย่าง
      </button>
    `, '640px');
  },

  onPayTypeChange() {
    const v = document.getElementById('ti-pay-type').value;
    document.getElementById('ti-cheque-row').style.display = v === 'cheque' ? '' : 'none';
  },

  async generate() {
    const g = id => (document.getElementById(id)?.value || '').trim();
    const cust = {
      name: g('ti-cust-name'),
      address: g('ti-cust-address'),
      taxId: g('ti-cust-taxid'),
      branchType: g('ti-cust-branch-type') || 'hq',
      branchNo: g('ti-cust-branch-no'),
    };
    const meta = {
      invNo: g('ti-inv-no') || this.nextNo('IV', g('ti-doc-date')),
      rcNo: g('ti-rc-no') || this.nextNo('RE', g('ti-doc-date')),
      date: g('ti-doc-date') || this._date || UI.todayISO(),
      discountPct: Math.max(0, Number(g('ti-discount')) || 0),
      vatPct: Math.max(0, Number(g('ti-vat')) || 0),
      vatIncluded: !!document.getElementById('ti-vat-incl')?.checked,
      payType: g('ti-pay-type') || 'transfer',
      chqNo: g('ti-chq-no'),
      chqDate: g('ti-chq-date'),
    };

    try {
      UI.loading(true);
      const [company, items] = await Promise.all([this.getCompany(), this.collectItems()]);
      if (!items.length) throw new Error('ไม่พบรายการสินค้าในบิลที่เลือก');
      this._doc = { cust, meta, company, items, calc: this.calc(items, meta) };
      this._lastCust(cust);
      this.bumpNo(meta.invNo); this.bumpNo(meta.rcNo);
      closeModal();
      this._tab = 'invoice';
      this.showPreview();
    } catch (e) { UI.toast(e.message, 'error'); } finally { UI.loading(false); }
  },

  async collectItems() {
    const all = [];
    for (const bid of Array.from(this._selectedIds)) {
      const detail = await API.getBillingDetail(bid);
      const raw = detail.billing.items;
      const arr = typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw || []);
      all.push(...arr);
    }
    const merged = {};
    all.forEach(it => {
      const sold = Number(it.sold) || 0;
      if (sold <= 0) return;
      const price = Number(it.pricePerUnit) || 0;
      const key = it.productId + '|' + price;
      if (!merged[key]) merged[key] = { ...it, qty: 0, price, amount: 0 };
      merged[key].qty += sold;
    });
    return Object.values(merged).map(it => ({ ...it, amount: this.r2(it.qty * it.price) }));
  },

  // ── คำนวณยอดตามสูตรในไฟล์ Excel ────────────────────────
  //   รวมเงิน → ส่วนลด → มูลค่าหลังหักส่วนลด → VAT → ยอดสุทธิ
  calc(items, m) {
    const total = this.r2(items.reduce((s, it) => s + it.amount, 0));
    const discount = this.r2(total * m.discountPct / 100);
    let afterDiscount, vat, grand;
    if (m.vatIncluded) {
      grand = this.r2(total - discount);
      afterDiscount = this.r2(grand / (1 + m.vatPct / 100));
      vat = this.r2(grand - afterDiscount);
    } else {
      afterDiscount = this.r2(total - discount);
      vat = this.r2(afterDiscount * m.vatPct / 100);
      grand = this.r2(afterDiscount + vat);
    }
    return { total, discount, afterDiscount, vat, grand };
  },

  async getCompany() {
    if (this._company) return this._company;
    try {
      const res = await API.getCompanyInfo();
      this._company = res.companyInfo || {};
    } catch (e) { this._company = {}; }
    // ค่าเริ่มต้น: ใช้เมื่อยังไม่ได้กรอกในเมนู "ข้อมูลบริษัท" (ช่องที่กรอกแล้วจะมาก่อน)
    const def = {
      name: 'ห้างหุ้นส่วนจำกัด เจริญรุ่งเรือง รับทรัพย์ (สำนักงานใหญ่)',
      address: '51/1 ถนนบ้านน้อยประจันตคาม ตำบลอรัญประเทศ อำเภออรัญประเทศ จังหวัดสระแก้ว 27120',
      taxId: '273569000301',
    };
    Object.keys(def).forEach(k => { if (!String(this._company[k] || '').trim()) this._company[k] = def[k]; });
    return this._company;
  },

  // ── เลขที่เอกสาร: IV + ปี พ.ศ. 2 หลัก + เดือน + running 4 หลัก (เช่น IV6910 0001) ──
  nextNo(prefix, iso) {
    const [y, m] = (iso || UI.todayISO()).split('-');
    const stem = prefix + String((Number(y) + 543) % 100).padStart(2, '0') + m;
    let seq = 1;
    try { seq = (Number(localStorage.getItem('sfg_no_' + stem)) || 0) + 1; } catch (e) {}
    return stem + String(seq).padStart(4, '0');
  },
  bumpNo(no) {
    const mt = /^(.*?)(\d{4})$/.exec(no || '');
    if (!mt) return;
    try {
      const cur = Number(localStorage.getItem('sfg_no_' + mt[1])) || 0;
      if (Number(mt[2]) > cur) localStorage.setItem('sfg_no_' + mt[1], String(Number(mt[2])));
    } catch (e) {}
  },
  _lastCust(set) {
    try {
      if (set) { localStorage.setItem('sfg_last_cust', JSON.stringify(set)); return set; }
      return JSON.parse(localStorage.getItem('sfg_last_cust') || 'null');
    } catch (e) { return null; }
  },

  // ── Helpers ───────────────────────────────────────────────
  r2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; },
  esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  money(n) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
  qtyFmt(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); },
  dmy(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${Number(y) + 543}`;
  },

  // ตัวอักษรบาท (เหมือน BAHTTEXT ของ Excel)
  bahtText(amount) {
    const num = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const pos = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
    const readInt = (s) => {
      s = s.replace(/^0+/, '');
      if (!s) return '';
      if (s.length > 6) {
        const head = s.slice(0, s.length - 6), tail = s.slice(-6);
        return readInt(head) + 'ล้าน' + readInt(tail);
      }
      let out = '';
      const len = s.length;
      for (let i = 0; i < len; i++) {
        const d = Number(s[i]), p = len - i - 1;
        if (d === 0) continue;
        if (p === 1) out += (d === 1 ? '' : d === 2 ? 'ยี่' : num[d]) + 'สิบ';
        else if (p === 0 && d === 1 && len > 1 && Number(s[len - 2]) !== 0) out += 'เอ็ด';
        else if (p === 0 && d === 1 && len > 1) out += 'เอ็ด';
        else out += num[d] + pos[p];
      }
      return out;
    };
    const v = Math.abs(this.r2(amount));
    const [bahtS, satS] = v.toFixed(2).split('.');
    const baht = readInt(bahtS), sat = readInt(satS);
    if (!baht && !sat) return 'ศูนย์บาทถ้วน';
    return (baht ? baht + 'บาท' : '') + (sat ? sat + 'สตางค์' : 'ถ้วน');
  },

  // ── CSS ───────────────────────────────────────────────────
  injectPrintStyles() {
    if (document.getElementById('tax-invoice-print-styles')) return;
    const style = document.createElement('style');
    style.id = 'tax-invoice-print-styles';
    style.innerHTML = `
      #ti-print-root { position: fixed; inset: 0; z-index: 9999; background: #525659; overflow: auto; font-family: 'Sarabun', sans-serif; }
      #ti-print-root.hidden { display: none; }
      .ti-toolbar { position: sticky; top: 0; z-index: 2; display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 10px; background: #323639; }
      .ti-toolbar .ti-tab { border: 0; padding: 8px 16px; border-radius: 8px; background: #4a4e52; color: #fff; font: 600 14px 'Sarabun', sans-serif; }
      .ti-toolbar .ti-tab.active { background: #fff; color: #222; }
      .ti-pages { padding: 16px 0 40px; }
      .ti-sheet { width: 210mm; height: 297mm; margin: 0 auto 14px; background: #fff; color: #000; position: relative; box-sizing: border-box; padding: 9mm 10mm 8mm; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,.4); font-size: 9.5pt; line-height: 1.25; page-break-after: always; }
      .ti-sheet * { box-sizing: border-box; }
      .ti-sheet.inv { --c: #8b2a0a; --cb: #c0392b; }
      .ti-sheet.rc  { --c: #800a80; --cb: #6a1b9a; }
      .ti-badge { position: absolute; top: 9mm; right: 10mm; border: 1px solid var(--cb); color: var(--cb); border-radius: 5px; padding: 1px 14px; font-size: 8.5pt; }
      .ti-co { text-align: center; margin-top: 2mm; }
      .ti-co .n1 { font-size: 15pt; font-weight: 700; }
      .ti-co .n2 { font-size: 13pt; font-weight: 700; letter-spacing: .3px; }
      .ti-co .ad { font-size: 8.5pt; margin-top: 1px; }
      .ti-title { width: 78mm; margin: 5mm auto 4mm; border: 1.2px solid var(--cb); border-radius: 7px; text-align: center; padding: 2px 4px; box-shadow: 1.5px 1.5px 0 var(--cb); }
      .ti-title b { display: block; font-size: 12.5pt; }
      .ti-title span { font-size: 8.5pt; font-weight: 600; }
      .ti-head { display: flex; justify-content: space-between; gap: 8mm; font-size: 9pt; }
      .ti-head .l { flex: 1; } .ti-head .r { width: 58mm; }
      .ti-f { display: flex; align-items: flex-end; margin-bottom: 1.5mm; min-height: 5mm; }
      .ti-f .lb { white-space: nowrap; margin-right: 3mm; min-width: 15mm; }
      .ti-f .v { flex: 1; border-bottom: 1px dotted #777; color: #0b57a4; font-weight: 600; padding: 0 2mm; min-height: 4.5mm; }
      .ti-chk { display: inline-block; width: 4mm; height: 4mm; border: 1px solid #000; text-align: center; line-height: 3.4mm; font-size: 9pt; font-weight: 700; margin: 0 1mm; vertical-align: middle; }
      table.ti-tb { width: 100%; border-collapse: collapse; margin-top: 3mm; table-layout: fixed; }
      table.ti-tb th { background: var(--c); color: #fff; border: 1px solid var(--c); padding: 2px 3px; font-weight: 600; font-size: 9pt; }
      table.ti-tb td { border: 1px solid #b9b9b9; padding: 0 3px; height: 5.6mm; font-size: 9pt; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .ti-tb .c { text-align: center; } .ti-tb .rt { text-align: right; }
      .ti-sum { display: flex; margin-top: 2mm; border: 1px solid #000; }
      .ti-sum .words { flex: 1; background: #d0d0d0; padding: 2mm 3mm; display: flex; gap: 4mm; align-items: center; font-weight: 600; font-size: 9.5pt; border-right: 1px solid #000; }
      .ti-sum .words.plain { background: #d0d0d0; }
      .ti-tot { width: 78mm; }
      .ti-tot .row { display: flex; align-items: center; min-height: 8.5mm; border-bottom: 1px solid #000; }
      .ti-tot .row:last-child { border-bottom: 0; }
      .ti-tot .row .lb { width: 44mm; font-size: 8pt; padding: 0 2mm; line-height: 1.15; } .ti-tot .row .lb b { display: block; font-size: 8.5pt; font-weight: 600; }
      .ti-tot .row .pc { width: 12mm; text-align: right; padding-right: 2mm; font-size: 9pt; }
      .ti-tot .row .am { flex: 1; text-align: right; padding: 0 2mm; border-left: 1px solid #000; height: 100%; display: flex; align-items: center; justify-content: flex-end; font-size: 10pt; min-height: 8.5mm; }
      .ti-tot .row.g .am { font-size: 11pt; font-weight: 700; }
      .ti-mid { display: flex; margin-top: 0; }
      .ti-notes { flex: 1; font-size: 7.5pt; padding: 3mm 3mm 0 0; }
      .ti-notes .t { font-size: 8pt; margin-bottom: 1mm; }
      .ti-tot.box { border: 1px solid #000; border-top: 0; }
      .ti-sign { position: absolute; left: 10mm; right: 10mm; bottom: 8mm; display: flex; gap: 0; border: 1px solid #000; height: 27mm; }
      .ti-sign > div { flex: 1; padding: 1.5mm 3mm; font-size: 8.5pt; position: relative; }
      .ti-sign > div + div { border-left: 1px solid #000; }
      .ti-sign .ln { display: flex; align-items: flex-end; gap: 2mm; position: absolute; left: 3mm; right: 3mm; }
      .ti-sign .ln i { flex: 1; border-bottom: 1px dotted #777; height: 1px; }
      .ti-sign .nm { text-align: center; }
      .ti-pay { margin-top: 5mm; font-size: 9.5pt; }
      .ti-pay .r { display: flex; align-items: flex-end; gap: 3mm; margin-bottom: 3mm; min-height: 6mm; }
      .ti-pay .r .a { border-bottom: 1px dotted #777; color: #0b57a4; font-weight: 600; min-width: 34mm; text-align: center; padding: 0 2mm; }
      .ti-pgno { position: absolute; bottom: 3mm; right: 10mm; font-size: 7pt; color: #888; }
      @page { size: A4 portrait; margin: 0; }
      @media print {
        body > *:not(#ti-print-root) { display: none !important; }
        #ti-print-root { position: static !important; overflow: visible !important; background: #fff !important; }
        .ti-toolbar { display: none !important; }
        .ti-pages { padding: 0 !important; }
        .ti-sheet { margin: 0 !important; box-shadow: none !important; }
        .ti-sheet:last-child { page-break-after: auto; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `;
    document.head.appendChild(style);
  },

  // ── ตัวอย่างก่อนพิมพ์ ─────────────────────────────────────
  showPreview() {
    this.injectPrintStyles();
    let root = document.getElementById('ti-print-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'ti-print-root';
      document.body.appendChild(root);
    }
    root.classList.remove('hidden');
    const t = this._tab;
    root.innerHTML = `
      <div class="ti-toolbar">
        <button class="ti-tab ${t === 'invoice' ? 'active' : ''}" onclick="PAGES['tax-invoice'].setTab('invoice')">ใบกำกับภาษี / ส่งสินค้า / แจ้งหนี้ (3 ฉบับ)</button>
        <button class="ti-tab ${t === 'receipt' ? 'active' : ''}" onclick="PAGES['tax-invoice'].setTab('receipt')">ใบเสร็จรับเงิน (2 ฉบับ)</button>
        <button class="btn btn-primary" onclick="window.print()"><span class="material-icons">print</span> พิมพ์ / บันทึก PDF</button>
        <button class="btn btn-secondary" onclick="PAGES['tax-invoice'].closePreview()">ปิด</button>
      </div>
      <div class="ti-pages">${t === 'invoice' ? this.invoicePages() : this.receiptPages()}</div>
    `;
  },
  setTab(t) { this._tab = t; this.showPreview(); },
  closePreview() { document.getElementById('ti-print-root')?.classList.add('hidden'); },

  // ── ส่วนหัวบริษัท (ใช้ร่วม) ──────────────────────────────
  headerHTML(badge) {
    const c = this._doc.company || {};
    const contact = [c.phone ? 'โทร. ' + c.phone : '', c.fax ? 'fax. ' + c.fax : '', c.taxId ? 'เลขประจำตัวผู้เสียภาษี ' + c.taxId : ''].filter(Boolean).join('   ');
    return `
      <div class="ti-badge">${badge}</div>
      <div class="ti-co">
        <div class="n1">${this.esc(c.name || CONFIG.APP_NAME)}</div>
        ${c.nameEn ? `<div class="n2">${this.esc(c.nameEn)}</div>` : ''}
        <div class="ad">${this.esc(c.address || '')}</div>
        <div class="ad">${this.esc(contact)}</div>
      </div>`;
  },

  custBlock(noLabel, no, date) {
    const { cust } = this._doc;
    const hq = cust.branchType !== 'branch';
    return `
      <div class="ti-head">
        <div class="l">
          <div class="ti-f"><span class="lb">นามลูกค้า</span><span class="v">${this.esc(cust.name)}</span></div>
          <div class="ti-f"><span class="lb">ที่อยู่</span><span class="v">${this.esc(cust.address)}</span></div>
        </div>
        <div class="r">
          <div class="ti-f"><span class="lb" style="min-width:10mm">เลขที่</span><span class="v">${this.esc(no)}</span></div>
          <div class="ti-f"><span class="lb" style="min-width:10mm">วันที่</span><span class="v">${this.dmy(date)}</span></div>
        </div>
      </div>
      <div class="ti-f" style="margin-top:1mm">
        <span class="lb" style="min-width:0">เลขประจำตัวผู้เสียภาษี</span><span class="v" style="max-width:38mm;flex:none;min-width:38mm">${this.esc(cust.taxId)}</span>
        <span style="margin-left:6mm"><span class="ti-chk">${hq ? 'X' : ''}</span>สำนักงานใหญ่</span>
        <span style="margin-left:6mm"><span class="ti-chk">${hq ? '' : 'X'}</span>สาขาที่</span>
        <span class="v" style="max-width:20mm;flex:none;min-width:20mm">${hq ? '' : this.esc(cust.branchNo)}</span>
      </div>`;
  },

  // ── ใบกำกับภาษี / ใบส่งสินค้า / ใบแจ้งหนี้ ─────────────────
  invoicePages() {
    const copies = [
      { badge: 'สำหรับลูกค้า', th: 'ใบกำกับภาษี / ใบส่งสินค้า / ใบแจ้งหนี้', en: 'TAX INVOICE / DELIVERY ORDER / INVOICE' },
      { badge: 'สำหรับบริษัท', th: 'สำเนาใบกำกับภาษี / ใบส่งสินค้า / ใบแจ้งหนี้', en: 'COPY TAX INVOICE / DELIVERY ORDER / INVOICE' },
      { badge: 'สำหรับบัญชี', th: 'สำเนาใบกำกับภาษี / ใบส่งสินค้า / ใบแจ้งหนี้', en: 'COPY TAX INVOICE / DELIVERY ORDER / INVOICE' },
    ];
    const { items, meta } = this._doc;
    const chunks = [];
    for (let i = 0; i < items.length; i += this.ROWS_PER_PAGE) chunks.push(items.slice(i, i + this.ROWS_PER_PAGE));
    if (!chunks.length) chunks.push([]);
    let html = '';
    copies.forEach(cp => chunks.forEach((chunk, ci) => {
      html += this.invoiceSheet(cp, chunk, ci * this.ROWS_PER_PAGE, ci === chunks.length - 1, ci + 1, chunks.length);
    }));
    return html;
  },

  invoiceSheet(cp, chunk, offset, isLast, pg, pgs) {
    const { meta, calc, company } = this._doc;
    const blank = Math.max(0, this.ROWS_PER_PAGE - chunk.length);
    const rows = chunk.map((it, i) => `
      <tr>
        <td class="c">${offset + i + 1}</td>
        <td>${this.esc(it.productCode || '')}</td>
        <td title="${this.esc(it.productName || it.productId)}">${this.esc(it.productName || it.productId)}</td>
        <td class="rt">${this.qtyFmt(it.qty)}</td>
        <td class="c">${this.esc(it.unit || '')}</td>
        <td class="rt">${this.money(it.price)}</td>
        <td class="rt">${this.money(it.amount)}</td>
      </tr>`).join('') + Array.from({ length: blank }).map(() => '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('');

    const co = this.esc(company.name || CONFIG.APP_NAME);
    const vatLbl = meta.vatPct;
    const totals = isLast ? `
      <div class="ti-sum">
        <div class="words"><span>ตัวอักษร.</span><span>(${this.bahtText(calc.grand)})</span></div>
        <div class="ti-tot">
          <div class="row"><div class="lb"><b>รวมเงิน</b>TOTAL AMOUNT</div><div class="pc"></div><div class="am">${this.money(calc.total)}</div></div>
        </div>
      </div>
      <div class="ti-mid">
        <div class="ti-notes">
          <div class="t">หมายเหตุ :</div>
          <div>1. กรณีชำระเงินโดยเช็คกรุณาสั่งจ่ายเช็คขีดคร่อมในนาม "${co}" เท่านั้น</div>
          <div>2. สินค้าตามรายการข้างต้นแม้จะได้ส่งมอบให้แก่ผู้ซื้อแล้วก็ยังคงเป็นทรัพย์สินของผู้ขายจนกว่าผู้ซื้อจะได้ชำระเงินเรียบร้อยแล้ว</div>
          <div>3. บริษัทฯ ขอสงวนสิทธิ์ในการแก้ไขใบกำกับภาษีภายใน 7 วัน นับจากวันที่ระบุในใบกำกับภาษี (ผิด ตก ยกเว้น E. &amp; OE.)</div>
        </div>
        <div class="ti-tot box">
          <div class="row"><div class="lb"><b>ส่วนลด</b>DISCOUNT</div><div class="pc">${meta.discountPct ? this.qtyFmt(meta.discountPct) + '%' : ''}</div><div class="am">${this.money(calc.discount)}</div></div>
          <div class="row"><div class="lb"><b>มูลค่าสินค้าหลังหักส่วนลด</b>TOTAL AMOUNT AFTER DISCOUNT</div><div class="pc"></div><div class="am">${this.money(calc.afterDiscount)}</div></div>
          <div class="row"><div class="lb"><b>ภาษีมูลค่าเพิ่ม</b>VAT</div><div class="pc">${this.qtyFmt(vatLbl)}%</div><div class="am">${this.money(calc.vat)}</div></div>
          <div class="row g"><div class="lb"><b>ยอดเงินสุทธิ</b>GRAND TOTAL</div><div class="pc"></div><div class="am">${this.money(calc.grand)}</div></div>
        </div>
      </div>` : `<div style="text-align:right;margin-top:3mm;font-size:9pt">(มีรายการต่อในหน้าถัดไป)</div>`;

    return `
    <div class="ti-sheet inv">
      ${this.headerHTML(cp.badge)}
      <div class="ti-title"><b>${cp.th}</b><span>${cp.en}</span></div>
      ${this.custBlock('เลขที่', meta.invNo, meta.date)}
      <table class="ti-tb">
        <colgroup><col style="width:11mm"><col style="width:28mm"><col><col style="width:19mm"><col style="width:16mm"><col style="width:24mm"><col style="width:28mm"></colgroup>
        <thead><tr><th>ลำดับ</th><th>รหัสสินค้า</th><th>รายละเอียด</th><th>จำนวน</th><th>หน่วย</th><th>ราคา/หน่วย</th><th>จำนวนเงิน</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${totals}
      <div class="ti-sign">
        <div style="flex:1.25">
          <div>ได้รับสินค้าตามรายการข้างบนไว้เรียบร้อยแล้ว</div>
          <div class="ln" style="bottom:9mm"><span>ผู้รับสินค้า</span><i></i></div>
          <div class="ln" style="bottom:3mm"><span>วันที่</span><i></i></div>
        </div>
        <div style="flex:.9">
          <div class="ln" style="bottom:9mm"><span>ผู้ส่งสินค้า</span><i></i></div>
          <div class="ln" style="bottom:3mm"><span>วันที่</span><i></i></div>
        </div>
        <div style="flex:1.05">
          <div class="nm">ในนาม ${co}</div>
          <div class="ln" style="bottom:9mm"><i></i></div>
          <div class="nm" style="position:absolute;left:0;right:0;bottom:3mm">ผู้มีอำนาจลงนาม</div>
        </div>
      </div>
      ${pgs > 1 ? `<div class="ti-pgno">หน้า ${pg}/${pgs}</div>` : ''}
    </div>`;
  },

  // ── ใบเสร็จรับเงิน ────────────────────────────────────────
  receiptPages() {
    const copies = [
      { badge: 'สำหรับลูกค้า', th: 'ใบเสร็จรับเงิน', en: 'RECEIPT' },
      { badge: 'สำหรับบัญชี', th: 'สำเนาใบเสร็จรับเงิน', en: 'COPY RECEIPT' },
    ];
    return copies.map(cp => this.receiptSheet(cp)).join('');
  },

  receiptSheet(cp) {
    const { meta, calc, company } = this._doc;
    const co = this.esc(company.name || CONFIG.APP_NAME);
    const rowsN = 20;
    const rows = `<tr><td class="c">1</td><td class="c">${this.dmy(meta.date)}</td><td class="c">${this.esc(meta.invNo)}</td><td class="rt">${this.money(calc.grand)}</td></tr>` +
      Array.from({ length: rowsN - 1 }).map(() => '<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>').join('');
    const chk = t => `<span class="ti-chk">${meta.payType === t ? 'X' : ''}</span>`;
    const amt = t => meta.payType === t ? this.money(calc.grand) : '';
    return `
    <div class="ti-sheet rc">
      ${this.headerHTML(cp.badge)}
      <div class="ti-title" style="width:48mm"><b>${cp.th}</b><span>${cp.en}</span></div>
      ${this.custBlock('เลขที่', meta.rcNo, meta.date)}
      <table class="ti-tb">
        <colgroup><col style="width:16mm"><col style="width:42mm"><col><col style="width:42mm"></colgroup>
        <thead><tr><th>ลำดับ</th><th>วันที่ใบกำกับภาษี</th><th>เลขที่ใบกำกับภาษี</th><th>จำนวนเงิน</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="ti-sum">
        <div class="words"><span>ตัวอักษร.</span><span>(${this.bahtText(calc.grand)})</span></div>
        <div class="ti-tot" style="width:60mm"><div class="row g"><div class="lb"><b>รวมเงิน</b>TOTAL</div><div class="pc"></div><div class="am">${this.money(calc.grand)}</div></div></div>
      </div>
      <div class="ti-pay">
        <div class="r">${chk('cash')} <span>เงินสด</span> <span class="a">${amt('cash')}</span> <span>บาท</span></div>
        <div class="r">${chk('transfer')} <span>เงินโอน</span> <span class="a">${amt('transfer')}</span> <span>บาท</span></div>
        <div class="r">${chk('cheque')} <span>เช็คธนาคาร</span> <span>เลขที่</span> <span class="a">${meta.payType === 'cheque' ? this.esc(meta.chqNo) : ''}</span></div>
        <div class="r" style="padding-left:20mm"><span>ลงวันที่</span> <span class="a">${meta.payType === 'cheque' ? this.dmy(meta.chqDate) : ''}</span> <span>จำนวนเงิน</span> <span class="a">${amt('cheque')}</span> <span>บาท</span></div>
        <div style="text-align:center;margin-top:6mm;font-size:9pt">กรณีชำระด้วยเช็ค ใบเสร็จฯ นี้จะสมบูรณ์ต่อเมื่อบริษัทฯ ได้รับเงินแล้วเท่านั้น</div>
      </div>
      <div class="ti-sign">
        <div style="flex:1">
          <div class="ln" style="bottom:9mm"><span>ผู้รับเงิน</span><i></i></div>
          <div class="ln" style="bottom:3mm"><span>ลงวันที่</span><i></i></div>
        </div>
        <div style="flex:1">
          <div class="ln" style="bottom:9mm"><span>ผู้รับใบเสร็จ</span><i></i></div>
          <div class="ln" style="bottom:3mm"><span>ลงวันที่</span><i></i></div>
        </div>
        <div style="flex:1">
          <div class="nm">ในนาม ${co}</div>
          <div class="ln" style="bottom:9mm"><i></i></div>
          <div class="nm" style="position:absolute;left:0;right:0;bottom:3mm">ผู้มีอำนาจลงนาม</div>
        </div>
      </div>
    </div>`;
  },
};
