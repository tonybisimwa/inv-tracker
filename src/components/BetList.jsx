import { useState } from 'react'
import { fmtCurrency, fmtOdds } from '../utils/calculations'
import BetForm from './BetForm'

export default function BetList({ bets, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null)

  if (bets.length === 0) return (
    <div className="text-center py-12 text-gray-600">No bets found for this period.</div>
  )

  return (
    <div className="space-y-2">
      {bets.map((bet) => (
        <div key={bet.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {editing === bet.id ? (
            <div className="p-5">
              <BetForm
                initial={bet}
                onSubmit={async (data) => { await onUpdate(bet.id, data); setEditing(null) }}
                onCancel={() => setEditing(null)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-4 px-5 py-4">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                bet.outcome === 'win' ? 'bg-green-400' : bet.outcome === 'loss' ? 'bg-red-400'
                  : bet.outcome === 'push' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-100 truncate">{bet.event}</span>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{bet.sport}</span>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{bet.betType}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{bet.date} · {fmtOdds(bet.odds)} · ${bet.stake.toFixed(2)} stake</div>
              </div>
              <div className={`text-sm font-bold w-20 text-right flex-shrink-0 ${
                bet.outcome === 'win' ? 'text-green-400' : bet.outcome === 'loss' ? 'text-red-400'
                  : bet.outcome === 'push' ? 'text-yellow-400' : 'text-gray-500'}`}>
                {bet.outcome === 'pending' ? 'Pending' : fmtCurrency(bet.pl)}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setEditing(bet.id)} className="text-xs text-gray-500 hover:text-gray-100 transition-colors px-2 py-1">Edit</button>
                <button onClick={() => { if (confirm('Delete this bet?')) onDelete(bet.id) }} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1">Del</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
