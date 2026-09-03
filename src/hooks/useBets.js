import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { calcPL, calcPayout } from '../utils/calculations'

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

  async function addBet(data) {
    const pl = calcPL(data.stake, data.odds, data.outcome)
    const payout = data.outcome === 'win' ? data.stake + calcPayout(data.stake, data.odds) : 0
    await addDoc(collection(db, 'users', user.uid, 'bets'), { ...data, pl, payout, createdAt: new Date().toISOString() })
  }

  async function updateBet(id, data) {
    const pl = calcPL(data.stake, data.odds, data.outcome)
    const payout = data.outcome === 'win' ? data.stake + calcPayout(data.stake, data.odds) : 0
    await updateDoc(doc(db, 'users', user.uid, 'bets', id), { ...data, pl, payout })
  }

  async function deleteBet(id) {
    await deleteDoc(doc(db, 'users', user.uid, 'bets', id))
  }

  return { bets, loading, addBet, updateBet, deleteBet }
}
