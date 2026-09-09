import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart2, Flame, Snowflake, Settings as SettingsIcon, TrendingDown, Trophy } from 'lucide-react'
import { useBets } from '../hooks/useBets'
import { useAuth } from '../contexts/AuthContext'
import {
  groupByPeriod, summarize, fmtCurrency, fmtUnits,
  currentStreak, breakdownBy, biggestSwing, buildBankrollSeries, maxDrawdown,
} from '../utils/calculations'
import StatsCard from '../components/StatsCard'
import BankrollChart from '../components/BankrollChart'
import PLBarChart from '../components/PLBarChart'
import BetList from '../components/BetList'
import Layout from '../components/Layout'
import { SkeletonStatCards, SkeletonChart, SkeletonRows } from '../components/Skeleton'

const PERIODS = ['day', 'week', 'month', 'all']
const PERIOD_LABEL = { day: 'today', week: 'this week', month: 'this month', all: 'all time' }

export default function Dashboard() {
  const { bets, loading, updateBet, deleteBet } = useBets()
  const { bankroll, unitSize } = useAuth()
  const [period, setPeriod] = useState('week')
  const [timedOut, setTimedOut] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => setTimedOut(true), 5000)
    return () => clearTimeout(t)
  }, [loading])

  const filtered = useMemo(() => groupByPeriod(bets, period), [bets, period])
  const stats = useMemo(() => summarize(filtered), [filtered])
  const allStats = useMemo(() => summarize(bets), [bets])

  const pending = useMemo(
    () => bets.filter((b) => b.outcome === 'pending').sort((a, b) => new Date(a.date) - new Date(b.date)),
    [bets],
  )
  const streak = useMemo(() => currentStreak(bets), [bets])
  const bySport = useMemo(() => breakdownBy(bets, 'sport'), [bets])
  const byType = useMemo(() => breakdownBy(bets, 'betType'), [bets])
  const swing = useMemo(() => biggestSwing(bets), [bets])
  const drawdown = useMemo(
    () => maxDrawdown(buildBankrollSeries(bets, bankroll ?? 0)),
    [bets, bankroll],
  )

  // ── Loading: shapes, not the word "Loading" ──
  if (loading && !timedOut) return (
    <Layout>
      <div className="space-y-6">
        <div className="h-7 w-40 shimmer bg-gray-800/70 rounded" />
        <SkeletonStatCards count={4} />
        <div className="grid md:grid-cols-2 gap-6">
          <SkeletonChart label="Bankroll Curve" />
          <SkeletonChart label="Daily P&L (Last 30 Days)" />
        </div>
        <SkeletonRows count={3} />
      </div>
    </Layout>
  )

  // ── Empty ──
  if ((!loading && bets.length === 0) || (timedOut && bets.length === 0)) return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-20 md:py-24 text-center animate-rise">
        <BarChart2 className="w-12 h-12 text-gray-700 mb-4" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-300 mb-2">No bets tracked yet</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          Log your first bet — or snap a photo of a slip and let the scanner read it — to see your P&amp;L, win rate and bankroll curve here.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => navigate('/add')}
            className="bg-green-500 hover:bg-green-400 text-gray-950 font-semibold px-6 py-2.5 rounded-xl transition-colors">
            + Add your first bet
          </button>
          <Link to="/academy"
            className="border border-gray-700 hover:border-gray-500 text-gray-300 font-medium px-6 py-2.5 rounded-xl transition-colors">
            Learn the basics
          </Link>
        </div>
      </div>
    </Layout>
  )

  const periodUnits = fmtUnits(stats.totalPL, unitSize)

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Header + period filter ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
            {bankroll > 0 && (
              <p className="text-xs text-gray-500 mt-1 tabular">
                Bankroll {fmtCurrency(bankroll + allStats.totalPL)}
                <span className="text-gray-600"> · started at {fmtCurrency(bankroll)}</span>
              </p>
            )}
          </div>
          <div role="tablist" aria-label="Time period" className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-full sm:w-auto">
            {PERIODS.map((p) => (
              <button key={p} role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  period === p ? 'bg-green-500 text-gray-950' : 'text-gray-400 hover:text-gray-100'
                }`}>
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Headline stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatsCard index={0} label="P&L" value={fmtCurrency(stats.totalPL)}
            sub={periodUnits ? `${periodUnits} ${PERIOD_LABEL[period]}` : PERIOD_LABEL[period]}
            positive={stats.totalPL > 0 ? true : stats.totalPL < 0 ? false : undefined} />
          <StatsCard index={1} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`}
            sub={`${stats.wins}W · ${stats.losses}L · ${stats.pushes}P`} />
          <StatsCard index={2} label="ROI" value={`${stats.roi.toFixed(1)}%`}
            sub={stats.totalStaked > 0 ? `on ${fmtCurrency(stats.totalStaked)} staked` : 'nothing staked yet'}
            positive={stats.roi > 0 ? true : stats.roi < 0 ? false : undefined} />
          <StatsCard index={3} label="Streak"
            value={streak.count > 0 ? `${streak.count}${streak.type === 'win' ? 'W' : 'L'}` : '—'}
            sub={streak.count > 0 ? (streak.type === 'win' ? 'on a heater' : 'cold stretch') : 'no settled bets'}
            positive={streak.count > 0 ? streak.type === 'win' : undefined} />
        </div>

        {/* ── Pending bets: the thing you actually came here to do ──
             These used to be a count on a card with no way to act on it. */}
        {pending.length > 0 && (
          <section aria-labelledby="pending-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="pending-heading" className="text-sm font-semibold">
                Awaiting result
                <span className="ml-2 text-xs font-medium text-gray-500">{pending.length} open</span>
              </h2>
              {pending.length > 4 && (
                <Link to="/history" className="text-xs font-medium text-green-400 hover:text-green-300 transition-colors">
                  See all
                </Link>
              )}
            </div>
            <BetList bets={pending.slice(0, 4)} onUpdate={updateBet} onDelete={deleteBet} unitSize={unitSize} />
          </section>
        )}

        {/* ── Charts ── */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-baseline justify-between mb-4 gap-3">
              <h2 className="text-sm font-medium text-gray-400">{bankroll > 0 ? 'Bankroll Curve' : 'Cumulative P&L'}</h2>
              {!bankroll && (
                <Link to="/settings" className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                  <SettingsIcon className="w-3 h-3" aria-hidden="true" />
                  Set bankroll
                </Link>
              )}
            </div>
            <BankrollChart bets={bets} startingBankroll={bankroll ?? 0} />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
            <h2 className="text-sm font-medium text-gray-400 mb-4">Daily P&amp;L (Last 30 Days)</h2>
            <PLBarChart bets={bets} />
          </div>
        </div>

        {/* ── Insights ── */}
        {allStats.settled > 0 && (
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <Breakdown title="By sport" rows={bySport} unitSize={unitSize} />
            <Breakdown title="By bet type" rows={byType} unitSize={unitSize} />
          </div>
        )}

        {/* ── All-time summary ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-4">All-Time</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center">
            <Figure label="Total P&L" value={fmtCurrency(allStats.totalPL)}
              cls={allStats.totalPL > 0 ? 'text-green-400' : allStats.totalPL < 0 ? 'text-red-400' : 'text-gray-100'} />
            <Figure label="Bets Settled" value={allStats.settled} />
            <Figure label="Win Rate" value={`${allStats.winRate.toFixed(1)}%`} />
            <Figure label="Max Drawdown" value={fmtCurrency(drawdown)} />
          </div>

          {(swing.win || swing.loss) && (
            <div className="grid sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-gray-800">
              {swing.win && (
                <Highlight Icon={Trophy} tone="text-green-400" label="Biggest win"
                  event={swing.win.event} value={fmtCurrency(swing.win.pl)} />
              )}
              {swing.loss && (
                <Highlight Icon={TrendingDown} tone="text-red-400" label="Biggest loss"
                  event={swing.loss.event} value={fmtCurrency(swing.loss.pl)} />
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function Figure({ label, value, cls = 'text-gray-100' }) {
  return (
    <div>
      <p className={`text-xl sm:text-2xl font-bold tabular ${cls}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function Highlight({ Icon, tone, label, event, value }) {
  return (
    <div className="flex items-center gap-3 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3">
      <Icon className={`w-4 h-4 flex-shrink-0 ${tone}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-200 truncate">{event}</p>
      </div>
      <p className={`text-sm font-bold tabular flex-shrink-0 ${tone}`}>{value}</p>
    </div>
  )
}

/** Ranked P&L per sport / bet type, with a bar to make the comparison visual. */
function Breakdown({ title, rows, unitSize }) {
  if (rows.length === 0) return null
  const max = Math.max(...rows.map((r) => Math.abs(r.totalPL)), 1)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <h2 className="text-sm font-medium text-gray-400">{title}</h2>
        {rows.length > 1 && (
          <p className="text-xs text-gray-600 inline-flex items-center gap-1">
            {rows[0].totalPL > 0
              ? <><Flame className="w-3 h-3 text-green-400" aria-hidden="true" />best: {rows[0].key}</>
              : <><Snowflake className="w-3 h-3 text-gray-500" aria-hidden="true" />all negative</>}
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {rows.slice(0, 6).map((r) => {
          const up = r.totalPL >= 0
          return (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-sm text-gray-200 truncate">{r.key}</span>
                <span className="text-xs text-gray-500 tabular flex-shrink-0">
                  {r.settled} bets · {r.winRate.toFixed(0)}%
                </span>
                <span className={`text-sm font-semibold tabular flex-shrink-0 ${up ? 'text-green-400' : 'text-red-400'}`}>
                  {fmtCurrency(r.totalPL)}
                  {fmtUnits(r.totalPL, unitSize) && (
                    <span className="ml-1.5 text-xs font-normal text-gray-500">{fmtUnits(r.totalPL, unitSize)}</span>
                  )}
                </span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${up ? 'bg-green-500/70' : 'bg-red-500/70'}`}
                  style={{ width: `${(Math.abs(r.totalPL) / max) * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
