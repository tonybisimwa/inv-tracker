import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore'
import { db } from '../firebase/config'

export function usePlays({ tierFilter } = {}) {
  const [plays, setPlays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let q = query(collection(db, 'plays'), orderBy('gameTime', 'desc'))
    if (tierFilter) q = query(collection(db, 'plays'), where('tier', '==', tierFilter), orderBy('gameTime', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setPlays(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [tierFilter])

  async function addPlay(data) {
    await addDoc(collection(db, 'plays'), { ...data, createdAt: new Date().toISOString(), result: 'pending' })
  }

  async function updatePlay(id, data) {
    await updateDoc(doc(db, 'plays', id), data)
  }

  async function deletePlay(id) {
    await deleteDoc(doc(db, 'plays', id))
  }

  return { plays, loading, addPlay, updatePlay, deletePlay }
}
