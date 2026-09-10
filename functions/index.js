/**
 * Statline's server side.
 *
 * Three things live here that cannot live in the browser:
 *   1. The OpenAI key, and the scan allowance that protects the bill.
 *   2. Stripe's secret key, and the webhook that grants VIP without an admin.
 *   3. Deleting an Auth record, which no client is permitted to do.
 *
 * Deploy: firebase deploy --only functions
 * Secrets: firebase functions:secrets:set OPENAI_API_KEY   (and STRIPE_SECRET_KEY,
 *          STRIPE_WEBHOOK_SECRET). Non-secret params live in functions/.env.
 */

import { setGlobalOptions } from 'firebase-functions/v2'

// us-central1 matches the Firestore location, so reads don't cross regions.
// maxInstances caps the blast radius of a runaway loop on a metered plan.
setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

export { scanSlip } from './scan.js'
export { createCheckoutSession, createPortalSession, startVipTrial, stripeWebhook } from './billing.js'
export { deleteAccount } from './account.js'
