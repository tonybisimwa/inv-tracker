import { useState } from 'react'
import { Check, Minus, Pencil, Trash2, X } from 'lucide-react'
import { fmtCurrency, fmtOdds, fmtUnits } from '../utils/calculations'
import { useToast } from '../contexts/ToastContext'
import BetForm from './BetForm'

const OUTCOME_STYLE = {
  win:     { dot: 'bg-green-400',  text: 'text-green-400' },
  loss:    { dot: 'bg-red-400',    text: 'text-red-400' },
  push:    { dot: 'bg-yellow-400', text: 'text-yellow-400' },
  pending: { dot: 'bg-gray-500',   text: 'text-gray-500' },
}

// Grading was previously buried behind the full edit form — three taps and a
// scroll to record a result you already know. These do it in one.
const GRADES = [
  { outcome: 'win',  label: 'Win',  Icon: Check, cls: 'text-green-400 hover:bg-green-500/15 border-green-500/30' },
  { outcome: 'loss', label: 'Loss', Icon: X,     cls: 'text-red-400 hover:bg-red-500/15 border-red-500/30' },
  { outcome: 'push', label: 'Push', Icon: Minus, cls: 'text-yellow-400 hover:bg-yellow-500/15 border-yellow-500/30' },
]

function QuickGrade({ bet, onUpdate }) {
  const [saving, setSaving] = useState(null)
  const toast = useToast()

  async function grade(outcome) {
    setSaving(outcome)
    try {
      // `id` is the doc key, not a field on the doc
      const fields = { ...bet, outcome }
      delete fields.id
      await onUpdate(bet.id, fields)
      toast.success(`Graded as ${outcome}.`)
    } catch {
      toast.error('Could not save that result. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex gap-1.5" role="group" aria-label={`Grade ${bet.event}`}>
      {GRADES.map(({ outcome, label, Icon, cls }) => (
        <button
          key={outcome}
          onClick={() => grade(outcome)}
          disabled={saving !== null}
          aria-label={`Mark ${bet.event} as ${label}`}
          className={`flex items-center gap-1 border rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${cls} ${
            saving === outcome ? 'animate-pulse' : ''
          }`}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

export default function BetList({ bets, onUpdate, onDelete, unitSize, emptyMessage = 'No bets found for this period.' }) {
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const toast = useToast()

  if (bets.length === 0) return (
    <div className="text-center py-12 text-gray-600 text-sm">{emptyMessage}</div>
  )

  async function remove(bet) {
    try {
      await onDelete(bet.id)
      toast.success('Bet deleted.')
    } catch {
      toast.error('Could not delete that bet.')
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <ul className="space-y-2">
      {bets.map((bet) => {
        const style = OUTCOME_STYLE[bet.outcome] ?? OUTCOME_STYLE.pending
        const units = bet.outcome === 'pending' ? null : fmtUnits(bet.pl, unitSize)

        return (
          <li key={bet.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {editing === bet.id ? (
              <div className="p-5">
                <BetForm
                  initial={bet}
                  onSubmit={async (data) => {
                    await onUpdate(bet.id, data)
                    setEditing(null)
                    toast.success('Bet updated.')
                  }}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : confirmDelete === bet.id ? (
              /* Inline confirm replaces window.confirm(), which is jarring on
                 mobile and can't be styled or dismissed by tapping away. */
              <div className="flex items-center gap-3 px-5 py-4 flex-wrap">
                <p className="flex-1 text-sm text-gray-300 min-w-0">
                  Delete <span className="font-medium text-gray-100">{bet.event}</span>?
                </p>
                <button onClick={() => remove(bet)}
                  className="text-xs font-semibold bg-red-500 hover:bg-red-400 text-gray-950 px-3 py-1.5 rounded-lg transition-colors">
                  Delete
                </button>
                <button onClick={() => setConfirmDelete(null)}
                  className="text-xs font-medium text-gray-400 hover:text-gray-100 px-3 py-1.5 transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 hidden sm:block ${style.dot}`} aria-hidden="true" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 sm:hidden ${style.dot}`} aria-hidden="true" />
                    <span className="text-sm font-medium text-gray-100">{bet.event}</span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{bet.sport}</span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{bet.betType}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 tabular">
                    {bet.date} · {fmtOdds(bet.odds)} · {fmtCurrency(bet.stake)} stake
                    {fmtUnits(bet.stake, unitSize) && ` (${fmtUnits(bet.stake, unitSize)})`}
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <div className={`text-sm font-bold text-right tabular sm:w-24 flex-shrink-0 ${style.text}`}>
                    {bet.outcome === 'pending' ? 'Pending' : fmtCurrency(bet.pl)}
                    {units && <span className="block text-xs font-medium text-gray-500">{units}</span>}
                  </div>

                  {bet.outcome === 'pending' && <QuickGrade bet={bet} onUpdate={onUpdate} />}

                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditing(bet.id)} aria-label={`Edit ${bet.event}`}
                      className="text-gray-500 hover:text-gray-100 transition-colors p-2 rounded-lg hover:bg-gray-800">
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button onClick={() => setConfirmDelete(bet.id)} aria-label={`Delete ${bet.event}`}
                      className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-gray-800">
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
