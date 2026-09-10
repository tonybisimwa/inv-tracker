/**
 * Billing API-shape adapters.
 *
 * Both functions under test exist for one reason: Stripe has relocated these two
 * fields between API versions, and reading only one shape fails *silently*. The
 * symptom isn't an exception — it's `null`, which downstream turns into "grant a
 * day and hope the next event corrects it" or, for a renewal invoice, into no
 * grant at all. Members lose access and nothing logs an error.
 *
 * So these are pinned. If a Stripe upgrade moves either field again, this suite
 * fails at build time instead of in production a month later.
 *
 * Runs with the rest of the functions suite:
 *   npm run test:functions
 *
 * The emulator env is set before the import because shared.js calls
 * initializeApp() at module load. Nothing here touches Firestore — importing
 * billing.js just drags the Admin SDK along with it.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.GCLOUD_PROJECT ??= 'statline-functions-test'

const { periodEndMs, subscriptionIdFromInvoice } = await import('./billing.js')

describe('periodEndMs', () => {
  it('reads the period end off the subscription', () => {
    assert.equal(periodEndMs({ current_period_end: 1_700_000_000 }), 1_700_000_000_000)
  })

  it('falls back to the subscription item, where newer versions put it', () => {
    const subscription = { items: { data: [{ current_period_end: 1_700_000_000 }] } }
    assert.equal(periodEndMs(subscription), 1_700_000_000_000)
  })

  it('prefers the subscription when both are present', () => {
    const subscription = {
      current_period_end: 1_700_000_000,
      items: { data: [{ current_period_end: 1_600_000_000 }] },
    }
    assert.equal(periodEndMs(subscription), 1_700_000_000_000)
  })

  it('returns null when neither shape carries it', () => {
    assert.equal(periodEndMs({}), null)
    assert.equal(periodEndMs({ items: { data: [] } }), null)
    assert.equal(periodEndMs({ items: {} }), null)
  })

  // A string would sail through arithmetic and produce a plausible-looking
  // timestamp, so the guard is Number.isFinite and not a truthiness check.
  it('treats a non-numeric value as missing', () => {
    assert.equal(periodEndMs({ current_period_end: '1700000000' }), null)
    assert.equal(periodEndMs({ current_period_end: null }), null)
  })
})

describe('subscriptionIdFromInvoice', () => {
  it('reads the legacy top-level field', () => {
    assert.equal(subscriptionIdFromInvoice({ subscription: 'sub_123' }), 'sub_123')
  })

  it('reads it when expanded into an object', () => {
    assert.equal(subscriptionIdFromInvoice({ subscription: { id: 'sub_123' } }), 'sub_123')
  })

  it('reads the current nested shape', () => {
    const invoice = { parent: { subscription_details: { subscription: 'sub_456' } } }
    assert.equal(subscriptionIdFromInvoice(invoice), 'sub_456')
  })

  it('reads the nested shape when expanded', () => {
    const invoice = { parent: { subscription_details: { subscription: { id: 'sub_456' } } } }
    assert.equal(subscriptionIdFromInvoice(invoice), 'sub_456')
  })

  // One-off invoices are a real event we receive and must ignore rather than
  // throw on — a 500 here would make Stripe retry a payload that can never work.
  it('returns null for an invoice that is not for a subscription', () => {
    assert.equal(subscriptionIdFromInvoice({ id: 'in_1', parent: null }), null)
    assert.equal(subscriptionIdFromInvoice({ id: 'in_1' }), null)
    assert.equal(subscriptionIdFromInvoice({ parent: { subscription_details: {} } }), null)
  })

  it('survives a missing or malformed invoice', () => {
    assert.equal(subscriptionIdFromInvoice(undefined), null)
    assert.equal(subscriptionIdFromInvoice(null), null)
    assert.equal(subscriptionIdFromInvoice({ subscription: 42 }), null)
    assert.equal(subscriptionIdFromInvoice({ subscription: {} }), null)
  })
})
