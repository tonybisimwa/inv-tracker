import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import Logo from '../components/Logo'
import ResponsibleGambling from '../components/ResponsibleGambling'

/**
 * Terms, privacy, and the age notice.
 *
 * These are a launch requirement, not a nicety: Stripe asks for reachable terms
 * and a refund policy during review, both app stores reject without a privacy
 * policy, and anything touching wagering needs the age and helpline notices.
 *
 * Written plainly and honestly rather than copied from a generator — it describes
 * what this app actually does with data, which is the part that has to be true.
 * Have a lawyer read it before taking real money.
 */

const UPDATED = 'September 2026'

function Section({ id, title, children }) {
  return (
    <section id={id} className="space-y-2 scroll-mt-20">
      <h2 className="text-base font-bold text-gray-100">{title}</h2>
      <div className="text-sm text-gray-400 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function Legal() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const body = (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} aria-label="Go back"
          className="text-gray-500 hover:text-gray-300 transition-colors mt-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Terms &amp; Privacy</h1>
          <p className="text-xs text-gray-600 mt-1">Last updated {UPDATED}</p>
        </div>
      </div>

      <nav aria-label="On this page" className="flex flex-wrap gap-2">
        {[
          ['age', 'Age & eligibility'],
          ['what', 'What Statline is'],
          ['plays', 'Published plays'],
          ['billing', 'Billing & refunds'],
          ['privacy', 'Your data'],
          ['rights', 'Your rights'],
          ['liability', 'Liability'],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`}
            className="text-xs bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-full transition-colors">
            {label}
          </a>
        ))}
      </nav>

      <ResponsibleGambling />

      <Section id="age" title="Age and eligibility">
        <p>
          You must be at least 18 years old to use Statline, or 21 if that is the
          minimum betting age where you live. By using the app you confirm that you
          meet that requirement and that using it is lawful where you are.
        </p>
        <p>
          Statline does not accept wagers, hold stakes, or pay out winnings. It is
          not a sportsbook and is not affiliated with one.
        </p>
      </Section>

      <Section id="what" title="What Statline is">
        <p>
          Statline is a record-keeping tool. You log bets you have placed elsewhere
          and it calculates your profit and loss, return on investment, win rate,
          and bankroll over time. The slip scanner reads a screenshot to save you
          typing; it can misread, so check what it fills in.
        </p>
        <p>
          Nothing in the app is financial, investment, or betting advice, and no
          part of it is a guarantee of any outcome.
        </p>
      </Section>

      <Section id="plays" title="Published plays">
        <p>
          Some plans include access to plays published by the operator of this app.
          These are opinions. They are recorded with their results — wins and losses
          both — and the track record shown on the Plays page is that full record.
        </p>
        <p>
          Past results do not predict future ones. You decide what to stake, where,
          and whether to bet at all. Losses are yours, and so are winnings.
        </p>
      </Section>

      <Section id="billing" title="Billing, cancellation, and refunds">
        <p>
          VIP is a recurring subscription. Payments are processed by Stripe; Statline
          never receives or stores your card details. Your plan renews automatically
          at the interval you chose until you cancel.
        </p>
        <p>
          <strong className="text-gray-200">Cancelling:</strong> open Settings and
          use Manage subscription. You keep VIP until the end of the period you have
          already paid for, and are not charged again.
        </p>
        <p>
          <strong className="text-gray-200">Refunds:</strong> if something is broken,
          or you were charged in error or by mistake, contact us and we will refund
          you. We do not refund because plays lost — a losing run is the risk you
          accepted when you bet, and the free trial exists so you can judge the
          product before paying.
        </p>
        <p>
          The free trial lasts 24 hours, requires no card, one per account, and
          expires by itself. Prices may change, but never for a period you have
          already paid for.
        </p>
      </Section>

      <Section id="privacy" title="Your data">
        <p>We keep what the app needs to work, and no more:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-gray-200">Account:</strong> your email address, a
            generated username, and your display name if you signed in with Google.
          </li>
          <li>
            <strong className="text-gray-200">Your journal:</strong> the bets you log
            and the bankroll and unit size you set. This is private to your account.
            The operator cannot read it from within the app.
          </li>
          <li>
            <strong className="text-gray-200">Billing:</strong> a Stripe customer and
            subscription reference, plan, and renewal date. Card numbers are held by
            Stripe, never by us.
          </li>
          <li>
            <strong className="text-gray-200">Slip images:</strong> a slip you scan is
            sent to OpenAI's vision API to be read, and is not stored by us
            afterwards. Only the extracted text becomes a bet in your journal.
          </li>
        </ul>
        <p>
          We do not sell your data or share it for advertising. It is processed by
          Google Firebase (hosting, sign-in, database), Stripe (payments), and OpenAI
          (slip reading) so that those parts of the app can function.
        </p>
      </Section>

      <Section id="rights" title="Your rights">
        <p>
          <strong className="text-gray-200">Export:</strong> Settings has a button
          that downloads your whole journal as JSON. It is your record.
        </p>
        <p>
          <strong className="text-gray-200">Deletion:</strong> Settings also has
          Delete account. It removes your profile, every bet, your sign-in, and
          cancels any active subscription. It is immediate and cannot be undone.
        </p>
        <p>
          Depending on where you live you may have further rights over your data
          under the GDPR or the CCPA, including access and correction. Ask and we
          will action it.
        </p>
      </Section>

      <Section id="liability" title="Liability and changes">
        <p>
          Statline is provided as is. We do not warrant that it will be
          uninterrupted, error-free, or that any figure it calculates is accurate —
          it computes from what you enter, and a mistyped stake produces a wrong
          answer honestly.
        </p>
        <p>
          To the fullest extent the law allows, we are not liable for betting losses,
          missed bets, or decisions taken using this app. If we ever are held liable,
          it is limited to what you have paid us in the previous twelve months.
        </p>
        <p>
          We may update these terms. Material changes will be announced in the app,
          and continuing to use Statline afterwards means you accept them.
        </p>
      </Section>

      <div className="border-t border-gray-800 pt-6 text-xs text-gray-600 space-y-1">
        <p>Questions about any of this, or a data request? Contact the operator through the app.</p>
        <p>
          <Link to="/pricing" className="underline hover:text-gray-400">Compare plans</Link>
        </p>
      </div>
    </div>
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800 px-6 py-4">
          <Link to="/" aria-label="Statline home"><Logo size="md" /></Link>
        </header>
        <main className="px-4 sm:px-6 py-10 pb-16">{body}</main>
      </div>
    )
  }

  return <Layout>{body}</Layout>
}
