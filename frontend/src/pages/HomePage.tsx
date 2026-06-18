import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import brandImage from '@/assets/brand.png'
import image1Asset from '@/assets/image1.png'
import image2Asset from '@/assets/image2.png'
import image3Asset from '@/assets/image3.png'
import image4Asset from '@/assets/image4.png'
import { AnnouncementBar } from '@/components/home/AnnouncementBar'
import ProductGrid from '@/components/product/ProductGrid'
import { Button } from '@/components/ui/button'
import { useCountUp } from '@/hooks/useCountUp'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { productService } from '@/services/productService'

function RevealSection({
  children,
  className,
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.18 })

  return (
    <section
      id={id}
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0px)' : 'translateY(26px)',
        transition: 'opacity 500ms ease, transform 500ms ease',
      }}
    >
      {children}
    </section>
  )
}

function StatCard({
  label,
  value,
  suffix = '',
}: {
  label: string
  value: number
  suffix?: string
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.35 })
  const count = useCountUp(value, isVisible)

  return (
    <div ref={ref} className="rounded-md border border-white/15 bg-black/20 p-5 text-white shadow-soft backdrop-blur-sm">
      <p className="text-3xl font-semibold">
        {count}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-white/72">{label}</p>
    </div>
  )
}

const lookbookTiles = [
  {
    image: image1Asset,
    title: 'Movement first',
    description: 'A more energetic home-page layer that feels distinct from the catalog and collection pages.',
  },
  {
    image: image2Asset,
    title: 'Editorial stance',
    description: 'Sharper full-body cutouts help the landing page carry more fashion presence at first glance.',
  },
  {
    image: image3Asset,
    title: 'Seasonal color',
    description: 'Brighter wardrobe styling keeps the home page from feeling too close to the darker collection art.',
  },
  {
    image: image4Asset,
    title: 'Monochrome edge',
    description: 'A stronger contrast piece for supporting tiles, promos, and hero-side layering.',
  },
]

