import { useDeferredValue, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ChevronDown, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import imagesImage from '@/assets/images.png'
import jacketsImage from '@/assets/jackets.png'
import ladyModelImage from '@/assets/ladymodel.avif'
import leatherImage from '@/assets/leather.png'
import ProductGrid from '@/components/product/ProductGrid'
import { Button } from '@/components/ui/button'
import { getProductImageClass } from '@/lib/productImage'
import { categoryService } from '@/services/categoryService'
import { productService } from '@/services/productService'

/* ─── Data ─────────────────────────────────────────────── */

const categoryHighlights = [
  {
    category: 'Tops',
    title: 'Everyday essentials',
    description: 'Relaxed tees, structured shirts, and layering basics for a clean, effortless look.',
    image: jacketsImage,
    imageClassName: 'object-right',
  },
  {
    category: 'Outerwear',
    title: 'Refined layers',
    description: 'Structured coats and versatile jackets built for presence and warmth in equal measure.',
    image: leatherImage,
    imageClassName: 'object-center',
  },
  {
    category: 'Dresses',
    title: 'Easy statement pieces',
    description: 'Fluid silhouettes and confident cuts for moments that call for something special.',
    image: ladyModelImage,
    imageClassName: 'object-center',
  },
]


type SortOption = 'featured' | 'price-low' | 'price-high' | 'name'

/* ─── Animation variants ────────────────────────────────── */

const ez: [number, number, number, number] = [0.22, 1, 0.36, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: ez } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const slideLeft = {
  hidden: { opacity: 0, x: -40, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: ez } },
}

const slideRight = {
  hidden: { opacity: 0, x: 40, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: ez } },
}

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
}

