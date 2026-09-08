import { useState } from 'react'
import { Check, Pencil, TriangleAlert, X } from 'lucide-react'
import { fmtCurrency, fmtOdds, validateBet } from '../utils/calculations'
import BetForm from './BetForm'

const OUTCOME_COLOR = {
  win:  'text-green-400',
  loss: 'text-red-400',
  push: 'text-yellow-400',
}

function Row({ bet, index, onChange, onRemove }) {
  const [editing, setEditing] = useState(false)
  const problems = validateBet(bet)

  if (editing) {
    return (
      <div className="bg-gray-900 border border-green-500/30 rounded-xl p-5">
        <p className="text-xs text-gray-500 mb-4">Editing slip {index + 1}</p>
        <BetForm
          initial={bet}
          submitLabel="Done"
          onSubmit={(data) => { onChange(data); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className={`bg-gray-900 border rounded-xl px-4 py-3 flex items-center gap-3 ${
      problems.length > 0 ? 'border-yellow-500/40' : 'border-gray-800'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-100 truncate">
            {bet.event?.trim() || <span className="text-gray-500 italic">No event detected</span>}
          </span>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{bet.sport}</span>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{bet.betType}</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {bet.date}
          {parseInt(bet.odds) ? ` · ${fmtOdds(parseInt(bet.odds))}` : ''}
          {parseFloat(bet.stake) > 0 ? ` · ${fmtCurrency(parseFloat(bet.stake))} stake` : ''}
          {' · '}
          <span className={OUTCOME_COLOR[bet.outcome] || 'text-gray-500'}>
            {bet.outcome.charAt(0).toUpperCase() + bet.outcome.slice(1)}
          </span>
        </div>
        {problems.length > 0 && (
          <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1.5">
            <TriangleAlert className="w-3 h-3 flex-shrink-0" />
            Missing {problems.map((p) => p.label).join(', ')} — edit to fill in
          </p>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => setEditing(true)} title="Edit"
          className="p-1.5 text-gray-500 hover:text-gray-100 transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onRemove} title="Discard"
          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function ScannedBetsReview({ bets, onChange, onRemove, onClearAll, onSaveAll, saving, error }) {
  const incomplete = bets.filter((b) => validateBet(b).length > 0).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-gray-400">
            Scanned Bets <span className="text-gray-600">({bets.length})</span>
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {incomplete > 0
              ? `${incomplete} need${incomplete === 1 ? 's' : ''} attention before saving`
              : 'All set — review and save'}
          </p>
        </div>
        <button onClick={onClearAll} disabled={saving}
          className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-50 transition-colors">
          Discard all
        </button>
      </div>

      <div className="space-y-2">
        {bets.map((bet, i) => (
          <Row
            key={bet._id}
            bet={bet}
            index={i}
            onChange={(data) => onChange(bet._id, data)}
            onRemove={() => onRemove(bet._id)}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={onSaveAll}
        disabled={saving || incomplete > 0 || bets.length === 0}
        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-semibold py-3 rounded-xl transition-colors"
      >
        {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save {bets.length} Bet{bets.length === 1 ? '' : 's'}</>}
      </button>
    </div>
  )
}
