import type { CartResponse } from '@/types/cart'
import { api } from './api'

export const cartService = {
  async getCart() {
    const { data } = await api.get<CartResponse>('/cart')
    return data
  },
  async addItem(productId: string, quantity = 1, idempotencyKey?: string) {
    const { data } = await api.post<CartResponse>('/cart/items', { productId, quantity, idempotencyKey })
    return data
  },
  async mergeItems(items: Array<{ productId: string; quantity: number }>, idempotencyKey?: string) {
    const { data } = await api.post<CartResponse>('/cart/merge', { items, idempotencyKey })
    return data
  },
  async updateItem(id: string, quantity: number, concurrencyStamp?: string) {
    const { data } = await api.put<CartResponse>(`/cart/items/${id}`, {
      quantity,
      concurrencyStamp,
    })
    return data
  },
  async removeItem(id: string) {
    const { data } = await api.delete<CartResponse>(`/cart/items/${id}`)
    return data
  },
  async clear() {
    const { data } = await api.delete<CartResponse>('/cart')
    return data
  },
}
