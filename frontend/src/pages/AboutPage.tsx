import imagesImage from '@/assets/images.png'
import jacketsImage from '@/assets/jackets.png'

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 border-t pt-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">About</p>
          <h1 className="mt-4 font-serif text-5xl leading-none text-foreground sm:text-6xl">
            Style That
            <br />
            Lives Well.
          </h1>
          <p className="mt-8 max-w-xl text-[1.2rem] leading-10 text-foreground/78">
            We’re building around clothes that feel considered without feeling precious. Easy to wear, easy to trust,
            and made for real routines.
          </p>
          <div className="mt-10 h-[1px] w-16 bg-[#d36d3d]" />
          <p className="mt-8 max-w-xl text-base leading-8 text-muted-foreground">
            The point is not spectacle. It’s a calmer wardrobe, a clearer storefront, and pieces that earn their place
            day after day.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="overflow-hidden rounded-sm bg-[linear-gradient(135deg,#191615_0%,#2b2421_100%)]">
            <img
              src={jacketsImage}
              alt="Everyday outerwear"
              className="aspect-[4/5] w-full object-cover object-center"
            />
          </div>
          <div className="overflow-hidden rounded-sm bg-[linear-gradient(180deg,#eee7de_0%,#e2d7ca_100%)] sm:translate-y-14">
            <img
              src={imagesImage}
              alt="Brand editorial"
              className="aspect-[4/5] w-full object-cover object-center"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
