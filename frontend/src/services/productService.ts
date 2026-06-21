import type { Product } from '@/types/product'
import clothingImage from '@/assets/clothing.avif'
import fashion4Asset from '@/assets/fashion4.png'
import image4Asset from '@/assets/image4.png'
import imagesAsset from '@/assets/images.png'
import jacketsImage from '@/assets/jackets.png'
import { api } from './api'

type ProductSummaryResponse = {
  id: string
  productVariantId?: string | null
  name: string
  slug: string
  category: string
  brand?: string | null
  status?: string | null
  sku?: string | null
  color?: string | null
  size?: string | null
  price: number
  salePrice?: number | null
  stockQuantity: number
  quantityOnHand?: number
  quantityReserved?: number
  quantityAvailable?: number
  lowStockThreshold?: number
  isActive: boolean
  imageUrl?: string
}

type ProductDetailResponse = ProductSummaryResponse & {
  categoryId: string
  description: string
  images: Array<{
    id: string
    imageUrl: string
    isPrimary: boolean
    sortOrder: number
  }>
  concurrencyStamp: string
}

export type AdminProduct = {
  id: string
  name: string
  slug: string
  description: string
  category: string
  categoryId: string
  brand?: string
  status?: string
  sku?: string
  price: number
  salePrice?: number | null
  stockQuantity: number
  quantityOnHand?: number
  quantityReserved?: number
  quantityAvailable?: number
  lowStockThreshold?: number
  isActive: boolean
  imageUrl?: string
  concurrencyStamp: string
}

export type UpsertProductPayload = {
  name: string
  slug: string
  description: string
  brand?: string
  status?: string
  sku?: string
  color?: string
  size?: string
  price: number
  salePrice?: number | null
  stockQuantity: number
  lowStockThreshold?: number
  isActive: boolean
  categoryId: string
  imageUrl?: string
  images?: Array<{
    imageUrl: string
    isPrimary: boolean
    sortOrder: number
  }>
  concurrencyStamp?: string
}

type UploadProductImageResponse = {
  imageUrl: string
}

export type InventorySnapshot = {
  productId: string
  productVariantId: string
  productName: string
  category: string
  sku: string
  color?: string | null
  size?: string | null
  warehouseCode: string
  piecesOnHand: number
  piecesReserved: number
  piecesAvailable: number
  lowStockThreshold: number
  isLowStock: boolean
  updatedAtUtc: string
}

export type InventoryMovement = {
  id: string
  productVariantId: string
  sku: string
  warehouseCode: string
  movementType: string
  piecesDelta: number
  piecesOnHandAfter: number
  piecesReservedAfter: number
  referenceType?: string | null
  referenceId?: string | null
  note?: string | null
  createdAtUtc: string
}

type ProductListResponse = {
  items: ProductSummaryResponse[]
  page: number
  pageSize: number
  totalCount: number
}

