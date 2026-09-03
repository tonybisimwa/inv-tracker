import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

export default function PLBarChart({ bets }) {
  const data = useMemo(() => {
    const byDay = {}
    bets.filter((b) => b.outcome !== 'pending').forEach((b) => {
      if (!byDay[b.date]) byDay[b.date] = 0
      byDay[b.date] += b.pl
    })
    return Object.entries(byDay)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-30)
      .map(([date, pl]) => ({ date: date.slice(5), pl: +pl.toFixed(2) }))
  }, [bets])

  if (data.length === 0) return <div className="flex items-center justify-center h-48 text-gray-600">No data yet</div>

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(v) => [`$${v}`, 'P&L']} contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
        <ReferenceLine y={0} stroke="#374151" />
        <Bar dataKey="pl">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pl >= 0 ? '#34d399' : '#f87171'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
