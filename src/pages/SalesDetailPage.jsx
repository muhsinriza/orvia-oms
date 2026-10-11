import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import {
  ArrowLeft, Truck, Ship, Plane, Plus, Trash2, MapPin, Clock,
  FileText, Edit2, Package, FileSignature, ChevronRight, CheckCircle2,
  Download, Loader2, X, ChevronLeft, FileSpreadsheet
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
    label:    defaults.label    ?? `Pallet ${idx + 1}`,
    product:  defaults.product  ?? '',
    variety:  defaults.variety  ?? '',
    origin:   defaults.origin   ?? '',
    boxType:  defaults.boxType  ?? '',
    boxes:    defaults.boxes    ?? '',
    netBox:   defaults.netBox   ?? '',
    grossBox: defaults.grossBox ?? '',
    net:      defaults.net      ?? '',
    gross:    defaults.gross    ?? '',
  }
}

function computeRow(row) {
  const boxes    = parseFloat(row.boxes)    || 0
  const netBox   = parseFloat(row.netBox)   || 0
  const grossBox = parseFloat(row.grossBox) || 0
  const net      = boxes * netBox
  const gross    = grossBox > 0 ? boxes * grossBox : net * 1.05
  return {
    ...row,
    net:   net   > 0 ? net.toFixed(2)   : row.net,
    gross: gross > 0 ? gross.toFixed(2) : row.gross,
  }
}

