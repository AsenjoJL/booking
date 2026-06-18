import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import brandImage from '@/assets/brand.png'

const featureItems = [
  {
    title: 'Free Shipping',
    description: 'On orders over P1,500',
  },
  {
    title: 'Easy Returns',
    description: '30-day straightforward returns',
  },
  {
    title: 'Inclusive Sizing',
    description: 'Everyday fits across generations',
  },
  {
    title: 'Honest Quality',
    description: 'Well-made pieces at fair prices',
  },
]

const shopLinks = [
  { label: 'New Arrivals', to: '/products' },
  { label: 'Women', to: '/products' },
  { label: 'Men', to: '/products' },
  { label: 'Everyday Sets', to: '/collections' },
  { label: 'Collections', to: '/collections' },
]

const infoLinks = [
  { label: 'About JLA', to: '/about' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'Shipping & Returns', to: '/contact' },
  { label: 'Care & Sizing', to: '/about' },
  { label: 'Store Policies', to: '/contact' },
]
const socialLinks = ['IG', 'FB', 'X']

export default function Footer() {
  return (
    <footer className="mt-16">
      <section className="border-y bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-center sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {featureItems.map((item) => (
            <div key={item.title}>
              <div className="mx-auto mb-4 h-[2px] w-10 bg-[#d36d3d]" />
              <p className="font-serif text-[1.9rem] leading-tight text-foreground">{item.title}</p>
              <p className="mt-2 text-base text-foreground/78">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#08090b] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr_1fr_1.15fr] lg:px-8">
          <div>
            <img src={brandImage} alt="Brand name" className="h-10 w-auto object-contain brightness-0 invert" />
            <p className="mt-8 max-w-sm text-[1.05rem] leading-10 text-white/78">
              Thoughtful everyday wear for real routines. Pieces with shape, ease, and enough polish to keep up with daily life.
            </p>
            <div className="mt-8 flex items-center gap-4 text-white/78">
              {socialLinks.map((link) => (
                <a
                  key={link}
                  href="#"
                  aria-label={link}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/14 text-sm font-semibold tracking-[0.2em] transition hover:border-white/30 hover:text-white"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#8a7e74]">Shop</p>
            <ul className="mt-8 space-y-5 text-[1.05rem] text-white/86">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="transition hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#8a7e74]">Info</p>
            <ul className="mt-8 space-y-5 text-[1.05rem] text-white/86">
              {infoLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="transition hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#8a7e74]">Stay In The Loop</p>
            <p className="mt-8 text-[1.05rem] leading-10 text-white/78">
              New edits, easier outfit ideas, and first notice when the next drop lands.
            </p>
            <div className="mt-8 space-y-4">
              <Input
                type="email"
                placeholder="your@email.com"
                className="h-14 rounded-none border-white/10 bg-white/10 px-5 text-base text-white placeholder:text-white/40"
              />
              <button className="h-14 w-full bg-[#cf6c3e] text-lg font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#ba5d33]">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 px-4 py-8 text-sm text-white/48 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© 2026 JLA Everyday. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="transition hover:text-white/75">
              Privacy Policy
            </a>
            <a href="#" className="transition hover:text-white/75">
              Terms of Use
            </a>
          </div>
        </div>
      </section>
    </footer>
  )
}
