import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

export const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const rawApi = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise: Promise<string | null> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | ({ _retry?: boolean } & typeof error.config)
      | undefined

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !String(originalRequest.url ?? '').includes('/auth/login') &&
      !String(originalRequest.url ?? '').includes('/auth/register') &&
      !String(originalRequest.url ?? '').includes('/auth/refresh')
    ) {
      originalRequest._retry = true

      if (!refreshPromise) {
        refreshPromise = useAuthStore
          .getState()
          .refreshSession()
          .then((session) => session?.token ?? null)
          .finally(() => {
            refreshPromise = null
          })
      }

      const nextToken = await refreshPromise
      if (nextToken) {
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${nextToken}`
        return api(originalRequest)
      }
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }

    return Promise.reject(error)
  },
)
