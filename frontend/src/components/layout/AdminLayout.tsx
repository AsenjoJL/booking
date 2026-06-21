import {
  ClipboardList,
  FolderTree,
  Menu,
  Package,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import backIcon from '@/assets/backicon.png'
import overviewIcon from '@/assets/overview.png'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

const adminSections = [
  { href: '/admin', label: 'Overview', iconSrc: overviewIcon },
  { href: '/admin/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/catalog', label: 'Catalog', icon: FolderTree },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
]

export default function AdminLayout() {
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const resetLocalCart = useCartStore((state) => state.resetLocalCart)
  const activePath = location.pathname

  const handleLogout = () => {
    logout()
    resetLocalCart()
  }

  return (
    <div className="admin-shell min-h-screen bg-[#edf2f7] text-[#1f2937]">
      <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-b border-[#233247] bg-[#1f2a3d] text-white lg:border-b-0 lg:border-r lg:border-r-[#233247]">
          <div className="sticky top-0 flex flex-col gap-7 px-5 py-5 lg:h-screen">
            <div className="-mx-5 -mt-5 flex items-center justify-between gap-4 bg-[#20c4c8] px-5 py-4">
              <Link to="/admin" className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/12 text-white">
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white">JLA Admin</span>
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/80">Control Center</span>
                </div>
              </Link>
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-white/90 lg:hidden">
                <Menu className="h-3.5 w-3.5 text-white" />
                Menu
              </div>
            </div>

            <div className="hidden lg:block">
              <p className="mb-3 px-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/45">Navigation</p>
              <nav className="grid gap-1.5">
              {adminSections.map((section) => (
                (() => {
                  const SectionIcon = section.icon

                  return (
                    <Link
                      key={section.href}
                      to={section.href}
                      className={`flex items-center gap-3 rounded-[10px] px-3.5 py-3 text-[0.94rem] font-medium transition ${
                        activePath === section.href
                          ? 'bg-white/12 text-white'
                          : 'text-white/68 hover:bg-white/6 hover:text-white'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-[10px] transition ${
                          activePath === section.href ? 'bg-[#20c4c8] text-white' : 'bg-white/5 text-white/70'
                        }`}
                      >
                        {section.iconSrc ? (
                          <img src={section.iconSrc} alt="" className="h-4.5 w-4.5 object-contain" aria-hidden="true" />
                        ) : SectionIcon ? (
                          <SectionIcon className="h-4.5 w-4.5" />
                        ) : null}
                      </span>
                      <span>{section.label}</span>
                    </Link>
                  )
                })()
              ))}
              </nav>
            </div>

            <nav className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {adminSections.map((section) => (
                <Link
                  key={section.href}
                  to={section.href}
                  className={`shrink-0 rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    activePath === section.href
                      ? 'border-white/10 bg-white/12 text-white'
                      : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                >
                  {section.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto grid gap-3">
              <Button
                type="button"
                variant="ghost"
                className="h-11 justify-start gap-3 rounded-[10px] border border-white/10 bg-white/8 px-4 text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-white/12"
                onClick={handleLogout}
              >
                <img src={backIcon} alt="" className="h-[1.05rem] w-[1.05rem] object-contain opacity-85" aria-hidden="true" />
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 bg-[#edf2f7]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
