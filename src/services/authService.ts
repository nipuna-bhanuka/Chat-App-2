import type { AuthUser } from '@/features/auth/types/auth'
import { API_ENDPOINTS } from '@/lib/constants/apiEndpoints'
import { request } from './api'

export function fetchCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>(API_ENDPOINTS.auth.me)
}

export function logout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(API_ENDPOINTS.auth.logout, { method: 'POST' })
}
