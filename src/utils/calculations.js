export function calcPayout(stake, odds) {
  if (odds > 0) return +(stake * (odds / 100)).toFixed(2)
  return +(stake * (100 / Math.abs(odds))).toFixed(2)
}

export function calcPL(stake, odds, outcome) {
  if (outcome === 'win') return calcPayout(stake, odds)
  if (outcome === 'loss') return -stake
  return 0
}

export function fmtCurrency(val) {
  const abs = Math.abs(val)
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return val < 0 ? `-$${str}` : `$${str}`
}

export function fmtOdds(odds) {
  return odds > 0 ? `+${odds}` : `${odds}`
}

// The Academy teaches staking in units, so dollar figures get a unit twin
// wherever the user has told us what a unit is worth. Returns null when unset.
export function fmtUnits(val, unitSize) {
  if (!unitSize || unitSize <= 0) return null
  const u = val / unitSize
  const str = Math.abs(u).toFixed(2).replace(/\.?0+$/, '')
  return `${u < 0 ? '-' : ''}${str || '0'}u`
}

// 1% of bankroll is the Academy's default recommendation
export function suggestedUnit(bankroll) {
  if (!bankroll || bankroll <= 0) return null
  return Math.max(1, Math.round(bankroll * 0.01))
}

// Fields a bet needs before it can be saved, in the order we surface them
const REQUIRED = [
  { field: 'event', label: 'event',  message: 'Please enter an event name.',                  ok: (b) => !!String(b.event ?? '').trim() },
  { field: 'odds',  label: 'odds',   message: 'Please enter the odds (e.g. -110 or +250).',   ok: (b) => !!parseInt(b.odds) },
  { field: 'stake', label: 'stake',  message: 'Please enter a valid stake amount.',           ok: (b) => parseFloat(b.stake) > 0 },
]

// Returns [{ field, label, message }] for every missing/invalid field — empty means valid
export function validateBet(bet) {
  return REQUIRED.filter((r) => !r.ok(bet)).map(({ field, label, message }) => ({ field, label, message }))
}

export function groupByPeriod(bets, period) {
  const now = new Date()
  return bets.filter((b) => {
    const d = new Date(b.date)
    if (period === 'day') {
      return d.toDateString() === now.toDateString()
    }
    if (period === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
      return d >= weekAgo
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
    return true
  })
}

export function summarize(bets) {
  const settled = bets.filter((b) => b.outcome !== 'pending')
  const wins = settled.filter((b) => b.outcome === 'win').length
  const losses = settled.filter((b) => b.outcome === 'loss').length
  const pushes = settled.filter((b) => b.outcome === 'push').length
  const totalPL = settled.reduce((acc, b) => acc + b.pl, 0)
  const totalStaked = settled.reduce((acc, b) => acc + b.stake, 0)
  const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0
  const winRate = settled.length > 0 ? (wins / settled.length) * 100 : 0
  return { wins, losses, pushes, totalPL, totalStaked, roi, winRate, settled: settled.length, pending: bets.filter((b) => b.outcome === 'pending').length }
}

// ── Insight helpers ─────────────────────────────────────────────────────────
// The dashboard used to show four totals and nothing else. These answer the
// questions a bettor actually asks: what am I good at, and how am I running?

// Consecutive wins or losses from the most recent settled bet. Pushes are
// skipped rather than treated as a break — they're a no-action result.
export function currentStreak(bets) {
  const decided = bets
    .filter((b) => b.outcome === 'win' || b.outcome === 'loss')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  if (decided.length === 0) return { type: null, count: 0 }
  const type = decided[0].outcome
  let count = 0
  for (const b of decided) {
    if (b.outcome !== type) break
    count++
  }
  return { type, count }
}

// Per-value summaries for a field (sport, betType…), most profitable first.
// Only groups with settled bets are returned — a group of pending bets has no
// P&L to rank by.
export function breakdownBy(bets, field) {
  const groups = new Map()
  bets.forEach((b) => {
    const key = b[field] || 'Other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(b)
  })
  return [...groups.entries()]
    .map(([key, list]) => ({ key, ...summarize(list) }))
    .filter((g) => g.settled > 0)
    .sort((a, b) => b.totalPL - a.totalPL)
}

export function biggestSwing(bets) {
  const settled = bets.filter((b) => b.outcome !== 'pending')
  if (settled.length === 0) return { win: null, loss: null }
  const sorted = [...settled].sort((a, b) => b.pl - a.pl)
  const win = sorted[0]
  const loss = sorted[sorted.length - 1]
  return { win: win?.pl > 0 ? win : null, loss: loss?.pl < 0 ? loss : null }
}

// Cumulative bankroll over time. Seeds a "Start" point at the starting
// bankroll so the curve reads as money-on-hand rather than P&L-from-zero.
export function buildBankrollSeries(bets, start = 0) {
  const sorted = [...bets]
    .filter((b) => b.outcome !== 'pending')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  if (sorted.length === 0) return []
  let running = start
  const points = sorted.map((b) => {
    running += b.pl
    return { date: b.date.slice(5), value: +running.toFixed(2) }
  })
  return [{ date: 'Start', value: +start.toFixed(2) }, ...points]
}

// Largest peak-to-trough fall along the bankroll curve — the number that tells
// you whether your staking plan could actually have survived your own history.
export function maxDrawdown(series) {
  let peak = -Infinity
  let worst = 0
  series.forEach(({ value }) => {
    if (value > peak) peak = value
    worst = Math.min(worst, value - peak)
  })
  return Math.abs(worst)
}
