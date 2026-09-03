import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { Star } from 'lucide-react'
import { auth } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { useAdmin } from '../hooks/useAdmin'

export default function Layout({ children }) {
  const { user } = useAuth()
  const { isAdmin, isVIP, username } = useAdmin()
  const { pathname } = useLocation()

  const nav = [
    { to: '/', label: 'Dashboard' },
    { to: '/plays', label: 'Plays' },
    { to: '/add', label: 'Add Bet' },
    { to: '/history', label: 'History' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold text-green-400">INV Tracker</span>
          <nav className="flex gap-6">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`text-sm font-medium transition-colors ${pathname === n.to ? 'text-green-400' : 'text-gray-400 hover:text-gray-100'}`}
              >
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
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
