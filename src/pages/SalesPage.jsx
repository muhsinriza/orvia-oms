import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { generateSalesInvoicePDF, generatePackingListPDF } from '../lib/pdf'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { Search, Plus, Edit2, FileText, Package, Link2, Trash2, X } from 'lucide-react'

const STATUS_OPTS = ['draft','confirmed','in_transit','arrived','completed','delivered','cancelled']
const STATUS_TR = { draft:'Taslak', confirmed:'Onaylandı', in_transit:'Transitte', arrived:'Geldi', completed:'Tamamlandı', delivered:'Teslim Edildi', cancelled:'İptal' }
const CURRENCIES = ['USD','EUR','GBP','TRY']
const INCOTERMLAR = ['EXW','FOB','CFR','CIF','DAP','DDP','FCA','CPT','CIP','DAT']
const TRANSPORT_MODES = ['Sea','Air','Road','Rail']
const DOC_KEYS = ['invoice','packing_list','health_certificate','phytosanitary','certificate_of_origin']
const DOC_TR = { invoice:'Fatura', packing_list:'Paket Listesi', health_certificate:'Sağlık Sertifikası', phytosanitary:'Fitosanitari', certificate_of_origin:'Menşe Şahadetnamesi' }

const SALES_TYPE_TR = { ihracat:'İhracat', yerli:'Yerli Satış', transit:'Transit' }

const EMPTY_FORM = {
  sales_type:'ihracat',
  sa_number:'',
  customer_id:'', product_id:'', variety:'', caliber:'', origin:'',
  quantity_kg:'', price_per_unit:'', currency:'USD',
  payment_method:'', payment_term:'', incoterm:'FOB',
  port_loading:'', port_discharge:'',
  dest_country:'', transit_entry:'', transit_exit:'',
  shipment_date:'', delivery_date:'', etd:'', eta:'',
  transport_mode:'Sea', box_type:'', box_weight_kg:'', pallets:'',
  quality_notes:'', notes:'', status:'draft',
  required_docs: { invoice:false, packing_list:false, health_certificate:false, phytosanitary:false, certificate_of_origin:false }
}

