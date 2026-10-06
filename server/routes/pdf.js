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
    // Use domcontentloaded so we don't wait for Google Fonts (may time out in Docker)
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 })
    // Give fonts a moment to load if available
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

// ─── Shared CSS ───────────────────────────────────────────────────────────────

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #fff; color: #1a1a1a; font-size: 7pt; }
.hdr { display: flex; background: #0a5c3a; }
.hdr-brand { padding: 10px 14px; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
.hdr-logo { color: #fff; font-size: 18pt; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
.hdr-logo span { color: #6ee7b7; font-weight: 300; letter-spacing: 1px; }
.hdr-co { color: #a7f3d0; font-size: 5pt; font-weight: 500; letter-spacing: 0.3px; line-height: 1.5; margin-top: 2px; word-break: break-word; overflow-wrap: break-word; }
.hdr-right { background: #064e32; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; padding: 10px 14px; min-width: 175px; }
.hdr-docno { color: #fff; font-size: 16pt; font-weight: 800; letter-spacing: 0.5px; }
.hdr-date { color: #6ee7b7; font-size: 6pt; margin-top: 3px; }
.hdr-type { color: #a7f3d0; font-size: 5.5pt; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 2px; }
.sec { font-size: 5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 2px 8px; margin-top: 5px; color: #fff; }
.sec.g { background: #0a5c3a; }
.sec.s { background: #334155; }
.buyer-block { padding: 5px 13px 4px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 24px; background: #f8fafc; }
.buyer-label { font-size: 5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1d4ed8; margin-bottom: 2px; }
.buyer-name { font-size: 8.5pt; font-weight: 700; color: #1a1a1a; }
.buyer-detail { font-size: 6pt; color: #475569; line-height: 1.65; margin-top: 2px; }
.buyer-col { flex: 1; }
.buyer-col.narrow { flex: 0 0 170px; }
.g4  { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; border-left: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; }
.g3  { display: grid; grid-template-columns: 1fr 1fr 1fr; border-left: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; }
.g2  { display: grid; grid-template-columns: 1fr 1fr; border-left: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; }
.g21 { display: grid; grid-template-columns: 2fr 1fr; border-left: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; }
.c { border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 4px 8px; }
.c .lbl { font-size: 5pt; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px; }
.c .val { font-size: 7pt; font-weight: 500; color: #1a1a1a; }
.c.wide-text .val { font-size: 6.5pt; line-height: 1.5; }
.goods-table { width: 100%; border-collapse: collapse; font-size: 6.5pt; }
.goods-table thead tr { background: #f0fdf4; }
.goods-table thead th { border: 1px solid #e2e8f0; padding: 4px 7px; font-size: 5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #064e32; text-align: left; }
.goods-table thead th.r { text-align: right; }
.goods-table tbody td { border: 1px solid #e2e8f0; padding: 4px 7px; color: #1a1a1a; vertical-align: top; }
.goods-table tbody td.r { text-align: right; font-variant-numeric: tabular-nums; }
.goods-table tfoot tr { background: #0a5c3a; }
.goods-table tfoot td { border: 1px solid #064e32; padding: 4px 7px; color: #fff; font-weight: 700; font-size: 7pt; vertical-align: middle; }
.goods-table tfoot td.r { text-align: right; font-variant-numeric: tabular-nums; font-size: 7.5pt; vertical-align: middle; }
.goods-table tbody tr:nth-child(even) td { background: #f8fafc; }
.bank-block { margin-top: 5px; border: 1px solid #e2e8f0; background: #f8fafc; }
.bank-hdr { background: #334155; color: #fff; font-size: 5.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 2px 8px; }
.e-issued { border: 1px solid #dbeafe; background: #eff6ff; padding: 3px 8px; margin-top: 5px; display: flex; align-items: center; gap: 6px; }
.e-issued-text { font-size: 6pt; color: #1e40af; line-height: 1.5; }
.e-issued-text strong { font-weight: 700; color: #1d4ed8; }
.issuer-block { margin-top: 5px; border: 1px solid #e2e8f0; display: flex; }
.issuer-cell { flex: 1; padding: 5px 10px; }
.issuer-cell + .issuer-cell { border-left: 1px solid #e2e8f0; flex: 0 0 175px; }
.issuer-title { font-size: 5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 3px; }
.issuer-name { font-size: 7.5pt; font-weight: 700; color: #0a5c3a; }
.issuer-detail { font-size: 5.5pt; color: #64748b; margin-top: 2px; line-height: 1.6; }
.issuer-stamp { background: #f0fdf4; border: 1.5px dashed #86efac; padding: 3px 6px; margin-top: 5px; text-align: center; }
.issuer-stamp .stamp-text { font-size: 5.5pt; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1.5px; }
.issuer-stamp .stamp-sub { font-size: 5pt; color: #4ade80; margin-top: 1px; }
.parties { display: grid; grid-template-columns: 1fr 1fr; margin-top: 6px; }
.pty { padding: 7px 10px; border: 1px solid #e2e8f0; }
.pty.l { border-right: none; }
.pty-hdr { font-size: 5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 6px; margin: -7px -10px 6px; color: #fff; }
.pty-hdr.g { background: #0a5c3a; }
.pty-hdr.b { background: #1d4ed8; }
.pty-name { font-size: 7.5pt; font-weight: 700; color: #0a5c3a; margin: 5px 0 2px; }
.pty-detail { font-size: 6pt; color: #475569; line-height: 1.65; }
.clauses { columns: 2; column-gap: 12px; padding: 0 12px 8px; margin-top: 6px; }
.clause { margin-bottom: 6px; break-inside: avoid; }
.clause-t { font-size: 6pt; font-weight: 700; color: #0a5c3a; margin-bottom: 1px; }
.clause-b { font-size: 6pt; color: #374151; line-height: 1.55; }
.footer { background: #064e32; color: #a7f3d0; font-size: 4.5pt; padding: 3px 10px; display: flex; justify-content: space-between; align-items: center; margin-top: 6px; gap: 8px; overflow: hidden; }
.footer > * { flex-shrink: 0; }
.footer .footer-mid { flex-shrink: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.footer-r { color: #6ee7b7; font-size: 4.5pt; }
.pl-table { width: 100%; border-collapse: collapse; font-size: 6.5pt; }
.pl-table thead tr { background: #f0fdf4; }
.pl-table thead th { border: 1px solid #e2e8f0; padding: 4px 7px; font-size: 5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #064e32; text-align: left; }
.pl-table thead th.r { text-align: right; }
.pl-table tbody td { border: 1px solid #e2e8f0; padding: 3px 7px; color: #1a1a1a; }
.pl-table tbody td.r { text-align: right; font-variant-numeric: tabular-nums; }
.pl-table tbody tr:nth-child(even) td { background: #f8fafc; }
.pl-table tfoot tr { background: #0a5c3a; }
.pl-table tfoot td { border: 1px solid #064e32; padding: 4px 7px; color: #fff; font-weight: 700; font-size: 7pt; }
.pl-table tfoot td.r { text-align: right; }
.pkg-strip { background: #f0fdf4; border: 1px solid #bbf7d0; display: flex; gap: 0; }
.pkg-item { flex: 1; padding: 4px 8px; border-right: 1px solid #bbf7d0; }
.pkg-item:last-child { border-right: none; }
.pkg-item .lbl { font-size: 5pt; font-weight: 600; color: #064e32; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px; }
.pkg-item .val { font-size: 7pt; font-weight: 600; color: #0a5c3a; }
.mt6 { margin-top: 6px; }
`

function headerHTML (docno, docdate, doctype) {
  return `
  <div class="hdr" style="min-height:56px;">
    <div class="hdr-brand">
      <div class="hdr-logo">ORVIA <span>TROPICAL</span></div>
      <div class="hdr-co">
        ${CO.name}<br>
        ${CO.address}<br>
        Tel: ${CO.tel} · Tax No: ${CO.tax} · ${CO.web}
      </div>
    </div>
    <div class="hdr-right">
      <div class="hdr-docno">${val(docno)}</div>
      <div class="hdr-date">${fmtDate(docdate)}</div>
      <div class="hdr-type">${doctype}</div>
    </div>
  </div>`
}

function footerHTML () {
  return `
  <div class="footer">
    <span>${CO.name}</span>
    <span class="footer-mid">${CO.address}</span>
    <span class="footer-r">${CO.web}</span>
  </div>`
}

function issuerBlockHTML (customerName) {
  return `
  <div style="border:1px solid #bfdbfe;background:#eff6ff;padding:5px 10px;margin-top:6px;display:flex;align-items:flex-start;gap:8px;">
    <div style="font-size:14pt;color:#1d4ed8;line-height:1;margin-top:1px;">✦</div>
    <div style="font-size:6pt;color:#1e40af;line-height:1.6;">
      <strong style="font-weight:700;color:#1d4ed8;">This document has been electronically issued</strong> by ORVİA TROPICAL SEBZE MEYVE SAN. VE TİC. LTD. ŞTİ. and is legally valid without a wet signature.
      Issued on <strong>${now()}</strong> · Ref: ${CO.web}
    </div>
  </div>
  <div class="issuer-block" style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #e2e8f0;margin-top:6px;">
    <div style="padding:8px 10px;border-right:1px solid #e2e8f0;">
      <div class="issuer-title">Seller / Satıcı</div>
      <div class="issuer-name" style="margin-top:3px;">${CO.rep}</div>
      <div class="issuer-detail">${CO.title}<br>${CO.name}</div>
      <div class="issuer-stamp" style="margin-top:6px;">
        <div class="stamp-text">ORVIA TROPICAL</div>
        <div class="stamp-sub">Electronically Issued · ${now()}</div>
      </div>
    </div>
    <div style="padding:8px 10px;">
      <div class="issuer-title">Buyer / Alıcı — Authorized Signature</div>
      ${customerName ? `<div style="font-size:7.5pt;font-weight:700;color:#1d4ed8;margin-top:6px;margin-bottom:8px;">${customerName}</div>` : '<div style="margin-top:18px;"></div>'}
      <div style="border-bottom:1px solid #1a1a1a;width:80%;"></div>
      <div style="font-size:5.5pt;color:#64748b;margin-top:3px;">Name &amp; Title / İsim &amp; Unvan</div>
      <div style="margin-top:14px;border-bottom:1px solid #1a1a1a;width:60%;"></div>
      <div style="font-size:5.5pt;color:#64748b;margin-top:3px;">Date / Tarih</div>
    </div>
  </div>`
}

function bankBlockHTML (currency) {
  const iban = (currency || '').toUpperCase() === 'EUR' ? CO.eur : CO.usd
  const ccy  = (currency || '').toUpperCase() === 'EUR' ? 'EUR' : 'USD'
  const lbl  = 'font-size:5pt;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;'
  const val2 = 'font-size:6.5pt;font-weight:600;color:#1a1a1a;'
  return `
  <div class="bank-block mt6">
    <div class="bank-hdr">Bank / Payment Details — Beneficiary: ${CO.name}</div>
    <div style="padding:5px 10px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;border-bottom:1px solid #e2e8f0;">
      <div>
        <div style="${lbl}">Bank Name</div>
        <div style="${val2}">${CO.bank}</div>
      </div>
      <div>
        <div style="${lbl}">Branch Code &amp; Name</div>
        <div style="${val2}">${CO.bankBranch}</div>
      </div>
      <div>
        <div style="${lbl}">Bank Address</div>
        <div style="${val2}">${CO.bankAddress}</div>
      </div>
      <div>
        <div style="${lbl}">SWIFT / BIC</div>
        <div style="${val2}">${CO.bic}</div>
      </div>
    </div>
    <div style="padding:5px 10px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
      <div>
        <div style="${lbl}">USD IBAN</div>
        <div style="${val2}">${CO.usd}</div>
      </div>
      <div>
        <div style="${lbl}">EUR IBAN</div>
        <div style="${val2}">${CO.eur}</div>
      </div>
    </div>
  </div>`
}

function wrap (body) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
body { font-family: 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif; }
${CSS}
</style>
</head>
<body>
${body}
</body>
</html>`
}

// ─── Route: Commercial Invoice ────────────────────────────────────────────────

router.get('/invoice/:id', requireAuth, async (req, res) => {
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
        LEFT JOIN products p ON p.id = soi.product_id
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

    const totalNet   = orderItems.reduce((s, it) => s + Number(it.quantity_kg || 0), 0)
    const totalBoxes = orderItems.reduce((s, it) => {
      const bw = Number(it.box_weight_kg || 0)
      return s + (bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0)
    }, 0)
    const totalGross = orderItems.reduce((s, it) => {
      const bw = Number(it.box_weight_kg || 0)
      const b  = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
      return s + b * bw * 1.05
    }, 0)
    const totalValue = orderItems.reduce((s, it) => {
      const bw    = Number(it.box_weight_kg || 0)
      const b     = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
      const price = Number(it.price_per_unit || 0)
      return s + ((it.sell_by || 'box') === 'kg' ? Number(it.quantity_kg || 0) * price : b * price)
    }, 0)

    const itemRowsHTML = orderItems.map((it, idx) => {
      const bw    = Number(it.box_weight_kg || 0)
      const b     = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
      const net   = Number(it.quantity_kg || 0)
      const gross = b * bw * 1.05
      const price = Number(it.price_per_unit || 0)
      const total = (it.sell_by || 'box') === 'kg' ? net * price : b * price
      const unitLabel = (it.sell_by || 'box') === 'kg' ? '/kg' : '/box'
      return `
      <tr>
        <td>${idx + 1}</td>
        <td>${val(it.product_name)}</td>
        <td>${[it.variety, it.caliber].filter(Boolean).join(' / ') || '—'}</td>
        <td>${val(it.origin)}</td>
        <td>${val(it.box_type)}</td>
        <td class="r">${fmtNum(b, 0)}</td>
        <td class="r">${fmtNum(net)}</td>
        <td class="r">${fmtNum(gross)}</td>
        <td class="r">${fmtNum(price)} <span style="font-size:5pt;color:#64748b;">${unitLabel}</span></td>
        <td class="r">${fmtNum(total)}</td>
      </tr>`
    }).join('')

    const html = wrap(`
  ${headerHTML(so.party_no, so.shipment_date || new Date(), 'Commercial Invoice')}

  <!-- Buyer / Seller -->
  <div class="buyer-block">
    <div class="buyer-col">
      <div class="buyer-label">Bill To / Consignee</div>
      <div class="buyer-name">${val(so.customer_name)}</div>
      <div class="buyer-detail">${val(so.customer_address)}${so.customer_country ? '<br>' + so.customer_country : ''}</div>
    </div>
    <div class="buyer-col narrow">
      <div class="buyer-label">Seller / Exporter</div>
      <div class="buyer-name" style="font-size:7pt;">${CO.short}</div>
      <div class="buyer-detail">${CO.address}<br>Tax: ${CO.tax}</div>
    </div>
  </div>

  <!-- Shipment details -->
  <div class="sec g">Shipment Details</div>
  <div class="g4">
    <div class="c"><div class="lbl">Invoice No</div><div class="val">${val(so.invoice_no || so.party_no)}</div></div>
    <div class="c"><div class="lbl">SA Number</div><div class="val">${val(so.sa_number)}</div></div>
    <div class="c"><div class="lbl">Lot / Party No</div><div class="val">${val(so.lot_no)}</div></div>
    <div class="c"><div class="lbl">Shipment Date</div><div class="val">${fmtDate(so.shipment_date)}</div></div>
  </div>
  <div class="g4">
    <div class="c"><div class="lbl">Delivery Date</div><div class="val">${fmtDate(so.delivery_date)}</div></div>
    <div class="c"><div class="lbl">Payment Terms</div><div class="val">${val(so.payment_term)}</div></div>
    <div class="c"><div class="lbl">Payment Method</div><div class="val">${val(so.payment_method)}</div></div>
    <div class="c"><div class="lbl">Currency</div><div class="val">${val(so.currency)}</div></div>
  </div>
  <div class="g4">
    <div class="c"><div class="lbl">Incoterm</div><div class="val">${val(so.incoterm)}</div></div>
    <div class="c"><div class="lbl">Transport Mode</div><div class="val">${val(so.transport_mode)}</div></div>
    <div class="c"><div class="lbl">Port of Loading</div><div class="val">${val(so.port_loading)}</div></div>
    <div class="c"><div class="lbl">Port of Discharge</div><div class="val">${val(so.port_discharge)}</div></div>
  </div>

  <!-- Tracking -->
  ${(so.container_number || so.vessel_name || so.seawaybill_number || so.tracking_number) ? `
  <div class="sec s">Shipping References</div>
  <div class="g4">
    <div class="c"><div class="lbl">Container No</div><div class="val">${val(so.container_number)}</div></div>
    <div class="c"><div class="lbl">Vessel Name</div><div class="val">${val(so.vessel_name)}</div></div>
    <div class="c"><div class="lbl">Sea Waybill No</div><div class="val">${val(so.seawaybill_number)}</div></div>
    <div class="c"><div class="lbl">Tracking No</div><div class="val">${val(so.tracking_number)}</div></div>
  </div>
  <div class="g2">
    <div class="c"><div class="lbl">ETD</div><div class="val">${fmtDate(so.etd)}</div></div>
    <div class="c"><div class="lbl">ETA</div><div class="val">${fmtDate(so.eta)}</div></div>
  </div>` : ''}

  <!-- Goods table -->
  <div class="sec g" style="margin-top:5px;">Description of Goods</div>
  <table class="goods-table" style="margin-top:0;">
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Variety / Caliber</th>
        <th>Origin</th>
        <th>Box Type</th>
        <th class="r">Boxes</th>
        <th class="r">Net Wt (kg)</th>
        <th class="r">Gross Wt (kg)</th>
        <th class="r">Unit Price (${val(so.currency)})</th>
        <th class="r">Total (${val(so.currency)})</th>
      </tr>
    </thead>
    <tbody>${itemRowsHTML}</tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="font-weight:700;">TOTALS</td>
        <td class="r">${fmtNum(totalBoxes, 0)}</td>
        <td class="r">${fmtNum(totalNet)} kg</td>
        <td class="r">${fmtNum(totalGross)} kg</td>
        <td class="r"></td>
        <td class="r">${val(so.currency)} ${fmtNum(totalValue)}</td>
      </tr>
    </tfoot>
  </table>

  ${so.quality_notes ? `
  <div class="sec s" style="margin-top:5px;">Quality Notes</div>
  <div style="padding:4px 8px; border:1px solid #e2e8f0; font-size:6pt; color:#374151; line-height:1.6;">${so.quality_notes}</div>
  ` : ''}

  ${bankBlockHTML(so.currency)}

  ${issuerBlockHTML(so.customer_name)}
  ${footerHTML()}
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
        LEFT JOIN products p ON p.id = soi.product_id
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
        Tel: +90 530 552 83 06 · Tax No: 6481831271 · Antalya Kurumlar V.D.
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
    <div class="buyer-grid">
      <div class="buyer-col">
        <div class="lbl">Consignee</div>
        <div class="val-static">${val(so.customer_name)}</div>
        <div class="val-detail">${val(so.customer_address)}${so.customer_country ? '<br>' + so.customer_country : ''}</div>
      </div>
      <div class="buyer-col narrow">
        <div class="lbl">Shipper / Exporter</div>
        <div class="val-static" style="font-size:7pt;">ORVIA TROPICAL</div>
        <div class="val-detail">Fener Mah. 1964 Sk. Hacı M Gebizli Sit. D Blok No:6/A No:3, Muratpaşa / Antalya / Türkiye</div>
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
  return '<span class="ef" contenteditable="true" data-row="'+rowIdx+'" data-field="'+field+'" onblur="onEdit(this)" onkeydown="if(event.key===\\'Enter\\'){event.preventDefault();this.blur()}">' + (v || '') + '</span>';
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

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  setTimeout(()=>{ t.style.display='none'; }, 2500);
}

function downloadPDF() {
  showToast('PDF hazırlanıyor…');
  // Collect current editable values from DOM (in case user hasn't blurred)
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

    const orderRows = customRows || []
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

    const shippingRefs = (so.container_number || so.vessel_name || so.seawaybill_number) ? (
      '<div class="g3">' +
      '<div class="c"><div class="lbl">Container No</div><div class="val">' + val(so.container_number) + '</div></div>' +
      '<div class="c"><div class="lbl">Vessel Name</div><div class="val">' + val(so.vessel_name) + '</div></div>' +
      '<div class="c"><div class="lbl">Sea Waybill No</div><div class="val">' + val(so.seawaybill_number) + '</div></div>' +
      '</div>'
    ) : ''

    const qualitySection = so.quality_notes ? (
      '<div class="sec s" style="margin-top:5px;">Quality Notes</div>' +
      '<div style="padding:4px 8px; border:1px solid #e2e8f0; font-size:6pt; color:#374151; line-height:1.6;">' + so.quality_notes + '</div>'
    ) : ''

    const htmlBody = [
      headerHTML(so.party_no, so.shipment_date || new Date(), 'Packing List'),
      '<div class="buyer-block">',
      '  <div class="buyer-col">',
      '    <div class="buyer-label">Consignee</div>',
      '    <div class="buyer-name">' + val(so.customer_name) + '</div>',
      '    <div class="buyer-detail">' + val(so.customer_address) + (so.customer_country ? '<br>' + so.customer_country : '') + '</div>',
      '  </div>',
      '  <div class="buyer-col narrow">',
      '    <div class="buyer-label">Shipper / Exporter</div>',
      '    <div class="buyer-name" style="font-size:7pt;">' + CO.short + '</div>',
      '    <div class="buyer-detail">' + CO.address + '</div>',
      '  </div>',
      '</div>',
      '<div class="sec g">Shipment Details</div>',
      '<div class="g4">',
      '  <div class="c"><div class="lbl">Packing List No</div><div class="val">' + val(so.invoice_no || so.party_no) + '</div></div>',
      '  <div class="c"><div class="lbl">Invoice No</div><div class="val">' + val(so.invoice_no || so.party_no) + '</div></div>',
      '  <div class="c"><div class="lbl">SA Number</div><div class="val">' + val(so.sa_number) + '</div></div>',
      '  <div class="c"><div class="lbl">Lot / Party No</div><div class="val">' + val(so.lot_no) + '</div></div>',
      '</div>',
      '<div class="g4">',
      '  <div class="c"><div class="lbl">Shipment Date</div><div class="val">' + fmtDate(so.shipment_date) + '</div></div>',
      '  <div class="c"><div class="lbl">Incoterm</div><div class="val">' + val(so.incoterm) + '</div></div>',
      '  <div class="c"><div class="lbl">Transport Mode</div><div class="val">' + val(so.transport_mode) + '</div></div>',
      '  <div class="c"><div class="lbl">ETD</div><div class="val">' + fmtDate(so.etd) + '</div></div>',
      '</div>',
      '<div class="g4">',
      '  <div class="c"><div class="lbl">Port of Loading</div><div class="val">' + val(so.port_loading) + '</div></div>',
      '  <div class="c"><div class="lbl">Port of Discharge</div><div class="val">' + val(so.port_discharge) + '</div></div>',
      '  <div class="c"><div class="lbl">ETA</div><div class="val">' + fmtDate(so.eta) + '</div></div>',
      '  <div class="c"><div class="lbl">Delivery Date</div><div class="val">' + fmtDate(so.delivery_date) + '</div></div>',
      '</div>',
      shippingRefs,
      '<div class="pkg-strip mt6">',
      '  <div class="pkg-item"><div class="lbl">Total Pallets</div><div class="val">' + pc + '</div></div>',
      '  <div class="pkg-item"><div class="lbl">Total Boxes</div><div class="val">' + fmtNum(totalBoxes, 0) + '</div></div>',
      '  <div class="pkg-item"><div class="lbl">Net Weight</div><div class="val">' + fmtNum(totalNet) + ' kg</div></div>',
      '  <div class="pkg-item"><div class="lbl">Gross Weight</div><div class="val">' + fmtNum(totalGross) + ' kg</div></div>',
      '  <div class="pkg-item"><div class="lbl">Box Type</div><div class="val">' + val(orderRows[0] ? orderRows[0].boxType : '') + '</div></div>',
      '  <div class="pkg-item"><div class="lbl">Net / Box</div><div class="val">' + fmtNum(parseFloat(orderRows[0] ? orderRows[0].netBox : 0) || 0) + ' kg</div></div>',
      '</div>',
      '<div class="sec g" style="margin-top:5px;">Pallet / Item Breakdown</div>',
      '<table class="pl-table">',
      '  <thead><tr>',
      '    <th>Pallet / Item</th><th>Product</th><th>Variety / Caliber</th><th>Origin</th><th>Box Type</th>',
      '    <th class="r">Boxes</th><th class="r">Net / Box</th><th class="r">Net Wt (kg)</th><th class="r">Gross Wt (kg)</th>',
      '  </tr></thead>',
      '  <tbody>' + palletRowsHTML + '</tbody>',
      '  <tfoot><tr>',
      '    <td colspan="5">TOTALS — ' + pc + ' Pallet(s)</td>',
      '    <td class="r">' + fmtNum(totalBoxes, 0) + ' boxes</td>',
      '    <td class="r">—</td>',
      '    <td class="r">' + fmtNum(totalNet) + ' kg</td>',
      '    <td class="r">' + fmtNum(totalGross) + ' kg</td>',
      '  </tr></tfoot>',
      '</table>',
      qualitySection,
      issuerBlockHTML(so.customer_name),
      footerHTML(),
    ].join('\n')

    const html = wrap(htmlBody)

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

// ─── Route: Packing List ──────────────────────────────────────────────────────

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
        LEFT JOIN products p ON p.id = soi.product_id
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

    const palletCount    = so.pallets || 1
    const totalBoxes     = orderItems.reduce((s, it) => {
      const bw = Number(it.box_weight_kg || 0)
      return s + (bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0)
    }, 0)
    const totalNet  = orderItems.reduce((s, it) => s + Number(it.quantity_kg || 0), 0)
    const totalGross = orderItems.reduce((s, it) => {
      const bw = Number(it.box_weight_kg || 0)
      const b  = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
      return s + b * bw * 1.05
    }, 0)

    // Build pallet rows: distribute boxes across pallets, then list each product line per pallet
    const boxesPerPallet = Math.floor(totalBoxes / palletCount)
    const remainder      = totalBoxes % palletCount
    const palletRows = []
    for (let i = 0; i < palletCount; i++) {
      const palletBoxes = i < remainder ? boxesPerPallet + 1 : boxesPerPallet
      // Attribute all items on this pallet (simplified: first item's product info)
      const firstIt = orderItems[0] || {}
      const bw = Number(firstIt.box_weight_kg || 0)
      palletRows.push({
        pallet:      i + 1,
        palletBoxes,
        netKg:       palletBoxes * bw,
        grossKg:     palletBoxes * bw * 1.05,
        product_name: firstIt.product_name,
        variety:      firstIt.variety,
        caliber:      firstIt.caliber,
        origin:       firstIt.origin,
        box_type:     firstIt.box_type,
        box_weight_kg: bw,
      })
    }

    // For multi-item orders, show one row per item instead of per pallet
    const useItemRows = orderItems.length > 1
    const palletRowsHTML = useItemRows
      ? orderItems.map((it, idx) => {
          const bw    = Number(it.box_weight_kg || 0)
          const b     = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
          const net   = Number(it.quantity_kg || 0)
          const gross = b * bw * 1.05
          return `
      <tr>
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
      : palletRows.map(r => `
      <tr>
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

    const html = wrap(`
  ${headerHTML(so.party_no, so.shipment_date || new Date(), 'Packing List')}

  <div class="buyer-block">
    <div class="buyer-col">
      <div class="buyer-label">Consignee</div>
      <div class="buyer-name">${val(so.customer_name)}</div>
      <div class="buyer-detail">${val(so.customer_address)}${so.customer_country ? '<br>' + so.customer_country : ''}</div>
    </div>
    <div class="buyer-col narrow">
      <div class="buyer-label">Shipper / Exporter</div>
      <div class="buyer-name" style="font-size:7pt;">${CO.short}</div>
      <div class="buyer-detail">${CO.address}</div>
    </div>
  </div>

  <div class="sec g">Shipment Details</div>
  <div class="g4">
    <div class="c"><div class="lbl">Packing List No</div><div class="val">${val(so.invoice_no || so.party_no)}</div></div>
    <div class="c"><div class="lbl">Invoice No</div><div class="val">${val(so.invoice_no || so.party_no)}</div></div>
    <div class="c"><div class="lbl">SA Number</div><div class="val">${val(so.sa_number)}</div></div>
    <div class="c"><div class="lbl">Lot / Party No</div><div class="val">${val(so.lot_no)}</div></div>
  </div>
  <div class="g4">
    <div class="c"><div class="lbl">Shipment Date</div><div class="val">${fmtDate(so.shipment_date)}</div></div>
    <div class="c"><div class="lbl">Incoterm</div><div class="val">${val(so.incoterm)}</div></div>
    <div class="c"><div class="lbl">Transport Mode</div><div class="val">${val(so.transport_mode)}</div></div>
    <div class="c"><div class="lbl">ETD</div><div class="val">${fmtDate(so.etd)}</div></div>
  </div>
  <div class="g4">
    <div class="c"><div class="lbl">Port of Loading</div><div class="val">${val(so.port_loading)}</div></div>
    <div class="c"><div class="lbl">Port of Discharge</div><div class="val">${val(so.port_discharge)}</div></div>
    <div class="c"><div class="lbl">ETA</div><div class="val">${fmtDate(so.eta)}</div></div>
    <div class="c"><div class="lbl">Delivery Date</div><div class="val">${fmtDate(so.delivery_date)}</div></div>
  </div>
  ${(so.container_number || so.vessel_name || so.seawaybill_number) ? `
  <div class="g3">
    <div class="c"><div class="lbl">Container No</div><div class="val">${val(so.container_number)}</div></div>
    <div class="c"><div class="lbl">Vessel Name</div><div class="val">${val(so.vessel_name)}</div></div>
    <div class="c"><div class="lbl">Sea Waybill No</div><div class="val">${val(so.seawaybill_number)}</div></div>
  </div>` : ''}

  <!-- Package summary strip -->
  <div class="pkg-strip mt6">
    <div class="pkg-item"><div class="lbl">Total Pallets</div><div class="val">${palletCount}</div></div>
    <div class="pkg-item"><div class="lbl">Total Boxes</div><div class="val">${fmtNum(totalBoxes, 0)}</div></div>
    <div class="pkg-item"><div class="lbl">Net Weight</div><div class="val">${fmtNum(totalNet)} kg</div></div>
    <div class="pkg-item"><div class="lbl">Gross Weight</div><div class="val">${fmtNum(totalGross)} kg</div></div>
    <div class="pkg-item"><div class="lbl">Box Type</div><div class="val">${val(orderItems[0]?.box_type || so.box_type)}</div></div>
    <div class="pkg-item"><div class="lbl">Net / Box</div><div class="val">${fmtNum(orderItems[0]?.box_weight_kg || so.box_weight_kg)} kg</div></div>
  </div>

  <div class="sec g" style="margin-top:5px;">${useItemRows ? 'Item Breakdown' : 'Pallet Breakdown'}</div>
  <table class="pl-table">
    <thead>
      <tr>
        <th>${useItemRows ? 'Item' : 'Pallet'}</th>
        <th>Product</th>
        <th>Variety / Caliber</th>
        <th>Origin</th>
        <th>Box Type</th>
        <th class="r">Boxes</th>
        <th class="r">Net / Box</th>
        <th class="r">Net Wt (kg)</th>
        <th class="r">Gross Wt (kg)</th>
      </tr>
    </thead>
    <tbody>${palletRowsHTML}</tbody>
    <tfoot>
      <tr>
        <td colspan="5">TOTALS — ${palletCount} Pallet(s)</td>
        <td class="r">${fmtNum(totalBoxes, 0)} boxes</td>
        <td class="r">—</td>
        <td class="r">${fmtNum(totalNet)} kg</td>
        <td class="r">${fmtNum(totalGross)} kg</td>
      </tr>
    </tfoot>
  </table>

  ${so.quality_notes ? `
  <div class="sec s" style="margin-top:5px;">Quality Notes</div>
  <div style="padding:4px 8px; border:1px solid #e2e8f0; font-size:6pt; color:#374151; line-height:1.6;">${so.quality_notes}</div>
  ` : ''}

  ${issuerBlockHTML(so.customer_name)}
  ${footerHTML()}
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
        LEFT JOIN products p ON p.id = soi.product_id
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

    // Totals across all items
    const totalNet   = orderItems.reduce((s, it) => s + Number(it.quantity_kg || 0), 0)
    const totalValue = orderItems.reduce((s, it) => {
      const bw = Number(it.box_weight_kg || so.box_weight_kg || 0)
      const boxes = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
      return s + boxes * Number(it.price_per_unit || 0)
    }, 0)
    const totalBoxes = orderItems.reduce((s, it) => {
      const bw = Number(it.box_weight_kg || so.box_weight_kg || 0)
      return s + (bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0)
    }, 0)
    const totalGross = orderItems.reduce((s, it) => {
      const bw = Number(it.box_weight_kg || so.box_weight_kg || 0)
      const boxes = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
      return s + boxes * bw * 1.05
    }, 0)

    // Legacy compat vars (used elsewhere)
    const boxes      = totalBoxes

    // Required docs
    let requiredDocs = {}
    try { requiredDocs = so.required_docs ? (typeof so.required_docs === 'string' ? JSON.parse(so.required_docs) : so.required_docs) : {} } catch (_) {}

    const docBadges = [
      { label: 'Commercial Invoice',        color: '#0a5c3a', bg: '#f0fdf4', border: '#86efac' },
      { label: 'Packing List',              color: '#0a5c3a', bg: '#f0fdf4', border: '#86efac' },
      { label: 'Phytosanitary Certificate', color: '#0a5c3a', bg: '#f0fdf4', border: '#86efac' },
      { label: 'Certificate of Origin',     color: '#0a5c3a', bg: '#f0fdf4', border: '#86efac' },
    ]
    if (requiredDocs.health_certificate) docBadges.push({ label: 'Health Certificate',  color: '#166534', bg: '#dcfce7', border: '#4ade80' })
    if (requiredDocs.non_gmo)            docBadges.push({ label: 'Non-GMO Certificate (India)', color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' })
    if (requiredDocs.fumigation)         docBadges.push({ label: 'Fumigation Certificate', color: '#166534', bg: '#dcfce7', border: '#4ade80' })
    if (requiredDocs.halal)              docBadges.push({ label: 'Halal Certificate',    color: '#92400e', bg: '#fef3c7', border: '#fcd34d' })

    const badgeHTML = docBadges.map(d =>
      `<span style="display:inline-block;border:1px solid ${d.border};background:${d.bg};color:${d.color};font-size:5.5pt;font-weight:600;padding:1px 6px;border-radius:2px;margin:2px 2px 0 0;">${d.label}</span>`
    ).join('')

    const html = wrap(`
  <div class="hdr" style="min-height:56px;">
    <div class="hdr-brand">
      <div class="hdr-logo">ORVIA <span>TROPICAL</span></div>
      <div class="hdr-co">
        ${CO.name}<br>
        ${CO.address}<br>
        Tel: ${CO.tel} · Tax No: ${CO.tax} · ${CO.web}
      </div>
    </div>
    <div class="hdr-right">
      <div style="color:#6ee7b7;font-size:8.5pt;font-weight:800;letter-spacing:2px;text-transform:uppercase;">SALES AGREEMENT</div>
      <div class="hdr-docno" style="font-size:13pt;">${val(so.sa_number || so.party_no)}</div>
      <div class="hdr-date">${fmtDate(so.shipment_date || new Date())}</div>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="pty l">
      <div class="pty-hdr g">Seller / Exporter</div>
      <div class="pty-name">${CO.name}</div>
      <div class="pty-detail">
        ${CO.address}<br>
        Tax No: ${CO.tax}<br>
        Tel: ${CO.tel}<br>
        ${CO.web}
      </div>
    </div>
    <div class="pty">
      <div class="pty-hdr b">Buyer / Importer</div>
      <div class="pty-name" style="color:#1d4ed8;">${val(so.customer_name)}</div>
      <div class="pty-detail">
        ${val(so.customer_address)}${so.customer_country ? '<br>' + so.customer_country : ''}
      </div>
    </div>
  </div>

  <!-- Agreement details -->
  <div class="sec g">Agreement Details</div>
  <div class="g4">
    <div class="c"><div class="lbl">SA Number</div><div class="val">${val(so.sa_number || so.party_no)}</div></div>
    <div class="c"><div class="lbl">Lot / Party No</div><div class="val">${val(so.lot_no)}</div></div>
    <div class="c"><div class="lbl">Shipment Date</div><div class="val">${fmtDate(so.shipment_date)}</div></div>
    <div class="c"><div class="lbl">Delivery Date</div><div class="val">${fmtDate(so.delivery_date)}</div></div>
  </div>
  <div class="g4">
    <div class="c"><div class="lbl">Currency</div><div class="val">${val(so.currency)}</div></div>
  </div>
  <div class="g4">
    <div class="c"><div class="lbl">Incoterm</div><div class="val">${val(so.incoterm)}</div></div>
    <div class="c"><div class="lbl">Port of Loading</div><div class="val">${val(so.port_loading)}</div></div>
    <div class="c"><div class="lbl">Port of Discharge</div><div class="val">${val(so.port_discharge)}</div></div>
    <div class="c"><div class="lbl">Transport Mode</div><div class="val">${val(so.transport_mode)}</div></div>
  </div>
  <div class="g4">
    <div class="c"><div class="lbl">Payment Method</div><div class="val">${val(so.payment_method)}</div></div>
    <div class="c"><div class="lbl">Payment Terms</div><div class="val">${val(so.payment_term)}</div></div>
    <div class="c"><div class="lbl">Origin</div><div class="val">${val(so.origin)}</div></div>
    <div class="c"><div class="lbl">Pallets</div><div class="val">${val(so.pallets)}</div></div>
  </div>

  <!-- Goods -->
  <div class="sec g" style="margin-top:5px;">Goods Specification</div>
  <table class="goods-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Variety</th>
        <th>Caliber</th>
        <th>Origin</th>
        <th>Box Type</th>
        <th class="r">Boxes</th>
        <th class="r">Net Wt (kg)</th>
        <th class="r">Gross Wt (kg)</th>
        <th class="r">Unit Price</th>
        <th class="r">Total Value</th>
      </tr>
    </thead>
    <tbody>
      ${orderItems.map((it, idx) => {
        const bw      = Number(it.box_weight_kg || so.box_weight_kg || 0)
        const itBoxes = bw > 0 ? Math.round(Number(it.quantity_kg || 0) / bw) : 0
        const itNet   = Number(it.quantity_kg || 0)
        const itGross = itBoxes * bw * 1.05
        const itValue = itBoxes * Number(it.price_per_unit || 0)
        const prodName = it.product_name || so.product_name
        return `<tr>
          <td>${idx + 1}</td>
          <td>${val(prodName)}</td>
          <td>${val(it.variety)}</td>
          <td>${val(it.caliber)}</td>
          <td>${val(it.origin)}</td>
          <td>${val(it.box_type || so.box_type)}</td>
          <td class="r">${fmtNum(itBoxes, 0)}</td>
          <td class="r">${fmtNum(itNet)} kg</td>
          <td class="r">${fmtNum(itGross)} kg</td>
          <td class="r">${val(so.currency)} ${fmtNum(it.price_per_unit)}/box</td>
          <td class="r">${val(so.currency)} ${fmtNum(itValue)}</td>
        </tr>`
      }).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6">TOTAL CONTRACT VALUE</td>
        <td class="r">${fmtNum(totalBoxes, 0)}</td>
        <td class="r">${fmtNum(totalNet)} kg</td>
        <td class="r">${fmtNum(totalGross)} kg</td>
        <td class="r"></td>
        <td class="r">${val(so.currency)} ${fmtNum(totalValue)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Required Documents -->
  <div class="sec s" style="margin-top:5px;">Required Documents</div>
  <div style="padding:5px 8px; border:1px solid #e2e8f0;">
    ${badgeHTML}
  </div>

  ${so.quality_notes ? `
  <div class="sec s" style="margin-top:5px;">Quality &amp; Specifications</div>
  <div class="c wide-text" style="border:1px solid #e2e8f0;"><div class="val">${so.quality_notes}</div></div>
  ` : ''}

  ${so.notes ? `
  <div class="sec s" style="margin-top:5px;">Additional Notes</div>
  <div class="c wide-text" style="border:1px solid #e2e8f0;"><div class="val">${so.notes}</div></div>
  ` : ''}

  <!-- Standard Clauses -->
  <div class="sec g" style="margin-top:5px;">Standard Terms &amp; Conditions</div>
  <div class="clauses">
    <div class="clause">
      <div class="clause-t">1. Governing Law</div>
      <div class="clause-b">This agreement is governed by Turkish law. Any disputes shall be resolved in the courts of Antalya, Türkiye.</div>
    </div>
    <div class="clause">
      <div class="clause-t">2. Quality &amp; Inspection</div>
      <div class="clause-b">Goods shall conform to export-grade standards. Buyer may inspect upon arrival. Claims must be filed within 5 days of receipt with photographic evidence.</div>
    </div>
    <div class="clause">
      <div class="clause-t">3. Delivery &amp; Risk</div>
      <div class="clause-b">Risk of loss transfers to Buyer at the delivery point per agreed Incoterm. Seller is not liable for delays caused by force majeure events.</div>
    </div>
    <div class="clause">
      <div class="clause-t">4. Payment</div>
      <div class="clause-b">Payment shall be made per the terms stated above. Overdue amounts attract interest at 1.5% per month. Seller reserves title until full payment.</div>
    </div>
    <div class="clause">
      <div class="clause-t">5. Force Majeure</div>
      <div class="clause-b">Neither party shall be liable for delays caused by events beyond reasonable control, including natural disasters, pandemics, strikes, or government restrictions.</div>
    </div>
    <div class="clause">
      <div class="clause-t">6. Documentation</div>
      <div class="clause-b">Seller shall provide all agreed shipping documents within 5 business days of vessel departure. Originals dispatched via courier where required.</div>
    </div>
    <div class="clause">
      <div class="clause-t">7. Phytosanitary Compliance</div>
      <div class="clause-b">All goods comply with import regulations of the destination country. Seller warrants goods are free from pests and diseases at time of export.</div>
    </div>
    <div class="clause">
      <div class="clause-t">8. Entire Agreement</div>
      <div class="clause-b">This document constitutes the entire agreement between the parties and supersedes all prior negotiations. Amendments must be in writing and signed by both parties.</div>
    </div>
  </div>

  ${bankBlockHTML(so.currency)}

  ${issuerBlockHTML(so.customer_name)}
  ${footerHTML()}
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

    const boxes      = Math.round(po.quantity_kg / po.box_weight_kg)
    const totalNet   = po.quantity_kg
    const totalGross = boxes * po.box_weight_kg * 1.05
    const totalValue = boxes * Number(po.price_per_unit)

    const html = wrap(`
  ${headerHTML(po.party_no, po.shipment_date || new Date(), 'Purchase Order')}

  <!-- Parties -->
  <div class="parties">
    <div class="pty l">
      <div class="pty-hdr g">Buyer / Importer</div>
      <div class="pty-name">${CO.name}</div>
      <div class="pty-detail">
        ${CO.address}<br>
        Tax No: ${CO.tax}<br>
        Tel: ${CO.tel}<br>
        ${CO.web}
      </div>
    </div>
    <div class="pty">
      <div class="pty-hdr b">Supplier / Exporter</div>
      <div class="pty-name" style="color:#1d4ed8;">${val(po.supplier_name)}</div>
      <div class="pty-detail">
        ${val(po.supplier_address)}${po.supplier_country ? '<br>' + po.supplier_country : ''}
      </div>
    </div>
  </div>

  <!-- PO details -->
  <div class="sec g">Purchase Order Details</div>
  <div class="g4">
    <div class="c"><div class="lbl">PO Number</div><div class="val">${val(po.party_no)}</div></div>
    <div class="c"><div class="lbl">Shipment Date</div><div class="val">${fmtDate(po.shipment_date)}</div></div>
    <div class="c"><div class="lbl">Delivery Date</div><div class="val">${fmtDate(po.delivery_date)}</div></div>
    <div class="c"><div class="lbl">Currency</div><div class="val">${val(po.currency)}</div></div>
  </div>
  <div class="g4">
    <div class="c"><div class="lbl">Incoterm</div><div class="val">${val(po.incoterm)}</div></div>
    <div class="c"><div class="lbl">Port of Loading</div><div class="val">${val(po.port_loading)}</div></div>
    <div class="c"><div class="lbl">Port of Discharge</div><div class="val">${val(po.port_discharge)}</div></div>
    <div class="c"><div class="lbl">Transport Mode</div><div class="val">${val(po.transport_mode)}</div></div>
  </div>
  <div class="g4">
    <div class="c"><div class="lbl">Payment Method</div><div class="val">${val(po.payment_method)}</div></div>
    <div class="c"><div class="lbl">Payment Terms</div><div class="val">${val(po.payment_term)}</div></div>
    <div class="c"><div class="lbl">Origin</div><div class="val">${val(po.origin)}</div></div>
    <div class="c"><div class="lbl">Pallets</div><div class="val">${val(po.pallets)}</div></div>
  </div>

  <!-- Goods table -->
  <div class="sec g" style="margin-top:5px;">Goods Ordered</div>
  <table class="goods-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Variety</th>
        <th>Caliber</th>
        <th>Origin</th>
        <th>Box Type</th>
        <th class="r">Boxes</th>
        <th class="r">Net Wt (kg)</th>
        <th class="r">Gross Wt (kg)</th>
        <th class="r">Unit Price</th>
        <th class="r">Total Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${val(po.product_name)}</td>
        <td>${val(po.variety)}</td>
        <td>${val(po.caliber)}</td>
        <td>${val(po.origin)}</td>
        <td>${val(po.box_type)}</td>
        <td class="r">${fmtNum(boxes, 0)}</td>
        <td class="r">${fmtNum(totalNet)} kg</td>
        <td class="r">${fmtNum(totalGross)} kg</td>
        <td class="r">${val(po.currency)} ${fmtNum(po.price_per_unit)}</td>
        <td class="r">${val(po.currency)} ${fmtNum(totalValue)}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6">TOTAL ORDER VALUE</td>
        <td class="r">${fmtNum(boxes, 0)}</td>
        <td class="r">${fmtNum(totalNet)} kg</td>
        <td class="r">${fmtNum(totalGross)} kg</td>
        <td class="r"></td>
        <td class="r">${val(po.currency)} ${fmtNum(totalValue)}</td>
      </tr>
    </tfoot>
  </table>

  ${po.notes ? `
  <div class="sec s" style="margin-top:5px;">Notes &amp; Special Instructions</div>
  <div class="c wide-text" style="border:1px solid #e2e8f0;"><div class="val">${po.notes}</div></div>
  ` : ''}

  <!-- Standard PO clauses -->
  <div class="sec g" style="margin-top:5px;">Purchase Terms &amp; Conditions</div>
  <div class="clauses">
    <div class="clause">
      <div class="clause-t">1. Acceptance</div>
      <div class="clause-b">This Purchase Order constitutes a binding offer. Supplier acceptance (written or by commencement of performance) forms a contract under these terms.</div>
    </div>
    <div class="clause">
      <div class="clause-t">2. Quantity &amp; Quality</div>
      <div class="clause-b">Goods must match the specification above. Shortfalls exceeding 5% or quality deviations entitle Buyer to price adjustment or rejection.</div>
    </div>
    <div class="clause">
      <div class="clause-t">3. Delivery</div>
      <div class="clause-b">Goods must be shipped by the stated shipment date. Supplier must notify Buyer immediately of any anticipated delay.</div>
    </div>
    <div class="clause">
      <div class="clause-t">4. Documentation</div>
      <div class="clause-b">Supplier shall provide: commercial invoice, packing list, phytosanitary certificate, and certificate of origin within 3 business days of shipment.</div>
    </div>
    <div class="clause">
      <div class="clause-t">5. Payment</div>
      <div class="clause-b">Payment shall be made per the agreed terms following receipt and verification of compliant shipping documents and goods.</div>
    </div>
    <div class="clause">
      <div class="clause-t">6. Compliance</div>
      <div class="clause-b">Supplier warrants compliance with all applicable export regulations, phytosanitary standards, and labelling requirements for the destination country.</div>
    </div>
    <div class="clause">
      <div class="clause-t">7. Force Majeure</div>
      <div class="clause-b">Neither party shall be liable for delays caused by events beyond reasonable control, provided prompt written notice is given.</div>
    </div>
    <div class="clause">
      <div class="clause-t">8. Governing Law</div>
      <div class="clause-b">This PO is governed by Turkish law. Any disputes shall be resolved in the courts of Antalya, Türkiye unless otherwise agreed in writing.</div>
    </div>
  </div>

  ${bankBlockHTML(po.currency)}

  ${issuerBlockHTML()}
  ${footerHTML()}
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
