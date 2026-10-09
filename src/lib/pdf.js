// PDF generation — calls Puppeteer backend API, downloads the result as a blob

async function downloadPDF(endpoint, filename) {
  const res = await fetch(endpoint, { credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'PDF oluşturulamadı' }))
    throw new Error(err.error || 'PDF oluşturulamadı')
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Dosya adı: ihracat sonrası parti no + müşteri ilk iki kelime + belge adı
function soFilename(so, docLabel) {
  const safe = s => (s || '').replace(/[^a-zA-Z0-9_\-]/g, '').replace(/_{2,}/g, '_')
  const lotPart  = safe(so.lot_no || so.party_no || 'doc')
  const custPart = safe((so.customer_name || '').split(/\s+/).slice(0, 2).join('_'))
  return `${lotPart}_${custPart}_${docLabel}.pdf`
}

export function generateSalesInvoicePDF(so) {
  return downloadPDF(`/api/pdf/invoice/${so.id}`, soFilename(so, 'CommercialInvoice'))
}

export function generatePackingListPDF(so) {
  return downloadPDF(`/api/pdf/packing-list/${so.id}`, soFilename(so, 'PackingList'))
}

export function generateSalesAgreementPDF(so) {
  const no = so.sa_number || so.party_no || 'sa'
  return downloadPDF(`/api/pdf/sales-agreement/${so.id}`, `SA_${no}.pdf`)
}

export function generatePurchaseOrderPDF(po) {
  const no = po.party_no || 'po'
  return downloadPDF(`/api/pdf/purchase-order/${po.id}`, `PO_${no}.pdf`)
}
