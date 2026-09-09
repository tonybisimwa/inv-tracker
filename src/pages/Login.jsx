import { useState } from 'react'
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { auth, googleProvider } from '../firebase/config'
import { authErrorMessage } from '../utils/authErrors'
import Logo from '../components/Logo'

const FIELD = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-green-500 transition-colors'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [busy, setBusy] = useState(null) // 'google' | 'email' | 'reset'
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function reset() { setError(''); setNotice('') }

  async function handleGoogle() {
    reset(); setBusy('google')
    try { await signInWithPopup(auth, googleProvider) }
    catch (e) { setError(authErrorMessage(e)) }
    finally { setBusy(null) }
  }

  async function handleEmail(e) {
    e.preventDefault()
    reset()
    if (isNew && password.length < 6) {
      setError('Please pick a password of at least 6 characters.')
      return
    }
    setBusy('email')
    try {
      if (isNew) await createUserWithEmailAndPassword(auth, email, password)
      else await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      setError(authErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  // Signing in was previously a dead end if you'd forgotten your password.
  async function handleReset() {
    reset()
    if (!email) { setError('Enter your email first, then tap reset.'); return }
    setBusy('reset')
    try {
      await sendPasswordResetEmail(auth, email)
      setNotice(`Reset link sent to ${email}.`)
    } catch (e) {
      setError(authErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-rise">
        <div className="mb-6">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to home
          </button>
        </div>

        <div className="text-center mb-8">
          <h1><Logo size="lg" /></h1>
          <p className="text-gray-400 mt-2 text-sm">Track every play. Know your numbers.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <button onClick={handleGoogle} disabled={busy !== null}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium py-2.5 rounded-lg hover:bg-gray-100 disabled:opacity-60 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {busy === 'google' ? 'Opening Google...' : 'Sign in with Google'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-700" /></div>
            <div className="relative flex justify-center text-xs text-gray-500 bg-gray-900 px-2 w-fit mx-auto">or</div>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input id="email" type="email" placeholder="Email" autoComplete="email"
                value={email} onChange={(e) => { setEmail(e.target.value); reset() }}
                className={FIELD} required />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isNew ? 'Password (6+ characters)' : 'Password'}
                  autoComplete={isNew ? 'new-password' : 'current-password'}
                  value={password} onChange={(e) => { setPassword(e.target.value); reset() }}
                  className={`${FIELD} pr-10`} required />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* aria-live so the message is announced, not just painted */}
            <div aria-live="polite" className="space-y-1 empty:hidden">
              {error && <p role="alert" className="text-red-400 text-xs">{error}</p>}
              {notice && <p className="text-green-400 text-xs">{notice}</p>}
            </div>

            <button type="submit" disabled={busy !== null}
              className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-gray-950 font-semibold py-2.5 rounded-lg transition-colors">
              {busy === 'email' ? (isNew ? 'Creating account...' : 'Signing in...') : (isNew ? 'Create account' : 'Sign in')}
            </button>
          </form>

          <div className="flex flex-col gap-2 pt-1">
            <button onClick={() => { setIsNew((v) => !v); reset() }}
              className="text-center text-xs text-gray-500 hover:text-gray-300 transition-colors">
              {isNew ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
            {!isNew && (
              <button onClick={handleReset} disabled={busy !== null}
                className="text-center text-xs text-gray-600 hover:text-gray-400 disabled:opacity-60 transition-colors">
                {busy === 'reset' ? 'Sending...' : 'Forgot your password?'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
