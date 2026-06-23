import { Link } from 'react-router-dom'

/* Inline SVG brand icons — lucide-react v1.x removed brand icons */
function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.74-8.858L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function IconYoutube({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
    </svg>
  )
}

const footerGroups = [
  {
    title: 'Shop',
    links: [
      { label: 'Men', to: '/products' },
      { label: 'Women', to: '/products' },
      { label: 'Sale', to: '/products' },
      { label: 'New Arrivals', to: '/products' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Collections', to: '/collections' },
      { label: 'Contact', to: '/contact' },
      { label: 'Press', to: '/about' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', to: '/contact' },
      { label: 'Returns', to: '/contact' },
      { label: 'Shipping Info', to: '/contact' },
      { label: 'Size Guide', to: '/about' },
    ],
  },
]

const socialLinks = [
  { label: 'Instagram', Icon: IconInstagram, to: '/contact' },
  { label: 'Twitter / X', Icon: IconX, to: '/contact' },
  { label: 'YouTube', Icon: IconYoutube, to: '/contact' },
]

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--fashion-dark)', color: '#FAF8F5' }}>
      {/* Top section */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">

          {/* Brand col */}
          <div>
            <Link
              to="/"
              className="text-[24px] font-medium text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.02em' }}
            >
              ModernStyle
            </Link>
            <p className="mt-4 max-w-[28ch] text-[13.5px] leading-[1.78] text-white/50">
              Contemporary fashion for those who live intentionally — curated, thoughtful, and
              always well-dressed.
            </p>

            {/* Social icons */}
            <div className="mt-7 flex items-center gap-3">
              {socialLinks.map(({ label, Icon, to }) => (
                <Link
                  key={label}
                  to={to}
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/50 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C4622D]/50 hover:bg-[#C4622D]/12 hover:text-[#D97B4A]"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Link groups */}
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                {group.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="group relative inline-block text-[13.5px] text-white/55 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                      <span className="absolute -bottom-px left-0 h-px w-0 bg-[#C4622D] transition-all duration-300 group-hover:w-full" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="mt-14 border-t border-white/8 pt-7">
          <div className="flex flex-col gap-4 text-[12px] text-white/30 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 ModernStyle. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/contact" className="transition-colors hover:text-white/60">
                Privacy Policy
              </Link>
              <Link to="/contact" className="transition-colors hover:text-white/60">
                Terms of Service
              </Link>
              <Link to="/contact" className="transition-colors hover:text-white/60">
                Cookie Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
