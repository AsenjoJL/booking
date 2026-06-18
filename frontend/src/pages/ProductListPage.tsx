import { useDeferredValue, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import imagesImage from '@/assets/images.png'
import jacketsImage from '@/assets/jackets.png'
import ladyModelImage from '@/assets/ladymodel.avif'
import leatherImage from '@/assets/leather.png'
import ProductGrid from '@/components/product/ProductGrid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { productService } from '@/services/productService'

const categoryHighlights = [
  {
    category: 'Apparel',
    title: 'Layered essentials',
    description: 'Structured staples and dependable outer layers for the everyday wardrobe.',
    image: jacketsImage,
    surfaceClassName: 'bg-[linear-gradient(135deg,#1a1716_0%,#2a2320_100%)]',
    imageClassName: 'object-right',
  },
  {
    category: 'Accessories',
    title: 'Refined accents',
    description: 'Smaller finishing pieces that round out the wardrobe without overcomplicating it.',
    image: leatherImage,
    surfaceClassName: 'bg-[linear-gradient(180deg,#f2ece4_0%,#e6d9cb_100%)]',
    imageClassName: 'object-center',
  },
  {
    category: 'Womenswear',
    title: 'Easy statement pieces',
    description: 'Softer silhouettes and brighter looks for days that ask a little more from the outfit.',
    image: ladyModelImage,
    surfaceClassName: 'bg-[linear-gradient(180deg,#ede6de_0%,#e2d7ca_100%)]',
    imageClassName: 'object-center',
  },
]

export default function ProductListPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const deferredQuery = useDeferredValue(query)
  const { data: products = [] } = useQuery({
    queryKey: ['products', deferredQuery, category],
    queryFn: () =>
      productService.getProducts({
        search: deferredQuery || undefined,
        category: category === 'All' ? undefined : category.toLowerCase(),
      }),
  })

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((product) => product.category)))],
    [products],
  )

  const filteredProducts =
    category === 'All' ? products : products.filter((product) => product.category === category)

  const featureImage =
    categoryHighlights.find((item) => item.category === category)?.image ?? imagesImage

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-t pt-10">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Shop</p>
            <h1 className="mt-4 font-serif text-5xl leading-none text-foreground sm:text-6xl">
              Shop The
              <br />
              Current Edit.
            </h1>
            <p className="mt-8 max-w-xl text-[1.12rem] leading-9 text-foreground/76">
              Browse new arrivals, wardrobe staples, and the pieces that carry the storefront from inspiration into purchase.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                className="h-12 rounded-none bg-white pl-11"
              />
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-12 rounded-none border border-input bg-white px-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="relative overflow-hidden rounded-sm bg-[linear-gradient(180deg,#f1e9df_0%,#e8ddd0_100%)]">
          <img
            src={featureImage}
            alt="Featured collection"
            className="aspect-[16/10] w-full object-contain object-center px-8 pb-0 pt-8"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/52 via-black/14 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-end px-8 py-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/82">New Arrivals</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight">
              {category === 'All' ? 'A cleaner catalog for the pieces worth seeing first.' : `${category} picks for the current edit.`}
            </h2>
            <p className="mt-4 text-base leading-8 text-white/84">
              Move through the assortment by category, tone, and use case without losing the feeling of an edited collection.
            </p>
            <Button
              asChild
              variant="ghost"
              className="mt-6 h-auto w-fit rounded-none border-b border-white/70 px-0 pb-2 pt-0 text-sm font-semibold uppercase tracking-[0.22em] text-white hover:bg-transparent hover:text-white"
            >
              <Link to="/collections">
                View collections
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </article>

        <div className="grid gap-5">
          {categoryHighlights.map((item) => (
            <article key={item.category} className="grid gap-4 rounded-sm border bg-card p-4 sm:grid-cols-[110px_1fr]">
              <div className={`overflow-hidden rounded-sm ${item.surfaceClassName}`}>
                <img
                  src={item.image}
                  alt={item.title}
                  className={`aspect-[4/5] h-full w-full object-contain px-2 pb-0 pt-3 ${item.imageClassName}`}
                />
              </div>
              <div className="self-center">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d36d3d]">{item.category}</p>
                <h3 className="mt-2 font-serif text-3xl leading-tight text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-14 flex items-end justify-between gap-4 border-t pt-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Catalog</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight text-foreground">
            {category === 'All' ? 'Shop the full edit' : `${category} selection`}
          </h2>
        </div>
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
          {filteredProducts.length} items
        </p>
      </div>

      <div className="mt-8">
        <ProductGrid products={filteredProducts} />
      </div>
    </section>
  )
}
