import { Link, useLocation } from 'react-router-dom'
import { LogOut, Menu, UserRound } from 'lucide-react'
import brandImage from '@/assets/brand.png'
import cartImage from '@/assets/cart.png'
import storeLogoImage from '@/assets/storelogo.png'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const resetLocalCart = useCartStore((state) => state.resetLocalCart)
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  )
  const isHomePage = location.pathname === '/'
  const isAdmin = user?.role === 'Admin'
  const accountDestination = user ? (isAdmin ? '/admin' : '/account') : '/login'

  const handleLogout = () => {
    logout()
    resetLocalCart()
  }

  return (
    <header
      className={
        isHomePage
          ? 'sticky top-0 z-40 border-b border-white/10 bg-[#f6efe8]/88 backdrop-blur'
          : 'sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur'
      }
    >
      <div className="mx-auto grid h-24 max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-5 justify-self-start">
          <img src={storeLogoImage} alt="Store logo" className="h-16 w-16 object-contain brightness-125 contrast-125 sm:h-20 sm:w-20 lg:h-24 lg:w-24" />
          <img
            src={brandImage}
            alt="Brand name"
            className="h-9 w-auto object-contain brightness-[2.25] contrast-125 sm:h-11 lg:h-14"
          />
        </Link>

        <nav className="hidden items-center justify-center gap-8 justify-self-center md:flex lg:gap-10">
          {publicLinks.map((link) => {
            const isActive =
              location.pathname === link.to ||
              (link.label === 'Home' && location.pathname === '/')

            const className = `text-sm uppercase tracking-[0.18em] transition lg:text-[0.95rem] ${
              isActive
                ? 'text-[#d36d3d]'
                : isHomePage
                  ? 'text-foreground hover:text-[#f08d5c]'
                  : 'text-foreground hover:text-[#f08d5c]'
            }`

            return (
              <Link key={link.to} to={link.to} className={className}>
                {link.label}
              </Link>
            )
          })}
          {isAdmin ? (
            <Link
              to="/admin"
              className={`text-sm uppercase tracking-[0.18em] transition lg:text-[0.95rem] ${
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
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              className={isHomePage ? 'text-foreground hover:bg-black/5 hover:text-foreground' : undefined}
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
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
