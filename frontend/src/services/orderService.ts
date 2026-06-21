import type { Order, OrderStatus } from '@/types/order'
import { api } from './api'

export const orderService = {
  async getMyOrders() {
    const { data } = await api.get<Order[]>('/orders')
    return data
  },
  async getAllOrders() {
    const { data } = await api.get<Order[]>('/orders/admin/all')
    return data
  },
  async checkout(payload: {
    shippingAddressId: string
    billingAddressId?: string
    couponCode?: string
    paymentMethod?: 'CashOnDelivery'
    idempotencyKey: string
  }) {
    const { data } = await api.post<Order>('/orders', payload)
    return data
  },
  async guestCheckout(payload: {
    guestEmail: string
    shippingAddress: {
      label: string
      recipientName: string
      line1: string
      line2?: string
      city: string
      stateOrProvince: string
      postalCode: string
      country: string
      phoneNumber: string
    }
    billingAddress?: {
      label: string
      recipientName: string
      line1: string
      line2?: string
      city: string
      stateOrProvince: string
      postalCode: string
      country: string
      phoneNumber: string
    }
    useShippingAsBilling: boolean
    items: Array<{ productId: string; quantity: number }>
    couponCode?: string
    paymentMethod?: 'CashOnDelivery'
    idempotencyKey: string
  }) {
    const { data } = await api.post<Order>('/orders/guest', payload)
    return data
  },
  async updateStatus(payload: {
    id: string
    status: OrderStatus
    concurrencyStamp: string
  }) {
    const { data } = await api.patch<Order>(`/orders/${payload.id}/status`, {
      status: payload.status,
      concurrencyStamp: payload.concurrencyStamp,
    })
    return data
  },
}
