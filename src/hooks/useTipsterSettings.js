import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

const REF = () => doc(db, 'settings', 'tipster')

export function useTipsterSettings() {
  const [settings, setSettings] = useState({ statsVisible: true })
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    return onSnapshot(REF(), (snap) => {
      if (snap.exists()) setSettings(snap.data())
      setLoading(false)
    })
  }, [])

  async function updateSettings(patch) {
    await setDoc(REF(), patch, { merge: true })
  }

  return { settings, updateSettings, loading }
}
