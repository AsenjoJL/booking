import { useDeferredValue, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import imagesImage from '@/assets/images.png'
import jacketsImage from '@/assets/jackets.png'
import ladyModelImage from '@/assets/ladymodel.avif'
import leatherImage from '@/assets/leather.png'
import ProductGrid from '@/components/product/ProductGrid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createFadeUpVariants,
  createSlideVariants,
  createStaggerContainer,
  replayViewport,
  replayViewportTight,
} from '@/lib/motion'
import { getProductImageClass } from '@/lib/productImage'
import { categoryService } from '@/services/categoryService'
import { productService } from '@/services/productService'

const containerVariants = createStaggerContainer()
const itemVariants = createFadeUpVariants()
const { left: slideLeftVariants, right: slideRightVariants } = createSlideVariants(48, 0.75)

const categoryHighlights = [
  {
    category: 'Apparel',
    title: 'Layered essentials',
    description: 'Structured staples and dependable outer layers for the everyday wardrobe.',
    image: jacketsImage,
    surfaceClassName: '',
    imageClassName: 'object-right',
  },
  {
    category: 'Accessories',
    title: 'Refined accents',
    description: 'Smaller finishing pieces that round out the wardrobe without overcomplicating it.',
    image: leatherImage,
    surfaceClassName: '',
    imageClassName: 'object-center',
  },
  {
    category: 'Womenswear',
    title: 'Easy statement pieces',
    description: 'Softer silhouettes and brighter looks for days that ask a little more from the outfit.',
    image: ladyModelImage,
    surfaceClassName: '',
    imageClassName: 'object-center',
  },
]

