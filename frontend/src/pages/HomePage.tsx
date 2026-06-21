import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Sparkles, Truck, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import brandImage from '@/assets/brand.png'
import fashion1Asset from '@/assets/fashion1.png'
import fashion3Asset from '@/assets/fashion3.png'
import fashion5Asset from '@/assets/fashion5.png'
import image1Asset from '@/assets/image1.png'
import image2Asset from '@/assets/image2.png'
import image3Asset from '@/assets/image3.png'
import { AnnouncementBar } from '@/components/home/AnnouncementBar'
import ProductGrid from '@/components/product/ProductGrid'
import { Button } from '@/components/ui/button'
import { useCountUp } from '@/hooks/useCountUp'
import { useChainedCycle } from '@/hooks/useChainedCycle'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import {
  createFadeUpVariants,
  createScaleVariants,
  createSlideVariants,
  createStaggerContainer,
  easeInOutCurve,
  easeOutCurve,
} from '@/lib/motion'
import { getProductImageClass } from '@/lib/productImage'
import { productService } from '@/services/productService'

const containerVariants = createStaggerContainer(0.15, 0.2)
const itemVariants = createFadeUpVariants(20, 0.6)
const { left: slideInVariants, right: slideInRightVariants } = createSlideVariants(60, 0.8)
const fadeInUpVariants = createFadeUpVariants(40, 0.7)
const scaleVariants = createScaleVariants(0.95, 0.6)

// ============= COMPONENTS =============

