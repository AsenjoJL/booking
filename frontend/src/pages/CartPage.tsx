import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Minus, Package, Plus, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import deleteIcon from '@/assets/deleteicon.png'
import ProductGrid from '@/components/product/ProductGrid'
import { getProductImageClass, getProductImageSurfaceClass } from '@/lib/productImage'
import { productService } from '@/services/productService'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/utils/format'

const ez: [number, number, number, number] = [0.22, 1, 0.36, 1]

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
}

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: ez } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: ez }}
        className="h-px w-8 origin-left bg-[#C4622D]"
      />
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C4622D]">
        {children}
      </span>
    </div>
  )
}

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

  /* ── Empty state ────────────────────────────────────────── */
  if (items.length === 0) {
    return (
      <div style={{ backgroundColor: 'var(--fashion-warm)', color: 'var(--fashion-dark)' }}>
        <div
          className="relative overflow-hidden border-b border-[#E8DDD0]"
          style={{ background: 'linear-gradient(135deg, #EDE3D8 0%, #FAF8F5 65%)' }}
        >
          <div className="pointer-events-none absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full bg-[#C4622D]/6 blur-[80px]" />
          <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp}>
                <SectionLabel>Your Cart</SectionLabel>
              </motion.div>
              <motion.h1
                variants={fadeUp}
                className="mt-6 text-[clamp(42px,5.5vw,72px)] font-medium leading-[1.04] text-[#0F0E0D]"
                style={{ ...serif, letterSpacing: '-0.025em' }}
              >
                Your bag is
                <br />
                <em className="italic text-[#C4622D]">empty.</em>
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-6 max-w-md text-[15.5px] leading-[1.8] text-[#8B7355]">
                Start with the latest arrivals and build a cleaner, considered wardrobe from there.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-9">
                <Link
                  to="/products"
                  className="shimmer-btn group inline-flex h-[52px] items-center gap-2.5 rounded-full bg-[#0F0E0D] px-8 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,14,13,0.24)]"
                >
                  Browse products
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Cart with items ────────────────────────────────────── */
  return (
    <div style={{ backgroundColor: 'var(--fashion-warm)', color: 'var(--fashion-dark)' }}>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden border-b border-[#E8DDD0]"
        style={{ background: 'linear-gradient(135deg, #EDE3D8 0%, #FAF8F5 65%)' }}
      >
        <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#C4622D]/6 blur-[80px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
              {/* Left: heading */}
              <div>
                <motion.div variants={fadeUp}>
                  <SectionLabel>Cart</SectionLabel>
                </motion.div>
                <motion.h1
                  variants={fadeUp}
                  className="mt-6 text-[clamp(38px,5vw,64px)] font-medium leading-[1.06] text-[#0F0E0D]"
                  style={{ ...serif, letterSpacing: '-0.025em' }}
                >
                  Review your
                  <br />
                  <em className="italic text-[#C4622D]">everyday picks.</em>
                </motion.h1>
                <motion.p variants={fadeUp} className="mt-5 max-w-md text-[15px] leading-[1.8] text-[#8B7355]">
                  Adjust quantities, review stock-sensitive items, and move into checkout with a cleaner summary.
                </motion.p>
              </div>

              {/* Right: stat cards */}
              <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Package, label: `${itemCount} item${itemCount > 1 ? 's' : ''}`, sub: 'Ready to review' },
                  { icon: ShieldCheck, label: 'Protected', sub: 'Stock checks stay active' },
                  { icon: Truck, label: 'Address-ready', sub: 'Set at checkout' },
                ].map((card) => (
                  <motion.div
                    key={card.label}
                    variants={fadeUp}
                    whileHover={{ y: -4, boxShadow: '0 16px_40px rgba(139,115,85,0.14)' }}
                    className="rounded-3xl border border-[#E8DDD0] bg-white/85 p-6 shadow-[0_4px_20px_rgba(139,115,85,0.07)]"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4EFE8] text-[#C4622D]">
                      <card.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                    </div>
                    <p className="mt-4 text-[18px] font-medium text-[#0F0E0D]" style={serif}>{card.label}</p>
                    <p className="mt-1 text-[12.5px] leading-6 text-[#8B7355]">{card.sub}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── CART BODY ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-7 lg:grid-cols-[1fr_360px]">

          {/* Cart items */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-5"
          >
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: ez } }}
                  exit={{ opacity: 0, x: -40, scale: 0.95, transition: { duration: 0.3, ease: ez } }}
                  className="grid gap-5 overflow-hidden rounded-[28px] border border-[#E8DDD0] bg-white/90 shadow-[0_4px_24px_rgba(139,115,85,0.07)] sm:grid-cols-[148px_1fr]"
                >
                  {/* Product image */}
                  <div className={`overflow-hidden rounded-[20px] ${getProductImageSurfaceClass(item)}`}>
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      loading="lazy"
                      decoding="async"
                      className={`aspect-square h-full w-full transition-transform duration-500 hover:scale-[1.04] ${getProductImageClass(item, 'thumbnail')}`}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex flex-col justify-between gap-5 px-5 py-5 pr-5 sm:pl-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C4622D]">
                          {item.availableStock > 0 ? 'Ready to wear' : 'Unavailable'}
                        </p>
                        <h2 className="mt-2 text-[20px] font-medium leading-tight text-[#0F0E0D]" style={serif}>
                          {item.productName}
                        </h2>
                        <p className="mt-2 text-[14.5px] text-[#8B7355]">{formatCurrency(item.unitPrice)}</p>
                        {item.availableStock <= 0 && (
                          <span className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-red-500">
                            Out of stock
                          </span>
                        )}
                        {item.availableStock > 0 && item.availableStock <= 10 && (
                          <span className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600">
                            Only {item.availableStock} left
                          </span>
                        )}
                      </div>

                      {/* Delete button */}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.92 }}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#EDE5DB] bg-[#FAF8F5] transition-colors hover:border-red-200 hover:bg-red-50"
                        onClick={() => void removeItem(item.id)}
                        aria-label="Remove item"
                      >
                        <img src={deleteIcon} alt="" aria-hidden className="h-3.5 w-3.5 object-contain opacity-70" />
                      </motion.button>
                    </div>

                    {/* Qty + line total */}
                    <div className="flex flex-col gap-4 border-t border-[#EDE5DB] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-1">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          disabled={item.quantity <= 1}
                          onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E8DDD0] bg-white text-[#0F0E0D] transition-all hover:border-[#C4622D] hover:text-[#C4622D] disabled:opacity-35"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </motion.button>
                        <span className="w-10 text-center text-[16px] font-semibold text-[#0F0E0D]">
                          {item.quantity}
                        </span>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          disabled={item.quantity >= item.availableStock}
                          onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E8DDD0] bg-white text-[#0F0E0D] transition-all hover:border-[#C4622D] hover:text-[#C4622D] disabled:opacity-35"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </motion.button>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B7355]">Line total</p>
                        <p className="mt-1 text-[20px] font-semibold text-[#0F0E0D]" style={serif}>
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Order summary */}
          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55, ease: ez }}
            className="h-fit overflow-hidden rounded-[28px] border border-[#E8DDD0] bg-white/90 shadow-[0_8px_40px_rgba(139,115,85,0.09)]"
          >
            {/* Terracotta accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-[#C4622D] to-[#D97B4A]" />

            <div className="p-7">
              <SectionLabel>Order summary</SectionLabel>
              <p className="mt-4 text-[13.5px] leading-[1.8] text-[#8B7355]">
                Quantities are capped by live stock. Final availability is checked again at checkout.
              </p>

              <div className="mt-8 space-y-3 border-t border-[#EDE5DB] pt-6">
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-[#8B7355]">Items</span>
                  <span className="font-medium text-[#0F0E0D]">{itemCount}</span>
                </div>
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-[#8B7355]">Subtotal</span>
                  <span className="font-medium text-[#0F0E0D]">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-[#8B7355]">Shipping</span>
                  <span className="font-medium text-[#C4622D]">Set at checkout</span>
                </div>
              </div>

              {/* Total */}
              <div className="mt-6 flex items-end justify-between rounded-2xl bg-[#F4EFE8] px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B7355]">Total</p>
                  <p className="mt-1.5 text-[28px] font-semibold leading-none text-[#0F0E0D]" style={serif}>
                    {formatCurrency(subtotal)}
                  </p>
                </div>
                <ShoppingBag className="h-5 w-5 text-[#C4622D]" />
              </div>

              {/* CTAs */}
              <div className="mt-6 space-y-3">
                <Link
                  to="/checkout"
                  className="shimmer-btn group flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-[#C4622D] text-[13.5px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#D97B4A] hover:shadow-[0_12px_32px_rgba(196,98,45,0.36)]"
                >
                  Checkout
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/products"
                  className="flex h-[48px] w-full items-center justify-center rounded-full border border-[#E8DDD0] text-[13px] font-medium text-[#0F0E0D] transition-all hover:border-[#C4622D] hover:text-[#C4622D]"
                >
                  Continue shopping
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-7 flex items-center gap-3 border-t border-[#EDE5DB] pt-5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#C4622D]" />
                <p className="text-[11.5px] leading-5 text-[#8B7355]">
                  Secure checkout — SSL encrypted, no stored card data.
                </p>
              </div>
            </div>
          </motion.aside>
        </div>

        {/* ── RECOMMENDATIONS ──────────────────────────────────── */}
        {recommendationProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: '-60px' }}
            transition={{ duration: 0.6, ease: ez }}
            className="mt-16"
          >
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <SectionLabel>Pair with</SectionLabel>
                <h2
                  className="mt-4 text-[clamp(26px,3.5vw,40px)] font-medium leading-tight text-[#0F0E0D]"
                  style={{ ...serif, letterSpacing: '-0.02em' }}
                >
                  Recommended additions
                </h2>
              </div>
              <Link
                to="/products"
                className="hidden items-center gap-2 text-[13px] font-semibold text-[#C4622D] transition-all hover:gap-3 md:flex"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ProductGrid products={recommendationProducts} />
          </motion.div>
        )}
      </div>
    </div>
  )
}
