import { useAuth } from '../contexts/AuthContext'

// Thin wrapper — all data lives in AuthContext (single Firestore listener for the whole app)
export function useAdmin() {
  const { isAdmin, isVIP, vipPlan, vipUntil, username } = useAuth()
  return { isAdmin, isVIP, vipPlan, vipUntil, username, loading: false }
}