function RevealSection({
  children,
  className,
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.15 })

  return (
    <motion.section
      id={id}
      ref={ref}
      className={className}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={fadeInUpVariants}
    >
      {children}
    </motion.section>
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
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={scaleVariants}
      className="group relative rounded-[28px] border border-[#eadfd3] bg-white/84 p-8 text-[#1f1716] shadow-[0_20px_48px_rgba(56,34,21,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d36d3d]/20"
    >
      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#d36d3d]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <p className="relative text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-[#d36d3d]">
        {label}
      </p>
      <p className="relative mt-4 text-5xl font-semibold leading-none text-[#1f1716]">
        {count}
        {suffix}
      </p>
    </motion.div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: any
  title: string
  description: string
  index: number
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: '-100px' }}
      variants={itemVariants}
      transition={{ delay: index * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative overflow-hidden rounded-[28px] border border-[#eadfd3] bg-white/82 p-7 shadow-[0_18px_44px_rgba(56,34,21,0.05)] transition-all duration-500 hover:-translate-y-1 hover:border-[#d36d3d]/25 hover:shadow-[0_24px_48px_rgba(56,34,21,0.09)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#d36d3d]/0 to-[#d36d3d]/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      <motion.div
        animate={{ y: isHovered ? -5 : 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10"
      >
        <motion.div
          animate={{ scale: isHovered ? 1.1 : 1 }}
          transition={{ duration: 0.3 }}
          className="mb-5 inline-block rounded-2xl bg-gradient-to-br from-[#d36d3d] to-[#c66234] p-3"
        >
          <Icon className="h-6 w-6 text-white" />
        </motion.div>
        <h3 className="font-serif text-[1.7rem] leading-tight font-semibold text-[#1f1716]">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-[#322928]/72">{description}</p>
      </motion.div>
    </motion.div>
  )
}

function FeatureSplitCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any
  title: string
  description: string
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.article
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: '-100px' }}
      variants={itemVariants}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative overflow-hidden rounded-[32px] border border-[#eadfd3] bg-[linear-gradient(180deg,#fffaf5_0%,#f4e8dc_100%)] p-8 shadow-[0_22px_48px_rgba(56,34,21,0.06)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_28px_54px_rgba(56,34,21,0.1)]"
    >
      <motion.div
        animate={{ scale: isHovered ? 1.06 : 1 }}
        transition={{ duration: 0.3 }}
        className="inline-flex rounded-2xl bg-[#d36d3d] p-3 text-white"
      >
        <Icon className="h-6 w-6" />
      </motion.div>
      <h3 className="mt-8 max-w-sm font-serif text-[2.25rem] leading-tight text-[#1f1716]">{title}</h3>
      <p className="mt-5 max-w-md text-base leading-8 text-[#322928]/72">{description}</p>
    </motion.article>
  )
}

function LookbookTile({
  image,
  title,
  description,
  index,
}: {
  image: string
  title: string
  description: string
  index: number
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: '-100px' }}
      variants={itemVariants}
      transition={{ delay: index * 0.12 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative overflow-hidden rounded-[28px] border border-[#eadfd3] bg-white/82 shadow-[0_18px_44px_rgba(56,34,21,0.05)] transition-all duration-500 hover:-translate-y-1 hover:border-[#d36d3d]/25 hover:shadow-[0_24px_50px_rgba(56,34,21,0.09)]"
    >
      <div className="grid gap-4 p-6 sm:grid-cols-[112px_1fr]">
        <motion.div
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.3 }}
          className="aspect-[4/5] overflow-hidden rounded-[20px]"
        >
          <img
            src={image}
            alt={title}
            loading="lazy"
            decoding="async"
            className={`h-full w-full ${getProductImageClass({ imageFit: 'contain' }, 'thumbnail')}`}
          />
        </motion.div>
        <motion.div
          animate={{ x: isHovered ? 8 : 0 }}
          transition={{ duration: 0.3 }}
          className="self-center"
        >
          <p className="font-serif text-[1.45rem] font-semibold leading-tight text-[#1f1716]">{title}</p>
          <p className="mt-3 text-sm leading-7 text-[#322928]/70">{description}</p>
        </motion.div>
      </div>

      <motion.div
        animate={{ width: isHovered ? '100%' : '0%' }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#d36d3d] to-[#e28352]"
      />
    </motion.div>
  )
}

const lookbookTiles = [
  {
    image: image1Asset,
    title: 'Movement first',
    description: 'Sharper motion and cleaner silhouettes give the first scroll a more editorial kind of energy.',
  },
  {
    image: fashion5Asset,
    title: 'Editorial stance',
    description: 'Full-length styling frames the storefront more like a fashion story than a product grid.',
  },
  {
    image: image3Asset,
    title: 'Seasonal color',
    description: 'Brighter styling adds lift and keeps the page from leaning too heavily on darker tones.',
  },
  {
    image: fashion1Asset,
    title: 'Monochrome edge',
    description: 'A cleaner monochrome note adds contrast and gives the section a more tailored finish.',
  },
]

const heroEditorialNotes = [
  {
    title: 'Built for real routines.',
    description: 'Easier outfits and calmer silhouettes that do not need overthinking.',
  },
  {
    title: 'Made to repeat well.',
    description: 'Pieces that settle naturally into weekdays, travel, and slower weekends.',
  },
  {
    title: 'A quieter wardrobe.',
    description: 'Less visual noise, better layering, and stronger everyday wear.',
  },
]

// ============= FLOATING ELEMENTS (AMBIENT) =============

function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-72 h-72 rounded-full blur-3xl opacity-20"
          animate={{
            y: [0, 30, 0],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: easeInOutCurve,
          }}
          style={{
            background: `linear-gradient(135deg, #d36d3d, #e28352)`,
            left: `${10 + i * 30}%`,
            top: `${20 + i * 20}%`,
          }}
        />
      ))}
    </div>
  )
}

// ============= SCROLL INDICATOR =============

function ScrollIndicator() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY < 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.div
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5 }}
      className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
    >
      <p className="text-sm font-medium text-[#d36d3d] uppercase tracking-[0.1em]">Scroll</p>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="w-5 h-5 text-[#d36d3d]" />
      </motion.div>
    </motion.div>
  )
}

// ============= MAIN PAGE =============

