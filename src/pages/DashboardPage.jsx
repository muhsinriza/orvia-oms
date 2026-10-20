import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import {
  TrendingUp, TrendingDown, Ship, Plane, Truck, AlertTriangle,
  Package, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
  ShoppingCart, DollarSign, Activity, BarChart2, Minus
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────
function etaDaysLeft(eta) {
  if (!eta) return null
  return Math.ceil((new Date(eta) - new Date()) / 86400000)
}

function fmtMoney(val, currency = 'USD') {
  const n = parseFloat(val) || 0
  if (n === 0) return '—'
  const sym = (currency || 'USD').toUpperCase() === 'EUR' ? '€' : '$'
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${sym}${(n / 1_000).toFixed(1)}K`
  return `${sym}${n.toFixed(0)}`
}

function fmtKg(val) {
  const n = parseFloat(val) || 0
  if (n === 0) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M kg`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K kg`
  return `${n.toFixed(0)} kg`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function changePct(current, previous) {
  const c = parseFloat(current) || 0
  const p = parseFloat(previous) || 0
  if (p === 0) return null
  return ((c - p) / p * 100).toFixed(0)
}

// ─── Sub-components ───────────────────────────────────────

function EtaBadge({ eta }) {
  const days = etaDaysLeft(eta)
  if (days === null) return null
  if (days < 0)   return <span className="eta-badge eta-overdue">GECİKTİ {Math.abs(days)}g</span>
  if (days === 0) return <span className="eta-badge eta-today">BUGÜN</span>
  if (days <= 3)  return <span className="eta-badge eta-soon">{days}g</span>
  if (days <= 7)  return <span className="eta-badge eta-week">{days}g</span>
  return <span className="eta-badge eta-ok">{days}g</span>
}

function TransportIcon({ mode, size = 14 }) {
  const m = (mode || '').toLowerCase()
  if (m.includes('sea') || m.includes('deniz')) return <Ship size={size} className="text-blue-400" />
  if (m.includes('air') || m.includes('hava'))  return <Plane size={size} className="text-sky-400" />
  return <Truck size={size} className="text-slate-400" />
}

function ChangeChip({ pct }) {
  if (pct === null) return null
  const up = parseFloat(pct) >= 0
  return (
    <span className={`change-chip ${up ? 'change-up' : 'change-down'}`}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(pct)}%
    </span>
  )
}

function StatusDot({ status }) {
  const dots = {
    draft:      'bg-gray-300',
    confirmed:  'bg-blue-400',
    in_transit: 'bg-amber-400',
    arrived:    'bg-purple-400',
    completed:  'bg-green-500',
    delivered:  'bg-green-600',
    cancelled:  'bg-red-400',
  }
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dots[status] || 'bg-gray-300'}`} />
}

const STATUS_TR = {
  draft: 'Taslak', confirmed: 'Onaylı', in_transit: 'Transitte',
  arrived: 'Geldi', completed: 'Tamamlandı', delivered: 'Teslim', cancelled: 'İptal',
}

// ─── KPI Card ─────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, change, iconClass, accent }) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <div className={`kpi-icon ${iconClass}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="kpi-value">{value ?? '—'}</div>
      <div className="kpi-bottom">
        {sub && <span className="kpi-sub">{sub}</span>}
        {change !== undefined && <ChangeChip pct={change} />}
      </div>
      {accent && <div className={`kpi-accent ${accent}`} />}
    </div>
  )
}

