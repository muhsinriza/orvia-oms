import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import {
  ArrowLeft, Truck, Ship, Plane, Plus, Trash2, MapPin, Clock,
  FileText, Edit2, Package, FileSignature, ChevronRight, CheckCircle2,
  Download, Loader2
} from 'lucide-react'

const STATUS_FLOW = ['draft', 'confirmed', 'in_transit', 'arrived', 'completed']
const STATUS_TR = {
  draft: 'Taslak',
  confirmed: 'Onaylandı',
  in_transit: 'Transitte',
  arrived: 'Geldi',
  completed: 'Tamamlandı',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
}
const STATUS_COLOR = {
  draft: 'badge-draft',
  confirmed: 'badge-confirmed',
  in_transit: 'badge-transit',
  arrived: 'badge-arrived',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
  delivered: 'badge-delivered',
}

const EVENT_TYPES = [
  { value: 'status_change', label: 'Durum Değişikliği' },
  { value: 'location', label: 'Konum Güncellemesi' },
  { value: 'note', label: 'Not' },
  { value: 'document', label: 'Belge' },
]

function TrackingIcon({ mode }) {
  if (mode === 'Deniz Yolu' || mode === 'Sea') return <Ship size={18} className="text-blue-600" />
  if (mode === 'Hava Yolu' || mode === 'Air') return <Plane size={18} className="text-sky-500" />
  return <Truck size={18} className="text-amber-600" />
}

