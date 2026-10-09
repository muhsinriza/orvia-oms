'use strict'

const express  = require('express')
const router   = express.Router()
const db       = require('../db')
const { requireAuth } = require('../middleware/auth')

// ─── Puppeteer helpers ────────────────────────────────────────────────────────

async function launchBrowser () {
  const puppeteer = require('puppeteer')
  return puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  })
}

async function htmlToPDF (html) {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.evaluate(() => document.fonts?.ready).catch(() => {})
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
    })
    return pdf
  } finally {
    await browser.close()
  }
}

// ─── Shared constants ─────────────────────────────────────────────────────────

const CO = {
  name:    'ORVİA TROPICAL SEBZE MEYVE SAN. VE TİC. LTD. ŞTİ.',
  short:   'ORVIA TROPICAL',
  address: 'Fener Mah. 1964 Sk. Hacı M Gebizli Sit. D Blok No:6/A No:3, Muratpaşa / Antalya / Türkiye',
  tax:     '6481831271 · Antalya Kurumlar V.D.',
  tel:     '+90 530 552 83 06',
  web:     'www.orviatropical.com · orviaoms.com',
  rep:     'M. Rıza Ağdağ',
  title:   'Director / General Manager',
  bank:        'Türkiye Garanti Bankası A.Ş.',
  bankBranch:  '1128 / FENER MAHALLESİ / ANTALYA',
  bankAddress: 'Çağlayan Mah. Barınaklar Bulvarı No:32, Muratpaşa / Antalya / Türkiye',
  bic:         'TGBATRISXXX',
  usd:         'TR72 0006 2001 1280 0009 0700 75',
  eur:         'TR02 0006 2001 1280 0009 0700 74',
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmtDate (d) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function now () {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtNum (n, dec = 2) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function val (v) { return v || '—' }

// ─── Design System CSS ────────────────────────────────────────────────────────

const CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Inter',sans-serif; font-size:7.5pt; color:#111827; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.page { width:210mm; min-height:297mm; padding:8mm; display:flex; flex-direction:column; }
.page-body { flex:1; display:flex; flex-direction:column; }

/* HEADER */
.doc-header { background:#0a5c3a; color:#fff; padding:5mm 0 4mm; margin-bottom:4mm; border-radius:2px; }
.doc-header-inner { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:4mm; padding:0 5mm; }
.co-name { font-size:8.5pt; font-weight:700; line-height:1.3; }
.co-sub { font-size:6pt; opacity:0.85; margin-top:1mm; }
.doc-title { text-align:center; font-size:14pt; font-weight:800; letter-spacing:0.5px; }
.doc-meta { text-align:right; font-size:7pt; line-height:1.7; }
.doc-num { font-size:9pt; font-weight:700; }

/* INFO GRID */
.info-grid { display:grid; gap:0; margin-bottom:3mm; border:1px solid #e5e7eb; border-radius:2px; overflow:hidden; }
.info-row { display:grid; border-bottom:1px solid #e5e7eb; }
.info-row:last-child { border-bottom:none; }
.info-cell { padding:2mm 3mm; border-right:1px solid #e5e7eb; }
.info-cell:last-child { border-right:none; }
.info-label { font-size:5.5pt; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; color:#6b7280; margin-bottom:0.5mm; }
.info-value { font-size:7.5pt; font-weight:600; color:#111827; line-height:1.3; }
.section-header { background:#0a5c3a; color:#fff; font-size:6.5pt; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; padding:1.5mm 3mm; margin:3mm 0 0; }

/* PARTIES */
.parties { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid #e5e7eb; border-radius:2px; overflow:hidden; margin-bottom:3mm; }
.party-col { padding:3mm; }
.party-col:first-child { border-right:1px solid #e5e7eb; }
.party-label { font-size:6pt; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#6b7280; margin-bottom:1.5mm; padding-bottom:1mm; border-bottom:2px solid #0a5c3a; }
.party-name { font-size:8.5pt; font-weight:700; color:#111827; margin-bottom:1mm; }
.party-detail { font-size:6.5pt; color:#374151; line-height:1.6; }
.india-tag { display:inline-block; background:#eff6ff; border:1px solid #bfdbfe; color:#1d4ed8; font-size:5.5pt; font-weight:600; padding:0.3mm 1.5mm; border-radius:2px; margin-bottom:1mm; }

/* TABLE */
table { width:100%; border-collapse:collapse; margin-bottom:0; }
thead th { background:#0a5c3a; color:#fff; padding:2mm 2.5mm; text-align:left; font-size:6.5pt; font-weight:700; text-transform:uppercase; letter-spacing:0.3px; }
thead th.num { text-align:right; }
tbody tr:nth-child(even) { background:#f9fafb; }
tbody tr td { padding:2mm 2.5mm; font-size:7pt; border-bottom:1px solid #f3f4f6; vertical-align:top; }
tbody tr td.num { text-align:right; font-variant-numeric:tabular-nums; }
.tfoot-row td { background:#e8f5ee; font-weight:700; font-size:7.5pt; padding:2.5mm 2.5mm; border-top:2px solid #0a5c3a; color:#064e32; }
.tfoot-row td.num { text-align:right; }
.table-wrapper { border:1px solid #e5e7eb; border-radius:2px; overflow:hidden; margin-bottom:3mm; }

/* NON-GMO */
.nongmo-box { border:1px solid #bbf7d0; background:#f0fdf4; border-radius:2px; padding:2.5mm 3mm; margin-bottom:3mm; font-size:6.5pt; line-height:1.5; color:#166534; }
.nongmo-box strong { display:block; margin-bottom:0.5mm; font-size:7pt; }

/* BANK */
.bank-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid #e5e7eb; border-radius:2px; overflow:hidden; margin-bottom:3mm; }
.bank-col { padding:3mm; }
.bank-col:first-child { border-right:1px solid #e5e7eb; }
.bank-currency { font-size:7pt; font-weight:700; color:#0a5c3a; margin-bottom:1mm; padding-bottom:1mm; border-bottom:1px solid #e5e7eb; }
.bank-iban { font-size:8pt; font-weight:700; font-family:monospace; letter-spacing:0.5px; color:#111827; margin-bottom:1mm; }
.bank-detail { font-size:6.5pt; color:#374151; line-height:1.6; }

/* ELECTRONIC AUTHORIZATION */
.auth-block { margin-top:4mm; border-radius:2px; overflow:hidden; border:1px solid #d1d5db; border-left:4px solid #0a5c3a; background:#fff; }
.auth-inner { display:grid; grid-template-columns:auto 1px 1fr 1px auto; align-items:stretch; }
.auth-divider { background:#e5e7eb; }
.auth-signatory { padding:4mm 5mm; min-width:48mm; }
.auth-sig-eyebrow { font-size:5pt; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#0a5c3a; margin-bottom:3mm; }
.auth-sig-name { font-size:10pt; font-weight:800; color:#111827; letter-spacing:-0.2px; margin-bottom:1mm; }
.auth-sig-role { font-size:6.5pt; font-weight:500; color:#374151; line-height:1.5; }
.auth-sig-line { width:32mm; height:0.4mm; background:#0a5c3a; margin:3mm 0 2mm; opacity:0.35; }
.auth-declaration { padding:4mm 5mm; }
.auth-decl-title { font-size:5pt; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#6b7280; margin-bottom:2.5mm; }
.auth-decl-text { font-size:6pt; color:#374151; line-height:1.75; }
.auth-decl-text + .auth-decl-text { margin-top:1.5mm; }
.auth-stamp { padding:3mm 5mm; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:38mm; background:#f9fafb; }
.auth-stamp-year { font-size:5pt; color:#6b7280; margin-top:1.5mm; }

/* T&C */
.tc-grid { display:grid; grid-template-columns:1fr 1fr; gap:2mm 4mm; margin-bottom:3mm; }
.tc-item { font-size:6pt; line-height:1.5; }
.tc-num { font-weight:700; color:#0a5c3a; }

/* PAGE FOOTER */
.page-footer { margin-top:3mm; }
.page-footer-inner { background:#0a5c3a; border-radius:2px; display:grid; grid-template-columns:auto 1fr auto; align-items:center; overflow:hidden; }
.page-footer-logo { padding:2.5mm 5mm; font-size:10pt; font-weight:800; color:#fff; letter-spacing:4px; border-right:1px solid rgba(255,255,255,0.2); white-space:nowrap; }
.page-footer-text { padding:2.5mm 4mm; font-size:5.5pt; color:rgba(255,255,255,0.65); text-align:center; line-height:1.8; }
.page-footer-right { padding:2.5mm 5mm; font-size:5.5pt; color:rgba(255,255,255,0.65); text-align:right; line-height:1.8; border-left:1px solid rgba(255,255,255,0.2); white-space:nowrap; }

/* PACKAGE STRIP */
.pkg-strip { background:#f0fdf4; border:1px solid #bbf7d0; display:flex; gap:0; border-radius:2px; overflow:hidden; margin-bottom:3mm; }
.pkg-item { flex:1; padding:2.5mm 3mm; border-right:1px solid #bbf7d0; }
.pkg-item:last-child { border-right:none; }
.pkg-item .pkg-lbl { font-size:5pt; font-weight:600; color:#064e32; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:1mm; }
.pkg-item .pkg-val { font-size:7.5pt; font-weight:700; color:#0a5c3a; }

/* REQUIRED DOCS */
.doc-badge { display:inline-block; border:1px solid #86efac; background:#f0fdf4; color:#166534; font-size:5.5pt; font-weight:600; padding:0.5mm 2mm; border-radius:2px; margin:1mm 1mm 0 0; }
.doc-badges-wrap { padding:2.5mm 3mm; border:1px solid #e5e7eb; border-radius:2px; margin-bottom:3mm; }

/* NOTES */
.notes-box { border:1px solid #e5e7eb; border-radius:2px; padding:2.5mm 3mm; margin-bottom:3mm; font-size:7pt; color:#374151; line-height:1.6; }

/* PACKING LIST TABLE (static) */
.pl-table { width:100%; border-collapse:collapse; }
.pl-table thead th { background:#0a5c3a; color:#fff; padding:2mm 2.5mm; text-align:left; font-size:6.5pt; font-weight:700; text-transform:uppercase; letter-spacing:0.3px; }
.pl-table thead th.r { text-align:right; }
.pl-table tbody td { padding:2mm 2.5mm; font-size:7pt; border-bottom:1px solid #f3f4f6; vertical-align:top; }
.pl-table tbody td.r { text-align:right; font-variant-numeric:tabular-nums; }
.pl-table tbody tr:nth-child(even) { background:#f9fafb; }
.pl-table tfoot td { background:#e8f5ee; font-weight:700; font-size:7.5pt; padding:2.5mm 2.5mm; border-top:2px solid #0a5c3a; color:#064e32; }
.pl-table tfoot td.r { text-align:right; }
`

// ─── Shared template helpers ──────────────────────────────────────────────────

function wrap (body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
${CSS}
</style></head><body>
<div class="page">
  <div class="page-body">${body}</div>
  <div class="page-footer">
    <div class="page-footer-inner">
      <div class="page-footer-logo">ORVIA</div>
      <div class="page-footer-text">
        ${CO.name}<br>
        ${CO.address}
      </div>
      <div class="page-footer-right">WhatsApp: +90 530 552 83 06<br>Direct: +90 532 703 55 07<br>orviatropical.com &nbsp;·&nbsp; orviaoms.com</div>
    </div>
  </div>
</div>
</body></html>`
}

function headerHTML (docType, docNum, date, extra) {
  extra = extra || ''
  return `
<div class="doc-header">
  <div class="doc-header-inner">
    <div>
      <div class="co-name">${CO.short}</div>
      <div class="co-sub">${CO.address}</div>
      <div class="co-sub">${CO.tel} &nbsp;·&nbsp; ${CO.web}</div>
    </div>
    <div class="doc-title">${docType}</div>
    <div class="doc-meta">
      <div class="doc-num">${docNum}</div>
      <div>${date}</div>
      ${extra}
    </div>
  </div>
</div>`
}

function partiesHTML (order, customer, showIndiaFields) {
  showIndiaFields = showIndiaFields || false
  const indiaFields = showIndiaFields ? `
    ${customer.gst_no ? `<div style="margin-top:1mm;"><span class="india-tag">GST</span> <span style="font-size:6.5pt;font-weight:600;">${customer.gst_no}</span></div>` : ''}
    ${customer.iec_no ? `<div style="margin-top:0.5mm;"><span class="india-tag">IEC</span> <span style="font-size:6.5pt;font-weight:600;">${customer.iec_no}</span></div>` : ''}
    ${customer.pan_no ? `<div style="margin-top:0.5mm;"><span class="india-tag">PAN</span> <span style="font-size:6.5pt;font-weight:600;">${customer.pan_no}</span></div>` : ''}
    ${customer.fssai_no ? `<div style="margin-top:0.5mm;"><span class="india-tag">FSSAI</span> <span style="font-size:6.5pt;font-weight:600;">${customer.fssai_no}</span></div>` : ''}
  ` : ''
  return `
<div class="parties">
  <div class="party-col">
    <div class="party-label">Seller / Exporter</div>
    <div class="party-name">${CO.name}</div>
    <div class="party-detail">
      ${CO.address}<br>
      Tax ID: ${CO.tax}<br>
      Tel: ${CO.tel}<br>
      ${CO.web}
    </div>
  </div>
  <div class="party-col">
    <div class="party-label">Buyer / Importer</div>
    <div class="party-name">${val(customer.name)}</div>
    <div class="party-detail">
      ${[customer.address, customer.country].filter(Boolean).join(', ')}
      ${customer.contact_name ? `<br>Contact: ${customer.contact_name}` : ''}
      ${customer.email ? `<br>${customer.email}` : ''}
      ${customer.phone ? `<br>${customer.phone}` : ''}
    </div>
    ${showIndiaFields ? `<div>${indiaFields}</div>` : ''}
  </div>
</div>`
}

function partiesPOHTML (po) {
  return `
<div class="parties">
  <div class="party-col">
    <div class="party-label">Buyer / Importer</div>
    <div class="party-name">${CO.name}</div>
    <div class="party-detail">
      ${CO.address}<br>
      Tax ID: ${CO.tax}<br>
      Tel: ${CO.tel}<br>
      ${CO.web}
    </div>
  </div>
  <div class="party-col">
    <div class="party-label">Supplier / Exporter</div>
    <div class="party-name">${val(po.supplier_name)}</div>
    <div class="party-detail">
      ${[po.supplier_address, po.supplier_country].filter(Boolean).join(', ')}
    </div>
  </div>
</div>`
}

function shipmentInfoHTML (so) {
  return `
<div class="section-header">Shipment Details</div>
<div class="info-grid" style="margin-bottom:3mm">
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">SA Number</div><div class="info-value">${val(so.sa_number || so.party_no)}</div></div>
    <div class="info-cell"><div class="info-label">Invoice No</div><div class="info-value">${val(so.invoice_no || so.party_no)}</div></div>
    <div class="info-cell"><div class="info-label">Lot / Party No</div><div class="info-value">${val(so.lot_no)}</div></div>
    <div class="info-cell"><div class="info-label">Shipment Date</div><div class="info-value">${fmtDate(so.shipment_date)}</div></div>
  </div>
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Port of Loading</div><div class="info-value">${val(so.port_loading)}</div></div>
    <div class="info-cell"><div class="info-label">Port of Discharge</div><div class="info-value">${val(so.port_discharge)}</div></div>
    <div class="info-cell"><div class="info-label">Incoterm</div><div class="info-value">${val(so.incoterm)}</div></div>
    <div class="info-cell"><div class="info-label">Transport Mode</div><div class="info-value">${val(so.transport_mode)}</div></div>
  </div>
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Payment Terms</div><div class="info-value">${val(so.payment_term)}</div></div>
    <div class="info-cell"><div class="info-label">Payment Method</div><div class="info-value">${val(so.payment_method)}</div></div>
    <div class="info-cell"><div class="info-label">Currency</div><div class="info-value">${val(so.currency)}</div></div>
    <div class="info-cell"><div class="info-label">Delivery Date</div><div class="info-value">${fmtDate(so.delivery_date)}</div></div>
  </div>
  ${(so.container_number || so.vessel_name || so.seawaybill_number || so.tracking_number) ? `
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Container No</div><div class="info-value">${val(so.container_number)}</div></div>
    <div class="info-cell"><div class="info-label">Vessel Name</div><div class="info-value">${val(so.vessel_name)}</div></div>
    <div class="info-cell"><div class="info-label">Sea Waybill No</div><div class="info-value">${val(so.seawaybill_number)}</div></div>
    <div class="info-cell"><div class="info-label">ETD / ETA</div><div class="info-value">${fmtDate(so.etd)} / ${fmtDate(so.eta)}</div></div>
  </div>` : ''}
</div>`
}

function invoiceGoodsTableHTML (orderItems, so) {
  const currency = so.currency || 'USD'
  const sym = currency === 'EUR' ? '€' : '$'
  let totalNet = 0, totalGross = 0, totalAmt = 0, totalBoxes = 0

  const rows = orderItems.map((it, i) => {
    const bw    = Number(it.box_weight_kg || 0)
    const qty   = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
    const net   = Number(it.quantity_kg || 0)
    const gross = qty * bw * 1.05
    const price = Number(it.price_per_unit || 0)
    const amount = (it.sell_by || 'box') === 'kg' ? price * net : price * qty
    const unitLabel = (it.sell_by || 'box') === 'kg' ? '/kg' : '/box'
    totalNet += net; totalGross += gross; totalAmt += amount; totalBoxes += qty
    return `<tr>
      <td>${i + 1}</td>
      <td>${val(it.product_name)}</td>
      <td>${[it.variety, it.caliber].filter(Boolean).join(' / ') || '—'}</td>
      <td>${val(it.origin)}</td>
      <td>${val(it.box_type)}</td>
      <td class="num">${fmtNum(qty, 0)}</td>
      <td class="num">${fmtNum(net)}</td>
      <td class="num">${fmtNum(gross)}</td>
      <td class="num">${sym}${fmtNum(price)}<span style="font-size:5pt;color:#6b7280;">${unitLabel}</span></td>
      <td class="num">${sym}${fmtNum(amount)}</td>
    </tr>`
  }).join('')

  return `
<div class="section-header">Description of Goods</div>
<div class="table-wrapper">
<table>
  <thead><tr>
    <th style="width:4%">#</th>
    <th>Product</th>
    <th style="width:14%">Variety / Caliber</th>
    <th style="width:8%">Origin</th>
    <th style="width:8%">Box Type</th>
    <th class="num" style="width:6%">Boxes</th>
    <th class="num" style="width:9%">Net KG</th>
    <th class="num" style="width:9%">Gross KG</th>
    <th class="num" style="width:10%">Unit Price</th>
    <th class="num" style="width:10%">Amount</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tr class="tfoot-row">
    <td colspan="5"><strong>TOTALS</strong></td>
    <td class="num">${fmtNum(totalBoxes, 0)} Boxes</td>
    <td class="num">${fmtNum(totalNet)} KG</td>
    <td class="num">${fmtNum(totalGross)} KG</td>
    <td class="num"></td>
    <td class="num">${sym}${fmtNum(totalAmt)}</td>
  </tr>
</table>
</div>`
}

function saGoodsTableHTML (orderItems, so) {
  const currency = so.currency || 'USD'
  const sym = currency === 'EUR' ? '€' : '$'
  let totalNet = 0, totalGross = 0, totalAmt = 0, totalBoxes = 0

  const rows = orderItems.map((it, i) => {
    const bw      = Number(it.box_weight_kg || so.box_weight_kg || 0)
    const itBoxes = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
    const itNet   = Number(it.quantity_kg || 0)
    const itGross = itBoxes * bw * 1.05
    const itValue = itBoxes * Number(it.price_per_unit || 0)
    const prodName = it.product_name || so.product_name
    totalNet += itNet; totalGross += itGross; totalAmt += itValue; totalBoxes += itBoxes
    return `<tr>
      <td>${i + 1}</td>
      <td>${val(prodName)}</td>
      <td>${val(it.variety)}</td>
      <td>${val(it.caliber)}</td>
      <td>${val(it.origin)}</td>
      <td>${val(it.box_type || so.box_type)}</td>
      <td class="num">${fmtNum(itBoxes, 0)}</td>
      <td class="num">${fmtNum(itNet)}</td>
      <td class="num">${fmtNum(itGross)}</td>
      <td class="num">${sym}${fmtNum(it.price_per_unit)}/box</td>
      <td class="num">${sym}${fmtNum(itValue)}</td>
    </tr>`
  }).join('')

  return `
<div class="section-header">Goods Specification</div>
<div class="table-wrapper">
<table>
  <thead><tr>
    <th style="width:4%">#</th>
    <th>Product</th>
    <th style="width:10%">Variety</th>
    <th style="width:8%">Caliber</th>
    <th style="width:8%">Origin</th>
    <th style="width:9%">Box Type</th>
    <th class="num" style="width:6%">Boxes</th>
    <th class="num" style="width:8%">Net KG</th>
    <th class="num" style="width:9%">Gross KG</th>
    <th class="num" style="width:10%">Unit Price</th>
    <th class="num" style="width:10%">Total Value</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tr class="tfoot-row">
    <td colspan="6"><strong>TOTAL CONTRACT VALUE</strong></td>
    <td class="num">${fmtNum(totalBoxes, 0)}</td>
    <td class="num">${fmtNum(totalNet)}</td>
    <td class="num">${fmtNum(totalGross)}</td>
    <td class="num"></td>
    <td class="num">${sym}${fmtNum(totalAmt)}</td>
  </tr>
</table>
</div>`
}

function bankHTML () {
  return `
<div class="section-header">Banking Details</div>
<div class="bank-grid">
  <div class="bank-col">
    <div class="bank-currency">USD Account</div>
    <div class="bank-iban">${CO.usd}</div>
    <div class="bank-detail">
      <strong>${CO.bank}</strong><br>
      Branch: ${CO.bankBranch}<br>
      ${CO.bankAddress}<br>
      BIC / SWIFT: ${CO.bic}
    </div>
  </div>
  <div class="bank-col">
    <div class="bank-currency">EUR Account</div>
    <div class="bank-iban">${CO.eur}</div>
    <div class="bank-detail">
      <strong>${CO.bank}</strong><br>
      Branch: ${CO.bankBranch}<br>
      ${CO.bankAddress}<br>
      BIC / SWIFT: ${CO.bic}
    </div>
  </div>
</div>`
}

function sigHTML (showBuyer, electronic) {
  showBuyer = showBuyer || false
  electronic = electronic || false

  // Non-electronic (standard sig boxes for other docs)
  if (!electronic) {
    const cols = showBuyer ? '1fr 1fr' : '1fr 2fr'
    const buyerCol = showBuyer ? `
      <div style="padding:4mm;border-left:1px solid #e5e7eb;">
        <div style="font-size:5.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280;margin-bottom:8mm;">Buyer / Authorized Signature</div>
        <div style="font-size:9pt;font-weight:700;color:#111827;margin-bottom:0.5mm;">_______________________</div>
        <div style="font-size:6.5pt;color:#374151;">Name &amp; Title</div>
      </div>` : ''
    return `
<div style="border:1px solid #e5e7eb;border-radius:2px;overflow:hidden;margin-top:4mm;display:grid;grid-template-columns:${cols};">
  <div style="padding:4mm;border-top:3px solid #0a5c3a;">
    <div style="font-size:5.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280;margin-bottom:8mm;">Seller / Authorized Signature</div>
    <div style="font-size:9pt;font-weight:700;color:#111827;margin-bottom:0.5mm;">${CO.rep}</div>
    <div style="font-size:6.5pt;color:#374151;">${CO.title} &nbsp;·&nbsp; ${CO.short}</div>
  </div>
  ${buyerCol}
</div>`
  }

  // Electronic authorization block — letterhead / corporate signature style
  const year = new Date().getFullYear()
  return `
<div class="auth-block">
  <div class="auth-inner">
    <div class="auth-signatory">
      <div class="auth-sig-eyebrow">Authorized Signatory</div>
      <div class="auth-sig-name">${CO.rep}</div>
      <div class="auth-sig-role">${CO.title}</div>
      <div class="auth-sig-role">${CO.short}</div>
      <div class="auth-sig-line"></div>
      <div style="font-size:5pt;color:#6b7280;">Electronically signed &nbsp;·&nbsp; ${year}</div>
    </div>
    <div class="auth-divider"></div>
    <div class="auth-declaration">
      <div class="auth-decl-title">Electronic Document Declaration</div>
      <div class="auth-decl-text">
        Bu belge <strong style="color:#111827;">Orvia OMS</strong> platformu tarafından elektronik olarak oluşturulmuş ve yetkilendirilmiştir.
        El yazısı imza aranmaksızın geçerlidir.
      </div>
      <div class="auth-decl-text">
        This document has been electronically generated and authorized by the <strong style="color:#111827;">Orvia OMS</strong> platform.
        Valid without a handwritten signature.
      </div>
    </div>
    <div class="auth-divider"></div>
    <div class="auth-stamp">
      <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        <!-- Outer ring -->
        <circle cx="55" cy="55" r="52" stroke="#0a5c3a" stroke-width="1.8"/>
        <!-- Inner ring -->
        <circle cx="55" cy="55" r="43" stroke="#0a5c3a" stroke-width="0.8" stroke-dasharray="2 2"/>
        <!-- Company name arc — top (ORVİA TROPICAL SEBZE MEYVE SAN. VE TİC. LTD. ŞTİ.) -->
        <path id="topArc" d="M 10,25 A 51,51 0 0,1 100,25" fill="none"/>
        <text font-size="4.5" font-weight="700" letter-spacing="0.2" fill="#0a5c3a" font-family="Inter,Arial,sans-serif">
          <textPath href="#topArc" startOffset="50%" text-anchor="middle">ORVİA TROPICAL SEBZE MEYVE SAN. VE TİC. LTD. ŞTİ.</textPath>
        </text>
        <!-- Bottom arc — ANTALYA · TÜRKİYE -->
        <path id="botArc" d="M 12,88 A 48,48 0 0,0 98,88" fill="none"/>
        <text font-size="5" font-weight="600" letter-spacing="0.8" fill="#0a5c3a" font-family="Inter,Arial,sans-serif">
          <textPath href="#botArc" startOffset="50%" text-anchor="middle">ANTALYA  ·  TÜRKİYE</textPath>
        </text>
        <!-- Divider lines -->
        <line x1="24" y1="37" x2="86" y2="37" stroke="#0a5c3a" stroke-width="0.6"/>
        <line x1="24" y1="75" x2="86" y2="75" stroke="#0a5c3a" stroke-width="0.6"/>
        <!-- Tax No above star -->
        <text x="55" y="52" text-anchor="middle" font-size="5.5" font-weight="600" fill="#0a5c3a" font-family="Inter,Arial,sans-serif">TAX NO: 6481831271</text>
        <!-- Center star -->
        <text x="55" y="69" text-anchor="middle" font-size="20" fill="#0a5c3a" font-family="serif">✦</text>
      </svg>
      <div class="auth-stamp-year">orviaoms.com</div>
    </div>
  </div>
</div>`
}

function nongmoHTML () {
  return `<div class="nongmo-box">
    <strong>NON-GMO DECLARATION</strong>
    We hereby declare that the goods described in this document are Non-Genetically Modified Organisms (Non-GMO).
    The products have not been produced using genetic engineering techniques and comply with applicable Non-GMO standards.
  </div>`
}

function tcGridHTML (clauses) {
  return `<div class="tc-grid">${clauses.map(c => `
    <div class="tc-item"><span class="tc-num">${c.num}. ${c.title}:</span> ${c.body}</div>
  `).join('')}</div>`
}

const SA_CLAUSES = [
  { num: 1, title: 'Governing Law', body: 'This agreement is governed by Turkish law. Any disputes shall be resolved in the courts of Antalya, Türkiye.' },
  { num: 2, title: 'Quality & Inspection', body: 'Goods shall conform to export-grade standards. Buyer may inspect upon arrival. Claims must be filed within 5 days of receipt with photographic evidence.' },
  { num: 3, title: 'Delivery & Risk', body: 'Risk of loss transfers to Buyer at the delivery point per agreed Incoterm. Seller is not liable for delays caused by force majeure events.' },
  { num: 4, title: 'Payment', body: 'Payment shall be made per the terms stated above. Overdue amounts attract interest at 1.5% per month. Seller reserves title until full payment.' },
  { num: 5, title: 'Force Majeure', body: 'Neither party shall be liable for delays caused by events beyond reasonable control, including natural disasters, pandemics, strikes, or government restrictions.' },
  { num: 6, title: 'Documentation', body: 'Seller shall provide all agreed shipping documents within 5 business days of vessel departure. Originals dispatched via courier where required.' },
  { num: 7, title: 'Phytosanitary Compliance', body: 'All goods comply with import regulations of the destination country. Seller warrants goods are free from pests and diseases at time of export.' },
  { num: 8, title: 'Entire Agreement', body: 'This document constitutes the entire agreement between the parties and supersedes all prior negotiations. Amendments must be in writing and signed by both parties.' },
]

const PO_CLAUSES = [
  { num: 1, title: 'Acceptance', body: 'This Purchase Order constitutes a binding offer. Supplier acceptance (written or by commencement of performance) forms a contract under these terms.' },
  { num: 2, title: 'Quantity & Quality', body: 'Goods must match the specification above. Shortfalls exceeding 5% or quality deviations entitle Buyer to price adjustment or rejection.' },
  { num: 3, title: 'Delivery', body: 'Goods must be shipped by the stated shipment date. Supplier must notify Buyer immediately of any anticipated delay.' },
  { num: 4, title: 'Documentation', body: 'Supplier shall provide: commercial invoice, packing list, phytosanitary certificate, and certificate of origin within 3 business days of shipment.' },
  { num: 5, title: 'Payment', body: 'Payment shall be made per the agreed terms following receipt and verification of compliant shipping documents and goods.' },
  { num: 6, title: 'Compliance', body: 'Supplier warrants compliance with all applicable export regulations, phytosanitary standards, and labelling requirements for the destination country.' },
  { num: 7, title: 'Force Majeure', body: 'Neither party shall be liable for delays caused by events beyond reasonable control, provided prompt written notice is given.' },
  { num: 8, title: 'Governing Law', body: 'This PO is governed by Turkish law. Any disputes shall be resolved in the courts of Antalya, Türkiye unless otherwise agreed in writing.' },
]

// ─── Route: Commercial Invoice ────────────────────────────────────────────────

router.get('/invoice/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT so.*,
             c.name     AS customer_name,
             c.address  AS customer_address,
             c.country  AS customer_country,
             c.gst_no   AS customer_gst_no,
             c.iec_no   AS customer_iec_no,
             c.pan_no   AS customer_pan_no,
             c.fssai_no AS customer_fssai_no,
             p.name     AS product_name
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      LEFT JOIN products  p ON p.id = so.product_id
      WHERE so.id = $1
    `, [req.params.id])

    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    const so = rows[0]

    // Load multi-line items (fall back to legacy single-row if none)
    let orderItems = []
    try {
      const itemsRes = await db.query(`
        SELECT soi.*, p.name AS product_name
        FROM sales_order_items soi
        LEFT JOIN products p ON p.id::text = soi.product_id::text
        WHERE soi.sales_order_id = $1
        ORDER BY soi.sort_order
      `, [req.params.id])
      orderItems = itemsRes.rows
    } catch (_) {}
    if (orderItems.length === 0) {
      orderItems = [{
        product_name:   so.product_name,
        variety:        so.variety,
        caliber:        so.caliber,
        origin:         so.origin,
        quantity_kg:    so.quantity_kg,
        price_per_unit: so.price_per_unit,
        box_type:       so.box_type,
        box_weight_kg:  so.box_weight_kg,
        sell_by:        so.sell_by,
      }]
    }

    const isIndia = (so.customer_country || '').toLowerCase().includes('india')
    const customer = {
      name:     so.customer_name,
      address:  so.customer_address,
      country:  so.customer_country,
      gst_no:   so.customer_gst_no,
      iec_no:   so.customer_iec_no,
      pan_no:   so.customer_pan_no,
      fssai_no: so.customer_fssai_no,
    }

    // India regulatory section
    const indiaRegSection = isIndia && (so.customer_gst_no || so.customer_iec_no || so.customer_pan_no || so.customer_fssai_no) ? `
<div class="section-header">Buyer Regulatory Details (India)</div>
<div class="info-grid" style="margin-bottom:3mm">
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr;background:#eff6ff;">
    <div class="info-cell"><div class="info-label" style="color:#1e40af;">GST No</div><div class="info-value" style="color:#1e3a8a;">${so.customer_gst_no || '—'}</div></div>
    <div class="info-cell"><div class="info-label" style="color:#1e40af;">IEC No</div><div class="info-value" style="color:#1e3a8a;">${so.customer_iec_no || '—'}</div></div>
    <div class="info-cell"><div class="info-label" style="color:#1e40af;">PAN No</div><div class="info-value" style="color:#1e3a8a;">${so.customer_pan_no || '—'}</div></div>
    <div class="info-cell"><div class="info-label" style="color:#1e40af;">FSSAI No</div><div class="info-value" style="color:#1e3a8a;">${so.customer_fssai_no || '—'}</div></div>
  </div>
</div>` : ''

    const qualitySection = so.quality_notes ? `
<div class="section-header">Quality Notes</div>
<div class="notes-box">${so.quality_notes}</div>` : ''

    const html = wrap(`
${headerHTML('COMMERCIAL INVOICE', val(so.invoice_no || so.party_no), fmtDate(so.shipment_date || new Date()))}
${partiesHTML(so, customer, false)}
${indiaRegSection}
${shipmentInfoHTML(so)}
${invoiceGoodsTableHTML(orderItems, so)}
${qualitySection}
${bankHTML()}
${sigHTML(false, true)}
`)

    const pdf = await htmlToPDF(html)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Invoice_${so.party_no}.pdf"`,
    })
    res.send(pdf)
  } catch (e) {
    console.error('[PDF] invoice error:', e)
    res.status(500).json({ error: 'PDF oluşturulamadı' })
  }
})

// ─── Route: Packing List Editor (interactive HTML page) ──────────────────────

router.get('/packing-list/:id/edit', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT so.*,
             c.name    AS customer_name,
             c.address AS customer_address,
             c.country AS customer_country,
             p.name    AS product_name
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      LEFT JOIN products  p ON p.id = so.product_id
      WHERE so.id = $1
    `, [req.params.id])

    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    const so = rows[0]

    let orderItems = []
    try {
      const itemsRes = await db.query(`
        SELECT soi.*, p.name AS product_name
        FROM sales_order_items soi
        LEFT JOIN products p ON p.id::text = soi.product_id::text
        WHERE soi.sales_order_id = $1
        ORDER BY soi.sort_order
      `, [req.params.id])
      orderItems = itemsRes.rows
    } catch (_) {}
    if (orderItems.length === 0) {
      orderItems = [{
        product_name:   so.product_name,
        variety:        so.variety,
        caliber:        so.caliber,
        origin:         so.origin,
        quantity_kg:    so.quantity_kg,
        price_per_unit: so.price_per_unit,
        box_type:       so.box_type,
        box_weight_kg:  so.box_weight_kg,
      }]
    }

    const palletCount = so.pallets || 1
    const totalBoxes  = orderItems.reduce((s, it) => {
      const bw = Number(it.box_weight_kg || 0)
      return s + (bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0)
    }, 0)

    const useItemRows = orderItems.length > 1
    let rowsInitJS = ''
    if (useItemRows) {
      rowsInitJS = orderItems.map((it, idx) => {
        const bw    = Number(it.box_weight_kg || 0)
        const b     = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
        const net   = Number(it.quantity_kg || 0)
        const gross = b * bw * 1.05
        return JSON.stringify({ label: `Item ${idx + 1}`, product: it.product_name || '—', variety: [it.variety, it.caliber].filter(Boolean).join(' / ') || '—', origin: it.origin || '—', boxType: it.box_type || '—', boxes: b, netBox: bw, net, gross })
      }).join(',\n')
    } else {
      const boxesPerPallet = Math.floor(totalBoxes / palletCount)
      const rem = totalBoxes % palletCount
      const bw = Number(orderItems[0]?.box_weight_kg || 0)
      rowsInitJS = Array.from({ length: palletCount }, (_, i) => {
        const pb = i < rem ? boxesPerPallet + 1 : boxesPerPallet
        return JSON.stringify({ label: `Pallet ${i+1}`, product: orderItems[0]?.product_name || '—', variety: [orderItems[0]?.variety, orderItems[0]?.caliber].filter(Boolean).join(' / ') || '—', origin: orderItems[0]?.origin || '—', boxType: orderItems[0]?.box_type || '—', boxes: pb, netBox: bw, net: pb * bw, gross: pb * bw * 1.05 })
      }).join(',\n')
    }

    const editorHTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Packing List — ${so.party_no || so.sa_number || 'Edit'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif; background: #f1f5f9; min-height: 100vh; }
  .toolbar { background: #0a5c3a; color: #fff; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
  .toolbar-left { display: flex; align-items: center; gap: 12px; }
  .toolbar h1 { font-size: 14pt; font-weight: 800; letter-spacing: -0.5px; }
  .toolbar h1 span { color: #6ee7b7; font-weight: 300; letter-spacing: 1px; }
  .toolbar-subtitle { font-size: 7pt; color: #a7f3d0; margin-top: 1px; }
  .toolbar-right { display: flex; gap: 8px; }
  .btn { padding: 6px 14px; border-radius: 4px; font-size: 8.5pt; font-weight: 600; cursor: pointer; border: none; }
  .btn-outline { background: transparent; border: 1px solid #6ee7b7; color: #6ee7b7; }
  .btn-outline:hover { background: rgba(110,231,183,0.1); }
  .btn-primary { background: #fff; color: #0a5c3a; }
  .btn-primary:hover { background: #f0fdf4; }
  .btn-danger { background: transparent; border: 1px solid #fca5a5; color: #fca5a5; }
  .btn-danger:hover { background: rgba(252,165,165,0.1); }

  .page { max-width: 820px; margin: 20px auto; padding: 0 16px 40px; }

  /* Header card */
  .doc-hdr { background: #0a5c3a; border-radius: 6px 6px 0 0; display: flex; min-height: 56px; }
  .hdr-brand { padding: 10px 14px; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
  .hdr-logo { color: #fff; font-size: 18pt; font-weight: 800; letter-spacing: -0.5px; }
  .hdr-logo span { color: #6ee7b7; font-weight: 300; letter-spacing: 1px; }
  .hdr-co { color: #a7f3d0; font-size: 5pt; line-height: 1.5; margin-top: 2px; }
  .hdr-right { background: #064e32; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; padding: 10px 14px; border-radius: 0 6px 0 0; min-width: 175px; }
  .hdr-docno { color: #fff; font-size: 16pt; font-weight: 800; }
  .hdr-date { color: #6ee7b7; font-size: 6pt; margin-top: 3px; }
  .hdr-type { color: #a7f3d0; font-size: 5.5pt; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 2px; }

  .card { background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 12px 14px; }
  .card:last-child { border-radius: 0 0 6px 6px; }
  .card + .card { border-top: none; }

  .sec-hdr { font-size: 5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 8px; color: #fff; background: #0a5c3a; margin: 10px -14px 8px; }
  .sec-hdr.slate { background: #334155; }

  .buyer-grid { display: flex; gap: 24px; }
  .buyer-col { flex: 1; }
  .buyer-col.narrow { flex: 0 0 200px; }
  .lbl { font-size: 5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1d4ed8; margin-bottom: 3px; }
  .val-static { font-size: 8.5pt; font-weight: 700; color: #1a1a1a; }
  .val-detail { font-size: 6pt; color: #475569; line-height: 1.65; margin-top: 2px; }

  /* Editable field */
  .ef { border: 1px dashed #cbd5e1; border-radius: 3px; padding: 2px 5px; background: #f8fafc; cursor: text; min-width: 40px; display: inline-block; font-size: 7pt; color: #1a1a1a; transition: background 0.15s; }
  .ef:focus { outline: none; background: #eff6ff; border-color: #3b82f6; }
  .ef:hover { background: #f0f9ff; }
  .ef-note { font-size: 5pt; color: #94a3b8; margin-top: 2px; }

  /* Meta grid */
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0; border: 1px solid #e2e8f0; }
  .meta-cell { padding: 5px 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
  .meta-cell:nth-child(4n) { border-right: none; }
  .meta-cell .ml { font-size: 5pt; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
  .meta-cell .mv { font-size: 7pt; font-weight: 500; color: #1a1a1a; }

  /* Summary strip */
  .pkg-strip { background: #f0fdf4; border: 1px solid #bbf7d0; display: flex; margin-top: 10px; }
  .pkg-item { flex: 1; padding: 6px 10px; border-right: 1px solid #bbf7d0; }
  .pkg-item:last-child { border-right: none; }
  .pkg-item .pl { font-size: 5pt; font-weight: 600; color: #064e32; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
  .pkg-item .pv { font-size: 8pt; font-weight: 700; color: #0a5c3a; }

  /* Rows table */
  .rows-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 7pt; }
  .rows-table th { background: #f0fdf4; border: 1px solid #e2e8f0; padding: 4px 7px; font-size: 5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #064e32; text-align: left; white-space: nowrap; }
  .rows-table th.r { text-align: right; }
  .rows-table td { border: 1px solid #e2e8f0; padding: 3px 6px; vertical-align: middle; }
  .rows-table td.r { text-align: right; font-variant-numeric: tabular-nums; }
  .rows-table tr:nth-child(even) td { background: #f8fafc; }
  .rows-table tfoot td { background: #0a5c3a; color: #fff; font-weight: 700; font-size: 7pt; border: 1px solid #064e32; padding: 4px 7px; }
  .rows-table tfoot td.r { text-align: right; }
  .del-row { cursor: pointer; color: #ef4444; font-weight: 700; font-size: 9pt; padding: 0 4px; background: none; border: none; }
  .del-row:hover { color: #b91c1c; }
  .add-row-btn { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding: 5px 10px; border: 1px dashed #86efac; background: #f0fdf4; color: #0a5c3a; font-size: 7pt; font-weight: 600; cursor: pointer; border-radius: 3px; }
  .add-row-btn:hover { background: #dcfce7; }

  /* Footer */
  .doc-footer { background: #064e32; color: #a7f3d0; font-size: 5pt; padding: 4px 12px; display: flex; justify-content: space-between; border-radius: 0 0 6px 6px; margin-top: 0; }

  .toast { position: fixed; bottom: 20px; right: 20px; background: #0a5c3a; color: #fff; padding: 8px 16px; border-radius: 4px; font-size: 8pt; font-weight: 600; display: none; z-index: 999; }
</style>
</head>
<body>

<div class="toolbar">
  <div class="toolbar-left">
    <div>
      <div class="toolbar h1" style="font-size:14pt;font-weight:800;color:#fff;">ORVIA <span style="color:#6ee7b7;font-weight:300;">TROPICAL</span></div>
      <div class="toolbar-subtitle">Packing List Editor — ${so.party_no || so.sa_number || ''}</div>
    </div>
  </div>
  <div class="toolbar-right">
    <button class="btn btn-danger" onclick="window.close()">✕ Kapat</button>
    <button class="btn btn-outline" onclick="recalc()">↺ Hesapla</button>
    <button class="btn btn-primary" onclick="downloadPDF()">⬇ PDF İndir</button>
  </div>
</div>

<div class="page">
  <!-- Doc header -->
  <div class="doc-hdr">
    <div class="hdr-brand">
      <div class="hdr-logo">ORVIA <span>TROPICAL</span></div>
      <div class="hdr-co">ORVİA TROPICAL SEBZE MEYVE SAN. VE TİC. LTD. ŞTİ.<br>
        Fener Mah. 1964 Sk. Hacı M Gebizli Sit. D Blok No:6/A No:3, Muratpaşa / Antalya / Türkiye<br>
        Tel: +90 530 552 83 06 · www.orviatropical.com · orviaoms.com
      </div>
    </div>
    <div class="hdr-right">
      <div class="hdr-docno">${val(so.party_no)}</div>
      <div class="hdr-date">${fmtDate(so.shipment_date || new Date())}</div>
      <div class="hdr-type">Packing List</div>
    </div>
  </div>

  <div class="card">
    <!-- Parties -->
    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #e2e8f0;margin-bottom:8px;">
      <div style="padding:8px 10px;border-right:1px solid #e2e8f0;">
        <div style="font-size:5pt;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:3px 6px;margin:-8px -10px 6px;color:#fff;background:#0a5c3a;">Shipper / Exporter</div>
        <div style="font-size:7.5pt;font-weight:700;color:#0a5c3a;margin:5px 0 2px;">ORVİA TROPICAL SEBZE MEYVE SAN. VE TİC. LTD. ŞTİ.</div>
        <div style="font-size:6pt;color:#475569;line-height:1.65;">Fener Mah. 1964 Sk. Hacı M Gebizli Sit. D Blok No:6/A No:3, Muratpaşa / Antalya / Türkiye<br>Tax No: 6481831271 · Antalya Kurumlar V.D.<br>Tel: +90 530 552 83 06 · www.orviatropical.com · orviaoms.com</div>
      </div>
      <div style="padding:8px 10px;">
        <div style="font-size:5pt;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:3px 6px;margin:-8px -10px 6px;color:#fff;background:#1d4ed8;">Consignee</div>
        <div style="font-size:7.5pt;font-weight:700;color:#1d4ed8;margin:5px 0 2px;">${val(so.customer_name)}</div>
        <div style="font-size:6pt;color:#475569;line-height:1.65;">${val(so.customer_address)}${so.customer_country ? '<br>' + so.customer_country : ''}</div>
      </div>
    </div>

    <div class="sec-hdr">Shipment Details</div>
    <div class="meta-grid">
      <div class="meta-cell"><div class="ml">Packing List No</div><div class="mv">${val(so.invoice_no || so.party_no)}</div></div>
      <div class="meta-cell"><div class="ml">Invoice No</div><div class="mv">${val(so.invoice_no || so.party_no)}</div></div>
      <div class="meta-cell"><div class="ml">SA Number</div><div class="mv">${val(so.sa_number)}</div></div>
      <div class="meta-cell"><div class="ml">Lot / Party No</div><div class="mv">${val(so.lot_no)}</div></div>
      <div class="meta-cell"><div class="ml">Shipment Date</div><div class="mv">${fmtDate(so.shipment_date)}</div></div>
      <div class="meta-cell"><div class="ml">Incoterm</div><div class="mv">${val(so.incoterm)}</div></div>
      <div class="meta-cell"><div class="ml">Transport Mode</div><div class="mv">${val(so.transport_mode)}</div></div>
      <div class="meta-cell"><div class="ml">ETD</div><div class="mv">${fmtDate(so.etd)}</div></div>
      <div class="meta-cell"><div class="ml">Port of Loading</div><div class="mv">${val(so.port_loading)}</div></div>
      <div class="meta-cell"><div class="ml">Port of Discharge</div><div class="mv">${val(so.port_discharge)}</div></div>
      <div class="meta-cell"><div class="ml">ETA</div><div class="mv">${fmtDate(so.eta)}</div></div>
      <div class="meta-cell"><div class="ml">Delivery Date</div><div class="mv">${fmtDate(so.delivery_date)}</div></div>
      ${so.container_number ? `<div class="meta-cell"><div class="ml">Container No</div><div class="mv">${so.container_number}</div></div>` : ''}
      ${so.vessel_name ? `<div class="meta-cell"><div class="ml">Vessel Name</div><div class="mv">${so.vessel_name}</div></div>` : ''}
      ${so.seawaybill_number ? `<div class="meta-cell"><div class="ml">Sea Waybill No</div><div class="mv">${so.seawaybill_number}</div></div>` : ''}
    </div>

    <!-- Summary strip (auto-calculated) -->
    <div class="pkg-strip" id="summary-strip">
      <div class="pkg-item"><div class="pl">Total Pallets</div><div class="pv" id="sum-pallets">—</div></div>
      <div class="pkg-item"><div class="pl">Total Boxes</div><div class="pv" id="sum-boxes">—</div></div>
      <div class="pkg-item"><div class="pl">Net Weight</div><div class="pv" id="sum-net">—</div></div>
      <div class="pkg-item"><div class="pl">Gross Weight</div><div class="pv" id="sum-gross">—</div></div>
      <div class="pkg-item"><div class="pl">Box Type</div><div class="pv" id="sum-boxtype">${val(orderItems[0]?.box_type || so.box_type)}</div></div>
      <div class="pkg-item"><div class="pl">Net / Box</div><div class="pv" id="sum-netbox">${orderItems[0]?.box_weight_kg || so.box_weight_kg || '—'} kg</div></div>
    </div>

    <div class="sec-hdr" id="rows-hdr">Pallet Breakdown</div>
    <table class="rows-table" id="rows-table">
      <thead>
        <tr id="rows-thead">
          <th id="th-label">Pallet</th>
          <th>Product</th>
          <th>Variety / Caliber</th>
          <th>Origin</th>
          <th>Box Type</th>
          <th class="r">Boxes</th>
          <th class="r">Net/Box (kg)</th>
          <th class="r">Net Wt (kg)</th>
          <th class="r">Gross Wt (kg)</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="rows-body"></tbody>
      <tfoot>
        <tr>
          <td colspan="5" id="tfoot-label">TOTALS</td>
          <td class="r" id="tfoot-boxes">—</td>
          <td class="r">—</td>
          <td class="r" id="tfoot-net">—</td>
          <td class="r" id="tfoot-gross">—</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    <button class="add-row-btn" onclick="addRow()">＋ Satır Ekle</button>

    ${so.quality_notes ? `
    <div class="sec-hdr slate">Quality Notes</div>
    <div style="padding:4px 8px;border:1px solid #e2e8f0;font-size:6pt;color:#374151;line-height:1.6;">${so.quality_notes}</div>
    ` : ''}
  </div>

  <div class="doc-footer">
    <span>ORVİA TROPICAL SEBZE MEYVE SAN. VE TİC. LTD. ŞTİ.</span>
    <span>www.orviatropical.com · orviaoms.com</span>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const USE_ITEM_ROWS = ${useItemRows};
let rows = [
${rowsInitJS}
];

const palletCountInit = ${palletCount};
document.getElementById('rows-hdr').textContent = USE_ITEM_ROWS ? 'Item Breakdown' : 'Pallet Breakdown';
document.getElementById('th-label').textContent = USE_ITEM_ROWS ? 'Item' : 'Pallet';

function fmtN(n, d=2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function ef(value, rowIdx, field, type='text') {
  const v = value !== null && value !== undefined && value !== '—' ? value : '';
  return '<span class="ef" contenteditable="true" data-row="'+rowIdx+'" data-field="'+field+'" onblur="onEdit(this)" onkeydown="handleEfKey(event,this)">' + (v || '') + '</span>';
}

function render() {
  const tbody = document.getElementById('rows-body');
  tbody.innerHTML = rows.map((r, i) => \`
    <tr>
      <td>\${r.label || (USE_ITEM_ROWS ? 'Item '+(i+1) : 'Pallet '+(i+1))}</td>
      <td>\${ef(r.product, i, 'product')}</td>
      <td>\${ef(r.variety, i, 'variety')}</td>
      <td>\${ef(r.origin, i, 'origin')}</td>
      <td>\${ef(r.boxType, i, 'boxType')}</td>
      <td class="r">\${ef(r.boxes, i, 'boxes', 'number')}</td>
      <td class="r">\${ef(r.netBox, i, 'netBox', 'number')}</td>
      <td class="r">\${fmtN(r.net)}</td>
      <td class="r">\${fmtN(r.gross)}</td>
      <td><button class="del-row" onclick="delRow(\${i})" title="Satırı Sil">×</button></td>
    </tr>
  \`).join('');
  recalc();
}

function onEdit(el) {
  const i = parseInt(el.dataset.row);
  const f = el.dataset.field;
  const raw = el.textContent.trim();
  rows[i][f] = raw;
  if (f === 'boxes' || f === 'netBox') {
    const b  = parseFloat(rows[i].boxes) || 0;
    const bw = parseFloat(rows[i].netBox) || 0;
    rows[i].net   = b * bw;
    rows[i].gross = b * bw * 1.05;
    render();
  } else {
    recalc();
  }
}

function recalc() {
  const totBoxes = rows.reduce((s,r)=>s+(parseFloat(r.boxes)||0),0);
  const totNet   = rows.reduce((s,r)=>s+(parseFloat(r.net)||0),0);
  const totGross = rows.reduce((s,r)=>s+(parseFloat(r.gross)||0),0);
  const pCount   = USE_ITEM_ROWS ? palletCountInit : rows.length;
  document.getElementById('sum-pallets').textContent = pCount;
  document.getElementById('sum-boxes').textContent   = fmtN(totBoxes,0);
  document.getElementById('sum-net').textContent     = fmtN(totNet)+' kg';
  document.getElementById('sum-gross').textContent   = fmtN(totGross)+' kg';
  document.getElementById('tfoot-label').textContent = 'TOTALS — '+pCount+' Pallet(s)';
  document.getElementById('tfoot-boxes').textContent = fmtN(totBoxes,0)+' boxes';
  document.getElementById('tfoot-net').textContent   = fmtN(totNet)+' kg';
  document.getElementById('tfoot-gross').textContent = fmtN(totGross)+' kg';
}

function delRow(i) {
  if (rows.length <= 1) { showToast('En az 1 satır olmalı'); return; }
  rows.splice(i,1);
  rows.forEach((r,idx)=>{ r.label = USE_ITEM_ROWS ? 'Item '+(idx+1) : 'Pallet '+(idx+1); });
  render();
}

function addRow() {
  const last = rows[rows.length-1] || {};
  rows.push({ label: USE_ITEM_ROWS ? 'Item '+(rows.length+1) : 'Pallet '+(rows.length+1), product: last.product||'', variety: last.variety||'', origin: last.origin||'', boxType: last.boxType||'', boxes: 0, netBox: last.netBox||0, net: 0, gross: 0 });
  render();
}

function handleEfKey(e, el) {
  if (e.key === 'Enter') { e.preventDefault(); el.blur(); return; }
  if (e.key === 'Tab') {
    e.preventDefault();
    const all = Array.from(document.querySelectorAll('.ef'));
    const idx = all.indexOf(el);
    const next = e.shiftKey ? all[idx - 1] : all[idx + 1];
    if (next) { el.blur(); next.focus(); const r = document.createRange(); r.selectNodeContents(next); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  setTimeout(()=>{ t.style.display='none'; }, 2500);
}

function downloadPDF() {
  showToast('PDF hazırlanıyor…');
  document.querySelectorAll('.ef').forEach(el => {
    const i = parseInt(el.dataset.row);
    const f = el.dataset.field;
    rows[i][f] = el.textContent.trim();
    if (f === 'boxes' || f === 'netBox') {
      const b  = parseFloat(rows[i].boxes) || 0;
      const bw = parseFloat(rows[i].netBox) || 0;
      rows[i].net   = b * bw;
      rows[i].gross = b * bw * 1.05;
    }
  });
  fetch('/api/pdf/packing-list-custom/${req.params.id}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rows, palletCount: USE_ITEM_ROWS ? palletCountInit : rows.length }),
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.error || 'PDF hatası'); });
    return r.blob();
  }).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'PackingList_${so.party_no || so.sa_number || 'PL'}.pdf'; a.click();
    URL.revokeObjectURL(url);
    showToast('PDF indirildi ✓');
  }).catch(e => showToast('Hata: ' + e.message));
}

render();
</script>
</body>
</html>`

    res.set('Content-Type', 'text/html; charset=utf-8')
    res.send(editorHTML)
  } catch (e) {
    console.error('[PDF] packing-list-edit error:', e)
    res.status(500).json({ error: 'Sayfa yüklenemedi' })
  }
})

// ─── Route: Packing List Custom PDF (from editor POST) ───────────────────────

router.post('/packing-list-custom/:id', requireAuth, async (req, res) => {
  try {
    const { rows: customRows, palletCount } = req.body

    const { rows } = await db.query(`
      SELECT so.*,
             c.name    AS customer_name,
             c.address AS customer_address,
             c.country AS customer_country,
             p.name    AS product_name
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      LEFT JOIN products  p ON p.id = so.product_id
      WHERE so.id = $1
    `, [req.params.id])

    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    const so = rows[0]

    const orderRows  = customRows || []
    const totalBoxes = orderRows.reduce((s, r) => s + (parseFloat(r.boxes) || 0), 0)
    const totalNet   = orderRows.reduce((s, r) => s + (parseFloat(r.net) || 0), 0)
    const totalGross = orderRows.reduce((s, r) => s + (parseFloat(r.gross) || 0), 0)
    const pc = palletCount || orderRows.length || 1

    const palletRowsHTML = orderRows.map(r => `
    <tr>
      <td>${r.label || '—'}</td>
      <td>${r.product || '—'}</td>
      <td>${r.variety || '—'}</td>
      <td>${r.origin || '—'}</td>
      <td>${r.boxType || '—'}</td>
      <td class="r">${fmtNum(parseFloat(r.boxes) || 0, 0)}</td>
      <td class="r">${fmtNum(parseFloat(r.netBox) || 0)} kg</td>
      <td class="r">${fmtNum(parseFloat(r.net) || 0)} kg</td>
      <td class="r">${fmtNum(parseFloat(r.gross) || 0)} kg</td>
    </tr>`).join('')

    const qualitySection = so.quality_notes ? `
<div class="section-header">Quality Notes</div>
<div class="notes-box">${so.quality_notes}</div>` : ''

    const html = wrap(`
${headerHTML('PACKING LIST', val(so.invoice_no || so.party_no), fmtDate(so.shipment_date || new Date()))}
<div class="parties">
  <div class="party-col">
    <div class="party-label">Shipper / Exporter</div>
    <div class="party-name">${CO.name}</div>
    <div class="party-detail">${CO.address}<br>Tax No: ${CO.tax}<br>Tel: ${CO.tel} · ${CO.web}</div>
  </div>
  <div class="party-col">
    <div class="party-label">Consignee</div>
    <div class="party-name">${val(so.customer_name)}</div>
    <div class="party-detail">${val(so.customer_address)}${so.customer_country ? '<br>' + so.customer_country : ''}</div>
  </div>
</div>
<div class="section-header">Shipment Details</div>
<div class="info-grid" style="margin-bottom:3mm">
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Packing List No</div><div class="info-value">${val(so.invoice_no || so.party_no)}</div></div>
    <div class="info-cell"><div class="info-label">Invoice No</div><div class="info-value">${val(so.invoice_no || so.party_no)}</div></div>
    <div class="info-cell"><div class="info-label">SA Number</div><div class="info-value">${val(so.sa_number)}</div></div>
    <div class="info-cell"><div class="info-label">Lot / Party No</div><div class="info-value">${val(so.lot_no)}</div></div>
  </div>
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Shipment Date</div><div class="info-value">${fmtDate(so.shipment_date)}</div></div>
    <div class="info-cell"><div class="info-label">Incoterm</div><div class="info-value">${val(so.incoterm)}</div></div>
    <div class="info-cell"><div class="info-label">Transport Mode</div><div class="info-value">${val(so.transport_mode)}</div></div>
    <div class="info-cell"><div class="info-label">ETD</div><div class="info-value">${fmtDate(so.etd)}</div></div>
  </div>
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Port of Loading</div><div class="info-value">${val(so.port_loading)}</div></div>
    <div class="info-cell"><div class="info-label">Port of Discharge</div><div class="info-value">${val(so.port_discharge)}</div></div>
    <div class="info-cell"><div class="info-label">ETA</div><div class="info-value">${fmtDate(so.eta)}</div></div>
    <div class="info-cell"><div class="info-label">Delivery Date</div><div class="info-value">${fmtDate(so.delivery_date)}</div></div>
  </div>
  ${(so.container_number || so.vessel_name || so.seawaybill_number) ? `
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Container No</div><div class="info-value">${val(so.container_number)}</div></div>
    <div class="info-cell"><div class="info-label">Vessel Name</div><div class="info-value">${val(so.vessel_name)}</div></div>
    <div class="info-cell"><div class="info-label">Sea Waybill No</div><div class="info-value">${val(so.seawaybill_number)}</div></div>
    <div class="info-cell"><div class="info-label">Pallets</div><div class="info-value">${pc}</div></div>
  </div>` : ''}
</div>
<div class="pkg-strip">
  <div class="pkg-item"><div class="pkg-lbl">Total Pallets</div><div class="pkg-val">${pc}</div></div>
  <div class="pkg-item"><div class="pkg-lbl">Total Boxes</div><div class="pkg-val">${fmtNum(totalBoxes, 0)}</div></div>
  <div class="pkg-item"><div class="pkg-lbl">Net Weight</div><div class="pkg-val">${fmtNum(totalNet)} kg</div></div>
  <div class="pkg-item"><div class="pkg-lbl">Gross Weight</div><div class="pkg-val">${fmtNum(totalGross)} kg</div></div>
  <div class="pkg-item"><div class="pkg-lbl">Box Type</div><div class="pkg-val">${val(orderRows[0] ? orderRows[0].boxType : '')}</div></div>
  <div class="pkg-item"><div class="pkg-lbl">Net / Box</div><div class="pkg-val">${fmtNum(parseFloat(orderRows[0] ? orderRows[0].netBox : 0) || 0)} kg</div></div>
</div>
<div class="section-header">Pallet / Item Breakdown</div>
<div class="table-wrapper">
<table class="pl-table">
  <thead><tr>
    <th>Pallet / Item</th><th>Product</th><th>Variety / Caliber</th><th>Origin</th><th>Box Type</th>
    <th class="r">Boxes</th><th class="r">Net / Box</th><th class="r">Net Wt (kg)</th><th class="r">Gross Wt (kg)</th>
  </tr></thead>
  <tbody>${palletRowsHTML}</tbody>
  <tr class="tfoot-row">
    <td colspan="5"><strong>TOTALS — ${pc} Pallet(s)</strong></td>
    <td class="r">${fmtNum(totalBoxes, 0)} boxes</td>
    <td class="r">—</td>
    <td class="r">${fmtNum(totalNet)} kg</td>
    <td class="r">${fmtNum(totalGross)} kg</td>
  </tr>
</table>
</div>
${qualitySection}
${sigHTML(false)}
`)

    const pdf = await htmlToPDF(html)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="PackingList_' + so.party_no + '.pdf"',
    })
    res.send(pdf)
  } catch (e) {
    console.error('[PDF] packing-list-custom error:', e)
    res.status(500).json({ error: 'PDF oluşturulamadı' })
  }
})

// ─── Route: Packing List (static PDF) ────────────────────────────────────────

router.get('/packing-list/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT so.*,
             c.name    AS customer_name,
             c.address AS customer_address,
             c.country AS customer_country,
             p.name    AS product_name
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      LEFT JOIN products  p ON p.id = so.product_id
      WHERE so.id = $1
    `, [req.params.id])

    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    const so = rows[0]

    // Load multi-line items (fall back to legacy single-row if none)
    let orderItems = []
    try {
      const itemsRes = await db.query(`
        SELECT soi.*, p.name AS product_name
        FROM sales_order_items soi
        LEFT JOIN products p ON p.id::text = soi.product_id::text
        WHERE soi.sales_order_id = $1
        ORDER BY soi.sort_order
      `, [req.params.id])
      orderItems = itemsRes.rows
    } catch (_) {}
    if (orderItems.length === 0) {
      orderItems = [{
        product_name:   so.product_name,
        variety:        so.variety,
        caliber:        so.caliber,
        origin:         so.origin,
        quantity_kg:    so.quantity_kg,
        price_per_unit: so.price_per_unit,
        box_type:       so.box_type,
        box_weight_kg:  so.box_weight_kg,
      }]
    }

    const palletCount = so.pallets || 1
    const totalBoxes  = orderItems.reduce((s, it) => {
      const bw = Number(it.box_weight_kg || 0)
      return s + (bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0)
    }, 0)
    const totalNet   = orderItems.reduce((s, it) => s + Number(it.quantity_kg || 0), 0)
    const totalGross = orderItems.reduce((s, it) => {
      const bw = Number(it.box_weight_kg || 0)
      const b  = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
      return s + b * bw * 1.05
    }, 0)

    // Build pallet rows
    const boxesPerPallet = Math.floor(totalBoxes / palletCount)
    const remainder      = totalBoxes % palletCount
    const palletRows = []
    for (let i = 0; i < palletCount; i++) {
      const palletBoxes = i < remainder ? boxesPerPallet + 1 : boxesPerPallet
      const firstIt = orderItems[0] || {}
      const bw = Number(firstIt.box_weight_kg || 0)
      palletRows.push({
        pallet:        i + 1,
        palletBoxes,
        netKg:         palletBoxes * bw,
        grossKg:       palletBoxes * bw * 1.05,
        product_name:  firstIt.product_name,
        variety:       firstIt.variety,
        caliber:       firstIt.caliber,
        origin:        firstIt.origin,
        box_type:      firstIt.box_type,
        box_weight_kg: bw,
      })
    }

    const useItemRows = orderItems.length > 1
    const palletRowsHTML = useItemRows
      ? orderItems.map((it, idx) => {
          const bw    = Number(it.box_weight_kg || 0)
          const b     = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
          const net   = Number(it.quantity_kg || 0)
          const gross = b * bw * 1.05
          return `<tr>
            <td>Item ${idx + 1}</td>
            <td>${val(it.product_name)}</td>
            <td>${[it.variety, it.caliber].filter(Boolean).join(' / ') || '—'}</td>
            <td>${val(it.origin)}</td>
            <td>${val(it.box_type)}</td>
            <td class="r">${fmtNum(b, 0)}</td>
            <td class="r">${fmtNum(bw)} kg</td>
            <td class="r">${fmtNum(net)} kg</td>
            <td class="r">${fmtNum(gross)} kg</td>
          </tr>`
        }).join('')
      : palletRows.map(r => `<tr>
          <td>Pallet ${r.pallet}</td>
          <td>${val(r.product_name)}</td>
          <td>${[r.variety, r.caliber].filter(Boolean).join(' / ') || '—'}</td>
          <td>${val(r.origin)}</td>
          <td>${val(r.box_type)}</td>
          <td class="r">${fmtNum(r.palletBoxes, 0)}</td>
          <td class="r">${fmtNum(r.box_weight_kg)} kg</td>
          <td class="r">${fmtNum(r.netKg)} kg</td>
          <td class="r">${fmtNum(r.grossKg)} kg</td>
        </tr>`).join('')

    const qualitySection = so.quality_notes ? `
<div class="section-header">Quality Notes</div>
<div class="notes-box">${so.quality_notes}</div>` : ''

    const html = wrap(`
${headerHTML('PACKING LIST', val(so.invoice_no || so.party_no), fmtDate(so.shipment_date || new Date()))}
<div class="parties">
  <div class="party-col">
    <div class="party-label">Shipper / Exporter</div>
    <div class="party-name">${CO.name}</div>
    <div class="party-detail">${CO.address}<br>Tax No: ${CO.tax}<br>Tel: ${CO.tel} · ${CO.web}</div>
  </div>
  <div class="party-col">
    <div class="party-label">Consignee</div>
    <div class="party-name">${val(so.customer_name)}</div>
    <div class="party-detail">${val(so.customer_address)}${so.customer_country ? '<br>' + so.customer_country : ''}</div>
  </div>
</div>
<div class="section-header">Shipment Details</div>
<div class="info-grid" style="margin-bottom:3mm">
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Packing List No</div><div class="info-value">${val(so.invoice_no || so.party_no)}</div></div>
    <div class="info-cell"><div class="info-label">Invoice No</div><div class="info-value">${val(so.invoice_no || so.party_no)}</div></div>
    <div class="info-cell"><div class="info-label">SA Number</div><div class="info-value">${val(so.sa_number)}</div></div>
    <div class="info-cell"><div class="info-label">Lot / Party No</div><div class="info-value">${val(so.lot_no)}</div></div>
  </div>
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Shipment Date</div><div class="info-value">${fmtDate(so.shipment_date)}</div></div>
    <div class="info-cell"><div class="info-label">Incoterm</div><div class="info-value">${val(so.incoterm)}</div></div>
    <div class="info-cell"><div class="info-label">Transport Mode</div><div class="info-value">${val(so.transport_mode)}</div></div>
    <div class="info-cell"><div class="info-label">ETD</div><div class="info-value">${fmtDate(so.etd)}</div></div>
  </div>
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Port of Loading</div><div class="info-value">${val(so.port_loading)}</div></div>
    <div class="info-cell"><div class="info-label">Port of Discharge</div><div class="info-value">${val(so.port_discharge)}</div></div>
    <div class="info-cell"><div class="info-label">ETA</div><div class="info-value">${fmtDate(so.eta)}</div></div>
    <div class="info-cell"><div class="info-label">Delivery Date</div><div class="info-value">${fmtDate(so.delivery_date)}</div></div>
  </div>
  ${(so.container_number || so.vessel_name || so.seawaybill_number) ? `
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Container No</div><div class="info-value">${val(so.container_number)}</div></div>
    <div class="info-cell"><div class="info-label">Vessel Name</div><div class="info-value">${val(so.vessel_name)}</div></div>
    <div class="info-cell"><div class="info-label">Sea Waybill No</div><div class="info-value">${val(so.seawaybill_number)}</div></div>
    <div class="info-cell"><div class="info-label">Pallets</div><div class="info-value">${palletCount}</div></div>
  </div>` : ''}
</div>
<div class="pkg-strip">
  <div class="pkg-item"><div class="pkg-lbl">Total Pallets</div><div class="pkg-val">${palletCount}</div></div>
  <div class="pkg-item"><div class="pkg-lbl">Total Boxes</div><div class="pkg-val">${fmtNum(totalBoxes, 0)}</div></div>
  <div class="pkg-item"><div class="pkg-lbl">Net Weight</div><div class="pkg-val">${fmtNum(totalNet)} kg</div></div>
  <div class="pkg-item"><div class="pkg-lbl">Gross Weight</div><div class="pkg-val">${fmtNum(totalGross)} kg</div></div>
  <div class="pkg-item"><div class="pkg-lbl">Box Type</div><div class="pkg-val">${val(orderItems[0]?.box_type || so.box_type)}</div></div>
  <div class="pkg-item"><div class="pkg-lbl">Net / Box</div><div class="pkg-val">${fmtNum(orderItems[0]?.box_weight_kg || so.box_weight_kg)} kg</div></div>
</div>
<div class="section-header">${useItemRows ? 'Item Breakdown' : 'Pallet Breakdown'}</div>
<div class="table-wrapper">
<table class="pl-table">
  <thead><tr>
    <th>${useItemRows ? 'Item' : 'Pallet'}</th>
    <th>Product</th>
    <th>Variety / Caliber</th>
    <th>Origin</th>
    <th>Box Type</th>
    <th class="r">Boxes</th>
    <th class="r">Net / Box</th>
    <th class="r">Net Wt (kg)</th>
    <th class="r">Gross Wt (kg)</th>
  </tr></thead>
  <tbody>${palletRowsHTML}</tbody>
  <tr class="tfoot-row">
    <td colspan="5"><strong>TOTALS — ${palletCount} Pallet(s)</strong></td>
    <td class="r">${fmtNum(totalBoxes, 0)} boxes</td>
    <td class="r">—</td>
    <td class="r">${fmtNum(totalNet)} kg</td>
    <td class="r">${fmtNum(totalGross)} kg</td>
  </tr>
</table>
</div>
${qualitySection}
${sigHTML(false)}
`)

    const pdf = await htmlToPDF(html)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="PackingList_${so.party_no}.pdf"`,
    })
    res.send(pdf)
  } catch (e) {
    console.error('[PDF] packing-list error:', e)
    res.status(500).json({ error: 'PDF oluşturulamadı' })
  }
})

// ─── Route: Sales Agreement ───────────────────────────────────────────────────

router.get('/sales-agreement/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT so.*,
             c.name    AS customer_name,
             c.address AS customer_address,
             c.country AS customer_country,
             p.name    AS product_name
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      LEFT JOIN products  p ON p.id = so.product_id
      WHERE so.id = $1
    `, [req.params.id])

    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    const so = rows[0]

    // Load multi-line items (fall back to legacy single-row if none)
    let orderItems = []
    try {
      const itemsRes = await db.query(`
        SELECT soi.*, p.name AS product_name
        FROM sales_order_items soi
        LEFT JOIN products p ON p.id::text = soi.product_id::text
        WHERE soi.sales_order_id = $1
        ORDER BY soi.sort_order
      `, [req.params.id])
      orderItems = itemsRes.rows
    } catch (_) {}

    if (orderItems.length === 0) {
      orderItems = [{
        product_name:  so.product_name,
        variety:       so.variety,
        caliber:       so.caliber,
        origin:        so.origin,
        quantity_kg:   so.quantity_kg,
        price_per_unit: so.price_per_unit,
        box_type:      so.box_type,
        box_weight_kg: so.box_weight_kg,
      }]
    }

    const customer = {
      name:    so.customer_name,
      address: so.customer_address,
      country: so.customer_country,
    }

    // Required docs
    let requiredDocs = {}
    try { requiredDocs = so.required_docs ? (typeof so.required_docs === 'string' ? JSON.parse(so.required_docs) : so.required_docs) : {} } catch (_) {}

    const isIndia = (so.dest_country || so.customer_country || '').toLowerCase().includes('india')
    const docBadges = [
      'Commercial Invoice',
      'Packing List',
      'Phytosanitary Certificate',
      'Certificate of Origin',
    ]
    if (requiredDocs.health_certificate) docBadges.push('Health Certificate')
    if (requiredDocs.non_gmo || isIndia)  docBadges.push('Non-GMO Certificate')
    if (requiredDocs.fumigation)          docBadges.push('Fumigation Certificate')
    if (requiredDocs.halal)               docBadges.push('Halal Certificate')

    const badgeHTML = docBadges.map(d => `<span class="doc-badge">${d}</span>`).join('')

    const qualitySection = so.quality_notes ? `
<div class="section-header">Quality &amp; Specifications</div>
<div class="notes-box">${so.quality_notes}</div>` : ''

    const notesSection = so.notes ? `
<div class="section-header">Additional Notes</div>
<div class="notes-box">${so.notes}</div>` : ''

    const html = wrap(`
${headerHTML('SALES AGREEMENT', val(so.sa_number || so.party_no), fmtDate(so.shipment_date || new Date()))}
${partiesHTML(so, customer, false)}
<div class="section-header">Agreement Details</div>
<div class="info-grid" style="margin-bottom:3mm">
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">SA Number</div><div class="info-value">${val(so.sa_number || so.party_no)}</div></div>
    <div class="info-cell"><div class="info-label">Lot / Party No</div><div class="info-value">${val(so.lot_no)}</div></div>
    <div class="info-cell"><div class="info-label">Shipment Date</div><div class="info-value">${fmtDate(so.shipment_date)}</div></div>
    <div class="info-cell"><div class="info-label">Delivery Date</div><div class="info-value">${fmtDate(so.delivery_date)}</div></div>
  </div>
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Incoterm</div><div class="info-value">${val(so.incoterm)}</div></div>
    <div class="info-cell"><div class="info-label">Port of Loading</div><div class="info-value">${val(so.port_loading)}</div></div>
    <div class="info-cell"><div class="info-label">Port of Discharge</div><div class="info-value">${val(so.port_discharge)}</div></div>
    <div class="info-cell"><div class="info-label">Transport Mode</div><div class="info-value">${val(so.transport_mode)}</div></div>
  </div>
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Payment Method</div><div class="info-value">${val(so.payment_method)}</div></div>
    <div class="info-cell"><div class="info-label">Payment Terms</div><div class="info-value">${val(so.payment_term)}</div></div>
    <div class="info-cell"><div class="info-label">Currency</div><div class="info-value">${val(so.currency)}</div></div>
    <div class="info-cell"><div class="info-label">Pallets</div><div class="info-value">${val(so.pallets)}</div></div>
  </div>
</div>
${saGoodsTableHTML(orderItems, so)}
<div class="section-header">Required Documents</div>
<div class="doc-badges-wrap">${badgeHTML}</div>
${qualitySection}
${notesSection}
${isIndia ? nongmoHTML() : ''}
<div class="section-header">Standard Terms &amp; Conditions</div>
${tcGridHTML(SA_CLAUSES)}
${bankHTML()}
${sigHTML(true)}
`)

    const pdf = await htmlToPDF(html)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="SalesAgreement_${so.sa_number || so.party_no}.pdf"`,
    })
    res.send(pdf)
  } catch (e) {
    console.error('[PDF] sales-agreement error:', e)
    res.status(500).json({ error: 'PDF oluşturulamadı' })
  }
})

// ─── Route: Purchase Order ────────────────────────────────────────────────────

router.get('/purchase-order/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT po.*,
             s.name    AS supplier_name,
             s.address AS supplier_address,
             s.country AS supplier_country,
             p.name    AS product_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN products  p ON p.id = po.product_id
      WHERE po.id = $1
    `, [req.params.id])

    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    const po = rows[0]

    const boxes      = po.box_weight_kg > 0 ? Math.round(po.quantity_kg / po.box_weight_kg) : 0
    const totalNet   = po.quantity_kg
    const totalGross = boxes * po.box_weight_kg * 1.05
    const totalValue = boxes * Number(po.price_per_unit)
    const currency   = po.currency || 'USD'
    const sym        = currency === 'EUR' ? '€' : '$'

    const notesSection = po.notes ? `
<div class="section-header">Notes &amp; Special Instructions</div>
<div class="notes-box">${po.notes}</div>` : ''

    const html = wrap(`
${headerHTML('PURCHASE ORDER', val(po.party_no), fmtDate(po.shipment_date || new Date()))}
${partiesPOHTML(po)}
<div class="section-header">Purchase Order Details</div>
<div class="info-grid" style="margin-bottom:3mm">
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">PO Number</div><div class="info-value">${val(po.party_no)}</div></div>
    <div class="info-cell"><div class="info-label">Shipment Date</div><div class="info-value">${fmtDate(po.shipment_date)}</div></div>
    <div class="info-cell"><div class="info-label">Delivery Date</div><div class="info-value">${fmtDate(po.delivery_date)}</div></div>
    <div class="info-cell"><div class="info-label">Currency</div><div class="info-value">${val(po.currency)}</div></div>
  </div>
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Incoterm</div><div class="info-value">${val(po.incoterm)}</div></div>
    <div class="info-cell"><div class="info-label">Port of Loading</div><div class="info-value">${val(po.port_loading)}</div></div>
    <div class="info-cell"><div class="info-label">Port of Discharge</div><div class="info-value">${val(po.port_discharge)}</div></div>
    <div class="info-cell"><div class="info-label">Transport Mode</div><div class="info-value">${val(po.transport_mode)}</div></div>
  </div>
  <div class="info-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <div class="info-cell"><div class="info-label">Payment Method</div><div class="info-value">${val(po.payment_method)}</div></div>
    <div class="info-cell"><div class="info-label">Payment Terms</div><div class="info-value">${val(po.payment_term)}</div></div>
    <div class="info-cell"><div class="info-label">Origin</div><div class="info-value">${val(po.origin)}</div></div>
    <div class="info-cell"><div class="info-label">Pallets</div><div class="info-value">${val(po.pallets)}</div></div>
  </div>
</div>
<div class="section-header">Goods Ordered</div>
<div class="table-wrapper">
<table>
  <thead><tr>
    <th style="width:4%">#</th>
    <th>Product</th>
    <th style="width:10%">Variety</th>
    <th style="width:8%">Caliber</th>
    <th style="width:8%">Origin</th>
    <th style="width:9%">Box Type</th>
    <th class="num" style="width:6%">Boxes</th>
    <th class="num" style="width:9%">Net KG</th>
    <th class="num" style="width:9%">Gross KG</th>
    <th class="num" style="width:10%">Unit Price</th>
    <th class="num" style="width:10%">Total Value</th>
  </tr></thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>${val(po.product_name)}</td>
      <td>${val(po.variety)}</td>
      <td>${val(po.caliber)}</td>
      <td>${val(po.origin)}</td>
      <td>${val(po.box_type)}</td>
      <td class="num">${fmtNum(boxes, 0)}</td>
      <td class="num">${fmtNum(totalNet)}</td>
      <td class="num">${fmtNum(totalGross)}</td>
      <td class="num">${sym}${fmtNum(po.price_per_unit)}</td>
      <td class="num">${sym}${fmtNum(totalValue)}</td>
    </tr>
  </tbody>
  <tr class="tfoot-row">
    <td colspan="6"><strong>TOTAL ORDER VALUE</strong></td>
    <td class="num">${fmtNum(boxes, 0)}</td>
    <td class="num">${fmtNum(totalNet)}</td>
    <td class="num">${fmtNum(totalGross)}</td>
    <td class="num"></td>
    <td class="num">${sym}${fmtNum(totalValue)}</td>
  </tr>
</table>
</div>
${notesSection}
<div class="section-header">Purchase Terms &amp; Conditions</div>
${tcGridHTML(PO_CLAUSES)}
${bankHTML()}
${sigHTML(true)}
`)

    const pdf = await htmlToPDF(html)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="PurchaseOrder_${po.party_no}.pdf"`,
    })
    res.send(pdf)
  } catch (e) {
    console.error('[PDF] purchase-order error:', e)
    res.status(500).json({ error: 'PDF oluşturulamadı' })
  }
})

module.exports = router
