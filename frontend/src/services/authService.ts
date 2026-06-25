import type { AuthResponse, AuthUser, RegistrationResponse } from '@/types/auth'
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
    const { data } = await rawApi.post<RegistrationResponse>('/auth/register', payload)
    return data
  },
  async refresh() {
    const { data } = await rawApi.post<AuthResponse>('/auth/refresh')
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
  async logout() {
    await rawApi.post('/auth/logout')
  },
}
