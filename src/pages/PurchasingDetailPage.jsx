import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/ui/Modal'
import { ArrowLeft, Truck, Ship, Plane, Plus, Trash2, MapPin, Clock, FileText, Edit2 } from 'lucide-react'

const STATUS_TR = {
  draft: 'Taslak', confirmed: 'Onaylı', in_transit: 'Transitte',
  arrived: 'Geldi', completed: 'Tamamlandı', cancelled: 'İptal',
}
const STATUS_COLOR = {
  draft: 'badge-draft', confirmed: 'badge-confirmed', in_transit: 'badge-transit',
  arrived: 'badge-arrived', completed: 'badge-completed', cancelled: 'badge-cancelled',
}

const EVENT_TYPES = [
  { value: 'status_change', label: 'Durum Değişikliği' },
  { value: 'location', label: 'Konum Güncellemesi' },
  { value: 'note', label: 'Not' },
  { value: 'document', label: 'Belge' },
]

function TrackingIcon({ mode }) {
  if (mode === 'Deniz Yolu') return <Ship size={18} className="text-blue-600"/>
  if (mode === 'Hava Yolu') return <Plane size={18} className="text-sky-500"/>
  return <Truck size={18} className="text-amber-600"/>
}

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
  const mode = order.transport_type || order.transport_mode || 'Karayolu TIR'

  async function save() {
    setSaving(true)
    try {
      await api.put(`/purchase-orders/${order.id}`, { ...order, ...form })
      showToast('Takip bilgileri güncellendi', 'success')
      setEditing(false)
      onSaved()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const isSea = mode === 'Deniz Yolu'
  const isAir = mode === 'Hava Yolu'
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
          <Edit2 size={13}/> Düzenle
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
                  onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Şoför Adı</label>
                  <input className="input" value={form.driver_name}
                    onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))}/>
                </div>
                <div>
                  <label className="label">Şoför Telefonu</label>
                  <input className="input" value={form.driver_phone}
                    onChange={e => setForm(f => ({ ...f, driver_phone: e.target.value }))}/>
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
                    onChange={e => setForm(f => ({ ...f, container_number: e.target.value }))}/>
                </div>
                <div>
                  <label className="label">Seawaybill No</label>
                  <input className="input font-mono" value={form.seawaybill_number}
                    onChange={e => setForm(f => ({ ...f, seawaybill_number: e.target.value }))}/>
                </div>
              </div>
              <div>
                <label className="label">Gemi Adı</label>
                <input className="input" value={form.vessel_name}
                  onChange={e => setForm(f => ({ ...f, vessel_name: e.target.value }))}/>
              </div>
            </>
          )}
          {isAir && (
            <>
              <div>
                <label className="label">AWB Numarası</label>
                <input className="input font-mono" placeholder="235-12345678" value={form.tracking_number}
                  onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))}/>
              </div>
              <div>
                <label className="label">Uçuş No</label>
                <input className="input font-mono" placeholder="TK 123" value={form.flight_number}
                  onChange={e => setForm(f => ({ ...f, flight_number: e.target.value }))}/>
              </div>
            </>
          )}
          <div className="flex gap-2 pt-1">
            <button className="btn-secondary text-sm" onClick={() => setEditing(false)}>İptal</button>
            <button className="btn-primary text-sm" onClick={save} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

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
    if (type === 'location') return <MapPin size={14} className="text-blue-500"/>
    if (type === 'status_change') return <Clock size={14} className="text-green-500"/>
    if (type === 'document') return <FileText size={14} className="text-purple-500"/>
    return <Clock size={14} className="text-gray-400"/>
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Takip Geçmişi</h2>
        <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setAddOpen(true)}>
          <Plus size={13}/> Olay Ekle
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Yükleniyor...</div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">Henüz olay kaydedilmedi</div>
      ) : (
        <div className="relative">
          <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-200"/>
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
                          <MapPin size={11}/>{ev.location}
                        </p>
                      )}
                    </div>
                    <button className="text-gray-300 hover:text-red-500 shrink-0 p-1"
                      onClick={() => deleteEvent(ev.id)}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(ev.event_date).toLocaleString('tr-TR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
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
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Kısaca ne oldu?"/>
          </div>
          <div>
            <label className="label">Açıklama</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Konum</label>
              <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Şehir / Liman..."/>
            </div>
            <div>
              <label className="label">Tarih / Saat</label>
              <input className="input" type="datetime-local" value={form.event_date}
                onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}/>
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

export default function PurchasingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/purchase-orders/${id}`)
      setOrder(res.data ?? res)
    } catch (e) { showToast(e.message, 'error'); navigate('/purchasing') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="p-6 text-center text-gray-400">Yükleniyor...</div>
  )
  if (!order) return null

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/purchasing')} className="btn-ghost p-2 -ml-2">
          <ArrowLeft size={18}/>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900">{order.party_no}</h1>
            <span className={`badge ${STATUS_COLOR[order.status] || 'badge-draft'}`}>
              {STATUS_TR[order.status] || order.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {order.supplier_name} · {order.product_name}{order.variety ? ` ${order.variety}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Tracking section */}
        <TrackingSection order={order} onSaved={load} />

        {/* Order summary */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Sipariş Özeti</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">Miktar</dt>
              <dd className="font-medium">{Number(order.quantity_kg).toLocaleString('tr-TR')} kg</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Birim Fiyat</dt>
              <dd className="font-medium">{order.price_per_unit} {order.currency}</dd>
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
          </dl>
          {(order.links || []).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Bağlı Satış Siparişleri</p>
              <div className="flex flex-wrap gap-2">
                {order.links.map(l => (
                  <Link key={l.id} to={`/sales/${l.sales_order_id}`}
                    className="text-xs text-primary-600 hover:underline bg-primary-50 px-2 py-1 rounded">
                    {l.so_party_no} · {l.customer_name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <EventTimeline orderId={id} orderType="purchase" />
      </div>
    </div>
  )
}
