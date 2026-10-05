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

export function generateSalesInvoicePDF(so) {
  const no = so.party_no || 'invoice'
  return downloadPDF(`/api/pdf/invoice/${so.id}`, `Invoice_${no}.pdf`)
}

export function generatePackingListPDF(so) {
  const no = so.party_no || 'packing'
  return downloadPDF(`/api/pdf/packing-list/${so.id}`, `PackingList_${no}.pdf`)
}

export function generateSalesAgreementPDF(so) {
  const no = so.sa_number || so.party_no || 'sa'
  return downloadPDF(`/api/pdf/sales-agreement/${so.id}`, `SA_${no}.pdf`)
}

export function generatePurchaseOrderPDF(po) {
  const no = po.party_no || 'po'
  return downloadPDF(`/api/pdf/purchase-order/${po.id}`, `PO_${no}.pdf`)
}