type SortOption = 'featured' | 'price-low' | 'price-high' | 'name'

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
    placeholderData: (previousData) => previousData,
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
    () => ['All', ...storefrontCategories.map((item) => item.name)],
    [storefrontCategories],
  )
  const products = useMemo(() => {
    const items = [...(catalog?.items ?? [])]

    if (sortBy === 'price-low') {
      return items.sort((left, right) => left.price - right.price)
    }

    if (sortBy === 'price-high') {
      return items.sort((left, right) => right.price - left.price)
    }

    if (sortBy === 'name') {
      return items.sort((left, right) => left.name.localeCompare(right.name))
    }

    return items
  }, [catalog?.items, sortBy])

  const featureHighlight =
    categoryHighlights.find((item) => item.category === category) ?? {
      category: 'Curated edit',
      title: 'A cleaner catalog for the pieces worth seeing first.',
      description:
        'Move through the assortment by category, tone, and use case without losing the feeling of an edited collection.',
      image: imagesImage,
      surfaceClassName: '',
      imageClassName: 'object-center',
    }

  return (
    <section className="relative overflow-hidden bg-[#f6efe8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(211,109,61,0.09),transparent_30%),linear-gradient(180deg,rgba(246,239,232,0.96)_0%,rgba(244,236,226,0.98)_100%)]" />

      <div className="lux-page-shell">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="lux-page-intro"
        >
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <motion.div variants={slideLeftVariants}>
              <p className="lux-eyebrow">Shop</p>
              <h1 className="lux-heading mt-4 max-w-3xl">
                Shop the
                <br />
                current edit.
              </h1>
              <p className="mt-8 max-w-xl text-[1.08rem] leading-9 text-[#322928]/78">
                Handcrafted evening wear designed for timeless elegance. Each piece is made with meticulous attention to detail and customizable to match your vision.
              </p>

              <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-[#e4d8cd] bg-white/70 px-5 py-4 shadow-[0_12px_30px_rgba(60,35,21,0.05)] backdrop-blur">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">Live catalog</p>
                  <p className="mt-2 text-2xl font-semibold text-[#1f1716]">{totalCount}</p>
                </div>
                <div className="rounded-2xl border border-[#e4d8cd] bg-white/70 px-5 py-4 shadow-[0_12px_30px_rgba(60,35,21,0.05)] backdrop-blur">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">Categories</p>
                  <p className="mt-2 text-2xl font-semibold text-[#1f1716]">{categories.length - 1}</p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={slideRightVariants} className="hidden lg:block" />
          </div>
        </motion.div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.14fr)_minmax(320px,0.86fr)]">
          <motion.article
            initial="hidden"
            whileInView="visible"
            viewport={replayViewport}
            variants={slideLeftVariants}
            className={`relative overflow-hidden rounded-[28px] border border-[#eadfd3] ${featureHighlight.surfaceClassName} shadow-[0_20px_50px_rgba(56,34,21,0.08)]`}
          >
            <img
              src={featureHighlight.image}
              alt={featureHighlight.title}
              loading="eager"
              decoding="async"
              className={`aspect-[16/10] w-full transition-transform duration-700 hover:scale-[1.03] ${getProductImageClass({ imageFit: 'contain' }, 'detail')}`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(24,18,16,0.84)] via-[rgba(24,18,16,0.38)] to-transparent" />
            <div className="absolute inset-y-0 left-0 flex max-w-lg flex-col justify-end px-8 py-8 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/88">{featureHighlight.category}</p>
              <h2 className="mt-3 max-w-[12ch] font-serif text-4xl leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.16)]">
                {featureHighlight.title}
              </h2>
              <p className="mt-4 max-w-[34ch] text-base leading-8 text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.12)]">
                {featureHighlight.description}
              </p>
              <Button
                asChild
                variant="ghost"
                className="mt-6 h-auto w-fit rounded-none border-b border-white/75 px-0 pb-2 pt-0 text-sm font-semibold uppercase tracking-[0.22em] text-white hover:bg-transparent hover:text-white"
              >
                <Link to="/collections">
                  View collections
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.article>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={replayViewport}
            variants={containerVariants}
            className="grid gap-5 self-start lg:pt-8"
          >
            <motion.article
              variants={itemVariants}
              className="rounded-[28px] border border-[#eadfd3] bg-[linear-gradient(180deg,#fffaf5_0%,#f3e8dc_100%)] px-6 py-7 shadow-[0_18px_44px_rgba(56,34,21,0.06)]"
            >
              <p className="text-base leading-8 text-[#322928]/72">
                The catalog is arranged to feel closer to an edited rail than a crowded marketplace, so the product stays the point of focus.
              </p>
            </motion.article>

            {categoryHighlights.map((item, index) => (
              <motion.article
                key={item.category}
                variants={itemVariants}
                transition={{ delay: index * 0.08 }}
                className={`group grid gap-4 rounded-[24px] border border-[#eadfd3] bg-white/80 p-4 shadow-[0_16px_40px_rgba(56,34,21,0.05)] backdrop-blur transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(56,34,21,0.10)] sm:grid-cols-[120px_1fr] ${
                  index === 1 ? 'lg:translate-x-6' : ''
                }`}
              >
                <div className={`overflow-hidden rounded-[18px] ${item.surfaceClassName}`}>
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className={`aspect-[4/5] h-full w-full transition-transform duration-500 group-hover:scale-[1.04] ${getProductImageClass(
                      { imageFit: 'contain', imagePositionClassName: item.imageClassName },
                      'mini',
                    )}`}
                  />
                </div>
                <div className="self-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d36d3d]">{item.category}</p>
                  <h3 className="mt-2 font-serif text-3xl leading-tight text-[#1f1716]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#322928]/72">{item.description}</p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={replayViewportTight}
          variants={itemVariants}
          className="mt-14"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_180px_180px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f6f63]" />
              <Input
                id="shop-search"
                name="search"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder="Search products"
                className="h-14 rounded-2xl border-[#e4d8cd] bg-white/88 pl-11 text-[15px] shadow-[0_12px_30px_rgba(60,35,21,0.05)] transition duration-300 focus:scale-[1.01] focus:border-[#d36d3d]"
              />
            </label>

            <select
              id="shop-category"
              name="category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setPage(1)
              }}
              className="h-14 rounded-2xl border border-[#e4d8cd] bg-white/88 px-4 text-[15px] text-[#1f1716] shadow-[0_12px_30px_rgba(60,35,21,0.05)] outline-none transition duration-300 focus:scale-[1.01] focus:border-[#d36d3d]"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              id="shop-sort"
              name="sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="h-14 rounded-2xl border border-[#e4d8cd] bg-white/88 px-4 text-[15px] text-[#1f1716] shadow-[0_12px_30px_rgba(60,35,21,0.05)] outline-none transition duration-300 focus:scale-[1.01] focus:border-[#d36d3d]"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name</option>
            </select>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={replayViewportTight}
          variants={containerVariants}
          className="lux-card mt-8 bg-white/72 backdrop-blur"
        >
          <div className="flex flex-col gap-4 border-b border-[#eee1d4] px-6 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#d36d3d]">
                <Sparkles className="h-4 w-4" />
                Catalog
              </div>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-[#1f1716]">
                {category === 'All' ? 'Shop all styles' : `${category} selection`}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6f5f53]">
                Filter by category or search directly when you already know the piece you want.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f6efe8] px-4 py-2 text-sm text-[#6f5f53]">
                <SlidersHorizontal className="h-4 w-4 text-[#d36d3d]" />
                {totalCount} items
              </div>
              {isFetching && !isLoading ? (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d36d3d]">Refreshing catalog</p>
              ) : null}
            </motion.div>
          </div>

          <div className="px-6 py-8 sm:px-8">
            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-[24px] border border-[#ece1d6] bg-white shadow-[0_12px_28px_rgba(56,34,21,0.04)]">
                    <div className="aspect-[4/4.8] animate-pulse bg-[linear-gradient(180deg,#f4ece2_0%,#e8dbc9_100%)]" />
                    <div className="space-y-4 p-5">
                      <div className="h-3 w-28 animate-pulse rounded-full bg-[#eadfd3]" />
                      <div className="h-10 w-3/4 animate-pulse rounded-full bg-[#f1e7dc]" />
                      <div className="space-y-2">
                        <div className="h-3 w-full animate-pulse rounded-full bg-[#f3eadf]" />
                        <div className="h-3 w-5/6 animate-pulse rounded-full bg-[#f3eadf]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : totalCount === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#ddcbbb] bg-[#fffaf5] px-6 py-16 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">No products found</p>
                <h3 className="mt-3 font-serif text-3xl text-[#1f1716]">Try a different search or category.</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#322928]/68">
                  We did not find a matching product in the current catalog page set. Clearing the filters usually brings the full edit back right away.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 rounded-full border-[#d9cabd] bg-white px-6"
                  onClick={() => {
                    setQuery('')
                    setCategory('All')
                    setSortBy('featured')
                    setPage(1)
                  }}
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <ProductGrid products={products} />
            )}
          </div>

          <div className="flex flex-col gap-4 border-t border-[#eee1d4] px-6 py-6 text-sm text-[#6f5f53] sm:px-8 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[#d9cabd] bg-white px-5"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[#d9cabd] bg-white px-5"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
