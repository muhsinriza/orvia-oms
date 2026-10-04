// PDF üretimi — jsPDF kullanılır
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = (n, dec = 2) => {
  if (n == null || n === '') return '—'
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
const fmtDate = d => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('tr-TR') } catch { return d }
}

export function generatePurchaseOrderPDF(po) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const GREEN = [35, 122, 86]
  const DARK  = [26, 26, 26]
  const W = 210, M = 14

  // Header
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16).setFont('helvetica', 'bold')
  doc.text('ORVIA TROPICAL LTD', M, 12)
  doc.setFontSize(9).setFont('helvetica', 'normal')
  doc.text('PURCHASE ORDER / SATIN ALMA SİPARİŞİ', M, 19)
  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text(po.party_no || '—', W - M, 12, { align: 'right' })
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.text(`Tarih: ${fmtDate(po.created_at)}`, W - M, 19, { align: 'right' })

  doc.setTextColor(...DARK)
  let y = 36

  // Tedarikçi & Ürün bilgileri
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [],
    body: [
      ['TEDARİKÇİ', po.supplier?.company_name || '—', 'ÜRÜN', po.product?.name || '—'],
      ['İletişim', po.supplier?.contact_name || '—', 'Çeşit', po.variety || '—'],
      ['Tel', po.supplier?.phone || '—', 'Menşei', po.origin || '—'],
      ['Ülke', po.supplier?.country || '—', 'Kalite', po.grade || '—'],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, fillColor: [248, 250, 248] },
      1: { cellWidth: 67 },
      2: { fontStyle: 'bold', cellWidth: 28, fillColor: [248, 250, 248] },
      3: { cellWidth: 67 },
    },
    styles: { fontSize: 8, cellPadding: 3 },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 6

  // Miktar & Fiyat
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['MİKTAR (kg)', 'BİRİM FİYAT', 'DÖVİZ', 'TOPLAM TUTAR']],
    body: [[
      fmt(po.quantity_kg, 0),
      fmt(po.unit_price, 3),
      po.currency || 'USD',
      `${fmt(po.total_amount, 2)} ${po.currency || 'USD'}`,
    ]],
    headStyles: { fillColor: GREEN, textColor: 255, fontSize: 8 },
    styles: { fontSize: 10, fontStyle: 'bold', halign: 'center', cellPadding: 4 },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 6

  // Lojistik & Ödeme
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [],
    body: [
      ['Incoterm', po.incoterm || '—', 'Ödeme Yöntemi', po.payment_method || '—'],
      ['Yükleme Limanı', po.loading_port || '—', 'Ödeme Vadesi', po.payment_term || '—'],
      ['Varış Yeri', po.destination || '—', 'Nakliye', po.transport_type || '—'],
      ['Yükleme Tarihi', fmtDate(po.shipment_date), 'Tahmini Varış', fmtDate(po.arrival_date)],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, fillColor: [248, 250, 248] },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35, fillColor: [248, 250, 248] },
      3: { cellWidth: 60 },
    },
    styles: { fontSize: 8, cellPadding: 3 },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 6

  // Ambalaj
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [],
    body: [
      ['Kutu Tipi', po.box_type || '—', 'Net Ağırlık/Kutu', po.net_weight_box ? `${po.net_weight_box} kg` : '—'],
      ['Palet Tipi', po.pallet_type || '—', 'Kutu/Palet', po.boxes_per_pallet || '—'],
      ['Toplam Palet', po.total_pallets || '—', 'Boyut/Kalite', po.size_range || '—'],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, fillColor: [248, 250, 248] },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35, fillColor: [248, 250, 248] },
      3: { cellWidth: 60 },
    },
    styles: { fontSize: 8, cellPadding: 3 },
    theme: 'grid',
  })

  if (po.special_notes) {
    y = doc.lastAutoTable.finalY + 6
    doc.setFontSize(8).setFont('helvetica', 'bold')
    doc.text('ÖZEL NOTLAR:', M, y)
    doc.setFont('helvetica', 'normal')
    doc.text(po.special_notes, M, y + 5, { maxWidth: W - M * 2 })
  }

  // Footer
  doc.setFillColor(...GREEN)
  doc.rect(0, 285, W, 12, 'F')
  doc.setTextColor(255, 255, 255).setFontSize(7)
  doc.text('Orvia Tropical Ltd  |  orviatropical.com', W / 2, 292, { align: 'center' })

  doc.save(`PO_${po.party_no || 'siparis'}.pdf`)
}