/* ─── Sub-components ────────────────────────────────────── */

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: false, margin: '-40px' }}
      transition={{ duration: 0.42, ease: ez }}
      className="flex items-center gap-3"
    >
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: false }}
        transition={{ duration: 0.38, delay: 0.12 }}
        className={`h-px w-8 origin-left ${light ? 'bg-[#D97B4A]' : 'bg-[#C4622D]'}`}
      />
      <span className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${light ? 'text-[#D97B4A]' : 'text-[#C4622D]'}`}>
        {children}
      </span>
    </motion.div>
  )
}

/* ─── Page ──────────────────────────────────────────────── */

export default function ProductListPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [page, setPage] = useState(1)
  const deferredQuery = useDeferredValue(query)

  const { data: catalog, isLoading, isFetching } = useQuery({
    queryKey: ['products', deferredQuery, category, page],
    queryFn: () =>
      productService.getProductCatalog({
        search: deferredQuery || undefined,
        category: category === 'All' ? undefined : category.toLowerCase(),
        page,
        pageSize: 8,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
    retry: 1,
  })

  const { data: storefrontCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  })

  const totalCount = catalog?.totalCount ?? 0
  const totalPages = catalog?.totalPages ?? 1

  const categories = useMemo(
    () => ['All', ...storefrontCategories.map((c) => c.name)],
    [storefrontCategories],
  )

  const products = useMemo(() => {
    const items = [...(catalog?.items ?? [])]
    if (sortBy === 'price-low') return items.sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') return items.sort((a, b) => b.price - a.price)
    if (sortBy === 'name') return items.sort((a, b) => a.name.localeCompare(b.name))
    return items
  }, [catalog?.items, sortBy])

  const featureHighlight =
    categoryHighlights.find((h) => h.category === category) ?? {
      category: 'Curated edit',
      title: 'A cleaner catalog for the pieces worth seeing first.',
      description:
        'Move through the assortment by category, tone, and use case without losing the feeling of an edited collection.',
      image: imagesImage,
      imageClassName: 'object-center',
    }

  return (
    <div style={{ backgroundColor: 'var(--fashion-warm)', color: 'var(--fashion-dark)' }}>

      {/* ── PAGE HERO ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden border-b border-[#E8DDD0]"
        style={{ background: 'linear-gradient(135deg, #EDE3D8 0%, #FAF8F5 65%)' }}
      >
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#C4622D]/6 blur-[90px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[280px] w-[280px] rounded-full bg-[#E8DDD0]/60 blur-[60px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
              {/* Left: headline */}
              <motion.div variants={slideLeft}>
                <SectionLabel>Shop</SectionLabel>
                <h1
                  className="mt-6 text-[clamp(44px,5.8vw,80px)] font-medium leading-[1.02] text-[#0F0E0D]"
                  style={{ ...serif, letterSpacing: '-0.028em' }}
                >
                  Shop the
                  <br />
                  <em className="italic text-[#C4622D]">current edit.</em>
                </h1>
                <p className="mt-7 max-w-[44ch] text-[16px] leading-[1.82] text-[#8B7355]">
                  Handcrafted pieces designed for timeless elegance. Curated for those who dress
                  with intention — no noise, just the right piece at the right moment.
                </p>

                {/* Live stat pills */}
                <div className="mt-9 flex gap-4">
                  {[
                    { label: 'Live catalog', value: String(totalCount) },
                    { label: 'Categories', value: String(categories.length - 1) },
                  ].map((s) => (
                    <motion.div
                      key={s.label}
                      whileHover={{ y: -3, boxShadow: '0 12px_32px_rgba(139,115,85,0.14)' }}
                      className="rounded-2xl border border-[#E8DDD0] bg-white/90 px-5 py-4 shadow-[0_4px_16px_rgba(139,115,85,0.07)]"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C4622D]">
                        {s.label}
                      </p>
                      <p className="mt-2 text-[26px] font-semibold leading-none text-[#0F0E0D]" style={serif}>
                        {s.value}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Right: feature highlight card */}
              <motion.div variants={slideRight} className="relative">
                <div className="group overflow-hidden rounded-[32px] shadow-[0_24px_64px_rgba(15,14,13,0.14)]">
                  <img
                    src={featureHighlight.image}
                    alt={featureHighlight.title}
                    loading="eager"
                    decoding="async"
                    className={`aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${getProductImageClass({ imageFit: 'contain' }, 'detail')}`}
                  />
                  <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-[#0F0E0D]/80 via-[#0F0E0D]/30 to-transparent" />
                  <div className="absolute inset-y-0 left-0 flex max-w-xs flex-col justify-end px-8 py-8 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/60">
                      {featureHighlight.category}
                    </p>
                    <h2
                      className="mt-3 text-[24px] font-medium leading-tight text-white"
                      style={serif}
                    >
                      {featureHighlight.title}
                    </h2>
                    <Link
                      to="/collections"
                      className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 transition-all hover:gap-2.5 hover:text-white"
                    >
                      View collections <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── CATEGORY HIGHLIGHT CARDS ──────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-60px' }}
          variants={stagger}
          className="grid gap-4 md:grid-cols-3"
        >
          {categoryHighlights.map((item, i) => (
            <motion.article
              key={item.category}
              variants={fadeUp}
              whileHover={{ y: -8, boxShadow: '0 20px 48px rgba(139,115,85,0.16)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="group grid cursor-pointer gap-3 rounded-[28px] border border-[#E8DDD0] bg-white/85 p-4 shadow-[0_4px_20px_rgba(139,115,85,0.07)] backdrop-blur sm:grid-cols-[96px_1fr]"
            >
              <div className="overflow-hidden rounded-2xl">
                <img
                  src={item.image}
                  alt={item.title}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`aspect-[4/5] h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.07] ${getProductImageClass(
                    { imageFit: 'contain', imagePositionClassName: item.imageClassName },
                    'mini',
                  )}`}
                />
              </div>
              <div className="self-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C4622D]">
                  {item.category}
                </p>
                <h3 className="mt-1.5 text-[18px] font-medium leading-tight text-[#0F0E0D]" style={serif}>
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-6 text-[#8B7355]">
                  {item.description}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>

      {/* ── SEARCH & FILTER BAR ───────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-40px' }}
          transition={{ duration: 0.5, ease: ez }}
        >
          <div className="grid gap-3 md:grid-cols-[1fr_200px_200px]">
            {/* Search */}
            <label className="group relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B0A090] transition-colors duration-200 group-focus-within:text-[#C4622D]" />
              <input
                id="shop-search"
                name="search"
                autoComplete="off"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                placeholder="Search products…"
                className="h-[54px] w-full rounded-2xl border border-[#E8DDD0] bg-white pl-11 pr-10 text-[14.5px] text-[#0F0E0D] shadow-[0_2px_12px_rgba(139,115,85,0.06)] outline-none transition-all duration-200 placeholder:text-[#B8A898] focus:border-[#C4622D] focus:shadow-[0_4px_20px_rgba(196,98,45,0.14)]"
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    type="button"
                    onClick={() => { setQuery(''); setPage(1) }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8B7355] transition-colors hover:text-[#C4622D]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </label>

            {/* Category */}
            <div className="relative">
              <select
                id="shop-category"
                name="category"
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1) }}
                className="h-[54px] w-full appearance-none rounded-2xl border border-[#E8DDD0] bg-white pl-4 pr-10 text-[14px] text-[#0F0E0D] shadow-[0_2px_12px_rgba(139,115,85,0.06)] outline-none transition-all duration-200 focus:border-[#C4622D] focus:shadow-[0_4px_20px_rgba(196,98,45,0.12)]"
              >
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B7355]" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                id="shop-sort"
                name="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-[54px] w-full appearance-none rounded-2xl border border-[#E8DDD0] bg-white pl-4 pr-10 text-[14px] text-[#0F0E0D] shadow-[0_2px_12px_rgba(139,115,85,0.06)] outline-none transition-all duration-200 focus:border-[#C4622D] focus:shadow-[0_4px_20px_rgba(196,98,45,0.12)]"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B7355]" />
            </div>
          </div>

          {/* Active filter chip */}
          <AnimatePresence>
            {category !== 'All' && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="flex gap-2 overflow-hidden"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-[#C4622D]/30 bg-[#C4622D]/8 px-3.5 py-1.5 text-[12px] font-medium text-[#C4622D]">
                  {category}
                  <button
                    type="button"
                    onClick={() => { setCategory('All'); setPage(1) }}
                    className="transition-transform hover:rotate-90 hover:scale-110"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── PRODUCT CATALOG ───────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 pb-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-40px' }}
          transition={{ duration: 0.55, ease: ez }}
          className="overflow-hidden rounded-[36px] border border-[#E8DDD0] bg-white/90 shadow-[0_8px_48px_rgba(139,115,85,0.09)] backdrop-blur"
        >
          {/* Catalog header */}
          <div className="flex flex-col gap-4 border-b border-[#EDE5DB] px-7 py-7 sm:px-9 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C4622D]">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog
              </div>
              <h2
                className="mt-3 text-[clamp(26px,3vw,38px)] font-medium leading-tight text-[#0F0E0D]"
                style={{ ...serif, letterSpacing: '-0.02em' }}
              >
                {category === 'All' ? 'Shop all styles' : `${category} selection`}
              </h2>
              <p className="mt-2 text-[13.5px] leading-6 text-[#8B7355]">
                Filter by category or search directly for a specific piece.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8DDD0] bg-[#F4EFE8] px-4 py-2 text-[12.5px] text-[#8B7355]">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#C4622D]" />
                {totalCount} items
              </div>
              <AnimatePresence>
                {isFetching && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#C4622D]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C4622D]">
                      Updating
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Products area */}
          <div className="px-7 py-8 sm:px-9">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-[28px] border border-[#E8DDD0] bg-white">
                      <div className="aspect-[4/4.8] animate-pulse bg-gradient-to-b from-[#F4EFE8] to-[#E8DDD0]" />
                      <div className="space-y-3 p-4">
                        <div className="h-2.5 w-16 animate-pulse rounded-full bg-[#EDE5DB]" />
                        <div className="h-5 w-3/4 animate-pulse rounded-full bg-[#F0E8DC]" />
                        <div className="h-2.5 w-full animate-pulse rounded-full bg-[#F4EFE8]" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : totalCount === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-[28px] border border-dashed border-[#E8DDD0] bg-[#FAF8F5] px-8 py-20 text-center"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#C4622D]">
                    No products found
                  </p>
                  <h3 className="mt-4 text-[26px] font-medium text-[#0F0E0D]" style={serif}>
                    Try a different search or filter.
                  </h3>
                  <p className="mx-auto mt-3 max-w-xs text-[14px] leading-7 text-[#8B7355]">
                    Clearing filters usually brings the full edit right back.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    className="mt-7 inline-flex h-11 items-center gap-2 rounded-full border border-[#E8DDD0] bg-white px-6 text-[13px] font-medium text-[#0F0E0D] shadow-sm transition-all hover:border-[#C4622D] hover:text-[#C4622D]"
                    onClick={() => { setQuery(''); setCategory('All'); setSortBy('featured'); setPage(1) }}
                  >
                    Reset filters
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="products"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProductGrid products={products} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-4 border-t border-[#EDE5DB] px-7 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-9">
            <p className="text-[13px] text-[#8B7355]">
              Page{' '}
              <strong className="font-semibold text-[#0F0E0D]">{page}</strong>
              {' '}of{' '}
              <strong className="font-semibold text-[#0F0E0D]">{totalPages}</strong>
            </p>
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-[#E8DDD0] bg-white px-5 text-[13px] text-[#0F0E0D] transition-all hover:border-[#C4622D] hover:text-[#C4622D] disabled:opacity-40"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((c) => Math.max(1, c - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-[#E8DDD0] bg-white px-5 text-[13px] text-[#0F0E0D] transition-all hover:border-[#C4622D] hover:text-[#C4622D] disabled:opacity-40"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── BOTTOM CTA ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-60px' }}
          transition={{ duration: 0.65, ease: ez }}
          className="relative mt-8 overflow-hidden rounded-[36px] bg-[#0F0E0D] px-8 py-12 text-white shadow-[0_32px_72px_rgba(15,14,13,0.20)] sm:px-12"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-[360px] w-[360px] rounded-full bg-[#C4622D]/14 blur-[80px]" />
          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <SectionLabel light>Collections</SectionLabel>
              <h2
                className="mt-4 max-w-xl text-[clamp(24px,3.5vw,40px)] font-medium leading-tight text-white"
                style={serif}
              >
                Explore the full{' '}
                <em className="italic text-[#D97B4A]">curated selection.</em>
              </h2>
            </div>
            <Link
              to="/collections"
              className="shimmer-btn group inline-flex h-[52px] shrink-0 items-center gap-2.5 rounded-full bg-[#C4622D] px-8 text-[13.5px] font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#D97B4A] hover:shadow-[0_14px_36px_rgba(196,98,45,0.38)]"
            >
              View collections
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
