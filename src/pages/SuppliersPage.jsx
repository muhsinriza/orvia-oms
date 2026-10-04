import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { Search, Plus, Edit2, Trash2 } from 'lucide-react'

const EMPTY = { name:'', country:'', city:'', address:'', contact_name:'', email:'', phone:'', tax_number:'', notes:'' }

export default function SuppliersPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/suppliers')
      setItems(res.data ?? res)
    } catch (e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    return !q || (i.name||'').toLowerCase().includes(q) || (i.country||'').toLowerCase().includes(q) || (i.contact_name||'').toLowerCase().includes(q)
  })

  function openAdd() { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  function openEdit(item) { setEditing(item); setForm({ ...EMPTY, ...item }); setModalOpen(true) }
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name.trim()) { showToast('Tedarikçi adı zorunludur', 'error'); return }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, form)
        showToast('Tedarikçi güncellendi', 'success')
      } else {
        await api.post('/suppliers', form)
        showToast('Tedarikçi eklendi', 'success')
      }
      setModalOpen(false)
      load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/suppliers/${id}`)
      showToast('Silindi', 'success')
      setDeleteConfirm(null)
      load()
    } catch (e) { showToast(e.message, 'error') }
  }

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tedarikçiler</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} tedarikçi</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/>Yeni Tedarikçi</button>
      </div>

      <div className="card mb-4 p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="İsim, ülke veya kişi ara..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['İsim','Ülke','Şehir','İletişim Kişisi','E-posta','Telefon','İşlemler'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Tedarikçi bulunamadı</td></tr>
                ) : filtered.map(item=>(
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.country}</td>
                    <td className="px-4 py-3 text-gray-600">{item.city}</td>
                    <td className="px-4 py-3">{item.contact_name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.email}</td>
                    <td className="px-4 py-3 text-gray-600">{item.phone}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="btn-ghost px-2 py-1" onClick={()=>openEdit(item)}><Edit2 size={13}/></button>
                        <button className="btn-ghost px-2 py-1 text-red-600 hover:bg-red-50" onClick={()=>setDeleteConfirm(item)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Tedarikçi Adı *</label>
            <input className="input" value={form.name} onChange={e=>setField('name',e.target.value)} placeholder="Şirket adı"/>
          </div>
          <div>
            <label className="label">Ülke</label>
            <input className="input" value={form.country} onChange={e=>setField('country',e.target.value)} placeholder="Örn: Türkiye"/>
          </div>
          <div>
            <label className="label">Şehir</label>
            <input className="input" value={form.city} onChange={e=>setField('city',e.target.value)}/>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Adres</label>
            <textarea className="input" rows={2} value={form.address} onChange={e=>setField('address',e.target.value)}/>
          </div>
          <div>
            <label className="label">İletişim Kişisi</label>
            <input className="input" value={form.contact_name} onChange={e=>setField('contact_name',e.target.value)}/>
          </div>
          <div>
            <label className="label">E-posta</label>
            <input className="input" type="email" value={form.email} onChange={e=>setField('email',e.target.value)}/>
          </div>
          <div>
            <label className="label">Telefon</label>
            <input className="input" value={form.phone} onChange={e=>setField('phone',e.target.value)}/>
          </div>
          <div>
            <label className="label">Vergi Numarası</label>
            <input className="input" value={form.tax_number} onChange={e=>setField('tax_number',e.target.value)}/>
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

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Tedarikçiyi Sil" size="sm">
        <p className="text-gray-700 mb-6"><strong>{deleteConfirm?.name}</strong> tedarikçisini silmek istediğinizden emin misiniz?</p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={()=>setDeleteConfirm(null)}>İptal</button>
          <button className="btn-danger" onClick={()=>handleDelete(deleteConfirm.id)}>Sil</button>
        </div>
      </Modal>
    </div>
  )
}
