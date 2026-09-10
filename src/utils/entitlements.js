/**
 * Resolves a stored user profile into "what is this person allowed to do".
 *
 * Kept pure and separate from AuthContext so it can be unit-tested and so the
 * trial, the paywall, and the scanner gate all answer from the same function
 * instead of three near-identical inline checks.
 *
 * None of this is a security boundary. Firestore rules decide what a client can
 * read, and the Cloud Functions decide what it can spend. This is the UI's copy
 * of the same truth, so the interface agrees with the server instead of showing
 * a button that is about to be refused.
 */

// Extension is explicit because `npm test` runs this under bare Node, whose ESM
// loader won't guess it the way Vite's resolver does.
import { TRIAL_HOURS, limitsFor } from '../config/plans.js'

const HOUR_MS = 60 * 60 * 1000

/**
 * Expiry as epoch millis, or null for "no expiry recorded".
 *
 * `vipUntilMs` is written alongside `vipUntil` because security rules can't parse
 * an ISO string. Profiles written before the mirror existed only have the string,
 * so fall back to parsing it — and treat an unparseable value as no expiry rather
 * than as expired, so a bad field can't lock a paying member out.
 */
export function expiryMs(profile = {}) {
  if (typeof profile.vipUntilMs === 'number' && Number.isFinite(profile.vipUntilMs)) {
    return profile.vipUntilMs
  }
  if (typeof profile.vipUntil === 'string') {
    const t = new Date(profile.vipUntil).getTime()
    return Number.isFinite(t) ? t : null
  }
  return null
}

/** VIP flag set and not lapsed. Trials set the same fields, so they pass through here too. */
export function isVipActive(profile = {}, now = Date.now()) {
  if (profile.isVIP !== true) return false
  const until = expiryMs(profile)
  return until === null || now < until
}

/** True when the flag is set but the date has passed — worth a distinct "renew" prompt. */
export function isVipExpired(profile = {}, now = Date.now()) {
  if (profile.isVIP !== true) return false
  const until = expiryMs(profile)
  return until !== null && now >= until
}

export function tierOf(profile = {}, now = Date.now()) {
  return isVipActive(profile, now) ? 'vip' : 'standard'
}

/** The resolved limits for a profile — what the scanner and quota copy read. */
export function entitlements(profile = {}, now = Date.now()) {
  const tier = tierOf(profile, now)
  const limits = limitsFor(tier)
  return {
    tier,
    ...limits,
    canBatchScan: limits.slipsPerScan > 1,
  }
}

/**
 * Trial status for the CTA.
 *
 * `trialStartedAt` is written once, by a Cloud Function, and is a privileged
 * field in the rules — a client that could clear it could take a new trial every
 * day. So "used" is permanent, which is what makes one-per-account stick.
 *
 * A profile that has ever been VIP is not offered a trial either: that covers
 * someone who subscribed without trialling and later cancelled.
 */
export function trialState(profile = {}, now = Date.now()) {
  const startedAt = typeof profile.trialStartedAt === 'number' && Number.isFinite(profile.trialStartedAt)
    ? profile.trialStartedAt
    : null
  const used = startedAt !== null
  const endsAt = startedAt === null ? null : startedAt + TRIAL_HOURS * HOUR_MS
  const active = endsAt !== null && now < endsAt && profile.vipPlan === 'trial'
  const msLeft = active ? endsAt - now : 0

  return {
    used,
    active,
    endsAt,
    msLeft,
    hoursLeft: Math.ceil(msLeft / HOUR_MS),
    // Never subscribed and never trialled — the only state that earns a free day
    eligible: !used && !profile.isVIP && !profile.stripeCustomerId,
  }
}

/** "3 hours left" / "42 minutes left" — for the trial banner. */
export function formatTimeLeft(msLeft) {
  if (!(msLeft > 0)) return 'expired'
  const mins = Math.ceil(msLeft / 60000)
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} left`
  const hours = Math.floor(mins / 60)
  return `${hours} hour${hours === 1 ? '' : 's'} left`
}
