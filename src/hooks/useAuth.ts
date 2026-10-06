import { useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import { fetchCurrentUser, logout } from '@/services/authService'

export function useAuth() {
  const query = useApi(fetchCurrentUser, 'current-user')

  const signOut = useCallback(async () => {
    await logout()
  }, [])

  return {
    user: query.data,
    signOut,
  }
}
