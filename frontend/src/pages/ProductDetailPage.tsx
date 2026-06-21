import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { PackageCheck, ShieldCheck, ShoppingCart, Star, Truck } from 'lucide-react'
import backIcon from '@/assets/backicon.png'
import { Button } from '@/components/ui/button'
import ProductGrid from '@/components/product/ProductGrid'
import { getProductImageClass, getProductImageSurfaceClass } from '@/lib/productImage'
import { productService } from '@/services/productService'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/utils/format'

export default function ProductDetailPage() {
  const { slug } = useParams()
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productService.getProductBySlug(slug ?? ''),
    enabled: Boolean(slug),
  })
  const { data: products = [] } = useQuery({
    queryKey: ['related-products', slug],
    queryFn: () => productService.getProducts(),
    enabled: Boolean(slug),
  })

  const addItem = useCartStore((state) => state.addItem)
  const galleryImages = useMemo(() => {
    if (!product) {
      return []
    }

    if (product.images && product.images.length > 0) {
      return product.images
    }

    return [product.image]
  }, [product])

  const [selectedImage, setSelectedImage] = useState<{ slug: string; image: string } | null>(null)
  const activeImage =
    selectedImage && selectedImage.slug === slug && galleryImages.includes(selectedImage.image)
      ? selectedImage.image
      : galleryImages[0] ?? product?.image ?? ''

  const relatedProducts = useMemo(() => {
    if (!product) {
      return []
    }

    return products
      .filter(
        (item) =>
          item.slug !== product.slug &&
          (item.category === product.category || item.tags.some((tag) => product.tags.includes(tag))),
      )
      .slice(0, 3)
  }, [product, products])

  if (isLoading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Loading product</p>
      </section>
    )
  }

  if (!product) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-serif text-5xl text-foreground">Product not found</h1>
        <Button asChild className="mt-8 rounded-none bg-[#cf6c3e] uppercase tracking-[0.2em] hover:bg-[#ba5d33]">
          <Link to="/products">Back to shop</Link>
        </Button>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-t pt-10">
        <Button asChild variant="ghost" className="h-auto rounded-none px-0 text-sm uppercase tracking-[0.22em] text-muted-foreground hover:bg-transparent hover:text-foreground">
          <Link to="/products">
            <img src={backIcon} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
            Back to shop
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4">
          <div className={`overflow-hidden rounded-sm ${getProductImageSurfaceClass(product)}`}>
            <img
              src={activeImage}
              alt={product.name}
              loading="eager"
              decoding="async"
              className={`aspect-square w-full ${getProductImageClass(product, 'detail')}`}
            />
          </div>

          {galleryImages.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {galleryImages.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage({ slug: slug ?? '', image })}
                  className={`overflow-hidden rounded-sm border ${
                    activeImage === image ? 'border-[#d36d3d]' : 'border-border/80'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} view`}
                    loading="lazy"
                    decoding="async"
                    className={`aspect-square h-full w-full ${getProductImageClass(product, 'thumbnail')}`}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col justify-start">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">{product.category}</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-none text-foreground sm:text-6xl">
            {product.name}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-[#d36d3d] text-[#d36d3d]" />
              {product.rating} rating
            </span>
            <span>{product.images?.length ?? 1} gallery views</span>
            <span>{product.stock > 0 ? `${product.stock} in stock` : 'Currently unavailable'}</span>
          </div>
          <p className="mt-8 max-w-2xl text-[1.08rem] leading-9 text-foreground/76">
            {product.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="border border-border/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-10 grid gap-6 border-t border-border/80 pt-8 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Price</p>
              <p className="mt-3 text-4xl font-semibold text-foreground">{formatCurrency(product.price)}</p>
            </div>
            <Button
              size="lg"
              className="h-14 rounded-none bg-[#cf6c3e] px-8 text-sm uppercase tracking-[0.22em] hover:bg-[#ba5d33]"
              disabled={product.stock <= 0}
              onClick={() => void addItem(product)}
            >
              <ShoppingCart className="h-5 w-5" />
              {product.stock <= 0 ? 'Unavailable' : 'Add to cart'}
            </Button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="border bg-card p-5">
              <Truck className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-4 font-serif text-2xl text-foreground">Fast dispatch</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Address-ready checkout keeps this piece moving cleanly into purchase.
              </p>
            </div>
            <div className="border bg-card p-5">
              <ShieldCheck className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-4 font-serif text-2xl text-foreground">Stock-safe</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Quantities are rechecked against live stock before checkout completes.
              </p>
            </div>
            <div className="border bg-card p-5">
              <PackageCheck className="h-5 w-5 text-[#d36d3d]" />
              <p className="mt-4 font-serif text-2xl text-foreground">Matched set</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Related picks and gallery views all stay inside the same collection story.
              </p>
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <div className="mt-16 border-t pt-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Related picks</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-foreground">Keep the collection in view</h2>
            </div>
            <Button asChild variant="ghost" className="rounded-none uppercase tracking-[0.2em]">
              <Link to="/products">See full catalog</Link>
            </Button>
          </div>
          <ProductGrid products={relatedProducts} />
        </div>
      ) : null}
    </section>
  )
}
