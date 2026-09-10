import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import Stripe from 'stripe'
import {
  db,
  userRef,
  requireAuth,
  getProfile,
  grantVip,
  revokeVip,
  APP_URL,
  STRIPE_PRICES,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
} from './shared.js'
import { PLAN_IDS, TRIAL_HOURS } from './plans.js'

/**
 * A few hours of slack past the paid period.
 *
 * Renewal webhooks can arrive minutes late, and a member who has genuinely paid
 * should not watch their access blink out while Stripe catches up. Cancellations
 * revoke immediately regardless, so this can't extend access for someone who left.
 */
const GRACE_MS = 6 * 60 * 60 * 1000

const stripeClient = () => new Stripe(STRIPE_SECRET_KEY.value())

/** Stripe moved the period end onto the subscription item; older API versions
 *  keep it on the subscription. Read whichever this account's version returns. */
function periodEndMs(subscription) {
  const secs = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end
  return Number.isFinite(secs) ? secs * 1000 : null
}

function priceIdFor(plan) {
  const id = STRIPE_PRICES[plan]?.value()
  if (!id) {
    throw new HttpsError('failed-precondition', `The ${plan} plan isn't set up yet. Try another plan.`)
  }
  return id
}

/** Finds the caller's Stripe customer, creating one the first time. */
async function customerFor(stripe, uid, profile, email) {
  if (profile.stripeCustomerId) return profile.stripeCustomerId
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    // Lets the webhook resolve a customer back to a user even if metadata on the
    // subscription is missing, and makes the Stripe dashboard navigable.
    metadata: { uid, username: profile.username ?? '' },
  })
  await userRef(uid).set({ stripeCustomerId: customer.id }, { merge: true })
  return customer.id
}

/**
 * Opens a Stripe Checkout session.
 *
 * Payment method types are deliberately not pinned. Left to Stripe, Checkout
 * offers whatever the shopper can actually use — card, Apple Pay, Google Pay,
 * Link, and local methods — which is the whole point of "easy for anyone to pay".
 * Pinning `card` would switch most of those off.
 */
export const createCheckoutSession = onCall(
  { secrets: [STRIPE_SECRET_KEY], cors: true },
  async (request) => {
    const uid = requireAuth(request)
    const plan = request.data?.plan
    if (!PLAN_IDS.includes(plan)) {
      throw new HttpsError('invalid-argument', 'Pick one of the available plans.')
    }

    const stripe = stripeClient()
    const profile = await getProfile(uid)
    const customer = await customerFor(stripe, uid, profile, request.auth.token?.email)
    const base = APP_URL.value().replace(/\/$/, '')

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price: priceIdFor(plan), quantity: 1 }],
      // Both of these carry the uid so the webhook never has to guess who paid
      client_reference_id: uid,
      subscription_data: { metadata: { uid, plan } },
      metadata: { uid, plan },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${base}/vip?checkout=success`,
      cancel_url: `${base}/vip?checkout=cancelled`,
    })

    return { url: session.url }
  }
)

/** The self-serve cancel and card-update surface. Hosted by Stripe, so there is
 *  no billing UI to build and no support ticket to answer. */
export const createPortalSession = onCall(
  { secrets: [STRIPE_SECRET_KEY], cors: true },
  async (request) => {
    const uid = requireAuth(request)
    const profile = await getProfile(uid)
    if (!profile.stripeCustomerId) {
      throw new HttpsError('failed-precondition', 'There is no subscription on this account yet.')
    }
    const stripe = stripeClient()
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${APP_URL.value().replace(/\/$/, '')}/settings`,
    })
    return { url: session.url }
  }
)

/**
 * The one-day trial.
 *
 * `trialStartedAt` is written here and is a privileged field in the security
 * rules, so a client can't clear it and take another. That single write-once
 * field is what makes "one trial per account" hold.
 *
 * A transaction, not a read-then-write: two taps in quick succession would
 * otherwise both see an empty field and both grant a day.
 */
