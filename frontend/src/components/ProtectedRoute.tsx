import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

type ProtectedRouteProps = {
  adminOnly?: boolean
}

export default function ProtectedRoute({ adminOnly = false }: ProtectedRouteProps) {
  const user = useAuthStore((state) => state.user)
  const isSessionReady = useAuthStore((state) => state.isSessionReady)
  const location = useLocation()

  if (!isSessionReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (adminOnly && user.role !== 'Admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
