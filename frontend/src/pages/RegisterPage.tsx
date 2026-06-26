import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2, MailCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { rawApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

type RegisterValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const registerAccount = useAuthStore((state) => state.register)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [registrationResult, setRegistrationResult] = useState<{
    email: string
    message: string
    verificationEmailSent: boolean
  } | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (values: RegisterValues) => {
    const [firstName, ...rest] = values.name.trim().split(' ')
    const lastName = rest.join(' ') || firstName

    try {
      const response = await registerAccount({
        firstName,
        lastName,
        email: values.email,
        password: values.password,
      })
      setRegistrationResult(response)
    } catch (error) {
      setError('root', {
        message: axios.isAxiosError(error)
          ? (error.response?.data?.error as string | undefined) ?? 'Registration failed'
          : 'Registration failed',
      })
    }
  }

  const handleResend = async () => {
    if (!registrationResult?.email) return

    setIsResending(true)
    setResendMessage(null)
    setResendError(null)

    try {
      await rawApi.post('/auth/resend-verification', { email: registrationResult.email })
      setRegistrationResult({
        ...registrationResult,
        verificationEmailSent: true,
        message: 'Verification email sent. Please check your inbox.',
      })
      setResendMessage('Verification email sent. Please check your inbox.')
    } catch (error) {
      setResendError(
        axios.isAxiosError(error)
          ? (error.response?.data?.error as string | undefined) ??
              'Failed to resend verification email.'
          : 'Failed to resend verification email.',
      )
    } finally {
      setIsResending(false)
    }
  }

  if (registrationResult) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-16 sm:px-6">
        <div className="w-full rounded-lg border bg-card p-8 text-center shadow-sm">
          <MailCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-5 text-3xl font-semibold">
            {registrationResult.verificationEmailSent ? 'Check your inbox' : 'Account created'}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {registrationResult.verificationEmailSent ? (
              <>
                We sent a verification link to <strong>{registrationResult.email}</strong>. Verify
                the address before signing in.
              </>
            ) : (
              <>
                {registrationResult.message} Email:{' '}
                <strong>{registrationResult.email}</strong>
              </>
            )}
          </p>
          {!registrationResult.verificationEmailSent ? (
            <Button className="mt-6 w-full" onClick={handleResend} disabled={isResending}>
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                'Resend verification email'
              )}
            </Button>
          ) : null}
          {resendMessage ? <p className="mt-3 text-sm text-green-600">{resendMessage}</p> : null}
          {resendError ? <p className="mt-3 text-sm text-destructive">{resendError}</p> : null}
          <Button asChild className="mt-6 w-full">
            <Link to="/login">Continue to sign in</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1fr] lg:px-8">
      <div className="rounded-lg border bg-card p-6">
        <UserPlus className="h-7 w-7 text-primary" />
        <h1 className="mt-5 text-3xl font-semibold">Create account</h1>
        <p className="mt-2 text-muted-foreground">
          Create your account, then verify your email before signing in.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border bg-card p-6">
        {[
          { id: 'name', label: 'Name', type: 'text' },
          { id: 'email', label: 'Email', type: 'email' },
          { id: 'password', label: 'Password', type: 'password' },
          { id: 'confirmPassword', label: 'Confirm password', type: 'password' },
        ].map((field) => (
          <div key={field.id} className="mb-5">
            <label className="text-sm font-medium" htmlFor={field.id}>
              {field.label}
            </label>
            <Input
              id={field.id}
              type={field.type}
              className="mt-2"
              {...register(field.id as keyof RegisterValues)}
            />
            {errors[field.id as keyof RegisterValues] ? (
              <p className="mt-2 text-sm text-destructive">
                {errors[field.id as keyof RegisterValues]?.message}
              </p>
            ) : null}
          </div>
        ))}
        {errors.root ? <p className="mb-4 text-sm text-destructive">{errors.root.message}</p> : null}
        <Button type="submit" className="w-full" disabled={isLoading}>
          Create account
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </section>
  )
}
