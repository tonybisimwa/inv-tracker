import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcPayout, calcPL, fmtCurrency, fmtOdds, fmtUnits, suggestedUnit,
  validateBet, groupByPeriod, summarize, currentStreak, breakdownBy,
  biggestSwing, buildBankrollSeries, maxDrawdown, gameTimeMs, byGameTimeDesc,
} from './calculations.js'

const bet = (o) => ({ sport: 'NFL', betType: 'Spread', stake: 10, odds: -110, event: 'e', ...o })

// ── Odds & payouts ──────────────────────────────────────────────────────────

test('calcPayout on underdog odds', () => {
  assert.equal(calcPayout(100, 250), 250)
  assert.equal(calcPayout(10, 150), 15)
})

test('calcPayout on favourite odds', () => {
  assert.equal(calcPayout(110, -110), 100)
  assert.equal(calcPayout(10, -200), 5)
})

test('calcPL pays profit on a win, loses the stake on a loss, nothing on a push', () => {
  assert.equal(calcPL(110, -110, 'win'), 100)
  assert.equal(calcPL(110, -110, 'loss'), -110)
  assert.equal(calcPL(110, -110, 'push'), 0)
  assert.equal(calcPL(110, -110, 'pending'), 0)
})

test('fmtCurrency puts the sign outside the dollar symbol', () => {
  assert.equal(fmtCurrency(1234.5), '$1,234.50')
  assert.equal(fmtCurrency(-20), '-$20.00')
  assert.equal(fmtCurrency(0), '$0.00')
})

test('fmtOdds keeps the plus sign that American odds need', () => {
  assert.equal(fmtOdds(250), '+250')
  assert.equal(fmtOdds(-110), '-110')
})

// ── Units ───────────────────────────────────────────────────────────────────

test('fmtUnits returns null until a unit size is set', () => {
  assert.equal(fmtUnits(100, null), null)
  assert.equal(fmtUnits(100, 0), null)
  assert.equal(fmtUnits(100, -5), null)
})

test('fmtUnits trims trailing zeros but never the whole number', () => {
  assert.equal(fmtUnits(50, 10), '5u')
  assert.equal(fmtUnits(25, 10), '2.5u')
  assert.equal(fmtUnits(0, 10), '0u')
  assert.equal(fmtUnits(0.001, 10), '0u')
})

test('fmtUnits signs negatives once', () => {
  assert.equal(fmtUnits(-25, 10), '-2.5u')
})

test('suggestedUnit is 1% of bankroll, floored at a dollar', () => {
  assert.equal(suggestedUnit(1000), 10)
  assert.equal(suggestedUnit(20), 1)
  assert.equal(suggestedUnit(null), null)
  assert.equal(suggestedUnit(0), null)
})

// ── Validation ──────────────────────────────────────────────────────────────

test('validateBet accepts a complete bet', () => {
  assert.deepEqual(validateBet({ event: 'Chiefs vs Raiders', odds: '-110', stake: '25' }), [])
})

test('validateBet reports every missing field, not just the first', () => {
  const errs = validateBet({})
  assert.deepEqual(errs.map((e) => e.field), ['event', 'odds', 'stake'])
})

test('validateBet treats whitespace-only events as missing', () => {
  assert.deepEqual(validateBet({ event: '   ', odds: '-110', stake: '5' }).map((e) => e.field), ['event'])
})

test('validateBet rejects a zero or negative stake', () => {
  assert.deepEqual(validateBet({ event: 'e', odds: '-110', stake: '0' }).map((e) => e.field), ['stake'])
  assert.deepEqual(validateBet({ event: 'e', odds: '-110', stake: '-5' }).map((e) => e.field), ['stake'])
})

test('validateBet rejects zero odds, which have no payout', () => {
  assert.deepEqual(validateBet({ event: 'e', odds: '0', stake: '5' }).map((e) => e.field), ['odds'])
})

test('validateBet accepts positive odds written with a plus', () => {
  assert.deepEqual(validateBet({ event: 'e', odds: '+250', stake: '5' }), [])
})

test('validateBet carries a human message and short label for each error', () => {
  const [err] = validateBet({ odds: '-110', stake: '5' })
  assert.equal(err.label, 'event')
  assert.match(err.message, /event name/i)
})

// ── Period grouping & summaries ─────────────────────────────────────────────

test('groupByPeriod all returns everything', () => {
  const bets = [bet({ date: '1999-01-01', outcome: 'win', pl: 1 })]
  assert.equal(groupByPeriod(bets, 'all').length, 1)
})

test('groupByPeriod week keeps the last seven days and drops older bets', () => {
  const iso = (offset) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10)
  }
  const bets = [
    bet({ date: iso(-1),  outcome: 'win',  pl: 1 }),
    bet({ date: iso(-30), outcome: 'loss', pl: -1 }),
  ]
  assert.equal(groupByPeriod(bets, 'week').length, 1)
})

