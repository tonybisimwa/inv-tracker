import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function BankrollChart({ bets }) {
  const data = useMemo(() => {
    const sorted = [...bets].filter((b) => b.outcome !== 'pending').sort((a, b) => new Date(a.date) - new Date(b.date))
    let running = 0
    return sorted.map((b) => {
      running += b.pl
      return { date: b.date.slice(5), pl: +running.toFixed(2) }
    })
  }, [bets])

  if (data.length === 0) return <div className="flex items-center justify-center h-48 text-gray-600">No data yet</div>

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(v) => [`$${v}`, 'P&L']} contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
        <ReferenceLine y={0} stroke="#374151" />
        <Line type="monotone" dataKey="pl" stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
