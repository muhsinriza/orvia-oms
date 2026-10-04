import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../lib/auth'
import {
  LayoutDashboard, ShoppingCart, TrendingUp, Users, Building2,
  Package, LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     roles: ['admin','accounting','purchasing','sales'] },
  { to: '/purchasing',    icon: ShoppingCart,    label: 'Satın Alma',    roles: ['admin','purchasing','accounting'] },
  { to: '/sales',         icon: TrendingUp,      label: 'Satış',         roles: ['admin','sales','accounting'] },
  { to: '/suppliers',     icon: Building2,       label: 'Tedarikçiler',  roles: ['admin','purchasing'] },
  { to: '/customers',     icon: Users,           label: 'Müşteriler',    roles: ['admin','sales'] },
  { to: '/products',      icon: Package,         label: 'Ürünler',       roles: ['admin'] },
]

const ROLE_LABELS = {
  admin:      'Yönetici',
  purchasing: 'Satın Alma',
  accounting: 'Muhasebe',
  sales:      'Satış',
  quality:    'Kalite Kontrol',
  field:      'Saha',
}

export default function Layout() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const role = user?.role || 'admin'
  const visibleNav = NAV.filter(n => n.roles.includes(role))

  async function handleLogout() {
    await logout().catch(() => {})
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobil overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">O</span>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 leading-none">Orvia OMS</div>
              <div className="text-[10px] text-gray-400 mt-0.5">v1.0</div>
            </div>
          </div>
          <button className="lg:hidden p-1 text-gray-400" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Kullanıcı */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-700 text-xs font-bold">
                {(user?.full_name || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user?.full_name || '—'}</div>
              <div className="text-xs text-gray-400">{ROLE_LABELS[role] || role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-ghost w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 text-xs">
            <LogOut size={14} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
          <button className="lg:hidden p-2 text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1" />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
