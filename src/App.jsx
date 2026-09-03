import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useAdmin } from './hooks/useAdmin'
import Login from './pages/Login'
import Welcome from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import AddBet from './pages/AddBet'
import History from './pages/History'
import Plays from './pages/Plays'
import AdminDashboard from './pages/AdminDashboard'
import AdminPublish from './pages/AdminPublish'
import AdminVIP from './pages/AdminVIP'
import VIPCheckout from './pages/VIPCheckout'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" replace />
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  const { isAdmin, loading } = useAdmin()
  if (loading) return null
  if (!user || !isAdmin) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/" element={user ? <Dashboard /> : <Welcome />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/plays" element={<PrivateRoute><Plays /></PrivateRoute>} />
      <Route path="/add" element={<PrivateRoute><AddBet /></PrivateRoute>} />
      <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
      <Route path="/vip" element={<PrivateRoute><VIPCheckout /></PrivateRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/publish" element={<AdminRoute><AdminPublish /></AdminRoute>} />
      <Route path="/admin/vip" element={<AdminRoute><AdminVIP /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
