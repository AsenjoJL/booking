export type OrderItem = {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type OrderAddressSnapshot = {
  label: string
  recipientName: string
  line1: string
  line2?: string | null
  city: string
  stateOrProvince: string
  postalCode: string
  country: string
  phoneNumber: string
}

export type OrderStatus =
  | 'Pending'
  | 'PendingPayment'
  | 'Confirmed'
  | 'Processing'
  | 'Paid'
  | 'Shipped'
  | 'OutForDelivery'
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
  userId?: string | null
  shippingAddressId?: string | null
  billingAddressId?: string | null
  guestEmail?: string | null
  guestRecipientName?: string | null
  shippingAddressSnapshot?: OrderAddressSnapshot | null
  billingAddressSnapshot?: OrderAddressSnapshot | null
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

export interface OrderNotificationLog {
  id: string
  orderId: string
  phoneNumber: string
  message: string
  status: string
  sentAtUtc: string
  errorMessage?: string
}
