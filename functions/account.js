import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import Stripe from 'stripe'
import { db, userRef, adminAuth, requireAuth, getProfile, STRIPE_SECRET_KEY } from './shared.js'

/**
 * Deletes the caller's account and everything attached to it.
 *
 * This has to exist server-side: a client can delete its own Firestore documents
 * but not its Auth record, so a client-only "delete account" leaves the login
 * alive. Both app stores require a real one, and so does GDPR/CCPA erasure.
 *
 * Only ever acts on `request.auth.uid`, so there is no uid parameter to tamper with.
 */
export const deleteAccount = onCall(
  { secrets: [STRIPE_SECRET_KEY], timeoutSeconds: 300, cors: true },
  async (request) => {
    const uid = requireAuth(request)

    // Deleting the login is the irreversible half. Confirming here keeps a
    // mis-wired button from wiping an account on a stray click.
    if (request.data?.confirm !== 'DELETE') {
      throw new HttpsError('invalid-argument', 'Type DELETE to confirm.')
    }

    const profile = await getProfile(uid)

    // Stop the billing first. If the rest fails we'd rather have cancelled a
    // subscription than keep charging a user whose data is on its way out.
    if (profile.stripeSubscriptionId) {
      try {
        await new Stripe(STRIPE_SECRET_KEY.value()).subscriptions.cancel(profile.stripeSubscriptionId)
      } catch (err) {
        // Already cancelled, or Stripe is down — neither should block erasure
        logger.warn('could not cancel subscription during account deletion', { uid, err: err.message })
      }
    }

    // recursiveDelete takes the bets and usage subcollections with it; deleting
    // the parent document alone would orphan them, still readable by their paths.
    await db.recursiveDelete(userRef(uid))
    await adminAuth.deleteUser(uid)

    logger.info('account deleted', { uid })
    return { deleted: true }
  }
)
