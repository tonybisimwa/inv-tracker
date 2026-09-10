import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

const WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * How many slip scans the signed-in user has left.
 *
 * Reads the counter the Cloud Function owns — users/{uid}/usage/scans, which the
 * rules make read-only to clients. That's the point: the old version of this
 * number lived in localStorage, where clearing it granted an unlimited allowance.
 *
 * The count here is advisory. Entries age out of the rolling window over time
 * without the document changing, so a page left open overnight can read low.
 * The server re-checks on every scan and is the authority; this only exists so
 * the UI can say "2 left" instead of letting someone find out by being refused.
 */
export function useScanQuota() {
  const { user, scansPerDay } = useAuth()
  const [used, setUsed] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setUsed(0); setLoading(false); return }

    const ref = doc(db, 'users', user.uid, 'usage', 'scans')
    return onSnapshot(
      ref,
      (snap) => {
        const recent = snap.exists() ? snap.data().recent ?? [] : []
        const cutoff = Date.now() - WINDOW_MS
        setUsed(recent.filter((t) => typeof t === 'number' && t > cutoff).length)
        setLoading(false)
      },
      (err) => {
        // Never block scanning on a failed read of an advisory number
        console.error('[quota] scan usage listener failed:', err)
        setLoading(false)
      }
    )
  }, [user])

  return {
    used,
    limit: scansPerDay,
    remaining: Math.max(scansPerDay - used, 0),
    loading,
  }
}
