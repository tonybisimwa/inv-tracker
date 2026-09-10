import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Sparkles, Star, Download, TriangleAlert, ExternalLink } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useBets } from '../hooks/useBets'
import { useBilling } from '../hooks/useBilling'
import { useScanQuota } from '../hooks/useScanQuota'
import { deleteAccount as deleteAccountRemote } from '../firebase/api'
import { fmtCurrency, suggestedUnit } from '../utils/calculations'
import { formatTimeLeft } from '../utils/entitlements'
import Layout from '../components/Layout'
import ResponsibleGambling from '../components/ResponsibleGambling'

const FIELD = 'w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:border-green-500 transition-colors'

export default function Settings() {
  const {
    user, username, bankroll, unitSize, isVIP, vipPlan, vipUntil,
    tier, trial, cancelAtPeriodEnd, stripeCustomerId, updateProfile,
  } = useAuth()
  const toast = useToast()
  const { bets } = useBets()
  const { busy, portal } = useBilling()
  const quota = useScanQuota()

  const [form, setForm] = useState({
    bankroll: bankroll ?? '',
    unitSize: unitSize ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])
  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleting, setDeleting] = useState(false)

  /**
   * Exports the journal as JSON, built in the browser from data already loaded.
   * No server round trip, and no new endpoint that could leak someone else's
   * bets — it can only ever write out what this session can already read.
   */
  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: { email: user?.email, username, tier, bankroll, unitSize },
      bets,
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `statline-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${bets.length} ${bets.length === 1 ? 'bet' : 'bets'}.`)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      // Deletes the Auth record too, which signs the user out — the auth
      // listener unmounts this page on its own, so there's nothing to navigate.
      await deleteAccountRemote()
    } catch (err) {
      toast.error(err.message)
      setDeleting(false)
    }
  }

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setErrors([]) }

  const bankrollNum = parseFloat(form.bankroll)
  const suggestion = suggestedUnit(bankrollNum)

  async function save(e) {
    e.preventDefault()

    const found = []
    if (form.bankroll !== '' && !(bankrollNum > 0)) found.push('Bankroll must be a positive amount.')
    const unitNum = parseFloat(form.unitSize)
    if (form.unitSize !== '' && !(unitNum > 0)) found.push('Unit size must be a positive amount.')
    if (form.bankroll !== '' && form.unitSize !== '' && unitNum > bankrollNum) {
      found.push('A unit cannot be larger than your whole bankroll.')
    }
    if (found.length) { setErrors(found); return }

    setSaving(true)
    try {
      await updateProfile({
        bankroll: form.bankroll === '' ? null : bankrollNum,
        unitSize: form.unitSize === '' ? null : unitNum,
      })
      toast.success('Settings saved.')
    } catch {
      toast.error('Could not save your settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // What percent of bankroll the chosen unit represents — the number the
  // Academy's bankroll lesson tells you to keep at 1–3%.
  const unitPct = bankrollNum > 0 && parseFloat(form.unitSize) > 0
    ? (parseFloat(form.unitSize) / bankrollNum) * 100
    : null
  const riskLabel = unitPct === null ? null
    : unitPct <= 1.5 ? { text: 'Conservative — in line with the Academy', cls: 'text-green-400' }
    : unitPct <= 3   ? { text: 'Standard — within the recommended range',  cls: 'text-green-400' }
    : unitPct <= 5   ? { text: 'Aggressive — variance will sting',         cls: 'text-yellow-400' }
    :                  { text: 'High risk — a cold streak could wipe you out', cls: 'text-red-400' }

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Set your bankroll so the app can show results in units, not just dollars.</p>
        </div>

        {/* ── Bankroll & units ── */}
        <form onSubmit={save} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Bankroll &amp; unit size</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bankroll" className="block text-xs font-medium text-gray-400 mb-1.5">Starting bankroll</label>
              <input
                id="bankroll" type="number" inputMode="decimal" step="0.01" min="0"
                placeholder="1000"
                value={form.bankroll}
                onChange={(e) => set({ bankroll: e.target.value })}
                className={FIELD}
              />
              <p className="text-xs text-gray-600 mt-1.5">Where your bankroll curve starts.</p>
            </div>

            <div>
              <label htmlFor="unitSize" className="block text-xs font-medium text-gray-400 mb-1.5">1 unit equals</label>
              <input
                id="unitSize" type="number" inputMode="decimal" step="0.01" min="0"
                placeholder={suggestion ? String(suggestion) : '10'}
                value={form.unitSize}
                onChange={(e) => set({ unitSize: e.target.value })}
                className={FIELD}
              />
              {suggestion && parseFloat(form.unitSize) !== suggestion && (
                <button
                  type="button"
                  onClick={() => set({ unitSize: String(suggestion) })}
                  className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 mt-1.5 transition-colors"
                >
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  Use 1% of bankroll ({fmtCurrency(suggestion)})
                </button>
              )}
            </div>
          </div>

          {riskLabel && (
            <div className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400">
                Your unit is <span className="font-semibold text-gray-100 tabular">{unitPct.toFixed(2)}%</span> of bankroll
              </p>
              <p className={`text-xs font-medium mt-0.5 ${riskLabel.cls}`}>{riskLabel.text}</p>
            </div>
          )}

          {errors.length > 0 && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 space-y-1">
              {errors.map((msg) => <p key={msg} className="text-xs text-red-400">{msg}</p>)}
            </div>
          )}

          <button
            type="submit" disabled={saving}
            className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-950 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </form>

        {/* ── Account (read-only) ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold">Account</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-300 truncate">{user?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Username</dt>
              <dd className="text-gray-300 font-mono">{username || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Plan</dt>
              <dd className={isVIP ? 'text-purple-400 font-medium' : 'text-gray-300'}>
                {isVIP ? `VIP${vipPlan ? ` · ${vipPlan}` : ''}` : 'Free'}
              </dd>
            </div>
            {isVIP && vipUntil && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{cancelAtPeriodEnd ? 'Access ends' : 'Renews'}</dt>
                <dd className="text-gray-300 tabular">{new Date(vipUntil).toLocaleDateString()}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Slip scans left today</dt>
              <dd className="text-gray-300 tabular">
                {quota.loading ? '—' : `${quota.remaining} of ${quota.limit}`}
              </dd>
            </div>
          </dl>
        </div>

        {/* ── Subscription ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Subscription</h2>
          </div>

          {trial.active ? (
            <>
              <p className="text-sm text-gray-400">
                Your free trial has {formatTimeLeft(trial.msLeft)}. There's no card on
                file, so nothing will be charged when it ends.
              </p>
              <Link to="/pricing"
                className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Choose a plan
              </Link>
            </>
          ) : stripeCustomerId ? (
            <>
              <p className="text-sm text-gray-400">
                {cancelAtPeriodEnd
                  ? 'Your subscription is set to end and will not renew. You can restart it any time.'
                  : 'Update your card, switch plan, download invoices, or cancel — all in one place.'}
              </p>
              {/* Stripe's own portal rather than a billing UI of our own: it is
                  always correct about proration and tax, and cancelling never
                  needs to reach a human. */}
              <button
                onClick={portal}
                disabled={!!busy}
                className="inline-flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-200 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                You're on Standard. VIP adds the full daily card and batch slip scanning.
              </p>
              <Link to="/pricing"
                className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Compare plans
              </Link>
            </>
          )}
        </div>

        {/* ── Your data ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-green-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Your data</h2>
          </div>
          <p className="text-sm text-gray-400">
            Download your whole journal as JSON — {bets.length} {bets.length === 1 ? 'bet' : 'bets'}.
            It's your record, and it should never be locked in here.
          </p>
          <button
            onClick={exportData}
            className="border border-gray-700 hover:border-gray-500 text-gray-200 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            Export my data
          </button>
        </div>

        {/* ── Delete account ── */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 text-red-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-red-300">Delete account</h2>
          </div>
          <p className="text-sm text-gray-400">
            Permanently removes your profile, every bet you've logged, and your
            sign-in. Any active subscription is cancelled. This cannot be undone —
            export first if you want a copy.
          </p>
          <div className="space-y-2">
            <label htmlFor="confirmDelete" className="block text-xs font-medium text-gray-400">
              Type <span className="font-mono text-red-300">DELETE</span> to confirm
            </label>
            <input
              id="confirmDelete"
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="w-full sm:w-48 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-700 focus:border-red-500 transition-colors"
            />
          </div>
          <button
            onClick={handleDelete}
            disabled={confirmDelete !== 'DELETE' || deleting}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>

        <ResponsibleGambling />
      </div>
    </Layout>
  )
}
