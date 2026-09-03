import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { useAdmin } from '../hooks/useAdmin'

export default function Layout({ children }) {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
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
          {isAdmin && (
            <Link to="/admin" className={`text-sm font-medium transition-colors ${pathname.startsWith('/admin') ? 'text-purple-400' : 'text-gray-500 hover:text-purple-400'}`}>
              Admin
            </Link>
          )}
          <span className="text-sm text-gray-400">{user?.displayName || user?.email}</span>
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
