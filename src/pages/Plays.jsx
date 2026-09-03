import { Star, BookOpen } from 'lucide-react'
import { usePlays } from '../hooks/usePlays'
import PlayCard from '../components/PlayCard'
import Layout from '../components/Layout'

function Record({ plays }) {
  const settled = plays.filter((p) => p.result !== 'pending')
  const wins = settled.filter((p) => p.result === 'win').length
  const losses = settled.filter((p) => p.result === 'loss').length
  const pushes = settled.filter((p) => p.result === 'push').length
  const winRate = settled.length > 0 ? ((wins / settled.length) * 100).toFixed(1) : '—'
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">T</div>
        <div>
          <p className="font-bold">Tony B. — Tipster</p>
          <p className="text-xs text-gray-500">Verified track record · all-time</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div><p className="text-xl font-bold text-green-400">{wins}</p><p className="text-xs text-gray-500">Wins</p></div>
        <div><p className="text-xl font-bold text-red-400">{losses}</p><p className="text-xs text-gray-500">Losses</p></div>
        <div><p className="text-xl font-bold text-yellow-400">{pushes}</p><p className="text-xs text-gray-500">Pushes</p></div>
        <div><p className="text-xl font-bold">{winRate}%</p><p className="text-xs text-gray-500">Win Rate</p></div>
      </div>
    </div>
  )
}

export default function Plays() {
  const { plays, loading } = usePlays()

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-gray-500">Loading plays...</div></Layout>

  const freePlays = plays.filter((p) => p.tier === 'free')
  const vipPlays = plays.filter((p) => p.tier === 'vip')
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Today's Plays</h1>
          <p className="text-gray-500 text-sm mt-1">{today}</p>
        </div>

        <Record plays={plays} />

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Free Plays</h2>
          {freePlays.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-600">
              No free plays posted yet. Check back soon.
            </div>
          ) : (
            <div className="space-y-4">
              {freePlays.map((p) => <PlayCard key={p.id} play={p} />)}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">VIP Plays</h2>
            <span className="text-xs bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3 py-1 rounded-full">Coming Soon</span>
          </div>

          {vipPlays.length === 0 ? (
            <div className="bg-gray-900 border border-purple-500/20 rounded-2xl p-8 text-center space-y-3">
              <Star className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="font-semibold text-gray-200">VIP Membership Launching Soon</p>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">Get access to 5 daily plays, a 2-unit best bet, and a statistically-backed lottery parlay every day.</p>
              <div className="flex gap-2 justify-center pt-2 flex-wrap">
                <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full">Weekly · $9.99</span>
                <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full">Monthly · $29.99</span>
                <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full">Yearly · $199.99</span>
              </div>
              <button className="mt-2 bg-purple-500/20 border border-purple-500/40 text-purple-400 text-sm font-medium px-6 py-2 rounded-lg cursor-not-allowed opacity-70">
                Notify Me When Live
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {vipPlays.map((p) => <PlayCard key={p.id} play={p} locked={true} />)}
            </div>
          )}
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-gray-400" /> Betting Academy</h2>
            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">Coming Soon</span>
          </div>
          <p className="text-sm text-gray-500">Learn bankroll management, unit sizing, line shopping, and how to read sharp money movement.</p>
        </section>
      </div>
    </Layout>
  )
}
