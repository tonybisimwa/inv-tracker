import { Link } from 'react-router-dom'
import { LifeBuoy } from 'lucide-react'

/**
 * The 18+ and problem-gambling notice.
 *
 * Not decoration: an app that talks about staking money is expected to carry one,
 * app stores ask for it, and it's the right thing to put in front of someone
 * whose bankroll chart is heading down. Shown wherever money is being asked for
 * or promised — pricing, checkout, the legal page.
 *
 * The helpline is the US national one, which matches where the app is launching.
 * Add local numbers before opening other markets.
 */
export default function ResponsibleGambling({ compact = false }) {
  if (compact) {
    return (
      <p className="text-[11px] text-gray-600 leading-relaxed">
        18+ (21+ where required). Bet only what you can afford to lose. Help is available at{' '}
        <a href="tel:1-800-522-4700" className="underline hover:text-gray-400">1-800-GAMBLER</a>.
      </p>
    )
  }

  return (
    <aside className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-2">
      <p className="text-xs font-semibold text-gray-300 flex items-center gap-2">
        <LifeBuoy className="w-4 h-4 text-gray-500" aria-hidden="true" />
        Please bet responsibly
      </p>
      <p className="text-xs text-gray-500 leading-relaxed">
        You must be 18 or older — 21 or older where your state requires it. Statline
        is a record-keeping and information tool, not financial advice, and nothing
        here is a guarantee of profit. Never stake money you need.
      </p>
      <p className="text-xs text-gray-500 leading-relaxed">
        If betting has stopped being fun, free confidential help is available any
        time on{' '}
        <a href="tel:1-800-522-4700" className="text-gray-300 underline hover:text-gray-100">1-800-GAMBLER</a>{' '}
        or at{' '}
        <a href="https://www.ncpgambling.org" target="_blank" rel="noreferrer"
          className="text-gray-300 underline hover:text-gray-100">ncpgambling.org</a>.
      </p>
      <p className="text-[11px] text-gray-600 pt-1">
        <Link to="/legal" className="underline hover:text-gray-400">Terms &amp; Privacy</Link>
      </p>
    </aside>
  )
}
