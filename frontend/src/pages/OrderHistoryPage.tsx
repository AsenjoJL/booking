import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { orderService } from '@/services/orderService'
import type { OrderStatus } from '@/types/order'
import { formatCurrency } from '@/utils/format'

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'muted'> = {
  Pending: 'muted',
  PendingPayment: 'muted',
  Confirmed: 'secondary',
  Processing: 'secondary',
  Paid: 'default',
  Shipped: 'secondary',
  OutForDelivery: 'secondary',
  Delivered: 'outline',
  Cancelled: 'outline',
  Expired: 'outline',
  Refunded: 'outline',
}

export default function OrderHistoryPage() {
  const location = useLocation()
  const createdOrderId =
    typeof location.state === 'object' &&
    location.state &&
    'createdOrderId' in location.state
      ? String((location.state as { createdOrderId?: string }).createdOrderId ?? '')
      : ''

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getMyOrders(),
  })

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-t pt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d36d3d]">Orders</p>
        <h1 className="mt-4 font-serif text-5xl leading-none text-foreground sm:text-6xl">
          Order History
        </h1>
        <p className="mt-6 max-w-2xl text-[1.08rem] leading-9 text-foreground/76">
          Track recent checkouts, totals, and order progress in a cleaner customer history view.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {orders.length === 0 ? (
          <div className="border bg-card p-8">
            <p className="font-serif text-3xl text-foreground">No orders yet.</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Once you place an order, it will appear here with status and line-item detail.
            </p>
          </div>
        ) : (
          orders.map((order, index) => (
            <motion.article
              key={order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: index * 0.04 }}
              className={`border bg-card p-6 sm:p-8 ${
                createdOrderId === order.id ? 'border-[#d36d3d] ring-2 ring-[#d36d3d]/15' : ''
              }`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-serif text-3xl text-foreground">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </h2>
                    <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                    <Badge variant={order.paymentStatus === 'Collected' ? 'default' : 'outline'}>
                      {order.paymentMethod === 'CashOnDelivery' ? 'COD' : order.paymentMethod} · {order.paymentStatus}
                    </Badge>
                    {createdOrderId === order.id ? <Badge variant="default">Just placed</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {new Date(order.createdAtUtc).toLocaleString()}
                  </p>
                  {order.expiresAtUtc ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Expires {new Date(order.expiresAtUtc).toLocaleString()}
                    </p>
                  ) : null}
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">Order total</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(order.total)}</p>
                </div>
              </div>

              <div className="mt-8 overflow-hidden border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Qty</th>
                      <th className="px-4 py-3 font-medium">Unit</th>
                      <th className="px-4 py-3 text-right font-medium">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={`${order.id}-${item.productId}`} className="border-t">
                        <td className="px-4 py-4 font-medium text-foreground">{item.productName}</td>
                        <td className="px-4 py-4 text-muted-foreground">{item.quantity}</td>
                        <td className="px-4 py-4 text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-4 text-right font-medium text-foreground">
                          {formatCurrency(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-8 text-sm">
                <div>
                  <span className="text-muted-foreground">Subtotal </span>
                  <span className="font-medium text-foreground">{formatCurrency(order.subtotal)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Discount </span>
                  <span className="font-medium text-foreground">{formatCurrency(order.discount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Shipping </span>
                  <span className="font-medium text-foreground">{formatCurrency(order.shippingFee)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tax </span>
                  <span className="font-medium text-foreground">{formatCurrency(order.tax)}</span>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </div>
    </section>
  )
}
