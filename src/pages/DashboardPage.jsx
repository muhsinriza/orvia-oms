import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ShoppingCart, TrendingUp, Clock, CheckCircle, Truck, AlertTriangle, Ship, Plane } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    blue:    'bg-blue-50 text-blue-600',
    amber:   'bg-amber-50 text-amber-600',
    green:   'bg-green-50 text-green-600',
    red:     'bg-red-50 text-red-600',
  }
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
        <div className="text-sm text-gray-600 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </div>
  )
}

function etaDaysLeft(eta) {
  if (!eta) return null
  const diff = Math.ceil((new Date(eta) - new Date()) / 86400000)
  return diff
}

function EtaBadge({ eta }) {
  const days = etaDaysLeft(eta)
  if (days === null) return null
  if (days < 0)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">GECİKTİ ({Math.abs(days)}g)</span>
  if (days === 0) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">BUGÜN</span>
  if (days <= 3)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{days} gün</span>
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{days} gün</span>
}

function TransportIcon({ mode }) {
  const m = (mode || '').toLowerCase()
  if (m.includes('sea') || m.includes('deniz')) return <Ship size={14} className="text-blue-500" />
  if (m.includes('air') || m.includes('hava'))  return <Plane size={14} className="text-sky-500" />
  return <Truck size={14} className="text-gray-400" />
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [shipments, setShipments] = useState([])

  useEffect(() => {
    api.get('/dashboard').then(d => {
      setStats(d.stats)
      setRecent(d.recent || [])
      setShipments(d.shipments || [])
    }).catch(() => {})
  }, [])

  const alerts = shipments.filter(s => {
    const d = etaDaysLeft(s.eta)
    return d !== null && d <= 3
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Genel bakış</p>
      </div>

      {/* Uyarılar */}
      {alerts.length > 0 && (
        <div className="card border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">{alerts.length} sevkiyat yaklaşıyor veya gecikiyor</span>
          </div>
          <div className="space-y-2">
            {alerts.map(s => (
              <Link
                key={`${s.type}-${s.id}`}
                to={s.type === 'purchase' ? `/purchasing/${s.id}` : `/sales/${s.id}`}
                className="flex items-center gap-3 text-sm hover:opacity-80"
              >
                <TransportIcon mode={s.transport_mode} />
                <span className="font-medium text-gray-800">{s.party_no}</span>
                <span className="text-gray-500 truncate flex-1">{s.party_name} · {s.product_name}</span>
                <EtaBadge eta={s.eta} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Satın Alma (Bu Ay)" value={stats?.po_count ?? '—'} color="primary" />
        <StatCard icon={TrendingUp}   label="Satış (Bu Ay)"      value={stats?.so_count ?? '—'} color="blue" />
        <StatCard icon={Clock}        label="Transitte"           value={stats?.in_transit ?? '—'} color="amber" />
        <StatCard icon={CheckCircle}  label="Tamamlanan"          value={stats?.completed ?? '—'} color="green" />
      </div>

      {/* Aktif Sevkiyatlar */}
      {shipments.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Truck size={15} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Aktif Sevkiyatlar</h2>
            <span className="ml-auto text-xs text-gray-400">{shipments.length} kayıt</span>
          </div>
          <div className="divide-y divide-gray-50">
            {shipments.map(s => (
              <Link
                key={`${s.type}-${s.id}`}
                to={s.type === 'purchase' ? `/purchasing/${s.id}` : `/sales/${s.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <TransportIcon mode={s.transport_mode} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{s.party_no}
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${s.type === 'purchase' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {s.type === 'purchase' ? 'Alım' : 'Satış'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 truncate">{s.party_name} · {s.product_name}</div>
                </div>
                <div className="text-right shrink-0">
                  {s.etd && <div className="text-xs text-gray-400">ETD: {new Date(s.etd).toLocaleDateString('tr-TR')}</div>}
                  {s.eta && <div className="text-xs font-medium text-gray-700">ETA: {new Date(s.eta).toLocaleDateString('tr-TR')}</div>}
                </div>
                <EtaBadge eta={s.eta} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Son işlemler */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Son Satın Almalar */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Son Satın Almalar</h2>
            <Link to="/purchasing" className="text-xs text-primary-600 hover:underline">Tümü →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.filter(r => r.type === 'purchase').slice(0, 5).map(r => (
              <Link key={r.id} to={`/purchasing/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{r.party_no}</div>
                  <div className="text-xs text-gray-400 truncate">{r.party_name} · {r.product_name}</div>
                </div>
                <span className={`badge badge-${r.status}`}>{STATUS_TR[r.status] || r.status}</span>
              </Link>
            ))}
            {recent.filter(r => r.type === 'purchase').length === 0 && (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">Henüz kayıt yok</div>
            )}
          </div>
        </div>

        {/* Son Satışlar */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Son Satışlar</h2>
            <Link to="/sales" className="text-xs text-primary-600 hover:underline">Tümü →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.filter(r => r.type === 'sales').slice(0, 5).map(r => (
              <Link key={r.id} to={`/sales/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{r.party_no}</div>
                  <div className="text-xs text-gray-400 truncate">{r.party_name} · {r.product_name}</div>
                </div>
                <span className={`badge badge-${r.status}`}>{STATUS_TR[r.status] || r.status}</span>
              </Link>
            ))}
            {recent.filter(r => r.type === 'sales').length === 0 && (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">Henüz kayıt yok</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const STATUS_TR = {
  draft: 'Taslak', confirmed: 'Onaylı', in_transit: 'Transitte',
  arrived: 'Geldi', completed: 'Tamamlandı', cancelled: 'İptal',
  delivered: 'Teslim',
}
