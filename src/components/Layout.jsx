import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { Star, Home, TrendingUp, PlusCircle, Clock, GraduationCap, Settings, X } from 'lucide-react'
import { auth } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { useAdmin } from '../hooks/useAdmin'
import { formatTimeLeft } from '../utils/entitlements'
import Logo from './Logo'

const TOP_NAV = [
  { to: '/',        label: 'Dashboard' },
  { to: '/plays',   label: 'Plays' },
  { to: '/add',     label: 'Add Bet' },
  { to: '/history', label: 'History' },
  { to: '/academy', label: 'Academy' },
]

// Academy used to be desktop-only — it was in TOP_NAV but not down here, so on
// a phone (where most of this app gets used) it was unreachable.
const BOTTOM_NAV = [
  { to: '/',        label: 'Home',    Icon: Home },
  { to: '/plays',   label: 'Plays',   Icon: TrendingUp },
  { to: '/add',     label: 'Add',     Icon: PlusCircle, highlight: true },
  { to: '/history', label: 'History', Icon: Clock },
  { to: '/academy', label: 'Learn',   Icon: GraduationCap },
]

export default function Layout({ children }) {
  const { user, trial } = useAuth()
  const { isAdmin, isVIP, username } = useAdmin()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Lock the page behind the sheet so the body doesn't scroll under a
  // full-screen overlay, and let Escape close it.
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const menuLink = (active) =>
    `px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
      active ? 'bg-green-500/10 text-green-400' : 'text-gray-300 hover:bg-gray-900'
    }`

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Lets keyboard users jump straight past the nav */}
      <a href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-green-500 focus:text-gray-950 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold">
        Skip to content
      </a>

      {/* ── Desktop header ── */}
      <header className="hidden md:flex sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-6 py-4 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="Statline home"><Logo size="md" /></Link>
          <nav aria-label="Main" className="flex gap-6">
            {TOP_NAV.map((n) => (
              <Link key={n.to} to={n.to} aria-current={pathname === n.to ? 'page' : undefined}
                className={`text-sm font-medium transition-colors ${pathname === n.to ? 'text-green-400' : 'text-gray-400 hover:text-gray-100'}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {/* Points at the comparison, not straight at checkout: someone who
              doesn't yet know what VIP includes isn't ready to pay for it. */}
          {!isVIP && !isAdmin && (
            <Link to="/pricing" className="text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition-colors">
              {trial?.eligible ? 'Try VIP free' : 'Upgrade to VIP'}
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={`text-sm font-medium transition-colors ${pathname.startsWith('/admin') ? 'text-purple-400' : 'text-gray-500 hover:text-purple-400'}`}>
              Admin
            </Link>
          )}
          <div className="flex items-center gap-2">
            {isVIP && <Star className="w-3.5 h-3.5 text-purple-400" aria-label="VIP" />}
            <span className="text-sm text-gray-400 font-mono">{username || user?.email}</span>
          </div>
          <Link to="/settings" aria-label="Settings"
            className={`p-1.5 rounded-lg transition-colors ${pathname === '/settings' ? 'text-green-400' : 'text-gray-500 hover:text-gray-100 hover:bg-gray-900'}`}>
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Link>
          <button onClick={() => signOut(auth)} className="text-sm text-gray-400 hover:text-red-400 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      {/* ── Mobile header ── */}
      <header className="md:hidden sticky top-0 z-30 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between pt-safe">
        <Link to="/" aria-label="Statline home"><Logo size="sm" /></Link>
        <div className="flex items-center gap-3">
          {isVIP && <Star className="w-3.5 h-3.5 text-purple-400" aria-label="VIP" />}
          <button onClick={() => setMenuOpen(true)} className="flex flex-col gap-1.5 p-1"
            aria-label="Open menu" aria-expanded={menuOpen}>
            <span className="w-5 h-0.5 bg-gray-400 rounded block" />
            <span className="w-5 h-0.5 bg-gray-400 rounded block" />
            <span className="w-5 h-0.5 bg-gray-400 rounded block" />
          </button>
        </div>
      </header>

      {/* ── Mobile full-screen menu ── */}
      {menuOpen && (
        <div role="dialog" aria-modal="true" aria-label="Menu"
          className="md:hidden fixed inset-0 z-50 bg-gray-950 flex flex-col p-6 pt-safe overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 min-w-0">
              {isVIP && <Star className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" aria-hidden="true" />}
              <span className="font-mono text-sm text-gray-300 truncate">{username || user?.email}</span>
            </div>
            <button onClick={closeMenu} aria-label="Close menu" className="text-gray-400 hover:text-gray-100 p-1">
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Main" className="flex flex-col gap-1 flex-1">
            {TOP_NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={closeMenu} aria-current={pathname === n.to ? 'page' : undefined} className={menuLink(pathname === n.to)}>
                {n.label}
              </Link>
            ))}
            <Link to="/settings" onClick={closeMenu} className={menuLink(pathname === '/settings')}>Settings</Link>

            {!isVIP && !isAdmin && (
              <Link to="/pricing" onClick={closeMenu} className="px-4 py-3.5 rounded-xl text-base font-medium text-purple-400 bg-purple-500/10 mt-2">
                {trial?.eligible ? 'Try VIP free for a day' : 'Upgrade to VIP'}
              </Link>
            )}
            {isAdmin && (
              <>
                <Link to="/admin" onClick={closeMenu} className="px-4 py-3.5 rounded-xl text-base font-medium text-purple-400 hover:bg-gray-900 transition-colors mt-2">
                  Admin Dashboard
                </Link>
                <Link to="/admin/vip" onClick={closeMenu} className="px-4 py-3.5 rounded-xl text-base font-medium text-purple-400 hover:bg-gray-900 transition-colors">
                  VIP Management
                </Link>
              </>
            )}
          </nav>

          <button onClick={() => signOut(auth)} className="mt-4 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left">
            Sign out
          </button>
        </div>
      )}

      {/* ── Trial countdown ──
          A trial that expires silently feels like access being taken away. A
          visible clock makes the ending expected, and gives the decision to
          subscribe somewhere to live before the access disappears. */}
      {trial?.active && (
        <div className="bg-purple-500/10 border-b border-purple-500/25 px-4 md:px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <p className="text-xs text-purple-200 flex items-center gap-2 min-w-0">
              <Star className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">VIP trial · {formatTimeLeft(trial.msLeft)}</span>
            </p>
            <Link to="/pricing" className="text-xs font-semibold text-purple-300 hover:text-purple-100 whitespace-nowrap transition-colors">
              Keep it →
            </Link>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <main id="main" className="max-w-7xl mx-auto px-4 md:px-6 py-6">{children}</main>

      {/* ── Footer ──
          The age notice and the terms have to be reachable from anywhere in the
          app: Stripe's review checks for it and the app stores require it. */}
      <footer className="max-w-7xl mx-auto px-4 md:px-6 pb-28 md:pb-8 pt-2">
        <div className="border-t border-gray-900 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-[11px] text-gray-600">
            18+ (21+ where required) · Not financial advice ·{' '}
            <a href="tel:1-800-522-4700" className="underline hover:text-gray-400">1-800-GAMBLER</a>
          </p>
          <div className="flex gap-4 text-[11px] text-gray-600">
            <Link to="/pricing" className="hover:text-gray-400 transition-colors">Plans</Link>
            <Link to="/legal" className="hover:text-gray-400 transition-colors">Terms &amp; Privacy</Link>
          </div>
        </div>
      </footer>

      {/* ── Mobile bottom nav ── */}
      <nav aria-label="Main" className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex items-stretch justify-around px-1 pb-safe pt-2 z-40">
        {BOTTOM_NAV.map(({ to, label, Icon, highlight }) => {
          const active = pathname === to
          return (
            <Link key={to} to={to} aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition-colors ${
                highlight ? 'bg-green-500 text-gray-950 mx-1' : active ? 'text-green-400' : 'text-gray-500'
              }`}>
              <Icon className={highlight ? 'w-6 h-6' : 'w-5 h-5'} aria-hidden="true" />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