// ─── Mini bar ─────────────────────────────────────────────
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="mini-bar-track">
      <div className={`mini-bar-fill ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard').then(d => {
      setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const stats       = data?.stats        || {}
  const fin         = data?.financial    || {}
  const recent      = data?.recent       || []
  const shipments   = data?.shipments    || []
  const topProducts = data?.topProducts  || []

  const alerts = shipments.filter(s => {
    const d = etaDaysLeft(s.eta)
    return d !== null && d <= 3
  })

  const soChangePct = changePct(fin.so_value_this_month, fin.so_value_last_month)
  const poChangePct = changePct(fin.po_value_this_month, fin.po_value_last_month)

  const maxProductKg = Math.max(...topProducts.map(p => parseFloat(p.total_kg) || 0), 1)

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Günaydın' : now.getHours() < 18 ? 'İyi günler' : 'İyi geceler'
  const dateStr = now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-400">Yükleniyor…</div>
      </div>
    )
  }

  return (
    <div className="db-root">

      {/* ── Header ── */}
      <div className="db-header">
        <div>
          <h1 className="db-greeting">{greeting} 👋</h1>
          <p className="db-date">{dateStr}</p>
        </div>
        <div className="db-header-badge">
          <Activity size={13} />
          <span>Canlı</span>
        </div>
      </div>

      {/* ── Alert Banner ── */}
      {alerts.length > 0 && (
        <div className="alert-banner">
          <div className="alert-banner-icon">
            <AlertTriangle size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="alert-banner-title">{alerts.length} sevkiyat dikkat istiyor</p>
            <div className="alert-items">
              {alerts.map(s => (
                <Link
                  key={`${s.type}-${s.id}`}
                  to={s.type === 'purchase' ? `/purchasing/${s.id}` : `/sales/${s.id}`}
                  className="alert-item"
                >
                  <TransportIcon mode={s.transport_mode} size={12} />
                  <span className="font-semibold">{s.party_no}</span>
                  <span className="text-amber-700 truncate">{s.party_name}</span>
                  <EtaBadge eta={s.eta} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Grid ── */}
      <div className="kpi-grid">
        <KpiCard
          icon={TrendingUp}
          label="Satış (Bu Ay)"
          value={fmtMoney(fin.so_value_this_month, fin.so_currency)}
          sub={`${stats.so_count ?? 0} sipariş`}
          change={soChangePct}
          iconClass="kpi-icon-green"
          accent="kpi-accent-green"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Alım (Bu Ay)"
          value={fmtMoney(fin.po_value_this_month, fin.po_currency)}
          sub={`${stats.po_count ?? 0} sipariş`}
          change={poChangePct}
          iconClass="kpi-icon-blue"
          accent="kpi-accent-blue"
        />
        <KpiCard
          icon={DollarSign}
          label="Açık Pipeline"
          value={fmtMoney(fin.so_pipeline_value, fin.so_currency)}
          sub="Aktif satışlar"
          iconClass="kpi-icon-purple"
          accent="kpi-accent-purple"
        />
        <KpiCard
          icon={Package}
          label="YTD Hacim"
          value={fmtKg(fin.so_kg_ytd)}
          sub="Bu yıl satış"
          iconClass="kpi-icon-amber"
          accent="kpi-accent-amber"
        />
      </div>

      {/* ── Operasyon Özeti ── */}
      <div className="ops-row">
        <div className="ops-item">
          <div className="ops-num text-amber-600">{stats.in_transit ?? '—'}</div>
          <div className="ops-lbl">Transitte</div>
        </div>
        <div className="ops-divider" />
        <div className="ops-item">
          <div className="ops-num text-purple-600">{(parseInt(stats.po_arrived)||0) + (parseInt(stats.so_arrived)||0)}</div>
          <div className="ops-lbl">Limanda</div>
        </div>
        <div className="ops-divider" />
        <div className="ops-item">
          <div className="ops-num text-blue-600">{(parseInt(stats.po_active)||0) + (parseInt(stats.so_active)||0)}</div>
          <div className="ops-lbl">Aktif İşlem</div>
        </div>
        <div className="ops-divider" />
        <div className="ops-item">
          <div className="ops-num text-green-600">{stats.completed ?? '—'}</div>
          <div className="ops-lbl">Tamamlanan</div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="main-grid">

        {/* Sol: Aktif Sevkiyatlar */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <Truck size={14} className="text-slate-400" />
              <span>Aktif Sevkiyatlar</span>
            </div>
            <span className="panel-count">{shipments.length}</span>
          </div>

          {shipments.length === 0 ? (
            <div className="panel-empty">Aktif sevkiyat yok</div>
          ) : (
            <div className="shipment-list">
              {shipments.map(s => {
                const days = etaDaysLeft(s.eta)
                const isAlert = days !== null && days <= 3
                return (
                  <Link
                    key={`${s.type}-${s.id}`}
                    to={s.type === 'purchase' ? `/purchasing/${s.id}` : `/sales/${s.id}`}
                    className={`shipment-row ${isAlert ? 'shipment-row-alert' : ''}`}
                  >
                    <div className="shipment-transport">
                      <TransportIcon mode={s.transport_mode} size={15} />
                    </div>
                    <div className="shipment-info">
                      <div className="shipment-no">
                        {s.party_no}
                        <span className={`type-pill ${s.type === 'purchase' ? 'type-pill-po' : 'type-pill-so'}`}>
                          {s.type === 'purchase' ? 'Alım' : 'Satış'}
                        </span>
                      </div>
                      <div className="shipment-sub">
                        {s.party_name}
                        {s.product_name && <> · <span className="text-primary-600">{s.product_name}</span></>}
                      </div>
                    </div>
                    <div className="shipment-dates">
                      {s.etd && <div className="shipment-etd">ETD {fmtDate(s.etd)}</div>}
                      {s.eta && <div className="shipment-eta">ETA {fmtDate(s.eta)}</div>}
                    </div>
                    <EtaBadge eta={s.eta} />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Sağ: Son İşlemler + Top Ürünler */}
        <div className="right-col">

          {/* Top Ürünler Bu Ay */}
          {topProducts.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title-row">
                  <BarChart2 size={14} className="text-slate-400" />
                  <span>Bu Ay Ürünler</span>
                </div>
              </div>
              <div className="product-list">
                {topProducts.map((p, i) => (
                  <div key={p.product_name} className="product-row">
                    <div className="product-rank">{i + 1}</div>
                    <div className="product-info">
                      <div className="product-name">{p.product_name}</div>
                      <MiniBar value={parseFloat(p.total_kg) || 0} max={maxProductKg} color="bar-green" />
                    </div>
                    <div className="product-stats">
                      <div className="product-kg">{fmtKg(p.total_kg)}</div>
                      <div className="product-val">{fmtMoney(p.total_value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Son İşlemler */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-row">
                <Clock size={14} className="text-slate-400" />
                <span>Son İşlemler</span>
              </div>
            </div>
            <div className="recent-list">
              {recent.slice(0, 8).map(r => (
                <Link
                  key={`${r.type}-${r.id}`}
                  to={r.type === 'purchase' ? `/purchasing/${r.id}` : `/sales/${r.id}`}
                  className="recent-row"
                >
                  <StatusDot status={r.status} />
                  <div className="recent-info">
                    <span className="recent-no">{r.party_no}</span>
                    <span className="recent-name truncate">{r.party_name}</span>
                    {r.product_name && <span className="recent-product">{r.product_name}</span>}
                  </div>
                  <div className="recent-right">
                    <span className={`type-pill ${r.type === 'purchase' ? 'type-pill-po' : 'type-pill-so'}`}>
                      {r.type === 'purchase' ? 'Alım' : 'Satış'}
                    </span>
                    <span className="recent-date">{fmtDate(r.created_at)}</span>
                  </div>
                </Link>
              ))}
              {recent.length === 0 && <div className="panel-empty">Henüz işlem yok</div>}
            </div>
          </div>

        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        .db-root {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 1200px;
        }

        /* Header */
        .db-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .db-greeting {
          font-size: 1.35rem;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
        }
        .db-date {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-top: 3px;
          text-transform: capitalize;
        }
        .db-header-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #15803d;
          white-space: nowrap;
        }

        /* Alert */
        .alert-banner {
          display: flex;
          gap: 12px;
          padding: 14px 16px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 12px;
        }
        .alert-banner-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #fef3c7;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d97706;
          shrink: 0;
          flex-shrink: 0;
        }
        .alert-banner-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 8px;
        }
        .alert-items { display: flex; flex-direction: column; gap: 5px; }
        .alert-item {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.78rem;
          color: #78350f;
          text-decoration: none;
        }
        .alert-item:hover { opacity: 0.8; }

        /* ETA badges */
        .eta-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          white-space: nowrap;
          letter-spacing: 0.01em;
        }
        .eta-overdue { background: #fee2e2; color: #b91c1c; }
        .eta-today   { background: #fef9c3; color: #a16207; }
        .eta-soon    { background: #fef3c7; color: #b45309; }
        .eta-week    { background: #e0f2fe; color: #0369a1; }
        .eta-ok      { background: #f0fdf4; color: #166534; }

        /* Change chip */
        .change-chip {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 20px;
        }
        .change-up   { background: #dcfce7; color: #166534; }
        .change-down { background: #fee2e2; color: #991b1b; }

        /* KPI grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .kpi-card {
          position: relative;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 16px;
          overflow: hidden;
          transition: box-shadow 0.15s;
        }
        .kpi-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }

        .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .kpi-label {
          font-size: 0.72rem;
          font-weight: 500;
          color: #6b7280;
          letter-spacing: 0.01em;
        }
        .kpi-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kpi-icon-green  { background: #dcfce7; color: #16a34a; }
        .kpi-icon-blue   { background: #dbeafe; color: #2563eb; }
        .kpi-icon-purple { background: #ede9fe; color: #7c3aed; }
        .kpi-icon-amber  { background: #fef3c7; color: #d97706; }

        .kpi-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #111827;
          line-height: 1;
          margin-bottom: 8px;
          font-variant-numeric: tabular-nums;
        }
        .kpi-bottom {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .kpi-sub {
          font-size: 0.72rem;
          color: #9ca3af;
        }

        .kpi-accent {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
        }
        .kpi-accent-green  { background: linear-gradient(90deg, #16a34a, #4ade80); }
        .kpi-accent-blue   { background: linear-gradient(90deg, #2563eb, #60a5fa); }
        .kpi-accent-purple { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
        .kpi-accent-amber  { background: linear-gradient(90deg, #d97706, #fbbf24); }

        /* Ops row */
        .ops-row {
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 14px 20px;
        }
        .ops-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .ops-num {
          font-size: 1.5rem;
          font-weight: 800;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .ops-lbl {
          font-size: 0.7rem;
          color: #9ca3af;
          font-weight: 500;
          white-space: nowrap;
        }
        .ops-divider {
          width: 1px;
          height: 36px;
          background: #e5e7eb;
          margin: 0 8px;
        }

        /* Main grid */
        .main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 1024px) {
          .main-grid { grid-template-columns: 1.4fr 1fr; }
        }

        .right-col { display: flex; flex-direction: column; gap: 16px; }

        /* Panel */
        .panel {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid #f3f4f6;
        }
        .panel-title-row {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #374151;
        }
        .panel-count {
          font-size: 0.72rem;
          background: #f3f4f6;
          color: #6b7280;
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: 500;
        }
        .panel-empty {
          padding: 28px;
          text-align: center;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        /* Shipment list */
        .shipment-list { }
        .shipment-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 18px;
          border-bottom: 1px solid #f9fafb;
          text-decoration: none;
          transition: background 0.1s;
        }
        .shipment-row:last-child { border-bottom: none; }
        .shipment-row:hover { background: #f9fafb; }
        .shipment-row-alert { background: #fffbeb; }
        .shipment-row-alert:hover { background: #fef9c3; }

        .shipment-transport {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .shipment-info { flex: 1; min-width: 0; }
        .shipment-no {
          font-size: 0.82rem;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .shipment-sub {
          font-size: 0.72rem;
          color: #9ca3af;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .shipment-dates { text-align: right; flex-shrink: 0; }
        .shipment-etd { font-size: 0.67rem; color: #9ca3af; }
        .shipment-eta { font-size: 0.72rem; font-weight: 600; color: #374151; }

        /* Type pills */
        .type-pill {
          font-size: 0.62rem;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 20px;
        }
        .type-pill-po { background: #fff7ed; color: #c2410c; }
        .type-pill-so { background: #eff6ff; color: #1d4ed8; }

        /* Product list */
        .product-list { padding: 8px 0; }
        .product-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 18px;
        }
        .product-rank {
          width: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          color: #d1d5db;
          text-align: center;
          flex-shrink: 0;
        }
        .product-info { flex: 1; min-width: 0; }
        .product-name {
          font-size: 0.78rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }
        .product-stats { text-align: right; flex-shrink: 0; }
        .product-kg { font-size: 0.72rem; font-weight: 600; color: #374151; }
        .product-val { font-size: 0.67rem; color: #9ca3af; }

        .mini-bar-track {
          height: 4px;
          background: #f3f4f6;
          border-radius: 99px;
          overflow: hidden;
        }
        .mini-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.4s ease;
        }
        .bar-green { background: linear-gradient(90deg, #16a34a, #4ade80); }

        /* Recent list */
        .recent-list { }
        .recent-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 18px;
          text-decoration: none;
          border-bottom: 1px solid #f9fafb;
          transition: background 0.1s;
        }
        .recent-row:last-child { border-bottom: none; }
        .recent-row:hover { background: #f9fafb; }
        .recent-info {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .recent-no {
          font-size: 0.78rem;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
        }
        .recent-name {
          font-size: 0.72rem;
          color: #9ca3af;
          min-width: 0;
        }
        .recent-product {
          font-size: 0.7rem;
          color: #0a5c3a;
          background: #f0fdf4;
          padding: 1px 6px;
          border-radius: 20px;
          white-space: nowrap;
        }
        .recent-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .recent-date {
          font-size: 0.67rem;
          color: #d1d5db;
          white-space: nowrap;
        }

        @media (max-width: 480px) {
          .kpi-value { font-size: 1.2rem; }
          .ops-num { font-size: 1.2rem; }
          .recent-product { display: none; }
        }
      `}</style>
    </div>
  )
}
