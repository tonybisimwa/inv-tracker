import { createContext, useContext, useEffect, useState } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'
import { byGameTimeDesc } from '../utils/calculations'

const PlaysContext = createContext(null)

const playsCol = () => collection(db, 'plays')
const settingsRef = () => doc(db, 'settings', 'tipster')

// A rejected listener (missing index, denied read) only reaches the error
// callback. Without one it fails silently and the page just renders empty.
function logListenerError(label) {
  return (err) => console.error(`[plays] ${label} listener failed:`, err)
}

// The tipster's public record, derived from every play. Kept in the
// admin-written settings doc so non-VIP users can see an honest all-time
// record without being able to read the VIP picks it's computed from.
//
// vipPending is a count, not content: locking the picks server-side left the
// paywall with nothing to show, so a non-VIP couldn't tell whether five plays
// were waiting or none. A bare number restores that without leaking a pick.
function tallyRecord(plays) {
  const settled = plays.filter((p) => p.result && p.result !== 'pending')
  return {
    wins:   settled.filter((p) => p.result === 'win').length,
    losses: settled.filter((p) => p.result === 'loss').length,
    pushes: settled.filter((p) => p.result === 'push').length,
    vipPending: plays.filter((p) => p.tier === 'vip' && (!p.result || p.result === 'pending')).length,
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
    const q = query(playsCol(), where('tier', '==', 'free'))
    return onSnapshot(q, (snap) => {
      setFreePlays(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byGameTimeDesc))
      setFreeLoading(false)
    }, (err) => {
      logListenerError('free')(err)
      setFreeLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (!canSeeVIP) { setVipPlays([]); setVipLoading(false); return }
    setVipLoading(true)
    const q = query(playsCol(), where('tier', '==', 'vip'))
    return onSnapshot(q, (snap) => {
      setVipPlays(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byGameTimeDesc))
      setVipLoading(false)
    }, (err) => {
      logListenerError('vip')(err)
      setVipLoading(false)
    })
  }, [canSeeVIP])

  const plays = [...freePlays, ...vipPlays].sort(byGameTimeDesc)
  const loading = freeLoading || vipLoading

  // Only admins mutate plays, and admins receive every play, so recomputing
  // the record from the local list is safe here.
  //
  // This is secondary bookkeeping and must never fail the write it follows: if
  // it threw, publishing a play that had already saved would report failure and
  // invite a retry that duplicates it. The next mutation recomputes from scratch,
  // so a skipped sync self-heals.
  async function syncRecord(next) {
    if (!isAdmin) return
    try {
      await setDoc(settingsRef(), { record: tallyRecord(next) }, { merge: true })
    } catch (err) {
      console.error('[plays] could not update the public record aggregate:', err)
    }
  }

  async function addPlay(data) {
    const play = { ...data, createdAt: new Date().toISOString(), result: 'pending' }
    await addDoc(playsCol(), play)
    // Publishing changes the pending count the paywall advertises
    await syncRecord([...plays, play])
  }

  async function updatePlay(id, data) {
    await updateDoc(doc(db, 'plays', id), data)
    // A result settles a play, so both the record and the pending count move.
    // A tier change moves the count too.
    if ('result' in data || 'tier' in data) {
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
