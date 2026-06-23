import { motion, useMotionValue, useTransform } from 'framer-motion'
import { ArrowRight, HeartHandshake, Leaf, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import imagesImage from '@/assets/images.png'
import jacketsImage from '@/assets/jackets.png'
import fashion3Asset from '@/assets/fashion3.png'
import fashion5Asset from '@/assets/fashion5.png'

/* ─── Data ─────────────────────────────────────────────── */

const values = [
  {
    icon: Sparkles,
    number: '01',
    title: 'Thoughtful Design',
    description: 'We start with pieces people want to wear again, not just admire once.',
  },
  {
    icon: Leaf,
    number: '02',
    title: 'Longer Wear',
    description: 'Calmer silhouettes and steadier quality help the wardrobe stay useful longer.',
  },
  {
    icon: HeartHandshake,
    number: '03',
    title: 'Real Trust',
    description: 'Clear pricing, honest materials, and a storefront that feels human instead of pushy.',
  },
]

const teamCards = [
  { name: 'Mara', role: 'Creative Direction', image: jacketsImage },
  { name: 'Elise', role: 'Brand Merchandising', image: fashion5Asset },
  { name: 'Noah', role: 'Product Curation', image: fashion3Asset },
]

const stats = [
  { label: 'Years shaping the edit', value: '06' },
  { label: 'Signature categories', value: '12' },
  { label: 'Customer trust score', value: '95%' },
]

const timeline = [
  { year: '2020', event: 'Brand founded in Manila with 3 SKUs' },
  { year: '2021', event: 'First full seasonal collection launched' },
  { year: '2023', event: 'Expanded to 12 wardrobe categories' },
  { year: '2026', event: 'New season — modern digital storefront' },
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
  visible: { transition: { staggerChildren: 0.12 } },
}

const slideLeft = {
  hidden: { opacity: 0, x: -40, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: ez } },
}

const slideRight = {
  hidden: { opacity: 0, x: 40, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: ez } },
}

