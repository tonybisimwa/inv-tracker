import { useState } from 'react'
import { usePlays } from '../hooks/usePlays'
import { useTipsterSettings } from '../hooks/useTipsterSettings'
import { useToast } from '../contexts/ToastContext'
import Layout from '../components/Layout'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Pencil, Check, X } from 'lucide-react'

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { plays, updatePlay, deletePlay } = usePlays()
  const { settings, updateSettings } = useTipsterSettings()
  const toast = useToast()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  function startEditName() {
    setNameInput(settings.tipsterName || '')
    setEditingName(true)
  }

  async function saveName() {
    const trimmed = nameInput.trim()
    if (trimmed) {
      try {
        await updateSettings({ tipsterName: trimmed })
        toast.success('Tipster name updated.')
      } catch { toast.error('Could not save the name.') }
    }
    setEditingName(false)
  }

  async function toggleStats() {
    const next = !settings.statsVisible
    try {
      await updateSettings({ statsVisible: next })
      toast.success(next ? 'Stats card is now public.' : 'Stats card is now hidden.')
    } catch { toast.error('Could not change stats visibility.') }
  }

  async function removePlay(id) {
    try {
      await deletePlay(id)
      toast.success('Play deleted.')
    } catch {
      toast.error('Could not delete that play.')
    } finally {
      setConfirmDelete(null)
    }
  }

  function cancelEditName() {
    setEditingName(false)
  }

  const total = plays.length
  const pending = plays.filter((p) => p.result === 'pending').length
  const wins = plays.filter((p) => p.result === 'win').length
  const losses = plays.filter((p) => p.result === 'loss').length
  const winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '—'

  const pendingPlays = plays.filter((p) => p.result === 'pending')

  async function handleResult(id, result) {
    try {
      await updatePlay(id, { result })
      toast.success(`Play graded as ${result}.`)
    } catch {
      toast.error('Could not save that result.')
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Manage plays and track performance</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={toggleStats}
              className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                settings.statsVisible
                  ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
              title={settings.statsVisible ? 'Stats card is public — click to hide' : 'Stats card is hidden — click to show'}
            >
              {settings.statsVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Stats {settings.statsVisible ? 'Public' : 'Hidden'}
            </button>
            <Link to="/admin/vip" className="text-xs font-semibold border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-3 py-2 rounded-lg transition-colors">
              VIP Members
            </Link>
            <Link to="/admin/publish" className="bg-green-500 hover:bg-green-400 text-black font-bold text-sm px-5 py-2 rounded-xl transition-colors">
              + New Play
            </Link>
          </div>
        </div>

        {/* Tipster name editor */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 mb-1">Displayed tipster name</p>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName() }}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-green-500"
                  placeholder="e.g. Tony B. — Tipster"
                />
                <button onClick={saveName} className="text-green-400 hover:text-green-300 transition-colors" title="Save"><Check className="w-4 h-4" /></button>
                <button onClick={cancelEditName} className="text-gray-500 hover:text-gray-300 transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <p className="font-semibold text-gray-100 truncate">{settings.tipsterName || <span className="text-gray-500 italic">Not set</span>}</p>
            )}
          </div>
          {!editingName && (
            <button onClick={startEditName} className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors" title="Edit name">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Plays" value={total} />
          <StatCard label="Win Rate" value={`${winRate}%`} color="text-green-400" />
          <StatCard label="Pending" value={pending} color="text-yellow-400" />
          <StatCard label="Record" value={`${wins}-${losses}`} />
        </div>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Pending Result Updates</h2>
          {pendingPlays.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-600">
              No pending plays — all results graded.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPlays.map((play) => (
                <div key={play.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{play.event}</p>
                    <p className="text-sm text-green-400">{play.line}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{play.sport} · {play.odds > 0 ? `+${play.odds}` : play.odds} · {play.units}u</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleResult(play.id, 'win')} className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition-colors">Win</button>
                    <button onClick={() => handleResult(play.id, 'loss')} className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">Loss</button>
                    <button onClick={() => handleResult(play.id, 'push')} className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-yellow-500/20 transition-colors">Push</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">All Plays</h2>
          {plays.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-600">No plays published yet.</div>
          ) : (
            <div className="space-y-2">
              {plays.map((play) => (
                <div key={play.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{play.event}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${play.tier === 'vip' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-500 bg-gray-800'}`}>
                        {play.tier === 'vip' ? 'VIP' : 'Free'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-green-400">{play.line}</p>
                      <span className="text-gray-700">·</span>
                      <p className="text-xs text-gray-500">{play.sport}</p>
                      <span className="text-gray-700">·</span>
                      <span className={`text-xs font-medium ${play.result === 'win' ? 'text-green-400' : play.result === 'loss' ? 'text-red-400' : play.result === 'push' ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {play.result}
                      </span>
                    </div>
                  </div>
                  {confirmDelete === play.id ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => removePlay(play.id)}
                        className="text-xs font-semibold bg-red-500 hover:bg-red-400 text-gray-950 px-2.5 py-1 rounded-lg transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="text-xs text-gray-500 hover:text-gray-200 px-1 transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(play.id)}
                      aria-label={`Delete ${play.event}`}
                      className="text-gray-600 hover:text-red-400 text-xs transition-colors flex-shrink-0"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
