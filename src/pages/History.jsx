import { useState } from 'react'
import { useBets } from '../hooks/useBets'
import { groupByPeriod, summarize, fmtCurrency } from '../utils/calculations'
import BetList from '../components/BetList'
import Layout from '../components/Layout'

const SPORTS = ['All', 'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'UFC/MMA', 'Tennis', 'Golf', 'Boxing', 'Other']
const PERIODS = ['day', 'week', 'month', 'all']

export default function History() {
  const { bets, loading, updateBet, deleteBet } = useBets()
  const [period, setPeriod] = useState('all')
  const [sport, setSport] = useState('All')

  const periodFiltered = groupByPeriod(bets, period)
  const filtered = sport === 'All' ? periodFiltered : periodFiltered.filter((b) => b.sport === sport)
  const stats = summarize(filtered)

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-gray-500">Loading...</div></Layout>

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">History</h1>
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-green-500 text-gray-950' : 'text-gray-400 hover:text-gray-100'}`}>
                {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {SPORTS.map((s) => (
            <button key={s} onClick={() => setSport(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${sport === s ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-3 text-center bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div>
            <p className={`font-bold ${stats.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtCurrency(stats.totalPL)}</p>
            <p className="text-xs text-gray-500">P&L</p>
          </div>
          <div>
            <p className="font-bold">{stats.settled}</p>
            <p className="text-xs text-gray-500">Settled</p>
          </div>
          <div>
            <p className="font-bold">{stats.winRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Win Rate</p>
          </div>
          <div>
            <p className="font-bold">{stats.roi.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">ROI</p>
          </div>
        </div>

        <BetList bets={filtered} onUpdate={updateBet} onDelete={deleteBet} />
      </div>
    </Layout>
  )
}
