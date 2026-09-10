import { Link, useNavigate } from 'react-router-dom'
import { Check, Minus, Star, Sparkles, ShieldCheck, CreditCard } from 'lucide-react'
import { PLANS, FEATURE_MATRIX, TIERS, TRIAL_HOURS, VIP_HIGHLIGHTS } from '../config/plans'
import { useAuth } from '../contexts/AuthContext'
import { useBilling } from '../hooks/useBilling'
import Layout from '../components/Layout'
import Logo from '../components/Logo'
import ResponsibleGambling from '../components/ResponsibleGambling'

/**
 * Standard vs VIP, in one place.
 *
 * Every cell comes from FEATURE_MATRIX in config/plans.js — the same file the
 * scanner reads its batch limit from and the Cloud Function mirrors for the
 * quota. So the table can't promise something the app then refuses.
 *
 * Renders for signed-out visitors too, with its own header instead of the app
 * chrome: someone deciding whether to sign up should be able to read the pricing.
 */

function Cell({ value }) {
  if (value === true) {
    return (
      <>
        <Check className="w-4 h-4 text-green-400 mx-auto" aria-hidden="true" />
        <span className="sr-only">Included</span>
      </>
    )
  }
  if (value === false) {
    return (
      <>
        <Minus className="w-4 h-4 text-gray-700 mx-auto" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </>
    )
  }
  return <span className="text-[11px] sm:text-xs text-gray-300 leading-snug">{value}</span>
}

