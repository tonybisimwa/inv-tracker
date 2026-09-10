/**
 * Scan allowance tests.
 *
 * The quota is the only thing standing between a stolen session and an unbounded
 * OpenAI bill, and on the Blaze plan that is real money. It is also the piece
 * most easily broken by a well-meaning refactor — "why is this a transaction?"
 * has an expensive answer, and the concurrency test below is it.
 *
 * Runs against the Firestore emulator:
 *   npm run test:functions
 *
 * The emulator host must be set before ./scan.js is imported, because shared.js
 * calls initializeApp() at module load and the Admin SDK reads the variable then.
 */

import assert from 'node:assert/strict'
import { before, beforeEach, describe, it } from 'node:test'

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.GCLOUD_PROJECT ??= 'statline-functions-test'

const { claimScan, refundScan, describeReset, normalise } = await import('./scan.js')
const { db } = await import('./shared.js')

const UID = 'quota-user'
const quotaDoc = () => db.collection('users').doc(UID).collection('usage').doc('scans')
const HOUR = 60 * 60 * 1000

/** Reads the stored timestamps back. */
async function stored() {
  const snap = await quotaDoc().get()
  return snap.exists ? (snap.data().recent ?? []) : []
}

before(async () => {
  // Fail loudly rather than silently writing to a real project.
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    'refusing to run: FIRESTORE_EMULATOR_HOST is not set'
  )
})

beforeEach(async () => { await quotaDoc().delete() })

describe('claimScan', () => {
  it('claims against an empty allowance and reports what is left', async () => {
    const { remaining, stamp } = await claimScan(UID, 5)
    assert.equal(remaining, 4)
    assert.equal(typeof stamp, 'number')
    assert.deepEqual(await stored(), [stamp])
  })

  it('counts down to zero across successive claims', async () => {
    const seen = []
    for (let i = 0; i < 5; i += 1) seen.push((await claimScan(UID, 5)).remaining)
    assert.deepEqual(seen, [4, 3, 2, 1, 0])
  })

  it('refuses once the allowance is spent', async () => {
    for (let i = 0; i < 3; i += 1) await claimScan(UID, 3)
    await assert.rejects(() => claimScan(UID, 3), (err) => {
      assert.equal(err.code, 'resource-exhausted')
      assert.match(err.message, /all 3 scans/)
      return true
    })
  })

  it('tells the caller when more unlock', async () => {
    await claimScan(UID, 1)
    await assert.rejects(() => claimScan(UID, 1), (err) => {
      // resetAt is when the *oldest* claim ages out, ~24h from now
      assert.ok(err.details.resetAt > Date.now() + 23 * HOUR)
      assert.equal(err.details.limit, 1)
      return true
    })
  })

  it('does not write anything when it refuses', async () => {
    await claimScan(UID, 1)
    const before = await stored()
    await assert.rejects(() => claimScan(UID, 1))
    assert.deepEqual(await stored(), before)
  })

  // The rolling window is the reason no timezone is taken from the client.
  it('ignores claims older than the 24h window', async () => {
    const old = Date.now() - 25 * HOUR
    await quotaDoc().set({ recent: [old, old, old], limit: 3 })
    const { remaining } = await claimScan(UID, 3)
    assert.equal(remaining, 2)
    // the stale entries are dropped, not carried forward
    assert.equal((await stored()).length, 1)
  })

  it('still counts claims from just inside the window', async () => {
    const recent = Date.now() - 23 * HOUR
    await quotaDoc().set({ recent: [recent, recent, recent], limit: 3 })
    await assert.rejects(() => claimScan(UID, 3), (err) => err.code === 'resource-exhausted')
  })

  it('discards non-numeric junk in the array', async () => {
    await quotaDoc().set({ recent: [null, 'yesterday', {}, Date.now()], limit: 3 })
    const { remaining } = await claimScan(UID, 3)
    assert.equal(remaining, 1) // one real entry survived, plus the new claim
  })

  it('keeps the document small by trimming to the limit', async () => {
    for (let i = 0; i < 4; i += 1) await claimScan(UID, 2).catch(() => {})
    assert.ok((await stored()).length <= 2)
  })

  /**
   * The one that justifies the transaction. A batch upload fires several scans at
   * once; under read-then-write every one of them reads the same pre-claim count
   * and all of them pass, so a VIP limit of 150 becomes unbounded. Exactly `limit`
   * of these must succeed.
   */
  it('does not over-grant under concurrent claims', async () => {
    const limit = 5
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => claimScan(UID, limit))
    )
    const granted = results.filter((r) => r.status === 'fulfilled')
    const refused = results.filter((r) => r.status === 'rejected')

    assert.equal(granted.length, limit, `expected exactly ${limit} grants`)
    assert.equal(refused.length, 20 - limit)
    assert.ok(refused.every((r) => r.reason.code === 'resource-exhausted'))
    assert.equal((await stored()).length, limit)
  })

  it('gives every concurrent winner a distinct stamp to refund', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => claimScan(UID, 5))
    )
    const stamps = results.filter((r) => r.status === 'fulfilled').map((r) => r.value.stamp)
    assert.equal(new Set(stamps).size, stamps.length, 'stamps collided — a refund would remove the wrong claim')
  })
})

