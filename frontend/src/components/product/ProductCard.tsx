import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProductImageClass, getProductImageSurfaceClass } from '@/lib/productImage'
import { useCartStore } from '@/store/cartStore'
import type { Product } from '@/types/product'
import { formatCurrency } from '@/utils/format'

type ProductCardProps = {
  product: Product
  index?: number
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)
  const cardRef = useRef<HTMLElement | null>(null)
  const stockMeta =
    product.stock <= 0 ? 'Sold out' : product.stock <= 10 ? 'Low stock' : `${product.stock} qty ready`
  const rotateXInput = useMotionValue(0)
  const rotateYInput = useMotionValue(0)
  const rotateX = useSpring(useTransform(rotateXInput, [-0.5, 0.5], [10, -10]), {
    stiffness: 180,
    damping: 18,
    mass: 0.7,
  })
  const rotateY = useSpring(useTransform(rotateYInput, [-0.5, 0.5], [-10, 10]), {
    stiffness: 180,
    damping: 18,
    mass: 0.7,
  })

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-80px' }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.012, y: -4 }}
      style={{ rotateX, rotateY, transformPerspective: 1200, transformStyle: 'preserve-3d' }}
      onMouseMove={(event) => {
        const bounds = cardRef.current?.getBoundingClientRect()
        if (!bounds) {
          return
        }

        rotateYInput.set((event.clientX - bounds.left) / bounds.width - 0.5)
        rotateXInput.set((event.clientY - bounds.top) / bounds.height - 0.5)
      }}
      onMouseLeave={() => {
        rotateXInput.set(0)
        rotateYInput.set(0)
      }}
      className="group overflow-hidden rounded-[28px] border border-[#eadfd3] bg-white shadow-[0_18px_44px_rgba(56,34,21,0.06)] transition-shadow duration-300 hover:shadow-[0_26px_54px_rgba(56,34,21,0.1)]"
      ref={cardRef}
    >
      <Link to={`/products/${product.slug}`} className="block">
        <div className={`relative aspect-square overflow-hidden ${getProductImageSurfaceClass(product)}`}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            sizes="(min-width: 1280px) 22vw, (min-width: 640px) 44vw, 92vw"
            className={`h-full w-full transition-transform duration-700 group-hover:scale-[1.045] ${getProductImageClass(product, 'catalog')}`}
          />
          <div className="absolute right-4 top-4 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-[#1f1716] shadow-[0_12px_22px_rgba(31,23,22,0.15)] backdrop-blur">
              <Heart className="h-4 w-4" />
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-6 pb-6 text-white">
            <span className="rounded-full bg-black/28 px-3 py-2 text-[0.62rem] font-medium uppercase tracking-[0.18em] backdrop-blur-sm">
              {product.category}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-black/28 px-3 py-2 text-[0.68rem] font-medium backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-[#d36d3d] text-[#d36d3d]" />
              {product.rating}
            </span>
          </div>
        </div>
      </Link>
      <div className="flex min-h-[148px] flex-col gap-2.5 p-7">
        <div>
          <p className="text-[0.78rem] font-medium uppercase tracking-[0.18em] text-[#8b6e5d]">
            {stockMeta}
          </p>
          <Link
            to={`/products/${product.slug}`}
            className="mt-3 block font-serif text-[1.85rem] leading-[1.08] text-foreground transition hover:text-[#d36d3d]"
          >
            {product.name}
          </Link>
        </div>
        {product.description?.trim() ? (
          <p className="line-clamp-2 text-sm leading-7 text-[#5f5247]">{product.description}</p>
        ) : null}
        <div className="mt-1.5 flex flex-col gap-3 border-t border-[#ece1d6] pt-4">
          <div className="min-w-0">
            <p className="text-sm text-[#7a6c60]">Everyday price</p>
            <span className="mt-2 block text-[1.45rem] font-semibold text-foreground">{formatCurrency(product.price)}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={product.stock <= 0}
            className="h-11 w-full justify-center rounded-full border border-[#d9cabd] px-5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-foreground hover:bg-[#1f1716] hover:text-white"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void addItem(product)
            }}
          >
            <ShoppingCart className="h-4 w-4" />
            {product.stock <= 0 ? 'Sold out' : 'Add to cart'}
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