// ── STATUS BAR ────────────────────────────────────────────────────────────────
function StatusBar({ status, onStatusChange }) {
  const current = STATUS_FLOW.indexOf(status)
  const cancelled = status === 'cancelled'

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 text-sm">Sipariş Durumu</h2>
        {cancelled && (
          <span className="badge badge-cancelled text-xs">İptal Edildi</span>
        )}
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STATUS_FLOW.map((s, i) => {
          const done = i < current
          const active = i === current
          const isLast = i === STATUS_FLOW.length - 1
          return (
            <React.Fragment key={s}>
              <button
                onClick={() => !cancelled && onStatusChange(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                  ${active ? 'bg-primary-600 text-white shadow-sm' :
                    done ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' :
                    'bg-gray-100 text-gray-400 hover:bg-gray-200'}
                  ${cancelled ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
              >
                {done && <CheckCircle2 size={12} />}
                {STATUS_TR[s]}
              </button>
              {!isLast && (
                <ChevronRight size={14} className={`shrink-0 ${done ? 'text-primary-400' : 'text-gray-200'}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>
      {!cancelled && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => onStatusChange('delivered')}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              status === 'delivered'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-gray-300 text-gray-500 hover:border-teal-400 hover:text-teal-600'
            }`}
          >
            ✓ Teslim Edildi
          </button>
          <button
            onClick={() => onStatusChange('cancelled')}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors"
          >
            ✕ İptal Et
          </button>
        </div>
      )}
    </div>
  )
}

// ── PACKING LIST MODAL ───────────────────────────────────────────────────────
const PALLET_FIELDS = [
  { key: 'label',   label: 'Pallet',          width: '110px' },
  { key: 'product', label: 'Product',          width: '130px' },
  { key: 'variety', label: 'Size',             width: '110px' },
  { key: 'origin',  label: 'Origin',           width: '85px'  },
  { key: 'boxType', label: 'Box Type',         width: '100px' },
  { key: 'boxes',   label: 'Box Amount',       width: '80px', num: true },
  { key: 'netBox',  label: 'Net Kg/Box',       width: '85px', num: true },
  { key: 'net',     label: 'Net Kg/Pallet',    width: '90px', num: true, auto: true },
  { key: 'gross',   label: 'Gross Kg/Pallet',  width: '95px', num: true, auto: true },
]

function makeRow(idx, defaults = {}) {
  return {
    label:   defaults.label   ?? `Pallet ${idx + 1}`,
    product: defaults.product ?? '',
    variety: defaults.variety ?? '',
    origin:  defaults.origin  ?? '',
    boxType: defaults.boxType ?? '',
    boxes:   defaults.boxes   ?? '',
    netBox:  defaults.netBox  ?? '',
    net:     defaults.net     ?? '',
    gross:   defaults.gross   ?? '',
  }
}

function computeRow(row) {
  const boxes  = parseFloat(row.boxes)  || 0
  const netBox = parseFloat(row.netBox) || 0
  return {
    ...row,
    net:   boxes * netBox > 0 ? (boxes * netBox).toFixed(2) : row.net,
    gross: boxes * netBox > 0 ? (boxes * netBox * 1.05).toFixed(2) : row.gross,
  }
}

function PackingListModal({ order, filename, onClose }) {
  const { showToast } = useToast()
  const [rows, setRows] = useState(() => {
    // Seed one row from order data
    return [makeRow(0, {
      product: order.product_name || '',
      variety: [order.variety, order.caliber].filter(Boolean).join(' / ') || '',
      origin:  order.origin || '',
      boxType: order.box_type || '',
      netBox:  order.box_weight_kg || '',
    })]
  })
  const [palletCount, setPalletCount] = useState(order.pallets || rows.length || 1)
  const [generating, setGenerating] = useState(false)
  const inputRefs = React.useRef({})

  // Register a ref for a cell input
  function refKey(rowIdx, fieldIdx) { return `${rowIdx}_${fieldIdx}` }
  function getRef(rowIdx, fieldIdx) { return inputRefs.current[refKey(rowIdx, fieldIdx)] }

  // Move focus: Tab = next field in row, then first field of next row
  // Shift+Tab = previous. Enter = next row same column.
  function handleKeyDown(e, rowIdx, fieldIdx) {
    const editable = PALLET_FIELDS.filter(f => !f.auto)
    const editIdx  = editable.findIndex(f => f.key === PALLET_FIELDS[fieldIdx].key)
    if (e.key === 'Tab') {
      e.preventDefault()
      if (!e.shiftKey) {
        // forward
        if (editIdx < editable.length - 1) {
          const nextKey = editable[editIdx + 1].key
          const nextFieldIdx = PALLET_FIELDS.findIndex(f => f.key === nextKey)
          getRef(rowIdx, nextFieldIdx)?.focus()
        } else if (rowIdx < rows.length - 1) {
          getRef(rowIdx + 1, 0)?.focus()
        }
      } else {
        // backward
        if (editIdx > 0) {
          const prevKey = editable[editIdx - 1].key
          const prevFieldIdx = PALLET_FIELDS.findIndex(f => f.key === prevKey)
          getRef(rowIdx, prevFieldIdx)?.focus()
        } else if (rowIdx > 0) {
          const lastEditableKey = editable[editable.length - 1].key
          const lastFieldIdx = PALLET_FIELDS.findIndex(f => f.key === lastEditableKey)
          getRef(rowIdx - 1, lastFieldIdx)?.focus()
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (rowIdx < rows.length - 1) {
        getRef(rowIdx + 1, fieldIdx)?.focus()
      } else {
        // Add new row and focus it
        addRow()
        setTimeout(() => getRef(rowIdx + 1, fieldIdx)?.focus(), 50)
      }
    } else if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault()
      removeRow(rowIdx)
    } else if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault()
      if (rowIdx < rows.length - 1) getRef(rowIdx + 1, fieldIdx)?.focus()
    } else if (e.key === 'ArrowUp' && e.altKey) {
      e.preventDefault()
      if (rowIdx > 0) getRef(rowIdx - 1, fieldIdx)?.focus()
    } else if (e.key === 'n' && e.ctrlKey) {
      e.preventDefault()
      addRow()
      setTimeout(() => getRef(rows.length, 0)?.focus(), 50)
    } else if (e.key === 'd' && e.ctrlKey) {
      e.preventDefault()
      // Duplicate current row
      duplicateRow(rowIdx)
      setTimeout(() => getRef(rowIdx + 1, fieldIdx)?.focus(), 50)
    } else if (e.key === 'f' && e.ctrlKey && e.shiftKey) {
      e.preventDefault()
      // Fill column down from current row
      fillColumnDown(rowIdx, fieldIdx)
    }
  }

  function updateCell(rowIdx, key, value) {
    setRows(prev => {
      const next = prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r)
      // Auto-compute net and gross if boxes or netBox changed
      if (key === 'boxes' || key === 'netBox') {
        return next.map((r, i) => i === rowIdx ? computeRow(r) : r)
      }
      return next
    })
  }

  function addRow() {
    setRows(prev => {
      const last = prev[prev.length - 1] || {}
      return [...prev, makeRow(prev.length, {
        product: last.product || '',
        variety: last.variety || '',
        origin:  last.origin  || '',
        boxType: last.boxType || '',
        netBox:  last.netBox  || '',
        label:   `Pallet ${prev.length + 1}`,
      })]
    })
    setPalletCount(c => c + 1)
  }

  function removeRow(idx) {
    if (rows.length === 1) return
    setRows(prev => prev.filter((_, i) => i !== idx))
    setPalletCount(c => Math.max(1, c - 1))
  }

  function duplicateRow(idx) {
    setRows(prev => {
      const copy = { ...prev[idx], label: `Pallet ${prev.length + 1}` }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
    setPalletCount(c => c + 1)
  }

  function fillColumnDown(fromRow, fieldIdx) {
    const field = PALLET_FIELDS[fieldIdx]
    if (!field || field.auto) return
    const value = rows[fromRow][field.key]
    setRows(prev => prev.map((r, i) => i <= fromRow ? r : { ...r, [field.key]: value }))
  }

  async function generate() {
    setGenerating(true)
    try {
      const payload = {
        rows: rows.map(r => ({
          ...r,
          net:   parseFloat(r.net)   || 0,
          gross: parseFloat(r.gross) || 0,
          boxes: parseFloat(r.boxes) || 0,
          netBox: parseFloat(r.netBox) || 0,
        })),
        palletCount,
      }
      const res = await fetch(`/api/pdf/packing-list-custom/${order.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
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
      onClose()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const totals = rows.reduce((acc, r) => ({
    boxes: acc.boxes + (parseFloat(r.boxes) || 0),
    net:   acc.net   + (parseFloat(r.net)   || 0),
    gross: acc.gross + (parseFloat(r.gross) || 0),
  }), { boxes: 0, net: 0, gross: 0 })

  // Keyboard shortcut hint bar
  const shortcuts = [
    ['Tab / Shift+Tab', 'next column'],
    ['Enter', 'next row'],
    ['Alt+↓/↑', 'jump row'],
    ['Ctrl+N', 'new row'],
    ['Ctrl+D', 'duplicate'],
    ['Ctrl+Shift+F', 'fill column'],
    ['Ctrl+Delete', 'delete row'],
    ['Esc', 'close'],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      {/* Modal panel */}
      <div className="flex flex-col bg-white w-full max-w-6xl mx-auto my-6 rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0a5c3a] text-white shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <Package size={20} className="text-emerald-300" />
              <span className="font-bold text-base tracking-tight">Edit Packing List</span>
              <span className="text-emerald-300 text-sm font-normal">{order.party_no || order.invoice_no || ''}</span>
            </div>
            <p className="text-emerald-300 text-xs mt-0.5">Edit the table below, then generate the PDF</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
            >
              <Plus size={13} /> Add Row <kbd className="ml-1 opacity-60 text-xs">Ctrl+N</kbd>
            </button>
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-white text-[#0a5c3a] hover:bg-emerald-50 transition-colors disabled:opacity-50"
            >
              {generating
                ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                : <><Download size={15} /> Generate PDF</>}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-emerald-800 transition-colors">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4L14 14M14 4L4 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Pallet count control */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Pallets:</label>
            <input
              type="number"
              min={1}
              value={palletCount}
              onChange={e => setPalletCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold text-[#0a5c3a] focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="text-xs text-gray-400">Rows: <strong className="text-gray-600">{rows.length}</strong></div>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span className="font-semibold text-gray-600">Total:</span>
            <span>{totals.boxes.toFixed(0)} koli</span>
            <span>·</span>
            <span>{totals.net.toFixed(2)} kg net</span>
            <span>·</span>
            <span>{totals.gross.toFixed(2)} kg brüt</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 px-6 py-4">
          <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-2 w-8">#</th>
                {PALLET_FIELDS.map(f => (
                  <th
                    key={f.key}
                    className={`text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2 px-1 ${f.num ? 'text-right' : 'text-left'} ${f.auto ? 'text-gray-300' : ''}`}
                    style={{ width: f.width }}
                  >
                    {f.label}{f.auto ? ' (oto)' : ''}
                  </th>
                ))}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="group">
                  <td className="pr-2 text-xs text-gray-300 font-mono pt-1 align-top w-8">{rowIdx + 1}</td>
                  {PALLET_FIELDS.map((field, fieldIdx) => (
                    <td key={field.key} className="px-1 pb-1.5 align-top" style={{ width: field.width }}>
                      <input
                        ref={el => { inputRefs.current[refKey(rowIdx, fieldIdx)] = el }}
                        type={field.num ? 'number' : 'text'}
                        step={field.num ? 'any' : undefined}
                        readOnly={field.auto}
                        value={row[field.key]}
                        onChange={e => !field.auto && updateCell(rowIdx, field.key, e.target.value)}
                        onKeyDown={e => !field.auto && handleKeyDown(e, rowIdx, fieldIdx)}
                        onFocus={e => e.target.select()}
                        className={`w-full border rounded-lg px-2 py-1.5 text-sm transition-all
                          ${field.auto
                            ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-default text-right'
                            : field.num
                              ? 'text-right border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none bg-white'
                              : 'border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none bg-white'
                          }`}
                        style={{ minWidth: 0 }}
                      />
                    </td>
                  ))}
                  <td className="pl-1 pb-1.5 align-top w-8">
                    <button
                      onClick={() => removeRow(rowIdx)}
                      disabled={rows.length === 1}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20"
                      title="Delete row (Ctrl+Del)"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals footer */}
            <tfoot>
              <tr className="border-t-2 border-[#0a5c3a]">
                <td />
                <td colSpan={5} className="pt-2 text-xs font-bold text-[#0a5c3a] uppercase tracking-wide">TOTAL</td>
                <td className="pt-2 text-right text-sm font-bold text-[#0a5c3a] px-1">{totals.boxes.toFixed(0)}</td>
                <td className="pt-2 px-1"/>
                <td className="pt-2 text-right text-sm font-bold text-[#0a5c3a] px-1">{totals.net.toFixed(2)}</td>
                <td className="pt-2 text-right text-sm font-bold text-[#0a5c3a] px-1">{totals.gross.toFixed(2)}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Shortcuts bar */}
        <div className="px-6 py-2 border-t border-gray-100 bg-gray-50 shrink-0 flex flex-wrap gap-x-4 gap-y-1">
          {shortcuts.map(([keys, desc]) => (
            <span key={keys} className="text-xs text-gray-400">
              <kbd className="bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-500 font-mono text-xs shadow-sm">{keys}</kbd>
              {' '}{desc}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── DOCUMENTS SECTION ─────────────────────────────────────────────────────────
function DocumentsSection({ order }) {
  const [loading, setLoading] = useState({})
  const [plModal, setPlModal] = useState(false)
  const { showToast } = useToast()

  const shippedStatuses = ['in_transit', 'arrived', 'completed', 'delivered']
  const isShipped = shippedStatuses.includes(order.status)

  async function downloadPDF(endpoint, filename) {
    setLoading(l => ({ ...l, [filename]: true }))
    try {
      const res = await fetch(endpoint, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF oluşturulamadı' }))
        throw new Error(err.error || 'PDF oluşturulamadı')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(l => ({ ...l, [filename]: false }))
    }
  }

  // Dosya adı: ihracat sonrası parti no + müşteri ilk iki kelime + belge adı
  function docFilename(docLabel) {
    const lotPart = order.lot_no || order.party_no || 'doc'
    const custPart = (order.customer_name || '').split(/\s+/).slice(0, 2).join('_') || 'customer'
    const safe = s => s.replace(/[^a-zA-Z0-9_\-]/g, '')
    return `${safe(lotPart)}_${safe(custPart)}_${docLabel}.pdf`
  }

  const docs = [
    {
      key: 'sa',
      icon: <FileSignature size={22} className="text-primary-600" />,
      label: 'Sales Agreement',
      sublabel: 'Satış sözleşmesi',
      filename: `SA_${order.party_no || 'sa'}.pdf`,
      endpoint: `/api/pdf/sales-agreement/${order.id}`,
      always: true,
    },
    {
      key: 'inv',
      icon: <FileText size={22} className="text-amber-600" />,
      label: 'Commercial Invoice',
      sublabel: 'Ticari fatura',
      filename: docFilename('CommercialInvoice'),
      endpoint: `/api/pdf/invoice/${order.id}`,
      always: false,
    },
    {
      key: 'pl',
      icon: <Package size={22} className="text-blue-600" />,
      label: 'Packing List',
      sublabel: 'Packing list',
      filename: docFilename('PackingList'),
      endpoint: `/api/pdf/packing-list/${order.id}`,
      always: false,
    },
  ]

  return (
    <div className="card p-4">
      <h2 className="font-semibold text-gray-900 mb-3">Dokümanlar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {docs.map(doc => {
          const active = doc.always || isShipped
          const isLoading = loading[doc.filename]
          return (
            <div
              key={doc.key}
              className={`rounded-xl border-2 p-4 flex flex-col items-center gap-2 text-center transition-all
                ${active
                  ? 'border-gray-200 hover:border-primary-300 hover:shadow-sm cursor-pointer bg-white'
                  : 'border-dashed border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
              onClick={() => {
                if (!active || isLoading) return
                if (doc.key === 'pl') { setPlModal(true); return }
                downloadPDF(doc.endpoint, doc.filename)
              }}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${active ? 'bg-gray-50' : 'bg-gray-100'}`}>
                {isLoading ? <Loader2 size={22} className="animate-spin text-gray-400" /> : doc.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{doc.label}</p>
                <p className="text-xs text-gray-400">{doc.sublabel}</p>
              </div>
              {active ? (
                <span className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                  {doc.key === 'pl' ? <Edit2 size={12} /> : <Download size={12} />}
                  {doc.key === 'pl' ? 'Edit & Download' : 'Download PDF'}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Sevk sonrası aktif</span>
              )}
            </div>
          )
        })}
      </div>
      {plModal && (
        <PackingListModal
          order={order}
          filename={docFilename('PackingList')}
          onClose={() => setPlModal(false)}
        />
      )}
    </div>
  )
}

// ── TRACKING SECTION ──────────────────────────────────────────────────────────
function TrackingSection({ order, onSaved }) {
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    tracking_number: order.tracking_number || '',
    container_number: order.container_number || '',
    seawaybill_number: order.seawaybill_number || '',
    vessel_name: order.vessel_name || '',
    flight_number: order.flight_number || '',
    driver_name: order.driver_name || '',
    driver_phone: order.driver_phone || '',
  })
  const [saving, setSaving] = useState(false)
  const mode = order.transport_type || order.transport_mode || 'Road'

  async function save() {
    setSaving(true)
    try {
      await api.put(`/sales-orders/${order.id}`, { ...order, ...form })
      showToast('Takip bilgileri güncellendi', 'success')
      setEditing(false)
      onSaved()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const isSea = mode === 'Deniz Yolu' || mode === 'Sea'
  const isAir = mode === 'Hava Yolu' || mode === 'Air'
  const isRoad = !isSea && !isAir
  const hasInfo = form.tracking_number || form.container_number || form.flight_number || form.driver_name

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrackingIcon mode={mode} />
          <h2 className="font-semibold text-gray-900">
            {isSea ? 'Deniz Taşımacılığı' : isAir ? 'Hava Taşımacılığı' : 'Kara Taşımacılığı'}
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{mode}</span>
        </div>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditing(true)}>
          <Edit2 size={13} /> Düzenle
        </button>
      </div>

      {!editing ? (
        hasInfo ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {isRoad && form.tracking_number && (
              <div>
                <span className="text-gray-500 text-xs">TIR Plakası</span>
                <p className="font-mono font-semibold text-gray-900">{form.tracking_number}</p>
              </div>
            )}
            {isRoad && form.driver_name && (
              <div>
                <span className="text-gray-500 text-xs">Şoför</span>
                <p className="font-medium text-gray-900">{form.driver_name}{form.driver_phone ? ` · ${form.driver_phone}` : ''}</p>
              </div>
            )}
            {isSea && form.container_number && (
              <div>
                <span className="text-gray-500 text-xs">Konteyner No</span>
                <p className="font-mono font-semibold text-gray-900">{form.container_number}</p>
              </div>
            )}
            {isSea && form.seawaybill_number && (
              <div>
                <span className="text-gray-500 text-xs">Seawaybill No</span>
                <p className="font-mono font-semibold text-gray-900">{form.seawaybill_number}</p>
              </div>
            )}
            {isSea && form.vessel_name && (
              <div>
                <span className="text-gray-500 text-xs">Gemi Adı</span>
                <p className="font-medium text-gray-900">{form.vessel_name}</p>
              </div>
            )}
            {isAir && form.tracking_number && (
              <div>
                <span className="text-gray-500 text-xs">AWB Numarası</span>
                <p className="font-mono font-semibold text-gray-900">{form.tracking_number}</p>
              </div>
            )}
            {isAir && form.flight_number && (
              <div>
                <span className="text-gray-500 text-xs">Uçuş No</span>
                <p className="font-mono font-semibold text-gray-900">{form.flight_number}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Takip bilgisi henüz girilmedi</p>
        )
      ) : (
        <div className="space-y-3">
          {isRoad && (
            <>
              <div>
                <label className="label">TIR Plakası</label>
                <input className="input" placeholder="34 ABC 1234" value={form.tracking_number}
                  onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Şoför Adı</label>
                  <input className="input" value={form.driver_name}
                    onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Şoför Telefonu</label>
                  <input className="input" value={form.driver_phone}
                    onChange={e => setForm(f => ({ ...f, driver_phone: e.target.value }))} />
                </div>
              </div>
            </>
          )}
          {isSea && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Konteyner No</label>
                  <input className="input font-mono" placeholder="MSCU1234567" value={form.container_number}
                    onChange={e => setForm(f => ({ ...f, container_number: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Seawaybill No</label>
                  <input className="input font-mono" value={form.seawaybill_number}
                    onChange={e => setForm(f => ({ ...f, seawaybill_number: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Gemi Adı</label>
                <input className="input" value={form.vessel_name}
                  onChange={e => setForm(f => ({ ...f, vessel_name: e.target.value }))} />
              </div>
            </>
          )}
          {isAir && (
            <>
              <div>
                <label className="label">AWB Numarası</label>
                <input className="input font-mono" placeholder="235-12345678" value={form.tracking_number}
                  onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))} />
              </div>
              <div>
                <label className="label">Uçuş No</label>
                <input className="input font-mono" placeholder="TK 123" value={form.flight_number}
                  onChange={e => setForm(f => ({ ...f, flight_number: e.target.value }))} />
              </div>
            </>
          )}
          <div className="flex gap-2 pt-1">
            <button className="btn-secondary text-sm" onClick={() => setEditing(false)}>İptal</button>
            <button className="btn-primary text-sm" onClick={save} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── EVENT TIMELINE ────────────────────────────────────────────────────────────
function EventTimeline({ orderId, orderType }) {
  const { showToast } = useToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ event_type: 'note', title: '', description: '', location: '', event_date: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/shipment-events/${orderType}/${orderId}`)
      setEvents(res.data ?? res)
    } catch (e) { showToast(e.message || 'Sevkiyat olayları yüklenemedi', 'error') }
    finally { setLoading(false) }
  }, [orderId, orderType])

  useEffect(() => { load() }, [load])

  async function addEvent() {
    if (!form.title.trim()) { showToast('Başlık zorunludur', 'error'); return }
    setSaving(true)
    try {
      await api.post('/shipment-events', {
        order_type: orderType, order_id: orderId,
        ...form,
        event_date: form.event_date || new Date().toISOString(),
      })
      showToast('Olay eklendi', 'success')
      setAddOpen(false)
      setForm({ event_type: 'note', title: '', description: '', location: '', event_date: '' })
      load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function deleteEvent(id) {
    try {
      await api.delete(`/shipment-events/${id}`)
      setEvents(ev => ev.filter(e => e.id !== id))
    } catch (e) { showToast(e.message, 'error') }
  }

  function eventIcon(type) {
    if (type === 'location') return <MapPin size={14} className="text-blue-500" />
    if (type === 'status_change') return <Clock size={14} className="text-green-500" />
    if (type === 'document') return <FileText size={14} className="text-purple-500" />
    return <Clock size={14} className="text-gray-400" />
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Takip Geçmişi</h2>
        <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setAddOpen(true)}>
          <Plus size={13} /> Olay Ekle
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Yükleniyor...</div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">Henüz olay kaydedilmedi</div>
      ) : (
        <div className="relative">
          <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-200" />
          <div className="space-y-4">
            {events.map(ev => (
              <div key={ev.id} className="flex gap-3 relative">
                <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 z-10">
                  {eventIcon(ev.event_type)}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                      {ev.description && <p className="text-xs text-gray-500 mt-0.5">{ev.description}</p>}
                      {ev.location && (
                        <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                          <MapPin size={11} />{ev.location}
                        </p>
                      )}
                    </div>
                    <button className="text-gray-300 hover:text-red-500 shrink-0 p-1"
                      onClick={() => deleteEvent(ev.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(ev.event_date).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {ev.created_by_name && ` · ${ev.created_by_name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Olay Ekle" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Tip</label>
            <select className="select" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Başlık *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Kısaca ne oldu?" />
          </div>
          <div>
            <label className="label">Açıklama</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Konum</label>
              <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Şehir / Liman..." />
            </div>
            <div>
              <label className="label">Tarih / Saat</label>
              <input className="input" type="datetime-local" value={form.event_date}
                onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
          <button className="btn-secondary" onClick={() => setAddOpen(false)}>İptal</button>
          <button className="btn-primary" onClick={addEvent} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </div>
      </Modal>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function SalesDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/sales-orders/${id}`)
      setOrder(res.data ?? res)
    } catch (e) { showToast(e.message, 'error'); navigate('/sales') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(newStatus) {
    try {
      await api.patch(`/sales-orders/${id}/status`, { status: newStatus })
      setOrder(o => ({ ...o, status: newStatus }))
      showToast(`Durum güncellendi: ${STATUS_TR[newStatus]}`, 'success')
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Yükleniyor...</div>
  if (!order) return null

  const totalKg = Number(order.quantity_kg) || 0
  const unitPrice = Number(order.price_per_unit) || 0
  const total = totalKg * unitPrice

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/sales')} className="btn-ghost p-2 -ml-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900">{order.party_no}</h1>
            <span className={`badge ${STATUS_COLOR[order.status] || 'badge-draft'}`}>
              {STATUS_TR[order.status] || order.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {order.customer_name} · {order.product_name}{order.variety ? ` ${order.variety}` : ''}
            {order.caliber ? ` · ${order.caliber}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-4">

        {/* Status Bar */}
        <StatusBar status={order.status} onStatusChange={handleStatusChange} />

        {/* Documents */}
        <DocumentsSection order={order} />

        {/* Order Summary */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Sipariş Özeti</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {order.lot_no && (
              <div className="col-span-2">
                <dt className="text-gray-500 text-xs">İhracat Sonrası Parti No</dt>
                <dd className="font-semibold text-primary-700 font-mono">{order.lot_no}</dd>
              </div>
            )}
            {order.invoice_no && (
              <div className="col-span-2">
                <dt className="text-gray-500 text-xs">Fatura No (İhracat Sonrası)</dt>
                <dd className="font-semibold font-mono text-gray-800">{order.invoice_no}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500 text-xs">Miktar</dt>
              <dd className="font-medium">{totalKg.toLocaleString('tr-TR')} kg</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Birim Fiyat</dt>
              <dd className="font-medium">{unitPrice.toFixed(2)} {order.currency}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Toplam Tutar</dt>
              <dd className="font-semibold text-primary-700">{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {order.currency}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Incoterm</dt>
              <dd className="font-medium">{order.incoterm || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Yükleme Limanı</dt>
              <dd className="font-medium">{order.port_loading || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Varış Limanı</dt>
              <dd className="font-medium">{order.port_discharge || '—'}</dd>
            </div>
            {order.shipment_date && (
              <div>
                <dt className="text-gray-500 text-xs">Sevkiyat Tarihi</dt>
                <dd className="font-medium">{new Date(order.shipment_date).toLocaleDateString('tr-TR')}</dd>
              </div>
            )}
            {order.delivery_date && (
              <div>
                <dt className="text-gray-500 text-xs">Teslim Tarihi</dt>
                <dd className="font-medium">{new Date(order.delivery_date).toLocaleDateString('tr-TR')}</dd>
              </div>
            )}
            {order.payment_method && (
              <div>
                <dt className="text-gray-500 text-xs">Ödeme Yöntemi</dt>
                <dd className="font-medium">{order.payment_method}</dd>
              </div>
            )}
            {order.payment_term && (
              <div>
                <dt className="text-gray-500 text-xs">Ödeme Vadesi</dt>
                <dd className="font-medium">{order.payment_term}</dd>
              </div>
            )}
          </dl>

          {(order.links || []).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Bağlı Alım Siparişleri</p>
              <div className="flex flex-wrap gap-2">
                {order.links.map(l => (
                  <Link key={l.id} to={`/purchasing/${l.purchase_order_id}`}
                    className="text-xs text-primary-600 hover:underline bg-primary-50 px-2 py-1 rounded">
                    {l.po_party_no} · {l.supplier_name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tracking */}
        <TrackingSection order={order} onSaved={load} />

        {/* Timeline */}
        <EventTimeline orderId={id} orderType="sales" />

      </div>
    </div>
  )
}
