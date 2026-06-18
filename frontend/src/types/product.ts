export type Product = {
  id: string
  name: string
  slug: string
  description: string
  category: string
  price: number
  salePrice?: number | null
  stock: number
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
