import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

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
  if (s === 'in_transit')              return '#2563eb'
  if (s === 'arrived')                 return '#d97706'
  if (s === 'confirmed')               return '#16a34a'
  if (s === 'completed' || s === 'delivered') return '#6b7280'
  return '#6b7280'
}

function transportIcon(mode) {
  if (!mode) return '📦'
  const m = mode.toLowerCase()
  if (m.includes('air') || m.includes('hava')) return '✈️'
  if (m.includes('road') || m.includes('truck') || m.includes('kara')) return '🚛'
  return '🚢'
}

function etaUrgency(days) {
  if (days <= 1) return { color: '#dc2626', bg: '#fef2f2', label: days <= 0 ? 'Bugün' : 'Yarın' }
  if (days <= 3) return { color: '#d97706', bg: '#fffbeb', label: `${days} gün` }
  return             { color: '#2563eb',  bg: '#eff6ff',  label: `${days} gün` }
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ data, currency = 'USD' }) {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--clr-muted)', fontSize: 13, margin: 0 }}>Veri yok</p>
  }
  const sym  = (currency || 'USD').toUpperCase() === 'EUR' ? '€' : '$'
  const maxV = Math.max(...data.map(d =>
    Math.max(parseFloat(d.so_value)||0, parseFloat(d.po_value)||0)
  ))
  if (maxV === 0) return <p style={{ color: 'var(--clr-muted)', fontSize: 13, margin: 0 }}>Veri yok</p>

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--clr-muted)', marginBottom: 10, flexWrap: 'wrap' }}>
        {[['#16a34a','Satış'],['#2563eb','Alım'],['#7c3aed','Marj']].map(([c,l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
        {data.map((d, i) => {
          const soH  = ((parseFloat(d.so_value)||0)  / maxV) * 100
          const poH  = ((parseFloat(d.po_value)||0)  / maxV) * 100
          const marj = parseFloat(d.margin_value)||0
          const marH = (Math.abs(marj) / maxV) * 100
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: 1, height: 96 }}>
                {[
                  { h: soH,  c: '#16a34a', t: `Satış: ${sym}${(parseFloat(d.so_value)||0).toFixed(0)}` },
                  { h: poH,  c: '#2563eb', t: `Alım: ${sym}${(parseFloat(d.po_value)||0).toFixed(0)}` },
                  { h: marH, c: marj >= 0 ? '#7c3aed' : '#dc2626',
                    t: `Marj: ${marj >= 0 ? '' : '−'}${sym}${Math.abs(marj).toFixed(0)}` }
                ].map((bar, j) => (
                  <div key={j} title={bar.t}
                    style={{ flex: 1, background: bar.c, opacity: .82,
                             borderRadius: '3px 3px 0 0',
                             height: `${bar.h}%`, minHeight: bar.h > 0 ? 2 : 0 }} />
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--clr-muted)', whiteSpace: 'nowrap' }}>{d.month_label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--clr-border)',
                    borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ color: 'var(--clr-muted)', fontSize: 14 }}>Yükleniyor…</div>
    </div>
  )

  if (error) return (
    <div style={{ padding: 32, color: '#dc2626', fontSize: 14 }}>❌ {error}</div>
  )

  const {
    stats, financial: fin, recent, shipments, topProducts,
    etaAlerts, topCustomers, topSuppliers, monthlyTrend
  } = data

  const soCur  = fin.so_currency || 'USD'
  const poCur  = fin.po_currency || 'USD'
  const soThis = parseFloat(fin.so_value_this_month) || 0
  const poThis = parseFloat(fin.po_value_this_month) || 0
  const marginAbs = soThis - poThis
  const marginPct = soThis > 0 ? (marginAbs / soThis * 100) : 0
  const soMoM  = momPct(fin.so_value_this_month, fin.so_value_last_month)
  const poMoM  = momPct(fin.po_value_this_month, fin.po_value_last_month)

  const tabs = [
    { key: 'overview',  label: '📊 Özet' },
    { key: 'shipments', label: '🚢 Sevkiyat' },
    { key: 'analytics', label: '📈 Analitik' }
  ]

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '20px 16px 48px' }}>

      {/* ── Başlık ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Kontrol Paneli</h1>
          <div style={{ fontSize: 12, color: 'var(--clr-muted)', marginTop: 2 }}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--clr-border)', borderRadius: 10, padding: 3 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all .15s',
                background: tab === t.key ? 'var(--clr-surface)' : 'transparent',
                color: tab === t.key ? 'var(--clr-text)' : 'var(--clr-muted)',
                boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,.1)' : 'none'
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ══════════════════ ÖZET ══════════════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* ETA Uyarıları */}
          {etaAlerts && etaAlerts.length > 0 && (
            <section>
              <SectionTitle>🚨 ETA Uyarıları — {etaAlerts.length} sevkiyat bu hafta</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {etaAlerts.map(a => {
                  const days = parseInt(a.days_until_eta) ?? 0
                  const urg  = etaUrgency(days)
                  return (
                    <div key={`eta-${a.type}-${a.id}`}
                      style={{
                        background: 'var(--clr-surface)', borderRadius: 12,
                        border: `1px solid ${urg.color}30`,
                        borderLeft: `4px solid ${urg.color}`,
                        padding: '12px 16px', display: 'flex', gap: 12,
                        alignItems: 'center', flexWrap: 'wrap'
                      }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{transportIcon(a.transport_mode)}</span>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {a.party_name || '—'} · {a.product_name || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--clr-muted)', marginTop: 2 }}>
                          {a.type === 'purchase' ? '📥 Alım' : '📤 Satış'} · {a.party_no}
                          {a.container_number ? ` · 📦 ${a.container_number}` : ''}
                          {a.vessel_name ? ` · ${a.vessel_name}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontWeight: 800, fontSize: 14, color: urg.color,
                          background: urg.bg, padding: '4px 12px', borderRadius: 20, display: 'inline-block'
                        }}>
                          ETA {urg.label}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--clr-muted)', marginTop: 2 }}>
                          {fmtDate(a.eta)}
                        </div>
                      </div>
                      <Link
                        to={`/${a.type === 'purchase' ? 'purchase-orders' : 'sales-orders'}/${a.id}`}
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          background: urg.color, color: '#fff',
                          textDecoration: 'none', fontSize: 12, fontWeight: 600, flexShrink: 0
                        }}>
                        Görüntüle →
                      </Link>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* KPI Row 1 — Finansal */}
          <section>
            <SectionTitle>💰 Bu Ay Finansal</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 12 }}>
              <KpiCard label="Satış Bu Ay"   value={fmtMoney(fin.so_value_this_month, soCur)}
                sub={`Geçen ay: ${fmtMoney(fin.so_value_last_month, soCur)}`}
                badge={<MoMBadge val={soMoM} />} icon="💰" accent="#16a34a" accentBg="#f0fdf4" />

              <KpiCard label="Alım Bu Ay"    value={fmtMoney(fin.po_value_this_month, poCur)}
                sub={`Geçen ay: ${fmtMoney(fin.po_value_last_month, poCur)}`}
                badge={<MoMBadge val={poMoM} />} icon="🛒" accent="#2563eb" accentBg="#eff6ff" />

              <KpiCard label="Tahmini Marj"
                value={`${marginPct.toFixed(1)}%`}
                sub={`${marginAbs >= 0 ? '+' : ''}${fmtMoney(marginAbs, soCur)}`}
                icon="📊" accent="#7c3aed" accentBg="#f5f3ff"
                highlight={marginPct > 0} />

              <KpiCard label="Ort. Sipariş"  value={fmtMoney(fin.so_avg_order_this_month, soCur)}
                sub="Bu ay satış ortalaması" icon="📦" accent="#d97706" accentBg="#fffbeb" />

              <KpiCard label="Pipeline (Satış)" value={fmtMoney(fin.so_pipeline_value, soCur)}
                sub="Aktif & onaylı" icon="⏳" accent="#16a34a" accentBg="#f0fdf4" />

              <KpiCard label="Pipeline (Alım)"  value={fmtMoney(fin.po_pipeline_value, poCur)}
                sub="Aktif & onaylı" icon="⏳" accent="#2563eb" accentBg="#eff6ff" />
            </div>
          </section>

          {/* Operasyonel */}
          <section>
            <SectionTitle>📋 Operasyonel</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10 }}>
              <StatChip icon="🚢" label="Transit"    value={parseInt(stats.in_transit)||0}  color="#2563eb" />
              <StatChip icon="📤" label="Aktif SO"   value={parseInt(stats.so_active)||0}   color="#16a34a" />
              <StatChip icon="📥" label="Aktif PO"   value={parseInt(stats.po_active)||0}   color="#2563eb" />
              <StatChip icon="🏁" label="Tamamlandı" value={parseInt(stats.completed)||0}   color="#6b7280" />
              <StatChip icon="⚖️" label="SO kg YTD" value={fmtKg(fin.so_kg_ytd)}           color="#16a34a" small />
              <StatChip icon="⚖️" label="PO kg YTD" value={fmtKg(fin.po_kg_ytd)}           color="#2563eb" small />
            </div>
          </section>

          {/* Son İşlemler */}
          <section>
            <SectionTitle>🕐 Son İşlemler</SectionTitle>
            <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
                          borderRadius: 14, overflow: 'hidden' }}>
              {(!recent || recent.length === 0)
                ? <EmptyState>Henüz işlem yok</EmptyState>
                : recent.map((r, i) => (
                  <div key={`rec-${r.type}-${r.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 16px', flexWrap: 'wrap',
                      borderBottom: i < recent.length - 1 ? '1px solid var(--clr-border)' : 'none'
                    }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                      {r.type === 'purchase' ? '📥' : '📤'}
                    </span>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {r.party_name || '—'} · {r.product_name || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--clr-muted)', marginTop: 1 }}>
                        {r.party_no} · {fmtDate(r.created_at)}
                        {r.eta ? ` · ETA ${fmtDate(r.eta)}` : ''}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: 'var(--clr-border)', color: statusColor(r.status)
                    }}>
                      {statusLabel(r.status)}
                    </span>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {fmtMoney(parseFloat(r.quantity_kg||0) * parseFloat(r.price_per_unit||0), r.currency)}
                    </div>
                    <Link to={`/${r.type === 'purchase' ? 'purchase-orders' : 'sales-orders'}/${r.id}`}
                      style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                      Detay →
                    </Link>
                  </div>
                ))
              }
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════ SEVKİYAT ══════════════════ */}
      {tab === 'shipments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(!shipments || shipments.length === 0)
            ? <EmptyState>Aktif sevkiyat yok</EmptyState>
            : shipments.map(s => {
              const now      = new Date()
              const etdDate  = s.etd ? new Date(s.etd) : null
              const etaDate  = s.eta ? new Date(s.eta) : null
              let progress = 0
              if (etdDate && etaDate && etaDate > etdDate) {
                progress = Math.min(100, Math.max(0,
                  ((now - etdDate) / (etaDate - etdDate)) * 100
                ))
              }
              const daysLeft = etaDate ? Math.ceil((etaDate - now) / 86400000) : null
              const isLate   = daysLeft !== null && daysLeft < 0
              const barColor = isLate ? '#dc2626'
                             : daysLeft <= 3 ? '#d97706'
                             : '#2563eb'

              return (
                <div key={`shp-${s.type}-${s.id}`}
                  style={{
                    background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
                    borderRadius: 16, padding: '16px 18px',
                    borderLeft: `4px solid ${barColor}`
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, display: 'flex',
                                    alignItems: 'center', gap: 8 }}>
                        <span>{transportIcon(s.transport_mode)}</span>
                        <span>{s.party_name || '—'}</span>
                        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--clr-muted)' }}>
                          ({s.type === 'purchase' ? 'Alım' : 'Satış'})
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--clr-muted)', marginTop: 4 }}>
                        {s.product_name || '—'} · {s.party_no}
                        {s.container_number ? ` · 📦 ${s.container_number}` : ''}
                        {s.vessel_name      ? ` · 🚢 ${s.vessel_name}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                        background: isLate ? '#fef2f2' : 'var(--clr-border)',
                        color: isLate ? '#dc2626' : statusColor(s.status)
                      }}>
                        {isLate ? `⚠️ ${Math.abs(daysLeft)}g gecikmiş` : statusLabel(s.status)}
                      </span>
                      <Link to={`/${s.type === 'purchase' ? 'purchase-orders' : 'sales-orders'}/${s.id}`}
                        style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                        Detay →
                      </Link>
                    </div>
                  </div>

                  {etdDate && etaDate && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                                    fontSize: 11, color: 'var(--clr-muted)', marginBottom: 5 }}>
                        <span>ETD {fmtDate(s.etd)}</span>
                        <span style={{ fontWeight: 600, color: isLate ? '#dc2626' : 'var(--clr-text)' }}>
                          {daysLeft === null ? '' :
                           daysLeft < 0  ? `${Math.abs(daysLeft)}g gecikmiş` :
                           daysLeft === 0 ? 'Bugün' :
                           `${daysLeft}g kaldı`}
                        </span>
                        <span>ETA {fmtDate(s.eta)}</span>
                      </div>
                      <div style={{ background: 'var(--clr-border)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99, width: `${progress}%`,
                          background: barColor, transition: 'width .5s'
                        }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 16, marginTop: 10,
                                fontSize: 12, color: 'var(--clr-muted)', flexWrap: 'wrap' }}>
                    <span>⚖️ {fmtKg(s.quantity_kg)}</span>
                    <span>💰 {fmtMoney(
                      parseFloat(s.quantity_kg||0) * parseFloat(s.price_per_unit||0), s.currency
                    )}</span>
                    {s.transport_mode && <span>{transportIcon(s.transport_mode)} {s.transport_mode}</span>}
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* ══════════════════ ANALİTİK ══════════════════ */}
      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Aylık Trend */}
          <section>
            <SectionTitle>📈 Son 6 Ay Trend</SectionTitle>
            <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
                          borderRadius: 14, padding: '18px 18px' }}>
              <BarChart data={monthlyTrend} currency={soCur} />
              {monthlyTrend && monthlyTrend.length > 0 && (
                <div style={{ marginTop: 16, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Ay','Satış','Alım','Marj'].map(h => (
                          <th key={h} style={{
                            textAlign: h === 'Ay' ? 'left' : 'right',
                            padding: '4px 8px', fontWeight: 600, color: 'var(--clr-muted)'
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyTrend.map((m, i) => {
                        const marj = parseFloat(m.margin_value)||0
                        return (
                          <tr key={i} style={{ borderTop: '1px solid var(--clr-border)' }}>
                            <td style={{ padding: '5px 8px', fontWeight: 600 }}>{m.month_label}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', color: '#16a34a' }}>
                              {fmtMoney(m.so_value, soCur)}
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', color: '#2563eb' }}>
                              {fmtMoney(m.po_value, poCur)}
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700,
                                         color: marj >= 0 ? '#16a34a' : '#dc2626' }}>
                              {marj >= 0 ? '+' : '−'}{fmtMoney(Math.abs(marj), soCur)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Müşteri + Tedarikçi */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <RankList
              title="👥 Bu Ay Top Müşteriler"
              rows={topCustomers}
              nameKey="customer_name"
              valueKey="total_value"
              countKey="order_count"
              currency={soCur}
              barColor="#16a34a"
              emptyMsg="Müşteri verisi yok"
            />
            <RankList
              title="🏭 Bu Ay Top Tedarikçiler"
              rows={topSuppliers}
              nameKey="supplier_name"
              valueKey="total_value"
              countKey="order_count"
              currency={poCur}
              barColor="#2563eb"
              emptyMsg="Tedarikçi verisi yok"
              extra={s => s.avg_transit_days
                ? ` · Ort. transit ${parseFloat(s.avg_transit_days).toFixed(0)}g`
                : ''}
            />
          </div>

          {/* Top Ürünler */}
          <section>
            <SectionTitle>🍊 Bu Ay Top Ürünler</SectionTitle>
            <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
                          borderRadius: 14, overflow: 'hidden' }}>
              {(!topProducts || topProducts.length === 0)
                ? <EmptyState>Ürün verisi yok</EmptyState>
                : topProducts.map((p, i) => {
                  const maxKg = parseFloat(topProducts[0].total_kg)||1
                  const w = ((parseFloat(p.total_kg)||0) / maxKg) * 100
                  return (
                    <div key={i} style={{
                      padding: '12px 16px',
                      borderBottom: i < topProducts.length - 1 ? '1px solid var(--clr-border)' : 'none'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', marginBottom: 5 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.product_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--clr-muted)' }}>
                            {p.order_count} kalem · {fmtKg(p.total_kg)}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {fmtMoney(p.total_value, soCur)}
                        </div>
                      </div>
                      <div style={{ background: 'var(--clr-border)', borderRadius: 99, height: 4 }}>
                        <div style={{ width: `${w}%`, height: '100%', borderRadius: 99,
                                      background: '#d97706' }} />
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

// ─── Alt Bileşenler ───────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
      color: 'var(--clr-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8
    }}>
      {children}
      <div style={{ flex: 1, height: 1, background: 'var(--clr-border)' }} />
    </div>
  )
}

function KpiCard({ label, value, sub, badge, icon, accent, accentBg, highlight }) {
  return (
    <div style={{
      background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
      borderRadius: 14, padding: '14px 16px',
      borderTop: highlight ? `3px solid ${accent}` : undefined
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--clr-muted)' }}>{label}</div>
        <div style={{ fontSize: 18, width: 32, height: 32, borderRadius: 8, background: accentBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1, marginBottom: 5 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
      fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 20,
      background: pos ? '#f0fdf4' : '#fef2f2',
      color: pos ? '#16a34a' : '#dc2626'
    }}>
      {pos ? '↑' : '↓'} {Math.abs(val).toFixed(1)}%
    </span>
  )
}

function StatChip({ icon, label, value, color, small }) {
  return (
    <div style={{
      background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
      borderRadius: 12, padding: '11px 14px', display: 'flex', flexDirection: 'column', gap: 4
    }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: small ? '1rem' : '1.15rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--clr-muted)' }}>{label}</div>
    </div>
  )
}

function EmptyState({ children }) {
  return (
    <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--clr-muted)', fontSize: 13 }}>
      {children}
    </div>
  )
}

function RankList({ title, rows, nameKey, valueKey, countKey, currency, barColor, emptyMsg, extra }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
                    borderRadius: 14, overflow: 'hidden' }}>
        {(!rows || rows.length === 0)
          ? <EmptyState>{emptyMsg}</EmptyState>
          : rows.map((r, i) => {
            const maxV = parseFloat(rows[0][valueKey])||1
            const w    = ((parseFloat(r[valueKey])||0) / maxV) * 100
            return (
              <div key={i} style={{
                padding: '11px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--clr-border)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', marginBottom: 5 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r[nameKey]}</div>
                    <div style={{ fontSize: 11, color: 'var(--clr-muted)' }}>
                      {r[countKey]} sipariş{extra ? extra(r) : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {fmtMoney(r[valueKey], currency)}
                  </div>
                </div>
                <div style={{ background: 'var(--clr-border)', borderRadius: 99, height: 4 }}>
                  <div style={{ width: `${w}%`, height: '100%', borderRadius: 99, background: barColor }} />
                </div>
              </div>
            )
          })
        }
      </div>
    </section>
  )
}
