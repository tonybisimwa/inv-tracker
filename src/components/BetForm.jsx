import { useState } from 'react'
import { calcPL, calcPayout, fmtCurrency } from '../utils/calculations'

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'UFC/MMA', 'Tennis', 'Golf', 'Boxing', 'Other']
const BET_TYPES = ['Spread', 'Moneyline', 'Over/Under', 'Parlay', 'Prop', 'Futures', 'Teaser', 'Other']

export default function BetForm({ initial, onSubmit, onCancel, submitLabel }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState(initial || {
    date: today, sport: 'NFL', event: '', betType: 'Spread',
    odds: '', stake: '', outcome: 'pending', notes: '',
  })

  const odds = parseInt(form.odds) || 0
  const stake = parseFloat(form.stake) || 0
  const preview = form.outcome !== 'pending' && odds && stake
    ? calcPL(stake, odds, form.outcome)
    : null

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ ...form, odds: parseInt(form.odds), stake: parseFloat(form.stake) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Date</label>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" required />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sport</label>
          <select value={form.sport} onChange={(e) => set('sport', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500">
            {SPORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Event / Game</label>
        <input value={form.event} onChange={(e) => set('event', e.target.value)} placeholder="e.g. Chiefs vs Raiders"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Bet Type</label>
          <select value={form.betType} onChange={(e) => set('betType', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500">
            {BET_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Odds (American)</label>
          <input type="number" value={form.odds} onChange={(e) => set('odds', e.target.value)} placeholder="-110"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" required />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Stake ($)</label>
          <input type="number" step="0.01" min="0.01" value={form.stake} onChange={(e) => set('stake', e.target.value)} placeholder="100"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" required />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Outcome</label>
        <div className="flex gap-3">
          {['pending', 'win', 'loss', 'push'].map((o) => (
            <button key={o} type="button" onClick={() => set('outcome', o)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                form.outcome === o
                  ? o === 'win' ? 'bg-green-500/20 border-green-500 text-green-400'
                    : o === 'loss' ? 'bg-red-500/20 border-red-500 text-red-400'
                    : o === 'push' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                    : 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500'
              }`}>
              {o.charAt(0).toUpperCase() + o.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {preview !== null && (
        <div className={`rounded-lg px-4 py-3 text-sm ${preview >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          P&L: <span className="font-bold">{fmtCurrency(preview)}</span>
          {form.outcome === 'win' && <span className="text-gray-400 ml-2">(total return: {fmtCurrency(stake + calcPayout(stake, odds))})</span>}
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-400 mb-1">Notes</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Optional notes..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-green-500 hover:bg-green-400 text-gray-950 font-semibold py-2.5 rounded-lg transition-colors">
          {submitLabel ?? (initial ? 'Update Bet' : 'Save Bet')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-gray-700 rounded-lg text-gray-400 hover:text-gray-100 transition-colors">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
