import { motion, useMotionValue, useTransform } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import collectionImage from '@/assets/collection.png'
import collection2Image from '@/assets/collection2.png'
import collection3Image from '@/assets/collection3.png'
import collection4Image from '@/assets/collection4.png'
import { getProductImageClass } from '@/lib/productImage'

/* ─── Data ─────────────────────────────────────────────── */

const collectionCards = [
  {
    eyebrow: 'Formal Wear',
    title: 'Tailored Elegance',
    description:
      'Structured, sophisticated pieces crafted with precision and customizable fit — for moments that call for presence and confidence.',
    image: collectionImage,
    imageClassName: 'object-center',
    tag: 'New Season',
    accent: '#C4622D',
  },
  {
    eyebrow: 'Casual Collection',
    title: 'Street Style',
    description:
      'Bold graphics and comfortable essentials for the days you move fast and still want to look sharp, effortless, alive.',
    image: collection2Image,
    imageClassName: 'object-right',
    tag: 'Trending',
    accent: '#8B7355',
  },
  {
    eyebrow: 'Separates',
    title: 'Everyday Comfort',
    description:
      'Versatile pieces designed for movement and style — built to mix, match, and carry you seamlessly from morning to evening.',
    image: collection3Image,
    imageClassName: 'object-center',
    tag: 'Essentials',
    accent: '#C4622D',
  },
  {
    eyebrow: 'Streetwear',
    title: 'Bold Expression',
    description:
      'Vibrant colors and confident designs for those who wear their personality out loud — proudly, daily, unapologetically.',
    image: collection4Image,
    imageClassName: 'object-center',
    tag: 'Statement',
    accent: '#8B7355',
  },
]

const stats = [
  { value: '4', label: 'Distinct collections' },
  { value: '200+', label: 'Styles available' },
  { value: '2026', label: 'Current season' },
]

/* ─── Animation variants ────────────────────────────────── */

const ez: [number, number, number, number] = [0.22, 1, 0.36, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 32, filter: 'blur(6px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.65, ease: ez },
  },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11 } },
}

const slideLeft = {
  hidden: { opacity: 0, x: -40, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: ez } },
}

const slideRight = {
  hidden: { opacity: 0, x: 40, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: ez } },
}

