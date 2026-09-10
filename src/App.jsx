import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PlaysProvider } from './contexts/PlaysContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { ToastProvider } from './contexts/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Welcome from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Plays from './pages/Plays'

// Split off the routes that carry the heavy dependencies — the admin surface,
// the Academy's lesson content — so a first visit to the dashboard doesn't
// download them.
const AddBet         = lazy(() => import('./pages/AddBet'))
const Academy        = lazy(() => import('./pages/Academy'))
const Settings       = lazy(() => import('./pages/Settings'))
const Pricing        = lazy(() => import('./pages/Pricing'))
const Legal          = lazy(() => import('./pages/Legal'))
const VIPCheckout    = lazy(() => import('./pages/VIPCheckout'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminPublish   = lazy(() => import('./pages/AdminPublish'))
const AdminVIP       = lazy(() => import('./pages/AdminVIP'))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-sm text-gray-600 animate-pulse">Loading...</div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" replace />
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth()
  if (!user || !isAdmin) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={user ? <Dashboard /> : <Welcome />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        {/* Public on purpose: someone deciding whether to sign up needs to be
            able to read the pricing and the terms first. Both pages render their
            own header when there's no session. */}
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/legal" element={<Legal />} />

        <Route path="/plays" element={<PrivateRoute><Plays /></PrivateRoute>} />
        <Route path="/add" element={<PrivateRoute><AddBet /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/academy" element={<PrivateRoute><Academy /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/vip" element={<PrivateRoute><VIPCheckout /></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/publish" element={<AdminRoute><AdminPublish /></AdminRoute>} />
        <Route path="/admin/vip" element={<AdminRoute><AdminVIP /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  // Outermost, so it also catches a throw from AuthProvider itself. Anything
  // inside that fails now shows a page with a way out instead of a white screen.
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ToastProvider>
            <PlaysProvider>
              <SettingsProvider>
                <AppRoutes />
              </SettingsProvider>
            </PlaysProvider>
          </ToastProvider>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
