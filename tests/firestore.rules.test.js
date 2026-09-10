/**
 * Security rules tests.
 *
 * These are the only tests that cover a real trust boundary. Everything the
 * paywall and the billing model rest on is enforced in firestore.rules, and up
 * to now none of it had ever been executed — the rules were reviewed by reading
 * them, which is not the same thing.
 *
 * Requires a JDK and the emulator:
 *   npm run test:rules
 *
 * Note on writing fixtures: seeding uses withSecurityRulesDisabled, because the
 * documents under test are ones no client is allowed to create. Seeding through
 * a normal context would only prove the rules block the seed.
 */

import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, it } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore'

const ALICE = 'alice'
const BOB = 'bob'
const ADMIN = 'admin-user'

let env

/** A far-future and a long-past epoch-millis, for VIP expiry. */
const FUTURE = Date.now() + 30 * 24 * 60 * 60 * 1000
const PAST = Date.now() - 30 * 24 * 60 * 60 * 1000

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'statline-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

after(async () => { await env?.cleanup() })

/** Fresh data for every test, so one test's writes can't satisfy another's read. */
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users', ALICE), { username: 'alice', isAdmin: false, isVIP: false })
    await setDoc(doc(db, 'users', BOB), { username: 'bob', isAdmin: false, isVIP: false })
    await setDoc(doc(db, 'users', ADMIN), { username: 'admin', isAdmin: true })
    await setDoc(doc(db, 'users', ALICE, 'bets', 'bet1'), { pick: 'Lakers -3', stake: 10 })
    await setDoc(doc(db, 'users', ALICE, 'usage', 'scans'), { recent: [Date.now()], limit: 5 })
    await setDoc(doc(db, 'plays', 'free1'), { tier: 'free', pick: 'Over 210' })
    await setDoc(doc(db, 'plays', 'vip1'), { tier: 'vip', pick: 'Celtics ML' })
    await setDoc(doc(db, 'settings', 'tipster'), { tipsterName: 'Statline', statsVisible: true })
  })
})

/** Marks a user VIP, optionally with an expiry. */
async function makeVip(uid, vipUntilMs) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), { isVIP: true, vipUntilMs }, { merge: true })
  })
}

const asAlice = () => env.authenticatedContext(ALICE).firestore()
const asBob = () => env.authenticatedContext(BOB).firestore()
const asAdmin = () => env.authenticatedContext(ADMIN).firestore()
const asAnon = () => env.unauthenticatedContext().firestore()

// ── Profiles ────────────────────────────────────────────────────────────────

describe('user profiles', () => {
  it('lets an owner read their own profile', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), 'users', ALICE)))
  })

  it("blocks reading someone else's profile", async () => {
    await assertFails(getDoc(doc(asBob(), 'users', ALICE)))
  })

  it('lets an admin read any profile', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), 'users', ALICE)))
  })

  it('blocks an anonymous read', async () => {
    await assertFails(getDoc(doc(asAnon(), 'users', ALICE)))
  })

  it('lets an owner edit ordinary fields', async () => {
    await assertSucceeds(updateDoc(doc(asAlice(), 'users', ALICE), { bankroll: 1000, unitSize: 10 }))
  })

  it('lets an owner record lesson progress', async () => {
    await assertSucceeds(updateDoc(doc(asAlice(), 'users', ALICE), { lessonsRead: ['bankroll'] }))
  })
})

// ── Privilege escalation: the whole point of privilegedFields() ─────────────

