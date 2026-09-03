import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { Star, Home, TrendingUp, PlusCircle, Clock, X } from 'lucide-react'
import { auth } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { useAdmin } from '../hooks/useAdmin'

const TOP_NAV = [
  { to: '/',        label: 'Dashboard' },
  { to: '/plays',   label: 'Plays' },
  { to: '/add',     label: 'Add Bet' },
  { to: '/history', label: 'History' },
]

const BOTTOM_NAV = [
  { to: '/',        label: 'Home',    Icon: Home },
  { to: '/plays',   label: 'Plays',   Icon: TrendingUp },
  { to: '/add',     label: 'Add',     Icon: PlusCircle, highlight: true },
  { to: '/history', label: 'History', Icon: Clock },
]

export default function Layout({ children }) {
  const { user } = useAuth()
  const { isAdmin, isVIP, username } = useAdmin()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ── Desktop header ── */}
      <header className="hidden md:flex border-b border-gray-800 px-6 py-4 items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold text-green-400">INV Tracker</span>
          <nav className="flex gap-6">
            {TOP_NAV.map((n) => (
              <Link key={n.to} to={n.to}
                className={`text-sm font-medium transition-colors ${pathname === n.to ? 'text-green-400' : 'text-gray-400 hover:text-gray-100'}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {!isVIP && !isAdmin && (
            <Link to="/vip" className="text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition-colors">
              Upgrade to VIP
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={`text-sm font-medium transition-colors ${pathname.startsWith('/admin') ? 'text-purple-400' : 'text-gray-500 hover:text-purple-400'}`}>
              Admin
            </Link>
          )}
          <div className="flex items-center gap-2">
            {isVIP && <Star className="w-3.5 h-3.5 text-purple-400" />}
            <span className="text-sm text-gray-400 font-mono">{username || user?.email}</span>
          </div>
          <button onClick={() => signOut(auth)} className="text-sm text-gray-400 hover:text-red-400 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      {/* ── Mobile header ── */}
      <header className="md:hidden sticky top-0 z-30 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-green-400">INV Tracker</span>
        <div className="flex items-center gap-3">
          {isVIP && <Star className="w-3.5 h-3.5 text-purple-400" />}
          <button onClick={() => setMenuOpen(true)} className="flex flex-col gap-1.5 p-1" aria-label="Menu">
            <span className="w-5 h-0.5 bg-gray-400 rounded block" />
            <span className="w-5 h-0.5 bg-gray-400 rounded block" />
            <span className="w-5 h-0.5 bg-gray-400 rounded block" />
          </button>
        </div>
      </header>

      {/* ── Mobile full-screen menu ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-gray-950 flex flex-col p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              {isVIP && <Star className="w-3.5 h-3.5 text-purple-400" />}
              <span className="font-mono text-sm text-gray-300">{username || user?.email}</span>
            </div>
            <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-gray-100">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            {TOP_NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)}
                className={`px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
                  pathname === n.to ? 'bg-green-500/10 text-green-400' : 'text-gray-300 hover:bg-gray-900'
                }`}>
                {n.label}
              </Link>
            ))}
            {!isVIP && !isAdmin && (
              <Link to="/vip" onClick={() => setMenuOpen(false)}
                className="px-4 py-3.5 rounded-xl text-base font-medium text-purple-400 bg-purple-500/10 mt-2">
                Upgrade to VIP
              </Link>
            )}
            {isAdmin && (
              <>
                <Link to="/admin" onClick={() => setMenuOpen(false)}
                  className="px-4 py-3.5 rounded-xl text-base font-medium text-purple-400 hover:bg-gray-900 transition-colors mt-2">
                  Admin Dashboard
                </Link>
                <Link to="/admin/vip" onClick={() => setMenuOpen(false)}
                  className="px-4 py-3.5 rounded-xl text-base font-medium text-purple-400 hover:bg-gray-900 transition-colors">
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

      {/* ── Page content ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-8">{children}</main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex items-center justify-around px-2 pb-safe pt-2 z-40">
        {BOTTOM_NAV.map(({ to, label, Icon, highlight }) => {
          const active = pathname === to
          return (
            <Link key={to} to={to}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-colors ${
                highlight
                  ? 'bg-green-500 text-gray-950'
                  : active
                    ? 'text-green-400'
                    : 'text-gray-500'
              }`}>
              <Icon className={highlight ? 'w-6 h-6' : 'w-5 h-5'} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
