import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

export function useAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setIsAdmin(false); setLoading(false); return }
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        await setDoc(ref, { email: user.email, displayName: user.displayName, createdAt: new Date().toISOString(), isAdmin: false })
        setIsAdmin(false)
      } else {
        setIsAdmin(snap.data().isAdmin === true)
      }
      setLoading(false)
    })
    return unsub
  }, [user])

  return { isAdmin, loading }
}