describe('privilege escalation', () => {
  // Each of these is a way to grant yourself something you did not pay for.
  const attacks = {
    isAdmin: { isAdmin: true },
    isVIP: { isVIP: true },
    vipPlan: { vipPlan: 'yearly' },
    vipUntil: { vipUntil: '2099-01-01T00:00:00.000Z' },
    vipUntilMs: { vipUntilMs: FUTURE },
    trialStartedAt: { trialStartedAt: null },
    stripeCustomerId: { stripeCustomerId: 'cus_stolen' },
    stripeSubscriptionId: { stripeSubscriptionId: 'sub_stolen' },
    stripeStatus: { stripeStatus: 'active' },
    cancelAtPeriodEnd: { cancelAtPeriodEnd: false },
  }

  for (const [field, patch] of Object.entries(attacks)) {
    it(`denies an owner writing ${field}`, async () => {
      await assertFails(updateDoc(doc(asAlice(), 'users', ALICE), patch))
    })
  }

  it('denies a privileged field smuggled in beside a legitimate one', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'users', ALICE), { bankroll: 500, isVIP: true }))
  })

  it('denies clearing trialStartedAt to take a second trial', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), { trialStartedAt: PAST }, { merge: true })
    })
    await assertFails(updateDoc(doc(asAlice(), 'users', ALICE), { trialStartedAt: null }))
  })

  it('lets an admin grant VIP', async () => {
    await assertSucceeds(updateDoc(doc(asAdmin(), 'users', ALICE), { isVIP: true, vipUntilMs: FUTURE }))
  })

  it('lets an admin revoke VIP', async () => {
    await makeVip(ALICE, FUTURE)
    await assertSucceeds(updateDoc(doc(asAdmin(), 'users', ALICE), { isVIP: false }))
  })
})

describe('profile creation', () => {
  const NEW = 'newcomer'
  const asNew = () => env.authenticatedContext(NEW).firestore()

  it('allows an unprivileged create', async () => {
    await assertSucceeds(setDoc(doc(asNew(), 'users', NEW), { username: 'newcomer' }))
  })

  it('allows an explicit isVIP: false', async () => {
    await assertSucceeds(setDoc(doc(asNew(), 'users', NEW), { username: 'n', isVIP: false, isAdmin: false }))
  })

  it('denies creating yourself as admin', async () => {
    await assertFails(setDoc(doc(asNew(), 'users', NEW), { username: 'n', isAdmin: true }))
  })

  it('denies creating yourself as VIP', async () => {
    await assertFails(setDoc(doc(asNew(), 'users', NEW), { username: 'n', isVIP: true }))
  })

  it("denies creating a profile at someone else's uid", async () => {
    await assertFails(setDoc(doc(asNew(), 'users', BOB), { username: 'impostor' }))
  })
})

// ── The journal ─────────────────────────────────────────────────────────────

describe('bet journal', () => {
  it('lets the owner read their bets', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), 'users', ALICE, 'bets', 'bet1')))
  })

  it('lets the owner write a bet', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), 'users', ALICE, 'bets', 'bet2'), { pick: 'Under 44' }))
  })

  it("blocks another user from reading someone's bets", async () => {
    await assertFails(getDoc(doc(asBob(), 'users', ALICE, 'bets', 'bet1')))
  })

  // The privacy claim in the README is that the journal is private to the user,
  // admins included. If this ever passes, that claim is false.
  it('blocks even an admin from reading a journal', async () => {
    await assertFails(getDoc(doc(asAdmin(), 'users', ALICE, 'bets', 'bet1')))
  })
})

// ── The scan allowance ──────────────────────────────────────────────────────

describe('scan allowance', () => {
  it('lets the owner read their own quota', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), 'users', ALICE, 'usage', 'scans')))
  })

  // This is what stands between a stolen session and an unbounded OpenAI bill.
  it('denies the owner writing their own quota', async () => {
    await assertFails(setDoc(doc(asAlice(), 'users', ALICE, 'usage', 'scans'), { recent: [], limit: 9999 }))
  })

  it('denies the owner clearing their quota', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'users', ALICE, 'usage', 'scans'), { recent: [] }))
  })

  it('denies deleting the quota document', async () => {
    await assertFails(deleteDoc(doc(asAlice(), 'users', ALICE, 'usage', 'scans')))
  })

  it('denies an admin writing it too — only the Admin SDK may', async () => {
    await assertFails(setDoc(doc(asAdmin(), 'users', ALICE, 'usage', 'scans'), { limit: 9999 }))
  })

  it("blocks reading another user's quota", async () => {
    await assertFails(getDoc(doc(asBob(), 'users', ALICE, 'usage', 'scans')))
  })
})

// ── The paywall ─────────────────────────────────────────────────────────────

