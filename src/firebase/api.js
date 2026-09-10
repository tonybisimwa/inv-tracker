/**
 * The client's side of the Cloud Functions.
 *
 * Every call goes through `call`, which turns a Firebase callable error into a
 * sentence worth showing someone. The default is not usable: an unhandled
 * callable rejection surfaces as "internal", which tells a user nothing and
 * tells us nothing either.
 */

import { httpsCallable } from 'firebase/functions'
import { functions } from './config'

/** Codes where the server wrote the message for the user, so pass it through. */
const TRUSTED_CODES = new Set([
  'functions/resource-exhausted',
  'functions/failed-precondition',
  'functions/invalid-argument',
  'functions/unavailable',
  'functions/permission-denied',
])

const FALLBACKS = {
  'functions/unauthenticated': 'Please sign in again.',
  'functions/deadline-exceeded': 'That took too long. Please try again.',
  'functions/internal': 'Something went wrong on our end. Please try again.',
}

export class ApiError extends Error {
  constructor(message, { code, details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

async function call(name, payload) {
  try {
    const result = await httpsCallable(functions, name)(payload)
    return result.data
  } catch (err) {
    const code = err?.code
    const message = TRUSTED_CODES.has(code) && err.message
      ? err.message
      : FALLBACKS[code] ?? 'Something went wrong. Please try again.'
    // Keep the original for the console; the user gets the readable version
    console.error(`[api] ${name} failed:`, err)
    throw new ApiError(message, { code, details: err?.details })
  }
}

/** Reads one slip. `image` is a data URL; `today` is the caller's local date so a
 *  slip with no visible year gets the right one. Returns { bet, remaining, tier }. */
export const scanSlipRemote = (image, today) => call('scanSlip', { image, today })

/** Returns { url } — a Stripe-hosted Checkout page to redirect to. */
export const createCheckoutSession = (plan) => call('createCheckoutSession', { plan })

/** Returns { url } — Stripe's billing portal, for self-serve cancel and card updates. */
export const createPortalSession = () => call('createPortalSession', {})

/** Grants the one-per-account 24-hour trial. Returns { until, untilMs }. */
export const startVipTrial = () => call('startVipTrial', {})

/** Irreversible. Deletes the profile, journal, subscription, and the login itself. */
export const deleteAccount = () => call('deleteAccount', { confirm: 'DELETE' })
