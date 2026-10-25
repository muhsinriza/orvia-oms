import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import {
  ReceiptText, Plus, Download, Trash2, Loader2, Search, X, ExternalLink
} from 'lucide-react'
import { Link } from 'react-router-dom'

const CN_REASONS = [
  { value: 'fiyat_indirimi', label: 'Fiyat İndirimi (Price Reduction)' },
  { value: 'kalite_kusuru',  label: 'Kalite Kusuru (Quality Defect)' },
  { value: 'eksik_teslimat', label: 'Eksik Teslimat (Short Delivery)' },
  { value: 'hasar',          label: 'Hasar (Damage)' },
  { value: 'iade',           label: 'İade (Return)' },
  { value: 'diger',          label: 'Diğer (Other)' },
]

const CURRENCIES = ['USD', 'EUR', 'TRY', 'GBP']

const REASON_MAP = Object.fromEntries(CN_REASONS.map(r => [r.value, r.label]))

// ── Create Modal ──────────────────────────────────────────────────────────────
function CreateCNModal({ onClose, onSaved }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    customer_name: '',
    order_ref: '',
    reason: '',
    amount: '',
    currency: 'USD',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit() {
    if (!form.customer_name.trim()) { showToast('Müşteri adı zorunludur', 'error'); return }
    if (!form.reason) { showToast('Lütfen bir neden seçin', 'error'); return }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      showToast('Geçerli bir tutar girin', 'error'); return
    }
    setSaving(true)
    try {
      const res = await api.post('/credit-notes', {
        customer_name: form.customer_name.trim(),
        order_ref:     form.order_ref.trim() || null,
        reason:        form.reason,
        amount:        Number(form.amount),
        currency:      form.currency,
        description:   form.description.trim() || null,
      })
      const data = res.data ?? res
      showToast(`Credit Note oluşturuldu: ${data.cn_number}`, 'success')
      onSaved()
      onClose()
    } catch (e) {
      showToast(e.message || 'Oluşturulamadı', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose}>
      <div className="p-6 space-y-4 w-full max-w-lg">
        <div className="flex items-center gap-2 mb-1">
          <ReceiptText size={20} className="text-amber-600" />
          <h2 className="font-bold text-lg text-gray-900">Yeni Credit Note</h2>
        </div>
        <p className="text-xs text-gray-400 -mt-2">
          Sisteme kayıtlı olmayan bir sevkiyat için manuel credit note.
        </p>

        <div>
          <label className="label">Müşteri Adı <span className="text-red-500">*</span></label>
          <input
            className="input"
            placeholder="Ör: Al-Bayan Trading Co."
            value={form.customer_name}
            onChange={e => set('customer_name', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Sipariş / Lot No <span className="text-gray-400 text-xs font-normal">(opsiyonel)</span></label>
          <input
            className="input"
            placeholder="Ör: LOT-2026-042 veya INVNO/123"
            value={form.order_ref}
            onChange={e => set('order_ref', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Neden <span className="text-red-500">*</span></label>
          <select
            className="input"
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
          >
            <option value="">Seçin...</option>
            {CN_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tutar <span className="text-red-500">*</span></label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Para Birimi</label>
            <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Açıklama <span className="text-gray-400 text-xs font-normal">(opsiyonel)</span></label>
          <textarea
            className="input"
            rows={3}
            placeholder="Ek açıklama, detay..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>İptal</button>
          <button className="btn-primary flex items-center gap-2" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Oluştur
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CreditNotesPage() {
  const { showToast } = useToast()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/credit-notes')
      setNotes(res.data ?? res)
    } catch (e) {
      showToast('Credit notlar yüklenemedi', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(cn) {
    if (!window.confirm(`${cn.cn_number} silinsin mi?`)) return
    try {
      await api.delete(`/credit-notes/${cn.id}`)
      showToast('Silindi', 'success')
      load()
    } catch (e) {
      showToast('Silinemedi', 'error')
    }
  }

  const q = search.toLowerCase()
  const filtered = notes.filter(cn =>
    !q ||
    (cn.cn_number || '').toLowerCase().includes(q) ||
    (cn.customer_name || cn.customer_name_linked || '').toLowerCase().includes(q) ||
    (cn.order_ref || cn.lot_no || cn.party_no || '').toLowerCase().includes(q)
  )

  // Totals by currency
  const totals = filtered.reduce((acc, cn) => {
    acc[cn.currency] = (acc[cn.currency] || 0) + Number(cn.amount)
    return acc
  }, {})

  function fmtAmount(n) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ReceiptText size={22} className="text-amber-600" />
          <h1 className="text-xl font-bold text-gray-900">Credit Notes</h1>
          {!loading && (
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {notes.length}
            </span>
          )}
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus size={15} /> Yeni Credit Note
        </button>
      </div>

      {/* Summary chips */}
      {Object.keys(totals).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(totals).map(([cur, total]) => (
            <div key={cur} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-sm">
              <span className="text-amber-500 font-medium text-xs uppercase mr-1">{cur}</span>
              <span className="font-bold text-amber-800">{fmtAmount(total)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-8 pr-8"
          placeholder="CN no, müşteri veya sipariş no ile ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Loader2 size={18} className="animate-spin" /> Yükleniyor...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ReceiptText size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? 'Sonuç bulunamadı' : 'Henüz credit note yok'}</p>
          {!search && <p className="text-sm mt-1">Yukarıdaki butona basarak oluşturun</p>}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">CN No</th>
                <th className="text-left px-4 py-3 font-semibold">Müşteri</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Sipariş Ref</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Neden</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Tarih</th>
                <th className="text-right px-4 py-3 font-semibold">Tutar</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(cn => {
                const customerName = cn.customer_name_linked || cn.customer_name || '—'
                const orderRef = cn.lot_no || cn.party_no || cn.order_ref || '—'
                const isLinked = !!cn.sales_order_id

                return (
                  <tr key={cn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 font-mono text-xs">{cn.cn_number}</span>
                        {isLinked && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 rounded px-1 py-0.5 font-medium">linked</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{customerName}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell font-mono text-xs">
                      {isLinked && cn.sales_order_id ? (
                        <Link
                          to={`/sales/${cn.sales_order_id}`}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          {orderRef} <ExternalLink size={10} />
                        </Link>
                      ) : orderRef}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-1">
                        {REASON_MAP[cn.reason] || cn.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {new Date(cn.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700 whitespace-nowrap">
                      {cn.currency} {fmtAmount(cn.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="PDF İndir"
                          className="p-1.5 rounded hover:bg-amber-100 text-amber-600 transition-colors"
                          onClick={() => {
                            const a = document.createElement('a')
                            a.href = `/api/pdf/credit-note/${cn.id}`
                            a.download = `${cn.cn_number}.pdf`
                            a.click()
                          }}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          title="Sil"
                          className="p-1.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                          onClick={() => handleDelete(cn)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CreateCNModal
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