export const startVipTrial = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request)
  const now = Date.now()
  const untilMs = now + TRIAL_HOURS * 60 * 60 * 1000

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef(uid))
    const profile = snap.exists ? snap.data() : {}

    if (profile.trialStartedAt) {
      throw new HttpsError('failed-precondition', "You've already used your free trial.")
    }
    if (profile.isVIP === true) {
      throw new HttpsError('failed-precondition', 'You already have VIP access.')
    }
    if (profile.stripeCustomerId) {
      throw new HttpsError('failed-precondition', 'Trials are for new accounts only.')
    }

    tx.set(
      userRef(uid),
      {
        isVIP: true,
        vipPlan: 'trial',
        vipUntil: new Date(untilMs).toISOString(),
        vipUntilMs: untilMs,
        trialStartedAt: now,
      },
      { merge: true }
    )
  })

  logger.info('trial started', { uid })
  return { until: new Date(untilMs).toISOString(), untilMs }
})

/** Resolves a Stripe object back to a Statline user. */
async function resolveUid(stripe, { uid, customerId }) {
  if (uid) return uid
  if (!customerId) return null

  const found = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get()
  if (!found.empty) return found.docs[0].id

  // Last resort: the uid we stamped on the customer at creation
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return customer?.metadata?.uid ?? null
  } catch {
    return null
  }
}

// Statuses that should keep the paywall open. `past_due` stays in: Stripe is
// still retrying the card, and cutting a member off mid-retry loses the renewal.
const ENTITLED = new Set(['active', 'trialing', 'past_due'])

async function applySubscription(stripe, subscription) {
  const uid = await resolveUid(stripe, {
    uid: subscription.metadata?.uid,
    customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
  })
  if (!uid) {
    logger.error('subscription event with no matching user', { subscription: subscription.id })
    return
  }

  const plan = subscription.metadata?.plan ?? 'monthly'
  const endMs = periodEndMs(subscription)
  const shared = {
    stripeSubscriptionId: subscription.id,
    stripeStatus: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
  }

  if (ENTITLED.has(subscription.status)) {
    // No period end means we can't tell when access should stop. Give a day
    // rather than forever, and let the next event correct it.
    const untilMs = endMs === null ? Date.now() + 24 * 60 * 60 * 1000 : endMs + GRACE_MS
    await grantVip(uid, { plan, untilMs, extra: shared })
    logger.info('vip granted', { uid, plan, status: subscription.status })
  } else {
    await revokeVip(uid, shared)
    logger.info('vip revoked', { uid, status: subscription.status })
  }
}

/**
 * Stripe's webhook. This is what makes VIP self-serve — the old flow had users
 * paste a transaction ID and wait up to 24 hours for an admin to approve it.
 *
 * The signature is verified against the raw body, so the payload can't be forged;
 * without that check anyone could POST themselves a subscription.
 */
export const stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], cors: false },
  async (req, res) => {
    const stripe = stripeClient()
    let event

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers['stripe-signature'],
        STRIPE_WEBHOOK_SECRET.value()
      )
    } catch (err) {
      logger.warn('rejected webhook signature', { err: err.message })
      res.status(400).send(`Signature verification failed: ${err.message}`)
      return
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription)
            // The session knows the uid even when the subscription's metadata
            // was set by some other route, so prefer it
            subscription.metadata = {
              uid: session.client_reference_id ?? subscription.metadata?.uid,
              plan: session.metadata?.plan ?? subscription.metadata?.plan,
            }
            await applySubscription(stripe, subscription)
          }
          break
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await applySubscription(stripe, event.data.object)
          break
        default:
          // Everything else is noise for our purposes; acknowledge so Stripe
          // stops retrying it.
          break
      }
      res.status(200).json({ received: true })
    } catch (err) {
      // A 500 makes Stripe retry, which is what we want for a transient failure.
      // Every write above is an idempotent merge, so a replay is harmless.
      logger.error('webhook handler failed', { type: event.type, err: err.message })
      res.status(500).send('Handler failed')
    }
  }
)