function ComparisonTable() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <table className="w-full text-left">
        <caption className="sr-only">Feature comparison between the Standard and VIP plans</caption>
        <thead>
          <tr className="border-b border-gray-800">
            <th scope="col" className="py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Feature
            </th>
            <th scope="col" className="py-4 px-2 w-[26%] text-center text-xs font-semibold text-gray-300">
              {TIERS.standard.name}
              <span className="block font-normal text-gray-600 mt-0.5">{TIERS.standard.price}</span>
            </th>
            <th scope="col" className="py-4 px-2 w-[26%] text-center text-xs font-semibold text-purple-300 bg-purple-500/5">
              {TIERS.vip.name}
              <span className="block font-normal text-purple-500/70 mt-0.5">{TIERS.vip.price}</span>
            </th>
          </tr>
        </thead>
        {FEATURE_MATRIX.map((section) => (
          <tbody key={section.group}>
            <tr className="bg-gray-950/60">
              <th scope="colgroup" colSpan={3}
                className="py-2 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                {section.group}
              </th>
            </tr>
            {section.rows.map((row) => (
              <tr key={row.label} className="border-t border-gray-800/70">
                <th scope="row" className="py-3 px-4 font-normal align-top">
                  <span className="text-sm text-gray-200">{row.label}</span>
                  {row.detail && <span className="block text-xs text-gray-600 mt-0.5">{row.detail}</span>}
                </th>
                <td className="py-3 px-2 text-center align-middle"><Cell value={row.standard} /></td>
                <td className="py-3 px-2 text-center align-middle bg-purple-500/5"><Cell value={row.vip} /></td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

function PlanCard({ plan, busy, onPick, current }) {
  const featured = plan.featured
  return (
    <div className={`relative rounded-2xl border p-5 flex flex-col ${
      featured ? 'border-purple-500/60 bg-purple-500/5' : 'border-gray-800 bg-gray-900'
    }`}>
      {plan.badge && (
        <span className={`absolute -top-2.5 left-5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          featured ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-300'
        }`}>
          {plan.badge}
        </span>
      )}
      <p className="text-sm font-semibold text-gray-200">{plan.label}</p>
      <p className="mt-1">
        <span className="text-2xl font-bold text-gray-100">{plan.price}</span>
        <span className="text-sm text-gray-500">{plan.period}</span>
      </p>
      <p className="text-xs text-gray-500 mt-1 flex-1">{plan.note}</p>
      <button
        onClick={() => onPick(plan.id)}
        disabled={!!busy || current}
        className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          featured
            ? 'bg-purple-600 hover:bg-purple-500 text-white'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-100'
        }`}
      >
        {current ? 'Current plan' : busy === plan.id ? 'Opening checkout…' : `Choose ${plan.label}`}
      </button>
    </div>
  )
}

export default function Pricing() {
  const { user, isVIP, vipPlan, trial } = useAuth()
  const { busy, checkout, trial: startTrial } = useBilling()
  const navigate = useNavigate()

  const body = (
    <div className="max-w-3xl mx-auto space-y-10">
      <header className="text-center space-y-3">
        <p className="inline-block bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium px-3 py-1 rounded-full">
          Plans
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold">Two plans. One journal.</h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
          The journal is free and stays free — every stat, chart, and lesson.
          VIP adds the tools for volume and the full daily card.
        </p>
      </header>

      {/* The trial is the strongest thing on this page, so it goes above the
          prices. Only rendered when it can actually be claimed — a spent trial
          shown as an option is just a dead button. */}
      {trial?.eligible && (
        <section className="bg-gradient-to-br from-purple-500/15 to-purple-500/5 border border-purple-500/40 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-purple-300" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Try VIP free for {TRIAL_HOURS} hours</h2>
            <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
              No card, no charge, nothing to cancel. You get the full card and batch
              scanning for a day, then it ends on its own.
            </p>
          </div>
          <button
            onClick={startTrial}
            disabled={!!busy}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            {busy === 'trial' ? 'Starting…' : 'Start my free day'}
          </button>
          <p className="text-xs text-gray-600">One trial per account.</p>
        </section>
      )}

      {trial?.active && (
        <section className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 text-center space-y-2">
          <p className="text-sm font-semibold text-purple-200 flex items-center justify-center gap-2">
            <Star className="w-4 h-4" aria-hidden="true" /> Your free day is running
          </p>
          <p className="text-xs text-gray-400">
            {trial.hoursLeft} hour{trial.hoursLeft === 1 ? '' : 's'} left. Pick a plan below to keep going — nothing
            happens automatically when it ends.
          </p>
        </section>
      )}

      {/* Plans */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          {isVIP ? 'Change plan' : 'Go VIP'}
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              busy={busy}
              onPick={checkout}
              current={isVIP && vipPlan === p.id}
            />
          ))}
        </div>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 pt-1">
          {VIP_HIGHLIGHTS.map((h) => (
            <li key={h} className="flex items-start gap-2 text-xs text-gray-400">
              <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              {h}
            </li>
          ))}
        </ul>
      </section>

      {/* Payment reassurance — the questions people actually stall on */}
      <section className="grid sm:grid-cols-3 gap-3">
        {[
          { Icon: CreditCard, title: 'Pay how you like', body: 'Card, Apple Pay, Google Pay, and local methods where available.' },
          { Icon: ShieldCheck, title: 'We never see your card', body: 'Checkout is hosted by Stripe. Your details never touch Statline.' },
          { Icon: Star, title: 'Cancel yourself', body: 'One button in Settings. No email, no waiting on anyone.' },
        ].map(({ Icon, title, body: text }) => (
          <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <Icon className="w-4 h-4 text-green-400 mb-2" aria-hidden="true" />
            <p className="text-xs font-semibold text-gray-200">{title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{text}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">What's in each plan</h2>
        <ComparisonTable />
        <p className="text-xs text-gray-600">
          Published plays are opinions, not guarantees. The track record on the
          Plays page is the whole record — wins and losses.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Questions</h2>
        <div className="space-y-2">
          {[
            {
              q: 'What happens when my trial ends?',
              a: `Nothing. VIP switches off after ${TRIAL_HOURS} hours and you're back on Standard with your journal untouched. We never took a card, so there's nothing to cancel.`,
            },
            {
              q: 'Can I cancel?',
              a: 'Any time, yourself, from Settings — it opens the Stripe billing portal. You keep VIP until the end of the period you already paid for.',
            },
            {
              q: 'Do I lose my data if I go back to Standard?',
              a: 'No. Every bet, stat, and chart is yours on either plan. VIP changes how fast you can log bets and what appears on the daily card, not what you keep.',
            },
            {
              q: 'Why is scanning limited on Standard?',
              a: `Each scan costs us a call to a vision model. Standard covers ${TIERS.standard.limits.scansPerDay} a day, which is a normal night's slips. VIP raises it to ${TIERS.vip.limits.scansPerDay} and lets you upload them in one batch.`,
            },
          ].map(({ q, a }) => (
            <details key={q} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 group">
              <summary className="text-sm font-medium text-gray-200 cursor-pointer list-none flex items-center justify-between gap-3">
                {q}
                <span className="text-gray-600 group-open:rotate-45 transition-transform text-lg leading-none" aria-hidden="true">+</span>
              </summary>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <ResponsibleGambling />
    </div>
  )

  // Signed-out visitors get a plain header rather than the app shell, which
  // assumes a session and links to routes they can't reach yet.
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <Link to="/" aria-label="Statline home"><Logo size="md" /></Link>
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gray-400 hover:text-gray-100 transition-colors border border-gray-700 px-4 py-1.5 rounded-lg"
          >
            Sign In
          </button>
        </header>
        <main className="px-4 sm:px-6 py-10 pb-16">{body}</main>
      </div>
    )
  }

  return <Layout>{body}</Layout>
}
