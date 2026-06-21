import { Link, Navigate, useLocation } from 'react-router-dom'
import { PackageCheck, ShieldCheck, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Order } from '@/types/order'
import { formatCurrency } from '@/utils/format'

export default function OrderConfirmationPage() {
  const location = useLocation()
  const order = (location.state as { order?: Order; isGuest?: boolean } | null)?.order
  const isGuest = (location.state as { order?: Order; isGuest?: boolean } | null)?.isGuest ?? false

  if (!order) {
    return <Navigate to="/" replace />
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-t pt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Order confirmed</p>
        <h1 className="mt-4 font-serif text-5xl leading-none text-foreground sm:text-6xl">
          Thanks, your order
          <br />
          is in.
        </h1>
        <p className="mt-6 max-w-2xl text-[1.08rem] leading-9 text-foreground/76">
          {isGuest
            ? 'Your guest cash-on-delivery order has been recorded successfully. Keep the order number handy for support and manual tracking.'
            : 'Your order has been placed successfully and is now visible in your account history.'}
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="border bg-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Order number</p>
              <p className="mt-3 font-serif text-4xl text-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Total</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{formatCurrency(order.total)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {order.items.map((item) => (
              <div key={`${item.productId}-${item.productName}`} className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                  <p className="font-medium text-foreground">{item.productName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="font-semibold text-foreground">{formatCurrency(item.lineTotal)}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="border bg-background p-5">
              <PackageCheck className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-3 font-semibold text-foreground">Pending confirmation</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                The order is waiting for internal confirmation before fulfillment begins.
              </p>
            </div>
            <div className="border bg-background p-5">
              <Truck className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-3 font-semibold text-foreground">Cash on delivery</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Payment will be collected when the order arrives.
              </p>
            </div>
            <div className="border bg-background p-5">
              <ShieldCheck className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-3 font-semibold text-foreground">Inventory reserved</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Stock has already been protected for this order.
              </p>
            </div>
          </div>
        </div>

        <aside className="h-fit border bg-card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Next steps</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
            <p>Status: <span className="font-medium text-foreground">{order.status}</span></p>
            <p>Payment: <span className="font-medium text-foreground">{order.paymentMethod}</span></p>
            {order.guestEmail ? (
              <p>Email: <span className="font-medium text-foreground">{order.guestEmail}</span></p>
            ) : null}
          </div>
          <div className="mt-8 grid gap-3">
            <Button asChild className="h-14 rounded-none bg-[#cf6c3e] text-sm uppercase tracking-[0.22em] hover:bg-[#ba5d33]">
              <Link to="/products">Continue shopping</Link>
            </Button>
            <Button asChild variant="outline" className="h-14 rounded-none uppercase tracking-[0.22em]">
              <Link to={isGuest ? '/contact' : '/orders'}>{isGuest ? 'Contact support' : 'View order history'}</Link>
            </Button>
          </div>
        </aside>
      </div>
    </section>
  )
}
