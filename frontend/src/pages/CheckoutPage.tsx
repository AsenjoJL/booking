import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { LoaderCircle, ShieldCheck, TicketPercent } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AddressBook } from '@/components/checkout/AddressBook'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addressService } from '@/services/addressService'
import { orderService } from '@/services/orderService'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/utils/format'

const checkoutSchema = z.object({
  selectedAddressId: z.string().min(1, 'Select a shipping address before placing the order.'),
  couponCode: z.string().trim().optional(),
})

type CheckoutFormValues = z.output<typeof checkoutSchema>

export default function CheckoutPage() {
  const navigate = useNavigate()
  const items = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
  const hasLowStockItems = items.some((item) => item.quantity >= item.availableStock)

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressService.getMyAddresses(),
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
              <Link to="/cart">Back to cart</Link>
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
