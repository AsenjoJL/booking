import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Order } from '@/types/order'
import { Badge } from '@/components/ui/badge'

type AdminPageIntroProps = {
  kicker: string
  title: string
  description: string
}

export function AdminPageIntro({ kicker, title, description }: AdminPageIntroProps) {
  return (
    <div className="rounded-[8px] bg-[#dde5ee] px-6 py-5">
      <h1 className="text-[2.1rem] font-semibold leading-none tracking-[-0.03em] text-[#4b5563]">{title}</h1>
      <p className="mt-2 text-[13px] font-normal text-[#94a3b8]">
        Home <span className="px-1.5">/</span> {kicker}
      </p>
      <p className="mt-3 max-w-3xl text-[0.98rem] font-normal leading-7 text-[#64748b]">{description}</p>
    </div>
  )
}

type OverviewMetricItem = {
  label: string
  value: string
  detail?: string
  icon: LucideIcon
}

type OverviewProductItem = {
  name: string
  units: number
  revenue: string
}

type OverviewRecentOrderItem = {
  id: string
  total: string
  status: string
  itemCount: number
}

type AdminOverviewSectionProps = {
  metrics: OverviewMetricItem[]
  monthlyRevenueChart: ReactNode
  salesByCategoryChart: ReactNode
  weeklyOrdersChart: ReactNode
  topProducts: OverviewProductItem[]
  recentOrders: OverviewRecentOrderItem[]
}

function getMetricTone(label: string) {
  switch (label) {
    case 'Total Revenue':
      return {
        detailText: 'text-[#20c4c8]',
        iconWrap: 'bg-[#ecfeff] text-[#20c4c8]',
        track: 'bg-[#eaf7f7]',
        bar: 'w-[78%] bg-[#20c4c8]',
      }
    case 'Today':
      return {
        detailText: 'text-[#2563eb]',
        iconWrap: 'bg-[#eff6ff] text-[#2563eb]',
        track: 'bg-[#dbeafe]',
        bar: 'w-[52%] bg-[#2563eb]',
      }
    case 'This Week':
      return {
        detailText: 'text-[#7c3aed]',
        iconWrap: 'bg-[#f5f3ff] text-[#7c3aed]',
        track: 'bg-[#ede9fe]',
        bar: 'w-[64%] bg-[#7c3aed]',
      }
    case 'This Month':
      return {
        detailText: 'text-[#0f766e]',
        iconWrap: 'bg-[#ecfeff] text-[#0f766e]',
        track: 'bg-[#ccfbf1]',
        bar: 'w-[72%] bg-[#14b8a6]',
      }
    case 'This Year':
      return {
        detailText: 'text-[#ea580c]',
        iconWrap: 'bg-[#fff7ed] text-[#ea580c]',
        track: 'bg-[#ffedd5]',
        bar: 'w-[82%] bg-[#f97316]',
      }
    case 'Inventory Value':
      return {
        detailText: 'text-[#2563eb]',
        iconWrap: 'bg-[#eff6ff] text-[#2563eb]',
        track: 'bg-[#dbeafe]',
        bar: 'w-[68%] bg-[#3b82f6]',
      }
    case 'Gross Profit':
      return {
        detailText: 'text-[#16a34a]',
        iconWrap: 'bg-[#f0fdf4] text-[#16a34a]',
        track: 'bg-[#dcfce7]',
        bar: 'w-[74%] bg-[#22c55e]',
      }
    case 'Margin %':
      return {
        detailText: 'text-[#7c3aed]',
        iconWrap: 'bg-[#f5f3ff] text-[#7c3aed]',
        track: 'bg-[#ede9fe]',
        bar: 'w-[58%] bg-[#8b5cf6]',
      }
    case 'Low Margin':
      return {
        detailText: 'text-[#dc2626]',
        iconWrap: 'bg-[#fef2f2] text-[#dc2626]',
        track: 'bg-[#fee2e2]',
        bar: 'w-[36%] bg-[#ef4444]',
      }
    case 'COGS':
      return {
        detailText: 'text-[#475569]',
        iconWrap: 'bg-[#f8fafc] text-[#475569]',
        track: 'bg-[#e2e8f0]',
        bar: 'w-[62%] bg-[#64748b]',
      }
    case 'Total Orders':
      return {
        detailText: 'text-[#20c4c8]',
        iconWrap: 'bg-[#ecfeff] text-[#20c4c8]',
        track: 'bg-[#eaf7f7]',
        bar: 'w-[65%] bg-[#20c4c8]',
      }
    case 'Open Orders':
      return {
        detailText: 'text-[#f59e0b]',
        iconWrap: 'bg-[#fffbeb] text-[#f59e0b]',
        track: 'bg-[#fef3c7]',
        bar: 'w-[42%] bg-[#f59e0b]',
      }
    default:
      return {
        detailText: 'text-[#94a3b8]',
        iconWrap: 'bg-[#f8fafc] text-[#94a3b8]',
        track: 'bg-[#f1f5f9]',
        bar: 'w-[54%] bg-[#cbd5e1]',
      }
  }
}

