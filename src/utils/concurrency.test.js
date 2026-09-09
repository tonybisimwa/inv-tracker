import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapWithConcurrency } from './concurrency.js'

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))

test('returns results in input order, not completion order', async () => {
  const out = await mapWithConcurrency([30, 10, 20], 3, async (ms) => {
    await tick(ms)
    return ms
  })
  assert.deepEqual(out.map((r) => r.value), [30, 10, 20])
})

test('never exceeds the concurrency limit', async () => {
  let inFlight = 0
  let peak = 0
  await mapWithConcurrency(Array.from({ length: 12 }, (_, i) => i), 3, async () => {
    inFlight++
    peak = Math.max(peak, inFlight)
    await tick(5)
    inFlight--
  })
  assert.equal(peak, 3)
})

test('a limit above the item count spawns no idle workers', async () => {
  let peak = 0
  let inFlight = 0
  await mapWithConcurrency([1, 2], 10, async () => {
    inFlight++; peak = Math.max(peak, inFlight); await tick(5); inFlight--
  })
  assert.equal(peak, 2)
})

test('one failure does not abort the rest', async () => {
  const out = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
    if (n === 2) throw new Error('boom')
    return n
  })
  assert.deepEqual(out.map((r) => r.status), ['done', 'error', 'done'])
  assert.equal(out[1].reason.message, 'boom')
})

test('failures are recorded against the right index', async () => {
  const out = await mapWithConcurrency([0, 1, 2, 3, 4], 2, async (n) => {
    if (n % 2 === 1) throw new Error(`fail-${n}`)
    return n
  })
  assert.deepEqual(out.map((r) => r.status), ['done', 'error', 'done', 'error', 'done'])
  assert.equal(out[1].reason.message, 'fail-1')
  assert.equal(out[3].reason.message, 'fail-3')
})

test('every item fails without rejecting the batch', async () => {
  const out = await mapWithConcurrency([1, 2], 2, async () => { throw new Error('nope') })
  assert.deepEqual(out.map((r) => r.status), ['error', 'error'])
})

test('a non-Error throw is still captured', async () => {
  const out = await mapWithConcurrency([1], 1, async () => { throw 'just a string' })
  assert.equal(out[0].status, 'error')
  assert.equal(out[0].reason, 'just a string')
})

test('empty input resolves to an empty array', async () => {
  assert.deepEqual(await mapWithConcurrency([], 3, async () => 1), [])
})

test('a zero or negative limit still makes progress instead of deadlocking', async () => {
  assert.deepEqual((await mapWithConcurrency([1, 2], 0, async (n) => n)).map((r) => r.value), [1, 2])
  assert.deepEqual((await mapWithConcurrency([1, 2], -5, async (n) => n)).map((r) => r.value), [1, 2])
})

test('onStart fires once per item with its index', async () => {
  const started = []
  await mapWithConcurrency(['a', 'b', 'c'], 2, async () => tick(1), { onStart: (i) => started.push(i) })
  assert.deepEqual(started.sort(), [0, 1, 2])
})

test('onSettled fires once per item, including failures', async () => {
  const settled = []
  await mapWithConcurrency([1, 2, 3], 2, async (n) => {
    if (n === 2) throw new Error('x')
    return n
  }, { onSettled: (i, r) => settled.push([i, r.status]) })

  settled.sort((a, b) => a[0] - b[0])
  assert.deepEqual(settled, [[0, 'done'], [1, 'error'], [2, 'done']])
})

test('callbacks are optional', async () => {
  await assert.doesNotReject(mapWithConcurrency([1], 1, async (n) => n))
})

test('each item is visited exactly once', async () => {
  const seen = []
  await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async (n) => {
    await tick(1)
    seen.push(n)
  })
  assert.equal(seen.length, 20)
  assert.equal(new Set(seen).size, 20)
})

test('the mapper receives the item and its index', async () => {
  const pairs = []
  await mapWithConcurrency(['x', 'y'], 1, async (item, i) => { pairs.push([item, i]) })
  assert.deepEqual(pairs, [['x', 0], ['y', 1]])
})
