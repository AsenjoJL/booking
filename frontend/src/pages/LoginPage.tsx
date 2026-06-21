import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const login = useAuthStore((state) => state.login)
  const isLoading = useAuthStore((state) => state.isLoading)
  const mergeGuestCartToServer = useCartStore((state) => state.mergeGuestCartToServer)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    try {
      const session = await login(values.email, values.password)
      await mergeGuestCartToServer()
      navigate(session.user.role === 'Admin' ? '/admin' : from, { replace: true })
    } catch (error) {
      setError('root', {
        message: axios.isAxiosError(error)
          ? (error.response?.data?.error as string | undefined) ?? 'Sign in failed'
          : 'Sign in failed',
      })
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1fr] lg:px-8">
      <div className="rounded-lg border bg-card p-6">
        <LockKeyhole className="h-7 w-7 text-primary" />
        <h1 className="mt-5 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-muted-foreground">
          Demo credentials are seeded on the backend: `customer@booking.local` / `Customer123!`.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border bg-card p-6">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input id="email" type="email" className="mt-2" {...register('email')} />
        {errors.email ? <p className="mt-2 text-sm text-destructive">{errors.email.message}</p> : null}

        <label className="mt-5 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input id="password" type="password" className="mt-2" {...register('password')} />
        {errors.password ? (
          <p className="mt-2 text-sm text-destructive">{errors.password.message}</p>
        ) : null}

        {errors.root ? <p className="mt-4 text-sm text-destructive">{errors.root.message}</p> : null}

        <Button type="submit" className="mt-6 w-full" disabled={isLoading}>
          Sign in
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New customer?{' '}
          <Link to="/register" className="font-medium text-primary">
            Create an account
          </Link>
        </p>
      </form>
    </section>
  )
}