export default function HomePage() {
  const { data: products = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productService.getProducts(),
  })
  const featuredProducts = useMemo(() => products.slice(0, 4), [products])
  const { activeIndex: activeHeroNote, isVisible: showHeroNote } = useChainedCycle(heroEditorialNotes.length)

  return (
    <>
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen overflow-hidden bg-[#f6efe8] text-foreground">
        {/* Gradient background with ambient floating elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(211,109,61,0.08),transparent_40%),linear-gradient(135deg,rgba(246,239,232,0.99)_0%,rgba(242,235,225,0.95)_50%,rgba(236,227,215,0.9)_100%)]" />
        <FloatingElements />

        {/* Right side image container */}
        <div className="absolute inset-y-0 right-0 hidden w-[48%] overflow-hidden md:block lg:w-[44%]">
          <motion.img
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.88, scale: 1 }}
            transition={{ duration: 1.2, ease: easeOutCurve }}
            src={image2Asset}
            alt="Hero fashion model"
            decoding="async"
            className="h-full w-full object-contain object-bottom px-8 pb-4 pt-12"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#f6efe8]/20 via-transparent to-[#f6efe8]/70" />
        </div>

        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#efe4d8] via-[#efe4d8]/60 to-transparent" />

        {/* Hero content */}
        <div className="relative mx-auto flex min-h-screen max-w-7xl items-end px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-24 lg:pt-40">
          <div className="grid w-full gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.52fr)] lg:items-end">
            {/* Left content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="max-w-4xl"
            >
              <motion.div variants={itemVariants} className="mb-8 md:hidden">
                <img
                  src={brandImage}
                  alt="Brand name"
                  className="h-8 w-auto object-contain brightness-110 contrast-125"
                />
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="max-w-5xl font-serif text-5xl leading-[0.96] tracking-tight text-[#1f1716] sm:text-6xl lg:text-[5.4rem]"
              >
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.7 }}
                  className="block"
                >
                  Elevated
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.7 }}
                  className="block"
                >
                  Everyday
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.7 }}
                  className="block mt-2 bg-gradient-to-r from-[#d36d3d] to-[#e28352] bg-clip-text text-transparent"
                >
                  Style
                </motion.span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-8 max-w-2xl text-lg leading-9 text-[#322928]/88 sm:text-[1.28rem]"
              >
                Thoughtfully crafted pieces designed for the modern lifestyle. Quality, comfort, and timeless aesthetics in every garment.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="mt-12 flex flex-wrap gap-4 items-center"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    asChild
                    className="w-full sm:w-auto h-14 rounded-lg bg-gradient-to-r from-[#d36d3d] to-[#c66234] px-10 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Link to="/products" className="flex items-center justify-center gap-2">
                      Shop now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full sm:w-auto h-14 rounded-lg border-2 border-[#2a211f]/20 bg-white/30 px-8 text-sm font-semibold uppercase tracking-[0.15em] text-[#211918] hover:bg-white/50 hover:border-[#2a211f]/40 transition-all duration-300"
                  >
                    <Link to="/collections">Explore collections</Link>
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right side accent box */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={slideInRightVariants}
              transition={{ delay: 0.4 }}
              className="relative hidden min-h-[560px] justify-self-end self-end lg:block"
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute left-0 top-6 w-[230px] rounded-[28px] border border-white/55 bg-white/82 p-5 shadow-[0_28px_60px_rgba(56,34,21,0.12)] backdrop-blur-lg xl:w-[260px]"
              >
                <div className="overflow-hidden rounded-[22px]">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    src={image1Asset}
                    alt="Featured piece"
                    className={`aspect-square w-full ${getProductImageClass({ imageFit: 'contain' }, 'thumbnail')}`}
                  />
                </div>
                <AnimatePresence mode="wait">
                  {showHeroNote ? (
                    <motion.div
                      key={heroEditorialNotes[activeHeroNote].title}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.34, ease: easeOutCurve }}
                    >
                      <p className="mt-2 font-serif text-[1.65rem] leading-tight text-[#1f1716] font-semibold">
                        {heroEditorialNotes[activeHeroNote].title}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[#322928]/72">
                        {heroEditorialNotes[activeHeroNote].description}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <ScrollIndicator />
        </div>
      </section>

      {/* ===== ANNOUNCEMENT BAR ===== */}
      <AnnouncementBar />

      {/* ===== STATS SECTION ===== */}
      <section className="relative py-20">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false }}
            variants={containerVariants}
            className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <StatCard label="Quality pieces in our collection" value={products.length} />
              <StatCard label="Customer satisfaction score" value={95} suffix="/100" />
            </div>
            <motion.div
              variants={itemVariants}
              className="flex min-h-[220px] flex-col justify-end rounded-[32px] border border-[#eadfd3] bg-[linear-gradient(180deg,#fbf6f0_0%,#f1e6da_100%)] px-8 py-8 shadow-[0_20px_48px_rgba(56,34,21,0.05)]"
            >
              <p className="mt-5 font-serif text-[2.4rem] leading-tight text-[#1f1716]">
                Fewer pieces.
                <br />
                Better repeat wear.
              </p>
              <p className="mt-4 max-w-sm text-sm leading-7 text-[#322928]/68">
                The brand works best when the wardrobe feels considered rather than crowded.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <RevealSection
        id="features"
        className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false }}
          variants={containerVariants}
          className="mb-16"
        >
          <motion.h2
            variants={itemVariants}
            className="mt-4 max-w-3xl font-serif text-5xl leading-tight text-foreground"
          >
            Designed with intention, crafted with care.
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-2xl text-lg text-foreground/70"
          >
            Every piece reflects our commitment to quality, sustainability, and timeless design that transcends seasonal trends.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false }}
          variants={containerVariants}
          className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]"
        >
          <FeatureSplitCard
            icon={Sparkles}
            title="Curated collections with a calmer point of view."
            description="The storefront is built to feel edited first, so the assortment lands more like a wardrobe conversation than a wall of options."
          />

          <div className="grid gap-6 self-end">
            <FeatureCard
              icon={ShieldCheck}
              title="Quality Assured"
              description="Every item undergoes rigorous quality checks to ensure lasting durability and comfort."
              index={0}
            />
            <FeatureCard
              icon={Truck}
              title="Fast & Reliable"
              description="Seamless shopping experience from browse to delivery with real-time tracking."
              index={1}
            />
          </div>
        </motion.div>
      </RevealSection>

      {/* ===== LOOKBOOK SECTION ===== */}
      <RevealSection
        id="lookbook"
        className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false }}
          variants={containerVariants}
          className="mb-14"
        >
          <motion.h2
            variants={itemVariants}
            className="max-w-3xl font-serif text-5xl leading-tight text-foreground"
          >
            Inspiration for every occasion.
          </motion.h2>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Large featured image */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false }}
            variants={slideInVariants}
            className="overflow-hidden rounded-lg border border-[#2a211f]/10"
          >
            <div className="relative aspect-[16/10]">
              <div className="absolute inset-0 bg-gradient-to-r from-[#f4ede6] via-[#f4ede6]/70 to-transparent z-10" />
              <motion.img
                whileHover={{ scale: 1.05 }}
                src={fashion3Asset}
                alt="Featured lookbook"
                className="absolute bottom-0 right-0 h-full w-auto max-w-[55%] object-contain object-bottom px-6 pb-4 pt-8 lg:max-w-[50%] xl:px-8"
              />
              <div className="absolute inset-0 flex max-w-xl flex-col justify-end px-8 py-12 z-20">
                <h3 className="font-serif text-4xl leading-tight text-foreground">
                  Modern essentials for contemporary living.
                </h3>
                <p className="mt-4 text-base leading-7 text-foreground/75">
                  Discover versatile pieces that seamlessly transition from work to weekend, each designed with meticulous attention to detail.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Lookbook tiles grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false }}
            variants={containerVariants}
            className="grid gap-5 lg:grid-cols-1"
          >
            {lookbookTiles.map((tile, index) => (
              <LookbookTile
                key={tile.title}
                {...tile}
                index={index}
              />
            ))}
          </motion.div>
        </div>
      </RevealSection>

      {/* ===== ABOUT SECTION ===== */}
      <RevealSection
        id="about"
        className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false }}
          variants={scaleVariants}
          className="overflow-hidden rounded-xl border border-[#2a211f]/10 bg-gradient-to-br from-white/60 to-white/40 px-8 py-16 md:px-12 md:py-20 backdrop-blur-sm"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false }}
            variants={containerVariants}
            className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"
          >
            <motion.div variants={itemVariants}>
              <h2 className="font-serif text-5xl leading-tight text-foreground">
                Fashion that fits your life.
              </h2>
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="text-lg leading-8 text-foreground/75"
            >
              We believe fashion should be accessible, sustainable, and meaningful. Our collections are designed to empower individuals to express themselves authentically, without compromise on quality or values.
            </motion.p>
          </motion.div>
        </motion.div>
      </RevealSection>

      {/* ===== NEW ARRIVALS SECTION ===== */}
      <RevealSection id="arrivals" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false }}
          variants={containerVariants}
          className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <motion.div variants={itemVariants}>
            <h2 className="font-serif text-5xl text-foreground">Fresh arrivals</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-foreground/72">
              A tighter front row of the pieces carrying this season forward.
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              asChild
              className="text-xs uppercase tracking-[0.2em] font-semibold text-[#d36d3d] hover:text-[#c66234] transition-colors"
              variant="ghost"
            >
              <Link to="/products" className="flex items-center gap-2">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        <ProductGrid products={featuredProducts} />
      </RevealSection>
    </>
  )
}