// ── PackingListEditor: reusable table editor for one container ─────────────────
function PackingListEditor({ order, containerNo, savedData, onDataChange, inputRefs, lastFocused }) {
  const seedRows = () => {
    if (savedData && Array.isArray(savedData.rows) && savedData.rows.length > 0) return savedData.rows
    const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : null
    if (items) {
      return items.map((it, idx) => computeRow(makeRow(idx, {
        product:  it.product_name || order.product_name || '',
        variety:  [it.variety, it.caliber].filter(Boolean).join(' / ') || '',
        origin:   it.origin   || order.origin   || '',
        boxType:  it.box_type || order.box_type || '',
        netBox:   it.p_box_net_kg   || it.box_weight_kg || order.box_net_kg || order.box_weight_kg || '',
        grossBox: it.p_box_gross_kg || order.box_gross_kg || '',
      })))
    }
    return [computeRow(makeRow(0, {
      product:  order.product_name || '',
      variety:  [order.variety, order.caliber].filter(Boolean).join(' / ') || '',
      origin:   order.origin || '',
      boxType:  order.box_type || '',
      netBox:   order.box_net_kg || order.box_weight_kg || '',
      grossBox: order.box_gross_kg || '',
    }))]
  }
  const seedPalletCount = () => {
    if (savedData && savedData.palletCount) return savedData.palletCount
    const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : null
    return items ? items.length : (order.pallets || 1)
  }

  const [rows, setRows] = useState(seedRows)
  const [palletCount, setPalletCount] = useState(seedPalletCount)

  // Notify parent of changes
  useEffect(() => {
    onDataChange({ rows, palletCount })
  }, [rows, palletCount])

  function refKey(rowIdx, fieldIdx) { return `${rowIdx}_${fieldIdx}` }
  function getRef(rowIdx, fieldIdx) { return inputRefs.current[refKey(rowIdx, fieldIdx)] }

  function handleKeyDown(e, rowIdx, fieldIdx) {
    const editable = PALLET_FIELDS.filter(f => !f.auto)
    const editIdx  = editable.findIndex(f => f.key === PALLET_FIELDS[fieldIdx].key)
    if (e.key === 'Tab') {
      e.preventDefault()
      if (!e.shiftKey) {
        if (editIdx < editable.length - 1) { getRef(rowIdx, PALLET_FIELDS.findIndex(f => f.key === editable[editIdx + 1].key))?.focus() }
        else if (rowIdx < rows.length - 1) { getRef(rowIdx + 1, 0)?.focus() }
      } else {
        if (editIdx > 0) { getRef(rowIdx, PALLET_FIELDS.findIndex(f => f.key === editable[editIdx - 1].key))?.focus() }
        else if (rowIdx > 0) { getRef(rowIdx - 1, PALLET_FIELDS.findIndex(f => f.key === editable[editable.length - 1].key))?.focus() }
      }
    } else if (e.key === 'Enter' && !e.altKey) {
      e.preventDefault()
      if (rowIdx < rows.length - 1) { getRef(rowIdx + 1, fieldIdx)?.focus() }
      else { addRow(); setTimeout(() => getRef(rowIdx + 1, fieldIdx)?.focus(), 50) }
    } else if (e.key === 'ArrowDown') { e.preventDefault(); if (rowIdx < rows.length - 1) getRef(rowIdx + 1, fieldIdx)?.focus() }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); if (rowIdx > 0) getRef(rowIdx - 1, fieldIdx)?.focus() }
  }

  function updateCell(rowIdx, key, value) {
    setRows(prev => {
      const next = prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r)
      if (key === 'boxes' || key === 'netBox' || key === 'grossBox') return next.map((r, i) => i === rowIdx ? computeRow(r) : r)
      return next
    })
  }

  const addRow = useCallback(() => {
    setRows(prev => {
      const last = prev[prev.length - 1] || {}
      return [...prev, makeRow(prev.length, { product: last.product || '', variety: last.variety || '', origin: last.origin || '', boxType: last.boxType || '', netBox: last.netBox || '', grossBox: last.grossBox || '', label: `Pallet ${prev.length + 1}` })]
    })
    setPalletCount(c => c + 1)
  }, [])

  // Expose addRow to parent via shared inputRefs
  useEffect(() => { inputRefs.current._addRow = addRow }, [addRow])

  const removeRow = useCallback((idx) => {
    setRows(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx))
    setPalletCount(c => Math.max(1, c - 1))
  }, [])

  // Global Alt shortcuts
  useEffect(() => {
    function onWindowKey(e) {
      if (!e.altKey) return
      const { rowIdx: activeRowIdx, fieldIdx: activeFieldIdx } = lastFocused.current
      if (activeRowIdx === -1) return
      if (!e.shiftKey && e.code === 'Enter') {
        e.preventDefault()
        setRows(prev => {
          const last = prev[prev.length - 1] || {}
          const newRow = makeRow(prev.length, { product: last.product || '', variety: last.variety || '', origin: last.origin || '', boxType: last.boxType || '', netBox: last.netBox || '', grossBox: last.grossBox || '', label: `Pallet ${prev.length + 1}` })
          setTimeout(() => getRef(prev.length, 0)?.focus(), 50)
          return [...prev, newRow]
        })
        setPalletCount(c => c + 1)
      } else if (!e.shiftKey && e.code === 'Backspace') {
        e.preventDefault()
        setRows(prev => {
          if (prev.length === 1) return prev
          const newRows = prev.filter((_, i) => i !== activeRowIdx)
          setTimeout(() => getRef(Math.max(0, Math.min(activeRowIdx, newRows.length - 1)), activeFieldIdx)?.focus(), 50)
          return newRows
        })
        setPalletCount(c => Math.max(1, c - 1))
      } else if (e.shiftKey && e.code === 'KeyD') {
        e.preventDefault()
        setRows(prev => {
          if (activeRowIdx < 0 || activeRowIdx >= prev.length) return prev
          const copy = { ...prev[activeRowIdx], label: `Pallet ${prev.length + 1}` }
          const next = [...prev]; next.splice(activeRowIdx + 1, 0, copy)
          setTimeout(() => getRef(activeRowIdx + 1, activeFieldIdx)?.focus(), 50)
          return next
        })
        setPalletCount(c => c + 1)
      }
    }
    window.addEventListener('keydown', onWindowKey)
    return () => window.removeEventListener('keydown', onWindowKey)
  }, [])

  const totals = rows.reduce((acc, r) => ({ boxes: acc.boxes + (parseFloat(r.boxes) || 0), net: acc.net + (parseFloat(r.net) || 0), gross: acc.gross + (parseFloat(r.gross) || 0) }), { boxes: 0, net: 0, gross: 0 })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Sub-header: pallet count + totals */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Pallets:</label>
          <input type="number" min={1} value={palletCount} onChange={e => setPalletCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 text-center border border-gray-300 rounded-lg px-2 py-2 text-sm font-bold text-[#0a5c3a] focus:outline-none focus:ring-2 focus:ring-emerald-400 touch-manipulation" style={{ minHeight: 40 }} />
        </div>
        <div className="text-xs text-gray-400">Rows: <strong className="text-gray-600">{rows.length}</strong></div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 sm:ml-auto">
          <span className="font-semibold text-gray-600">Total:</span>
          <span>{totals.boxes.toFixed(0)} boxes</span><span>·</span>
          <span>{totals.net.toFixed(2)} kg net</span><span>·</span>
          <span>{totals.gross.toFixed(2)} kg gross</span>
        </div>
      </div>
      {/* Table */}
      <div className="overflow-auto flex-1 px-6 py-4">
        <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-400 tracking-wide pb-2 pr-2 w-8">#</th>
              {PALLET_FIELDS.map(f => (
                <th key={f.key} className={`text-xs font-semibold text-gray-500 tracking-wide pb-2 px-1 ${f.num ? 'text-right' : 'text-left'} ${f.auto ? 'text-gray-300' : ''}`} style={{ width: f.width }}>
                  {f.label.toLocaleUpperCase('en-US')}{f.auto ? ' (AUTO)' : ''}
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
                      onFocus={e => { e.target.select(); lastFocused.current = { rowIdx, fieldIdx } }}
                      className={`w-full border rounded-lg px-2 py-1.5 text-sm transition-all ${field.auto ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-default text-right' : field.num ? 'text-right border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none bg-white' : 'border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none bg-white'}`}
                      style={{ minWidth: 0 }}
                    />
                  </td>
                ))}
                <td className="pl-1 pb-1.5 align-top w-10">
                  <button onClick={() => removeRow(rowIdx)} disabled={rows.length === 1} className="p-2.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-20 touch-manipulation" style={{ minWidth: 40, minHeight: 40 }}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#0a5c3a]">
              <td /><td colSpan={5} className="pt-2 text-xs font-bold text-[#0a5c3a] uppercase tracking-wide">TOTAL</td>
              <td className="pt-2 text-right text-sm font-bold text-[#0a5c3a] px-1">{totals.boxes.toFixed(0)}</td>
              <td className="pt-2 px-1"/>
              <td className="pt-2 text-right text-sm font-bold text-[#0a5c3a] px-1">{totals.net.toFixed(2)}</td>
              <td className="pt-2 text-right text-sm font-bold text-[#0a5c3a] px-1">{totals.gross.toFixed(2)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── PackingListModal: wizard for multi-container packing lists ─────────────────
function PackingListModal({ order, filename, onClose }) {
  const { showToast } = useToast()
  const inputRefs = React.useRef({})
  const lastFocused = React.useRef({ rowIdx: -1, fieldIdx: -1 })

  // Get containers from order (new multi-container) or fallback to legacy
  const getContainers = () => {
    if (order.containers && order.containers.length > 0) {
      // Normalise: containers may be objects {id, container_number} or plain strings (after an onSaved merge)
      return order.containers.map(c =>
        typeof c === 'string'
          ? { id: null, container_number: c, packing_list_data: null }
          : c
      )
    }
    // Legacy: single container or no container
    return [{ id: null, container_number: order.container_number || '', packing_list_data: order.packing_list_data || null }]
  }

  const containers = getContainers()
  const isMulti = containers.length > 1
  const [step, setStep] = useState(0) // current container index
  const [containerData, setContainerData] = useState(() =>
    containers.map(c => ({ rows: null, palletCount: null, saved: false, containerId: c.id, packing_list_data: c.packing_list_data || null }))
  )
  const [generating, setGenerating] = useState(false)

  const currentContainer = containers[step]
  const currentData = containerData[step]
  const allSaved = containerData.every(d => d.saved)
  // Merge saved packing data: state rows take priority over DB snapshot
  const currentSavedData = currentData.rows
    ? { rows: currentData.rows, palletCount: currentData.palletCount }
    : currentData.packing_list_data || currentContainer.packing_list_data || null

  function handleDataChange(data) {
    setContainerData(prev => prev.map((d, i) => i === step ? { ...d, ...data } : d))
  }

  async function handleSaveAndContinue() {
    const data = containerData[step]
    const payload = {
      rows: (data.rows || []).map(r => ({ ...r, net: parseFloat(r.net) || 0, gross: parseFloat(r.gross) || 0, boxes: parseFloat(r.boxes) || 0, netBox: parseFloat(r.netBox) || 0 })),
      palletCount: data.palletCount,
      containerId: currentData.containerId,
    }
    try {
      await fetch(`/api/sales-orders/${order.id}/packing-list`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      // Update saved state and store packing_list_data so re-opening the modal shows the last saved data
      setContainerData(prev => prev.map((d, i) => i === step ? { ...d, saved: true, packing_list_data: { rows: payload.rows, palletCount: payload.palletCount } } : d))
      if (step < containers.length - 1) {
        setStep(s => s + 1)
        inputRefs.current = {}
        lastFocused.current = { rowIdx: -1, fieldIdx: -1 }
      }
    } catch (e) {
      showToast('Kayıt hatası: ' + e.message, 'error')
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      // Save current step first if not saved
      const data = containerData[step]
      if (!data.saved && data.rows) await handleSaveAndContinue()

      // Generate combined PDF for all containers
      const allPayloads = containerData.map((d, i) => ({
        containerId: d.containerId,
        containerNumber: containers[i].container_number,
        rows: (d.rows || []).map(r => ({ ...r, net: parseFloat(r.net) || 0, gross: parseFloat(r.gross) || 0, boxes: parseFloat(r.boxes) || 0, netBox: parseFloat(r.netBox) || 0 })),
        palletCount: d.palletCount,
      }))

      const res = await fetch(`/api/pdf/packing-list-custom/${order.id}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containers: allPayloads }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF oluşturulamadı' }))
        throw new Error(err.error || 'PDF oluşturulamadı')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const shortcuts = [
    ['Tab / Shift+Tab', 'next column'], ['Enter', 'next row'],
    ['↑ ↓', 'navigate'], ['⌥+Enter', 'new row'],
    ['⌥+Shift+D', 'duplicate'], ['⌥+Backspace', 'delete row'],
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className="flex flex-col bg-white w-full max-w-6xl mx-auto my-6 rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 py-4 bg-[#0a5c3a] text-white shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Package size={20} className="text-emerald-300 shrink-0" />
              <span className="font-bold text-base tracking-tight">Edit Packing List</span>
              <span className="text-emerald-300 text-sm font-normal">{order.party_no || order.invoice_no || ''}</span>
              {isMulti && (
                <span className="bg-emerald-700 text-emerald-100 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Konteyner {step + 1} / {containers.length}
                </span>
              )}
            </div>
            {currentContainer.container_number && (
              <p className="text-emerald-300 text-xs mt-0.5 font-mono">{currentContainer.container_number}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            {/* Add row button — visible on all screen sizes */}
            <button
              onClick={() => { const fn = inputRefs.current._addRow; if (fn) fn() }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white transition-colors touch-manipulation"
              title="⌥+Enter"
            >
              <Plus size={14} /> <span>+ Satır</span>
            </button>

            {/* Save & Continue — shown for non-last containers; on last container show Kaydet too */}
            {isMulti && step < containers.length - 1 ? (
              <button onClick={handleSaveAndContinue} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-white text-[#0a5c3a] hover:bg-emerald-50 transition-colors">
                Kaydet &amp; Devam <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={handleSaveAndContinue} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-100 text-[#0a5c3a] hover:bg-emerald-200 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Kaydet
              </button>
            )}
            {/* Generate PDF — always visible */}
            <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-white text-[#0a5c3a] hover:bg-emerald-50 transition-colors disabled:opacity-50">
              {generating ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Download size={15} /> <span className="hidden sm:inline">Generate PDF</span><span className="sm:hidden">PDF</span></>}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-emerald-800 transition-colors">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4L14 14M14 4L4 14" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* Step indicator for multi-container */}
        {isMulti && (
          <div className="px-6 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-3 shrink-0">
            {containers.map((c, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${i === step ? 'bg-[#0a5c3a] text-white' : containerData[i].saved ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {containerData[i].saved && i !== step && <CheckCircle2 size={11} />}
                {c.container_number || `Konteyner ${i + 1}`}
              </button>
            ))}
            <span className="text-xs text-gray-400 ml-auto">
              {containerData.filter(d => d.saved).length} / {containers.length} kaydedildi
            </span>
          </div>
        )}

        {/* Editor */}
        <PackingListEditor
          key={step}
          order={order}
          containerNo={currentContainer.container_number}
          savedData={currentSavedData}
          onDataChange={handleDataChange}
          inputRefs={inputRefs}
          lastFocused={lastFocused}
        />

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

// Legacy single-container state (kept for backwards compat reference only - now handled in PackingListEditor)
function _unused_PackingListModal({ order, filename, onClose }) {
  const { showToast } = useToast()
  const [rows, setRows] = useState(() => {
    // First: load from saved packing_list_data if available
    if (order.packing_list_data && Array.isArray(order.packing_list_data.rows) && order.packing_list_data.rows.length > 0) {
      return order.packing_list_data.rows
    }
    // Seed from items array if available, otherwise from order top-level fields
    const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : null
    if (items) {
      return items.map((it, idx) => computeRow(makeRow(idx, {
        product:  it.product_name || order.product_name || '',
        variety:  [it.variety, it.caliber].filter(Boolean).join(' / ') || '',
        origin:   it.origin   || order.origin   || '',
        boxType:  it.box_type || order.box_type || '',
        netBox:   it.p_box_net_kg   || it.box_weight_kg || order.box_net_kg || order.box_weight_kg || '',
        grossBox: it.p_box_gross_kg || order.box_gross_kg || '',
      })))
    }
    return [computeRow(makeRow(0, {
      product:  order.product_name || '',
      variety:  [order.variety, order.caliber].filter(Boolean).join(' / ') || '',
      origin:   order.origin || '',
      boxType:  order.box_type || '',
      netBox:   order.box_net_kg || order.box_weight_kg || '',
      grossBox: order.box_gross_kg || '',
    }))]
  })
  const [palletCount, setPalletCount] = useState(() => {
    // Saved DB value takes priority
    if (order.packing_list_data && order.packing_list_data.palletCount) {
      return order.packing_list_data.palletCount
    }
    // Otherwise: count seeded rows (items.length if items exist, else 1)
    const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : null
    return items ? items.length : (order.pallets || 1)
  })
  const [generating, setGenerating] = useState(false)
  const inputRefs = React.useRef({})
  const lastFocused = React.useRef({ rowIdx: -1, fieldIdx: -1 })

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
    } else if (e.key === 'Enter' && !e.altKey) {
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
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (rowIdx < rows.length - 1) getRef(rowIdx + 1, fieldIdx)?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (rowIdx > 0) getRef(rowIdx - 1, fieldIdx)?.focus()
    } else if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      // only move if at end of input value
      const input = e.target
      if (input.selectionStart === input.value.length) {
        e.preventDefault()
        const nextEditable = editable[editIdx + 1]
        if (nextEditable) {
          getRef(rowIdx, PALLET_FIELDS.findIndex(f => f.key === nextEditable.key))?.focus()
        } else if (rowIdx < rows.length - 1) {
          getRef(rowIdx + 1, 0)?.focus()
        }
      }
    } else if (e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const input = e.target
      if (input.selectionStart === 0) {
        e.preventDefault()
        const prevEditable = editable[editIdx - 1]
        if (prevEditable) {
          getRef(rowIdx, PALLET_FIELDS.findIndex(f => f.key === prevEditable.key))?.focus()
        } else if (rowIdx > 0) {
          const lastKey = editable[editable.length - 1].key
          getRef(rowIdx - 1, PALLET_FIELDS.findIndex(f => f.key === lastKey))?.focus()
        }
      }
    }
  }

  function updateCell(rowIdx, key, value) {
    setRows(prev => {
      const next = prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r)
      // Auto-compute net and gross if boxes or netBox changed
      if (key === 'boxes' || key === 'netBox' || key === 'grossBox') {
        return next.map((r, i) => i === rowIdx ? computeRow(r) : r)
      }
      return next
    })
  }

  const addRow = useCallback(() => {
    setRows(prev => {
      const last = prev[prev.length - 1] || {}
      return [...prev, makeRow(prev.length, {
        product:  last.product  || '',
        variety:  last.variety  || '',
        origin:   last.origin   || '',
        boxType:  last.boxType  || '',
        netBox:   last.netBox   || '',
        grossBox: last.grossBox || '',
        label:    `Pallet ${prev.length + 1}`,
      })]
    })
    setPalletCount(c => c + 1)
  }, [])

  const removeRow = useCallback((idx) => {
    setRows(prev => {
      if (prev.length === 1) return prev
      return prev.filter((_, i) => i !== idx)
    })
    setPalletCount(c => Math.max(1, c - 1))
  }, [])

  const duplicateRow = useCallback((idx) => {
    setRows(prev => {
      const copy = { ...prev[idx], label: `Pallet ${prev.length + 1}` }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
    setPalletCount(c => c + 1)
  }, [])

  const fillColumnDown = useCallback((fromRow, fieldIdx) => {
    const field = PALLET_FIELDS[fieldIdx]
    if (!field || field.auto) return
    setRows(prev => {
      const value = prev[fromRow][field.key]
      return prev.map((r, i) => i <= fromRow ? r : { ...r, [field.key]: value })
    })
  }, [])

  // Global keydown listener for Alt/Option shortcuts
  // Mac Option+key produces special chars, so we use e.code (physical key) + e.altKey
  // Attached to window so browser-level shortcuts don't intercept
  useEffect(() => {
    function onWindowKey(e) {
      if (!e.altKey) return
      // Use last focused cell (activeElement loses focus when Alt key is pressed on Mac)
      const { rowIdx: activeRowIdx, fieldIdx: activeFieldIdx } = lastFocused.current
      if (activeRowIdx === -1) return  // no packing list cell was focused

      if (!e.shiftKey && e.code === 'Enter') {
        e.preventDefault()
        // Use functional update to get current length after add
        setRows(prev => {
          const last = prev[prev.length - 1] || {}
          const newRow = makeRow(prev.length, {
            product:  last.product  || '',
            variety:  last.variety  || '',
            origin:   last.origin   || '',
            boxType:  last.boxType  || '',
            netBox:   last.netBox   || '',
            grossBox: last.grossBox || '',
            label:    `Pallet ${prev.length + 1}`,
          })
          setTimeout(() => getRef(prev.length, 0)?.focus(), 50)
          return [...prev, newRow]
        })
        setPalletCount(c => c + 1)
      } else if (!e.shiftKey && e.code === 'Backspace') {
        e.preventDefault()
        setRows(prev => {
          if (prev.length === 1) return prev
          const newRows = prev.filter((_, i) => i !== activeRowIdx)
          const focusIdx = Math.max(0, Math.min(activeRowIdx, newRows.length - 1))
          setTimeout(() => getRef(focusIdx, activeFieldIdx)?.focus(), 50)
          return newRows
        })
        setPalletCount(c => Math.max(1, c - 1))
      } else if (e.shiftKey && e.code === 'KeyD') {
        e.preventDefault()
        setRows(prev => {
          if (activeRowIdx < 0 || activeRowIdx >= prev.length) return prev
          const copy = { ...prev[activeRowIdx], label: `Pallet ${prev.length + 1}` }
          const next = [...prev]
          next.splice(activeRowIdx + 1, 0, copy)
          setTimeout(() => getRef(activeRowIdx + 1, activeFieldIdx)?.focus(), 50)
          return next
        })
        setPalletCount(c => c + 1)
      } else if (e.shiftKey && e.code === 'KeyF') {
        e.preventDefault()
        fillColumnDown(activeRowIdx, activeFieldIdx)
      }
    }
    window.addEventListener('keydown', onWindowKey)
    return () => window.removeEventListener('keydown', onWindowKey)
  }, [fillColumnDown])

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
      // Save packing list data to DB before generating PDF
      await fetch(`/api/sales-orders/${order.id}/packing-list`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload.rows, palletCount }),
      }).catch(() => {}) // non-blocking, don't fail PDF on save error

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
  const mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl'
  const shortcuts = [
    ['Tab / Shift+Tab', 'next column'],
    ['Enter', 'next row'],
    ['↑ ↓ ← →', 'navigate cells'],
    ['⌥+Enter', 'new row'],
    ['⌥+Shift+D', 'duplicate row'],
    ['⌥+Shift+F', 'fill column'],
    ['⌥+Backspace', 'delete row'],
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
              <Plus size={13} /> Add Row <kbd className="ml-1 opacity-60 text-xs">⌥+Enter</kbd>
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
                <th className="text-left text-xs font-semibold text-gray-400 tracking-wide pb-2 pr-2 w-8">#</th>
                {PALLET_FIELDS.map(f => (
                  <th
                    key={f.key}
                    className={`text-xs font-semibold text-gray-500 tracking-wide pb-2 px-1 ${f.num ? 'text-right' : 'text-left'} ${f.auto ? 'text-gray-300' : ''}`}
                    style={{ width: f.width }}
                  >
                    {f.label.toLocaleUpperCase('en-US')}{f.auto ? ' (AUTO)' : ''}
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
                        onFocus={e => { e.target.select(); lastFocused.current = { rowIdx, fieldIdx } }}
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
                      title={`Delete row (${mod}+Del)`}
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

// ── INVOICE MODAL ─────────────────────────────────────────────────────────────
function InvoiceModal({ order, filename, onClose, onSaved }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  // Seed containers from order.containers (new) or fallback to single container_number (legacy)
  const seedContainers = () => {
    if (order.containers && order.containers.length > 0) {
      return order.containers.map(c => c.container_number)
    }
    return order.container_number ? [order.container_number] : ['']
  }

  const [form, setForm] = useState({
    invoice_no:        order.invoice_no        || '',
    lot_no:            order.lot_no            || '',
    vessel_name:       order.vessel_name       || '',
    seawaybill_number: order.seawaybill_number || '',
    etd: order.etd ? order.etd.slice(0, 10) : '',
    eta: order.eta ? order.eta.slice(0, 10) : '',
    loading_address:   order.loading_address   || '',
    freight_amount:    order.freight_amount    || '',
  })
  const [containers, setContainers] = useState(seedContainers)

  const addContainer = () => setContainers(c => [...c, ''])
  const removeContainer = i => setContainers(c => c.length > 1 ? c.filter((_, idx) => idx !== i) : c)
  const updateContainer = (i, val) => setContainers(c => c.map((v, idx) => idx === i ? val : v))

  async function handleDownload() {
    setLoading(true)
    try {
      const filledContainers = containers.filter(c => c.trim())
      const container_number = filledContainers[0] || ''
      const payload = { ...form, container_number, containers: filledContainers }

      // 1. Siparişe kaydet
      const saveRes = await fetch(`/api/sales-orders/${order.id}/shipping`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({ error: 'Kayıt hatası' }))
        throw new Error(err.error || 'Bilgiler kaydedilemedi')
      }
      if (onSaved) onSaved({ ...payload, containers: filledContainers })

      // 2. PDF oluştur ve indir
      const res = await fetch(`/api/pdf/invoice/${order.id}`, {
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
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  )

  return (
    <Modal open onClose={onClose} title="Commercial Invoice" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Bu bilgiler siparişe kaydedilir ve PDF'e yazılır.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('invoice_no', 'Invoice No', 'text', 'INV-2026-001')}
          {field('lot_no', 'Lot / Party No', 'text', 'LOT-2026-001')}
          {field('vessel_name', 'Vessel Name', 'text', 'MSC OSCAR')}
          {field('seawaybill_number', 'Sea Waybill No (SWB)', 'text', 'SWB123456789')}
          {field('etd', 'ETD (Gerçek Kalkış)', 'date')}
          {field('eta', 'ETA (Gerçek Varış)', 'date')}
          {field('freight_amount', 'Navlun Tutarı (USD)', 'number', '0.00')}
          <div className="sm:col-span-2">
            <label className="label">Yükleme Adresi (Mal Muhabili)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Örn: Ankara Organizasyon Sanayi Bölgesi, No: 5 Sincan / Ankara"
              value={form.loading_address}
              onChange={e => setForm(f => ({ ...f, loading_address: e.target.value }))}
            />
          </div>
        </div>

        {/* Multi-container section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Konteyner No{containers.length > 1 ? ` (${containers.length} konteyner)` : ''}</label>
            <button
              type="button"
              onClick={addContainer}
              className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
            >
              <Plus size={12} /> Konteyner Ekle
            </button>
          </div>
          <div className="space-y-2">
            {containers.map((cn, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}.</span>
                <input
                  className="input font-mono flex-1"
                  placeholder="MSCU1234567"
                  value={cn}
                  onChange={e => updateContainer(i, e.target.value.toUpperCase())}
                />
                {containers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeContainer(i)}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>İptal</button>
          <button className="btn-primary flex items-center gap-2" onClick={handleDownload} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Kaydet &amp; PDF İndir
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── DOCUMENTS SECTION ─────────────────────────────────────────────────────────
function DocumentsSection({ order, onOrderUpdate, onRefresh }) {
  const [loading, setLoading] = useState({})
  const [plModal, setPlModal] = useState(false)
  const [invModal, setInvModal] = useState(false)
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
    {
      key: 'customs',
      icon: <FileSpreadsheet size={22} className="text-green-600" />,
      label: 'Gümrük Beyannamesi',
      sublabel: 'Excel dosyası',
      filename: `Gumruk_${order.lot_no || order.party_no || order.id}.xlsx`,
      endpoint: `/api/customs-excel/${order.id}`,
      always: false,
      isExcel: true,
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
                if (doc.key === 'inv') { setInvModal(true); return }
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
                  {(doc.key === 'pl' || doc.key === 'inv') ? <Edit2 size={12} /> : <Download size={12} />}
                  {doc.key === 'pl' || doc.key === 'inv' ? 'Fill & Download' : doc.isExcel ? 'Excel İndir' : 'Download PDF'}
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
      {invModal && (
        <InvoiceModal
          order={order}
          filename={docFilename('CommercialInvoice')}
          onClose={() => setInvModal(false)}
          onSaved={updates => { onOrderUpdate && onOrderUpdate(updates); onRefresh && onRefresh() }}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 gap-3">
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
  const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null
  const sellBy = firstItem?.sell_by || order.sell_by || 'box'
  const boxWeightKg = Number(firstItem?.box_weight_kg || order.box_weight_kg) || 0
  const totalBoxes = boxWeightKg > 0 ? Math.round(totalKg / boxWeightKg) : 0
  const total = sellBy === 'kg'
    ? totalKg * unitPrice
    : (totalBoxes > 0 ? totalBoxes * unitPrice : totalKg * unitPrice)

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
        <DocumentsSection order={order} onOrderUpdate={updates => setOrder(o => ({ ...o, ...updates }))} onRefresh={load} />

        {/* Order Summary */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Sipariş Özeti</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
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
              <dd className="font-medium">{unitPrice.toFixed(2)} {order.currency}{sellBy === 'box' ? <span className="text-xs text-gray-400 ml-1">/ kutu</span> : <span className="text-xs text-gray-400 ml-1">/ kg</span>}</dd>
            </div>
            {sellBy === 'box' && totalBoxes > 0 && (
              <div>
                <dt className="text-gray-500 text-xs">Kutu Adedi</dt>
                <dd className="font-medium">{totalBoxes.toLocaleString('tr-TR')} kutu</dd>
              </div>
            )}
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
            {order.etd && (
              <div>
                <dt className="text-gray-500 text-xs">Est. ETD</dt>
                <dd className="font-medium">{new Date(order.etd).toLocaleDateString('en-GB')}</dd>
              </div>
            )}
            {order.eta && (
              <div>
                <dt className="text-gray-500 text-xs">Est. ETA</dt>
                <dd className="font-medium">{new Date(order.eta).toLocaleDateString('en-GB')}</dd>
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
            {order.invoice_no && (
              <div>
                <dt className="text-gray-500 text-xs">Invoice No</dt>
                <dd className="font-medium">{order.invoice_no}</dd>
              </div>
            )}
            {order.lot_no && (
              <div>
                <dt className="text-gray-500 text-xs">Lot / Party No</dt>
                <dd className="font-medium">{order.lot_no}</dd>
              </div>
            )}
            {order.vessel_name && (
              <div>
                <dt className="text-gray-500 text-xs">Vessel Name</dt>
                <dd className="font-medium">{order.vessel_name}</dd>
              </div>
            )}
            {order.container_number && (
              <div>
                <dt className="text-gray-500 text-xs">Container No</dt>
                <dd className="font-mono font-medium">{order.container_number}</dd>
              </div>
            )}
            {order.seawaybill_number && (
              <div>
                <dt className="text-gray-500 text-xs">Sea Waybill No</dt>
                <dd className="font-mono font-medium">{order.seawaybill_number}</dd>
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
