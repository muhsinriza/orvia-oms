import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import { Plus, Search, FileText } from 'lucide-react'
import { generatePurchaseOrderPDF } from '../lib/pdf'

const STATUS_TR = {
  draft: 'Taslak', confirmed: 'Onaylı', in_transit: 'Transitte',
  arrived: 'Geldi', completed: 'Tamamlandı', cancelled: 'İptal',
}

const STATUSES = Object.keys(STATUS_TR)

const PURCHASE_TYPE_TR = { ithalat: 'İthalat', yerli: 'Yerli Alım' }

function emptyForm() {
  return {
    purchase_type: 'ithalat',
    supplier_id: '', product_id: '', variety: '', caliber: '', origin: '',
    origin_country: '', customs_ref: '',
    quantity_kg: '', price_per_unit: '', currency: 'USD',
    payment_method: 'T/T Wire Transfer', payment_term: '',
    incoterm: 'FOB', loading_port: '', destination: '',
    shipment_date: '', arrival_date: '',
    etd: '', eta: '',
    transport_type: 'Karayolu TIR',
    box_type: '', net_weight_box: '', boxes_per_pallet: '', total_pallets: '', pallet_type: '',
    grade: 'Extra', size_range: '', quality_notes: '',
    required_documents: ['Phyto', 'EUR.1', 'CMR', 'Invoice', 'Packing List'],
    special_notes: '', status: 'draft',
  }
}

