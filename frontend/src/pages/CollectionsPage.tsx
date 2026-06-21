import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import collectionImage from '@/assets/collection.png'
import collection2Image from '@/assets/collection2.png'
import collection3Image from '@/assets/collection3.png'
import collection4Image from '@/assets/collection4.png'
import { Button } from '@/components/ui/button'
import { createFadeUpVariants, createSlideVariants, createStaggerContainer, replayViewport, replayViewportWide } from '@/lib/motion'
import { getProductImageClass } from '@/lib/productImage'

const containerVariants = createStaggerContainer()
const itemVariants = createFadeUpVariants(26, 0.7)
const { left: slideLeftVariants, right: slideRightVariants } = createSlideVariants(48, 0.8)

const collectionCards = [
  {
    eyebrow: 'Formal wear',
    title: 'Tailored elegance',
    description: 'Structured, sophisticated pieces crafted with precision and customizable fit.',
    image: collectionImage,
    surfaceClassName: '',
    imageClassName: 'object-center',
  },
  {
    eyebrow: 'Casual collection',
    title: 'Street style',
    description: 'Bold graphics and comfortable essentials.',
    image: collection2Image,
    surfaceClassName: '',
    imageClassName: 'object-right',
  },
  {
    eyebrow: 'Separates',
    title: 'Everyday comfort',
    description: 'Versatile pieces designed for movement and style.',
    image: collection3Image,
    surfaceClassName: '',
    imageClassName: 'object-center',
  },
  {
    eyebrow: 'Streetwear',
    title: 'Bold expression',
    description: 'Vibrant colors and confident designs for everyday style.',
    image: collection4Image,
    surfaceClassName: '',
    imageClassName: 'object-center',
  },
]

export default function CollectionsPage() {
  return (
    <section className="relative overflow-hidden bg-[#f6efe8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(211,109,61,0.08),transparent_28%),linear-gradient(180deg,rgba(246,239,232,0.98)_0%,rgba(243,235,224,0.96)_100%)]" />

      <div className="lux-page-shell">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="lux-page-intro"
        >
          <motion.p variants={itemVariants} className="lux-eyebrow">
            Collections
          </motion.p>
          <motion.h1 variants={itemVariants} className="lux-heading mt-4 max-w-4xl">
            Curated for
            <br />
            everyday style.
          </motion.h1>
          <motion.p variants={itemVariants} className="mt-6 max-w-2xl text-[1.08rem] leading-9 text-[#322928]/76">
            Handcrafted evening wear designed for timeless elegance. Each piece is made with meticulous attention to detail and customizable to match your vision.
          </motion.p>

        </motion.div>

        <div className="mt-14 space-y-8">
          {collectionCards.map((card, index) => {
            const reverse = index % 2 === 1

            return (
              <motion.article
                key={card.title}
                initial="hidden"
                whileInView="visible"
                viewport={replayViewportWide}
                variants={containerVariants}
                className={`lux-card grid items-stretch gap-8 p-6 backdrop-blur lg:grid-cols-2 lg:p-8 ${
                  reverse ? 'lg:translate-x-6' : 'lg:-translate-x-2'
                }`}
              >
                <motion.div variants={reverse ? slideRightVariants : slideLeftVariants} className={reverse ? 'lg:order-2' : ''}>
                  <div className={`overflow-hidden rounded-[26px] ${card.surfaceClassName}`}>
                    <img
                      src={card.image}
                      alt={card.title}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className={`aspect-[16/12] w-full transition-transform duration-700 hover:scale-[1.03] ${getProductImageClass(
                        { imageFit: 'contain', imagePositionClassName: card.imageClassName },
                        'detail',
                      )}`}
                    />
                  </div>
                </motion.div>

                <motion.div
                  variants={reverse ? slideLeftVariants : slideRightVariants}
                  className={`flex flex-col justify-center ${reverse ? 'lg:order-1 lg:pr-6' : 'lg:pl-2'}`}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">{card.eyebrow}</p>
                  <h2 className="mt-4 font-serif text-4xl leading-tight text-[#1f1716] sm:text-5xl">{card.title}</h2>
                  <p className="mt-6 max-w-xl text-base leading-8 text-[#322928]/74">{card.description}</p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <Button
                      asChild
                      className="h-12 rounded-full bg-[#d36d3d] px-6 text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-[#bf6034]"
                    >
                      <Link to="/products">
                        Shop now
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="h-12 rounded-full border border-[#d9cabd] bg-white/70 px-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#1f1716] hover:bg-white"
                    >
                      <Link to="/about">Read more</Link>
                    </Button>
                  </div>
                </motion.div>
              </motion.article>
            )
          })}
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={replayViewport}
          variants={itemVariants}
          className="mt-14 rounded-[32px] border border-[#eadfd3] bg-[#1f1716] px-8 py-12 text-white shadow-[0_24px_60px_rgba(31,23,22,0.18)]"
        >
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="max-w-3xl font-serif text-5xl leading-tight">
                Discover your style across all collections.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/74">
                From formal to everyday, thoughtfully curated for you.
              </p>
            </div>
            <Button
              asChild
              className="h-12 rounded-full bg-[#d36d3d] px-6 text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-[#bf6034]"
            >
              <Link to="/products">
                Browse shop
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
