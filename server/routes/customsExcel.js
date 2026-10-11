const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const ExcelJS = require('exceljs')

router.use(requireAuth)

// GET /api/customs-excel/:id — generate Gümrük Beyannamesi Excel
router.get('/:id', async (req, res) => {
  try {
    // Fetch sales order with customer info
    const { rows: soRows } = await db.query(`
      SELECT so.*,
             c.name AS customer_name,
             c.address AS customer_address,
             c.country AS customer_country,
             c.gst_no, c.iec_no, c.pan_no, c.fssai_no
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      WHERE so.id = $1
    `, [req.params.id])
    if (!soRows[0]) return res.status(404).json({ error: 'Sipariş bulunamadı' })
    const so = soRows[0]

    // Fetch order items with product info
    const { rows: items } = await db.query(`
      SELECT soi.*,
             p.name AS product_name,
             p.category AS product_category,
             p.gtip_code,
             p.box_net_kg AS p_box_net_kg,
             p.box_gross_kg AS p_box_gross_kg,
             p.boxes_per_pallet AS p_boxes_per_pallet
      FROM sales_order_items soi
      LEFT JOIN products p ON p.id::text = soi.product_id::text
      WHERE soi.sales_order_id = $1
      ORDER BY soi.sort_order
    `, [req.params.id])

    // Fetch containers
    const { rows: containers } = await db.query(
      'SELECT * FROM sales_order_containers WHERE sales_order_id=$1 ORDER BY sort_order, id',
      [req.params.id]
    )

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Gümrük Beyannamesi')

    // ── Column widths ──────────────────────────────────────────────────────────
    ws.columns = [
      { key: 'A', width: 5 },   // No
      { key: 'B', width: 10 },  // Palet Say.
      { key: 'C', width: 10 },  // Adedi
      { key: 'D', width: 14 },  // Cinsi
      { key: 'E', width: 14 },  // Çeşidi
      { key: 'F', width: 30 },  // Malzeme Adı
      { key: 'G', width: 14 },  // GTIP
      { key: 'H', width: 10 },  // Ambalaj
      { key: 'I', width: 12 },  // Brüt kg
      { key: 'J', width: 12 },  // Net Kg
      { key: 'K', width: 14 },  // Kutu Fiyatı USD
      { key: 'L', width: 14 },  // Tutar USD
    ]

    // ── Header styles ──────────────────────────────────────────────────────────
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    const borderThin = { style: 'thin', color: { argb: 'FF000000' } }
    const allBorder = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin }
    const centerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true }
    const leftAlign = { horizontal: 'left', vertical: 'middle', wrapText: true }

    function styleHeader (cell) {
      cell.fill = headerFill
      cell.font = headerFont
      cell.border = allBorder
      cell.alignment = centerAlign
    }

    function styleData (cell, align) {
      cell.border = allBorder
      cell.alignment = align || centerAlign
      cell.font = { size: 10 }
    }

    function styleTotal (cell) {
      cell.border = allBorder
      cell.alignment = centerAlign
      cell.font = { bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4BC' } }
    }

    // ── Title row ──────────────────────────────────────────────────────────────
    ws.mergeCells('A1:L1')
    const titleCell = ws.getCell('A1')
    titleCell.value = 'GÜMRÜK BEYANNAMESİ BİLGİLERİ'
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } }
    titleCell.alignment = centerAlign
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
    ws.getRow(1).height = 30

    // SA Number / Party No
    ws.mergeCells('A2:F2')
    ws.getCell('A2').value = `Sipariş No: ${so.sa_number || so.party_no || '—'}`
    ws.getCell('A2').font = { bold: true, size: 11 }
    ws.getCell('A2').alignment = leftAlign

    ws.mergeCells('G2:L2')
    const tareksFormatted = so.lot_no || '—'
    ws.getCell('G2').value = `TAREKS No: ${tareksFormatted}`
    ws.getCell('G2').font = { bold: true, size: 11 }
    ws.getCell('G2').alignment = leftAlign
    ws.getRow(2).height = 20

    // ── Column headers row ─────────────────────────────────────────────────────
    const headerRow = ws.getRow(3)
    headerRow.height = 35
    const headers = ['No', 'Palet Say.', 'Adedi (Koli)', 'Cinsi', 'Çeşidi', 'Malzeme Adı', 'GTIP', 'Ambalaj', 'Brüt Kg', 'Net Kg', 'Kutu Fiyatı (USD)', 'Tutar (USD)']
    const cols = ['A','B','C','D','E','F','G','H','I','J','K','L']
    headers.forEach((h, i) => {
      const cell = ws.getCell(`${cols[i]}3`)
      cell.value = h
      styleHeader(cell)
    })

    // ── Data rows ──────────────────────────────────────────────────────────────
    let dataRowStart = 4
    let totalGross = 0
    let totalNet = 0
    let totalBoxes = 0
    let totalPallets = 0
    let totalAmount = 0

    items.forEach((item, idx) => {
      const rowNum = dataRowStart + idx
      const row = ws.getRow(rowNum)
      row.height = 18

      // Calculate per-item values
      const boxNetKg = parseFloat(item.box_weight_kg || item.p_box_net_kg || 0)
      const boxGrossKg = parseFloat(item.p_box_gross_kg || (boxNetKg * 1.05))
      const qtyKg = parseFloat(item.quantity_kg || 0)
      const boxesPerPallet = parseInt(item.p_boxes_per_pallet || 66)

      // Determine box count
      let boxCount = 0
      if (item.sell_by === 'kg' && boxNetKg > 0) {
        boxCount = Math.round(qtyKg / boxNetKg)
      } else {
        boxCount = Math.round(qtyKg) // if sell_by box, quantity_kg stores box count
      }

      const palletCount = boxesPerPallet > 0 ? Math.ceil(boxCount / boxesPerPallet) : 0
      const netKg = boxCount * boxNetKg
      const grossKg = boxCount * boxGrossKg
      const pricePerUnit = parseFloat(item.price_per_unit || 0)
      const totalUSD = boxCount * pricePerUnit

      totalBoxes += boxCount
      totalPallets += palletCount
      totalNet += netKg
      totalGross += grossKg
      totalAmount += totalUSD

      // Compose "Malzeme Adı" like "18 Kg Gala Apple Carton"
      const netLabel = boxNetKg ? `${boxNetKg} Kg ` : ''
      const varietyLabel = item.variety ? `${item.variety} ` : ''
      const productLabel = item.product_name || ''
      const boxTypeLabel = item.box_type || so.box_type || 'Carton'
      const malzemeAdi = `${netLabel}${varietyLabel}${productLabel} ${boxTypeLabel}`.trim()

      const vals = [
        idx + 1,
        palletCount || '',
        boxCount,
        item.product_category || '',
        item.variety || '',
        malzemeAdi,
        item.gtip_code || '',
        item.box_type || so.box_type || '',
        grossKg.toFixed(2),
        netKg.toFixed(2),
        pricePerUnit.toFixed(4),
        totalUSD.toFixed(2),
      ]

      vals.forEach((v, i) => {
        const cell = ws.getCell(`${cols[i]}${rowNum}`)
        cell.value = typeof v === 'string' ? v : v
        styleData(cell, i >= 8 ? centerAlign : (i >= 1 ? centerAlign : centerAlign))
      })
    })

    // ── Totals row ─────────────────────────────────────────────────────────────
    const totalRow = dataRowStart + items.length
    ws.getRow(totalRow).height = 20

    ws.mergeCells(`A${totalRow}:B${totalRow}`)
    const totCell = ws.getCell(`A${totalRow}`)
    totCell.value = 'TOPLAM'
    styleTotal(totCell)

    const totVals = {
      C: totalBoxes,
      D: '', E: '', F: '', G: '', H: '',
      I: totalGross.toFixed(2),
      J: totalNet.toFixed(2),
      K: '',
      L: totalAmount.toFixed(2),
    }
    Object.entries(totVals).forEach(([col, val]) => {
      const cell = ws.getCell(`${col}${totalRow}`)
      cell.value = val
      styleTotal(cell)
    })

    // ── Summary section ────────────────────────────────────────────────────────
    let summaryStart = totalRow + 2
    const summaryData = [
      ['KAP MİKTARI', `${totalBoxes} ADET`],
      ['PALET SAYISI', `${totalPallets} ADET`],
      ['BRÜT AĞIRLIK', `${totalGross.toFixed(2)} KG`],
      ['NET AĞIRLIK', `${totalNet.toFixed(2)} KG`],
      ['ÖDEME ŞEKLİ', so.payment_method || '—'],
      ['TESLİM ŞEKLİ', so.incoterm || '—'],
      ['TAŞIMA ŞEKLİ', so.transport_mode || '—'],
      ['NAVLUN TUT.', so.freight_amount ? `${parseFloat(so.freight_amount).toFixed(2)} USD` : '—'],
      ['TAREKS NO', so.lot_no || '—'],
      ['YÜKLEME ADRESİ', so.loading_address || '—'],
    ]

    summaryData.forEach(([label, value], i) => {
      const rowNum = summaryStart + i
      ws.getRow(rowNum).height = 18

      ws.mergeCells(`A${rowNum}:C${rowNum}`)
      const labelCell = ws.getCell(`A${rowNum}`)
      labelCell.value = label
      labelCell.font = { bold: true, size: 10 }
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
      labelCell.border = allBorder
      labelCell.alignment = leftAlign

      ws.mergeCells(`D${rowNum}:L${rowNum}`)
      const valCell = ws.getCell(`D${rowNum}`)
      valCell.value = value
      valCell.font = { size: 10 }
      valCell.border = allBorder
      valCell.alignment = leftAlign
    })

    // ── Container numbers ──────────────────────────────────────────────────────
    let contStart = summaryStart + summaryData.length + 1

    if (containers.length > 0) {
      ws.getRow(contStart).height = 18
      ws.mergeCells(`A${contStart}:L${contStart}`)
      const contHeader = ws.getCell(`A${contStart}`)
      contHeader.value = 'KONTEYNER / ARAÇ BİLGİLERİ'
      contHeader.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
      contHeader.fill = headerFill
      contHeader.border = allBorder
      contHeader.alignment = centerAlign
      contStart++

      containers.forEach((c, i) => {
        ws.getRow(contStart + i).height = 16
        ws.mergeCells(`A${contStart + i}:C${contStart + i}`)
        const numCell = ws.getCell(`A${contStart + i}`)
        numCell.value = `Konteyner ${i + 1}`
        numCell.font = { bold: true, size: 10 }
        numCell.border = allBorder
        numCell.alignment = leftAlign

        ws.mergeCells(`D${contStart + i}:L${contStart + i}`)
        const cnCell = ws.getCell(`D${contStart + i}`)
        cnCell.value = c.container_number || '—'
        cnCell.border = allBorder
        cnCell.alignment = leftAlign
      })
      contStart += containers.length

      // Driver info
      if (so.driver_name || so.driver_phone) {
        ws.getRow(contStart).height = 16
        ws.mergeCells(`A${contStart}:C${contStart}`)
        const driverLabel = ws.getCell(`A${contStart}`)
        driverLabel.value = 'Şoför'
        driverLabel.font = { bold: true, size: 10 }
        driverLabel.border = allBorder
        driverLabel.alignment = leftAlign

        ws.mergeCells(`D${contStart}:L${contStart}`)
        const driverVal = ws.getCell(`D${contStart}`)
        driverVal.value = [so.driver_name, so.driver_phone].filter(Boolean).join(' — ')
        driverVal.border = allBorder
        driverVal.alignment = leftAlign
        contStart++
      }
    }

    // ── Buyer info ─────────────────────────────────────────────────────────────
    let buyerStart = contStart + 1
    ws.getRow(buyerStart).height = 18
    ws.mergeCells(`A${buyerStart}:L${buyerStart}`)
    const buyerHeader = ws.getCell(`A${buyerStart}`)
    buyerHeader.value = 'ALICI BİLGİLERİ'
    buyerHeader.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    buyerHeader.fill = headerFill
    buyerHeader.border = allBorder
    buyerHeader.alignment = centerAlign
    buyerStart++

    const buyerData = [
      ['Alıcı Adı', so.customer_name || '—'],
      ['Adres', so.customer_address || '—'],
      ['GST No', so.gst_no || '—'],
      ['IEC No', so.iec_no || '—'],
      ['PAN No', so.pan_no || '—'],
      ['FSSAI No', so.fssai_no || '—'],
    ]
    buyerData.forEach(([label, value], i) => {
      const rowNum = buyerStart + i
      ws.getRow(rowNum).height = 16
      ws.mergeCells(`A${rowNum}:C${rowNum}`)
      const lc = ws.getCell(`A${rowNum}`)
      lc.value = label
      lc.font = { bold: true, size: 10 }
      lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
      lc.border = allBorder
      lc.alignment = leftAlign

      ws.mergeCells(`D${rowNum}:L${rowNum}`)
      const vc = ws.getCell(`D${rowNum}`)
      vc.value = value
      vc.font = { size: 10 }
      vc.border = allBorder
      vc.alignment = leftAlign
    })

    // ── Footer note ────────────────────────────────────────────────────────────
    const noteRow = buyerStart + buyerData.length + 1
    ws.mergeCells(`A${noteRow}:L${noteRow}`)
    const noteCell = ws.getCell(`A${noteRow}`)
    noteCell.value = 'İHRACATÇI TEDARİKÇİDİR. MALLARIMIZ TÜRK MENŞELLİDİR.'
    noteCell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF7F0000' } }
    noteCell.alignment = centerAlign
    ws.getRow(noteRow).height = 20

    // ── Send response ──────────────────────────────────────────────────────────
    const filename = `Gumruk_${so.sa_number || so.party_no || req.params.id}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const buffer = await wb.xlsx.writeBuffer()
    res.send(buffer)
  } catch (e) {
    console.error('[customsExcel]', e)
    res.status(500).json({ error: 'Excel oluşturulamadı' })
  }
})

module.exports = router
