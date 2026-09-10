import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Star, ArrowLeft, Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react'
import { PLANS, TRIAL_HOURS, VIP_HIGHLIGHTS } from '../config/plans'
import { useAuth } from '../contexts/AuthContext'
import { useBilling } from '../hooks/useBilling'
import { formatTimeLeft } from '../utils/entitlements'
import Layout from '../components/Layout'
import ResponsibleGambling from '../components/ResponsibleGambling'

/**
 * Checkout.
 *
 * This used to ask users to pay through CashApp or Venmo, paste a transaction ID,
 * and wait up to 24 hours for an admin to approve it by hand. Every step of that
 * lost people: an unfamiliar handle, a manual reference, and a day of nothing.
 *
 * Now it is one button to a Stripe-hosted page, and the webhook grants access
 * before the redirect finishes. The manual-approval collection (vipRequests) is
 * left in place for anyone still mid-flight, but nothing here writes to it.
 */

/** Stripe redirects back here, but the webhook is a separate round trip that can
 *  land a beat later. Rather than show "not VIP" to someone who just paid, we say
 *  what's happening — the profile listener flips this view when the grant arrives. */
function Activating() {
  return (
    <div className="max-w-md mx-auto text-center space-y-6 pt-16">
      <Loader2 className="w-12 h-12 text-purple-400 mx-auto animate-spin" />
      <div>
        <h1 className="text-2xl font-bold">Payment received</h1>
        <p className="text-gray-400 mt-2 text-sm leading-relaxed">
          Turning on your VIP access now — this usually takes a few seconds.
          You don't need to do anything.
        </p>
      </div>
    </div>
  )
}

function ActiveMember({ vipPlan, vipUntil, trial, cancelAtPeriodEnd, onManage, busy }) {
  const navigate = useNavigate()
  return (
    <div className="max-w-md mx-auto text-center space-y-6 pt-12">
      <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto">
        <Star className="w-8 h-8 text-purple-400" />
      </div>
      <div>
        <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
          {trial.active ? 'Free trial' : 'Active member'}
        </p>
        <h1 className="text-2xl font-bold">{trial.active ? 'VIP for today' : "You're VIP"}</h1>
        {trial.active ? (
          <p className="text-gray-400 text-sm mt-2">{formatTimeLeft(trial.msLeft)} — no card on file</p>
        ) : (
          vipPlan && (
            <p className="text-gray-400 text-sm mt-2 capitalize">
              {vipPlan} plan
              {vipUntil ? ` · ${cancelAtPeriodEnd ? 'ends' : 'renews'} ${new Date(vipUntil).toLocaleDateString()}` : ''}
            </p>
          )
        )}
      </div>

      <button
        onClick={() => navigate('/plays')}
        className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
      >
        View VIP Plays
      </button>

      {/* A trial ending today needs a plan, so send them to the table rather than
          to a billing portal that has nothing in it yet. */}
      {trial.active ? (
        <p className="text-sm text-gray-500">
          <Link to="/pricing" className="text-purple-400 hover:text-purple-300 font-medium">
            Pick a plan to keep it →
          </Link>
        </p>
      ) : (
        <button
          onClick={onManage}
          disabled={!!busy}
          className="block mx-auto text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          {busy === 'portal' ? 'Opening…' : 'Manage or cancel subscription'}
        </button>
      )}
    </div>
  )
}

export default function VIPCheckout() {
  const { isVIP, vipPlan, vipUntil, cancelAtPeriodEnd, trial } = useAuth()
  const { busy, checkout, portal, trial: startTrial } = useBilling()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState('monthly')

  // Read once and hold it. The effect below strips the query string, so reading
  // it live would make the "no charge was made" notice flash and disappear.
  const [returned] = useState(() => searchParams.get('checkout'))
  const [awaiting, setAwaiting] = useState(returned === 'success')

  // Don't wait forever on a webhook that isn't coming. After 20 seconds, drop
  // the spinner and show the plans again so the page is never a dead end.
  useEffect(() => {
    if (!awaiting) return
    const timer = setTimeout(() => setAwaiting(false), 20000)
    return () => clearTimeout(timer)
  }, [awaiting])

  // Clear the query string once it has been read, so a reload or a back
  // navigation doesn't replay "payment received" at someone.
  useEffect(() => {
    if (searchParams.get('checkout')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  if (isVIP) {
    return (
      <Layout>
        <ActiveMember
          vipPlan={vipPlan}
          vipUntil={vipUntil}
          trial={trial}
          cancelAtPeriodEnd={cancelAtPeriodEnd}
          onManage={portal}
          busy={busy}
        />
      </Layout>
    )
  }

  if (awaiting) return <Layout><Activating /></Layout>

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/plays')} aria-label="Back to plays"
            className="text-gray-500 hover:text-gray-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Unlock VIP</h1>
            <p className="text-gray-500 text-sm">Up to 5 best bets daily · Lottery parlay · Batch scanning</p>
          </div>
        </div>

        {returned === 'cancelled' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-400">
            No charge was made. Pick a plan whenever you're ready.
          </div>
        )}

        {/* The trial outranks the prices: it's the lowest-friction way to find out
            whether VIP is worth paying for, and it costs the user nothing. */}
        {trial.eligible && (
          <section className="bg-gradient-to-br from-purple-500/15 to-purple-500/5 border border-purple-500/40 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-300" aria-hidden="true" />
              Start with a free day
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              {TRIAL_HOURS} hours of full VIP access. No card, no charge, nothing to
              cancel — it ends on its own.
            </p>
            <button
              onClick={startTrial}
              disabled={!!busy}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {busy === 'trial' ? 'Starting…' : 'Start my free day'}
            </button>
          </section>
        )}

        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {trial.eligible ? 'Or choose a plan' : 'Choose a plan'}
          </p>
          <div className="space-y-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlan(p.id)}
                aria-pressed={plan === p.id}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-all ${
                  plan === p.id ? 'border-purple-500 bg-purple-500/10' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    plan === p.id ? 'border-purple-400' : 'border-gray-600'
                  }`}>
                    {plan === p.id && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                  </div>
                  <span className="font-semibold">{p.label}</span>
                  {p.badge && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">{p.badge}</span>
                  )}
                </div>
                <span className="text-gray-300 font-semibold">
                  {p.price}<span className="text-gray-500 font-normal text-sm">{p.period}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <button
            onClick={() => checkout(plan)}
            disabled={!!busy}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            {busy === plan ? 'Opening checkout…' : 'Continue to payment'}
          </button>

          <p className="text-xs text-gray-500 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            Paid securely through Stripe — card, Apple Pay, Google Pay, and local
            methods where available. Your card details never reach Statline, and you
            can cancel yourself at any time from Settings.
          </p>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">What VIP adds</p>
          {VIP_HIGHLIGHTS.map((h) => (
            <p key={h} className="text-sm text-gray-300 flex items-start gap-2">
              <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              {h}
            </p>
          ))}
          <Link to="/pricing" className="inline-block text-xs text-purple-400 hover:text-purple-300 font-semibold pt-1">
            See the full comparison →
          </Link>
        </section>

        <ResponsibleGambling />
      </div>
    </Layout>
  )
}