export default function PurchasingPage() {
  const toast = useToast()
  const [orders, setOrders]     = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [form, setForm]         = useState(emptyForm())
  const [saving, setSaving]     = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [ord, sup, prod] = await Promise.all([
        api.get('/purchase-orders'),
        api.get('/suppliers'),
        api.get('/products'),
      ])
      setOrders(ord.data || [])
      setSuppliers(sup.data || [])
      setProducts(prod.data || [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditOrder(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(o) {
    setEditOrder(o)
    setForm({
      purchase_type: o.purchase_type || 'ithalat',
      supplier_id: o.supplier_id || '',
      product_id:  o.product_id  || '',
      variety:     o.variety     || '',
      caliber:     o.caliber     || '',
      origin:      o.origin      || '',
      origin_country: o.origin_country || '',
      customs_ref:    o.customs_ref    || '',
      quantity_kg: o.quantity_kg || '',
      price_per_unit: o.price_per_unit || '',
      currency:    o.currency    || 'USD',
      payment_method:  o.payment_method  || '',
      payment_term:    o.payment_term    || '',
      incoterm:        o.incoterm        || 'FOB',
      loading_port:    o.loading_port    || '',
      destination:     o.destination     || '',
      shipment_date:   o.shipment_date   ? o.shipment_date.slice(0,10) : '',
      arrival_date:    o.arrival_date    ? o.arrival_date.slice(0,10)  : '',
      etd:             o.etd             ? o.etd.slice(0,10)           : '',
      eta:             o.eta             ? o.eta.slice(0,10)           : '',
      transport_type:  o.transport_type  || 'Karayolu TIR',
      box_type:        o.box_type        || '',
      net_weight_box:  o.net_weight_box  || '',
      boxes_per_pallet:o.boxes_per_pallet|| '',
      total_pallets:   o.total_pallets   || '',
      pallet_type:     o.pallet_type     || '',
      grade:           o.grade           || 'Extra',
      size_range:      o.size_range      || '',
      quality_notes:   o.quality_notes   || '',
      required_documents: o.required_documents || ['Phyto','EUR.1','CMR','Invoice','Packing List'],
      special_notes:   o.special_notes   || '',
      status:          o.status          || 'draft',
    })
    setModalOpen(true)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.supplier_id || !form.product_id || !form.quantity_kg || !form.price_per_unit) {
      toast('Tedarikçi, ürün, miktar ve fiyat zorunludur', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        quantity_kg:    parseFloat(form.quantity_kg)    || 0,
        price_per_unit: parseFloat(form.price_per_unit) || 0,
        net_weight_box:   form.net_weight_box   ? parseFloat(form.net_weight_box)   : null,
        boxes_per_pallet: form.boxes_per_pallet ? parseInt(form.boxes_per_pallet)   : null,
        total_pallets:    form.total_pallets    ? parseInt(form.total_pallets)       : null,
        shipment_date: form.shipment_date || null,
        arrival_date:  form.arrival_date  || null,
        etd: form.etd || null,
        eta: form.eta || null,
      }
      if (editOrder) {
        await api.put(`/purchase-orders/${editOrder.id}`, payload)
        setModalOpen(false)
        fetchAll()
        toast('Sipariş güncellendi')
      } else {
        await api.post('/purchase-orders', payload)
        setModalOpen(false)
        fetchAll()
        toast('Sipariş oluşturuldu')
      }
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = orders.filter(o => {
    const s = search.toLowerCase()
    const matchSearch = !s || o.party_no?.toLowerCase().includes(s)
      || o.supplier?.company_name?.toLowerCase().includes(s)
      || o.product?.name?.toLowerCase().includes(s)
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    return matchSearch && matchStatus
  })

  const DOCS = ['Phyto', 'EUR.1', 'CMR', 'Invoice', 'Packing List', 'A.TR', 'Menşe Şahadetnamesi']

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Satın Alma</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} sipariş</p>
        </div>
        <button className="btn-primary text-sm" onClick={openAdd}><Plus size={15} />Yeni</button>
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-auto" value={filterStatus} onChange={e => setFilter(e.target.value)}>
          <option value="all">Tüm</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_TR[s]}</option>)}
        </select>
      </div>

      {/* Tablo */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Kayıt bulunamadı</div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filtered.map(o => (
                <div key={o.id} className="px-4 py-3">
                  <div className="flex items-start gap-2 mb-1">
                    <Link to={`/purchasing/${o.id}`} className="font-mono font-semibold text-primary-600 text-sm hover:underline">{o.party_no}</Link>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${o.purchase_type === 'yerli' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {PURCHASE_TYPE_TR[o.purchase_type] || 'İthalat'}
                    </span>
                    <span className={`ml-auto badge badge-${o.status} text-xs`}>{STATUS_TR[o.status] || o.status}</span>
                  </div>
                  <div className="text-sm text-gray-700 truncate">{o.supplier?.company_name || '—'}</div>
                  <div className="text-xs text-gray-400 truncate">{o.product?.name || '—'}{o.variety ? ` / ${o.variety}` : ''}{o.caliber ? ` · ${o.caliber}` : ''}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{Number(o.quantity_kg).toLocaleString('tr-TR')} kg · {Number(o.total_amount).toLocaleString('tr-TR', {maximumFractionDigits:0})} {o.currency}</span>
                    <div className="flex gap-1">
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(o)}>Düzenle</button>
                      <button className="btn-ghost px-2 py-1" onClick={() => generatePurchaseOrderPDF({...o, supplier: suppliers.find(s=>s.id===o.supplier_id), product: products.find(p=>p.id===o.product_id)})}><FileText size={13}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Party No</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Tip</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Tedarikçi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Ürün</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Miktar</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Tutar</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Durum</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/purchasing/${o.id}`} className="font-medium text-primary-600 hover:underline">{o.party_no}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${o.purchase_type === 'yerli' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {PURCHASE_TYPE_TR[o.purchase_type] || o.purchase_type || 'İthalat'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{o.supplier?.company_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{o.product?.name || '—'}{o.variety ? ` / ${o.variety}` : ''}{o.caliber ? ` · ${o.caliber}` : ''}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{Number(o.quantity_kg).toLocaleString('tr-TR')} kg</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {Number(o.total_amount).toLocaleString('tr-TR', {minimumFractionDigits:2,maximumFractionDigits:2})} {o.currency}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge badge-${o.status}`}>{STATUS_TR[o.status] || o.status}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(o)}>Düzenle</button>
                          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => generatePurchaseOrderPDF({...o, supplier: suppliers.find(s=>s.id===o.supplier_id), product: products.find(p=>p.id===o.product_id)})}>
                            <FileText size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editOrder ? `Düzenle — ${editOrder.party_no}` : 'Yeni Satın Alma Siparişi'} size="xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tip seçimi */}
          <div className="sm:col-span-2">
            <label className="label">Alım Tipi *</label>
            <div className="flex gap-3">
              {Object.entries(PURCHASE_TYPE_TR).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('purchase_type', val)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.purchase_type === val ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'}`}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Tedarikçi */}
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tedarikçi *</label>
              <select className="select" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}>
                <option value="">Seçin...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ürün *</label>
              <select className="select" value={form.product_id} onChange={e => set('product_id', e.target.value)}>
                <option value="">Seçin...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Çeşit</label>
            <input className="input" value={form.variety} onChange={e => set('variety', e.target.value)} placeholder="Örn: Salkım" />
          </div>
          <div>
            <label className="label">Kalibr / Boy</label>
            <input className="input" value={form.caliber} onChange={e => set('caliber', e.target.value)} placeholder="Örn: 100, 110-120, 135+" />
          </div>
          <div>
            <label className="label">Menşei</label>
            <input className="input" value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="Örn: Mısır" />
          </div>

          {form.purchase_type === 'ithalat' && (
            <>
              <div>
                <label className="label">Menşei Ülke</label>
                <input className="input" value={form.origin_country} onChange={e => set('origin_country', e.target.value)} placeholder="Örn: Mısır" />
              </div>
              <div>
                <label className="label">Gümrük Ref No</label>
                <input className="input" value={form.customs_ref} onChange={e => set('customs_ref', e.target.value)} placeholder="Gümrük takip no" />
              </div>
            </>
          )}

          <div>
            <label className="label">Miktar (kg) *</label>
            <input className="input" type="number" value={form.quantity_kg} onChange={e => set('quantity_kg', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label">Birim Fiyat *</label>
            <div className="flex gap-2">
              <input className="input" type="number" step="0.001" value={form.price_per_unit} onChange={e => set('price_per_unit', e.target.value)} placeholder="0.000" />
              <select className="select w-24" value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option>USD</option><option>EUR</option><option>TRY</option><option>GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Ödeme Yöntemi</label>
            <select className="select" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
              <option>T/T Wire Transfer</option>
              <option>Letter of Credit (L/C)</option>
              <option>Cash Against Documents</option>
              <option>Open Account</option>
            </select>
          </div>
          <div>
            <label className="label">Ödeme Vadesi</label>
            <input className="input" value={form.payment_term} onChange={e => set('payment_term', e.target.value)} placeholder="Örn: 30 gün" />
          </div>

          <div>
            <label className="label">Incoterm</label>
            <select className="select" value={form.incoterm} onChange={e => set('incoterm', e.target.value)}>
              {['EXW','FCA','FOB','CFR','CIF','DAP','DDP','FAS','CPT','CIP'].map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Yükleme Limanı / Yeri</label>
            <input className="input" value={form.loading_port} onChange={e => set('loading_port', e.target.value)} placeholder="Örn: Port Said, Mısır" />
          </div>

          <div>
            <label className="label">Varış Yeri</label>
            <input className="input" value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="Örn: Warszawa, Polonya" />
          </div>
          <div>
            <label className="label">Nakliye</label>
            <select className="select" value={form.transport_type} onChange={e => set('transport_type', e.target.value)}>
              <option>Karayolu TIR</option>
              <option>Deniz Yolu</option>
              <option>Hava Yolu</option>
              <option>Demiryolu</option>
            </select>
          </div>

          <div>
            <label className="label">Yükleme Tarihi</label>
            <input className="input" type="date" value={form.shipment_date} onChange={e => set('shipment_date', e.target.value)} />
          </div>
          <div>
            <label className="label">Tahmini Varış</label>
            <input className="input" type="date" value={form.arrival_date} onChange={e => set('arrival_date', e.target.value)} />
          </div>
          <div>
            <label className="label">ETD (Tahmini Kalkış)</label>
            <input className="input" type="date" value={form.etd} onChange={e => set('etd', e.target.value)} />
          </div>
          <div>
            <label className="label">ETA (Tahmini Varış)</label>
            <input className="input" type="date" value={form.eta} onChange={e => set('eta', e.target.value)} />
          </div>

          {/* Ambalaj */}
          <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ambalaj</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Kutu Tipi</label>
                <input className="input" value={form.box_type} onChange={e => set('box_type', e.target.value)} placeholder="Örn: Karton 10kg" />
              </div>
              <div>
                <label className="label">Net Ağırlık / Kutu (kg)</label>
                <input className="input" type="number" step="0.1" value={form.net_weight_box} onChange={e => set('net_weight_box', e.target.value)} />
              </div>
              <div>
                <label className="label">Kutu / Palet</label>
                <input className="input" type="number" value={form.boxes_per_pallet} onChange={e => set('boxes_per_pallet', e.target.value)} />
              </div>
              <div>
                <label className="label">Toplam Palet</label>
                <input className="input" type="number" value={form.total_pallets} onChange={e => set('total_pallets', e.target.value)} />
              </div>
              <div>
                <label className="label">Palet Tipi</label>
                <input className="input" value={form.pallet_type} onChange={e => set('pallet_type', e.target.value)} placeholder="Örn: Euro Palet" />
              </div>
            </div>
          </div>

          {/* Kalite */}
          <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Kalite</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Kalite Sınıfı</label>
                <select className="select" value={form.grade} onChange={e => set('grade', e.target.value)}>
                  <option>Extra</option><option>I. Sınıf</option><option>II. Sınıf</option>
                </select>
              </div>
              <div>
                <label className="label">Boyut Aralığı</label>
                <input className="input" value={form.size_range} onChange={e => set('size_range', e.target.value)} placeholder="Örn: 57-102 mm" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Kalite Notları</label>
                <textarea className="input" rows={2} value={form.quality_notes} onChange={e => set('quality_notes', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Evraklar */}
          <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Gerekli Evraklar</p>
            <div className="flex flex-wrap gap-2">
              {DOCS.map(d => (
                <label key={d} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.required_documents.includes(d)}
                    onChange={e => {
                      const docs = e.target.checked
                        ? [...form.required_documents, d]
                        : form.required_documents.filter(x => x !== d)
                      set('required_documents', docs)
                    }}
                    className="rounded"
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>

          {/* Durum */}
          <div>
            <label className="label">Durum</label>
            <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_TR[s]}</option>)}
            </select>
          </div>

          {/* Notlar */}
          <div className="sm:col-span-2">
            <label className="label">Özel Notlar</label>
            <textarea className="input" rows={2} value={form.special_notes} onChange={e => set('special_notes', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>İptal</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : editOrder ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
