import type { Product } from '@/types/product'
import { api } from './api'

type ProductSummaryResponse = {
  id: string
  name: string
  slug: string
  category: string
  price: number
  salePrice?: number | null
  stockQuantity: number
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
  price: number
  salePrice?: number | null
  stockQuantity: number
  isActive: boolean
  imageUrl?: string
  concurrencyStamp: string
}

export type UpsertProductPayload = {
  name: string
  slug: string
  description: string
  price: number
  salePrice?: number | null
  stockQuantity: number
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

type ProductListResponse = {
  items: ProductSummaryResponse[]
  page: number
  pageSize: number
  totalCount: number
}

const serverProductIdBySlug = new Map<string, string>()

function rememberProductIdentity(productId: string, slug: string) {
  serverProductIdBySlug.set(slug, productId)
}

function mapProduct(product: ProductSummaryResponse | ProductDetailResponse): Product {
  rememberProductIdentity(product.id, product.slug)

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: 'description' in product ? product.description : '',
    category: product.category,
    price: product.salePrice ?? product.price,
    salePrice: product.salePrice,
    stock: product.stockQuantity,
    isActive: product.isActive,
    image: product.imageUrl ?? '',
    images:
      'images' in product
        ? product.images
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((image) => image.imageUrl)
        : product.imageUrl
          ? [product.imageUrl]
          : undefined,
    concurrencyStamp: 'concurrencyStamp' in product ? product.concurrencyStamp : undefined,
    rating: 4.8,
    tags: [],
  }
}

export const productService = {
  async getProducts(params?: { search?: string; category?: string }) {
    const { data } = await api.get<ProductListResponse>('/products', { params })
    return data.items.map(mapProduct)
  },
  async getAdminProducts(params?: { search?: string; category?: string }) {
    const { data } = await api.get<ProductListResponse>('/products/admin', { params })
    return data.items.map(mapProduct)
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
}
