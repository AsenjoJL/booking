import {
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import brandImage from '@/assets/brand.png'
import storeLogoImage from '@/assets/storelogo.png'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

const adminSections = [
  { href: '/admin#overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin#inventory', label: 'Inventory', icon: Package },
  { href: '/admin#catalog', label: 'Catalog', icon: FolderTree },
  { href: '/admin#orders', label: 'Orders', icon: ClipboardList },
]

export default function AdminLayout() {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const resetLocalCart = useCartStore((state) => state.resetLocalCart)

  const handleLogout = () => {
    logout()
    resetLocalCart()
  }

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-border/70 bg-white lg:border-b-0 lg:border-r">
          <div className="sticky top-0 flex flex-col gap-8 px-6 py-6 lg:h-screen lg:px-7">
            <Link to="/admin" className="flex items-center gap-4">
              <img src={storeLogoImage} alt="Store logo" className="h-14 w-14 object-contain" />
              <img src={brandImage} alt="Brand name" className="h-8 w-auto object-contain" />
            </Link>

            <div className="border bg-[#f7f3ee] p-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">
                Admin workspace
              </p>
              <p className="mt-3 font-serif text-2xl text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 border border-[#d36d3d]/20 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#d36d3d]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </div>
            </div>

            <nav className="grid gap-2">
              {adminSections.map((section) => (
                <a
                  key={section.href}
                  href={section.href}
                  className="flex items-center gap-3 border border-transparent px-4 py-3 text-sm font-medium text-foreground/78 transition hover:border-border hover:bg-[#f7f3ee] hover:text-foreground"
                >
                  <section.icon className="h-4 w-4 text-[#d36d3d]" />
                  <span>{section.label}</span>
                </a>
              ))}
            </nav>

            <div className="mt-auto grid gap-3">
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-none justify-start gap-3 border-foreground/12 px-4 uppercase tracking-[0.18em]"
              >
                <Link to="/">
                  <Store className="h-4 w-4" />
                  View storefront
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-none justify-start gap-3 border border-foreground/12 px-4 uppercase tracking-[0.18em] hover:bg-black hover:text-white"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
