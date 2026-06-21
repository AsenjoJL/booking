import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { LoaderCircle, ShieldCheck, TicketPercent } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import backIcon from '@/assets/backicon.png'
import { AddressBook } from '@/components/checkout/AddressBook'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addressService } from '@/services/addressService'
import { orderService } from '@/services/orderService'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/utils/format'

const checkoutSchema = z.object({
  selectedAddressId: z.string().min(1, 'Select a shipping address before placing the order.'),
  couponCode: z.string().trim().optional(),
})

const guestCheckoutSchema = z.object({
  guestEmail: z.string().email('Enter a valid email address'),
  recipientName: z.string().trim().min(2, 'Enter the recipient name'),
  phoneNumber: z.string().trim().min(7, 'Enter a valid phone number'),
  line1: z.string().trim().min(4, 'Enter the street address'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'Enter the city'),
  stateOrProvince: z.string().trim().min(2, 'Enter the province or state'),
  postalCode: z.string().trim().min(3, 'Enter the postal code'),
  country: z.string().trim().min(2, 'Enter the country'),
  couponCode: z.string().trim().optional(),
})

type CheckoutFormValues = z.output<typeof checkoutSchema>
type GuestCheckoutFormValues = z.output<typeof guestCheckoutSchema>

export default function CheckoutPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const items = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [guestReviewMode, setGuestReviewMode] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
  const hasLowStockItems = items.some((item) => item.quantity >= item.availableStock)

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressService.getMyAddresses(),
    enabled: Boolean(user),
  })

  const defaultAddressId = useMemo(
    () => addresses.find((address) => address.isDefaultShipping)?.id ?? addresses[0]?.id ?? '',
    [addresses],
  )

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      selectedAddressId: '',
      couponCode: '',
    },
  })

  const {
    register: registerGuest,
    handleSubmit: handleGuestSubmit,
    formState: { errors: guestErrors },
  } = useForm<GuestCheckoutFormValues>({
    resolver: zodResolver(guestCheckoutSchema),
    defaultValues: {
      guestEmail: '',
      recipientName: '',
      phoneNumber: '',
      line1: '',
      line2: '',
      city: '',
      stateOrProvince: '',
      postalCode: '',
      country: 'Philippines',
      couponCode: '',
    },
  })

  const selectedAddressId = useWatch({
    control,
    name: 'selectedAddressId',
    defaultValue: '',
  })

  useEffect(() => {
    if (defaultAddressId) {
      setValue('selectedAddressId', defaultAddressId)
    }
  }, [defaultAddressId, setValue])

  const placeOrder = handleSubmit(async (values) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const order = await orderService.checkout({
        shippingAddressId: values.selectedAddressId,
        billingAddressId: values.selectedAddressId,
        couponCode: values.couponCode || undefined,
        paymentMethod: 'CashOnDelivery',
        idempotencyKey,
      })
      await clearCart()
      setIdempotencyKey(crypto.randomUUID())
      navigate('/orders', { state: { createdOrderId: order.id } })
    } catch (submissionError) {
      setError(
        axios.isAxiosError(submissionError)
          ? (submissionError.response?.data?.error as string | undefined) ?? 'Checkout failed'
          : 'Checkout failed',
      )
    } finally {
      setIsSubmitting(false)
    }
  })

  const placeGuestOrder = handleGuestSubmit(async (values) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const order = await orderService.guestCheckout({
        guestEmail: values.guestEmail,
        shippingAddress: {
          label: 'Guest shipping',
          recipientName: values.recipientName,
          line1: values.line1,
          line2: values.line2 || undefined,
          city: values.city,
          stateOrProvince: values.stateOrProvince,
          postalCode: values.postalCode,
          country: values.country,
          phoneNumber: values.phoneNumber,
        },
        useShippingAsBilling: true,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        couponCode: values.couponCode || undefined,
        paymentMethod: 'CashOnDelivery',
        idempotencyKey,
      })
      await clearCart()
      setIdempotencyKey(crypto.randomUUID())
      navigate('/order-confirmation', { state: { order, isGuest: true }, replace: true })
    } catch (submissionError) {
      setError(
        axios.isAxiosError(submissionError)
          ? (submissionError.response?.data?.error as string | undefined) ?? 'Guest checkout failed'
          : 'Guest checkout failed',
      )
    } finally {
      setIsSubmitting(false)
    }
  })

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="border-t pt-10">
          <h1 className="font-serif text-5xl text-foreground">Your bag is empty.</h1>
          <p className="mt-4 text-[1.05rem] leading-8 text-muted-foreground">
            Add a few products before moving into checkout.
          </p>
          <Button asChild className="mt-8 h-14 rounded-none bg-[#cf6c3e] px-8 text-sm uppercase tracking-[0.22em] hover:bg-[#ba5d33]">
            <Link to="/products">Browse products</Link>
          </Button>
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-t pt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Checkout</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-end">
            <div>
              <h1 className="font-serif text-5xl leading-none text-foreground sm:text-6xl">
                You’re close.
                <br />
                Let’s finish checkout.
              </h1>
              <p className="mt-6 max-w-xl text-[1.08rem] leading-9 text-foreground/76">
                Your bag is already saved in this browser. Sign in or create an account when you’re ready to place the order, or keep reviewing the cart as a guest for now.
              </p>
            </div>
            <div className="border bg-card p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-[#d36d3d]" />
                <div>
                  <p className="font-semibold text-foreground">Guest cart protected</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Items stay in local storage until you sign in, then they merge into your account cart automatically before checkout continues.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="border bg-card p-6 sm:p-8">
            <div className="grid gap-4 md:grid-cols-3">
              <Button asChild className="h-14 rounded-none bg-[#cf6c3e] text-sm uppercase tracking-[0.22em] hover:bg-[#ba5d33]">
                <Link to="/login" state={{ from: '/checkout' }}>
                  Sign in to checkout
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-none text-sm uppercase tracking-[0.22em]">
                <Link to="/register" state={{ from: '/checkout' }}>
                  Create account
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-14 rounded-none border border-foreground/12 text-sm uppercase tracking-[0.22em]"
                onClick={() => setGuestReviewMode((current) => !current)}
              >
                {guestReviewMode ? 'Hide guest form' : 'Continue as guest'}
              </Button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="border bg-background p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d36d3d]">1</p>
                <p className="mt-3 font-semibold text-foreground">Keep shopping freely</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  No forced login while browsing or adding products to the cart.
                </p>
              </div>
              <div className="border bg-background p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d36d3d]">2</p>
                <p className="mt-3 font-semibold text-foreground">Sign in only when ready</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  The cart merges into your account right after login or signup.
                </p>
              </div>
              <div className="border bg-background p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d36d3d]">3</p>
                <p className="mt-3 font-semibold text-foreground">Checkout resumes with your cart</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  We send you back here so shipping details and order placement can continue.
                </p>
              </div>
            </div>

            {guestReviewMode ? (
              <form className="mt-8 border bg-background p-5" onSubmit={placeGuestOrder}>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d36d3d]">Guest checkout</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Cash on delivery is available for guests. We’ll place the order using this shipping contact and keep inventory protection active on the backend.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Email</span>
                    <Input {...registerGuest('guestEmail')} className="h-12 rounded-none bg-white" />
                    {guestErrors.guestEmail ? <p className="text-xs text-destructive">{guestErrors.guestEmail.message}</p> : null}
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Recipient name</span>
                    <Input {...registerGuest('recipientName')} className="h-12 rounded-none bg-white" />
                    {guestErrors.recipientName ? <p className="text-xs text-destructive">{guestErrors.recipientName.message}</p> : null}
                  </label>
                  <label className="space-y-2 text-sm sm:col-span-2">
                    <span className="font-medium text-foreground">Street address</span>
                    <Input {...registerGuest('line1')} className="h-12 rounded-none bg-white" />
                    {guestErrors.line1 ? <p className="text-xs text-destructive">{guestErrors.line1.message}</p> : null}
                  </label>
                  <label className="space-y-2 text-sm sm:col-span-2">
                    <span className="font-medium text-foreground">Address line 2</span>
                    <Input {...registerGuest('line2')} className="h-12 rounded-none bg-white" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">City</span>
                    <Input {...registerGuest('city')} className="h-12 rounded-none bg-white" />
                    {guestErrors.city ? <p className="text-xs text-destructive">{guestErrors.city.message}</p> : null}
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Province / State</span>
                    <Input {...registerGuest('stateOrProvince')} className="h-12 rounded-none bg-white" />
                    {guestErrors.stateOrProvince ? <p className="text-xs text-destructive">{guestErrors.stateOrProvince.message}</p> : null}
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Postal code</span>
                    <Input {...registerGuest('postalCode')} className="h-12 rounded-none bg-white" />
                    {guestErrors.postalCode ? <p className="text-xs text-destructive">{guestErrors.postalCode.message}</p> : null}
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Phone number</span>
                    <Input {...registerGuest('phoneNumber')} className="h-12 rounded-none bg-white" />
                    {guestErrors.phoneNumber ? <p className="text-xs text-destructive">{guestErrors.phoneNumber.message}</p> : null}
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Country</span>
                    <Input {...registerGuest('country')} className="h-12 rounded-none bg-white" />
                    {guestErrors.country ? <p className="text-xs text-destructive">{guestErrors.country.message}</p> : null}
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Coupon code</span>
                    <Input {...registerGuest('couponCode')} className="h-12 rounded-none bg-white" placeholder="Optional" />
                  </label>
                </div>

                {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 rounded-none bg-[#cf6c3e] px-8 text-sm uppercase tracking-[0.22em] hover:bg-[#ba5d33]"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Placing guest order
                      </>
                    ) : (
                      'Place guest order'
                    )}
                  </Button>
                  <Button asChild variant="outline" className="h-14 rounded-none uppercase tracking-[0.22em]">
                    <Link to="/cart">Back to cart</Link>
                  </Button>
                </div>
              </form>
            ) : null}
          </div>

          <aside className="h-fit border bg-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Order summary</p>
            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 border-b border-border/60 pb-4 text-sm">
                  <span className="text-foreground/78">
                    {item.productName} x {item.quantity}
                  </span>
                  <span className="font-medium text-foreground">{formatCurrency(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 border bg-background p-5">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-[#d36d3d]" />
                <span>Your cart stays in the browser until you sign in, then it is migrated into your account cart automatically.</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="mt-6 flex items-end justify-between border-t border-border/80 pt-6">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">Total</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(subtotal)}</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-t pt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Checkout</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <h1 className="font-serif text-5xl leading-none text-foreground sm:text-6xl">
              Final Details,
              <br />
              Then Place Order.
            </h1>
            <p className="mt-6 max-w-xl text-[1.08rem] leading-9 text-foreground/76">
              Confirm shipping, review stock-sensitive items, and place the order once with idempotent protection in place.
            </p>
          </div>
          <div className="border bg-card p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-[#d36d3d]" />
              <div>
                <p className="font-semibold text-foreground">Protected checkout</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Stock validation, retry-safe order placement, and duplicate-submit protection stay active while you confirm this order.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <form className="border bg-card p-6 sm:p-8" onSubmit={placeOrder}>
          <input type="hidden" {...register('selectedAddressId')} />

          <AddressBook
            addresses={addresses}
            isLoading={addressesLoading}
            selectedAddressId={selectedAddressId}
            onAddressSelect={(addressId) =>
              setValue('selectedAddressId', addressId, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />

          {errors.selectedAddressId ? (
            <p className="mt-4 text-sm text-destructive">{errors.selectedAddressId.message}</p>
          ) : null}

          <div className="mt-6 border bg-background p-5">
            <div className="flex items-center gap-2">
              <TicketPercent className="h-4 w-4 text-[#d36d3d]" />
              <label className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground" htmlFor="couponCode">
                Coupon code
              </label>
            </div>
            <Input
              id="couponCode"
              {...register('couponCode')}
              className="mt-4 h-12 rounded-none bg-white"
              placeholder="Optional"
            />
          </div>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || addresses.length === 0}
              className="h-14 rounded-none bg-[#cf6c3e] px-8 text-sm uppercase tracking-[0.22em] hover:bg-[#ba5d33]"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Placing order
                </>
              ) : (
                'Place order'
              )}
            </Button>
            <Button asChild type="button" variant="outline" className="h-14 rounded-none uppercase tracking-[0.22em]">
              <Link to="/cart">
                <img src={backIcon} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
                Back to cart
              </Link>
            </Button>
          </div>
        </form>

        <aside className="h-fit border bg-card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Order summary</p>
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 border-b border-border/60 pb-4 text-sm">
                <span className="text-foreground/78">
                  {item.productName} x {item.quantity}
                </span>
                <span className="font-medium text-foreground">{formatCurrency(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 border bg-background p-5">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-[#d36d3d]" />
              <span>Cash on delivery is active, and totals are recalculated on the backend before the order is accepted.</span>
            </div>
            {hasLowStockItems ? (
              <p className="mt-3 text-sm text-[#b65e34]">
                One or more items are at their stock edge. Checkout will revalidate availability.
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-border/80 pt-6">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">Total</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(subtotal)}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
