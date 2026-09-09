import { createContext, useContext, useEffect, useState } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'

const PlaysContext = createContext(null)

const playsCol = () => collection(db, 'plays')
const settingsRef = () => doc(db, 'settings', 'tipster')

// The tipster's public record, derived from every play. Kept in the
// admin-written settings doc so non-VIP users can see an honest all-time
// record without being able to read the VIP picks it's computed from.
function tallyRecord(plays) {
  const settled = plays.filter((p) => p.result && p.result !== 'pending')
  return {
    wins:   settled.filter((p) => p.result === 'win').length,
    losses: settled.filter((p) => p.result === 'loss').length,
    pushes: settled.filter((p) => p.result === 'push').length,
    updatedAt: new Date().toISOString(),
  }
}

export function PlaysProvider({ children }) {
  const { user, isVIP, isAdmin } = useAuth()
  const [freePlays, setFreePlays] = useState([])
  const [vipPlays, setVipPlays]   = useState([])
  const [freeLoading, setFreeLoading] = useState(true)
  const [vipLoading, setVipLoading]   = useState(true)

  const canSeeVIP = !!user && (isVIP || isAdmin)

  // Two listeners rather than one unfiltered read: security rules can't filter
  // a result set, so a non-VIP client has to ask only for free plays or the
  // whole query is rejected.
  useEffect(() => {
    if (!user) { setFreePlays([]); setFreeLoading(false); return }
    const q = query(playsCol(), where('tier', '==', 'free'), orderBy('gameTime', 'desc'))
    return onSnapshot(q, (snap) => {
      setFreePlays(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setFreeLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (!canSeeVIP) { setVipPlays([]); setVipLoading(false); return }
    setVipLoading(true)
    const q = query(playsCol(), where('tier', '==', 'vip'), orderBy('gameTime', 'desc'))
    return onSnapshot(q, (snap) => {
      setVipPlays(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setVipLoading(false)
    })
  }, [canSeeVIP])

  const plays = [...freePlays, ...vipPlays].sort((a, b) => new Date(b.gameTime) - new Date(a.gameTime))
  const loading = freeLoading || vipLoading

  // Only admins mutate plays, and admins receive every play, so recomputing
  // the record from the local list is safe here.
  async function syncRecord(next) {
    if (!isAdmin) return
    await setDoc(settingsRef(), { record: tallyRecord(next) }, { merge: true })
  }

  async function addPlay(data) {
    await addDoc(playsCol(), { ...data, createdAt: new Date().toISOString(), result: 'pending' })
  }

  async function updatePlay(id, data) {
    await updateDoc(doc(db, 'plays', id), data)
    if ('result' in data) {
      await syncRecord(plays.map((p) => (p.id === id ? { ...p, ...data } : p)))
    }
  }

  async function deletePlay(id) {
    await deleteDoc(doc(db, 'plays', id))
    await syncRecord(plays.filter((p) => p.id !== id))
  }

  return (
    <PlaysContext.Provider value={{ plays, freePlays, vipPlays, loading, vipLocked: !canSeeVIP, addPlay, updatePlay, deletePlay }}>
      {children}
    </PlaysContext.Provider>
  )
}

export const usePlaysContext = () => useContext(PlaysContext)
