/**
 * A single headline number. `index` staggers the entrance so a row of cards
 * cascades in rather than snapping into place all at once.
 */
export default function StatsCard({ label, value, sub, positive, index = 0 }) {
  const color = positive === true ? 'text-green-400' : positive === false ? 'text-red-400' : 'text-gray-100'
  return (
    <div
      style={{ '--i': index }}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5 animate-rise hover:border-gray-700 transition-colors"
    >
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold tabular ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1 tabular">{sub}</p>}
    </div>
  )
}
