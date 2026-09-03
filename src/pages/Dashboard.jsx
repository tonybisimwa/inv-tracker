import { useState } from 'react'
import { useBets } from '../hooks/useBets'
import { groupByPeriod, summarize, fmtCurrency } from '../utils/calculations'
import StatsCard from '../components/StatsCard'
import BankrollChart from '../components/BankrollChart'
import PLBarChart from '../components/PLBarChart'
import Layout from '../components/Layout'

const PERIODS = ['day', 'week', 'month', 'all']

export default function Dashboard() {
  const { bets, loading } = useBets()
  const [period, setPeriod] = useState('week')
  const filtered = groupByPeriod(bets, period)
  const stats = summarize(filtered)
  const allStats = summarize(bets)

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-gray-500">Loading...</div></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-green-500 text-gray-950' : 'text-gray-400 hover:text-gray-100'}`}>
                {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard label="P&L" value={fmtCurrency(stats.totalPL)} positive={stats.totalPL > 0 ? true : stats.totalPL < 0 ? false : undefined} />
          <StatsCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} sub={`${stats.wins}W - ${stats.losses}L - ${stats.pushes}P`} />
          <StatsCard label="ROI" value={`${stats.roi.toFixed(1)}%`} positive={stats.roi > 0 ? true : stats.roi < 0 ? false : undefined} />
          <StatsCard label="Pending" value={stats.pending} sub="open bets" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-400 mb-4">Bankroll Curve</h2>
            <BankrollChart bets={bets} />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-400 mb-4">Daily P&L (Last 30 Days)</h2>
            <PLBarChart bets={bets} />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-4">All-Time Summary</h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-green-400">{fmtCurrency(allStats.totalPL)}</p>
              <p className="text-xs text-gray-500 mt-1">Total P&L</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{allStats.settled}</p>
              <p className="text-xs text-gray-500 mt-1">Bets Settled</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{allStats.winRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1">Win Rate</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
