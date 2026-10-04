// PDF üretimi — jsPDF + Liberation Sans (Türkçe karakter desteği)
// ğ ü ş ı ö ç İ Ş Ğ Ü Ö Ç tüm karakterler doğru render edilir
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { LIBERATION_SANS_REGULAR, LIBERATION_SANS_BOLD } from './fonts.js'

const COMPANY = {
  name:    'ORVIA TROPICAL SEBZE MEYVE SAN. VE TİC. LTD. ŞTİ.',
  address: 'Fener Mah. 1964 Sk. Hacı M Gebizli Sit. D Blok No:6/A No:3',
  city:    'Muratpaşa / Antalya / Türkiye',
  tax:     'Vergi No: 6481831271 | Antalya Kurumlar V.D.',
  web:     'www.orviatropical.com',
  email:   'muhsinriza@hotmail.com',
}

const GREEN  = [35, 122, 86]
const LGREEN = [236, 247, 241]
const GRAY   = [248, 249, 250]
const DARK   = [30, 30, 30]
const W = 210
const M = 14

const fmt = (n, dec = 2) => {
  if (n == null || n === '') return '—'
  const num = Number(n)
  if (isNaN(num)) return String(n)
  return num.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
const fmtDate = d => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('tr-TR') } catch { return String(d) }
}

/** Registers Liberation Sans with the jsPDF instance and sets it as default font */
function setupFont(doc) {
  doc.addFileToVFS('LiberationSans-Regular.ttf', LIBERATION_SANS_REGULAR)
  doc.addFileToVFS('LiberationSans-Bold.ttf', LIBERATION_SANS_BOLD)
  doc.addFont('LiberationSans-Regular.ttf', 'LiberationSans', 'normal')
  doc.addFont('LiberationSans-Bold.ttf', 'LiberationSans', 'bold')
  doc.setFont('LiberationSans', 'normal')
}

/** Helper — draw green header bar shared by all PDF types */
function drawHeader(doc, title, partyNo, date) {
  // Top green bar
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, W, 32, 'F')

  // Company name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11).setFont('LiberationSans', 'bold')
  doc.text(COMPANY.name, M, 9)

  // Company details (small)
  doc.setFontSize(7).setFont('LiberationSans', 'normal')
  doc.text(`${COMPANY.address}`, M, 14.5)
  doc.text(`${COMPANY.city}  |  ${COMPANY.tax}`, M, 19)
  doc.text(`${COMPANY.web}  |  ${COMPANY.email}`, M, 23.5)

  // Document title (left-bottom of header)
  doc.setFontSize(8).setFont('LiberationSans', 'bold')
  doc.text(title, M, 29.5)

  // Party No + Date (right side of header)
  doc.setFontSize(13).setFont('LiberationSans', 'bold')
  doc.text(partyNo, W - M, 11, { align: 'right' })
  doc.setFontSize(7.5).setFont('LiberationSans', 'normal')
  doc.text(`Tarih: ${date}`, W - M, 17, { align: 'right' })

  doc.setTextColor(...DARK)
  doc.setFont('LiberationSans', 'normal')
}

/** Footer bar */
function drawFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...GREEN)
    doc.rect(0, 284, W, 13, 'F')
    doc.setTextColor(255, 255, 255).setFontSize(7).setFont('LiberationSans', 'normal')
    doc.text(
      `${COMPANY.name}  |  ${COMPANY.web}  |  ${COMPANY.email}`,
      W / 2, 291, { align: 'center' }
    )
    if (pageCount > 1) {
      doc.text(`Sayfa ${i} / ${pageCount}`, W - M, 291, { align: 'right' })
    }
  }
}

/** Shared autoTable style defaults */
function tableDefaults(doc) {
  return {
    styles: {
      font: 'LiberationSans',
      fontStyle: 'normal',
      fontSize: 8,
      cellPadding: 3,
      textColor: DARK,
    },
    headStyles: {
      font: 'LiberationSans',
      fontStyle: 'bold',
      fillColor: GREEN,
      textColor: 255,
      fontSize: 8,
      cellPadding: 3.5,
    },
    columnStyles: {},
    theme: 'grid',
    margin: { left: M, right: M },
  }
}

