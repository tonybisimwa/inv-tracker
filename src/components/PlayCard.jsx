import { Flame, Shuffle, Lock, Star, Activity } from 'lucide-react'

const TYPE_CONFIG = {
  standard: { label: 'Standard', color: 'text-gray-400 bg-gray-800', icon: null },
  best_bet: { label: 'Best Bet', color: 'text-orange-400 bg-orange-500/10 border border-orange-500/30', icon: <Flame className="w-3 h-3" /> },
  lottery_parlay: { label: 'Lottery Parlay', color: 'text-purple-400 bg-purple-500/10 border border-purple-500/30', icon: <Shuffle className="w-3 h-3" /> },
}
const RESULT_CONFIG = {
  pending: { label: 'Pending', color: 'text-gray-400 bg-gray-800' },
  win: { label: '✓ Win', color: 'text-green-400 bg-green-500/10 border border-green-500/30' },
  loss: { label: '✗ Loss', color: 'text-red-400 bg-red-500/10 border border-red-500/30' },
  push: { label: '↔ Push', color: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' },
}

export default function PlayCard({ play, locked = false }) {
  const type = TYPE_CONFIG[play.playType] || TYPE_CONFIG.standard
  const result = RESULT_CONFIG[play.result] || RESULT_CONFIG.pending
  const gameDate = play.gameTime ? new Date(play.gameTime) : null
  const isPast = gameDate && gameDate < new Date()

  return (
    <div className={`relative bg-gray-900 border rounded-2xl overflow-hidden transition-all ${
      play.playType === 'best_bet' ? 'border-orange-500/40' :
      play.playType === 'lottery_parlay' ? 'border-purple-500/40' :
      'border-gray-800'
    }`}>
      {locked && (
        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-gray-950/60 flex flex-col items-center justify-center gap-2 rounded-2xl">
          <Lock className="w-6 h-6 text-gray-300" />
          <p className="text-sm font-semibold text-gray-200">VIP Members Only</p>
          <span className="text-xs text-gray-400">Coming Soon</span>
        </div>
      )}

      <div className={locked ? 'blur-[2px] select-none' : ''}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Activity className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{play.sport}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 ${type.color}`}>{type.icon}{type.label}</span>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${result.color}`}>{result.label}</span>
          </div>

          <h3 className="font-bold text-gray-100 mb-1">{play.event}</h3>
          <p className="text-green-400 font-semibold text-sm mb-1">{play.line}</p>

          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
            <span>{play.odds > 0 ? `+${play.odds}` : play.odds}</span>
            <span className="text-gray-600">·</span>
            <span>{play.units}u</span>
            {gameDate && (
              <>
                <span className="text-gray-600">·</span>
                <span className={isPast ? 'text-gray-600' : 'text-gray-400'}>
                  {gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </>
            )}
          </div>

          <div className="flex gap-0.5 mb-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= play.confidence ? 'bg-green-400' : 'bg-gray-700'}`} />
            ))}
            <span className="text-xs text-gray-500 ml-2 self-center">Confidence</span>
          </div>

          {play.reasoning && (
            <p className="text-sm text-gray-400 leading-relaxed border-t border-gray-800 pt-3">{play.reasoning}</p>
          )}
        </div>

        <div className={`px-5 py-2 border-t flex items-center justify-between ${
          play.tier === 'vip' ? 'border-purple-500/20 bg-purple-500/5' : 'border-gray-800'
        }`}>
          <span className={`text-xs font-medium flex items-center gap-1 ${play.tier === 'vip' ? 'text-purple-400' : 'text-gray-500'}`}>
            {play.tier === 'vip' && <Star className="w-3 h-3" />}
            {play.tier === 'vip' ? 'VIP Play' : 'Free Play'}
          </span>
        </div>
      </div>
    </div>
  )
}