/* ─── Helpers ───────────────────────────────────────────── */

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
}

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: false, margin: '-40px' }}
      transition={{ duration: 0.45, ease: ez }}
      className="flex items-center gap-3"
    >
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: false }}
        transition={{ duration: 0.4, delay: 0.12, ease: ez }}
        className={`h-px w-8 origin-left ${light ? 'bg-[#D97B4A]' : 'bg-[#C4622D]'}`}
      />
      <span className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${light ? 'text-[#D97B4A]' : 'text-[#C4622D]'}`}>
        {children}
      </span>
    </motion.div>
  )
}

/* Team card with hover tilt */
function TeamCard({ member, index }: { member: typeof teamCards[0]; index: number }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotX = useTransform(y, [-0.5, 0.5], ['3deg', '-3deg'])
  const rotY = useTransform(x, [-0.5, 0.5], ['-4deg', '4deg'])

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width - 0.5)
    y.set((e.clientY - r.top) / r.height - 0.5)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-50px' }}
      transition={{ delay: index * 0.12, duration: 0.6, ease: ez }}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMove}
      onMouseLeave={() => { x.set(0); y.set(0) }}
      className="group overflow-hidden rounded-3xl border border-[#E8DDD0] bg-white shadow-[0_8px_32px_rgba(139,115,85,0.08)] transition-shadow duration-500 hover:shadow-[0_24px_60px_rgba(139,115,85,0.16)]"
    >
      <div className="relative overflow-hidden">
        <img
          src={member.image}
          alt={member.name}
          className="aspect-[4/4.6] w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.06]"
        />
        {/* hover gradient reveal */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E0D]/60 via-transparent to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 translate-y-full p-5 transition-transform duration-400 group-hover:translate-y-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D97B4A]">
            {member.role}
          </span>
        </div>
      </div>
      <div className="p-6">
        <p className="text-[22px] font-medium text-[#0F0E0D]" style={serif}>
          {member.name}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C4622D]">
          {member.role}
        </p>
      </div>
    </motion.article>
  )
}

/* ─── Page ──────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: 'var(--fashion-warm)', color: 'var(--fashion-dark)' }}>

      {/* ── HERO ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden border-b border-[#E8DDD0]"
        style={{ background: 'linear-gradient(135deg, #EDE3D8 0%, #FAF8F5 68%)' }}
      >
        <div className="pointer-events-none absolute -right-40 -top-40 h-[540px] w-[540px] rounded-full bg-[#C4622D]/6 blur-[90px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[280px] w-[280px] rounded-full bg-[#E8DDD0]/60 blur-[60px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-start">
              {/* Left */}
              <motion.div variants={slideLeft}>
                <SectionLabel>About Us</SectionLabel>
                <h1
                  className="mt-6 text-[clamp(42px,5.5vw,72px)] font-medium leading-[1.03] text-[#0F0E0D]"
                  style={{ ...serif, letterSpacing: '-0.028em' }}
                >
                  Style that
                  <br />
                  <em className="italic text-[#C4622D]">lives well.</em>
                </h1>

                <p className="mt-7 max-w-[44ch] text-[16px] leading-[1.82] text-[#8B7355]">
                  We're building around clothes that feel considered without feeling precious.
                  Easy to wear, easy to trust, made for real routines.
                </p>

                {/* Accent rule + secondary copy */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.5, ease: ez }}
                  className="mt-9 h-px origin-left bg-[#C4622D]"
                  style={{ width: 56 }}
                />
                <p className="mt-7 max-w-[42ch] text-[14.5px] leading-[1.8] text-[#A08B6E]">
                  The point is not spectacle. It's a calmer wardrobe, a clearer storefront, and pieces
                  that earn their place day after day.
                </p>

                {/* CTA */}
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link
                    to="/products"
                    className="shimmer-btn group inline-flex h-13 items-center gap-2.5 rounded-full bg-[#0F0E0D] px-7 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,14,13,0.25)]"
                    style={{ height: 52 }}
                  >
                    Shop the collection
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    to="/collections"
                    className="inline-flex items-center gap-2 rounded-full border border-[#E8DDD0] px-7 text-[13.5px] font-semibold text-[#0F0E0D] transition-all hover:border-[#C4622D] hover:text-[#C4622D]"
                    style={{ height: 52 }}
                  >
                    Browse collections
                  </Link>
                </div>
              </motion.div>

              {/* Right: staggered image duo */}
              <motion.div
                variants={slideRight}
                className="grid grid-cols-2 gap-4"
              >
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden rounded-3xl shadow-[0_20px_56px_rgba(15,14,13,0.14)]"
                >
                  <img
                    src={jacketsImage}
                    alt="Everyday outerwear"
                    className="aspect-[4/5] w-full object-cover object-center"
                  />
                </motion.div>
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ duration: 0.3 }}
                  className="mt-12 overflow-hidden rounded-3xl shadow-[0_16px_48px_rgba(15,14,13,0.10)]"
                >
                  <img
                    src={imagesImage}
                    alt="Brand editorial"
                    className="aspect-[4/5] w-full object-cover object-center"
                  />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-60px' }}
          variants={stagger}
          className="grid gap-5 md:grid-cols-3"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              whileHover={{ y: -6, boxShadow: '0 20px 56px rgba(139,115,85,0.16)' }}
              transition={{ duration: 0.25 }}
              className="group relative overflow-hidden rounded-3xl border border-[#E8DDD0] bg-white/90 p-9 shadow-[0_4px_24px_rgba(139,115,85,0.07)]"
            >
              {/* Hover tint */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#C4622D]/4 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <p className="relative text-[10px] font-semibold uppercase tracking-[0.24em] text-[#C4622D]">
                {stat.label}
              </p>
              <p className="relative mt-5 text-[58px] font-medium leading-none text-[#0F0E0D]" style={serif}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── VALUES ────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-60px' }}
          variants={stagger}
          className="mt-12 overflow-hidden rounded-[36px] border border-[#E8DDD0] bg-white/90 p-8 shadow-[0_8px_48px_rgba(139,115,85,0.08)] lg:p-12"
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Our Values</SectionLabel>
            <h2
              className="mt-6 max-w-2xl text-[clamp(28px,3.5vw,44px)] font-medium leading-tight text-[#0F0E0D]"
              style={{ ...serif, letterSpacing: '-0.022em' }}
            >
              A softer kind of fashion{' '}
              <em className="italic text-[#C4622D]">confidence.</em>
            </h2>
          </motion.div>

          <motion.div variants={stagger} className="mt-10 grid gap-5 md:grid-cols-3">
            {values.map((item) => (
              <motion.article
                key={item.title}
                variants={fadeUp}
                whileHover={{ y: -8, borderColor: 'rgba(196,98,45,0.28)' }}
                className="group relative overflow-hidden rounded-3xl border border-[#EDE5DB] bg-[#FAF8F5] p-7 shadow-sm transition-shadow duration-400 hover:shadow-[0_20px_44px_rgba(139,115,85,0.13)]"
              >
                {/* Big number bg */}
                <span
                  className="absolute right-4 top-3 select-none text-[72px] font-bold leading-none text-[#EDE5DB] transition-colors duration-300 group-hover:text-[#E0D2C0]"
                  style={serif}
                  aria-hidden
                >
                  {item.number}
                </span>

                <div className="relative">
                  <motion.div
                    whileHover={{ scale: 1.12, rotate: 4 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4EFE8] text-[#C4622D]"
                  >
                    <item.icon className="h-5 w-5" />
                  </motion.div>

                  <h3 className="mt-5 text-[19px] font-medium text-[#0F0E0D]" style={serif}>
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[13.5px] leading-[1.8] text-[#8B7355]">
                    {item.description}
                  </p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </motion.div>

        {/* ── TIMELINE ─────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-60px' }}
          variants={stagger}
          className="mt-12 rounded-[36px] border border-[#E8DDD0] bg-gradient-to-br from-[#F4EFE8] to-[#FAF8F5] p-8 shadow-[0_4px_24px_rgba(139,115,85,0.07)] lg:p-12"
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Our Journey</SectionLabel>
            <h2
              className="mt-6 max-w-xl text-[clamp(26px,3vw,38px)] font-medium leading-tight text-[#0F0E0D]"
              style={{ ...serif, letterSpacing: '-0.02em' }}
            >
              From a single idea to a complete wardrobe.
            </h2>
          </motion.div>

          <div className="mt-10 space-y-0">
            {timeline.map((item, i) => (
              <motion.div
                key={item.year}
                variants={fadeUp}
                className="group flex items-start gap-6 border-b border-[#E8DDD0] py-6 last:border-0"
              >
                <span
                  className="w-14 shrink-0 text-[22px] font-semibold text-[#C4622D] transition-opacity duration-300"
                  style={serif}
                >
                  {item.year}
                </span>
                <div className="relative mt-1.5 flex-1">
                  {/* animated connector line */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: false }}
                    transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                    className="absolute -left-3 top-2.5 h-px w-6 origin-left bg-[#C4622D]/50"
                  />
                  <p className="text-[14.5px] leading-7 text-[#8B7355]">{item.event}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── BRAND STORY SPLIT ─────────────────────────────── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-60px' }}
          variants={stagger}
          className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <motion.article
            variants={slideLeft}
            className="group rounded-3xl border border-[#E8DDD0] bg-white/90 p-9 shadow-[0_4px_24px_rgba(139,115,85,0.07)] transition-shadow duration-400 hover:shadow-[0_20px_48px_rgba(139,115,85,0.13)]"
          >
            <SectionLabel>Brand Philosophy</SectionLabel>
            <h3
              className="mt-6 text-[clamp(22px,2.8vw,34px)] font-medium leading-tight text-[#0F0E0D]"
              style={serif}
            >
              We build the brand from product clarity first.
            </h3>
            <p className="mt-5 text-[14.5px] leading-[1.82] text-[#8B7355]">
              Every page, image, and collection decision should make the wardrobe easier to understand.
              Less noise, tighter assortments, and a stronger product focus.
            </p>
          </motion.article>

          <motion.article
            variants={slideRight}
            className="group rounded-3xl border border-[#E8DDD0] bg-gradient-to-br from-[#F0EBE2] to-[#FAF8F5] p-9 shadow-[0_4px_24px_rgba(139,115,85,0.07)] transition-shadow duration-400 hover:shadow-[0_20px_48px_rgba(139,115,85,0.13)]"
          >
            {/* Quotation mark */}
            <span
              className="block text-[72px] leading-none text-[#C4622D]/20"
              style={serif}
              aria-hidden
            >
              "
            </span>
            <blockquote
              className="-mt-4 text-[clamp(20px,2.5vw,30px)] font-medium italic leading-tight text-[#0F0E0D]"
              style={serif}
            >
              The best fashion pages make choosing feel easier, not louder.
            </blockquote>
            <p className="mt-5 text-[13.5px] leading-7 text-[#8B7355]">
              That idea guides both the storefront and the product mix behind it.
            </p>
          </motion.article>
        </motion.div>

        {/* ── TEAM ─────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-60px' }}
          variants={stagger}
          className="mt-16"
        >
          <motion.div
            variants={fadeUp}
            className="flex items-end justify-between gap-4"
          >
            <div>
              <SectionLabel>Our Team</SectionLabel>
              <h2
                className="mt-5 text-[clamp(28px,4vw,52px)] font-medium leading-tight text-[#0F0E0D]"
                style={{ ...serif, letterSpacing: '-0.022em' }}
              >
                The people behind the tone.
              </h2>
            </div>
            <motion.div
              whileHover={{ scale: 1.04 }}
              className="hidden items-center gap-2 rounded-full border border-[#E8DDD0] bg-white/80 px-5 py-2.5 text-[12.5px] text-[#8B7355] shadow-sm md:flex"
            >
              <Users className="h-4 w-4 text-[#C4622D]" />
              Small team, deliberate decisions
            </motion.div>
          </motion.div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {teamCards.map((member, index) => (
              <TeamCard key={member.name} member={member} index={index} />
            ))}
          </div>
        </motion.div>

        {/* ── CTA BANNER ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-60px' }}
          transition={{ duration: 0.7, ease: ez }}
          className="relative mt-16 overflow-hidden rounded-[40px] bg-[#0F0E0D] px-8 py-16 text-white shadow-[0_40px_80px_rgba(15,14,13,0.24)] sm:px-14"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-[440px] w-[440px] rounded-full bg-[#C4622D]/14 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 left-0 h-[300px] w-[300px] rounded-full bg-[#8B7355]/8 blur-[60px]" />

          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <SectionLabel light>Explore the full catalog</SectionLabel>
              <h2
                className="mt-6 max-w-2xl text-[clamp(28px,4.5vw,56px)] font-medium leading-[1.05] text-white"
                style={serif}
              >
                See how the edit moves in the{' '}
                <em className="italic text-[#D97B4A]">full collection.</em>
              </h2>
              <p className="mt-5 max-w-lg text-[15.5px] leading-[1.78] text-white/55">
                Explore the pieces that carry this brand language from the story into the product pages.
              </p>
            </div>
            <Link
              to="/collections"
              className="shimmer-btn group inline-flex h-[58px] shrink-0 items-center gap-3 rounded-full bg-[#C4622D] px-9 text-[14px] font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#D97B4A] hover:shadow-[0_16px_40px_rgba(196,98,45,0.4)]"
            >
              Explore collections
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
