/**
 * The tier limits exist twice — once for the UI, once for the deployed Cloud
 * Functions, which can't import across the deploy boundary. This test is the
 * thing that stops them drifting: if they disagree the app would advertise an
 * allowance the server refuses, which reads to a paying user as a broken app.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { TIERS as CLIENT_TIERS, TRIAL_HOURS as CLIENT_TRIAL, PLAN_IDS as CLIENT_PLANS } from '../config/plans.js'
import { TIERS as SERVER_TIERS, TRIAL_HOURS as SERVER_TRIAL, PLAN_IDS as SERVER_PLANS } from '../../functions/plans.js'

test('both copies define the same tiers', () => {
  assert.deepEqual(Object.keys(SERVER_TIERS).sort(), Object.keys(CLIENT_TIERS).sort())
})

test('tier limits match between client and functions', () => {
  for (const tier of Object.keys(CLIENT_TIERS)) {
    assert.deepEqual(
      SERVER_TIERS[tier].limits,
      CLIENT_TIERS[tier].limits,
      `limits for "${tier}" differ between src/config/plans.js and functions/plans.js`
    )
  }
})

test('the trial length matches', () => {
  assert.equal(SERVER_TRIAL, CLIENT_TRIAL)
})

test('the accepted plan ids match', () => {
  assert.deepEqual([...SERVER_PLANS].sort(), [...CLIENT_PLANS].sort())
})
