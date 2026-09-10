import test from 'node:test'
import assert from 'node:assert/strict'
import {
  expiryMs,
  isVipActive,
  isVipExpired,
  tierOf,
  entitlements,
  trialState,
  formatTimeLeft,
} from './entitlements.js'
import { TRIAL_HOURS, TIERS } from '../config/plans.js'

const NOW = Date.UTC(2026, 8, 9, 12, 0, 0) // 2026-09-09T12:00:00Z
const HOUR = 60 * 60 * 1000

test('expiryMs prefers the numeric mirror', () => {
  assert.equal(expiryMs({ vipUntilMs: 1234, vipUntil: '2030-01-01T00:00:00.000Z' }), 1234)
})

test('expiryMs falls back to parsing the ISO string for legacy profiles', () => {
  assert.equal(expiryMs({ vipUntil: '2026-09-10T00:00:00.000Z' }), Date.UTC(2026, 8, 10))
})

test('expiryMs returns null when nothing is recorded', () => {
  assert.equal(expiryMs({}), null)
  assert.equal(expiryMs({ vipUntil: null }), null)
})

// A corrupt date must not lock out a paying member — no expiry beats "expired"
test('expiryMs treats an unparseable date as no expiry', () => {
  assert.equal(expiryMs({ vipUntil: 'not a date' }), null)
  assert.equal(expiryMs({ vipUntilMs: NaN }), null)
})

test('isVipActive requires the flag', () => {
  assert.equal(isVipActive({ isVIP: false, vipUntilMs: NOW + HOUR }, NOW), false)
  assert.equal(isVipActive({}, NOW), false)
})

test('isVipActive honours the expiry date', () => {
  assert.equal(isVipActive({ isVIP: true, vipUntilMs: NOW + HOUR }, NOW), true)
  assert.equal(isVipActive({ isVIP: true, vipUntilMs: NOW - HOUR }, NOW), false)
})

test('isVipActive keeps a VIP with no expiry recorded', () => {
  assert.equal(isVipActive({ isVIP: true }, NOW), true)
})

// The boundary: expiry is exclusive, so the instant it lands the member is out
test('isVipActive is false exactly at the expiry instant', () => {
  assert.equal(isVipActive({ isVIP: true, vipUntilMs: NOW }, NOW), false)
})

test('isVipExpired distinguishes lapsed from never-subscribed', () => {
  assert.equal(isVipExpired({ isVIP: true, vipUntilMs: NOW - HOUR }, NOW), true)
  assert.equal(isVipExpired({ isVIP: true, vipUntilMs: NOW + HOUR }, NOW), false)
  assert.equal(isVipExpired({ isVIP: false }, NOW), false)
})

test('tierOf maps an active VIP to vip and everyone else to standard', () => {
  assert.equal(tierOf({ isVIP: true, vipUntilMs: NOW + HOUR }, NOW), 'vip')
  assert.equal(tierOf({ isVIP: true, vipUntilMs: NOW - HOUR }, NOW), 'standard')
  assert.equal(tierOf({}, NOW), 'standard')
})

test('entitlements gates batch scanning on the tier', () => {
  const free = entitlements({}, NOW)
  assert.equal(free.tier, 'standard')
  assert.equal(free.slipsPerScan, 1)
  assert.equal(free.canBatchScan, false)

  const vip = entitlements({ isVIP: true }, NOW)
  assert.equal(vip.tier, 'vip')
  assert.equal(vip.slipsPerScan, TIERS.vip.limits.slipsPerScan)
  assert.equal(vip.canBatchScan, true)
})

test('entitlements exposes the daily quota for both tiers', () => {
  assert.equal(entitlements({}, NOW).scansPerDay, TIERS.standard.limits.scansPerDay)
  assert.equal(entitlements({ isVIP: true }, NOW).scansPerDay, TIERS.vip.limits.scansPerDay)
})

test('trialState offers a trial to a brand new account', () => {
  const t = trialState({}, NOW)
  assert.equal(t.eligible, true)
  assert.equal(t.used, false)
  assert.equal(t.active, false)
})

test('trialState reports an in-flight trial with time remaining', () => {
  const startedAt = NOW - 2 * HOUR
  const t = trialState({ trialStartedAt: startedAt, isVIP: true, vipPlan: 'trial' }, NOW)
  assert.equal(t.active, true)
  assert.equal(t.used, true)
  assert.equal(t.eligible, false)
  assert.equal(t.endsAt, startedAt + TRIAL_HOURS * HOUR)
  assert.equal(t.hoursLeft, TRIAL_HOURS - 2)
})

test('trialState never re-offers a trial once it has been taken', () => {
  const spent = { trialStartedAt: NOW - 100 * HOUR, isVIP: false, vipPlan: null }
  const t = trialState(spent, NOW)
  assert.equal(t.used, true)
  assert.equal(t.active, false)
  assert.equal(t.eligible, false)
})

// Someone who paid without trialling, then cancelled, has had their value
test('trialState does not offer a trial to a returning subscriber', () => {
  const t = trialState({ stripeCustomerId: 'cus_123', isVIP: false }, NOW)
  assert.equal(t.eligible, false)
})

// A paid subscription must not be mistaken for a trial about to lapse
test('trialState does not treat a paid plan as an active trial', () => {
  const t = trialState({ trialStartedAt: NOW - HOUR, isVIP: true, vipPlan: 'monthly' }, NOW)
  assert.equal(t.active, false)
  assert.equal(t.used, true)
})

test('formatTimeLeft switches from hours to minutes near the end', () => {
  assert.equal(formatTimeLeft(5 * HOUR), '5 hours left')
  assert.equal(formatTimeLeft(90 * 60 * 1000), '1 hour left')
  assert.equal(formatTimeLeft(30 * 60 * 1000), '30 minutes left')
  assert.equal(formatTimeLeft(60 * 1000), '1 minute left')
  assert.equal(formatTimeLeft(0), 'expired')
  assert.equal(formatTimeLeft(-1), 'expired')
})