export type ProductCatalogPage = {
  items: Product[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

const serverProductIdBySlug = new Map<string, string>()
const localProductMediaBySlug: Record<
  string,
  {
    image: string
    imageFit?: Product['imageFit']
    imageSurfaceClassName?: Product['imageSurfaceClassName']
    imagePositionClassName?: Product['imagePositionClassName']
    preferLocal?: boolean
  }
> = {
  'classic-cotton-t-shirt': {
    image: clothingImage,
    imageFit: 'contain',
  },
  'trail-daypack-18l': {
    image: fashion4Asset,
    imageFit: 'contain',
    preferLocal: true,
  },
  'modular-desk-lamp': {
    image: image4Asset,
    imageFit: 'contain',
  },
  'ceramic-pour-over-set': {
    image: imagesAsset,
    imageFit: 'contain',
  },
  'linen-utility-jacket': {
    image: jacketsImage,
    imageFit: 'contain',
  },
}

function isUnsplashImage(imageUrl?: string) {
  return Boolean(imageUrl && /images\.unsplash\.com/i.test(imageUrl))
}

function optimizeImageUrl(imageUrl?: string) {
  if (!imageUrl) {
    return imageUrl
  }

  try
  {
    const url = new URL(imageUrl)

    if (/images\.unsplash\.com/i.test(url.hostname)) {
      url.searchParams.set('auto', 'format,compress')
      url.searchParams.set('fit', 'max')
      url.searchParams.set('w', '960')
      url.searchParams.set('q', '72')
      return url.toString()
    }

    if (/res\.cloudinary\.com/i.test(url.hostname)) {
      return imageUrl.replace('/upload/', '/upload/f_auto,q_auto,w_960,c_limit/')
    }

    if (/ik\.imagekit\.io/i.test(url.hostname) || /cdn\.shopify\.com/i.test(url.hostname)) {
      url.searchParams.set('tr', 'w-960,q-72')
      return url.toString()
    }

    return imageUrl
  }
  catch
  {
    return imageUrl
  }
}

function resolveProductMedia(slug: string, imageUrl?: string) {
  const localMedia = localProductMediaBySlug[slug]
  const optimizedImageUrl = optimizeImageUrl(imageUrl)

  if (optimizedImageUrl && !isUnsplashImage(optimizedImageUrl) && !localMedia?.preferLocal) {
    return {
      image: optimizedImageUrl,
      imageFit: localMedia?.imageFit,
      imageSurfaceClassName: localMedia?.imageSurfaceClassName,
      imagePositionClassName: localMedia?.imagePositionClassName,
    }
  }

  return {
    image: localMedia?.image ?? optimizedImageUrl ?? '',
    imageFit: localMedia?.imageFit,
    imageSurfaceClassName: localMedia?.imageSurfaceClassName,
    imagePositionClassName: localMedia?.imagePositionClassName,
  }
}

function rememberProductIdentity(productId: string, slug: string) {
  serverProductIdBySlug.set(slug, productId)
}

function mapProduct(product: ProductSummaryResponse | ProductDetailResponse): Product {
  rememberProductIdentity(product.id, product.slug)
  const media = resolveProductMedia(product.slug, product.imageUrl)
  const resolvedImages =
    'images' in product
      ? product.images
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((image) => resolveProductMedia(product.slug, image.imageUrl).image)
      : product.imageUrl
        ? [resolveProductMedia(product.slug, product.imageUrl).image]
        : media.image
          ? [media.image]
          : undefined

  return {
    id: product.id,
    productVariantId: product.productVariantId ?? undefined,
    name: product.name,
    slug: product.slug,
    description: 'description' in product ? product.description : '',
    category: product.category,
    brand: product.brand ?? undefined,
    status: product.status ?? undefined,
    sku: product.sku ?? undefined,
    color: product.color ?? undefined,
    size: product.size ?? undefined,
    price: product.salePrice ?? product.price,
    salePrice: product.salePrice,
    stock: product.stockQuantity,
    quantityOnHand: product.quantityOnHand,
    quantityReserved: product.quantityReserved,
    quantityAvailable: product.quantityAvailable,
    lowStockThreshold: product.lowStockThreshold,
    isActive: product.isActive,
    image: media.image,
    images: resolvedImages,
    concurrencyStamp: 'concurrencyStamp' in product ? product.concurrencyStamp : undefined,
    rating: 4.8,
    tags: [],
    imageFit: media.imageFit,
    imageSurfaceClassName: media.imageSurfaceClassName,
    imagePositionClassName: media.imagePositionClassName,
  }
}

export const productService = {
  async getProductCatalog(params?: { search?: string; category?: string; page?: number; pageSize?: number }) {
    const { data } = await api.get<ProductListResponse>('/products', { params })
    return {
      items: data.items.map(mapProduct),
      page: data.page,
      pageSize: data.pageSize,
      totalCount: data.totalCount,
      totalPages: Math.max(1, Math.ceil(data.totalCount / data.pageSize)),
    } satisfies ProductCatalogPage
  },
  async getProducts(params?: { search?: string; category?: string; page?: number; pageSize?: number }) {
    const data = await this.getProductCatalog(params)
    return data.items
  },
  async getAdminProducts(params?: { search?: string; category?: string; brand?: string; page?: number; pageSize?: number }) {
    const { data } = await api.get<ProductListResponse>('/products/admin', { params })
    return data.items.map(mapProduct)
  },
  async getAdminProductCatalog(params?: { search?: string; category?: string; brand?: string; stockState?: string; page?: number; pageSize?: number }) {
    const { data } = await api.get<ProductListResponse>('/products/admin', { params })
    return {
      items: data.items.map(mapProduct),
      page: data.page,
      pageSize: data.pageSize,
      totalCount: data.totalCount,
      totalPages: Math.max(1, Math.ceil(data.totalCount / data.pageSize)),
    } satisfies ProductCatalogPage
  },
  async getProductBySlug(slug: string) {
    const { data } = await api.get<ProductDetailResponse>(`/products/${slug}`)
    return mapProduct(data)
  },
  async resolveServerProductId(productIdOrSlug: string) {
    const cachedServerId = serverProductIdBySlug.get(productIdOrSlug)
    if (cachedServerId) {
      return cachedServerId
    }
    return productIdOrSlug
  },
  async getAdminProductBySlug(slug: string) {
    const { data } = await api.get<ProductDetailResponse>(`/products/admin/${slug}`)
    return data satisfies ProductDetailResponse
  },
  async createProduct(payload: UpsertProductPayload) {
    const { data } = await api.post<ProductDetailResponse>('/products', payload)
    return data
  },
  async uploadProductImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await api.post<UploadProductImageResponse>('/products/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return data.imageUrl
  },
  async updateProduct(id: string, payload: UpsertProductPayload) {
    const { data } = await api.put<ProductDetailResponse>(`/products/${id}`, payload)
    return data
  },
  async deleteProduct(id: string) {
    await api.delete(`/products/${id}`)
  },
  async bulkUpdateStock(
    items: Array<{ productId: string; stockQuantity: number; concurrencyStamp?: string }>,
  ) {
    const { data } = await api.post<ProductDetailResponse[]>('/products/bulk-stock', { items })
    return data
  },
  async bulkUpdateVisibility(
    items: Array<{ productId: string; isActive: boolean; concurrencyStamp?: string }>,
  ) {
    const { data } = await api.post<ProductDetailResponse[]>('/products/bulk-visibility', { items })
    return data
  },
  async getInventory(productId: string) {
    const { data } = await api.get<InventorySnapshot>(`/products/${productId}/inventory`)
    return data
  },
  async getInventoryHistory(productId: string) {
    const { data } = await api.get<InventoryMovement[]>(`/products/${productId}/inventory/history`)
    return data
  },
  async adjustInventory(productId: string, piecesOnHand: number, piecesReserved = 0, note?: string) {
    const { data } = await api.post<InventorySnapshot>(`/products/${productId}/inventory/adjust`, {
      piecesOnHand,
      piecesReserved,
      note,
    })
    return data
  },
}
