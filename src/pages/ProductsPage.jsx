import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../hooks/useAuth'
import { Search, Plus, Edit2, Trash2 } from 'lucide-react'

const UNITS = ['kg','kutu','adet','palet']
const UNIT_TR = { kg:'kg', kutu:'Kutu', adet:'Adet', palet:'Palet' }

const EMPTY = {
  name:'', variety:'', category:'', unit:'kg',
  default_origin:'', box_type:'',
  box_net_kg:'', box_gross_kg:'', units_per_box:'', boxes_per_pallet:'',
  is_active:true, notes:''
}

export default function ProductsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isAdmin = user?.role === 'admin'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/products')
      setItems(res.data ?? res)
    } catch (e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    return !q || (i.name||'').toLowerCase().includes(q) || (i.variety||'').toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q)
  })

  function openAdd() { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  function openEdit(item) {
    setEditing(item)
    setForm({ ...EMPTY, ...item,
      box_net_kg: item.box_net_kg ?? '',
      box_gross_kg: item.box_gross_kg ?? '',
      units_per_box: item.units_per_box ?? '',
      boxes_per_pallet: item.boxes_per_pallet ?? '',
    })
    setModalOpen(true)
  }
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name.trim()) { showToast('Ürün adı zorunludur', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        box_net_kg:      form.box_net_kg      !== '' ? Number(form.box_net_kg)      : null,
        box_gross_kg:    form.box_gross_kg    !== '' ? Number(form.box_gross_kg)    : null,
        units_per_box:   form.units_per_box   !== '' ? Number(form.units_per_box)   : null,
        boxes_per_pallet:form.boxes_per_pallet!== '' ? Number(form.boxes_per_pallet): null,
      }
      if (editing) {
        await api.put(`/products/${editing.id}`, payload)
        showToast('Ürün güncellendi', 'success')
      } else {
        await api.post('/products', payload)
        showToast('Ürün eklendi', 'success')
      }
      setModalOpen(false)
      load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      await api.delete(`/products/${id}`)
      setDeleteConfirm(null)
      showToast('Ürün silindi', 'success')
      load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="p-3 md:p-6 max-w-full">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Ürünler</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} ürün</p>
        </div>
        {isAdmin && <button className="btn-primary text-sm" onClick={openAdd}><Plus size={15}/>Yeni</button>}
      </div>

      <div className="card mb-3 p-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="İsim, çeşit veya kategori ara..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Ürün bulunamadı</div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filtered.map(item => (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <span className="text-amber-600 text-sm font-bold">{(item.name||'?')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{item.name}{item.variety ? ` · ${item.variety}` : ''}</div>
                    <div className="text-xs text-gray-400">{item.category || '—'} · {UNIT_TR[item.unit] || item.unit}</div>
                    {item.box_net_kg && <div className="text-xs text-gray-400">Kutu: {item.box_net_kg}kg · Palet: {item.boxes_per_pallet} kutu</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={item.is_active ? 'badge-completed' : 'badge-cancelled'}>{item.is_active ? 'Aktif' : 'Pasif'}</span>
                    {isAdmin && <>
                      <button className="btn-ghost px-2 py-1" onClick={()=>openEdit(item)}><Edit2 size={14}/></button>
                      <button className="btn-ghost px-2 py-1 text-red-600 hover:bg-red-50" onClick={()=>setDeleteConfirm(item)}><Trash2 size={14}/></button>
                    </>}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Ürün Adı','Çeşit','Kategori','Birim','Kutu (net/brüt kg)','Palet/Kutu','Durum',...(isAdmin?['İşlemler']:[])].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(item=>(
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.variety || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{item.category || '—'}</td>
                      <td className="px-4 py-3">{UNIT_TR[item.unit] || item.unit}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.box_net_kg ? `${item.box_net_kg} / ${item.box_gross_kg ?? '?'}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.boxes_per_pallet ? `${item.boxes_per_pallet} kutu` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={item.is_active ? 'badge-completed' : 'badge-cancelled'}>
                          {item.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button className="btn-ghost px-2 py-1" onClick={()=>openEdit(item)}><Edit2 size={13}/></button>
                            <button className="btn-ghost px-2 py-1 text-red-600 hover:bg-red-50" onClick={()=>setDeleteConfirm(item)}><Trash2 size={13}/></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {isAdmin && (
        <>
          <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing ? 'Ürün Düzenle' : 'Yeni Ürün'} size="md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Ürün Adı *</label>
                <input className="input" value={form.name} onChange={e=>setField('name',e.target.value)} placeholder="Örn: Elma"/>
              </div>
              <div>
                <label className="label">Çeşit</label>
                <input className="input" value={form.variety} onChange={e=>setField('variety',e.target.value)} placeholder="Örn: Fuji"/>
              </div>
              <div>
                <label className="label">Kategori</label>
                <input className="input" value={form.category} onChange={e=>setField('category',e.target.value)} placeholder="Örn: Meyve"/>
              </div>
              <div>
                <label className="label">Varsayılan Menşei</label>
                <input className="input" value={form.default_origin} onChange={e=>setField('default_origin',e.target.value)} placeholder="Örn: Türkiye"/>
              </div>
              <div>
                <label className="label">Kutu Tipi</label>
                <input className="input" value={form.box_type} onChange={e=>setField('box_type',e.target.value)} placeholder="Örn: Karton 10kg"/>
              </div>
              <div>
                <label className="label">Birim</label>
                <select className="select" value={form.unit} onChange={e=>setField('unit',e.target.value)}>
                  {UNITS.map(u=><option key={u} value={u}>{UNIT_TR[u]}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={form.is_active} onChange={e=>setField('is_active',e.target.checked)}/>
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"/>
                  <span className="ml-2 text-sm text-gray-700">Aktif</span>
                </label>
              </div>

              {/* Paketleme Detayları */}
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pt-2 border-t border-gray-100">Paketleme & Paletleme</p>
              </div>
              <div>
                <label className="label">Kutu Net Ağırlık (kg)</label>
                <input className="input" type="number" step="0.001" value={form.box_net_kg} onChange={e=>setField('box_net_kg',e.target.value)} placeholder="Örn: 10"/>
              </div>
              <div>
                <label className="label">Kutu Brüt Ağırlık (kg)</label>
                <input className="input" type="number" step="0.001" value={form.box_gross_kg} onChange={e=>setField('box_gross_kg',e.target.value)} placeholder="Örn: 10.5"/>
              </div>
              <div>
                <label className="label">Kutu Başına Adet</label>
                <input className="input" type="number" value={form.units_per_box} onChange={e=>setField('units_per_box',e.target.value)} placeholder="Adet ürünler için"/>
              </div>
              <div>
                <label className="label">Palet Başına Kutu</label>
                <input className="input" type="number" value={form.boxes_per_pallet} onChange={e=>setField('boxes_per_pallet',e.target.value)} placeholder="Örn: 80"/>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Notlar</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e=>setField('notes',e.target.value)}/>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button className="btn-secondary" onClick={()=>setModalOpen(false)}>İptal</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </Modal>

          <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Ürünü Sil" size="sm">
            <p className="text-gray-700 mb-6"><strong>{deleteConfirm?.name}</strong> ürününü silmek istediğinizden emin misiniz?</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={()=>setDeleteConfirm(null)}>İptal</button>
              <button className="btn-danger" onClick={()=>handleDelete(deleteConfirm.id)} disabled={deleting}>{deleting ? 'Siliniyor...' : 'Sil'}</button>
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}
