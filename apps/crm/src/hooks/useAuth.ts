import { useQueryClient, useQuery } from '@tanstack/react-query'

type Session = { user: { id: string; name: string; email: string; role: string } | null }

async function fetchSession(): Promise<Session> {
  const res = await fetch('/api/auth/get-session', { credentials: 'include' })
  if (!res.ok) return { user: null }
  const data = await res.json() as { user?: { id: string; name: string; email: string } } | null
  if (!data?.user) return { user: null }
  return { user: { ...data.user, role: 'teacher' } }
}

export function useAuth() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['auth-session'],
    queryFn: fetchSession,
    staleTime: 60_000, // считаем сессию свежей 1 минуту
    retry: false,
  })

  return {
    user: data?.user ?? null,
    isAuthenticated: !!data?.user,
    isLoading,
    invalidate: () => qc.invalidateQueries({ queryKey: ['auth-session'] }),
  }
}
