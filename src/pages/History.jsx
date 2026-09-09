import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useBets } from '../hooks/useBets'
import { useAuth } from '../contexts/AuthContext'
import { groupByPeriod, summarize, fmtCurrency, fmtUnits } from '../utils/calculations'
import BetList from '../components/BetList'
import Layout from '../components/Layout'
import { SkeletonRows } from '../components/Skeleton'

const SPORTS = ['All', 'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'UFC/MMA', 'Tennis', 'Golf', 'Boxing', 'Other']
const PERIODS = ['day', 'week', 'month', 'all']
const OUTCOMES = ['All', 'pending', 'win', 'loss', 'push']
const SORTS = [
  { key: 'date-desc',  label: 'Newest',       cmp: (a, b) => new Date(b.date) - new Date(a.date) },
  { key: 'date-asc',   label: 'Oldest',       cmp: (a, b) => new Date(a.date) - new Date(b.date) },
  { key: 'pl-desc',    label: 'Biggest win',  cmp: (a, b) => b.pl - a.pl },
  { key: 'pl-asc',     label: 'Biggest loss', cmp: (a, b) => a.pl - b.pl },
  { key: 'stake-desc', label: 'Largest stake',cmp: (a, b) => b.stake - a.stake },
]

export default function History() {
  const { bets, loading, updateBet, deleteBet } = useBets()
  const { unitSize } = useAuth()
  const [period, setPeriod]   = useState('all')
  const [sport, setSport]     = useState('All')
  const [outcome, setOutcome] = useState('All')
  const [sortKey, setSortKey] = useState('date-desc')
  const [q, setQ]             = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const cmp = (SORTS.find((s) => s.key === sortKey) ?? SORTS[0]).cmp
    return groupByPeriod(bets, period)
      .filter((b) => sport === 'All' || b.sport === sport)
      .filter((b) => outcome === 'All' || b.outcome === outcome)
      .filter((b) => !needle || `${b.event} ${b.sport} ${b.betType} ${b.book ?? ''}`.toLowerCase().includes(needle))
      .sort(cmp)
  }, [bets, period, sport, outcome, sortKey, q])

  const stats = useMemo(() => summarize(filtered), [filtered])
  const activeFilters = (sport !== 'All') + (outcome !== 'All') + (period !== 'all') + (q.trim() !== '')

  function clearFilters() {
    setPeriod('all'); setSport('All'); setOutcome('All'); setQ('')
  }

  if (loading) return (
    <Layout>
      <div className="space-y-5">
        <div className="h-8 w-32 shimmer bg-gray-800/70 rounded" />
        <div className="h-11 w-full shimmer bg-gray-800/70 rounded-xl" />
        <div className="h-20 w-full shimmer bg-gray-800/70 rounded-xl" />
        <SkeletonRows count={6} />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl md:text-2xl font-bold">History</h1>
          <div role="tablist" aria-label="Time period" className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {PERIODS.map((p) => (
              <button key={p} role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  period === p ? 'bg-green-500 text-gray-950' : 'text-gray-400 hover:text-gray-100'
                }`}>
                {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search + sort ── a journal you can't search isn't much of a journal */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events, sports, bet types..."
              aria-label="Search bets"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:border-green-500 transition-colors"
            />
            {q && (
              <button onClick={() => setQ('')} aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200 transition-colors">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <label className="sr-only" htmlFor="sort">Sort bets</label>
          <select
            id="sort" value={sortKey} onChange={(e) => setSortKey(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:border-green-500 transition-colors"
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {/* ── Outcome + sport chips ── */}
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {OUTCOMES.map((o) => (
              <button key={o} onClick={() => setOutcome(o)} aria-pressed={outcome === o}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors border ${
                  outcome === o ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-gray-800 text-gray-500 hover:border-gray-600'
                }`}>
                {o === 'All' ? 'All results' : o}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1">
            {SPORTS.map((s) => (
              <button key={s} onClick={() => setSport(s)} aria-pressed={sport === s}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors border ${
                  sport === s ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-gray-800 text-gray-500 hover:border-gray-600'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Stats for the current filter ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div>
            <p className={`font-bold tabular ${stats.totalPL > 0 ? 'text-green-400' : stats.totalPL < 0 ? 'text-red-400' : 'text-gray-100'}`}>
              {fmtCurrency(stats.totalPL)}
            </p>
            <p className="text-xs text-gray-500">
              P&amp;L{fmtUnits(stats.totalPL, unitSize) && ` · ${fmtUnits(stats.totalPL, unitSize)}`}
            </p>
          </div>
          <div>
            <p className="font-bold tabular">{stats.settled}</p>
            <p className="text-xs text-gray-500">Settled{stats.pending > 0 && ` · ${stats.pending} open`}</p>
          </div>
          <div>
            <p className="font-bold tabular">{stats.winRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Win Rate</p>
          </div>
          <div>
            <p className={`font-bold tabular ${stats.roi > 0 ? 'text-green-400' : stats.roi < 0 ? 'text-red-400' : 'text-gray-100'}`}>
              {stats.roi.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">ROI</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500 tabular">
            Showing {filtered.length} of {bets.length} bets
          </p>
          {activeFilters > 0 && (
            <button onClick={clearFilters} className="text-xs font-medium text-green-400 hover:text-green-300 transition-colors">
              Clear filters
            </button>
          )}
        </div>

        <BetList
          bets={filtered}
          onUpdate={updateBet}
          onDelete={deleteBet}
          unitSize={unitSize}
          emptyMessage={activeFilters > 0 ? 'No bets match these filters.' : 'No bets logged yet.'}
        />
      </div>
    </Layout>
  )
}
