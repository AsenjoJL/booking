export type OrderItem = {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type OrderStatus =
  | 'Pending'
  | 'PendingPayment'
  | 'Confirmed'
  | 'Processing'
  | 'Paid'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Expired'
  | 'Refunded'

export type PaymentMethod = 'CashOnDelivery'

export type PaymentStatus = 'Pending' | 'Collected' | 'Cancelled' | 'Refunded'

export type Order = {
  id: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  shippingAddressId: string
  billingAddressId?: string | null
  subtotal: number
  discount: number
  shippingFee: number
  tax: number
  total: number
  couponCode?: string | null
  createdAtUtc: string
  expiresAtUtc?: string | null
  concurrencyStamp: string
  items: OrderItem[]
}
