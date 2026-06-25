import { create } from 'zustand'
import { authService } from '@/services/authService'
import type { AuthResponse, AuthUser, RegistrationResponse } from '@/types/auth'

type AuthStore = {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isSessionReady: boolean
  login: (email: string, password: string) => Promise<AuthResponse>
  register: (payload: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) => Promise<RegistrationResponse>
  setSession: (session: AuthResponse) => void
  initializeSession: () => Promise<void>
  refreshSession: () => Promise<AuthResponse | null>
  refreshProfile: () => Promise<void>
  updateProfile: (payload: { firstName: string; lastName: string }) => Promise<void>
  logout: () => void
}

let sessionInitialization: Promise<void> | null = null

export const useAuthStore = create<AuthStore>()((set) => ({
      user: null,
      token: null,
      isLoading: false,
      isSessionReady: false,
      setSession: (session) =>
        set({
          user: session.user,
          token: session.token,
          isLoading: false,
          isSessionReady: true,
        }),
      initializeSession: async () => {
        if (useAuthStore.getState().isSessionReady) {
          return
        }

        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('booking-auth')
        }

        if (!sessionInitialization) {
          sessionInitialization = authService
            .refresh()
            .then((session) => {
              set({
                user: session.user,
                token: session.token,
                isLoading: false,
                isSessionReady: true,
              })
            })
            .catch(() => {
              set({
                user: null,
                token: null,
                isLoading: false,
                isSessionReady: true,
              })
            })
            .finally(() => {
              sessionInitialization = null
            })
        }

        await sessionInitialization
      },
      refreshSession: async () => {
        try {
          const session = await authService.refresh()
          set({
            user: session.user,
            token: session.token,
            isLoading: false,
            isSessionReady: true,
          })
          return session
        } catch (error) {
          set({
            user: null,
            token: null,
            isLoading: false,
            isSessionReady: true,
          })
          throw error
        }
      },
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const session = await authService.login(email, password)
          set({
            user: session.user,
            token: session.token,
            isLoading: false,
            isSessionReady: true,
          })
          return session
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
      register: async (payload) => {
        set({ isLoading: true })
        try {
          const session = await authService.register(payload)
          set({ isLoading: false, isSessionReady: true })
          return session
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
      refreshProfile: async () => {
        const user = await authService.me()
        set({ user })
      },
      updateProfile: async (payload) => {
        const user = await authService.updateProfile(payload)
        set({ user })
      },
      logout: () => {
        void authService.logout().catch(() => undefined)
        set({
          user: null,
          token: null,
          isLoading: false,
          isSessionReady: true,
        })
      },
    }))
