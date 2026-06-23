import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import axios from 'axios'

type VerifyState = 'loading' | 'success' | 'error' | 'resent'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<VerifyState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [isResending, setIsResending] = useState(false)

  const userId = searchParams.get('userId')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!userId || !token) {
      setState('error')
      setErrorMessage('Invalid verification link. Please request a new one.')
      return
    }

    const verify = async () => {
      try {
        await api.get('/auth/verify-email', { params: { userId, token } })
        setState('success')
      } catch (err) {
        setState('error')
        setErrorMessage(
          axios.isAxiosError(err)
            ? (err.response?.data?.error as string | undefined) ??
              'Verification failed. The link may be expired or already used.'
            : 'Something went wrong. Please try again.',
        )
      }
    }

    verify()
  }, [userId, token])

  const handleResend = async () => {
    if (!resendEmail.trim()) return
    setIsResending(true)
    try {
      await api.post('/auth/resend-verification', { email: resendEmail })
      setState('resent')
    } catch (err) {
      setErrorMessage(
        axios.isAxiosError(err)
          ? (err.response?.data?.error as string | undefined) ?? 'Failed to resend.'
          : 'Failed to resend.',
      )
    } finally {
      setIsResending(false)
    }
  }

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16">
      {state === 'loading' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h1 className="text-2xl font-semibold">Verifying your email…</h1>
          <p className="text-muted-foreground">This will only take a moment.</p>
        </div>
      )}

      {state === 'success' && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Email Verified!</h1>
            <p className="mt-2 text-muted-foreground">
              Your account is now active. You can sign in and start shopping.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Verification Failed</h1>
            <p className="mt-2 text-muted-foreground">{errorMessage}</p>
          </div>
          <div className="w-full rounded-lg border bg-card p-5">
            <p className="mb-3 text-sm font-medium">Request a new verification link</p>
            <input
              type="email"
              placeholder="Enter your email address"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            />
            <Button
              className="w-full"
              onClick={handleResend}
              disabled={isResending || !resendEmail.trim()}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
          </div>
        </div>
      )}

      {state === 'resent' && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Mail className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Check Your Inbox</h1>
            <p className="mt-2 text-muted-foreground">
              A new verification link has been sent to <strong>{resendEmail}</strong>. It expires in
              24 hours.
            </p>
          </div>
          <Button variant="outline" asChild className="w-full">
            <Link to="/login">Back to Sign In</Link>
          </Button>
        </div>
      )}
    </section>
  )
}
