import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/authService'
import type { AuthResponse, AuthUser } from '@/types/auth'

type AuthStore = {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<AuthResponse>
  register: (payload: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) => Promise<AuthResponse>
  setSession: (session: AuthResponse) => void
  refreshSession: () => Promise<AuthResponse | null>
  refreshProfile: () => Promise<void>
  updateProfile: (payload: { firstName: string; lastName: string }) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      setSession: (session) =>
        set({
          user: session.user,
          token: session.token,
          refreshToken: session.refreshToken,
          isLoading: false,
        }),
      refreshSession: async () => {
        const currentRefreshToken = useAuthStore.getState().refreshToken
        if (!currentRefreshToken) {
          set({ user: null, token: null, refreshToken: null, isLoading: false })
          return null
        }

        try {
          const session = await authService.refresh(currentRefreshToken)
          set({
            user: session.user,
            token: session.token,
            refreshToken: session.refreshToken,
            isLoading: false,
          })
          return session
        } catch (error) {
          set({ user: null, token: null, refreshToken: null, isLoading: false })
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
            refreshToken: session.refreshToken,
            isLoading: false,
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
          set({
            user: session.user,
            token: session.token,
            refreshToken: session.refreshToken,
            isLoading: false,
          })
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
        const refreshToken = useAuthStore.getState().refreshToken
        if (refreshToken) {
          void authService.logout(refreshToken).catch(() => undefined)
        }

        set({ user: null, token: null, refreshToken: null, isLoading: false })
      },
    }),
    {
      name: 'booking-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)
