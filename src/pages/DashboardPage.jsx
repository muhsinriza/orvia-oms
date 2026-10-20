import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

// ─── Formatter Helpers ────────────────────────────────────────────────────────

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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M kg`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K kg`
  return `${n.toFixed(0)} kg`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function momPct(a, b) {
  a = parseFloat(a) || 0
  b = parseFloat(b) || 0
  if (b === 0) return null
  return ((a - b) / b) * 100
}

function statusLabel(s) {
  const map = {
    draft: 'Taslak', confirmed: 'Onaylı', in_transit: 'Transit',
    arrived: 'Geldi', completed: 'Tamamlandı', delivered: 'Teslim', cancelled: 'İptal'
  }
  return map[s] || s
}

function statusColor(s) {
  if (s === 'in_transit')  return { bg: '#dbeafe', color: '#1d4ed8' }
  if (s === 'arrived')     return { bg: '#fef3c7', color: '#b45309' }
  if (s === 'confirmed')   return { bg: '#dcfce7', color: '#15803d' }
  if (s === 'completed' || s === 'delivered') return { bg: '#f1f5f9', color: '#475569' }
  return { bg: '#f1f5f9', color: '#64748b' }
}

function etaUrgency(days) {
  if (days <= 1) return { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: days <= 0 ? 'Bugün!' : 'Yarın' }
  if (days <= 3) return { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: `${days} gün` }
  return             { color: '#2563eb',  bg: '#eff6ff',  border: '#93c5fd', label: `${days} gün` }
}

