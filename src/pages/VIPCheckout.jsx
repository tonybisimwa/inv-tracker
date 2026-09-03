import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDoc, collection } from 'firebase/firestore'
import { Star, ArrowLeft, CheckCircle } from 'lucide-react'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { useAdmin } from '../hooks/useAdmin'
import Layout from '../components/Layout'

const PLANS = [
  { id: 'weekly',  label: 'Weekly',  price: '$9.99',   period: '/week',  savings: null },
  { id: 'monthly', label: 'Monthly', price: '$29.99',  period: '/month', savings: 'Save 25%' },
  { id: 'yearly',  label: 'Yearly',  price: '$199.99', period: '/year',  savings: 'Best Value — Save 62%' },
]

const PLAN_AMOUNTS = { weekly: '$9.99', monthly: '$29.99', yearly: '$199.99' }

const STRIPE_LINKS = {
  weekly:  import.meta.env.VITE_STRIPE_LINK_WEEKLY,
  monthly: import.meta.env.VITE_STRIPE_LINK_MONTHLY,
  yearly:  import.meta.env.VITE_STRIPE_LINK_YEARLY,
}

function PaymentInstructions({ method, plan }) {
  const amount = PLAN_AMOUNTS[plan]
  const cashTag     = import.meta.env.VITE_CASHAPP_TAG
  const venmoHandle = import.meta.env.VITE_VENMO_HANDLE
  const paypalMe    = import.meta.env.VITE_PAYPAL_ME
  const stripeLink  = STRIPE_LINKS[plan]

  if (method === 'stripe') {
    if (!stripeLink) return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-400">
        Card payments are being set up. Use CashApp, Venmo, or PayPal for now.
      </div>
    )
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400">Click below to pay securely, then paste your payment email to confirm.</p>
        <a
          href={stripeLink}
          target="_blank"
          rel="noreferrer"
          className="block text-center bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Pay {amount} with Card
        </a>
      </div>
    )
  }

  const handle = method === 'cashapp' ? cashTag : method === 'venmo' ? venmoHandle : paypalMe
  if (!handle) return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-400">
      Contact admin to arrange this payment method.
    </div>
  )

  const note = method === 'paypal' ? 'Use "Friends & Family" to avoid fees' : 'Include your username in the note'
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-2">
      <p className="text-sm text-gray-300">Send <span className="text-green-400 font-bold">{amount}</span> to:</p>
      <p className="text-xl font-bold text-white font-mono">{handle}</p>
      <p className="text-xs text-gray-500">{note}</p>
    </div>
  )
}

export default function VIPCheckout() {
  const { user } = useAuth()
  const { isVIP, vipPlan, vipUntil, username } = useAdmin()
  const navigate = useNavigate()
  const [plan, setPlan]       = useState('monthly')
  const [method, setMethod]   = useState('cashapp')
  const [txnId, setTxnId]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!txnId.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await addDoc(collection(db, 'vipRequests'), {
        uid: user.uid,
        username,
        plan,
        method,
        txnId: txnId.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      setSubmitted(true)
    } catch (err) {
      setError('Failed to submit. Please try again.')
    }
    setSubmitting(false)
  }

  if (isVIP) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center space-y-6 pt-16">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto">
            <Star className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Active Member</p>
            <h1 className="text-2xl font-bold">You're VIP</h1>
            {vipPlan && (
              <p className="text-gray-400 text-sm mt-2 capitalize">
                {vipPlan} plan{vipUntil ? ` · expires ${new Date(vipUntil).toLocaleDateString()}` : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/plays')}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            View VIP Plays
          </button>
        </div>
      </Layout>
    )
  }

  if (submitted) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center space-y-6 pt-16">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold">Request Submitted</h1>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed">
              Your VIP access will be activated within 24 hours once payment is verified.
            </p>
          </div>
          <button onClick={() => navigate('/plays')} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Back to Plays
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/plays')} className="text-gray-500 hover:text-gray-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Unlock VIP</h1>
            <p className="text-gray-500 text-sm">5 daily plays · Best Bet · Lottery Parlay</p>
          </div>
        </div>

        {/* Plan picker */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Choose a Plan</p>
          <div className="space-y-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlan(p.id)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-all ${
                  plan === p.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${plan === p.id ? 'border-purple-400' : 'border-gray-600'}`}>
                    {plan === p.id && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                  </div>
                  <span className="font-semibold">{p.label}</span>
                  {p.savings && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">{p.savings}</span>
                  )}
                </div>
                <span className="text-gray-300 font-semibold">
                  {p.price}<span className="text-gray-500 font-normal text-sm">{p.period}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Payment method */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment Method</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { id: 'cashapp', label: 'CashApp' },
              { id: 'venmo',   label: 'Venmo' },
              { id: 'paypal',  label: 'PayPal' },
              { id: 'stripe',  label: 'Card (Stripe)' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                  method === m.id
                    ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <PaymentInstructions method={method} plan={plan} />
        </section>

        {/* Confirmation */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              {method === 'stripe' ? 'Email used for payment' : 'Transaction ID or confirmation number'}
            </label>
            <input
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder={method === 'stripe' ? 'you@example.com' : 'e.g. 8F3K2A or last 4 digits'}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !txnId.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
          <p className="text-xs text-gray-600 text-center">
            Access activated within 24 hours after payment verification.
          </p>
        </form>
      </div>
    </Layout>
  )
}
