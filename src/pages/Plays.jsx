import { Link, useNavigate } from 'react-router-dom'
import { Star, BookOpen, Lock, ChevronRight } from 'lucide-react'
import { PLANS, TRIAL_HOURS } from '../config/plans'
import { usePlays } from '../hooks/usePlays'
import { useAdmin } from '../hooks/useAdmin'
import { useAuth } from '../contexts/AuthContext'
import { useTipsterSettings } from '../hooks/useTipsterSettings'
import PlayCard from '../components/PlayCard'
import Layout from '../components/Layout'

/**
 * All-time record. Read from the aggregate in the settings doc rather than
 * counted from the plays on screen — a non-VIP client no longer receives VIP
 * plays, so counting locally would show them a smaller, misleading record.
 * Falls back to counting visible plays if the aggregate hasn't been written yet.
 */
function Record({ record, plays, tipsterName }) {
  const counted = record ?? (() => {
    const settled = plays.filter((p) => p.result && p.result !== 'pending')
    return {
      wins:   settled.filter((p) => p.result === 'win').length,
      losses: settled.filter((p) => p.result === 'loss').length,
      pushes: settled.filter((p) => p.result === 'push').length,
    }
  })()

  const { wins = 0, losses = 0, pushes = 0 } = counted
  const total = wins + losses + pushes
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '—'
  const displayName = tipsterName || 'Tipster'
  const initial = displayName.charAt(0).toUpperCase()
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">{initial}</div>
        <div>
          <p className="font-bold">{displayName}</p>
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
  const { plays, freePlays, vipPlays, loading, vipLocked } = usePlays()
  const { isVIP } = useAdmin()
  const { trial } = useAuth()
  const { settings } = useTipsterSettings()
  const navigate = useNavigate()

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-gray-500">Loading plays...</div></Layout>

  // vipLocked already accounts for admins, who aren't necessarily VIPs but
  // should still see their own picks unblurred
  const canSeeVIP = !vipLocked
  // Count only — the picks themselves are no longer sent to non-VIP clients
  const vipPending = settings.record?.vipPending ?? 0
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Today's Plays</h1>
          <p className="text-gray-500 text-sm mt-1">{today}</p>
        </div>

        {settings.statsVisible && <Record record={settings.record} plays={plays} tipsterName={settings.tipsterName} />}

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
            {isVIP && (
              <span className="text-xs bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" /> Active
              </span>
            )}
          </div>

          {vipPlays.length === 0 ? (
            canSeeVIP ? (
              <div className="bg-gray-900 border border-purple-500/20 rounded-2xl p-8 text-center text-gray-600">
                No VIP plays posted yet. Check back soon.
              </div>
            ) : (
              <div className="bg-gray-900 border border-purple-500/20 rounded-2xl p-8 text-center space-y-4">
                <Lock className="w-8 h-8 text-purple-400 mx-auto" />
                <div>
                  <p className="font-semibold text-gray-200">
                    {vipPending > 0
                      ? `${vipPending} VIP ${vipPending === 1 ? 'play' : 'plays'} waiting`
                      : 'VIP Members Only'}
                  </p>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                    Up to 5 best bets a day · The daily lottery parlay · Batch slip scanning
                  </p>
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  {PLANS.map((p) => (
                    <span key={p.id} className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full">
                      {p.label} · {p.price}
                    </span>
                  ))}
                </div>

                {/* The trial is the better ask when it's available: it converts far
                    more readily than a price, and it costs someone nothing to try
                    plays they can't currently see. */}
                <button
                  onClick={() => navigate(trial.eligible ? '/vip' : '/pricing')}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
                >
                  {trial.eligible ? `Unlock free for ${TRIAL_HOURS} hours` : 'Unlock VIP Access'}
                </button>
                <p className="text-xs text-gray-600">
                  <Link to="/pricing" className="underline hover:text-gray-400">
                    See what Standard and VIP each include
                  </Link>
                </p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {vipPlays.map((p) => <PlayCard key={p.id} play={p} locked={!canSeeVIP} />)}
            </div>
          )}
        </section>

        <button onClick={() => navigate('/academy')} className="w-full bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 text-left transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-green-400" /> Betting Academy</h2>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
          </div>
          <p className="text-sm text-gray-500">8 lessons covering bankroll management, unit sizing, line shopping, and how to read sharp money movement.</p>
          <p className="text-xs text-green-400 mt-3 font-medium">Start learning →</p>
        </button>
      </div>
    </Layout>
  )
}
