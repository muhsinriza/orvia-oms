import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ShoppingCart, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'

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

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])

  useEffect(() => {
    api.get('/dashboard').then(d => {
      setStats(d.stats)
      setRecent(d.recent || [])
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Genel bakış</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Satın Alma (Bu Ay)" value={stats?.po_count ?? '—'} color="primary" />
        <StatCard icon={TrendingUp}   label="Satış (Bu Ay)"      value={stats?.so_count ?? '—'} color="blue" />
        <StatCard icon={Clock}        label="Transitte"           value={stats?.in_transit ?? '—'} color="amber" />
        <StatCard icon={CheckCircle}  label="Tamamlanan"          value={stats?.completed ?? '—'} color="green" />
      </div>

      {/* Son işlemler */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Son Satın Almalar */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Son Satın Almalar</h2>
            <Link to="/purchasing" className="text-xs text-primary-600 hover:underline">Tümü →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.filter(r => r.type === 'po').slice(0, 5).map(r => (
              <Link key={r.id} to={`/purchasing/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{r.party_no}</div>
                  <div className="text-xs text-gray-400 truncate">{r.supplier_name} · {r.product_name}</div>
                </div>
                <span className={`badge badge-${r.status}`}>{STATUS_TR[r.status] || r.status}</span>
              </Link>
            ))}
            {recent.filter(r => r.type === 'po').length === 0 && (
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
            {recent.filter(r => r.type === 'so').slice(0, 5).map(r => (
              <Link key={r.id} to={`/sales/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{r.party_no}</div>
                  <div className="text-xs text-gray-400 truncate">{r.customer_name} · {r.product_name}</div>
                </div>
                <span className={`badge badge-${r.status}`}>{STATUS_TR[r.status] || r.status}</span>
              </Link>
            ))}
            {recent.filter(r => r.type === 'so').length === 0 && (
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