describe('refundScan', () => {
  it('hands back the claim it is given', async () => {
    const { stamp } = await claimScan(UID, 5)
    await refundScan(UID, stamp)
    assert.deepEqual(await stored(), [])
  })

  it('frees the allowance again', async () => {
    const { stamp } = await claimScan(UID, 1)
    await assert.rejects(() => claimScan(UID, 1))
    await refundScan(UID, stamp)
    await assert.doesNotReject(() => claimScan(UID, 1))
  })

  // The bug this test exists for: computing the stamp before the transaction ran
  // meant refundScan never matched, so a failed scan quietly kept charging.
  it('removes only the claim named, leaving the others', async () => {
    const a = await claimScan(UID, 5)
    const b = await claimScan(UID, 5)
    await refundScan(UID, b.stamp)
    const left = await stored()
    assert.equal(left.length, 1)
    assert.equal(left[0], a.stamp)
  })

  it('removes one entry even when two share a timestamp', async () => {
    const t = Date.now()
    await quotaDoc().set({ recent: [t, t], limit: 5 })
    await refundScan(UID, t)
    assert.deepEqual(await stored(), [t])
  })

  it('is a no-op for a stamp that was never claimed', async () => {
    const { stamp } = await claimScan(UID, 5)
    await refundScan(UID, stamp + 12345)
    assert.deepEqual(await stored(), [stamp])
  })

  // A refund must never throw: it runs inside the catch block of a scan that has
  // already failed, and its own failure would mask the error the user needs.
  it('does not throw when there is no quota document', async () => {
    await assert.doesNotReject(() => refundScan(UID, Date.now()))
  })

  it('does not throw for an unknown user', async () => {
    await assert.doesNotReject(() => refundScan('nobody-at-all', Date.now()))
  })
})

describe('describeReset', () => {
  it('uses minutes under an hour', () => {
    assert.equal(describeReset(90 * 1000), 'in 2 minutes')
  })

  it('does not pluralise a single minute', () => {
    assert.equal(describeReset(30 * 1000), 'in 1 minute')
  })

  it('switches to hours at an hour', () => {
    assert.equal(describeReset(3 * HOUR), 'in 3 hours')
  })

  it('does not pluralise a single hour', () => {
    assert.equal(describeReset(59.5 * 60 * 1000), 'in 1 hour')
  })
})

describe('normalise', () => {
  const TODAY = '2026-09-10'

  it('passes through a well-formed reading', () => {
    assert.deepEqual(
      normalise({ sport: 'NBA', event: 'Lakers vs Celtics', betType: 'Spread', odds: '-110', stake: '25.50', date: '2026-09-09', notes: 'LAL -3.5' }, TODAY),
      { sport: 'NBA', event: 'Lakers vs Celtics', betType: 'Spread', odds: -110, stake: 25.5, date: '2026-09-09', notes: 'LAL -3.5', outcome: 'pending' }
    )
  })

  // The model is free-form text; anything it invents has to land on a valid value
  // rather than into the user's journal as-is.
  it('falls back to Other for a sport not on the list', () => {
    assert.equal(normalise({ sport: 'Quidditch' }, TODAY).sport, 'Other')
  })

  it('falls back to Moneyline for an unknown bet type', () => {
    assert.equal(normalise({ betType: 'Reverse Teaser Special' }, TODAY).betType, 'Moneyline')
  })

  it('empties odds and stake it cannot parse', () => {
    const bet = normalise({ odds: 'even money', stake: 'a fiver' }, TODAY)
    assert.equal(bet.odds, '')
    assert.equal(bet.stake, '')
  })

  it('keeps positive odds without a plus sign', () => {
    assert.equal(normalise({ odds: '+250' }, TODAY).odds, 250)
  })

  it("falls back to today's date when the slip has none", () => {
    assert.equal(normalise({ date: null }, TODAY).date, TODAY)
  })

  it('rejects a malformed date rather than storing it', () => {
    assert.equal(normalise({ date: '09/10/2026' }, TODAY).date, TODAY)
  })

  it('turns nulls into empty strings, never the string "null"', () => {
    const bet = normalise({ event: null, notes: null }, TODAY)
    assert.equal(bet.event, '')
    assert.equal(bet.notes, '')
  })

  it('always marks the bet pending', () => {
    assert.equal(normalise({ outcome: 'win' }, TODAY).outcome, 'pending')
  })

  it('survives an empty object', () => {
    assert.doesNotThrow(() => normalise({}, TODAY))
  })
})
