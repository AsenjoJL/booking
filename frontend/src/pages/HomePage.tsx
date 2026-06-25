import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, useMotionValue, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Mail,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import collectionImage from '@/assets/collection.png'
import collection2Image from '@/assets/collection2.png'
import collection4Image from '@/assets/collection4.png'
import heroImage from '@/assets/clothing.avif'
import ladyModelImage from '@/assets/ladymodel.avif'
import fashion3Image from '@/assets/fashion3.png'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { getProductImageClass, getProductImageSurfaceClass } from '@/lib/productImage'
import { productService } from '@/services/productService'
import { useCartStore } from '@/store/cartStore'
import type { Product } from '@/types/product'
import { formatCurrency } from '@/utils/format'

/* ─── Data ─────────────────────────────────────────────────────────── */

const featuredCollections = [
  {
    title: 'Men',
    description: 'Shirts, pants and polished staples for everyday wear.',
    image: collectionImage,
    tag: 'New Season',
    span: 'row-span-2',
  },
  {
    title: 'Women',
    description: 'Dresses, tops and modern silhouettes with clean lines.',
    image: collection2Image,
    tag: 'Trending',
    span: '',
  },
  {
    title: 'Accessories',
    description: 'Bags, shoes and finishing pieces that complete the look.',
    image: collection4Image,
    tag: 'Essentials',
    span: '',
  },
]

const trustItems = [
  {
    icon: Truck,
    number: '01',
    title: 'Free Shipping',
    description: 'Complimentary delivery on all orders over ₱1,500.',
  },
  {
    icon: RotateCcw,
    number: '02',
    title: 'Easy Returns',
    description: 'Hassle-free 30-day returns on all items.',
  },
  {
    icon: ShieldCheck,
    number: '03',
    title: 'Secure Checkout',
    description: 'SSL-encrypted payments and data protection.',
  },
]

/* ─── Animation helpers ─────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.11 } },
}

/* ─── RevealSection ─────────────────────────────────────────────────── */

function RevealSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.12 })

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={{
        hidden: { opacity: 0, y: 32 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

/* ─── SectionLabel ──────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-8 bg-[#C4622D]" />
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C4622D]">
        {children}
      </span>
    </div>
  )
}

/* ─── CollectionCard ────────────────────────────────────────────────── */

function CollectionCard({
  title,
  description,
  image,
  tag,
  index,
  large = false,
}: {
  title: string
  description: string
  image: string
  tag: string
  index: number
  large?: boolean
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ['6deg', '-6deg'])
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ['-6deg', '6deg'])

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={`group relative overflow-hidden rounded-3xl cursor-pointer ${
        large ? 'min-h-[520px]' : 'min-h-[240px]'
      }`}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={image}
          alt={title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E0D]/80 via-[#0F0E0D]/20 to-transparent" />
      </div>

      {/* Tag pill */}
      <div className="absolute left-4 top-4 z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md border border-white/20">
          <Sparkles className="h-2.5 w-2.5" />
          {tag}
        </span>
      </div>

      {/* Text */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
          Collection
        </p>
        <h3
          className="mt-2 text-[28px] font-medium leading-tight text-white"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {title}
        </h3>
        {large && (
          <p className="mt-2 max-w-[22ch] text-[13.5px] leading-6 text-white/72">{description}</p>
        )}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + index * 0.1 }}
          className="mt-4"
        >
          <Link
            to="/collections"
            className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-white/90 transition-all hover:text-white hover:gap-3"
          >
            Explore
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </motion.article>
  )
}

/* ─── LandingProductCard ─────────────────────────────────────────────── */

function LandingProductCard({ product, index }: { product: Product; index: number }) {
  const addItem = useCartStore((state) => state.addItem)
  const [wishlisted, setWishlisted] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const displayPrice = product.salePrice ?? product.price
  const isOnSale = !!product.salePrice && product.salePrice < product.price

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-60px' }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setShowQuickAdd(true)}
      onMouseLeave={() => setShowQuickAdd(false)}
      className="group overflow-hidden rounded-3xl border border-[#E8DDD0] bg-white shadow-[0_2px_16px_rgba(139,115,85,0.06)] transition-shadow duration-300 hover:shadow-[0_16px_48px_rgba(139,115,85,0.16)]"
    >
      <Link to={`/products/${product.slug}`} className="block">
        <div
          className={`relative aspect-[4/4.8] overflow-hidden bg-[#F4EFE8] ${getProductImageSurfaceClass(product)}`}
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className={`h-full w-full transition-transform duration-700 group-hover:scale-[1.05] ${getProductImageClass(product, 'catalog')}`}
          />

          {/* Sale badge */}
          {isOnSale && (
            <span className="absolute left-3 top-3 rounded-full bg-[#C4622D] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
              Sale
            </span>
          )}

          {/* Wishlist */}
          <button
            type="button"
            aria-label="Wishlist"
            onClick={(e) => { e.preventDefault(); setWishlisted((w) => !w) }}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/90 shadow-sm backdrop-blur transition-transform hover:scale-110"
          >
            <Heart
              className={`h-4 w-4 transition-colors duration-200 ${wishlisted ? 'fill-[#C4622D] text-[#C4622D]' : 'text-[#6b5f52]'}`}
            />
          </button>

          {/* Quick Add overlay */}
          <AnimatePresence>
            {showQuickAdd && product.stock > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-x-0 bottom-0 p-3"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void addItem(product)
                  }}
                  className="shimmer-btn flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F0E0D] py-3 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Quick Add
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#8B7355]">
            {product.category}
          </p>
          <Link
            to={`/products/${product.slug}`}
            className="mt-1.5 block text-[15.5px] font-medium tracking-[-0.02em] text-[#0F0E0D] transition-colors hover:text-[#C4622D]"
          >
            {product.name}
          </Link>
        </div>

        <div className="flex items-center justify-between border-t border-[#EDE5DB] pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-semibold text-[#0F0E0D]">
              {formatCurrency(displayPrice)}
            </span>
            {isOnSale && (
              <span className="text-[13px] text-[#8B7355] line-through">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
          {product.stock <= 0 && (
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8B7355]">
              Sold out
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}

/* ─── HomePage ───────────────────────────────────────────────────────── */

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productService.getProducts(),
  })

  const featuredProducts = useMemo(() => products.slice(0, 8), [products])

  /* Parallax on hero image */
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroImgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])

  return (
    <div style={{ backgroundColor: 'var(--fashion-warm)', color: 'var(--fashion-dark)' }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative flex h-screen min-h-[600px] flex-col overflow-hidden"
      >
        {/* Full-bleed parallax background */}
        <motion.div className="absolute inset-0" style={{ y: heroImgY }}>
          <img
            src={heroImage}
            alt="Spring Summer 2026 fashion editorial"
            decoding="async"
            className="h-[115%] w-full object-cover object-center"
          />
        </motion.div>

        {/* Left-to-right gradient — dark on left, fades right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0E0D]/82 via-[#0F0E0D]/42 to-[#0F0E0D]/8" />
        {/* Bottom vignette so stats stay legible */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0F0E0D]/55 to-transparent" />

        {/* ── Content column — full height, flex-col ── */}
        <div className="relative flex h-full w-full flex-col">
          <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-6 pb-12 pt-28 sm:px-8 lg:px-12">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="flex h-full max-w-[600px] flex-col"
            >
              {/* Season badge */}
              <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C4622D]" />
                  Spring / Summer 2026
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.65 }}
                className="mt-6 text-white"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 'clamp(52px, 7vw, 100px)',
                  fontWeight: 500,
                  lineHeight: 1.02,
                  letterSpacing: '-0.025em',
                }}
              >
                <span className="italic text-white/92">Elevate</span>
                <br />
                Your Style
              </motion.h1>

              {/* Subtext */}
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="mt-6 max-w-[40ch] text-[15.5px] leading-[1.76] text-white/68"
              >
                Discover the latest trends in contemporary fashion — from classic
                elegance to bold, confident statements.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Link
                  to="/products"
                  className="shimmer-btn group inline-flex h-[52px] items-center gap-2.5 rounded-full bg-white px-8 text-[13.5px] font-semibold text-[#0F0E0D] shadow-[0_8px_28px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(0,0,0,0.38)]"
                >
                  Shop Women
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/products"
                  className="inline-flex h-[52px] items-center rounded-full border border-white/28 bg-white/10 px-8 text-[13.5px] font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/18"
                >
                  Shop Men
                </Link>
              </motion.div>

              {/* Stats — pinned to bottom via mt-auto */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="mt-auto flex items-center gap-10 border-t border-white/15 pt-7"
              >
                {[
                  { value: '12K+', label: 'Happy customers', icon: null },
                  { value: '4.9', label: 'Average rating', icon: <Star className="inline h-4 w-4 fill-white text-white" /> },
                  { value: '200+', label: 'New styles weekly', icon: null },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p
                      className="flex items-center gap-1 text-[23px] font-semibold leading-none text-white"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {stat.value}{stat.icon}
                    </p>
                    <p className="mt-1.5 text-[11px] font-medium tracking-[0.04em] text-white/52">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator — bottom-center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/40">
              Scroll
            </span>
            <ChevronDown className="scroll-bounce h-4 w-4 text-white/40" />
          </div>
        </div>
      </section>

      {/* ── FEATURED COLLECTIONS ────────────────────────────────────── */}
      <RevealSection className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 pb-10">
          <div>
            <SectionLabel>Curated Edit</SectionLabel>
            <h2
              className="mt-4 text-[clamp(32px,4vw,48px)] font-medium leading-tight text-[#0F0E0D]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.025em' }}
            >
              Featured Collections
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#8B7355]">
              A more intentional edit of wardrobe essentials, occasion pieces, and finishing details.
            </p>
          </div>
          <Link
            to="/collections"
            className="hidden shrink-0 items-center gap-2 text-[13px] font-semibold text-[#C4622D] transition-all hover:gap-3 md:flex"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {featuredCollections.map((collection, index) => (
            <div
              key={collection.title}
              className={index === 0 ? 'lg:row-span-2' : ''}
            >
              <CollectionCard
                {...collection}
                index={index}
                large={index === 0}
              />
            </div>
          ))}
        </div>
      </RevealSection>

      {/* ── SALE BANNER ─────────────────────────────────────────────── */}
      <RevealSection className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px]">
          {/* Background image */}
          <img
            src={fashion3Image}
            alt="Sale collection"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F0E0D]/90 via-[#0F0E0D]/72 to-[#0F0E0D]/20" />

          <div className="relative px-8 py-14 sm:px-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                {/* Badge */}
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C4622D]/40 bg-[#C4622D]/20 px-4 py-2">
                  <span className="animate-pulse-ring h-2 w-2 rounded-full bg-[#C4622D]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D97B4A]">
                    Limited Offer
                  </span>
                </div>
                <h2
                  className="text-[clamp(32px,4vw,52px)] font-medium leading-[1.06] text-white"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Up to{' '}
                  <span
                    className="italic"
                    style={{ color: '#D97B4A' }}
                  >
                    30% off
                  </span>{' '}
                  selected styles
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-white/68">
                  Seasonal pieces, now easier to bring home — same polished silhouettes, elevated finishing.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4 lg:items-end">
                <Link
                  to="/products"
                  className="shimmer-btn inline-flex h-14 items-center gap-2.5 rounded-full bg-white px-8 text-[13.5px] font-semibold text-[#0F0E0D] shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Browse Sale
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-[12px] text-white/42">Ends soon · While stocks last</p>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ── NEW ARRIVALS ─────────────────────────────────────────────── */}
      <RevealSection className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 pb-10">
          <div>
            <SectionLabel>Latest Drops</SectionLabel>
            <h2
              className="mt-4 text-[clamp(32px,4vw,48px)] font-medium leading-tight text-[#0F0E0D]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.025em' }}
            >
              New Arrivals
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#8B7355]">
              Fresh pieces selected to keep discovery focused, clear, and premium in feel.
            </p>
          </div>
          <Link
            to="/products"
            className="hidden shrink-0 items-center gap-2 text-[13px] font-semibold text-[#C4622D] transition-all hover:gap-3 md:flex"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Product grid — 4 col desktop, horizontal scroll mobile */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product, index) => (
            <LandingProductCard key={product.id} product={product} index={index} />
          ))}
        </div>

        <div className="mt-8 flex justify-center md:hidden">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#C4622D]"
          >
            View all products
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </RevealSection>

      {/* ── TRUST / WHY US ──────────────────────────────────────────── */}
      <RevealSection>
        <div
          className="py-20"
          style={{ background: 'linear-gradient(135deg, #F0E8DC 0%, #FAF8F5 100%)' }}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <SectionLabel>Why Shop With Us</SectionLabel>
              <h2
                className="mt-4 text-[clamp(30px,4vw,44px)] font-medium leading-tight text-[#0F0E0D]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.025em' }}
              >
                Shopping, made{' '}
                <em className="italic text-[#C4622D]">effortless.</em>
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {trustItems.map((item, index) => (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: false, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative overflow-hidden rounded-3xl border border-[#DDD0C0]/60 bg-white/80 p-8 shadow-[0_4px_24px_rgba(139,115,85,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(139,115,85,0.14)]"
                >
                  {/* Large editorial number */}
                  <span
                    className="absolute right-5 top-4 text-[72px] font-bold leading-none text-[#E8DDD0] transition-colors duration-300 group-hover:text-[#DDD0C0]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    aria-hidden
                  >
                    {item.number}
                  </span>

                  <div className="relative">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4EFE8] text-[#C4622D]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 text-[18px] font-semibold tracking-[-0.02em] text-[#0F0E0D]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-7 text-[#8B7355]">
                      {item.description}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ── NEWSLETTER ───────────────────────────────────────────────── */}
      <RevealSection className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[36px] border border-[#E8DDD0]">
          <div className="grid lg:grid-cols-[1fr_1.1fr]">

            {/* Left: image */}
            <div className="relative hidden min-h-[420px] overflow-hidden lg:block">
              <img
                src={ladyModelImage}
                alt="Newsletter"
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#FAF8F5]/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E0D]/40 to-transparent" />
              <div className="absolute bottom-8 left-8">
                <p
                  className="text-[28px] font-medium italic leading-tight text-white"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  "Style is a way to
                  <br />
                  say who you are
                  <br />
                  without speaking."
                </p>
              </div>
            </div>

            {/* Right: form */}
            <div className="flex flex-col justify-center bg-[#F4EFE8] px-8 py-12 sm:px-12">
              <SectionLabel>Stay Informed</SectionLabel>
              <h2
                className="mt-4 text-[clamp(28px,3.5vw,40px)] font-medium leading-tight text-[#0F0E0D]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                First access,
                <br />
                <em className="italic text-[#C4622D]">always.</em>
              </h2>
              <p className="mt-3 text-[14.5px] leading-7 text-[#8B7355]">
                Get early access to new arrivals, private offers, and curated style updates worth
                actually opening.
              </p>

              {/* Social proof */}
              <div className="mt-5 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['#C4622D', '#D97B4A', '#8B7355', '#E8DDD0'].map((color, i) => (
                    <div
                      key={i}
                      className="h-7 w-7 rounded-full border-2 border-[#F4EFE8]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-[12.5px] text-[#8B7355]">
                  Join <strong className="text-[#0F0E0D]">12,000+</strong> style-conscious shoppers
                </p>
              </div>

              <form
                className="mt-7"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!email.trim()) return
                  setSubscribed(true)
                  setEmail('')
                }}
              >
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <div className="flex overflow-hidden rounded-full border border-[#DDD0C0] bg-white shadow-[0_2px_12px_rgba(139,115,85,0.08)]">
                  <div className="flex flex-1 items-center px-5">
                    <Mail className="mr-3 h-4 w-4 shrink-0 text-[#8B7355]" />
                    <input
                      id="newsletter-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-[14px] text-[#0F0E0D] outline-none placeholder:text-[#B0A090]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="shimmer-btn m-1.5 inline-flex items-center gap-2 rounded-full bg-[#0F0E0D] px-6 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Subscribe
                  </button>
                </div>
              </form>

              <AnimatePresence>
                {subscribed && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 flex items-center gap-2 text-[13px] font-medium text-emerald-600"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    You're subscribed — welcome to the edit.
                  </motion.p>
                )}
              </AnimatePresence>

              <p className="mt-4 text-[11.5px] text-[#B0A090]">
                No spam, ever. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </RevealSection>
    </div>
  )
}