/** PURCHASE ORDER */
export function generatePurchaseOrderPDF(po) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  setupFont(doc)

  const supplierName = po.supplier?.company_name || po.supplier_name || '—'
  const supplierContact = po.supplier?.contact_name || '—'
  const supplierPhone = po.supplier?.phone || '—'
  const supplierCountry = po.supplier?.country || '—'
  const productName = po.product?.name || po.product_name || '—'
  const pricePerUnit = po.price_per_unit ?? po.unit_price

  drawHeader(doc, 'PURCHASE ORDER / SATIN ALMA SİPARİŞİ', po.party_no || '—', fmtDate(po.created_at))

  let y = 40

  // Section: Tedarikçi & Ürün
  autoTable(doc, {
    ...tableDefaults(doc),
    startY: y,
    head: [['TEDARİKÇİ BİLGİLERİ', '', 'ÜRÜN BİLGİLERİ', '']],
    body: [
      ['Tedarikçi', supplierName,      'Ürün',     productName],
      ['İletişim',  supplierContact,   'Çeşit',    po.variety || '—'],
      ['Telefon',   supplierPhone,     'Kalibr',   po.caliber || '—'],
      ['Ülke',      supplierCountry,   'Menşei',   po.origin || '—'],
      ['Gümrük Ref', po.customs_ref || '—', 'Kalite Sınıfı', po.grade || '—'],
    ],
    headStyles: { ...tableDefaults(doc).headStyles, fillColor: [50, 80, 65] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, fillColor: GRAY },
      1: { cellWidth: 63 },
      2: { fontStyle: 'bold', cellWidth: 32, fillColor: GRAY },
      3: { cellWidth: 63 },
    },
  })

  y = doc.lastAutoTable.finalY + 5

  // Section: Miktar & Fiyat (prominent)
  autoTable(doc, {
    ...tableDefaults(doc),
    startY: y,
    head: [['MİKTAR (KG)', 'BİRİM FİYAT', 'DÖVİZ', 'TOPLAM TUTAR']],
    body: [[
      fmt(po.quantity_kg, 0) + ' kg',
      fmt(pricePerUnit, 4),
      po.currency || 'USD',
      fmt(po.total_amount, 2) + ' ' + (po.currency || 'USD'),
    ]],
    headStyles: { ...tableDefaults(doc).headStyles, fillColor: GREEN },
    bodyStyles: {
      font: 'LiberationSans', fontStyle: 'bold',
      fontSize: 11, halign: 'center', cellPadding: 5,
      fillColor: LGREEN,
    },
  })

  y = doc.lastAutoTable.finalY + 5

  // Section: Lojistik & Ödeme
  autoTable(doc, {
    ...tableDefaults(doc),
    startY: y,
    head: [['LOJİSTİK & ÖDEME', '', '', '']],
    body: [
      ['Incoterm',         po.incoterm || '—',        'Ödeme Yöntemi',  po.payment_method || '—'],
      ['Yükleme Yeri',     po.loading_port || '—',    'Ödeme Vadesi',   po.payment_term || '—'],
      ['Varış Yeri',       po.destination || '—',     'Nakliye',        po.transport_type || '—'],
      ['Yükleme Tarihi',   fmtDate(po.shipment_date), 'Tahmini Varış',  fmtDate(po.arrival_date)],
    ],
    headStyles: { ...tableDefaults(doc).headStyles, fillColor: [50, 80, 65] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, fillColor: GRAY },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35, fillColor: GRAY },
      3: { cellWidth: 60 },
    },
  })

  y = doc.lastAutoTable.finalY + 5

  // Section: Ambalaj
  if (po.box_type || po.net_weight_box || po.total_pallets) {
    autoTable(doc, {
      ...tableDefaults(doc),
      startY: y,
      head: [['AMBALAJ BİLGİLERİ', '', '', '']],
      body: [
        ['Kutu Tipi',     po.box_type || '—',        'Net Ağırlık/Kutu', po.net_weight_box ? `${po.net_weight_box} kg` : '—'],
        ['Palet Tipi',    po.pallet_type || '—',     'Kutu/Palet',       po.boxes_per_pallet || '—'],
        ['Toplam Palet',  po.total_pallets || '—',   'Boyut Aralığı',    po.size_range || '—'],
      ],
      headStyles: { ...tableDefaults(doc).headStyles, fillColor: [50, 80, 65] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35, fillColor: GRAY },
        1: { cellWidth: 60 },
        2: { fontStyle: 'bold', cellWidth: 35, fillColor: GRAY },
        3: { cellWidth: 60 },
      },
    })
    y = doc.lastAutoTable.finalY + 5
  }

  // Gerekli evraklar
  const docs = Array.isArray(po.required_documents) ? po.required_documents : []
  if (docs.length > 0) {
    autoTable(doc, {
      ...tableDefaults(doc),
      startY: y,
      head: [['GEREKLİ EVRAKLAR']],
      body: [[docs.join('  ·  ')]],
      headStyles: { ...tableDefaults(doc).headStyles, fillColor: [50, 80, 65] },
      columnStyles: { 0: { cellWidth: 'auto' } },
    })
    y = doc.lastAutoTable.finalY + 5
  }

  // Özel notlar
  if (po.special_notes) {
    autoTable(doc, {
      ...tableDefaults(doc),
      startY: y,
      head: [['ÖZEL NOTLAR']],
      body: [[po.special_notes]],
      headStyles: { ...tableDefaults(doc).headStyles, fillColor: [50, 80, 65] },
      columnStyles: { 0: { cellWidth: 'auto' } },
    })
    y = doc.lastAutoTable.finalY + 5
  }

  // İmza alanları
  if (y < 250) {
    y = Math.max(y, doc.lastAutoTable?.finalY + 10 || y)
    doc.setFontSize(8).setFont('LiberationSans', 'bold').setTextColor(...DARK)
    const sigY = Math.min(y + 5, 265)
    doc.text('HAZIRLAYAN / Prepared by', M, sigY)
    doc.text('ONAYLAYAN / Approved by', W / 2 + 5, sigY)
    doc.setFont('LiberationSans', 'normal')
    doc.line(M, sigY + 12, M + 60, sigY + 12)
    doc.line(W / 2 + 5, sigY + 12, W / 2 + 65, sigY + 12)
    doc.setFontSize(7)
    doc.text('İmza / Signature', M, sigY + 16)
    doc.text('İmza / Signature', W / 2 + 5, sigY + 16)
  }

  drawFooter(doc)
  doc.save(`PO_${po.party_no || 'siparis'}.pdf`)
}

