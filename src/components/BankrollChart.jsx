import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { buildBankrollSeries, fmtCurrency } from '../utils/calculations'

/**
 * Bankroll over time. When the user has set a starting bankroll the curve
 * starts there and shows money-on-hand; otherwise it falls back to cumulative
 * P&L from zero, which is what it always used to be.
 */
export default function BankrollChart({ bets, startingBankroll }) {
  const start = typeof startingBankroll === 'number' ? startingBankroll : 0
  const data = useMemo(() => buildBankrollSeries(bets, start), [bets, start])

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[220px] text-center px-4">
      <p className="text-sm text-gray-500">No settled bets yet</p>
      <p className="text-xs text-gray-600 mt-1">Grade a bet and your curve appears here.</p>
    </div>
  )

  const label = start > 0 ? 'Bankroll' : 'P&L'
  const latest = data[data.length - 1].value
  const up = latest >= start
  const stroke = up ? '#34d399' : '#f87171'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="bankrollFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} stroke="#1f2937" minTickGap={24} />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 11 }}
          stroke="#1f2937"
          width={56}
          tickFormatter={(v) => `$${v}`}
          domain={['auto', 'auto']}
        />
        <Tooltip
          formatter={(v) => [fmtCurrency(v), label]}
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
        />
        {/* Break-even line: the starting bankroll, or zero when it isn't set */}
        <ReferenceLine y={start} stroke="#374151" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} fill="url(#bankrollFill)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
