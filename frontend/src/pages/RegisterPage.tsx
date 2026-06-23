import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { UserPlus, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'

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
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

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
      await registerAccount({
        firstName,
        lastName,
        email: values.email,
        password: values.password,
      })
      // Registration succeeded — show "check your email" banner
      setRegisteredEmail(values.email)
    } catch (error) {
      setError('root', {
        message: axios.isAxiosError(error)
          ? (error.response?.data?.error as string | undefined) ?? 'Registration failed'
          : 'Registration failed',
      })
    }
  }

  // Success state — show verification banner
  if (registeredEmail) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Mail className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Check Your Email</h1>
            <p className="mt-2 text-muted-foreground">
              We sent a verification link to{' '}
              <strong className="text-foreground">{registeredEmail}</strong>. Click the link in
              your inbox to activate your account before signing in.
            </p>
          </div>
          <div className="w-full rounded-lg border bg-card p-4 text-left text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Didn't receive it?</p>
            <ul className="mt-1 list-disc pl-5">
              <li>Check your spam or junk folder</li>
              <li>The link expires in 24 hours</li>
              <li>
                <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>{' '}
                and we'll prompt you to resend
              </li>
            </ul>
          </div>
          <Button variant="outline" asChild className="w-full">
            <Link to="/login">Back to Sign In</Link>
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
          Fill in your details below. We'll send you a verification email to activate your account.
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
