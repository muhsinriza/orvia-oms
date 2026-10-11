const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const ExcelJS = require('exceljs')

router.use(requireAuth)

// ── Brand colours ─────────────────────────────────────────────────────────────
const ORVIA_DARK   = 'FF0A2540'   // deep navy (primary brand)
const ORVIA_MID    = 'FF0F3D6B'   // mid navy (headers)
const ORVIA_TEAL   = 'FF0D5E7A'   // teal accent (secondary headers/highlights)
const ORVIA_LIGHT  = 'FFE8F1F8'   // pale blue tint (label backgrounds)
const ORVIA_ACCENT = 'FF1A6BB5'   // logo blue (totals, action rows)
const WHITE        = 'FFFFFFFF'
const GRAY_BG      = 'FFF6F9FC'   // off-white alternating rows
const GOLD_BG      = 'FFFFF3CD'   // soft amber for highlight notes
const GOLD_TEXT    = 'FF856404'   // amber text
const GREEN_BG     = 'FFE6F4EA'
const GREEN_TEXT   = 'FF1A6B3C'
const BORDER_CLR   = 'FFB8CCE0'   // slightly deeper border

// GET /api/customs-excel/:id — generate İhracat Detayları Excel
router.get('/:id', async (req, res) => {
  try {
    const { rows: soRows } = await db.query(`
      SELECT so.*,
             c.name    AS customer_name,
             c.address AS customer_address,
             c.country AS customer_country,
             c.city    AS customer_city,
             c.gst_no, c.iec_no, c.pan_no, c.fssai_no
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      WHERE so.id = $1
    `, [req.params.id])
    if (!soRows[0]) return res.status(404).json({ error: 'Sipariş bulunamadı' })
    const so = soRows[0]

    const { rows: items } = await db.query(`
      SELECT soi.*,
             p.name              AS product_name,
             p.category          AS product_category,
             p.gtip_code,
             p.box_net_kg        AS p_box_net_kg,
             p.box_gross_kg      AS p_box_gross_kg,
             p.boxes_per_pallet  AS p_boxes_per_pallet
      FROM sales_order_items soi
      LEFT JOIN products p ON p.id::text = soi.product_id::text
      WHERE soi.sales_order_id = $1
      ORDER BY soi.sort_order
    `, [req.params.id])

    const { rows: containers } = await db.query(
      'SELECT * FROM sales_order_containers WHERE sales_order_id=$1 ORDER BY sort_order, id',
      [req.params.id]
    )

    // ── Helpers ────────────────────────────────────────────────────────────────
    function fmtDate (d) {
      if (!d) return '—'
      const dt = new Date(d)
      if (isNaN(dt)) return String(d)
      return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    function fmtNum (n, dec = 2) {
      if (n == null || isNaN(n)) return '—'
      return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    }

    // ── Workbook / sheet ───────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook()
    wb.creator  = 'Orvia Tropical'
    wb.created  = new Date()
    const ws = wb.addWorksheet('İhracat Detayları', { views: [{ showGridLines: false }] })

    // ── Column definitions ─────────────────────────────────────────────────────
    // A  B        C            D       E        F            G      H        I         J       K               L
    // #  Palet    Koli (adet)  Cinsi   Çeşidi   Malzeme Adı  GTIP   Ambalaj  Brüt Kg   Net Kg  Birim Fiyat USD  Tutar USD
    ws.columns = [
      { key: 'no',    width: 5  },
      { key: 'pal',   width: 9  },
      { key: 'koli',  width: 11 },
      { key: 'cins',  width: 14 },
      { key: 'cesit', width: 14 },
      { key: 'mal',   width: 32 },
      { key: 'gtip',  width: 16 },
      { key: 'amb',   width: 11 },
      { key: 'brut',  width: 13 },
      { key: 'net',   width: 13 },
      { key: 'birim', width: 16 },
      { key: 'tutar', width: 16 },
    ]

    // ── Style factories ────────────────────────────────────────────────────────
    const thinBorder = { style: 'thin', color: { argb: BORDER_CLR } }
    const allBorder  = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder }
    const boldBorder = { top: { style: 'medium', color: { argb: ORVIA_MID } }, left: thinBorder, bottom: { style: 'medium', color: { argb: ORVIA_MID } }, right: thinBorder }

    const ctr  = { horizontal: 'center', vertical: 'middle', wrapText: true }
    const lft  = { horizontal: 'left',   vertical: 'middle', wrapText: true }
    const rgt  = { horizontal: 'right',  vertical: 'middle', wrapText: false }

    function applyCell (cell, { value, font, fill, alignment, border, numFmt } = {}) {
      if (value !== undefined) cell.value = value
      if (font)      cell.font      = font
      if (fill)      cell.fill      = fill
      if (alignment) cell.alignment = alignment
      if (border)    cell.border    = border
      if (numFmt)    cell.numFmt    = numFmt
    }

    function solidFill (argb) { return { type: 'pattern', pattern: 'solid', fgColor: { argb } } }

    // ── ROW 1 — banner (title + customer name) ───────────────────────────────
    ws.mergeCells('A1:L1')
    ws.getRow(1).height = 46
    const bannerTitle = so.customer_name
      ? `  İHRACAT DETAYLARI  —  ${so.customer_name.toUpperCase()}`
      : '  İHRACAT DETAYLARI'
    applyCell(ws.getCell('A1'), {
      value: bannerTitle,
      font:  { name: 'Calibri', bold: true, size: 15, color: { argb: WHITE } },
      fill:  solidFill(ORVIA_DARK),
      alignment: { horizontal: 'left', vertical: 'middle' },
    })

    // ── ROW 2 — company tag line & order reference ─────────────────────────────
    ws.mergeCells('A2:F2')
    ws.getRow(2).height = 20
    applyCell(ws.getCell('A2'), {
      value: 'Orvia Tropical Ltd  |  orviatropical.com  |  OrviaOMS',
      font:  { name: 'Calibri', italic: true, size: 9, color: { argb: ORVIA_ACCENT } },
      fill:  solidFill(ORVIA_LIGHT),
      alignment: lft,
    })
    ws.mergeCells('G2:L2')
    applyCell(ws.getCell('G2'), {
      value: `Sipariş: ${so.sa_number || so.party_no || '—'}   |   TAREKS: ${so.lot_no || '—'}`,
      font:  { name: 'Calibri', bold: true, size: 9, color: { argb: ORVIA_MID } },
      fill:  solidFill(ORVIA_LIGHT),
      alignment: { horizontal: 'right', vertical: 'middle' },
    })

    // ── ROW 3 — spacer ────────────────────────────────────────────────────────
    ws.getRow(3).height = 5
    ws.mergeCells('A3:L3')
    ws.getCell('A3').fill = solidFill(ORVIA_DARK)

    // ── ROW 4 — column headers ────────────────────────────────────────────────
    ws.getRow(4).height = 32
    const HEADERS = ['#', 'Palet', 'Koli (Adet)', 'Cinsi', 'Çeşidi', 'Malzeme Adı', 'GTIP Kodu', 'Ambalaj', 'Brüt Kg', 'Net Kg', 'Birim Fiyat\nUSD', 'Tutar\nUSD']
    const COLS    = ['A','B','C','D','E','F','G','H','I','J','K','L']
    HEADERS.forEach((h, i) => {
      applyCell(ws.getCell(`${COLS[i]}4`), {
        value:     h,
        font:      { name: 'Calibri', bold: true, size: 9, color: { argb: WHITE } },
        fill:      solidFill(ORVIA_MID),
        alignment: ctr,
        border:    allBorder,
      })
    })

    // ── DATA rows ─────────────────────────────────────────────────────────────
    let DR = 5   // data row cursor
    let totBoxes = 0, totPallets = 0, totNet = 0, totGross = 0, totAmount = 0

    items.forEach((item, idx) => {
      const isOdd = idx % 2 === 0
      const rowFill = solidFill(isOdd ? WHITE : GRAY_BG)

      // ── Calculations (always use qty_kg ÷ box_weight_kg) ──────────────────
      const boxNetKg     = parseFloat(item.box_weight_kg  || item.p_box_net_kg   || 0)
      const boxGrossKg   = parseFloat(item.p_box_gross_kg || (boxNetKg > 0 ? boxNetKg * 1.05 : 0))
      const qtyKg        = parseFloat(item.quantity_kg    || 0)
      const boxesPerPal  = parseInt(item.p_boxes_per_pallet || so.pallets || 66)
      const pricePerUnit = parseFloat(item.price_per_unit  || 0)

      // Box count: always derived from KG ÷ box weight (sell_by='kg' path)
      // If box weight unknown, fall back to quantity_kg as a raw box count (legacy)
      const boxCount   = (boxNetKg > 0) ? Math.round(qtyKg / boxNetKg) : Math.round(qtyKg)
      const palletCnt  = (boxesPerPal > 0 && boxCount > 0) ? Math.ceil(boxCount / boxesPerPal) : 0
      const netKg      = boxCount * boxNetKg
      const grossKg    = boxCount * boxGrossKg
      const totalUSD   = boxCount * pricePerUnit

      totBoxes   += boxCount
      totPallets += palletCnt
      totNet     += netKg
      totGross   += grossKg
      totAmount  += totalUSD

      // Malzeme adı: "18 Kg Gala Fresh Apple 18 KG Carton"
      const netLbl  = boxNetKg     ? `${boxNetKg} Kg `   : ''
      const varLbl  = item.variety ? `${item.variety} ` : ''
      const prodLbl = item.product_name || ''
      const ambLbl  = item.box_type || so.box_type || 'Carton'
      const malzeme = `${netLbl}${varLbl}${prodLbl} ${ambLbl}`.replace(/\s+/g, ' ').trim()

      ws.getRow(DR).height = 17

      const rowData = [
        { col: 'A', value: idx + 1,              align: ctr, numFmt: '0' },
        { col: 'B', value: palletCnt || '',       align: ctr },
        { col: 'C', value: boxCount,              align: ctr, numFmt: '#,##0' },
        { col: 'D', value: item.product_category || '', align: lft },
        { col: 'E', value: item.variety          || '', align: lft },
        { col: 'F', value: malzeme,               align: lft },
        { col: 'G', value: item.gtip_code        || '', align: ctr },
        { col: 'H', value: ambLbl,                align: ctr },
        { col: 'I', value: grossKg,               align: rgt, numFmt: '#,##0.00' },
        { col: 'J', value: netKg,                 align: rgt, numFmt: '#,##0.00' },
        { col: 'K', value: pricePerUnit,          align: rgt, numFmt: '#,##0.0000' },
        { col: 'L', value: totalUSD,              align: rgt, numFmt: '#,##0.00' },
      ]

      rowData.forEach(({ col, value, align, numFmt }) => {
        applyCell(ws.getCell(`${col}${DR}`), {
          value,
          font:      { name: 'Calibri', size: 9, color: { argb: ORVIA_DARK } },
          fill:      rowFill,
          alignment: align,
          border:    allBorder,
          numFmt,
        })
      })

      DR++
    })

    // ── TOTALS row ────────────────────────────────────────────────────────────
    ws.getRow(DR).height = 20
    ws.mergeCells(`A${DR}:B${DR}`)
    applyCell(ws.getCell(`A${DR}`), {
      value:     'TOPLAM',
      font:      { name: 'Calibri', bold: true, size: 10, color: { argb: WHITE } },
      fill:      solidFill(ORVIA_ACCENT),
      alignment: ctr,
      border:    boldBorder,
    })

    const totData = [
      { col: 'C', value: totBoxes,   numFmt: '#,##0'    },
      { col: 'D', value: '' },
      { col: 'E', value: '' },
      { col: 'F', value: '' },
      { col: 'G', value: '' },
      { col: 'H', value: '' },
      { col: 'I', value: totGross,   numFmt: '#,##0.00', align: rgt },
      { col: 'J', value: totNet,     numFmt: '#,##0.00', align: rgt },
      { col: 'K', value: '' },
      { col: 'L', value: totAmount,  numFmt: '#,##0.00', align: rgt },
    ]
    totData.forEach(({ col, value, numFmt, align }) => {
      applyCell(ws.getCell(`${col}${DR}`), {
        value,
        font:      { name: 'Calibri', bold: true, size: 10, color: { argb: WHITE } },
        fill:      solidFill(ORVIA_ACCENT),
        alignment: align || ctr,
        border:    boldBorder,
        numFmt,
      })
    })
    DR += 2

    // ── SECTION builder helpers ───────────────────────────────────────────────
    function sectionHeader (label, row, color = ORVIA_TEAL) {
      ws.getRow(row).height = 20
      ws.mergeCells(`A${row}:L${row}`)
      applyCell(ws.getCell(`A${row}`), {
        value:     `  ${label}`,
        font:      { name: 'Calibri', bold: true, size: 9, color: { argb: WHITE } },
        fill:      solidFill(color),
        alignment: lft,
      })
    }

    function infoRow (label, value, row, spanLabel = 3, spanValue = 9) {
      ws.getRow(row).height = 16
      // label cells
      ws.mergeCells(`A${row}:${COLS[spanLabel - 1]}${row}`)
      applyCell(ws.getCell(`A${row}`), {
        value:     label,
        font:      { name: 'Calibri', bold: true, size: 9, color: { argb: ORVIA_MID } },
        fill:      solidFill(ORVIA_LIGHT),
        alignment: lft,
        border:    allBorder,
      })
      // value cells
      const valColStart = COLS[spanLabel]
      const valColEnd   = COLS[spanLabel + spanValue - 1]
      ws.mergeCells(`${valColStart}${row}:${valColEnd}${row}`)
      applyCell(ws.getCell(`${valColStart}${row}`), {
        value:     value || '—',
        font:      { name: 'Calibri', size: 9, color: { argb: ORVIA_DARK } },
        fill:      solidFill(WHITE),
        alignment: lft,
        border:    allBorder,
      })
    }

    // ── SECTION 1: Sevkiyat Özeti ─────────────────────────────────────────────
    sectionHeader('📦  SEVKİYAT ÖZETİ', DR); DR++

    // Format payment method: show "Mal Mukabili" style as-is, or fall back
    const paymentDisplay = so.payment_method || '—'
    const freightDisplay = so.freight_amount
      ? `${fmtNum(parseFloat(so.freight_amount))} USD`
      : '—'

    const summaryPairs = [
      ['Kap Miktarı',    `${fmtNum(totBoxes, 0)} Koli`,   'Palet Sayısı',  `${fmtNum(totPallets, 0)} Adet`],
      ['Brüt Ağırlık',  `${fmtNum(totGross)} KG`,         'Net Ağırlık',   `${fmtNum(totNet)} KG`         ],
      ['Ödeme Şekli',   paymentDisplay,                   'Teslim Şekli',  so.incoterm || '—'             ],
      ['Taşıma Şekli',  so.transport_mode || '—',         'Navlun Tutarı', freightDisplay                 ],
      ['Yükleme Tarihi',fmtDate(so.shipment_date),        'ETD',           fmtDate(so.etd)                ],
      ['ETA',           fmtDate(so.eta),                  'TAREKS No',     so.lot_no || '—'               ],
      ['Fatura No',     so.invoice_no || '—',             'Yükleme Adresi',so.loading_address || '—'      ],
    ]

    summaryPairs.forEach(([lbl1, val1, lbl2, val2]) => {
      ws.getRow(DR).height = 17
      // Left label A-C
      ws.mergeCells(`A${DR}:C${DR}`)
      applyCell(ws.getCell(`A${DR}`), { value: lbl1, font: { name:'Calibri', bold:true, size:9, color:{argb:ORVIA_MID} }, fill:solidFill(ORVIA_LIGHT), alignment:lft, border:allBorder })
      // Left value D-F
      ws.mergeCells(`D${DR}:F${DR}`)
      applyCell(ws.getCell(`D${DR}`), { value: val1, font: { name:'Calibri', size:9, color:{argb:ORVIA_DARK} }, fill:solidFill(WHITE), alignment:lft, border:allBorder })
      // Right label G-I
      ws.mergeCells(`G${DR}:I${DR}`)
      applyCell(ws.getCell(`G${DR}`), { value: lbl2, font: { name:'Calibri', bold:true, size:9, color:{argb:ORVIA_MID} }, fill:solidFill(ORVIA_LIGHT), alignment:lft, border:allBorder })
      // Right value J-L
      ws.mergeCells(`J${DR}:L${DR}`)
      applyCell(ws.getCell(`J${DR}`), { value: val2, font: { name:'Calibri', size:9, color:{argb:ORVIA_DARK} }, fill:solidFill(WHITE), alignment:lft, border:allBorder })
      DR++
    })
    DR++

    // ── SECTION 2: Konteyner / Araç ──────────────────────────────────────────
    if (containers.length > 0 || so.vessel_name || so.seawaybill_number || so.driver_name) {
      sectionHeader('🚢  KONTEYNER / ARAÇ BİLGİLERİ', DR, ORVIA_MID); DR++

      containers.forEach((c, i) => {
        ws.getRow(DR).height = 16
        ws.mergeCells(`A${DR}:C${DR}`)
        applyCell(ws.getCell(`A${DR}`), { value: `Konteyner ${i + 1}`, font:{name:'Calibri',bold:true,size:9,color:{argb:ORVIA_MID}}, fill:solidFill(ORVIA_LIGHT), alignment:lft, border:allBorder })
        ws.mergeCells(`D${DR}:L${DR}`)
        applyCell(ws.getCell(`D${DR}`), { value: c.container_number || '—', font:{name:'Calibri',size:9,color:{argb:ORVIA_DARK}}, fill:solidFill(WHITE), alignment:lft, border:allBorder })
        DR++
      })

      if (so.vessel_name) {
        ws.getRow(DR).height = 16
        ws.mergeCells(`A${DR}:C${DR}`)
        applyCell(ws.getCell(`A${DR}`), { value: 'Gemi Adı', font:{name:'Calibri',bold:true,size:9,color:{argb:ORVIA_MID}}, fill:solidFill(ORVIA_LIGHT), alignment:lft, border:allBorder })
        ws.mergeCells(`D${DR}:L${DR}`)
        applyCell(ws.getCell(`D${DR}`), { value: so.vessel_name, font:{name:'Calibri',size:9,color:{argb:ORVIA_DARK}}, fill:solidFill(WHITE), alignment:lft, border:allBorder })
        DR++
      }
      if (so.seawaybill_number) {
        ws.getRow(DR).height = 16
        ws.mergeCells(`A${DR}:C${DR}`)
        applyCell(ws.getCell(`A${DR}`), { value: 'Sea Waybill No', font:{name:'Calibri',bold:true,size:9,color:{argb:ORVIA_MID}}, fill:solidFill(ORVIA_LIGHT), alignment:lft, border:allBorder })
        ws.mergeCells(`D${DR}:L${DR}`)
        applyCell(ws.getCell(`D${DR}`), { value: so.seawaybill_number, font:{name:'Calibri',size:9,color:{argb:ORVIA_DARK}}, fill:solidFill(WHITE), alignment:lft, border:allBorder })
        DR++
      }
      if (so.driver_name || so.driver_phone) {
        ws.getRow(DR).height = 16
        ws.mergeCells(`A${DR}:C${DR}`)
        applyCell(ws.getCell(`A${DR}`), { value: 'Şoför', font:{name:'Calibri',bold:true,size:9,color:{argb:ORVIA_MID}}, fill:solidFill(ORVIA_LIGHT), alignment:lft, border:allBorder })
        ws.mergeCells(`D${DR}:L${DR}`)
        applyCell(ws.getCell(`D${DR}`), { value: [so.driver_name, so.driver_phone].filter(Boolean).join('  |  '), font:{name:'Calibri',size:9,color:{argb:ORVIA_DARK}}, fill:solidFill(WHITE), alignment:lft, border:allBorder })
        DR++
      }
      DR++
    }

    // ── SECTION 3: Alıcı Bilgileri ────────────────────────────────────────────
    sectionHeader('🏢  ALICI BİLGİLERİ', DR, ORVIA_DARK); DR++

    const buyerRows = [
      ['Alıcı Adı',  so.customer_name || '—'],
      ['Adres',      [so.customer_address, so.customer_city, so.customer_country].filter(Boolean).join(', ') || '—'],
      ['GST No',     so.gst_no    || '—'],
      ['IEC No',     so.iec_no    || '—'],
      ['PAN No',     so.pan_no    || '—'],
      ['FSSAI No',   so.fssai_no  || '—'],
    ]
    buyerRows.forEach(([lbl, val]) => {
      ws.getRow(DR).height = 16
      ws.mergeCells(`A${DR}:C${DR}`)
      applyCell(ws.getCell(`A${DR}`), { value: lbl, font:{name:'Calibri',bold:true,size:9,color:{argb:ORVIA_MID}}, fill:solidFill(ORVIA_LIGHT), alignment:lft, border:allBorder })
      ws.mergeCells(`D${DR}:L${DR}`)
      applyCell(ws.getCell(`D${DR}`), { value: val, font:{name:'Calibri',size:9,color:{argb:ORVIA_DARK}}, fill:solidFill(WHITE), alignment:lft, border:allBorder })
      DR++
    })
    DR++

    // ── FOOTER ────────────────────────────────────────────────────────────────
    ws.getRow(DR).height = 22
    ws.mergeCells(`A${DR}:L${DR}`)
    applyCell(ws.getCell(`A${DR}`), {
      value:     'İHRACATÇI TEDARİKÇİDİR. MALLARIMIZ TÜRK MENŞELLİDİR.',
      font:      { name: 'Calibri', bold: true, italic: true, size: 9, color: { argb: GREEN_TEXT } },
      fill:      solidFill(GREEN_BG),
      alignment: ctr,
    })
    DR++
    ws.getRow(DR).height = 14
    ws.mergeCells(`A${DR}:L${DR}`)
    applyCell(ws.getCell(`A${DR}`), {
      value:     'Bu belge OrviaOMS tarafından oluşturulmuştur  |  orviatropical.com',
      font:      { name: 'Calibri', italic: true, size: 8, color: { argb: 'FF94A3B8' } },
      fill:      solidFill(ORVIA_DARK),
      alignment: ctr,
    })

    // ── Send ───────────────────────────────────────────────────────────────────
    const safeCustomer = so.customer_name ? so.customer_name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 30) : ''
    const safeRef   = (so.sa_number || so.lot_no || so.party_no || req.params.id).replace(/[^a-zA-Z0-9_\-]/g, '_')
    const filename  = safeCustomer
      ? `Orvia_IhracatDetaylari_${safeCustomer}_${safeRef}.xlsx`
      : `Orvia_IhracatDetaylari_${safeRef}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const buffer = await wb.xlsx.writeBuffer()
    res.send(buffer)
  } catch (e) {
    console.error('[customsExcel]', e)
    res.status(500).json({ error: 'Excel oluşturulamadı: ' + e.message })
  }
})

module.exports = router
