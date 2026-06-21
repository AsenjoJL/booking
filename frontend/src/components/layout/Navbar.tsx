import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { Menu, UserRound } from 'lucide-react'
import backIcon from '@/assets/backicon.png'
import brandImage from '@/assets/brand.png'
import cartImage from '@/assets/cart.png'
import storeLogoImage from '@/assets/storelogo.png'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { prefetchShopCatalog } from '@/lib/shopPrefetch'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

const publicLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Shop' },
  { to: '/collections', label: 'Collections' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const resetLocalCart = useCartStore((state) => state.resetLocalCart)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  )
  const isHomePage = location.pathname === '/'
  const isAdmin = user?.role === 'Admin'
  const accountDestination = user ? (isAdmin ? '/admin' : '/account') : '/login'

  const handleLogout = () => {
    logout()
    resetLocalCart()
    setIsAccountMenuOpen(false)
  }

  const handleShopPrefetch = () => {
    void prefetchShopCatalog(queryClient)
  }

  useEffect(() => {
    setIsAccountMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <header
      className={
        isHomePage
          ? 'sticky top-0 z-40 border-b border-white/10 bg-[#f6efe8]/88 backdrop-blur'
          : 'sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur'
      }
    >
      <div className="mx-auto grid h-28 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center px-4 sm:h-32 sm:px-6 md:grid-cols-[minmax(280px,1fr)_auto_auto] lg:h-36 lg:grid-cols-[minmax(420px,1.3fr)_auto_minmax(240px,0.7fr)] lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-6 justify-self-start sm:gap-7">
          <img src={storeLogoImage} alt="Store logo" className="h-16 w-16 object-contain brightness-[1.35] contrast-[1.3] saturate-110 sm:h-20 sm:w-20 lg:h-28 lg:w-28" />
          <img
            src={brandImage}
            alt="Brand name"
            className="h-[2.8rem] w-auto max-w-[8.5rem] object-contain brightness-[2.7] contrast-[1.5] saturate-0 sm:h-[3.35rem] sm:max-w-[10.5rem] md:h-[3.65rem] md:max-w-[11rem] lg:h-[5.1rem] lg:max-w-[14rem]"
          />
        </Link>

        <nav className="hidden items-center justify-center gap-5 justify-self-center md:flex lg:translate-x-4 lg:gap-8">
          {publicLinks.map((link) => {
            const isActive =
              location.pathname === link.to ||
              (link.label === 'Home' && location.pathname === '/')

            const className = `text-sm font-semibold uppercase tracking-[0.18em] transition lg:text-[0.95rem] ${
              isActive
                ? 'text-[#d36d3d]'
                : isHomePage
                  ? 'text-foreground hover:text-[#f08d5c]'
                  : 'text-foreground hover:text-[#f08d5c]'
            }`

            return (
              <Link
                key={link.to}
                to={link.to}
                className={className}
                onMouseEnter={link.to === '/products' ? handleShopPrefetch : undefined}
                onFocus={link.to === '/products' ? handleShopPrefetch : undefined}
                onTouchStart={link.to === '/products' ? handleShopPrefetch : undefined}
              >
                {link.label}
              </Link>
            )
          })}
          {isAdmin ? (
            <Link
              to="/admin"
              className={`text-sm font-semibold uppercase tracking-[0.18em] transition lg:text-[0.95rem] ${
                location.pathname.startsWith('/admin')
                  ? 'text-[#d36d3d]'
                  : 'text-foreground hover:text-[#f08d5c]'
              }`}
            >
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center justify-self-end gap-2">
          <div className="relative" ref={accountMenuRef}>
            {user && !isAdmin ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={isHomePage ? 'text-foreground hover:bg-black/5 hover:text-foreground' : undefined}
                  aria-label="Account menu"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                >
                  <UserRound className="h-5 w-5" />
                </Button>

                {isAccountMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[220px] border border-border/80 bg-background p-2 shadow-soft">
                    <div className="border-b border-border/70 px-3 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <div className="grid gap-1 py-2">
                      {[
                        { to: '/account', label: 'Profile' },
                        { to: '/orders', label: 'Orders' },
                        { to: '/cart', label: 'Cart' },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="px-3 py-2 text-sm text-foreground transition hover:bg-black/5"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-foreground transition hover:bg-black/5"
                      onClick={handleLogout}
                    >
                      <img src={backIcon} alt="" className="h-[1.05rem] w-[1.05rem] object-contain opacity-85" aria-hidden="true" />
                      Logout
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className={isHomePage ? 'text-foreground hover:bg-black/5 hover:text-foreground' : undefined}
                aria-label={user ? 'Account' : 'Sign in'}
              >
                <Link to={accountDestination}>
                  <UserRound className="h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className={isHomePage ? 'text-foreground hover:bg-black/5 hover:text-foreground' : undefined}
            aria-label="Cart"
          >
            <Link to="/cart" className="relative">
              <img src={cartImage} alt="Cart" className="h-5 w-5 object-contain opacity-90" />
              {cartCount > 0 ? (
                <Badge className="absolute -right-2 -top-2 h-5 min-w-5 justify-center px-1">
                  {cartCount}
                </Badge>
              ) : null}
            </Link>
          </Button>
          {user && isAdmin ? (
            <Button
              variant="ghost"
              size="icon"
              className={isHomePage ? 'text-foreground hover:bg-black/5 hover:text-foreground' : undefined}
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <img src={backIcon} alt="" className="h-[1.05rem] w-[1.05rem] object-contain opacity-85" aria-hidden="true" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className={`md:hidden ${isHomePage ? 'text-foreground hover:bg-black/5 hover:text-foreground' : ''}`}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