export function generateSalesInvoicePDF(so) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const GREEN = [35, 122, 86]
  const DARK  = [26, 26, 26]
  const W = 210, M = 14

  doc.setFillColor(...GREEN)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16).setFont('helvetica', 'bold')
  doc.text('ORVIA TROPICAL LTD', M, 12)
  doc.setFontSize(9).setFont('helvetica', 'normal')
  doc.text('COMMERCIAL INVOICE / TİCARİ FATURA', M, 19)
  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text(so.party_no || '—', W - M, 12, { align: 'right' })
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.text(`Tarih: ${fmtDate(so.created_at)}`, W - M, 19, { align: 'right' })

  doc.setTextColor(...DARK)
  let y = 36

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [],
    body: [
      ['MÜŞTERİ', so.customer?.company_name || '—', 'ÜRÜN', so.product?.name || '—'],
      ['İletişim', so.customer?.contact_name || '—', 'Çeşit', so.variety || '—'],
      ['Tel', so.customer?.phone || '—', 'Menşei', so.origin || '—'],
      ['Ülke', so.customer?.country || '—', 'Kalite', so.grade || '—'],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, fillColor: [248, 250, 248] },
      1: { cellWidth: 67 },
      2: { fontStyle: 'bold', cellWidth: 28, fillColor: [248, 250, 248] },
      3: { cellWidth: 67 },
    },
    styles: { fontSize: 8, cellPadding: 3 },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 6

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['MİKTAR (kg)', 'BİRİM FİYAT', 'DÖVİZ', 'TOPLAM TUTAR']],
    body: [[
      fmt(so.quantity_kg, 0),
      fmt(so.unit_price, 3),
      so.currency || 'EUR',
      `${fmt(so.total_amount, 2)} ${so.currency || 'EUR'}`,
    ]],
    headStyles: { fillColor: GREEN, textColor: 255, fontSize: 8 },
    styles: { fontSize: 10, fontStyle: 'bold', halign: 'center', cellPadding: 4 },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 6

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [],
    body: [
      ['Incoterm', so.incoterm || '—', 'Ödeme Yöntemi', so.payment_method || '—'],
      ['Yükleme Limanı', so.loading_port || '—', 'Ödeme Vadesi', so.payment_term || '—'],
      ['Varış Yeri', so.destination || '—', 'Nakliye', so.transport_type || '—'],
      ['Yükleme Tarihi', fmtDate(so.shipment_date), 'Tahmini Varış', fmtDate(so.arrival_date)],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, fillColor: [248, 250, 248] },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35, fillColor: [248, 250, 248] },
      3: { cellWidth: 60 },
    },
    styles: { fontSize: 8, cellPadding: 3 },
    theme: 'grid',
  })

  doc.setFillColor(...GREEN)
  doc.rect(0, 285, W, 12, 'F')
  doc.setTextColor(255, 255, 255).setFontSize(7)
  doc.text('Orvia Tropical Ltd  |  orviatropical.com', W / 2, 292, { align: 'center' })

  doc.save(`Invoice_${so.party_no || 'satis'}.pdf`)
}

export function generatePackingListPDF(so) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const GREEN = [35, 122, 86]
  const W = 210, M = 14

  doc.setFillColor(...GREEN)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16).setFont('helvetica', 'bold')
  doc.text('ORVIA TROPICAL LTD', M, 12)
  doc.setFontSize(9).setFont('helvetica', 'normal')
  doc.text('PACKING LIST / PAKET LİSTESİ', M, 19)
  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text(so.party_no || '—', W - M, 12, { align: 'right' })
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.text(`Tarih: ${fmtDate(so.created_at)}`, W - M, 19, { align: 'right' })

  doc.setTextColor(26, 26, 26)

  const totalBoxes = so.total_pallets && so.boxes_per_pallet
    ? so.total_pallets * so.boxes_per_pallet
    : '—'
  const grossWeight = so.net_weight_box && totalBoxes !== '—'
    ? (so.net_weight_box * totalBoxes).toFixed(0)
    : '—'

  autoTable(doc, {
    startY: 36,
    margin: { left: M, right: M },
    head: [['ALAN', 'BİLGİ', 'ALAN', 'BİLGİ']],
    body: [
      ['Müşteri', so.customer?.company_name || '—', 'Ürün', so.product?.name || '—'],
      ['Ülke', so.customer?.country || '—', 'Çeşit', so.variety || '—'],
      ['Varış', so.destination || '—', 'Menşei', so.origin || '—'],
      ['Yükleme', fmtDate(so.shipment_date), 'Varış', fmtDate(so.arrival_date)],
    ],
    headStyles: { fillColor: GREEN, textColor: 255, fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 248] },
      1: { cellWidth: 63 },
      2: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 248] },
      3: { cellWidth: 63 },
    },
    styles: { fontSize: 8, cellPadding: 3 },
    theme: 'grid',
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    margin: { left: M, right: M },
    head: [['AMBALAJ BİLGİLERİ', '', '', '']],
    body: [
      ['Kutu Tipi', so.box_type || '—', 'Net Ağırlık/Kutu', so.net_weight_box ? `${so.net_weight_box} kg` : '—'],
      ['Palet Tipi', so.pallet_type || '—', 'Kutu/Palet', so.boxes_per_pallet || '—'],
      ['Toplam Palet', so.total_pallets || '—', 'Toplam Kutu', totalBoxes],
      ['Net Ağırlık', `${fmt(so.quantity_kg, 0)} kg`, 'Brüt Ağırlık (est.)', `${grossWeight} kg`],
    ],
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 8, colSpan: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40, fillColor: [248, 250, 248] },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 40, fillColor: [248, 250, 248] },
      3: { cellWidth: 55 },
    },
    styles: { fontSize: 8, cellPadding: 3 },
    theme: 'grid',
  })

  doc.setFillColor(...GREEN)
  doc.rect(0, 285, W, 12, 'F')
  doc.setTextColor(255, 255, 255).setFontSize(7)
  doc.text('Orvia Tropical Ltd  |  orviatropical.com', W / 2, 292, { align: 'center' })

  doc.save(`PackingList_${so.party_no || 'satis'}.pdf`)
}
