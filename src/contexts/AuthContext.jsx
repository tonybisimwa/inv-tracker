import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { generateUsername } from '../utils/generateUsername'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(undefined) // undefined = not yet resolved
  const [isAdmin, setIsAdmin]     = useState(false)
  const [isVIP, setIsVIP]         = useState(false)
  const [vipPlan, setVipPlan]     = useState(null)
  const [vipUntil, setVipUntil]   = useState(null)
  const [username, setUsername]   = useState('')
  const [profileReady, setProfileReady] = useState(false)

  // Resolve auth state once
  useEffect(() => {
    getRedirectResult(auth).catch(() => {})
    return onAuthStateChanged(auth, (u) => {
      setUser(u ?? null)
      if (!u) {
        setIsAdmin(false); setIsVIP(false)
        setUsername(''); setProfileReady(true)
      }
    })
  }, [])

  // Listen to user profile doc (single listener for the whole app)
  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    return onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        const anonName = generateUsername()
        await setDoc(ref, {
          email: user.email,
          displayName: user.displayName,
          username: anonName,
          createdAt: new Date().toISOString(),
          isAdmin: false,
          isVIP: false,
        })
        setUsername(anonName); setIsAdmin(false); setIsVIP(false)
      } else {
        const d = snap.data()
        setIsAdmin(d.isAdmin === true)
        setIsVIP(d.isVIP === true)
        setVipPlan(d.vipPlan || null)
        setVipUntil(d.vipUntil || null)
        setUsername(d.username || '')
      }
      setProfileReady(true)
    })
  }, [user])

  // Show spinner until auth + profile are both resolved
  const loading = user === undefined || (user !== null && !profileReady)

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-green-400 text-sm animate-pulse">Loading...</div>
    </div>
  )

  return (
    <AuthContext.Provider value={{ user, isAdmin, isVIP, vipPlan, vipUntil, username }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
