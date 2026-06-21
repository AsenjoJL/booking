import { motion } from 'framer-motion'
import { ArrowRight, HeartHandshake, Leaf, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import imagesImage from '@/assets/images.png'
import jacketsImage from '@/assets/jackets.png'
import fashion3Asset from '@/assets/fashion3.png'
import fashion5Asset from '@/assets/fashion5.png'
import { Button } from '@/components/ui/button'
import { createFadeUpVariants, createSlideVariants, createStaggerContainer, replayViewport, replayViewportTight } from '@/lib/motion'

const containerVariants = createStaggerContainer()
const itemVariants = createFadeUpVariants(26, 0.7)
const { left: slideLeftVariants, right: slideRightVariants } = createSlideVariants(48, 0.8)

const values = [
  {
    icon: Sparkles,
    title: 'Thoughtful design',
    description: 'We start with pieces people want to wear again, not just admire once.',
  },
  {
    icon: Leaf,
    title: 'Longer wear',
    description: 'Calmer silhouettes and steadier quality help the wardrobe stay useful longer.',
  },
  {
    icon: HeartHandshake,
    title: 'Real trust',
    description: 'Clear pricing, honest materials, and a storefront that feels human instead of pushy.',
  },
]

const teamCards = [
  { name: 'Mara', role: 'Creative direction', image: jacketsImage },
  { name: 'Elise', role: 'Brand merchandising', image: fashion5Asset },
  { name: 'Noah', role: 'Product curation', image: fashion3Asset },
]

export default function AboutPage() {
  return (
    <section className="relative overflow-hidden bg-[#f6efe8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(211,109,61,0.08),transparent_28%),linear-gradient(180deg,rgba(246,239,232,0.98)_0%,rgba(244,236,226,0.96)_100%)]" />

      <div className="lux-page-shell">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="lux-page-intro"
        >
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <motion.div variants={slideLeftVariants}>
              <p className="lux-eyebrow">About</p>
              <h1 className="lux-heading mt-4">
                Style that
                <br />
                lives well.
              </h1>
              <p className="mt-8 max-w-xl text-[1.12rem] leading-10 text-[#322928]/78">
                We’re building around clothes that feel considered without feeling precious. Easy to wear, easy to trust, and made for real routines.
              </p>
              <div className="mt-10 h-[2px] w-16 bg-[#d36d3d]" />
              <p className="mt-8 max-w-xl text-base leading-8 text-[#322928]/68">
                The point is not spectacle. It’s a calmer wardrobe, a clearer storefront, and pieces that earn their place day after day.
              </p>
            </motion.div>

            <motion.div
              variants={slideRightVariants}
              className="grid gap-6 sm:grid-cols-2"
            >
              <div className="overflow-hidden rounded-[28px] shadow-[0_20px_50px_rgba(56,34,21,0.12)]">
                <img src={jacketsImage} alt="Everyday outerwear" className="aspect-[4/5] w-full object-cover object-center transition-transform duration-700 hover:scale-[1.03]" />
              </div>
              <div className="overflow-hidden rounded-[28px] shadow-[0_20px_50px_rgba(56,34,21,0.08)] sm:translate-y-14">
                <img src={imagesImage} alt="Brand editorial" className="aspect-[4/5] w-full object-cover object-center transition-transform duration-700 hover:scale-[1.03]" />
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={replayViewport}
          variants={containerVariants}
          className="mt-16 grid gap-6 md:grid-cols-3"
        >
          {[
            { label: 'Years shaping the edit', value: '06' },
            { label: 'Signature wardrobe categories', value: '12' },
            { label: 'Repeat-customer trust score', value: '95%' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="lux-card rounded-[28px] p-8"
            >
              <p className="text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-[#d36d3d]">{stat.label}</p>
              <p className="mt-4 font-serif text-5xl text-[#1f1716]">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={replayViewport}
          variants={containerVariants}
          className="lux-card mt-16 bg-white/80 p-8 lg:p-10"
        >
          <motion.div variants={itemVariants}>
            <h2 className="max-w-3xl font-serif text-5xl leading-tight text-[#1f1716]">A softer kind of fashion confidence.</h2>
          </motion.div>

          <motion.div variants={containerVariants} className="mt-10 grid gap-6 md:grid-cols-3">
            {values.map((item) => (
              <motion.article
                key={item.title}
                variants={itemVariants}
                className="group rounded-[26px] border border-[#ece1d6] bg-[#fffaf5] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#d36d3d]/25 hover:shadow-[0_18px_40px_rgba(56,34,21,0.08)]"
              >
                <div className="inline-flex rounded-2xl bg-[#f7ede5] p-3 text-[#d36d3d] transition duration-300 group-hover:scale-110">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-serif text-2xl text-[#1f1716]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#322928]/70">{item.description}</p>
              </motion.article>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={replayViewport}
          variants={containerVariants}
          className="mt-16 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <motion.article
            variants={slideLeftVariants}
            className="lux-card p-8"
          >
              <h3 className="font-serif text-4xl leading-tight text-[#1f1716]">
                We build the brand from product clarity first.
              </h3>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#322928]/72">
                Every page, image, and collection decision should make the wardrobe easier to understand. That means less noise, tighter assortments, and stronger product focus.
              </p>
          </motion.article>

          <motion.article
            variants={slideRightVariants}
            className="rounded-[32px] border border-[#eadfd3] bg-[#fff8f2] p-8 shadow-[0_20px_50px_rgba(56,34,21,0.05)]"
          >
            <blockquote className="font-serif text-3xl leading-tight text-[#1f1716]">
              “The best fashion pages make choosing feel easier, not louder.”
            </blockquote>
            <p className="mt-5 text-sm leading-7 text-[#322928]/68">
              That idea guides both the storefront and the product mix behind it.
            </p>
          </motion.article>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={replayViewportTight}
          variants={containerVariants}
          className="mt-16"
        >
          <motion.div variants={itemVariants} className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-5xl leading-tight text-[#1f1716]">The people behind the tone.</h2>
            </div>
            <div className="hidden rounded-full bg-white/75 px-5 py-3 text-sm text-[#6f5f53] shadow-[0_10px_24px_rgba(56,34,21,0.05)] md:inline-flex md:items-center md:gap-2">
              <Users className="h-4 w-4 text-[#d36d3d]" />
              Small team, deliberate decisions
            </div>
          </motion.div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {teamCards.map((member) => (
              <motion.article
                key={member.name}
                variants={itemVariants}
                className="group overflow-hidden rounded-[28px] border border-[#eadfd3] bg-white/82 shadow-[0_18px_46px_rgba(56,34,21,0.06)]"
              >
                <div className="overflow-hidden">
                  <img src={member.image} alt={member.name} className="aspect-[4/4.8] w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]" />
                </div>
                <div className="p-6">
                  <p className="font-serif text-3xl text-[#1f1716]">{member.name}</p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#d36d3d]">{member.role}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={replayViewport}
          variants={itemVariants}
          className="mt-16 rounded-[32px] border border-[#eadfd3] bg-[#1f1716] px-8 py-12 text-white shadow-[0_26px_60px_rgba(31,23,22,0.18)] lg:px-10"
        >
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="max-w-3xl font-serif text-5xl leading-tight">See how the edit moves in the full collection.</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/76">
                Explore the pieces that carry this brand language from the story into the product pages.
              </p>
            </div>
            <Button
              asChild
              className="h-12 rounded-full bg-[#d36d3d] px-6 text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-[#bf6034]"
            >
              <Link to="/collections">
                Explore collections
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
