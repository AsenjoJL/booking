import type { AuthResponse, AuthUser } from '@/types/auth'
import { api, rawApi } from './api'

export const authService = {
  async login(email: string, password: string) {
    const { data } = await rawApi.post<AuthResponse>('/auth/login', { email, password })
    return data
  },
  async register(payload: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) {
    const { data } = await rawApi.post<AuthResponse>('/auth/register', payload)
    return data
  },
  async refresh(refreshToken: string) {
    const { data } = await rawApi.post<AuthResponse>('/auth/refresh', { refreshToken })
    return data
  },
  async me() {
    const { data } = await api.get<AuthUser>('/auth/me')
    return data
  },
  async updateProfile(payload: { firstName: string; lastName: string }) {
    const { data } = await api.put<AuthUser>('/auth/me', payload)
    return data
  },
  async logout(refreshToken: string) {
    await api.post('/auth/logout', { refreshToken })
  },
}
