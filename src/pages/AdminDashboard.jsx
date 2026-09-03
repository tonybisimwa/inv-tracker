import { usePlays } from '../hooks/usePlays'
import Layout from '../components/Layout'
import { Link } from 'react-router-dom'

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { plays, updatePlay, deletePlay } = usePlays()

  const total = plays.length
  const pending = plays.filter((p) => p.result === 'pending').length
  const wins = plays.filter((p) => p.result === 'win').length
  const losses = plays.filter((p) => p.result === 'loss').length
  const winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '—'

  const pendingPlays = plays.filter((p) => p.result === 'pending')

  function handleResult(id, result) {
    updatePlay(id, { result })
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Manage plays and track performance</p>
          </div>
          <Link to="/admin/publish" className="bg-green-500 hover:bg-green-400 text-black font-bold text-sm px-5 py-2 rounded-xl transition-colors">
            + New Play
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Plays" value={total} />
          <StatCard label="Win Rate" value={`${winRate}%`} color="text-green-400" />
          <StatCard label="Pending" value={pending} color="text-yellow-400" />
          <StatCard label="Record" value={`${wins}-${losses}`} />
        </div>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Pending Result Updates</h2>
          {pendingPlays.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-600">
              No pending plays — all results graded.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPlays.map((play) => (
                <div key={play.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{play.event}</p>
                    <p className="text-sm text-green-400">{play.line}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{play.sport} · {play.odds > 0 ? `+${play.odds}` : play.odds} · {play.units}u</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleResult(play.id, 'win')} className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition-colors">Win</button>
                    <button onClick={() => handleResult(play.id, 'loss')} className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">Loss</button>
                    <button onClick={() => handleResult(play.id, 'push')} className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-yellow-500/20 transition-colors">Push</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">All Plays</h2>
          {plays.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-600">No plays published yet.</div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs">
                    <th className="text-left px-5 py-3">Event</th>
                    <th className="text-left px-5 py-3">Sport</th>
                    <th className="text-left px-5 py-3">Tier</th>
                    <th className="text-left px-5 py-3">Result</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {plays.map((play, i) => (
                    <tr key={play.id} className={`border-b border-gray-800/50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-800/20'}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium truncate max-w-[180px]">{play.event}</p>
                        <p className="text-xs text-green-400">{play.line}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-400">{play.sport}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${play.tier === 'vip' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-400 bg-gray-800'}`}>
                          {play.tier === 'vip' ? 'VIP' : 'Free'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium ${play.result === 'win' ? 'text-green-400' : play.result === 'loss' ? 'text-red-400' : play.result === 'push' ? 'text-yellow-400' : 'text-gray-500'}`}>
                          {play.result}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => { if (window.confirm('Delete this play?')) deletePlay(play.id) }} className="text-gray-600 hover:text-red-400 text-xs transition-colors">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