test('summarize ignores pending bets in P&L but still counts them', () => {
  const s = summarize([
    bet({ date: '2026-01-01', outcome: 'win',     pl: 20 }),
    bet({ date: '2026-01-02', outcome: 'loss',    pl: -10 }),
    bet({ date: '2026-01-03', outcome: 'pending', pl: 0 }),
  ])
  assert.equal(s.totalPL, 10)
  assert.equal(s.settled, 2)
  assert.equal(s.pending, 1)
  assert.equal(s.totalStaked, 20)
  assert.equal(s.winRate, 50)
})

test('summarize of nothing does not divide by zero', () => {
  const s = summarize([])
  assert.equal(s.roi, 0)
  assert.equal(s.winRate, 0)
})

// ── Streaks ─────────────────────────────────────────────────────────────────

test('currentStreak is empty with no decided bets', () => {
  assert.deepEqual(currentStreak([]), { type: null, count: 0 })
  assert.deepEqual(currentStreak([bet({ date: '2026-01-01', outcome: 'pending', pl: 0 })]), { type: null, count: 0 })
})

test('currentStreak counts back from the most recent bet, whatever the input order', () => {
  const s = currentStreak([
    bet({ date: '2026-01-03', outcome: 'loss', pl: -10 }),
    bet({ date: '2026-01-05', outcome: 'win',  pl: 9 }),
    bet({ date: '2026-01-04', outcome: 'win',  pl: 9 }),
  ])
  assert.deepEqual(s, { type: 'win', count: 2 })
})

test('currentStreak skips pushes instead of breaking on them', () => {
  const s = currentStreak([
    bet({ date: '2026-01-05', outcome: 'win',  pl: 9 }),
    bet({ date: '2026-01-04', outcome: 'push', pl: 0 }),
    bet({ date: '2026-01-03', outcome: 'win',  pl: 9 }),
  ])
  assert.deepEqual(s, { type: 'win', count: 2 })
})

test('currentStreak reports losing runs too', () => {
  const s = currentStreak([
    bet({ date: '2026-01-05', outcome: 'loss', pl: -10 }),
    bet({ date: '2026-01-04', outcome: 'loss', pl: -10 }),
  ])
  assert.deepEqual(s, { type: 'loss', count: 2 })
})

// ── Breakdowns ──────────────────────────────────────────────────────────────

const mixed = [
  bet({ sport: 'NFL', date: '2026-01-01', outcome: 'win',     pl: 20 }),
  bet({ sport: 'NFL', date: '2026-01-02', outcome: 'loss',    pl: -10 }),
  bet({ sport: 'NBA', date: '2026-01-03', outcome: 'loss',    pl: -30 }),
  bet({ sport: 'MLB', date: '2026-01-04', outcome: 'pending', pl: 0 }),
]

test('breakdownBy ranks most profitable first', () => {
  const r = breakdownBy(mixed, 'sport')
  assert.deepEqual(r.map((x) => x.key), ['NFL', 'NBA'])
  assert.equal(r[0].totalPL, 10)
})

test('breakdownBy omits groups with nothing settled', () => {
  assert.equal(breakdownBy(mixed, 'sport').find((x) => x.key === 'MLB'), undefined)
})

test('breakdownBy buckets a missing field under Other', () => {
  const r = breakdownBy([bet({ sport: undefined, date: '2026-01-01', outcome: 'win', pl: 5 })], 'sport')
  assert.equal(r[0].key, 'Other')
})

test('breakdownBy scopes win rate to each group', () => {
  const r = breakdownBy(mixed, 'sport')
  assert.equal(r.find((x) => x.key === 'NFL').winRate, 50)
  assert.equal(r.find((x) => x.key === 'NBA').winRate, 0)
})

// ── Biggest swings ──────────────────────────────────────────────────────────

test('biggestSwing is empty with no settled bets', () => {
  assert.deepEqual(biggestSwing([]), { win: null, loss: null })
})

test('biggestSwing picks the extremes', () => {
  const s = biggestSwing(mixed)
  assert.equal(s.win.pl, 20)
  assert.equal(s.loss.pl, -30)
})

test('biggestSwing reports no loss when everything won, and vice versa', () => {
  assert.equal(biggestSwing([bet({ date: '2026-01-01', outcome: 'win', pl: 5 })]).loss, null)
  assert.equal(biggestSwing([bet({ date: '2026-01-01', outcome: 'loss', pl: -5 })]).win, null)
})

// ── Bankroll curve ──────────────────────────────────────────────────────────

test('buildBankrollSeries is empty when nothing has settled', () => {
  assert.deepEqual(buildBankrollSeries([], 500), [])
  assert.deepEqual(buildBankrollSeries([bet({ date: '2026-01-01', outcome: 'pending', pl: 0 })], 500), [])
})