describe('plays paywall', () => {
  it('lets a non-VIP read a free play', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), 'plays', 'free1')))
  })

  it('denies a non-VIP reading a VIP play', async () => {
    await assertFails(getDoc(doc(asAlice(), 'plays', 'vip1')))
  })

  it('denies an anonymous read of even a free play', async () => {
    await assertFails(getDoc(doc(asAnon(), 'plays', 'free1')))
  })

  it('lets an active VIP read a VIP play', async () => {
    await makeVip(ALICE, FUTURE)
    await assertSucceeds(getDoc(doc(asAlice(), 'plays', 'vip1')))
  })

  it('lets an admin read a VIP play', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), 'plays', 'vip1')))
  })

  // The expiry check is the reason vipUntilMs exists at all.
  it('denies a lapsed VIP', async () => {
    await makeVip(ALICE, PAST)
    await assertFails(getDoc(doc(asAlice(), 'plays', 'vip1')))
  })

  it('allows a VIP with no expiry recorded (legacy profiles)', async () => {
    await makeVip(ALICE, null)
    await assertSucceeds(getDoc(doc(asAlice(), 'plays', 'vip1')))
  })

  it('denies a non-admin publishing a play', async () => {
    await assertFails(setDoc(doc(asAlice(), 'plays', 'mine'), { tier: 'free', pick: 'x' }))
  })

  it('denies a VIP publishing a play', async () => {
    await makeVip(ALICE, FUTURE)
    await assertFails(setDoc(doc(asAlice(), 'plays', 'mine'), { tier: 'free', pick: 'x' }))
  })

  it('lets an admin publish', async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), 'plays', 'new1'), { tier: 'vip', pick: 'Heat +4' }))
  })
})

/**
 * Rules filter the result set, not documents: a query that *could* match an
 * unreadable document is rejected whole. This is why PlaysContext runs two
 * separate tier-filtered listeners instead of one unfiltered query, and it's
 * the failure mode most likely to be reintroduced by someone "simplifying" it.
 */
describe('plays queries', () => {
  it('rejects an unfiltered collection query for a non-VIP', async () => {
    await assertFails(getDocs(collection(asAlice(), 'plays')))
  })

  it('allows the tier == free query for a non-VIP', async () => {
    await assertSucceeds(getDocs(query(collection(asAlice(), 'plays'), where('tier', '==', 'free'))))
  })

  it('rejects the tier == vip query for a non-VIP', async () => {
    await assertFails(getDocs(query(collection(asAlice(), 'plays'), where('tier', '==', 'vip'))))
  })

  it('allows the tier == vip query for an active VIP', async () => {
    await makeVip(ALICE, FUTURE)
    await assertSucceeds(getDocs(query(collection(asAlice(), 'plays'), where('tier', '==', 'vip'))))
  })
})

// ── Settings and legacy VIP requests ───────────────────────────────────────

describe('tipster settings', () => {
  it('lets any signed-in user read the public record', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), 'settings', 'tipster')))
  })

  it('denies an anonymous read', async () => {
    await assertFails(getDoc(doc(asAnon(), 'settings', 'tipster')))
  })

  it('denies a non-admin writing settings', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'settings', 'tipster'), { tipsterName: 'hacked' }))
  })

  it('lets an admin write settings', async () => {
    await assertSucceeds(updateDoc(doc(asAdmin(), 'settings', 'tipster'), { statsVisible: false }))
  })
})

describe('vipRequests (legacy)', () => {
  it('lets a user open a pending request for themselves', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), 'vipRequests', 'r1'), { uid: ALICE, status: 'pending' }))
  })

  it('denies pre-approving your own request', async () => {
    await assertFails(setDoc(doc(asAlice(), 'vipRequests', 'r2'), { uid: ALICE, status: 'approved' }))
  })

  it("denies opening a request in someone else's name", async () => {
    await assertFails(setDoc(doc(asAlice(), 'vipRequests', 'r3'), { uid: BOB, status: 'pending' }))
  })

  it('denies a user approving their own request after the fact', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'vipRequests', 'r4'), { uid: ALICE, status: 'pending' })
    })
    await assertFails(updateDoc(doc(asAlice(), 'vipRequests', 'r4'), { status: 'approved' }))
  })

  it('lets an admin approve a request', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'vipRequests', 'r5'), { uid: ALICE, status: 'pending' })
    })
    await assertSucceeds(updateDoc(doc(asAdmin(), 'vipRequests', 'r5'), { status: 'approved' }))
  })
})