export default function HomePage() {
  const { data: products = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productService.getProducts(),
  })

  return (
    <>
      <section className="relative min-h-screen overflow-hidden bg-[#f6efe8] text-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(211,109,61,0.14),transparent_30%),linear-gradient(90deg,rgba(246,239,232,0.98)_0%,rgba(246,239,232,0.95)_38%,rgba(246,239,232,0.78)_62%,rgba(246,239,232,0.36)_100%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-[48%] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(211,109,61,0.12),transparent_34%),linear-gradient(180deg,#f3ebe2_0%,#eadfd2_100%)] md:block lg:w-[44%]">
          <img
            src={image2Asset}
            alt="Hero fashion model"
            className="h-full w-full object-contain object-bottom px-6 pt-16 opacity-88"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#f6efe8]/18 via-transparent to-[#f6efe8]/68" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#efe4d8] via-[#efe4d8]/74 to-transparent" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl items-end px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pb-24 lg:pt-36">
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,0.96fr)_minmax(260px,0.56fr)] lg:items-end">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-4xl"
            >
              <div className="mb-8 md:hidden">
                <img src={brandImage} alt="Brand name" className="h-8 w-auto object-contain brightness-110 contrast-125" />
              </div>
              <p className="text-sm uppercase tracking-[0.42em] text-[#e28352]">Everyday style collection</p>
              <h1 className="mt-4 max-w-5xl font-serif text-[3.6rem] leading-[0.95] tracking-normal text-[#1f1716] sm:text-[5rem] lg:text-[6.6rem]">
                <span className="block">Style for</span>
                <span className="block">Every Day.</span>
                <span className="mt-2 block text-[#e28352]">For Every One.</span>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-9 text-[#322928]/88 sm:text-xl">
                Honest, quality fashion for the whole family. No fuss, just clothes you’ll actually wear.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-14 rounded-none bg-[#d36d3d] px-10 text-sm font-semibold uppercase tracking-[0.22em] text-white hover:bg-[#c66234]"
                >
                  <Link to="/products">
                    Shop now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="h-14 rounded-none border border-[#2a211f]/20 bg-transparent px-8 text-sm font-semibold uppercase tracking-[0.22em] text-[#211918] hover:bg-black/5"
                >
                  <Link to="/collections">View collections</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="relative hidden min-h-[520px] justify-self-end self-end lg:block"
            >
              <img
                src={image3Asset}
                alt="Fashion collection"
                className="absolute bottom-0 right-0 w-[320px] max-w-full object-contain drop-shadow-[0_24px_48px_rgba(15,16,23,0.28)] xl:w-[400px]"
              />
              <div className="absolute left-0 top-10 w-[180px] border border-white/50 bg-white/72 p-4 shadow-soft backdrop-blur-md xl:w-[210px]">
                <div className="overflow-hidden bg-[linear-gradient(180deg,#f7efe5_0%,#ecdcca_100%)]">
                  <img
                    src={image1Asset}
                    alt="Home editorial accent"
                    className="aspect-[4/4.6] w-full object-contain px-3 pb-0 pt-3"
                  />
                </div>
                <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">
                  New edit
                </p>
                <p className="mt-2 font-serif text-2xl leading-tight text-[#1f1716]">Built for every day.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <AnnouncementBar />

      <section className="bg-[#11141b]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          <StatCard label="Products loaded into the storefront" value={products.length} />
          <StatCard label="Customer rating benchmark" value={49} suffix="/10" />
          <StatCard label="Protected backend flows in place" value={6} />
        </div>
      </section>

      <RevealSection id="shop" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">Storefront rhythm</p>
            <h2 className="mt-3 max-w-xl font-serif text-4xl leading-tight text-foreground">
              A calmer, more editorial first impression for your store.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: 'Transparent assets',
                description: 'Your logo, brand name, and product cutouts sit cleanly over the hero.',
              },
              {
                icon: ShieldCheck,
                title: 'Reliable flow',
                description: 'Inventory-safe cart and checkout behavior keeps the experience dependable.',
              },
              {
                icon: Truck,
                title: 'Address-ready',
                description: 'Customers can move from browse to checkout without leaving the app flow.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-md border bg-card p-5">
                <item.icon className="h-5 w-5 text-[#d36d3d]" />
                <p className="mt-3 font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection id="collections" className="mx-auto max-w-7xl px-4 py-2 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-md border bg-[#f2ece4]">
            <div className="relative aspect-[16/10]">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a1717]/14 via-[#1a1717]/0 to-transparent" />
              <img
                src={image4Asset}
                alt="Home feature"
                className="absolute bottom-0 right-4 h-full w-auto object-contain px-3 pt-6"
              />
              <div className="absolute inset-0 flex max-w-xl flex-col justify-end px-6 py-8">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">Collection direction</p>
                <h2 className="mt-3 font-serif text-4xl leading-tight text-foreground">
                  Let the first scroll feel like a lookbook, not just a catalog.
                </h2>
                <p className="mt-3 text-sm leading-7 text-foreground/72">
                  The hero now carries the fashion tone, while the rest of the page keeps the shopping path obvious.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {lookbookTiles.map((tile, index) => (
              <motion.div
                key={tile.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                className="grid gap-4 overflow-hidden rounded-md border bg-card p-4 sm:grid-cols-[120px_1fr]"
              >
                <div className="aspect-[4/5] overflow-hidden rounded-md bg-[#f7f0e7]">
                  <img src={tile.image} alt={tile.title} className="h-full w-full object-contain p-3" />
                </div>
                <div className="self-center">
                  <p className="font-semibold">{tile.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{tile.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection id="about" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-md border bg-card px-6 py-10 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">About the brand</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-foreground">
                Everyday fashion with a softer, more polished storefront voice.
              </h2>
            </div>
            <p className="text-base leading-8 text-muted-foreground">
              This landing page now leans into the fashion reference you shared: cleaner navigation, more spacious typography,
              warm accent color, and transparent brand assets that stay legible without heavy boxes or badges around them.
            </p>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">Featured</p>
            <h2 className="mt-2 font-serif text-4xl text-foreground">New arrivals</h2>
          </div>
          <Button asChild variant="ghost" className="uppercase tracking-[0.18em]">
            <Link to="/products">View all</Link>
          </Button>
        </div>
        <ProductGrid products={products} />
      </RevealSection>
    </>
  )
}
