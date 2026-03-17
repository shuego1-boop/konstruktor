import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth.ts'

/**
 * Wraps protected routes — redirects to /login if not authenticated.
 */
export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
