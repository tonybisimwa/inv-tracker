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
  return { wins, losses, pushes, totalPL, roi, winRate, settled: settled.length, pending: bets.filter((b) => b.outcome === 'pending').length }
}
