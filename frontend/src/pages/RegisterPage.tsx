import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

type RegisterValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const registerAccount = useAuthStore((state) => state.register)
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
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (values: RegisterValues) => {
    const [firstName, ...rest] = values.name.trim().split(' ')
    const lastName = rest.join(' ') || firstName

    try {
      const session = await registerAccount({
        firstName,
        lastName,
        email: values.email,
        password: values.password,
      })
      await mergeGuestCartToServer()
      navigate(session.user.role === 'Admin' ? '/admin' : from, { replace: true })
    } catch (error) {
      setError('root', {
        message: axios.isAxiosError(error)
          ? (error.response?.data?.error as string | undefined) ?? 'Registration failed'
          : 'Registration failed',
      })
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1fr] lg:px-8">
      <div className="rounded-lg border bg-card p-6">
        <UserPlus className="h-7 w-7 text-primary" />
        <h1 className="mt-5 text-3xl font-semibold">Create account</h1>
        <p className="mt-2 text-muted-foreground">
          Registration is wired for validation first and can be connected to the API auth module next.
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
