import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Minus, PackageCheck, Plus, ShieldCheck, Trash2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProductGrid from '@/components/product/ProductGrid'
import { productService } from '@/services/productService'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/utils/format'

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore()
  const { data: products = [] } = useQuery({
    queryKey: ['cart-recommendations'],
    queryFn: () => productService.getProducts(),
    enabled: items.length > 0,
  })
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
  const itemCount = items.reduce((total, item) => total + item.quantity, 0)
  const recommendationProducts = products
    .filter((product) => !items.some((item) => item.productId === product.id))
    .slice(0, 3)

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="border-t pt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Cart</p>
          <h1 className="mt-4 font-serif text-5xl leading-none text-foreground sm:text-6xl">Your bag is empty.</h1>
          <p className="mt-6 max-w-xl text-[1.08rem] leading-9 text-foreground/76">
            Start with the latest arrivals and build a cleaner, stock-aware checkout from there.
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
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Cart</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <h1 className="font-serif text-5xl leading-none text-foreground sm:text-6xl">
              Review Your
              <br />
              Everyday Picks.
            </h1>
            <p className="mt-6 max-w-xl text-[1.08rem] leading-9 text-foreground/76">
              Adjust quantities, review stock-sensitive items, and move into checkout with a cleaner summary.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border bg-card p-5">
              <PackageCheck className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-4 font-serif text-2xl text-foreground">{itemCount} item{itemCount > 1 ? 's' : ''}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">A complete review surface before checkout.</p>
            </div>
            <div className="border bg-card p-5">
              <ShieldCheck className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-4 font-serif text-2xl text-foreground">Protected flow</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">Stock and duplicate-submit checks stay active.</p>
            </div>
            <div className="border bg-card p-5">
              <Truck className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-4 font-serif text-2xl text-foreground">Address-ready</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">Shipping details can be handled inside checkout.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {items.map((item) => (
            <article key={item.id} className="grid gap-5 border bg-card p-5 sm:grid-cols-[140px_1fr]">
              <div className={`overflow-hidden rounded-sm ${item.imageFit === 'contain'
                ? item.imageSurfaceClassName ?? 'bg-[linear-gradient(180deg,#f3ece4_0%,#e8dbc9_100%)]'
                : item.imageSurfaceClassName ?? 'bg-[#f6f1ea]'
              }`}>
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className={`aspect-[4/4.4] h-full w-full ${
                    item.imageFit === 'contain'
                      ? `object-contain px-3 pb-0 pt-4 ${item.imagePositionClassName ?? 'object-center'}`
                      : `object-cover ${item.imagePositionClassName ?? 'object-center'}`
                  }`}
                />
              </div>
              <div className="flex flex-col justify-between gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">
                      {item.availableStock > 0 ? 'Ready to wear' : 'Unavailable'}
                    </p>
                    <h2 className="mt-2 font-serif text-3xl leading-tight text-foreground">{item.productName}</h2>
                    <p className="mt-2 text-base text-foreground/76">{formatCurrency(item.unitPrice)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.availableStock <= 0 ? <span>Out of stock</span> : null}
                      {item.availableStock > 0 && item.availableStock <= 10 ? <span>Only {item.availableStock} left</span> : null}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-none border border-foreground/12 hover:bg-black hover:text-white"
                    onClick={() => void removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-col gap-4 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-none"
                      disabled={item.quantity <= 1}
                      onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center text-lg font-semibold">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-none"
                      disabled={item.quantity >= item.availableStock}
                      onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">Line total</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="h-fit border bg-card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Order summary</p>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            Quantities are capped by live stock, and final availability is checked again during checkout.
          </p>

          <div className="mt-8 space-y-4 border-t border-border/80 pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Items</span>
              <span>{itemCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between border-t border-border/80 pt-6">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">Total</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(subtotal)}</p>
            </div>
          </div>

          <Button asChild className="mt-8 h-14 w-full rounded-none bg-[#cf6c3e] text-sm uppercase tracking-[0.22em] hover:bg-[#ba5d33]">
            <Link to="/checkout">Checkout</Link>
          </Button>
          <Button asChild variant="outline" className="mt-3 h-14 w-full rounded-none uppercase tracking-[0.22em]">
            <Link to="/products">Continue shopping</Link>
          </Button>
        </aside>
      </div>

      {recommendationProducts.length > 0 ? (
        <div className="mt-16 border-t pt-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Pair with</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-foreground">Recommended additions</h2>
            </div>
            <Button asChild variant="ghost" className="rounded-none uppercase tracking-[0.2em]">
              <Link to="/products">View catalog</Link>
            </Button>
          </div>
          <ProductGrid products={recommendationProducts} />
        </div>
      ) : null}
    </section>
  )
}
