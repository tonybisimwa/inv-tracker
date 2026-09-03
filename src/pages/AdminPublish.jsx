import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlays } from '../hooks/usePlays'
import Layout from '../components/Layout'

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'UFC/MMA', 'Tennis', 'Golf', 'Boxing', 'Other']

const EMPTY = { sport: 'NFL', event: '', line: '', odds: '', units: 1, confidence: 3, playType: 'standard', tier: 'free', gameTime: '', reasoning: '' }

export default function AdminPublish() {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { addPlay } = usePlays()
  const navigate = useNavigate()

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.event.trim() || !form.line.trim() || !form.odds) {
      setError('Event, line, and odds are required.')
      return
    }
    setSaving(true)
    try {
      await addPlay({
        sport: form.sport,
        event: form.event.trim(),
        line: form.line.trim(),
        odds: parseInt(form.odds),
        units: parseFloat(form.units),
        confidence: parseInt(form.confidence),
        playType: form.playType,
        tier: form.tier,
        gameTime: form.gameTime ? new Date(form.gameTime).toISOString() : null,
        reasoning: form.reasoning.trim(),
      })
      navigate('/admin')
    } catch (err) {
      setError('Failed to publish play. Check console.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Publish a Play</h1>
          <p className="text-gray-500 text-sm mt-1">This will appear immediately on the Plays page.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Sport</label>
              <select value={form.sport} onChange={(e) => set('sport', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
                {SPORTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Tier</label>
              <select value={form.tier} onChange={(e) => set('tier', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
                <option value="free">Free</option>
                <option value="vip">VIP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Event (teams / matchup)</label>
            <input value={form.event} onChange={(e) => set('event', e.target.value)} placeholder="e.g. Chiefs vs Raiders" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Pick / Line</label>
            <input value={form.line} onChange={(e) => set('line', e.target.value)} placeholder="e.g. Chiefs -3.5 or Over 47.5" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Odds (American)</label>
              <input type="number" value={form.odds} onChange={(e) => set('odds', e.target.value)} placeholder="-110" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Units</label>
              <input type="number" min="0.5" max="5" step="0.5" value={form.units} onChange={(e) => set('units', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Confidence (1-5)</label>
              <input type="number" min="1" max="5" value={form.confidence} onChange={(e) => set('confidence', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Play Type</label>
            <div className="flex gap-3">
              {[['standard', 'Standard'], ['best_bet', 'Best Bet'], ['lottery_parlay', 'Lottery Parlay']].map(([val, label]) => (
                <button type="button" key={val} onClick={() => set('playType', val)} className={`flex-1 text-xs py-2 rounded-xl border transition-colors ${form.playType === val ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Game Date & Time</label>
            <input type="datetime-local" value={form.gameTime} onChange={(e) => set('gameTime', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Reasoning</label>
            <textarea value={form.reasoning} onChange={(e) => set('reasoning', e.target.value)} rows={3} placeholder="Why this play? Key stats, matchup edges, line movement..." className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/admin')} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-500 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold text-sm transition-colors">
              {saving ? 'Publishing...' : 'Publish Play'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
