import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { generateUsername } from '../utils/generateUsername'

const AuthContext = createContext(null)

const EMPTY_PROFILE = {
  isAdmin: false,
  isVIP: false,
  vipPlan: null,
  vipUntil: null,
  username: '',
  bankroll: null,     // starting bankroll in dollars; null = not set up yet
  unitSize: null,     // dollars per unit; null = not set up yet
  lessonsRead: [],    // Academy lesson ids marked done
}

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(undefined) // undefined = not yet resolved
  const [profile, setProfile]   = useState(EMPTY_PROFILE)
  const [profileReady, setProfileReady] = useState(false)

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
          username:    d.username ?? '',
          bankroll:    typeof d.bankroll === 'number' ? d.bankroll : null,
          unitSize:    typeof d.unitSize === 'number' ? d.unitSize : null,
          lessonsRead: Array.isArray(d.lessonsRead) ? d.lessonsRead : [],
        })
      }
      setProfileReady(true)
    })
  }, [user])

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

  // A lapsed subscription should stop unlocking VIP content. The stored flag is
  // only cleared when an admin gets round to it, so honour the date here too.
  const vipExpired = !!profile.vipUntil && new Date(profile.vipUntil) < new Date()
  const isVIP = profile.isVIP && !vipExpired

  return (
    <AuthContext.Provider value={{ user, ...profile, isVIP, vipExpired, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
