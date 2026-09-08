import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { calcPL, calcPayout } from '../utils/calculations'

// Firestore caps a WriteBatch at 500 operations
const BATCH_LIMIT = 500

// P&L and payout are derived on write so reads stay cheap
function derive(data) {
  return {
    ...data,
    pl: calcPL(data.stake, data.odds, data.outcome),
    payout: data.outcome === 'win' ? data.stake + calcPayout(data.stake, data.odds) : 0,
  }
}

export function useBets() {
  const { user } = useAuth()
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setBets([]); setLoading(false); return }
    const q = query(collection(db, 'users', user.uid, 'bets'), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setBets(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  function betsCollection() {
    return collection(db, 'users', user.uid, 'bets')
  }

  async function addBet(data) {
    await addDoc(betsCollection(), { ...derive(data), createdAt: new Date().toISOString() })
  }

  // Writes many bets atomically — all land or none do, so a partial failure
  // never leaves half a scanned batch in the journal.
  async function addBets(list) {
    if (list.length === 0) return
    if (list.length > BATCH_LIMIT) throw new Error(`Cannot save more than ${BATCH_LIMIT} bets at once.`)
    const col = betsCollection()
    const batch = writeBatch(db)
    const createdAt = new Date().toISOString()
    list.forEach((data) => batch.set(doc(col), { ...derive(data), createdAt }))
    await batch.commit()
  }

  async function updateBet(id, data) {
    await updateDoc(doc(db, 'users', user.uid, 'bets', id), derive(data))
  }

  async function deleteBet(id) {
    await deleteDoc(doc(db, 'users', user.uid, 'bets', id))
  }

  return { bets, loading, addBet, addBets, updateBet, deleteBet }
}
