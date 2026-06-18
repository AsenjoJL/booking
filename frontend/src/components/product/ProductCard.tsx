import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ShoppingCart, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const imageFit = product.imageFit ?? 'cover'
  const imageSurfaceClassName = product.imageSurfaceClassName ?? 'bg-[#f6f1ea]'
  const imagePositionClassName = product.imagePositionClassName ?? 'object-center'
  const accentMeta =
    product.stock <= 0
      ? 'Sold out'
      : product.stock <= 10
        ? 'Low stock'
        : product.images && product.images.length > 1
          ? `${product.images.length} views`
          : 'Ready to wear'
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
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.015 }}
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
      className="overflow-hidden rounded-sm border border-border/80 bg-card shadow-soft"
      ref={cardRef}
    >
      <Link to={`/products/${product.slug}`} className="block">
        <div className={`relative aspect-[4/4.8] overflow-hidden ${imageSurfaceClassName}`}>
          <img
            src={product.image}
            alt={product.name}
            className={`h-full w-full transition-transform duration-500 hover:scale-105 ${
              imageFit === 'contain'
                ? `object-contain px-4 pb-0 pt-5 ${imagePositionClassName}`
                : `object-cover ${imagePositionClassName}`
            }`}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-4 pb-4 text-white">
            <span className="bg-black/28 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.24em] backdrop-blur-sm">
              {product.category}
            </span>
            <span className="flex items-center gap-1 bg-black/28 px-3 py-2 text-[0.7rem] font-medium backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-[#d36d3d] text-[#d36d3d]" />
              {product.rating}
            </span>
          </div>
        </div>
      </Link>
      <div className="space-y-5 p-5">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">
            {accentMeta}
          </p>
          <Link to={`/products/${product.slug}`} className="mt-3 block font-serif text-[2rem] leading-tight text-foreground transition hover:text-[#d36d3d]">
            {product.name}
          </Link>
        </div>
        <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
          {product.description}
        </p>
        <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-4">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">Price</p>
            <span className="mt-2 block text-xl font-semibold text-foreground">{formatCurrency(product.price)}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={product.stock <= 0}
            className="h-11 rounded-none border border-foreground/12 px-5 text-xs font-semibold uppercase tracking-[0.22em] text-foreground hover:bg-black hover:text-white"
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