function TransportIcon({ mode, size = 16 }) {
  if (!mode) return <BoxIcon size={size} />
  const m = mode.toLowerCase()
  if (m.includes('air') || m.includes('hava')) return <PlaneIcon size={size} />
  if (m.includes('road') || m.includes('truck') || m.includes('kara')) return <TruckIcon size={size} />
  return <ShipIcon size={size} />
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const iconStyle = (size) => ({ width: size, height: size, display: 'block', flexShrink: 0 })

function TrendUpIcon({ size = 14, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
}
function TrendDownIcon({ size = 14, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
}
function DollarIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
}
function ShoppingBagIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
}
function BarChartIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function PackageIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
}
function ClockIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function AlertTriangleIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}
function ShipIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0021 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 00-2-2H7a2 2 0 00-2 2v6"/><path d="M12 10v4"/><path d="M8 11v2"/><path d="M16 11v2"/></svg>
}
function PlaneIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.7.6-.4 1L3 9l2 2-2 2-2 2 1.5 1.5 2-2 2 2 1.8 2.8c.4.3.9.1 1-.4L11 14l3 3 1.5 2.5c.4.6 1.4.3 1.5-.3z"/></svg>
}
function TruckIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
}
function BoxIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
}
function ArrowRightIcon({ size = 14, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
}
function UsersIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}
function BuildingIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="18" height="20"/><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="8" y1="2" x2="8" y2="22"/></svg>
}
function ScaleIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
}
function GlobeIcon({ size = 16, color = 'currentColor' }) {
  return <svg style={iconStyle(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
}

// ─── Bar Chart Component ───────────────────────────────────────────────────────

function TrendBarChart({ data, currency = 'USD' }) {
  const [hovered, setHovered] = useState(null)
  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 140, color: 'var(--clr-muted)', fontSize: 13 }}>
        Trend verisi yok
      </div>
    )
  }
  const sym = (currency || 'USD').toUpperCase() === 'EUR' ? '€' : '$'
  const maxV = Math.max(...data.map(d =>
    Math.max(parseFloat(d.so_value)||0, parseFloat(d.po_value)||0)
  ))
  if (maxV === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 140, color: 'var(--clr-muted)', fontSize: 13 }}>
      Veri yok
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { color: '#10b981', label: 'Satış' },
          { color: '#3b82f6', label: 'Alım' },
          { color: '#8b5cf6', label: 'Marj' }
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--clr-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 130, position: 'relative' }}>
        {data.map((d, i) => {
          const soV  = parseFloat(d.so_value)||0
          const poV  = parseFloat(d.po_value)||0
          const marj = parseFloat(d.margin_value)||0
          const soH  = (soV  / maxV) * 100
          const poH  = (poV  / maxV) * 100
          const marH = (Math.abs(marj) / maxV) * 100
          const isHov = hovered === i

          return (
            <div key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}>

              {isHov && (
                <div style={{
                  position: 'absolute', bottom: '108%', left: '50%', transform: 'translateX(-50%)',
                  background: '#0f172a', color: '#f8fafc', borderRadius: 10, padding: '10px 14px',
                  fontSize: 11, whiteSpace: 'nowrap', zIndex: 10, lineHeight: 1.8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: '#94a3b8', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}>{d.month_label}</div>
                  <div><span style={{ color: '#6ee7b7' }}>●</span> Satış: {sym}{soV.toLocaleString()}</div>
                  <div><span style={{ color: '#93c5fd' }}>●</span> Alım: {sym}{poV.toLocaleString()}</div>
                  <div><span style={{ color: marj >= 0 ? '#c4b5fd' : '#fca5a5' }}>●</span> Marj: {marj >= 0 ? '+' : '-'}{sym}{Math.abs(marj).toLocaleString()}</div>
                </div>
              )}

              <div style={{
                width: '100%', display: 'flex', alignItems: 'flex-end', gap: 1, height: 120,
                background: isHov ? 'rgba(99,102,241,0.04)' : 'transparent',
                borderRadius: 6, transition: 'background .15s', padding: '0 2px'
              }}>
                {[
                  { h: soH,  bg: isHov ? '#10b981' : '#34d399', opacity: 1 },
                  { h: poH,  bg: isHov ? '#3b82f6' : '#60a5fa', opacity: 1 },
                  { h: marH, bg: marj >= 0 ? (isHov ? '#8b5cf6' : '#a78bfa') : '#f87171', opacity: 1 }
                ].map((bar, j) => (
                  <div key={j} style={{
                    flex: 1, background: bar.bg,
                    borderRadius: '4px 4px 0 0',
                    height: `${bar.h}%`, minHeight: bar.h > 0 ? 3 : 0,
                    transition: 'all .2s ease'
                  }} />
                ))}
              </div>
              <div style={{
                fontSize: 10, color: isHov ? 'var(--clr-text)' : 'var(--clr-muted)',
                marginTop: 7, whiteSpace: 'nowrap', fontWeight: isHov ? 700 : 400,
                transition: 'all .15s'
              }}>
                {d.month_label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sub Components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, action, accent = '#6366f1' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 14
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent
        }}>
          {icon}
        </div>
        <h2 style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '.04em',
          textTransform: 'uppercase', color: 'var(--clr-text)', margin: 0
        }}>{title}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

function Card({ children, style = {}, noPad }) {
  return (
    <div style={{
      background: 'var(--clr-surface)',
      border: '1px solid var(--clr-border)',
      borderRadius: 16,
      overflow: 'hidden',
      ...(noPad ? {} : { padding: '20px 22px' }),
      ...style
    }}>
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub, badge, icon, accentColor, accentBg }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--clr-surface)',
        border: '1px solid var(--clr-border)',
        borderTop: `3px solid ${accentColor}`,
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        minWidth: 0,
        cursor: 'default',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px ${accentColor}30`
          : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all .2s ease'
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--clr-muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accentColor, flexShrink: 0
        }}>
          {icon}
        </div>
      </div>
      <div style={{
        fontSize: '1.7rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-.03em',
        color: 'var(--clr-text)', marginBottom: 10,
        fontVariantNumeric: 'tabular-nums'
      }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
        <span style={{ fontSize: 11, color: 'var(--clr-muted)' }}>{sub}</span>
        {badge}
      </div>
    </div>
  )
}

function MoMBadge({ val }) {
  if (val === null) return null
  const pos = val >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: pos ? '#dcfce7' : '#fee2e2',
      color: pos ? '#15803d' : '#b91c1c'
    }}>
      {pos ? <TrendUpIcon size={10} color="#15803d" /> : <TrendDownIcon size={10} color="#b91c1c" />}
      {Math.abs(val).toFixed(1)}%
    </span>
  )
}

function StatPill({ icon, label, value, color, bg }) {
  return (
    <div style={{
      background: 'var(--clr-surface)',
      border: '1px solid var(--clr-border)',
      borderRadius: 14,
      padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.15rem', fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--clr-muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const sc = statusColor(status)
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: sc.bg, color: sc.color, whiteSpace: 'nowrap', letterSpacing: '.01em'
    }}>
      {statusLabel(status)}
    </span>
  )
}

function EmptyCard({ message }) {
  return (
    <div style={{
      padding: '44px 20px', textAlign: 'center',
      color: 'var(--clr-muted)', fontSize: 13
    }}>
      <div style={{ fontSize: 28, marginBottom: 10, opacity: .4 }}>—</div>
      {message}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--clr-border)' }} />
}

// ─── Ranking Row ─────────────────────────────────────────────────────────────

function RankRow({ rank, name, sub, value, barPct, rankColor, rankBg, barColor }) {
  return (
    <div>
      <div style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            background: rankBg, color: rankColor,
            fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>{rank}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: 13,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {name}
            </div>
            {sub && <div style={{ fontSize: 11, color: 'var(--clr-muted)', marginTop: 2 }}>{sub}</div>}
          </div>
          <div style={{
            fontWeight: 800, fontSize: 14, flexShrink: 0,
            color: 'var(--clr-text)', fontVariantNumeric: 'tabular-nums'
          }}>
            {value}
          </div>
        </div>
        <div style={{ background: 'var(--clr-border)', borderRadius: 99, height: 5 }}>
          <div style={{
            width: `${barPct}%`, height: '100%', borderRadius: 99,
            background: barColor,
            transition: 'width .6s ease'
          }} />
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('overview')

  useEffect(() => {
    api.get('/dashboard')
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 40, height: 40, border: '3px solid var(--clr-border)',
        borderTopColor: '#6366f1', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ color: 'var(--clr-muted)', fontSize: 13, fontWeight: 600, letterSpacing: '.02em' }}>Yükleniyor…</div>
    </div>
  )

  if (error) return (
    <div style={{
      margin: 32, padding: '18px 20px', background: '#fef2f2',
      border: '1px solid #fca5a5', borderRadius: 14,
      color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10
    }}>
      <AlertTriangleIcon size={16} color="#dc2626" />
      {error}
    </div>
  )

  const {
    stats, financial: fin, recent, shipments, topProducts,
    etaAlerts, topCustomers, topSuppliers, monthlyTrend
  } = data

  const soCur     = fin.so_currency || 'USD'
  const poCur     = fin.po_currency || 'USD'
  const soThis    = parseFloat(fin.so_value_this_month)  || 0
  const poThis    = parseFloat(fin.po_value_this_month)  || 0
  const marginAbs = soThis - poThis
  const marginPct = soThis > 0 ? (marginAbs / soThis * 100) : 0
  const soMoM     = momPct(fin.so_value_this_month, fin.so_value_last_month)
  const poMoM     = momPct(fin.po_value_this_month, fin.po_value_last_month)

  const tabs = [
    { key: 'overview',  label: 'Özet'       },
    { key: 'shipments', label: 'Sevkiyat'   },
    { key: 'analytics', label: 'Analitik'   }
  ]

  const now = new Date()
  const dateStr = now.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // Current month label for highlight
  const currentMonthLabel = now.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })

  return (
    <>
      {/* ── Page Header (fixed — scroll container'dan bağımsız) ── */}
      <div className="dashboard-fixed-header" style={{
        position: 'fixed', top: 56, left: 0, right: 0, zIndex: 20,
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 14,
      }}>
        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.35)'
          }}>
            <GlobeIcon size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1 }}>
              Orvia OMS
            </div>
            <div style={{ fontSize: 11, color: 'var(--clr-muted)', marginTop: 2, fontWeight: 500 }}>
              {dateStr}
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <nav style={{
          display: 'flex',
          background: 'var(--clr-border)',
          borderRadius: 12, padding: 4, gap: 2
        }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '7px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all .18s cubic-bezier(.4,0,.2,1)',
                background: tab === t.key
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : 'transparent',
                color: tab === t.key ? '#fff' : 'var(--clr-muted)',
                boxShadow: tab === t.key ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                letterSpacing: '.01em'
              }}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 60px' }}>
      <div style={{ padding: '28px 24px', paddingTop: 76 }}>

      {/* ══════════ ÖZET ══════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ETA Alerts */}
          {etaAlerts && etaAlerts.length > 0 && (
            <section>
              <SectionHeader
                icon={<AlertTriangleIcon size={14} />}
                title={`ETA Uyarıları — ${etaAlerts.length} Sevkiyat Bu Hafta`}
                accent="#f59e0b"
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {etaAlerts.map(a => {
                  const days = parseInt(a.days_until_eta) ?? 0
                  const urg  = etaUrgency(days)
                  const link = `/${a.type === 'purchase' ? 'purchasing' : 'sales'}/${a.id}`
                  return (
                    <div key={`eta-${a.type}-${a.id}`} style={{
                      background: 'var(--clr-surface)',
                      border: `1px solid var(--clr-border)`,
                      borderLeft: `4px solid ${urg.color}`,
                      borderRadius: 14,
                      padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                      boxShadow: `0 2px 8px ${urg.color}12`
                    }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: urg.bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: urg.color, flexShrink: 0
                      }}>
                        <TransportIcon mode={a.transport_mode} size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {a.party_name || '—'}
                          <span style={{
                            background: a.type === 'purchase' ? '#dbeafe' : '#dcfce7',
                            color: a.type === 'purchase' ? '#1d4ed8' : '#15803d',
                            padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700
                          }}>
                            {a.type === 'purchase' ? 'Alım' : 'Satış'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--clr-muted)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{a.product_name || '—'}</span>
                          <span style={{ opacity: .4 }}>·</span>
                          <span>{a.party_no}</span>
                          {a.container_number && <><span style={{ opacity: .4 }}>·</span><span>📦 {a.container_number}</span></>}
                          {a.vessel_name && <><span style={{ opacity: .4 }}>·</span><span>🚢 {a.vessel_name}</span></>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontWeight: 900, fontSize: 14, color: urg.color,
                            background: urg.bg, padding: '5px 14px',
                            borderRadius: 20, display: 'inline-block',
                            fontVariantNumeric: 'tabular-nums',
                            border: `1px solid ${urg.border}`
                          }}>
                            {urg.label}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--clr-muted)', marginTop: 4 }}>
                            ETA: {fmtDate(a.eta)}
                          </div>
                        </div>
                        <Link to={link} style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '8px 16px', borderRadius: 10,
                          background: urg.color, color: '#fff',
                          textDecoration: 'none', fontSize: 12, fontWeight: 700,
                          flexShrink: 0, boxShadow: `0 2px 8px ${urg.color}40`,
                          transition: 'opacity .15s'
                        }}>
                          Görüntüle <ArrowRightIcon size={12} color="#fff" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* KPI Cards */}
          <section>
            <SectionHeader icon={<DollarIcon size={14} />} title="Bu Ay Finansal" accent="#10b981" />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: 14
            }}>
              <KpiCard
                label="Satış Bu Ay"
                value={fmtMoney(fin.so_value_this_month, soCur)}
                sub={`Geçen: ${fmtMoney(fin.so_value_last_month, soCur)}`}
                badge={<MoMBadge val={soMoM} />}
                icon={<DollarIcon size={17} color="#059669" />}
                accentColor="#059669" accentBg="#d1fae5"
              />
              <KpiCard
                label="Alım Bu Ay"
                value={fmtMoney(fin.po_value_this_month, poCur)}
                sub={`Geçen: ${fmtMoney(fin.po_value_last_month, poCur)}`}
                badge={<MoMBadge val={poMoM} />}
                icon={<ShoppingBagIcon size={17} color="#2563eb" />}
                accentColor="#2563eb" accentBg="#dbeafe"
              />
              <KpiCard
                label="Tahmini Marj"
                value={`${marginPct.toFixed(1)}%`}
                sub={`${marginAbs >= 0 ? '+' : ''}${fmtMoney(marginAbs, soCur)}`}
                icon={<BarChartIcon size={17} color={marginPct > 0 ? '#7c3aed' : '#dc2626'} />}
                accentColor={marginPct > 0 ? '#7c3aed' : '#dc2626'}
                accentBg={marginPct > 0 ? '#ede9fe' : '#fee2e2'}
              />
              <KpiCard
                label="Ort. Sipariş"
                value={fmtMoney(fin.so_avg_order_this_month, soCur)}
                sub="Bu ay satış ortalaması"
                icon={<PackageIcon size={17} color="#d97706" />}
                accentColor="#d97706" accentBg="#fef3c7"
              />
              <KpiCard
                label="Pipeline Satış"
                value={fmtMoney(fin.so_pipeline_value, soCur)}
                sub="Aktif & onaylı siparişler"
                icon={<ClockIcon size={17} color="#059669" />}
                accentColor="#059669" accentBg="#d1fae5"
              />
              <KpiCard
                label="Pipeline Alım"
                value={fmtMoney(fin.po_pipeline_value, poCur)}
                sub="Aktif & onaylı siparişler"
                icon={<ClockIcon size={17} color="#2563eb" />}
                accentColor="#2563eb" accentBg="#dbeafe"
              />
            </div>
          </section>

          {/* Operational Stats */}
          <section>
            <SectionHeader icon={<PackageIcon size={14} />} title="Operasyonel Durum" accent="#6366f1" />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 12
            }}>
              <StatPill icon={<ShipIcon size={19} />}  label="Transit"    value={parseInt(stats.in_transit)||0} color="#1d4ed8" bg="#dbeafe" />
              <StatPill icon={<PackageIcon size={19} />} label="Aktif SO" value={parseInt(stats.so_active)||0}  color="#059669" bg="#d1fae5" />
              <StatPill icon={<ShoppingBagIcon size={19} />} label="Aktif PO" value={parseInt(stats.po_active)||0} color="#7c3aed" bg="#ede9fe" />
              <StatPill icon={<BarChartIcon size={19} />} label="Tamamlandı" value={parseInt(stats.completed)||0} color="#475569" bg="#f1f5f9" />
              <StatPill icon={<ScaleIcon size={19} />} label="SO Ağırlık YTD" value={fmtKg(fin.so_kg_ytd)} color="#059669" bg="#d1fae5" />
              <StatPill icon={<ScaleIcon size={19} />} label="PO Ağırlık YTD" value={fmtKg(fin.po_kg_ytd)} color="#2563eb" bg="#eff6ff" />
            </div>
          </section>

          {/* Recent Transactions */}
          <section>
            <SectionHeader
              icon={<ClockIcon size={14} />}
              title="Son İşlemler"
              accent="#64748b"
              action={
                <div style={{ display: 'flex', gap: 10 }}>
                  <Link to="/sales" style={{
                    fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    Satışlar <ArrowRightIcon size={11} color="#6366f1" />
                  </Link>
                  <Link to="/purchasing" style={{
                    fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    Alımlar <ArrowRightIcon size={11} color="#6366f1" />
                  </Link>
                </div>
              }
            />
            <Card noPad>
              {(!recent || recent.length === 0)
                ? <EmptyCard message="Henüz işlem yok" />
                : recent.map((r, i) => {
                  const isPurchase = r.type === 'purchase'
                  const amount = parseFloat(r.quantity_kg||0) * parseFloat(r.price_per_unit||0)
                  const link = `/${isPurchase ? 'purchasing' : 'sales'}/${r.id}`
                  return (
                    <div key={`rec-${r.type}-${r.id}`}>
                      {i > 0 && <Divider />}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 20px', flexWrap: 'wrap',
                        transition: 'background .12s'
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--clr-border)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                          background: isPurchase ? '#dbeafe' : '#dcfce7',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isPurchase ? '#1d4ed8' : '#15803d'
                        }}>
                          {isPurchase
                            ? <ShoppingBagIcon size={17} color="#1d4ed8" />
                            : <PackageIcon size={17} color="#15803d" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 700, fontSize: 13,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {r.party_name || '—'}
                          </div>
                          <div style={{
                            fontSize: 11, color: 'var(--clr-muted)', marginTop: 3,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {r.product_name || '—'} · {r.party_no} · {fmtDate(r.created_at)}
                            {r.eta ? ` · ETA ${fmtDate(r.eta)}` : ''}
                          </div>
                        </div>
                        <StatusBadge status={r.status} />
                        <div style={{
                          fontWeight: 800, fontSize: 14, flexShrink: 0,
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {fmtMoney(amount, r.currency)}
                        </div>
                        <Link to={link} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 14px', borderRadius: 9,
                          background: '#6366f110',
                          fontSize: 12, color: '#6366f1', textDecoration: 'none',
                          fontWeight: 700, flexShrink: 0, border: '1px solid #6366f120'
                        }}>
                          Detay <ArrowRightIcon size={12} color="#6366f1" />
                        </Link>
                      </div>
                    </div>
                  )
                })
              }
            </Card>
          </section>
        </div>
      )}

      {/* ══════════ SEVKİYAT ══════════ */}
      {tab === 'shipments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(!shipments || shipments.length === 0)
            ? (
              <Card>
                <EmptyCard message="Aktif sevkiyat bulunmuyor" />
              </Card>
            )
            : shipments.map(s => {
              const etdDate = s.etd ? new Date(s.etd) : null
              const etaDate = s.eta ? new Date(s.eta) : null
              let progress = 0
              if (etdDate && etaDate && etaDate > etdDate) {
                progress = Math.min(100, Math.max(0,
                  ((now - etdDate) / (etaDate - etdDate)) * 100
                ))
              }
              const daysLeft = etaDate ? Math.ceil((etaDate - now) / 86400000) : null
              const isLate   = daysLeft !== null && daysLeft < 0
              const isUrgent = !isLate && daysLeft !== null && daysLeft <= 3
              const barColor = isLate ? '#dc2626' : isUrgent ? '#d97706' : '#6366f1'
              const amount = parseFloat(s.quantity_kg||0) * parseFloat(s.price_per_unit||0)

              return (
                <div key={`shp-${s.type}-${s.id}`} style={{
                  background: 'var(--clr-surface)',
                  border: '1px solid var(--clr-border)',
                  borderLeft: `4px solid ${barColor}`,
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: isLate
                    ? '0 2px 12px rgba(220,38,38,0.1)'
                    : isUrgent
                    ? '0 2px 12px rgba(217,119,6,0.08)'
                    : '0 1px 4px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ padding: '18px 22px' }}>
                    {/* Top row */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 16
                    }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                          background: `${barColor}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: barColor
                        }}>
                          <TransportIcon mode={s.transport_mode} size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                            {s.party_name || '—'}
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 9px',
                              borderRadius: 20,
                              background: s.type === 'purchase' ? '#dbeafe' : '#dcfce7',
                              color: s.type === 'purchase' ? '#1d4ed8' : '#15803d'
                            }}>
                              {s.type === 'purchase' ? 'Alım' : 'Satış'}
                            </span>
                          </div>
                          <div style={{
                            fontSize: 12, color: 'var(--clr-muted)',
                            display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'
                          }}>
                            <span style={{ fontWeight: 600 }}>{s.product_name || '—'}</span>
                            <span style={{ opacity: .4 }}>·</span>
                            <span>{s.party_no}</span>
                            {s.container_number && <><span style={{ opacity: .4 }}>·</span><span>📦 {s.container_number}</span></>}
                            {s.vessel_name && <><span style={{ opacity: .4 }}>·</span><span>🚢 {s.vessel_name}</span></>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <StatusBadge status={s.status} />
                        {isLate && (
                          <span style={{
                            fontSize: 11, fontWeight: 800, padding: '4px 11px',
                            borderRadius: 20, background: '#fee2e2', color: '#b91c1c',
                            border: '1px solid #fca5a5'
                          }}>
                            ⚠ {Math.abs(daysLeft)}g gecikmiş
                          </span>
                        )}
                        {isUrgent && !isLate && (
                          <span style={{
                            fontSize: 11, fontWeight: 800, padding: '4px 11px',
                            borderRadius: 20, background: '#fffbeb', color: '#b45309',
                            border: '1px solid #fcd34d'
                          }}>
                            ⏰ {daysLeft}g kaldı
                          </span>
                        )}
                        <Link to={`/${s.type === 'purchase' ? 'purchasing' : 'sales'}/${s.id}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '7px 16px', borderRadius: 10,
                            background: `${barColor}12`, border: `1px solid ${barColor}25`,
                            fontSize: 12, color: barColor, textDecoration: 'none', fontWeight: 700
                          }}>
                          Detay <ArrowRightIcon size={12} color={barColor} />
                        </Link>
                      </div>
                    </div>

                    {/* Progress */}
                    {etdDate && etaDate && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontSize: 11, color: 'var(--clr-muted)', marginBottom: 8,
                          fontWeight: 500
                        }}>
                          <span>ETD {fmtDate(s.etd)}</span>
                          <span style={{
                            fontWeight: 800, fontSize: 12,
                            color: isLate ? '#dc2626' : daysLeft === 0 ? '#d97706' : barColor
                          }}>
                            {daysLeft === null ? '' :
                             daysLeft < 0  ? `${Math.abs(daysLeft)}g gecikmiş` :
                             daysLeft === 0 ? 'Bugün geliyor!' :
                             `${daysLeft} gün kaldı`}
                          </span>
                          <span>ETA {fmtDate(s.eta)}</span>
                        </div>
                        {/* Progress track with dot */}
                        <div style={{ position: 'relative', height: 8 }}>
                          <div style={{
                            background: 'var(--clr-border)', borderRadius: 99,
                            height: '100%', overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 99, width: `${progress}%`,
                              background: `linear-gradient(90deg, ${barColor}99 0%, ${barColor} 100%)`,
                              transition: 'width .6s ease'
                            }} />
                          </div>
                          {/* Dot indicator */}
                          <div style={{
                            position: 'absolute', top: '50%', left: `${Math.min(Math.max(progress, 1), 99)}%`,
                            transform: 'translate(-50%, -50%)',
                            width: 14, height: 14, borderRadius: '50%',
                            background: barColor,
                            border: '2px solid var(--clr-surface)',
                            boxShadow: `0 0 0 2px ${barColor}50`,
                            transition: 'left .6s ease'
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Footer chips */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 600,
                        background: 'var(--clr-border)', borderRadius: 20,
                        padding: '5px 12px', color: 'var(--clr-text)'
                      }}>
                        <ScaleIcon size={13} /> {fmtKg(s.quantity_kg)}
                      </span>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 600,
                        background: 'var(--clr-border)', borderRadius: 20,
                        padding: '5px 12px', color: 'var(--clr-text)'
                      }}>
                        <DollarIcon size={13} /> {fmtMoney(amount, s.currency)}
                      </span>
                      {s.transport_mode && (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 12, fontWeight: 600,
                          background: `${barColor}12`, borderRadius: 20,
                          padding: '5px 12px', color: barColor,
                          border: `1px solid ${barColor}25`
                        }}>
                          <TransportIcon mode={s.transport_mode} size={13} />
                          {s.transport_mode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* ══════════ ANALİTİK ══════════ */}
      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Monthly trend */}
          <section>
            <SectionHeader icon={<BarChartIcon size={14} />} title="Son 6 Ay Trend" accent="#8b5cf6" />
            <Card>
              <TrendBarChart data={monthlyTrend} currency={soCur} />
              {monthlyTrend && monthlyTrend.length > 0 && (
                <div style={{ marginTop: 24, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Ay', 'Satış', 'Alım', 'Marj', 'Marj %'].map(h => (
                          <th key={h} style={{
                            textAlign: h === 'Ay' ? 'left' : 'right',
                            padding: '8px 12px', fontWeight: 700, fontSize: 10,
                            color: 'var(--clr-muted)', letterSpacing: '.06em',
                            textTransform: 'uppercase',
                            borderBottom: '2px solid var(--clr-border)'
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyTrend.map((m, i) => {
                        const marj = parseFloat(m.margin_value)||0
                        const so   = parseFloat(m.so_value)||0
                        const marjPct = so > 0 ? (marj / so * 100) : 0
                        const isCurrentMonth = m.month_label === currentMonthLabel
                        return (
                          <tr key={i} style={{
                            background: isCurrentMonth ? '#6366f108' : 'transparent',
                            borderBottom: '1px solid var(--clr-border)'
                          }}>
                            <td style={{
                              padding: '10px 12px', fontWeight: isCurrentMonth ? 800 : 600,
                              fontSize: 12,
                              color: isCurrentMonth ? '#6366f1' : 'var(--clr-text)'
                            }}>
                              {m.month_label}
                              {isCurrentMonth && (
                                <span style={{
                                  marginLeft: 8, fontSize: 10, fontWeight: 700,
                                  background: '#6366f1', color: '#fff',
                                  padding: '1px 7px', borderRadius: 20
                                }}>Bu Ay</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              {fmtMoney(m.so_value, soCur)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#2563eb', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              {fmtMoney(m.po_value, poCur)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                                         color: marj >= 0 ? '#059669' : '#dc2626' }}>
                              {marj >= 0 ? '+' : '−'}{fmtMoney(Math.abs(marj), soCur)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <span style={{
                                display: 'inline-block',
                                fontSize: 11, fontWeight: 700,
                                padding: '2px 8px', borderRadius: 20,
                                background: marjPct >= 0 ? '#dcfce7' : '#fee2e2',
                                color: marjPct >= 0 ? '#15803d' : '#b91c1c'
                              }}>
                                {marjPct >= 0 ? '+' : ''}{marjPct.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>

          {/* Top Customers + Suppliers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 24 }}>

            <section>
              <SectionHeader icon={<UsersIcon size={14} />} title="Top Müşteriler" accent="#3b82f6" />
              <Card noPad>
                {(!topCustomers || topCustomers.length === 0)
                  ? <EmptyCard message="Müşteri verisi yok" />
                  : topCustomers.map((r, i) => {
                    const maxV = parseFloat(topCustomers[0].total_value)||1
                    const barPct = ((parseFloat(r.total_value)||0) / maxV) * 100
                    return (
                      <div key={i}>
                        {i > 0 && <Divider />}
                        <RankRow
                          rank={i + 1}
                          name={r.customer_name}
                          sub={`${r.order_count} sipariş`}
                          value={fmtMoney(r.total_value, soCur)}
                          barPct={barPct}
                          rankColor="#1d4ed8" rankBg="#dbeafe"
                          barColor="#3b82f6"
                        />
                      </div>
                    )
                  })
                }
              </Card>
            </section>

            <section>
              <SectionHeader icon={<BuildingIcon size={14} />} title="Top Tedarikçiler" accent="#10b981" />
              <Card noPad>
                {(!topSuppliers || topSuppliers.length === 0)
                  ? <EmptyCard message="Tedarikçi verisi yok" />
                  : topSuppliers.map((r, i) => {
                    const maxV = parseFloat(topSuppliers[0].total_value)||1
                    const barPct = ((parseFloat(r.total_value)||0) / maxV) * 100
                    return (
                      <div key={i}>
                        {i > 0 && <Divider />}
                        <RankRow
                          rank={i + 1}
                          name={r.supplier_name}
                          sub={`${r.order_count} sipariş${r.avg_transit_days ? ` · Ort. ${parseFloat(r.avg_transit_days).toFixed(0)}g transit` : ''}`}
                          value={fmtMoney(r.total_value, poCur)}
                          barPct={barPct}
                          rankColor="#15803d" rankBg="#dcfce7"
                          barColor="#10b981"
                        />
                      </div>
                    )
                  })
                }
              </Card>
            </section>
          </div>

          {/* Top Products */}
          <section>
            <SectionHeader icon={<PackageIcon size={14} />} title="Top Ürünler" accent="#f59e0b" />
            <Card noPad>
              {(!topProducts || topProducts.length === 0)
                ? <EmptyCard message="Ürün verisi yok" />
                : topProducts.map((p, i) => {
                  const maxKg = parseFloat(topProducts[0].total_kg)||1
                  const barPct = ((parseFloat(p.total_kg)||0) / maxKg) * 100
                  return (
                    <div key={i}>
                      {i > 0 && <Divider />}
                      <RankRow
                        rank={i + 1}
                        name={p.product_name}
                        sub={`${p.order_count} kalem · ${fmtKg(p.total_kg)}`}
                        value={fmtMoney(p.total_value, soCur)}
                        barPct={barPct}
                        rankColor="#b45309" rankBg="#fef3c7"
                        barColor="#f59e0b"
                      />
                    </div>
                  )
                })
              }
            </Card>
          </section>
        </div>
      )}

      </div>
    </div>
    </>
  )
}
