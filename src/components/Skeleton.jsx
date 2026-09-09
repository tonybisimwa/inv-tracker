/**
 * Loading placeholders that mirror the shape of the content they stand in for,
 * so the page doesn't reflow when data lands. Replaces the bare "Loading..."
 * text, which gave no sense of what was coming or how much.
 */

export function Skeleton({ className = '', style }) {
  return <div style={style} className={`shimmer bg-gray-800/70 rounded ${className}`} />
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ label }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm font-medium text-gray-400 mb-4">{label}</p>
      {/* Bars of varied height read as a chart rather than a grey slab */}
      <div className="h-[220px] flex items-end gap-1.5">
        {[38, 62, 45, 78, 55, 88, 42, 70, 60, 92, 50, 66].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonRows({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center gap-4">
          <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2 max-w-48" />
            <Skeleton className="h-3 w-1/3 max-w-32" />
          </div>
          <Skeleton className="h-4 w-16 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}
