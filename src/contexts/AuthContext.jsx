import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { generateUsername } from '../utils/generateUsername'
import { entitlements, expiryMs, isVipExpired, trialState } from '../utils/entitlements'

const AuthContext = createContext(null)

const EMPTY_PROFILE = {
  isAdmin: false,
  isVIP: false,
  vipPlan: null,
  vipUntil: null,
  vipUntilMs: null,
  username: '',
  bankroll: null,     // starting bankroll in dollars; null = not set up yet
  unitSize: null,     // dollars per unit; null = not set up yet
  lessonsRead: [],    // Academy lesson ids marked done
  // Billing link, all written by Cloud Functions and privileged in the rules
  trialStartedAt: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripeStatus: null,
  cancelAtPeriodEnd: false,
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(undefined) // undefined = not yet resolved
  const [profile, setProfile]   = useState(EMPTY_PROFILE)
  const [profileReady, setProfileReady] = useState(false)
  // Bumped when an expiry passes while the page is open, so the UI re-derives
  const [, setTick] = useState(0)

  // Resolve auth state once
  useEffect(() => {
    getRedirectResult(auth).catch(() => {})
    return onAuthStateChanged(auth, (u) => {
      setUser(u ?? null)
      if (!u) {
        setProfile(EMPTY_PROFILE)
        setProfileReady(true)
      }
    })
  }, [])

  // Listen to user profile doc (single listener for the whole app)
  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    return onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        const username = generateUsername()
        await setDoc(ref, {
          email: user.email,
          displayName: user.displayName,
          username,
          createdAt: new Date().toISOString(),
          isAdmin: false,
          isVIP: false,
        })
        setProfile({ ...EMPTY_PROFILE, username })
      } else {
        const d = snap.data()
        setProfile({
          isAdmin:     d.isAdmin === true,
          isVIP:       d.isVIP === true,
          vipPlan:     d.vipPlan ?? null,
          vipUntil:    d.vipUntil ?? null,
          vipUntilMs:  num(d.vipUntilMs),
          username:    d.username ?? '',
          bankroll:    num(d.bankroll),
          unitSize:    num(d.unitSize),
          lessonsRead: Array.isArray(d.lessonsRead) ? d.lessonsRead : [],
          trialStartedAt:       num(d.trialStartedAt),
          stripeCustomerId:     d.stripeCustomerId ?? null,
          stripeSubscriptionId: d.stripeSubscriptionId ?? null,
          stripeStatus:         d.stripeStatus ?? null,
          cancelAtPeriodEnd:    d.cancelAtPeriodEnd === true,
        })
      }
      setProfileReady(true)
    })
  }, [user])

  /**
   * A 24-hour trial usually ends while the tab is still open. Nothing in
   * Firestore changes at that moment — the expiry is a stored timestamp, not an
   * event — so without this the paywall would stay unlocked until a reload.
   *
   * Only armed when expiry is within the hour: a month-long setTimeout would
   * overflow the delay to a signed 32-bit int and fire immediately, and there is
   * nothing useful to do about an expiry that far out anyway.
   */
  useEffect(() => {
    if (!profile.isVIP) return
    const until = expiryMs(profile)
    if (until === null) return
    const ms = until - Date.now()
    if (ms <= 0 || ms > 60 * 60 * 1000) return
    const timer = setTimeout(() => setTick((n) => n + 1), ms + 1000)
    return () => clearTimeout(timer)
  }, [profile])

  async function updateProfile(patch) {
    if (!user) return
    await setDoc(doc(db, 'users', user.uid), patch, { merge: true })
  }

  // Show spinner until auth + profile are both resolved
  const loading = user === undefined || (user !== null && !profileReady)

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-green-400 text-sm animate-pulse">Loading...</div>
    </div>
  )

  // Entitlements are derived in one place (utils/entitlements) so the paywall,
  // the scanner gate, and the pricing table can't disagree about who is VIP.
  const ent = entitlements(profile)
  const trial = trialState(profile)

  return (
    <AuthContext.Provider
      value={{
        user,
        ...profile,
        isVIP: ent.tier === 'vip',
        tier: ent.tier,
        slipsPerScan: ent.slipsPerScan,
        scansPerDay: ent.scansPerDay,
        canBatchScan: ent.canBatchScan,
        trial,
        vipExpired: isVipExpired(profile),
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
