export type CartLine = {
  id: string
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  availableStock: number
  imageUrl?: string
  imageFit?: 'cover' | 'contain'
  imageSurfaceClassName?: string
  imagePositionClassName?: string
  concurrencyStamp?: string
}

export type CartResponse = {
  items: CartLine[]
  subtotal: number
}
