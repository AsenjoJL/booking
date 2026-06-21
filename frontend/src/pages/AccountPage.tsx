import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import { LoaderCircle, MapPin, Save, ShieldCheck, ShoppingCart, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { AddressBook } from '@/components/checkout/AddressBook'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getProductImageClass, getProductImageSurfaceClass } from '@/lib/productImage'
import { addressService } from '@/services/addressService'
import { productService } from '@/services/productService'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/utils/format'

const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'Enter a first name'),
  lastName: z.string().trim().min(2, 'Enter a last name'),
})

type ProfileFormValues = z.output<typeof profileSchema>

export default function AccountPage() {
  const user = useAuthStore((state) => state.user)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const addItem = useCartStore((state) => state.addItem)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [cartError, setCartError] = useState<string | null>(null)
  const [addingProductId, setAddingProductId] = useState<string | null>(null)

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressService.getMyAddresses(),
  })

  const defaultAddressId = useMemo(
    () => addresses.find((address) => address.isDefaultShipping)?.id ?? addresses[0]?.id ?? '',
    [addresses],
  )

  const { data: recommendedProducts = [] } = useQuery({
    queryKey: ['account-recommended-products'],
    queryFn: () => productService.getProducts(),
  })

  const activeSelectedAddressId =
    selectedAddressId && addresses.some((address) => address.id === selectedAddressId)
      ? selectedAddressId
      : defaultAddressId

  const accountProducts = recommendedProducts.slice(0, 4)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    },
  })

  useEffect(() => {
    reset({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    })
  }, [reset, user?.firstName, user?.lastName])

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      await updateProfile({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      })
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    await updateProfileMutation.mutateAsync(values)
  })

  const handleAddToCart = async (product: (typeof accountProducts)[number]) => {
    setCartError(null)
    setAddingProductId(product.id)

    try {
      await addItem(product)
    } catch (error) {
      setCartError(
        axios.isAxiosError(error)
          ? (error.response?.data?.error as string | undefined) ?? 'Could not add this product to cart.'
          : 'Could not add this product to cart.',
      )
    } finally {
      setAddingProductId(null)
    }
  }

  if (user?.role === 'Admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-t pt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Account</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <h1 className="font-serif text-5xl leading-none text-foreground sm:text-6xl">
              Profile &
              <br />
              Saved Details.
            </h1>
            <p className="mt-6 max-w-2xl text-[1.08rem] leading-9 text-foreground/76">
              Manage identity, delivery details, and a few curated suggestions without leaving the customer account flow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border bg-card p-5">
              <UserRound className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-4 font-serif text-2xl text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>
              <Badge className="mt-4">{user?.role ?? 'Customer'}</Badge>
            </div>
            <div className="border bg-card p-5">
              <MapPin className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-4 font-serif text-2xl text-foreground">{addresses.length} saved</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                The same address book is shared with checkout, so delivery details stay in sync.
              </p>
            </div>
            <div className="border bg-card p-5">
              <ShieldCheck className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-4 font-serif text-2xl text-foreground">Protected</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Your profile stays behind the authenticated customer routes already wired into the app.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[0.84fr_1.16fr]">
        <div className="border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-[#d36d3d]" />
            <h2 className="font-serif text-3xl text-foreground">Profile details</h2>
          </div>

          <form className="mt-6 space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">First name</span>
                <Input {...register('firstName')} className="h-12 rounded-none bg-white" />
                {errors.firstName ? <p className="text-xs text-destructive">{errors.firstName.message}</p> : null}
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Last name</span>
                <Input {...register('lastName')} className="h-12 rounded-none bg-white" />
                {errors.lastName ? <p className="text-xs text-destructive">{errors.lastName.message}</p> : null}
              </label>
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Email</span>
              <Input value={user?.email ?? ''} disabled className="h-12 rounded-none bg-white" />
            </label>

            <Button
              type="submit"
              disabled={isSubmitting || updateProfileMutation.isPending}
              className="h-14 rounded-none bg-[#cf6c3e] px-8 text-sm uppercase tracking-[0.22em] hover:bg-[#ba5d33]"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save profile
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="border bg-card p-6 sm:p-8">
          <AddressBook
            addresses={addresses}
            isLoading={addressesLoading}
            selectedAddressId={activeSelectedAddressId}
            onAddressSelect={setSelectedAddressId}
          />
        </div>
      </div>

      <div className="mt-16 border-t pt-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">For your next order</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-foreground">Recommended products</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Logged-in customers can add straight to cart from here too, without leaving the account area.
            </p>
          </div>
          <Button asChild variant="ghost" className="rounded-none uppercase tracking-[0.2em]">
            <Link to="/products">View all products</Link>
          </Button>
        </div>

        {cartError ? <p className="mb-4 text-sm text-destructive">{cartError}</p> : null}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {accountProducts.map((product) => (
            <article key={product.id} className="overflow-hidden border bg-card shadow-soft">
              <Link to={`/products/${product.slug}`} className="block">
                <div className={`aspect-square overflow-hidden ${getProductImageSurfaceClass(product)}`}>
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full transition-transform duration-500 hover:scale-105 ${getProductImageClass(product, 'compact')}`}
                  />
                </div>
              </Link>
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">
                    {product.stock > 0 && product.stock <= 10 ? 'Low stock' : 'Recommended'}
                  </p>
                  <Link to={`/products/${product.slug}`} className="mt-2 block font-serif text-[2rem] leading-tight text-foreground hover:text-[#d36d3d]">
                    {product.name}
                  </Link>
                </div>
                <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{product.description}</p>
                <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-4">
                  <span className="text-xl font-semibold text-foreground">{formatCurrency(product.price)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 rounded-none border border-foreground/12 px-5 text-xs font-semibold uppercase tracking-[0.22em] text-foreground hover:bg-black hover:text-white"
                    disabled={product.stock <= 0 || addingProductId === product.id}
                    onClick={() => void handleAddToCart(product)}
                  >
                    {addingProductId === product.id ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Adding
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        {product.stock <= 0 ? 'Sold out' : 'Add'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
