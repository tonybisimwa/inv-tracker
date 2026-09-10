import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createCheckoutSession,
  createPortalSession,
  startVipTrial,
} from '../firebase/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

/**
 * The three things a user can do about their subscription: start a trial, pay,
 * or manage what they're already paying for.
 *
 * Shared by the pricing page, the paywall, and settings so all three behave the
 * same — one `busy` key means a spinner can sit on the exact button pressed
 * instead of disabling the whole page.
 */
export function useBilling() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(null) // 'trial' | 'portal' | a plan id

  /** Sends the user to Stripe. Deliberately does not clear `busy`: the page is
   *  navigating away, and re-enabling the button would invite a second session. */
  async function goToStripe(action, run) {
    if (!user) { navigate('/login'); return }
    setBusy(action)
    try {
      const { url } = await run()
      if (!url) throw new Error('No checkout URL returned')
      window.location.assign(url)
    } catch (err) {
      toast.error(err.message)
      setBusy(null)
    }
  }

  const checkout = (plan) => goToStripe(plan, () => createCheckoutSession(plan))
  const portal = () => goToStripe('portal', () => createPortalSession())

  async function trial() {
    if (!user) { navigate('/login'); return }
    setBusy('trial')
    try {
      await startVipTrial()
      // The profile listener picks up the grant on its own, so there's nothing
      // to set here — just send them where the value is.
      toast.success("You're VIP for the next 24 hours. Enjoy.")
      navigate('/plays')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(null)
    }
  }

  return { busy, checkout, portal, trial }
}
