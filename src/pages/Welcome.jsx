import { useNavigate } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { TrendingUp, Trophy, BarChart2, Clock } from 'lucide-react'
import { auth, googleProvider } from '../firebase/config'

const features = [
  { Icon: TrendingUp, title: 'Daily P&L Tracking', desc: 'Log every bet and see your profit/loss by day, week, month, or all time.' },
  { Icon: Trophy, title: 'Win Rate by Sport', desc: 'See exactly which sports and bet types are making you money.' },
  { Icon: BarChart2, title: 'Bankroll Curve', desc: 'Visual equity curve showing your bankroll growth over time.' },
  { Icon: Clock, title: 'Pending Bets', desc: 'Track open bets and update outcomes when games settle.' },
]

export default function Welcome() {
  const navigate = useNavigate()

  async function handleGoogle() {
    try { await signInWithPopup(auth, googleProvider) }
    catch (e) { console.error(e) }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-green-400">INV Tracker</span>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-gray-400 hover:text-gray-100 transition-colors border border-gray-700 px-4 py-1.5 rounded-lg"
        >
          Sign In
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-block bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium px-3 py-1 rounded-full mb-6">
          Your personal betting journal
        </div>

        <h1 className="text-5xl font-bold leading-tight mb-4">
          Track your bets.<br />
          <span className="text-green-400">Know your edge.</span>
        </h1>

        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
          Stop guessing. INV Tracker gives you a full picture of your daily P&L,
          win rate, ROI, and bankroll — just like a trading journal, built for sports betting.
        </p>

        <div className="flex gap-4 justify-center mb-16">
          <button
            onClick={handleGoogle}
            className="flex items-center gap-3 bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Get Started with Google
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors font-semibold"
          >
            Sign in with Email
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          {features.map(({ Icon, title, desc }) => (
            <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="mb-3"><Icon className="w-6 h-6 text-green-400" /></div>
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
