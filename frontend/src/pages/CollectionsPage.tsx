import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import collectionImage from '@/assets/collection.png'
import collection2Image from '@/assets/collection2.png'
import collection3Image from '@/assets/collection3.png'
import collection4Image from '@/assets/collection4.png'
import { Button } from '@/components/ui/button'

const collectionCards = [
  {
    eyebrow: 'Women',
    title: 'Soft Tailoring',
    image: collectionImage,
    surfaceClassName: 'bg-[linear-gradient(180deg,#f3ece4_0%,#ece2d6_100%)]',
    imageClassName: 'object-center',
  },
  {
    eyebrow: 'Men',
    title: 'Quiet Structure',
    image: collection2Image,
    surfaceClassName: 'bg-[linear-gradient(135deg,#1a1716_0%,#2a2320_100%)]',
    imageClassName: 'object-right',
  },
  {
    eyebrow: 'Family',
    title: 'Layered Ease',
    image: collection3Image,
    surfaceClassName: 'bg-[linear-gradient(180deg,#ede6de_0%,#e2d6c7_100%)]',
    imageClassName: 'object-center',
  },
  {
    eyebrow: 'Street',
    title: 'Color Contrast',
    image: collection4Image,
    surfaceClassName: 'bg-[linear-gradient(180deg,#efe6db_0%,#e2d1bf_100%)]',
    imageClassName: 'object-center',
  },
]

export default function CollectionsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-t pt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Collections</p>
        <h1 className="mt-4 font-serif text-5xl leading-none text-foreground sm:text-6xl">
          Curated For
          <br />
          Everyday Style.
        </h1>
        <p className="mt-6 max-w-2xl text-[1.08rem] leading-9 text-foreground/76">
          Distinct edits for quieter dressing, brighter statements, and the pieces people actually reach for on repeat.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <article className="overflow-hidden bg-card">
          <div className={`overflow-hidden rounded-sm ${collectionCards[0].surfaceClassName}`}>
            <img
              src={collectionCards[0].image}
              alt={collectionCards[0].title}
              className={`aspect-[4/4.2] w-full object-contain px-6 pb-0 pt-6 ${collectionCards[0].imageClassName}`}
            />
          </div>
        </article>

        <div className="grid gap-6">
          {collectionCards.slice(1).map((card) => (
            <article key={card.title} className={`relative overflow-hidden rounded-sm ${card.surfaceClassName}`}>
              <img
                src={card.image}
                alt={card.title}
                className={`aspect-[5/3.5] w-full object-contain px-6 pb-0 pt-6 ${card.imageClassName}`}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/68 via-black/28 to-transparent" />
              <div className="absolute inset-y-0 left-0 flex flex-col justify-end px-8 py-8 text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/78">{card.eyebrow}</p>
                <h2 className="mt-3 font-serif text-4xl leading-tight">{card.title}</h2>
                <Button
                  asChild
                  variant="ghost"
                  className="mt-6 h-auto w-fit rounded-none border-b border-white/60 px-0 pb-2 pt-0 text-sm font-semibold uppercase tracking-[0.22em] text-white hover:bg-transparent hover:text-white"
                >
                  <Link to="/products">
                    Shop {card.eyebrow.toLowerCase()}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
