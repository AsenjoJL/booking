import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import { Menu, Package, ShoppingCart, User, X } from 'lucide-react'
import brandLogo from '@/assets/brand.png'
import cartIcon from '@/assets/cart.png'
import userIcon from '@/assets/icon.png'
import storeLogo from '@/assets/storelogo.png'
import { prefetchShopCatalog } from '@/lib/shopPrefetch'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

const ez: [number, number, number, number] = [0.22, 1, 0.36, 1]

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Shop' },
  { to: '/collections', label: 'Collections' },
  { to: '/about', label: 'About' },
]

/* ─── NavLink with animated hover pill ─────────────────── */

function NavLink({
  to,
  label,
  isActive,
  isTransparent,
  onMouseEnter,
}: {
  to: string
  label: string
  isActive: boolean
  isTransparent: boolean
  onMouseEnter?: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      to={to}
      onMouseEnter={() => { setHovered(true); onMouseEnter?.() }}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col items-center"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Hover background pill */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            layoutId="nav-hover-pill"
            initial={{ opacity: 0, scaleX: 0.7 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.7 }}
            transition={{ duration: 0.2, ease: ez }}
            className={`absolute inset-x-0 -inset-y-1.5 rounded-full ${
              isTransparent ? 'bg-white/12' : 'bg-[#F4EFE8]'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Label */}
      <span
        className={`relative z-10 px-3 py-1.5 text-[13px] font-semibold tracking-[0.06em] transition-colors duration-250 ${
          isActive
            ? isTransparent
              ? 'text-white'
              : 'text-[#C4622D]'
            : isTransparent
            ? 'text-white/72 group-hover:text-white'
            : 'text-[#6b5f52] group-hover:text-[#0F0E0D]'
        }`}
        style={{ letterSpacing: hovered ? '0.08em' : '0.06em', transition: 'letter-spacing 0.2s ease' }}
      >
        {label}
      </span>

      {/* Active indicator dot */}
      {isActive && (
        <motion.span
          layoutId="nav-active-dot"
          className={`absolute -bottom-2.5 h-[3px] w-[18px] rounded-full ${
            isTransparent ? 'bg-white' : 'bg-[#C4622D]'
          }`}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </Link>
  )
}

/* ─── Icon button ───────────────────────────────────────── */

function IconBtn({
  onClick,
  href,
  label,
  isTransparent,
  children,
}: {
  onClick?: () => void
  href?: string
  label: string
  isTransparent: boolean
  children: React.ReactNode
}) {
  const cls = `relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
    isTransparent
      ? 'text-white hover:bg-white/14'
      : 'text-[#0F0E0D] hover:bg-[#F4EFE8]'
  }`

  if (href) {
    return (
      <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
        <Link to={href} className={cls} aria-label={label}>
          {children}
        </Link>
      </motion.div>
    )
  }
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className={cls}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}

/* ─── Main Navbar ───────────────────────────────────────── */

export default function Navbar() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const resetLocalCart = useCartStore((state) => state.resetLocalCart)
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  )
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const isAdmin = user?.role === 'Admin'
  const accountDestination = user ? (isAdmin ? '/admin' : '/account') : '/login'
  const isHeroPage = location.pathname === '/'
  const isTransparent = isHeroPage && !scrolled && !isMobileMenuOpen

  /* Spring for cart badge pop */
  const badgeScale = useMotionValue(0)
  const badgeSpring = useSpring(badgeScale, { stiffness: 520, damping: 22 })

  useEffect(() => {
    badgeScale.set(cartCount > 0 ? 1 : 0)
  }, [cartCount, badgeScale])

  const handleLogout = () => {
    logout()
    resetLocalCart()
    setIsAccountMenuOpen(false)
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    setIsAccountMenuOpen(false)
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (!accountMenuRef.current?.contains(e.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  const iconFilter = isTransparent
    ? 'brightness-0 invert'
    : 'brightness-0'

  const userInitial = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : null

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-500 ${
          isTransparent
            ? 'border-b border-white/10 bg-transparent'
            : 'border-b border-[#E8DDD0] bg-white/95 shadow-[0_2px_28px_rgba(15,14,13,0.07)] backdrop-blur-xl'
        }`}
      >
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-7 lg:px-10">

          {/* ── Logo ────────────────────────────────── */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Link to="/" className="flex items-center gap-2.5" aria-label="JLA Everyday — home">
              <motion.img
                src={storeLogo}
                alt=""
                aria-hidden
                className="h-10 w-10 object-contain"
                whileHover={{ rotate: [0, -6, 6, 0] }}
                transition={{ duration: 0.45, ease: 'easeInOut' }}
              />
              <img
                src={brandLogo}
                alt="JLA Everyday"
                className={`h-[30px] w-auto object-contain transition-all duration-300 ${
                  isTransparent ? 'brightness-0 invert' : ''
                }`}
              />
            </Link>
          </motion.div>

          {/* ── Desktop Nav ─────────────────────────── */}
          <nav className="hidden items-center gap-1 md:flex">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                label={link.label}
                isActive={location.pathname === link.to}
                isTransparent={isTransparent}
                onMouseEnter={
                  link.to === '/products'
                    ? () => void prefetchShopCatalog(queryClient)
                    : undefined
                }
              />
            ))}
          </nav>

          {/* ── Actions ─────────────────────────────── */}
          <div className="flex items-center gap-1">

            {/* Divider (desktop only) */}
            <span
              className={`mr-2 hidden h-5 w-px md:block ${
                isTransparent ? 'bg-white/18' : 'bg-[#E8DDD0]'
              }`}
            />

            {/* User icon / avatar */}
            <div className="relative" ref={accountMenuRef}>
              {user && !isAdmin ? (
                <>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                      isTransparent ? 'hover:bg-white/14' : 'hover:bg-[#F4EFE8]'
                    }`}
                    aria-label="Account menu"
                    onClick={() => setIsAccountMenuOpen((c) => !c)}
                  >
                    {userInitial ? (
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold tracking-wide ${
                          isTransparent
                            ? 'bg-white/20 text-white ring-1 ring-white/30'
                            : 'bg-[#F4EFE8] text-[#C4622D] ring-1 ring-[#E8DDD0]'
                        }`}
                      >
                        {userInitial}
                      </span>
                    ) : (
                      <img
                        src={userIcon}
                        alt="Account"
                        className={`h-5 w-5 object-contain transition-all duration-300 ${iconFilter}`}
                      />
                    )}
                  </motion.button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {isAccountMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.93, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.93, y: -8 }}
                        transition={{ duration: 0.2, ease: ez }}
                        className="absolute right-0 top-[calc(100%+10px)] z-50 min-w-[240px] overflow-hidden rounded-2xl border border-[#E8DDD0] bg-white shadow-[0_24px_56px_rgba(15,14,13,0.14)]"
                      >
                        {/* User header */}
                        <div className="flex items-center gap-3 border-b border-[#F0E8DE] px-4 py-4">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4EFE8] text-[12px] font-bold text-[#C4622D]">
                            {userInitial}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-semibold text-[#0F0E0D]">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="truncate text-[11.5px] text-[#8B7355]">{user.email}</p>
                          </div>
                        </div>

                        {/* Menu items */}
                        <div className="grid gap-0.5 p-2">
                          {[
                            { to: '/account', label: 'My Profile', icon: <User className="h-[15px] w-[15px]" /> },
                            { to: '/orders', label: 'My Orders', icon: <Package className="h-[15px] w-[15px]" /> },
                            { to: '/cart', label: 'Cart', icon: <ShoppingCart className="h-[15px] w-[15px]" /> },
                          ].map((item, i) => (
                            <motion.div
                              key={item.to}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05, duration: 0.18 }}
                            >
                              <Link
                                to={item.to}
                                className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-[#0F0E0D] transition-colors hover:bg-[#F4EFE8] hover:text-[#C4622D]"
                              >
                                <span className="text-[#8B7355]">{item.icon}</span>
                                {item.label}
                              </Link>
                            </motion.div>
                          ))}
                        </div>

                        {/* Sign out */}
                        <div className="border-t border-[#F0E8DE] p-2">
                          <button
                            type="button"
                            className="w-full rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#C4622D] transition-colors hover:bg-[#FDF4EE]"
                            onClick={handleLogout}
                          >
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <IconBtn
                  href={accountDestination}
                  label={user ? 'Account' : 'Sign in'}
                  isTransparent={isTransparent}
                >
                  <img
                    src={userIcon}
                    alt=""
                    aria-hidden
                    className={`h-5 w-5 object-contain transition-all duration-300 ${iconFilter}`}
                  />
                </IconBtn>
              )}
            </div>

            {/* Cart */}
            <div className="relative">
              <IconBtn href="/cart" label="Cart" isTransparent={isTransparent}>
                <img
                  src={cartIcon}
                  alt=""
                  aria-hidden
                  className={`h-5 w-5 object-contain transition-all duration-300 ${iconFilter}`}
                />
              </IconBtn>
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key="badge"
                    style={{ scale: badgeSpring }}
                    className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#C4622D] px-1 text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(196,98,45,0.5)]"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile hamburger */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              className={`ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 md:hidden ${
                isTransparent
                  ? 'text-white hover:bg-white/14'
                  : 'text-[#0F0E0D] hover:bg-[#F4EFE8]'
              }`}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setIsMobileMenuOpen((c) => !c)}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileMenuOpen ? (
                  <motion.span
                    key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ──────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-30 bg-[#0F0E0D]/40 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-40 flex w-[300px] flex-col bg-white shadow-[-24px_0_64px_rgba(15,14,13,0.16)] md:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-[#F0E8DE] px-6 py-5">
                <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                  <img src={storeLogo} alt="" className="h-8 w-8 object-contain" aria-hidden />
                  <img src={brandLogo} alt="JLA Everyday" className="h-6 w-auto object-contain" />
                </Link>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F4EFE8] text-[#0F0E0D]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              {/* Drawer nav links */}
              <nav className="flex-1 overflow-y-auto px-4 py-6">
                <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C4622D]">
                  Navigation
                </p>
                <div className="space-y-1">
                  {publicLinks.map((link, i) => {
                    const isActive = location.pathname === link.to
                    return (
                      <motion.div
                        key={link.to}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.28, ease: ez }}
                      >
                        <Link
                          to={link.to}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition-colors ${
                            isActive
                              ? 'bg-[#F4EFE8] text-[#C4622D]'
                              : 'text-[#0F0E0D] hover:bg-[#FAF8F5]'
                          }`}
                        >
                          {link.label}
                          {isActive && (
                            <motion.span
                              layoutId="mobile-dot"
                              className="h-1.5 w-1.5 rounded-full bg-[#C4622D]"
                            />
                          )}
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Account section */}
                {user && !isAdmin && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.28, duration: 0.28 }}
                    className="mt-6"
                  >
                    <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C4622D]">
                      Account
                    </p>
                    <div className="space-y-1">
                      {[
                        { to: '/account', label: 'My Profile' },
                        { to: '/orders', label: 'My Orders' },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center rounded-2xl px-4 py-3.5 text-[15px] font-medium text-[#0F0E0D] transition-colors hover:bg-[#FAF8F5]"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </nav>

              {/* Drawer footer */}
              <div className="border-t border-[#F0E8DE] p-4">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-[#FAF8F5] px-4 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4EFE8] text-[11px] font-bold text-[#C4622D]">
                        {userInitial}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#0F0E0D]">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="truncate text-[11px] text-[#8B7355]">{user.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-2xl border border-[#E8DDD0] py-3 text-[13px] font-semibold text-[#C4622D] transition-colors hover:bg-[#FDF4EE]"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex h-12 w-full items-center justify-center rounded-full bg-[#C4622D] text-[13.5px] font-semibold text-white transition-all hover:bg-[#D97B4A]"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