export function AdminOverviewSection({
  metrics,
  monthlyRevenueChart,
  salesByCategoryChart,
  weeklyOrdersChart,
  topProducts,
  recentOrders,
}: AdminOverviewSectionProps) {
  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const tone = getMetricTone(metric.label)

          return (
            <div key={metric.label} className="rounded-[6px] border border-[#e1e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-[#94a3b8]">{metric.label}</p>
                  <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.03em] text-[#334155]">{metric.value}</p>
                  {metric.detail ? <p className={`mt-3 text-[13px] font-semibold ${tone.detailText}`}>{metric.detail}</p> : <div className="mt-3 h-4" />}
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.iconWrap}`}>
                  <metric.icon className="h-5 w-5" />
                </div>
              </div>
              <div className={`mt-4 h-1.5 w-full rounded-full ${tone.track}`}>
                <div className={`h-1.5 rounded-full ${tone.bar}`} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.9fr_1fr]">
        <div className="rounded-[6px] border border-[#e1e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-[#475569]">Revenue Trend</h2>
          <p className="mt-1 text-[13px] text-[#94a3b8]">Six-month sales performance</p>
          <div className="mt-4">{monthlyRevenueChart}</div>
        </div>

        <div className="rounded-[6px] border border-[#e1e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-[#475569]">Sales by Category</h2>
          <p className="mt-1 text-[13px] text-[#94a3b8]">Revenue mix across product groups</p>
          <div className="mt-4">{salesByCategoryChart}</div>
        </div>

        <div className="rounded-[6px] border border-[#e1e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-[#475569]">Weekly Orders</h2>
          <p className="mt-1 text-[13px] text-[#94a3b8]">Daily order count this week</p>
          <div className="mt-4">{weeklyOrdersChart}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[6px] border border-[#e1e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-[#475569]">Top Products</h2>
          <p className="mt-1 text-[13px] text-[#94a3b8]">Best-selling items by units sold</p>
          <div className="mt-6 space-y-5">
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data yet.</p>
            ) : (
              topProducts.map((product, index) => (
                <div key={product.name} className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ecfeff] text-sm font-medium text-[#14b8a6]">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#334155]">{product.name}</p>
                      <p className="text-[13px] text-[#94a3b8]">{product.units} sold</p>
                    </div>
                  </div>
                  <p className="text-[1.15rem] font-semibold text-[#334155]">{product.revenue}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[6px] border border-[#e1e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-[#475569]">Inbox</h2>
          <p className="mt-1 text-[13px] text-[#94a3b8]">Latest customer orders</p>
          <div className="mt-6 space-y-6">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-start justify-between gap-4 border-b border-[#eef2f7] pb-4 last:border-b-0">
                  <div>
                    <p className="text-[15px] font-semibold text-[#334155]">ORD-{order.id.slice(0, 4).toUpperCase()}</p>
                    <p className="text-[13px] text-[#94a3b8]">
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[1rem] font-semibold text-[#334155]">{order.total}</p>
                    <p className="text-[13px] text-[#20c4c8]">{order.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

type AdminOrdersSectionProps = {
  orders: Order[]
  statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'muted'>
  formatCurrency: (value: number) => string
  renderStatusEditor: (order: Order) => ReactNode
}

export function AdminOrdersSection({
  orders,
  statusVariant,
  formatCurrency,
  renderStatusEditor,
}: AdminOrdersSectionProps) {
  return (
    <div className="mt-8">
      <div className="rounded-[26px] border border-[#dbe4f0] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <h2 className="text-lg font-semibold text-[#0f172a]">Recent orders</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review recent orders and update status.</p>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : null}
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-[#e5ebf3] bg-[#fbfdff] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
                    <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{new Date(order.createdAtUtc).toLocaleString()}</p>
                </div>
                <p className="font-medium">{formatCurrency(order.total)}</p>
              </div>
              <div className="mt-3">{renderStatusEditor(order)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