test('buildBankrollSeries seeds a Start point at the bankroll', () => {
  const s = buildBankrollSeries([bet({ date: '2026-03-04', outcome: 'win', pl: 9 })], 500)
  assert.deepEqual(s, [{ date: 'Start', value: 500 }, { date: '03-04', value: 509 }])
})

test('buildBankrollSeries accumulates chronologically regardless of input order', () => {
  const s = buildBankrollSeries([
    bet({ date: '2026-01-03', outcome: 'loss', pl: -10 }),
    bet({ date: '2026-01-01', outcome: 'win',  pl: 20 }),
  ], 100)
  assert.deepEqual(s.map((p) => p.value), [100, 120, 110])
})

test('buildBankrollSeries defaults to zero, preserving plain cumulative P&L', () => {
  const s = buildBankrollSeries([bet({ date: '2026-01-01', outcome: 'win', pl: 9 })])
  assert.deepEqual(s.map((p) => p.value), [0, 9])
})

// ── Drawdown ────────────────────────────────────────────────────────────────

test('maxDrawdown is zero on an empty or rising curve', () => {
  assert.equal(maxDrawdown([]), 0)
  assert.equal(maxDrawdown([{ value: 100 }, { value: 110 }, { value: 130 }]), 0)
})

test('maxDrawdown measures peak to trough, not first to last', () => {
  assert.equal(maxDrawdown([{ value: 100 }, { value: 150 }, { value: 90 }, { value: 200 }]), 60)
})

test('maxDrawdown takes the largest of several dips', () => {
  assert.equal(maxDrawdown([{ value: 100 }, { value: 80 }, { value: 200 }, { value: 120 }]), 80)
})

test('maxDrawdown is reported as a positive magnitude', () => {
  assert.equal(maxDrawdown([{ value: 100 }, { value: 40 }]), 60)
})

// ── Play ordering ───────────────────────────────────────────────────────────
// Plays are ordered client-side because an equality filter on tier plus
// orderBy('gameTime') would need a composite index, and a missing index rejects
// the listener outright — which presents as plays failing to save.

const play = (id, gameTime) => ({ id, gameTime })

test('gameTimeMs returns null for a missing or unparseable date', () => {
  assert.equal(gameTimeMs(play('a', null)), null)
  assert.equal(gameTimeMs(play('a', undefined)), null)
  assert.equal(gameTimeMs(play('a', '')), null)
  assert.equal(gameTimeMs(play('a', 'not a date')), null)
})

test('gameTimeMs parses an ISO string to epoch millis', () => {
  assert.equal(gameTimeMs(play('a', '2026-01-01T00:00:00.000Z')), Date.parse('2026-01-01T00:00:00.000Z'))
})

test('byGameTimeDesc puts the newest game first', () => {
  const s = [play('old', '2026-01-01T00:00:00Z'), play('new', '2026-06-01T00:00:00Z')].sort(byGameTimeDesc)
  assert.deepEqual(s.map((p) => p.id), ['new', 'old'])
})

test('byGameTimeDesc sorts undated plays last', () => {
  const s = [play('undated', null), play('dated', '2026-01-01T00:00:00Z')].sort(byGameTimeDesc)
  assert.deepEqual(s.map((p) => p.id), ['dated', 'undated'])
})

test('byGameTimeDesc never returns NaN, which would leave sort order undefined', () => {
  const pairs = [
    [play('a', null), play('b', null)],
    [play('a', null), play('b', '2026-01-01T00:00:00Z')],
    [play('a', 'garbage'), play('b', null)],
    [play('a', 'garbage'), play('b', 'garbage')],
    [play('a', '2026-01-01T00:00:00Z'), play('b', '2026-02-01T00:00:00Z')],
  ]
  pairs.forEach(([x, y]) => {
    assert.ok(!Number.isNaN(byGameTimeDesc(x, y)))
    assert.ok(!Number.isNaN(byGameTimeDesc(y, x)))
  })
})

test('byGameTimeDesc treats two undated plays as equal', () => {
  assert.equal(byGameTimeDesc(play('a', null), play('b', null)), 0)
})

test('byGameTimeDesc keeps every play when dated and undated are mixed', () => {
  const many = [
    play('1', null),
    play('2', '2026-03-01T00:00:00Z'),
    play('3', null),
    play('4', '2026-01-01T00:00:00Z'),
    play('5', 'bad'),
  ]
  const sorted = [...many].sort(byGameTimeDesc)
  assert.equal(sorted.length, 5)
  assert.deepEqual(sorted.slice(0, 2).map((p) => p.id), ['2', '4'])
  assert.deepEqual(new Set(sorted.map((p) => p.id)), new Set(['1', '2', '3', '4', '5']))
})
