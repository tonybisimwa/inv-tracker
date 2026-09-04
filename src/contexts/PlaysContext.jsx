import { createContext, useContext, useEffect, useState } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'

const PlaysContext = createContext(null)

export function PlaysProvider({ children }) {
  const { user } = useAuth()
  const [plays, setPlays]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setPlays([]); setLoading(false); return }
    const q = query(collection(db, 'plays'), orderBy('gameTime', 'desc'))
    return onSnapshot(q, (snap) => {
      setPlays(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user])

  async function addPlay(data) {
    await addDoc(collection(db, 'plays'), { ...data, createdAt: new Date().toISOString(), result: 'pending' })
  }
  async function updatePlay(id, data) {
    await updateDoc(doc(db, 'plays', id), data)
  }
  async function deletePlay(id) {
    await deleteDoc(doc(db, 'plays', id))
  }

  return (
    <PlaysContext.Provider value={{ plays, loading, addPlay, updatePlay, deletePlay }}>
      {children}
    </PlaysContext.Provider>
  )
}

export const usePlaysContext = () => useContext(PlaysContext)
