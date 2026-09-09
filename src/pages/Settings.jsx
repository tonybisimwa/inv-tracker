import { useState } from 'react'
import { Wallet, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { fmtCurrency, suggestedUnit } from '../utils/calculations'
import Layout from '../components/Layout'

const FIELD = 'w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:border-green-500 transition-colors'

export default function Settings() {
  const { user, username, bankroll, unitSize, isVIP, vipPlan, vipUntil, updateProfile } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState({
    bankroll: bankroll ?? '',
    unitSize: unitSize ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])

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
                <dt className="text-gray-500">Renews / expires</dt>
                <dd className="text-gray-300 tabular">{new Date(vipUntil).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </Layout>
  )
}
