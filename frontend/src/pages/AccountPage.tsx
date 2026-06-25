import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, LoaderCircle, MapPin, Save, ShieldCheck, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import userIcon from '@/assets/icon.png'
import { AddressBook } from '@/components/checkout/AddressBook'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getProductImageClass, getProductImageSurfaceClass } from '@/lib/productImage'
import { addressService } from '@/services/addressService'
import { productService } from '@/services/productService'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/utils/format'

/* ─── Types & schema ────────────────────────────────────── */

const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'Enter a first name'),
  lastName: z.string().trim().min(2, 'Enter a last name'),
})
type ProfileFormValues = z.output<typeof profileSchema>

/* ─── Animations ────────────────────────────────────────── */

const ez: [number, number, number, number] = [0.22, 1, 0.36, 1]
const serif: React.CSSProperties = { fontFamily: "'Playfair Display', Georgia, serif" }

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: ez } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const slideLeft = {
  hidden: { opacity: 0, x: -36, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: ez } },
}

const slideRight = {
  hidden: { opacity: 0, x: 36, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: ez } },
}

/* ─── Helpers ───────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: ez }}
        className="h-px w-8 origin-left bg-[#C4622D]"
      />
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C4622D]">
        {children}
      </span>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────── */

export default function AccountPage() {
  const user = useAuthStore((state) => state.user)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const addItem = useCartStore((state) => state.addItem)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [cartError, setCartError] = useState<string | null>(null)
  const [addingProductId, setAddingProductId] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressService.getMyAddresses(),
  })

  const defaultAddressId = useMemo(
    () => addresses.find((address) => address.isDefaultShipping)?.id ?? addresses[0]?.id ?? '',
    [addresses],
  )

  const { data: recommendedProducts = [] } = useQuery({
    queryKey: ['account-recommended-products'],
    queryFn: () => productService.getProducts(),
  })

  const activeSelectedAddressId =
    selectedAddressId && addresses.some((address) => address.id === selectedAddressId)
      ? selectedAddressId
      : defaultAddressId

  const accountProducts = recommendedProducts.slice(0, 4)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    },
  })

  useEffect(() => {
    reset({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' })
  }, [reset, user?.firstName, user?.lastName])

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      await updateProfile({ firstName: values.firstName.trim(), lastName: values.lastName.trim() })
    },
    onSuccess: () => {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    await updateProfileMutation.mutateAsync(values)
  })

  const handleAddToCart = async (product: (typeof accountProducts)[number]) => {
    setCartError(null)
    setAddingProductId(product.id)
    try {
      await addItem(product)
    } catch (error) {
      setCartError(
        axios.isAxiosError(error)
          ? (error.response?.data?.error as string | undefined) ?? 'Could not add to cart.'
          : 'Could not add to cart.',
      )
    } finally {
      setAddingProductId(null)
    }
  }

  if (user?.role === 'Admin') return <Navigate to="/admin" replace />

  return (
    <div style={{ backgroundColor: 'var(--fashion-warm)', color: 'var(--fashion-dark)' }}>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden border-b border-[#E8DDD0]"
        style={{ background: 'linear-gradient(135deg, #EDE3D8 0%, #FAF8F5 65%)' }}
      >
        <div className="pointer-events-none absolute -right-32 -top-32 h-[460px] w-[460px] rounded-full bg-[#C4622D]/6 blur-[80px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
              {/* Left: heading */}
              <motion.div variants={slideLeft}>
                <SectionLabel>Account</SectionLabel>
                <h1
                  className="mt-6 text-[clamp(38px,5vw,64px)] font-medium leading-[1.06] text-[#0F0E0D]"
                  style={{ ...serif, letterSpacing: '-0.025em' }}
                >
                  Profile &amp;
                  <br />
                  <em className="italic text-[#C4622D]">saved details.</em>
                </h1>
                <p className="mt-5 max-w-md text-[15px] leading-[1.8] text-[#8B7355]">
                  Manage your identity, delivery addresses, and curated suggestions — all in one place.
                </p>
              </motion.div>

              {/* Right: profile stat cards */}
              <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    icon: <img src={userIcon} alt="" className="h-[18px] w-[18px] object-contain brightness-0" style={{ filter: 'brightness(0) saturate(100%) invert(35%) sepia(62%) saturate(520%) hue-rotate(341deg)' }} />,
                    value: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Welcome',
                    sub: user?.email ?? '',
                  },
                  {
                    icon: <MapPin className="h-[18px] w-[18px]" />,
                    value: `${addresses.length} saved`,
                    sub: 'Delivery addresses',
                  },
                  {
                    icon: <ShieldCheck className="h-[18px] w-[18px]" />,
                    value: 'Protected',
                    sub: 'Authenticated route',
                  },
                ].map((card, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.22 }}
                    className="rounded-3xl border border-[#E8DDD0] bg-white/85 p-6 shadow-[0_4px_20px_rgba(139,115,85,0.07)]"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4EFE8] text-[#C4622D]">
                      {card.icon}
                    </div>
                    <p className="mt-4 text-[18px] font-medium leading-tight text-[#0F0E0D]" style={serif}>
                      {card.value}
                    </p>
                    <p className="mt-1.5 truncate text-[12px] text-[#8B7355]">{card.sub}</p>
                    {i === 0 && (
                      <Badge className="mt-3 rounded-full bg-[#F4EFE8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C4622D] hover:bg-[#EDE5DB]">
                        {user?.role ?? 'Customer'}
                      </Badge>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── PROFILE + ADDRESSES ───────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="grid gap-7 xl:grid-cols-[0.9fr_1.1fr]"
        >
          {/* Profile form */}
          <motion.div
            variants={slideLeft}
            className="overflow-hidden rounded-[28px] border border-[#E8DDD0] bg-white/90 shadow-[0_8px_40px_rgba(139,115,85,0.08)]"
          >
            {/* Accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-[#C4622D] to-[#D97B4A]" />
            <div className="p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4EFE8]">
                  <img src={userIcon} alt="" className="h-5 w-5 object-contain" style={{ filter: 'brightness(0) saturate(100%) invert(35%) sepia(62%) saturate(520%) hue-rotate(341deg)' }} />
                </div>
                <div>
                  <SectionLabel>Profile details</SectionLabel>
                </div>
              </div>

              <form className="mt-7 space-y-5" onSubmit={onSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]">First name</span>
                    <Input
                      {...register('firstName')}
                      className="h-12 rounded-2xl border-[#E8DDD0] bg-[#FAF8F5] text-[14.5px] text-[#0F0E0D] focus:border-[#C4622D] focus:ring-[#C4622D]/20"
                    />
                    {errors.firstName && (
                      <p className="text-[12px] text-red-500">{errors.firstName.message}</p>
                    )}
                  </label>
                  <label className="space-y-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]">Last name</span>
                    <Input
                      {...register('lastName')}
                      className="h-12 rounded-2xl border-[#E8DDD0] bg-[#FAF8F5] text-[14.5px] text-[#0F0E0D] focus:border-[#C4622D] focus:ring-[#C4622D]/20"
                    />
                    {errors.lastName && (
                      <p className="text-[12px] text-red-500">{errors.lastName.message}</p>
                    )}
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]">Email</span>
                  <Input
                    value={user?.email ?? ''}
                    disabled
                    className="h-12 rounded-2xl border-[#E8DDD0] bg-[#F4EFE8] text-[14.5px] text-[#8B7355]"
                  />
                </label>

                <div className="flex items-center gap-3 pt-2">
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || updateProfileMutation.isPending}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex h-12 items-center gap-2.5 rounded-full bg-[#C4622D] px-7 text-[13px] font-semibold text-white transition-all hover:bg-[#D97B4A] hover:shadow-[0_10px_28px_rgba(196,98,45,0.32)] disabled:opacity-60"
                  >
                    {updateProfileMutation.isPending ? (
                      <><LoaderCircle className="h-4 w-4 animate-spin" /> Saving…</>
                    ) : (
                      <><Save className="h-4 w-4" /> Save profile</>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {saveSuccess && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-600"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Saved
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Address book */}
          <motion.div
            variants={slideRight}
            className="overflow-hidden rounded-[28px] border border-[#E8DDD0] bg-white/90 shadow-[0_8px_40px_rgba(139,115,85,0.08)]"
          >
            <div className="h-1.5 bg-gradient-to-r from-[#8B7355] to-[#A08B6E]" />
            <div className="p-7 sm:p-9">
              <AddressBook
                addresses={addresses}
                isLoading={addressesLoading}
                selectedAddressId={activeSelectedAddressId}
                onAddressSelect={setSelectedAddressId}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* ── RECOMMENDED PRODUCTS ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-60px' }}
          transition={{ duration: 0.65, ease: ez }}
          className="mt-16"
        >
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <SectionLabel>For your next order</SectionLabel>
              <h2
                className="mt-4 text-[clamp(26px,3.5vw,40px)] font-medium leading-tight text-[#0F0E0D]"
                style={{ ...serif, letterSpacing: '-0.02em' }}
              >
                Recommended products
              </h2>
              <p className="mt-2 text-[14px] leading-7 text-[#8B7355]">
                Add directly to your cart without leaving your account.
              </p>
            </div>
            <Link
              to="/products"
              className="hidden items-center gap-2 text-[13px] font-semibold text-[#C4622D] transition-all hover:gap-3 md:flex"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {cartError && (
            <p className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {cartError}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {accountProducts.map((product, index) => (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: index * 0.09, duration: 0.5, ease: ez }}
                whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(139,115,85,0.16)' }}
                className="group overflow-hidden rounded-[28px] border border-[#E8DDD0] bg-white/90 shadow-[0_4px_20px_rgba(139,115,85,0.07)] transition-shadow duration-300"
              >
                <Link to={`/products/${product.slug}`} className="block">
                  <div className={`overflow-hidden ${getProductImageSurfaceClass(product)}`}>
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className={`aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.06] ${getProductImageClass(product, 'compact')}`}
                    />
                  </div>
                </Link>

                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C4622D]">
                      {product.stock > 0 && product.stock <= 10 ? 'Low stock' : 'Recommended'}
                    </p>
                    <Link
                      to={`/products/${product.slug}`}
                      className="mt-1.5 block text-[18px] font-medium leading-tight text-[#0F0E0D] transition-colors hover:text-[#C4622D]"
                      style={serif}
                    >
                      {product.name}
                    </Link>
                  </div>

                  <p className="line-clamp-2 text-[12.5px] leading-6 text-[#8B7355]">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between gap-3 border-t border-[#EDE5DB] pt-4">
                    <span className="text-[18px] font-semibold text-[#0F0E0D]" style={serif}>
                      {formatCurrency(product.price)}
                    </span>
                    <Button
                      type="button"
                      disabled={product.stock <= 0 || addingProductId === product.id}
                      onClick={() => void handleAddToCart(product)}
                      className="h-10 rounded-full border border-[#E8DDD0] bg-white px-5 text-[12px] font-semibold text-[#0F0E0D] shadow-none transition-all hover:border-[#C4622D] hover:bg-[#C4622D] hover:text-white disabled:opacity-40"
                    >
                      {addingProductId === product.id ? (
                        <><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Adding</>
                      ) : (
                        <><ShoppingCart className="h-3.5 w-3.5" /> {product.stock <= 0 ? 'Sold out' : 'Add'}</>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
