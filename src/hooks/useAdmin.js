import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { generateUsername } from '../utils/generateUsername'

export function useAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setIsAdmin(false); setUsername(''); setLoading(false); return }
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        const anonName = generateUsername()
        await setDoc(ref, {
          email: user.email,
          displayName: user.displayName,
          username: anonName,
          createdAt: new Date().toISOString(),
          isAdmin: false,
        })
        setIsAdmin(false)
        setUsername(anonName)
      } else {
        const data = snap.data()
        setIsAdmin(data.isAdmin === true)
        setUsername(data.username || generateUsername())
      }
      setLoading(false)
    })
    return unsub
  }, [user])

  return { isAdmin, username, loading }
}