/** COMMERCIAL INVOICE */
export function generateSalesInvoicePDF(so) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  setupFont(doc)

  const customerName = so.customer?.name || so.customer?.company_name || so.customer_name || '—'
  const customerContact = so.customer?.contact_name || '—'
  const customerPhone = so.customer?.phone || '—'
  const customerCountry = so.customer?.country || '—'
  const productName = so.product?.name || so.product_name || '—'
  const pricePerUnit = so.price_per_unit ?? so.unit_price

  drawHeader(doc, 'COMMERCIAL INVOICE / TİCARİ FATURA', so.party_no || '—', fmtDate(so.created_at))

  let y = 40

  autoTable(doc, {
    ...tableDefaults(doc),
    startY: y,
    head: [['ALICI (BUYER)', '', 'ÜRÜN (GOODS)', '']],
    body: [
      ['Müşteri',    customerName,    'Ürün',           productName],
      ['İletişim',   customerContact, 'Çeşit',          so.variety || '—'],
      ['Telefon',    customerPhone,   'Kalibr',         so.caliber || '—'],
      ['Ülke',       customerCountry, 'Menşei',         so.origin || '—'],
      ['Varış Yeri', so.destination || '—', 'Kalite',  so.grade || '—'],
    ],
    headStyles: { ...tableDefaults(doc).headStyles, fillColor: [30, 80, 120] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, fillColor: GRAY },
      1: { cellWidth: 63 },
      2: { fontStyle: 'bold', cellWidth: 32, fillColor: GRAY },
      3: { cellWidth: 63 },
    },
  })

  y = doc.lastAutoTable.finalY + 5

  autoTable(doc, {
    ...tableDefaults(doc),
    startY: y,
    head: [['MİKTAR (KG)', 'BİRİM FİYAT', 'DÖVİZ', 'TOPLAM TUTAR']],
    body: [[
      fmt(so.quantity_kg, 0) + ' kg',
      fmt(pricePerUnit, 4),
      so.currency || 'EUR',
      fmt(so.total_amount, 2) + ' ' + (so.currency || 'EUR'),
    ]],
    headStyles: { ...tableDefaults(doc).headStyles, fillColor: [30, 80, 120] },
    bodyStyles: {
      font: 'LiberationSans', fontStyle: 'bold',
      fontSize: 11, halign: 'center', cellPadding: 5,
      fillColor: [235, 243, 252],
    },
  })

  y = doc.lastAutoTable.finalY + 5

  autoTable(doc, {
    ...tableDefaults(doc),
    startY: y,
    head: [['NAKLİYE & ÖDEME', '', '', '']],
    body: [
      ['Incoterm',       so.incoterm || '—',        'Ödeme Yöntemi', so.payment_method || '—'],
      ['Yükleme Yeri',   so.loading_port || '—',    'Ödeme Vadesi',  so.payment_term || '—'],
      ['Nakliye',        so.transport_type || '—',  'Gümrük Ref',    so.customs_ref || '—'],
      ['Yükleme Tarihi', fmtDate(so.shipment_date), 'Tahmini Varış', fmtDate(so.arrival_date)],
    ],
    headStyles: { ...tableDefaults(doc).headStyles, fillColor: [30, 80, 120] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, fillColor: GRAY },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35, fillColor: GRAY },
      3: { cellWidth: 60 },
    },
  })

  y = doc.lastAutoTable.finalY + 10

  // İmza
  if (y < 255) {
    const sigY = Math.min(y + 5, 262)
    doc.setFontSize(8).setFont('LiberationSans', 'bold').setTextColor(...DARK)
    doc.text('SATICI / SELLER', M, sigY)
    doc.text('ALICI / BUYER', W / 2 + 5, sigY)
    doc.setFont('LiberationSans', 'normal')
    doc.setFontSize(7.5)
    doc.text(COMPANY.name, M, sigY + 5)
    doc.text(customerName, W / 2 + 5, sigY + 5)
    doc.line(M, sigY + 18, M + 72, sigY + 18)
    doc.line(W / 2 + 5, sigY + 18, W / 2 + 72, sigY + 18)
    doc.setFontSize(7)
    doc.text('Yetkili İmza / Authorized Signature', M, sigY + 22)
    doc.text('Yetkili İmza / Authorized Signature', W / 2 + 5, sigY + 22)
  }

  drawFooter(doc)
  doc.save(`Invoice_${so.party_no || 'satis'}.pdf`)
}

