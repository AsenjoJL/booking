import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import Footer from './Footer'
import Navbar from './Navbar'

export default function Layout() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)
  const syncServerCart = useCartStore((state) => state.syncServerCart)
  const location = useLocation()

  useEffect(() => {
    if (!token) {
      return
    }

    void refreshProfile().catch(() => undefined)
    void syncServerCart().catch(() => undefined)
  }, [refreshProfile, syncServerCart, token])

  if (user?.role === 'Admin' && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="relative">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
