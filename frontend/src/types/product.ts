export type Product = {
  id: string
  productVariantId?: string
  name: string
  slug: string
  description: string
  category: string
  brand?: string
  status?: string
  sku?: string
  color?: string
  size?: string
  price: number
  salePrice?: number | null
  stock: number
  quantityOnHand?: number
  quantityReserved?: number
  quantityAvailable?: number
  lowStockThreshold?: number
  isActive?: boolean
  image: string
  images?: string[]
  concurrencyStamp?: string
  rating: number
  tags: string[]
  imageFit?: 'cover' | 'contain'
  imageSurfaceClassName?: string
  imagePositionClassName?: string
}
