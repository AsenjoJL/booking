export type UserRole = 'Customer' | 'Admin'

export type AuthUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
}

export type AuthResponse = {
  token: string
  accessTokenExpiresAtUtc: string
  user: AuthUser
}

export type RegistrationResponse = {
  email: string
  message: string
  verificationEmailSent: boolean
}
