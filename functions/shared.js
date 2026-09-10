import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { HttpsError } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'

// Functions share a process across invocations, so guard against a second init
if (getApps().length === 0) initializeApp()

export const db = getFirestore()
export const adminAuth = getAuth()

export const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY')
export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
export const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')

/** Where Checkout returns the user. Configured, not taken from the request —
 *  echoing a caller-supplied origin back into a redirect is an open redirect. */
export const APP_URL = defineString('APP_URL', { default: 'https://inv-tracker-e2e40.web.app' })

export const STRIPE_PRICES = {
  weekly: defineString('STRIPE_PRICE_WEEKLY', { default: '' }),
  monthly: defineString('STRIPE_PRICE_MONTHLY', { default: '' }),
  yearly: defineString('STRIPE_PRICE_YEARLY', { default: '' }),
}

export const userRef = (uid) => db.collection('users').doc(uid)

export function requireAuth(request) {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to continue.')
  return uid
}

export async function getProfile(uid) {
  const snap = await userRef(uid).get()
  return snap.exists ? snap.data() : {}
}

/**
 * The only place VIP is granted. Writes both the ISO string (for display) and
 * the epoch mirror (because security rules can't parse a date string), so the
 * two can never disagree.
 *
 * `untilMs === null` means open-ended, which no paid path uses — every grant here
 * carries an expiry so a missed cancellation webhook can't hand out access forever.
 */
export async function grantVip(uid, { plan, untilMs, extra = {} }) {
  await userRef(uid).set(
    {
      isVIP: true,
      vipPlan: plan,
      vipUntil: untilMs === null ? null : new Date(untilMs).toISOString(),
      vipUntilMs: untilMs,
      ...extra,
    },
    { merge: true }
  )
}

export async function revokeVip(uid, extra = {}) {
  await userRef(uid).set(
    { isVIP: false, vipPlan: null, vipUntil: null, vipUntilMs: null, ...extra },
    { merge: true }
  )
}