/* ─── Sub-components ────────────────────────────────────── */

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: false, margin: '-60px' }}
      transition={{ duration: 0.45, ease: ez }}
      className="flex items-center gap-3"
    >
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: false }}
        transition={{ duration: 0.4, delay: 0.1, ease: ez }}
        className={`h-px w-8 origin-left ${light ? 'bg-[#D97B4A]' : 'bg-[#C4622D]'}`}
      />
      <span className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${light ? 'text-[#D97B4A]' : 'text-[#C4622D]'}`}>
        {children}
      </span>
    </motion.div>
  )
}

/* Collection card with 3D tilt */
function CollectionCard({ card, index }: { card: typeof collectionCards[0]; index: number }) {
  const reverse = index % 2 === 1
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotX = useTransform(mouseY, [-0.5, 0.5], ['2deg', '-2deg'])
  const rotY = useTransform(mouseX, [-0.5, 0.5], ['-3deg', '3deg'])

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0) }

  return (
    <motion.article
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: '-80px' }}
      variants={stagger}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
      className="group overflow-hidden rounded-[36px] border border-[#E8DDD0] bg-white shadow-[0_12px_48px_rgba(139,115,85,0.10)] transition-shadow duration-500 hover:shadow-[0_32px_80px_rgba(139,115,85,0.18)]"
    >
      <div className={`grid min-h-[420px] items-stretch lg:grid-cols-2`}>
        {/* Image side */}
        <motion.div
          variants={reverse ? slideRight : slideLeft}
          className={`relative overflow-hidden ${reverse ? 'lg:order-2' : ''}`}
        >
          <img
            src={card.image}
            alt={card.title}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className={`h-full min-h-[320px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05] ${getProductImageClass(
              { imageFit: 'contain', imagePositionClassName: card.imageClassName },
              'detail',
            )}`}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0F0E0D]/30 lg:bg-gradient-to-r lg:from-transparent lg:to-transparent" />

          {/* Tag badge */}
          <div className="absolute left-5 top-5">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false }}
              transition={{ delay: 0.3 + index * 0.08, duration: 0.35, ease: ez }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/14 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md"
            >
              <Sparkles className="h-2.5 w-2.5" />
              {card.tag}
            </motion.span>
          </div>

          {/* Collection number */}
          <div className="absolute bottom-5 right-5">
            <span
              className="text-[80px] font-bold leading-none text-white/10"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              aria-hidden
            >
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
        </motion.div>

        {/* Text side */}
        <motion.div
          variants={reverse ? slideLeft : slideRight}
          className={`flex flex-col justify-center px-8 py-10 lg:px-12 lg:py-12 ${reverse ? 'lg:order-1' : ''}`}
        >
          <SectionLabel>{card.eyebrow}</SectionLabel>

          <h2
            className="mt-5 text-[clamp(28px,3.2vw,44px)] font-medium leading-[1.08] text-[#0F0E0D]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.022em' }}
          >
            {card.title}
          </h2>

          <div className="mt-3 h-px w-12 bg-[#E8DDD0]" />

          <p className="mt-5 max-w-[38ch] text-[14.5px] leading-[1.85] text-[#8B7355]">
            {card.description}
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/products"
              className="group/btn shimmer-btn inline-flex h-12 items-center gap-2.5 rounded-full bg-[#0F0E0D] px-7 text-[13px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1E1A17] hover:shadow-[0_12px_32px_rgba(15,14,13,0.28)]"
            >
              Shop now
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
            </Link>
            <Link
              to="/about"
              className="group/ghost inline-flex h-12 items-center gap-2 rounded-full border border-[#E8DDD0] px-7 text-[13px] font-semibold text-[#0F0E0D] transition-all duration-200 hover:border-[#C4622D] hover:text-[#C4622D]"
            >
              Our story
              <span className="h-px w-0 bg-[#C4622D] transition-all duration-200 group-hover/ghost:w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.article>
  )
}

/* ─── Page ──────────────────────────────────────────────── */

export default function CollectionsPage() {
  return (
    <div style={{ backgroundColor: 'var(--fashion-warm)', color: 'var(--fashion-dark)' }}>

      {/* ── HERO ──────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden border-b border-[#E8DDD0]"
        style={{ background: 'linear-gradient(135deg, #EDE3D8 0%, #FAF8F5 65%)' }}
      >
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#C4622D]/7 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-[#E8DDD0]/70 blur-[60px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={stagger}>

            <motion.div variants={fadeUp}>
              <SectionLabel>Collections</SectionLabel>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-[clamp(44px,6vw,84px)] font-medium leading-[1.02] text-[#0F0E0D]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.028em' }}
            >
              Curated for
              <br />
              <em className="italic text-[#C4622D]">everyday style.</em>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-7 max-w-[52ch] text-[16px] leading-[1.82] text-[#8B7355]"
            >
              Four distinct collections — each with its own character, fit, and attitude.
              From structured formalwear to bold streetwear, find the edit that speaks to you.
            </motion.p>

            {/* Stats */}
            <motion.div
              variants={fadeUp}
              className="mt-12 flex flex-wrap items-center gap-10 border-t border-[#E8DDD0] pt-10"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: ez }}
                >
                  <p
                    className="text-[30px] font-semibold leading-none text-[#0F0E0D]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1.5 text-[11.5px] font-medium tracking-[0.06em] text-[#8B7355]">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── COLLECTION CARDS ──────────────────────────────── */}
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-16 sm:px-6 lg:px-8">
        {collectionCards.map((card, index) => (
          <CollectionCard key={card.title} card={card} index={index} />
        ))}
      </div>

      {/* ── MARQUEE DIVIDER ───────────────────────────────── */}
      <div className="overflow-hidden border-y border-[#E8DDD0] bg-[#F4EFE8] py-4">
        <div className="announcement-track flex min-w-max items-center gap-12">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="flex items-center gap-12 whitespace-nowrap">
              <span className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#8B7355]">
                New Season 2026
              </span>
              <span className="h-1 w-1 rotate-45 bg-[#C4622D]" />
            </span>
          ))}
        </div>
      </div>

      {/* ── CTA BANNER ────────────────────────────────────── */}
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-60px' }}
          transition={{ duration: 0.7, ease: ez }}
          className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-[#0F0E0D] px-8 py-16 text-white shadow-[0_40px_80px_rgba(15,14,13,0.24)] sm:px-14"
        >
          {/* Accent glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-[#C4622D]/14 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-[300px] w-[300px] rounded-full bg-[#8B7355]/10 blur-[60px]" />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <SectionLabel light>Browse everything</SectionLabel>
              <h2
                className="mt-6 max-w-2xl text-[clamp(32px,4.5vw,58px)] font-medium leading-[1.05] text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Discover your style across{' '}
                <em className="italic text-[#D97B4A]">all collections.</em>
              </h2>
              <p className="mt-5 max-w-lg text-[15.5px] leading-[1.8] text-white/55">
                From formal to everyday — thoughtfully curated, easy to explore, and ready to wear.
              </p>
            </div>
            <Link
              to="/products"
              className="shimmer-btn group inline-flex h-[58px] shrink-0 items-center gap-3 rounded-full bg-[#C4622D] px-9 text-[14px] font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#D97B4A] hover:shadow-[0_16px_40px_rgba(196,98,45,0.4)]"
            >
              Browse shop
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