export default function SalesPage() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [linksModal, setLinksModal] = useState(null) // { soId, partyNo }
  const [links, setLinks] = useState([])
  const [linkForm, setLinkForm] = useState({ purchase_order_id:'', linked_kg:'' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [os, cs, ps, pos] = await Promise.all([
        api.get('/sales-orders'),
        api.get('/customers'),
        api.get('/products'),
        api.get('/purchase-orders'),
      ])
      setOrders(os.data ?? os)
      setCustomers(cs.data ?? cs)
      setProducts(ps.data ?? ps)
      setPurchaseOrders(pos.data ?? pos)
    } catch (e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const matchQ = !q || (o.party_no||'').toLowerCase().includes(q) || (o.customer_name||'').toLowerCase().includes(q)
    const matchS = !statusFilter || o.status === statusFilter
    return matchQ && matchS
  })

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(o) {
    setEditing(o)
    setForm({
      sales_type: o.sales_type||'ihracat',
      sa_number: o.sa_number||'',
      customer_id: o.customer_id||'', product_id: o.product_id||'',
      variety: o.variety||'', caliber: o.caliber||'', origin: o.origin||'',
      dest_country: o.dest_country||'', transit_entry: o.transit_entry||'', transit_exit: o.transit_exit||'',
      quantity_kg: o.quantity_kg||'', price_per_unit: o.price_per_unit||'',
      currency: o.currency||'USD', payment_method: o.payment_method||'',
      payment_term: o.payment_term||'', incoterm: o.incoterm||'FOB',
      port_loading: o.port_loading||'', port_discharge: o.port_discharge||'',
      shipment_date: o.shipment_date ? o.shipment_date.slice(0,10) : '',
      delivery_date: o.delivery_date ? o.delivery_date.slice(0,10) : '',
      etd: o.etd ? o.etd.slice(0,10) : '',
      eta: o.eta ? o.eta.slice(0,10) : '',
      transport_mode: o.transport_mode||'Sea', box_type: o.box_type||'',
      box_weight_kg: o.box_weight_kg||'', pallets: o.pallets||'',
      quality_notes: o.quality_notes||'', notes: o.notes||'',
      status: o.status||'draft',
      required_docs: { invoice:false, packing_list:false, health_certificate:false, phytosanitary:false, certificate_of_origin:false, ...(o.required_docs||{}) }
    })
    setModalOpen(true)
  }

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function setDoc(k, v) { setForm(f => ({ ...f, required_docs: { ...f.required_docs, [k]: v } })) }

  async function handleSave() {
    if (!form.customer_id || !form.product_id || !form.quantity_kg || !form.price_per_unit) {
      showToast('Müşteri, ürün, miktar ve fiyat zorunludur', 'error'); return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/sales-orders/${editing.id}`, form)
        setModalOpen(false)
        load()
        showToast('Satış siparişi güncellendi', 'success')
      } else {
        await api.post('/sales-orders', form)
        setModalOpen(false)
        load()
        showToast('Satış siparişi oluşturuldu', 'success')
      }
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      await api.delete(`/sales-orders/${id}`)
      setDeleteConfirm(null)
      load()
      showToast('Sipariş silindi', 'success')
    } catch (e) { showToast(e.message, 'error') }
    finally { setDeleting(false) }
  }

  async function openLinks(o) {
    setLinksModal({ soId: o.id, partyNo: o.party_no })
    setLinkForm({ purchase_order_id:'', linked_kg:'' })
    try {
      const res = await api.get(`/order-links/sales/${o.id}`)
      setLinks(res.data ?? res)
    } catch (e) { showToast(e.message, 'error') }
  }

  async function addLink() {
    if (!linkForm.purchase_order_id || !linkForm.linked_kg) { showToast('PO ve miktar seçin', 'error'); return }
    try {
      await api.post('/order-links', { sales_order_id: linksModal.soId, ...linkForm })
      showToast('Bağlantı eklendi', 'success')
      const res = await api.get(`/order-links/sales/${linksModal.soId}`)
      setLinks(res.data ?? res)
      setLinkForm({ purchase_order_id:'', linked_kg:'' })
    } catch (e) { showToast(e.message, 'error') }
  }

  async function removeLink(id) {
    try {
      await api.delete(`/order-links/${id}`)
      setLinks(l => l.filter(x => x.id !== id))
    } catch (e) { showToast(e.message, 'error') }
  }

  return (
    <div className="p-3 md:p-6 max-w-full">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Satış Siparişleri</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} sipariş</p>
        </div>
        <button className="btn-primary text-sm" onClick={openAdd}><Plus size={15}/>Yeni</button>
      </div>

      <div className="card mb-3 p-3 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="Party No veya müşteri ara..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="select w-auto" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="">Tüm</option>
          {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_TR[s]}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Sipariş bulunamadı</div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filtered.map(o => (
                <div key={o.id} className="px-4 py-3">
                  <div className="flex items-start gap-2 mb-1">
                    <Link to={`/sales/${o.id}`} className="font-mono font-semibold text-primary-700 text-sm hover:underline">{o.party_no}</Link>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                      o.sales_type === 'yerli' ? 'bg-blue-100 text-blue-700' :
                      o.sales_type === 'transit' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>{SALES_TYPE_TR[o.sales_type] || 'İhracat'}</span>
                    <span className={`ml-auto badge-${o.status} text-xs`}>{STATUS_TR[o.status]}</span>
                  </div>
                  <div className="text-sm text-gray-700 truncate">{o.customer_name}</div>
                  <div className="text-xs text-gray-400 truncate">{o.product_name}{o.variety ? ` / ${o.variety}` : ''}{o.caliber ? ` · ${o.caliber}` : ''}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{Number(o.quantity_kg).toLocaleString()} kg · {Number(o.price_per_unit).toFixed(2)} {o.currency}</span>
                    <div className="flex gap-1">
                      <button className="btn-ghost px-2 py-1" onClick={()=>openEdit(o)}><Edit2 size={13}/></button>
                      <button className="btn-ghost px-2 py-1" onClick={()=>generateSalesInvoicePDF(o)}><FileText size={13}/></button>
                      <button className="btn-ghost px-2 py-1" onClick={()=>openLinks(o)}><Link2 size={13}/></button>
                      <button className="btn-ghost px-2 py-1 text-red-600 hover:bg-red-50" onClick={()=>setDeleteConfirm(o)}><Trash2 size={13}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Party No','Tip','Müşteri','Ürün','Miktar (kg)','Fiyat','Para','Durum','Tarih','İşlemler'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-primary-700 whitespace-nowrap">
                        <Link to={`/sales/${o.id}`} className="hover:underline">{o.party_no}</Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          o.sales_type === 'yerli' ? 'bg-blue-100 text-blue-700' :
                          o.sales_type === 'transit' ? 'bg-purple-100 text-purple-700' :
                          'bg-green-100 text-green-700'
                        }`}>{SALES_TYPE_TR[o.sales_type] || 'İhracat'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{o.customer_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{o.product_name}{o.variety ? ` / ${o.variety}` : ''}{o.caliber ? ` · ${o.caliber}` : ''}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{Number(o.quantity_kg).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{Number(o.price_per_unit).toFixed(2)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{o.currency}</td>
                      <td className="px-4 py-3"><span className={`badge-${o.status}`}>{STATUS_TR[o.status]}</span></td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{o.created_at ? new Date(o.created_at).toLocaleDateString('tr-TR') : ''}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button className="btn-ghost px-2 py-1" onClick={()=>openEdit(o)} title="Düzenle"><Edit2 size={13}/></button>
                          <button className="btn-ghost px-2 py-1" onClick={()=>generateSalesInvoicePDF(o)} title="Fatura PDF"><FileText size={13}/></button>
                          <button className="btn-ghost px-2 py-1" onClick={()=>generatePackingListPDF(o)} title="Paket Listesi PDF"><Package size={13}/></button>
                          <button className="btn-ghost px-2 py-1" onClick={()=>openLinks(o)} title="Bağlantılar"><Link2 size={13}/></button>
                          <button className="btn-ghost px-2 py-1 text-red-600 hover:bg-red-50" onClick={()=>setDeleteConfirm(o)} title="Sil"><Trash2 size={13}/></button>
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

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing ? `Sipariş Düzenle — ${editing.party_no}` : 'Yeni Satış Siparişi'} size="xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Satış Tipi + SA Number */}
          <div className="sm:col-span-2">
            <label className="label">Satış Tipi *</label>
            <div className="flex gap-3">
              {Object.entries(SALES_TYPE_TR).map(([val, label]) => (
                <button key={val} type="button" onClick={()=>setField('sales_type', val)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.sales_type === val ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'}`}
                >{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">SA Numarası</label>
            <input className="input" value={form.sa_number} onChange={e=>setField('sa_number',e.target.value)} placeholder="Örn: SA-2024-001"/>
          </div>

          <div>
            <label className="label">Müşteri *</label>
            <select className="select" value={form.customer_id} onChange={e=>setField('customer_id',e.target.value)}>
              <option value="">Seçin...</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ürün *</label>
            <select className="select" value={form.product_id} onChange={e=>setField('product_id',e.target.value)}>
              <option value="">Seçin...</option>
              {products.map(p=><option key={p.id} value={p.id}>{p.name}{p.variety?` (${p.variety})`:''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Çeşit</label>
            <input className="input" value={form.variety} onChange={e=>setField('variety',e.target.value)} placeholder="Örn: Fuji"/>
          </div>
          <div>
            <label className="label">Kalibr / Boy</label>
            <input className="input" value={form.caliber} onChange={e=>setField('caliber',e.target.value)} placeholder="Örn: 100, 110-120, 135+"/>
          </div>
          <div>
            <label className="label">Menşei</label>
            <input className="input" value={form.origin} onChange={e=>setField('origin',e.target.value)} placeholder="Örn: Türkiye"/>
          </div>
          <div>
            <label className="label">Miktar (kg) *</label>
            <input className="input" type="number" value={form.quantity_kg} onChange={e=>setField('quantity_kg',e.target.value)}/>
          </div>
          <div>
            <label className="label">Birim Fiyat *</label>
            <input className="input" type="number" step="0.01" value={form.price_per_unit} onChange={e=>setField('price_per_unit',e.target.value)}/>
          </div>
          <div>
            <label className="label">Para Birimi</label>
            <select className="select" value={form.currency} onChange={e=>setField('currency',e.target.value)}>
              {CURRENCIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ödeme Yöntemi</label>
            <input className="input" value={form.payment_method} onChange={e=>setField('payment_method',e.target.value)} placeholder="Örn: T/T, L/C"/>
          </div>
          <div>
            <label className="label">Ödeme Vadesi</label>
            <input className="input" value={form.payment_term} onChange={e=>setField('payment_term',e.target.value)} placeholder="Örn: 30 gün"/>
          </div>
          <div>
            <label className="label">Incoterm</label>
            <select className="select" value={form.incoterm} onChange={e=>setField('incoterm',e.target.value)}>
              {INCOTERMLAR.map(i=><option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Yükleme Limanı</label>
            <input className="input" value={form.port_loading} onChange={e=>setField('port_loading',e.target.value)} placeholder="Örn: Mersin"/>
          </div>
          <div>
            <label className="label">Varış Limanı</label>
            <input className="input" value={form.port_discharge} onChange={e=>setField('port_discharge',e.target.value)} placeholder="Örn: Rotterdam"/>
          </div>

          {/* İhracat ek alanları */}
          {form.sales_type === 'ihracat' && (
            <div>
              <label className="label">Varış Ülkesi</label>
              <input className="input" value={form.dest_country} onChange={e=>setField('dest_country',e.target.value)} placeholder="Örn: Polonya"/>
            </div>
          )}

          {/* Transit ek alanları */}
          {form.sales_type === 'transit' && (
            <>
              <div>
                <label className="label">Giriş Gümrüğü</label>
                <input className="input" value={form.transit_entry} onChange={e=>setField('transit_entry',e.target.value)} placeholder="Örn: Kapıkule"/>
              </div>
              <div>
                <label className="label">Çıkış Gümrüğü</label>
                <input className="input" value={form.transit_exit} onChange={e=>setField('transit_exit',e.target.value)} placeholder="Örn: Gürbulak"/>
              </div>
            </>
          )}

          <div>
            <label className="label">Yükleme Tarihi</label>
            <input className="input" type="date" value={form.shipment_date} onChange={e=>setField('shipment_date',e.target.value)}/>
          </div>
          <div>
            <label className="label">Teslim Tarihi</label>
            <input className="input" type="date" value={form.delivery_date} onChange={e=>setField('delivery_date',e.target.value)}/>
          </div>
          <div>
            <label className="label">ETD (Tahmini Kalkış)</label>
            <input className="input" type="date" value={form.etd} onChange={e=>setField('etd',e.target.value)}/>
          </div>
          <div>
            <label className="label">ETA (Tahmini Varış)</label>
            <input className="input" type="date" value={form.eta} onChange={e=>setField('eta',e.target.value)}/>
          </div>
          <div>
            <label className="label">Taşıma Modu</label>
            <select className="select" value={form.transport_mode} onChange={e=>setField('transport_mode',e.target.value)}>
              {TRANSPORT_MODES.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Kutu Tipi</label>
            <input className="input" value={form.box_type} onChange={e=>setField('box_type',e.target.value)} placeholder="Örn: Karton 10kg"/>
          </div>
          <div>
            <label className="label">Kutu Ağırlığı (kg)</label>
            <input className="input" type="number" step="0.01" value={form.box_weight_kg} onChange={e=>setField('box_weight_kg',e.target.value)}/>
          </div>
          <div>
            <label className="label">Palet Sayısı</label>
            <input className="input" type="number" value={form.pallets} onChange={e=>setField('pallets',e.target.value)}/>
          </div>
          <div>
            <label className="label">Durum</label>
            <select className="select" value={form.status} onChange={e=>setField('status',e.target.value)}>
              {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_TR[s]}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label">Gerekli Belgeler</label>
            <div className="flex gap-4 flex-wrap">
              {DOC_KEYS.map(k=>(
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="rounded" checked={!!form.required_docs[k]} onChange={e=>setDoc(k,e.target.checked)}/>
                  {DOC_TR[k]}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label">Kalite Notları</label>
            <textarea className="input" rows={2} value={form.quality_notes} onChange={e=>setField('quality_notes',e.target.value)}/>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label">Notlar</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e=>setField('notes',e.target.value)}/>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button className="btn-secondary" onClick={()=>setModalOpen(false)}>İptal</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </div>
      </Modal>

      {/* Links Modal */}
      <Modal open={!!linksModal} onClose={()=>setLinksModal(null)} title={`Bağlantılar — ${linksModal?.partyNo}`} size="lg">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Satın Alma Siparişi</label>
              <select className="select" value={linkForm.purchase_order_id} onChange={e=>setLinkForm(f=>({...f,purchase_order_id:e.target.value}))}>
                <option value="">Seçin...</option>
                {purchaseOrders.map(p=><option key={p.id} value={p.id}>{p.party_no} — {p.product_name} ({p.supplier_name})</option>)}
              </select>
            </div>
            <div className="w-36">
              <label className="label">Bağlı Miktar (kg)</label>
              <input className="input" type="number" value={linkForm.linked_kg} onChange={e=>setLinkForm(f=>({...f,linked_kg:e.target.value}))}/>
            </div>
            <div className="flex items-end">
              <button className="btn-primary" onClick={addLink}><Plus size={15}/>Ekle</button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">PO No</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Tedarikçi</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Bağlı Miktar (kg)</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {links.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Bağlantı yok</td></tr>
                ) : links.map(l=>(
                  <tr key={l.id}>
                    <td className="px-3 py-2 font-mono text-primary-700">{l.po_party_no}</td>
                    <td className="px-3 py-2">{l.supplier_name}</td>
                    <td className="px-3 py-2">{Number(l.linked_kg).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="btn-ghost p-1 text-red-600 hover:bg-red-50" onClick={()=>removeLink(l.id)}><X size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Siparişi Sil" size="sm">
        <p className="text-gray-700 mb-6"><strong>{deleteConfirm?.party_no}</strong> siparişini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={()=>setDeleteConfirm(null)}>İptal</button>
          <button className="btn-danger" onClick={()=>handleDelete(deleteConfirm.id)}>Sil</button>
        </div>
      </Modal>
    </div>
  )
}
