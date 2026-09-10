/**
 * Server-side mirror of the tier limits in src/config/plans.js.
 *
 * It is duplicated rather than imported because `firebase deploy` uploads only
 * this directory — `../src` does not exist in the deployed bundle, so a relative
 * import across the boundary would resolve in dev and fail in production.
 *
 * Drift here would mean the UI promising an allowance the server refuses, so
 * src/utils/planParity.test.js asserts the two copies agree. Change both.
 */

export const TRIAL_HOURS = 24

export const TIERS = {
  standard: { limits: { slipsPerScan: 1, scansPerDay: 5 } },
  vip: { limits: { slipsPerScan: 20, scansPerDay: 150 } },
}

export const PLAN_IDS = ['weekly', 'monthly', 'yearly']

export const limitsFor = (tier) => (TIERS[tier] ?? TIERS.standard).limits

/**
 * Whether a stored profile currently counts as VIP. Mirrors
 * src/utils/entitlements.js#isVipActive, including its bias: an expiry we can't
 * read is treated as no expiry, so a malformed field can't lock out a payer.
 */
export function isVipActive(profile = {}, now = Date.now()) {
  if (profile.isVIP !== true) return false
  const until = typeof profile.vipUntilMs === 'number' && Number.isFinite(profile.vipUntilMs)
    ? profile.vipUntilMs
    : null
  return until === null || now < until
}

export const tierOf = (profile, now = Date.now()) => (isVipActive(profile, now) ? 'vip' : 'standard')
