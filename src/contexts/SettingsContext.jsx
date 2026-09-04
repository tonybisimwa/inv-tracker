import { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'

const SettingsContext = createContext({ settings: { statsVisible: true }, updateSettings: async () => {} })

const DEFAULTS = { statsVisible: true }
const REF = () => doc(db, 'settings', 'tipster')

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULTS)

  useEffect(() => {
    if (!user) return
    return onSnapshot(REF(), (snap) => {
      setSettings(snap.exists() ? { ...DEFAULTS, ...snap.data() } : DEFAULTS)
    })
  }, [user])

  async function updateSettings(patch) {
    await setDoc(REF(), patch, { merge: true })
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