/** PACKING LIST */
export function generatePackingListPDF(so) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  setupFont(doc)

  const customerName = so.customer?.name || so.customer?.company_name || so.customer_name || '—'
  const customerCountry = so.customer?.country || '—'
  const productName = so.product?.name || so.product_name || '—'

  const totalBoxes = so.total_pallets && so.boxes_per_pallet
    ? Number(so.total_pallets) * Number(so.boxes_per_pallet)
    : null
  const estGross = so.net_weight_box && totalBoxes
    ? (Number(so.net_weight_box) * totalBoxes).toFixed(0)
    : null

  drawHeader(doc, 'PACKING LIST / PAKET LİSTESİ', so.party_no || '—', fmtDate(so.created_at))

  let y = 40

  // Taraf & Ürün
  autoTable(doc, {
    ...tableDefaults(doc),
    startY: y,
    head: [['ALICI & SEVKIYAT', '', 'ÜRÜN', '']],
    body: [
      ['Müşteri',       customerName,              'Ürün',    productName],
      ['Ülke',          customerCountry,           'Çeşit',   so.variety || '—'],
      ['Varış Yeri',    so.destination || '—',     'Menşei',  so.origin || '—'],
      ['Yükleme',       fmtDate(so.shipment_date), 'Kalibr',  so.caliber || '—'],
      ['Tahmini Varış', fmtDate(so.arrival_date),  'Kalite',  so.grade || '—'],
    ],
    headStyles: { ...tableDefaults(doc).headStyles, fillColor: [80, 80, 50] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, fillColor: GRAY },
      1: { cellWidth: 63 },
      2: { fontStyle: 'bold', cellWidth: 32, fillColor: GRAY },
      3: { cellWidth: 63 },
    },
  })

  y = doc.lastAutoTable.finalY + 5

  // Ambalaj detayları
  autoTable(doc, {
    ...tableDefaults(doc),
    startY: y,
    head: [['AMBALAJ & AĞIRLIK BİLGİLERİ', '', '', '']],
    body: [
      ['Kutu Tipi',    so.box_type || '—',         'Net Ağırlık/Kutu', so.net_weight_box ? `${so.net_weight_box} kg` : '—'],
      ['Palet Tipi',   so.pallet_type || '—',      'Kutu/Palet',       so.boxes_per_pallet ? `${so.boxes_per_pallet} kutu` : '—'],
      ['Toplam Palet', so.total_pallets ? `${so.total_pallets} palet` : '—', 'Toplam Kutu', totalBoxes ? `${totalBoxes} kutu` : '—'],
    ],
    headStyles: { ...tableDefaults(doc).headStyles, fillColor: [80, 80, 50] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, fillColor: GRAY },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35, fillColor: GRAY },
      3: { cellWidth: 60 },
    },
  })

  y = doc.lastAutoTable.finalY + 5

  // Ağırlık özeti (büyük)
  autoTable(doc, {
    ...tableDefaults(doc),
    startY: y,
    head: [['NET AĞIRLIK', 'BRÜT AĞIRLIK (tahm.)', 'DÖVİZ', 'TOPLAM TUTAR']],
    body: [[
      fmt(so.quantity_kg, 0) + ' kg',
      estGross ? `${estGross} kg` : '—',
      so.currency || 'EUR',
      fmt(so.total_amount, 2) + ' ' + (so.currency || 'EUR'),
    ]],
    headStyles: { ...tableDefaults(doc).headStyles, fillColor: [80, 80, 50] },
    bodyStyles: {
      font: 'LiberationSans', fontStyle: 'bold',
      fontSize: 10, halign: 'center', cellPadding: 5,
      fillColor: LGREEN,
    },
  })

  y = doc.lastAutoTable.finalY + 5

  // Nakliye
  autoTable(doc, {
    ...tableDefaults(doc),
    startY: y,
    head: [['NAKLİYE BİLGİLERİ', '', '', '']],
    body: [
      ['Nakliye Tipi',   so.transport_type || '—',  'Incoterm',      so.incoterm || '—'],
      ['Yükleme Limanı', so.loading_port || '—',    'Gümrük Ref',    so.customs_ref || '—'],
    ],
    headStyles: { ...tableDefaults(doc).headStyles, fillColor: [80, 80, 50] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, fillColor: GRAY },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35, fillColor: GRAY },
      3: { cellWidth: 60 },
    },
  })

  drawFooter(doc)
  doc.save(`PackingList_${so.party_no || 'satis'}.pdf`)
}
