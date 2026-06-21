import type { LucideIcon } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminOverviewSection } from '@/components/admin/AdminSections'
import { formatCurrency } from '@/utils/format'

type OverviewMetricItem = {
  label: string
  value: string
  detail?: string
  icon: LucideIcon
}

type OverviewData = {
  metrics: OverviewMetricItem[]
  monthlyValues: number[]
  monthlyLabels: string[]
  categorySegments: Array<{ label: string; value: number; color: string }>
  weeklyOrders: number[]
  topProducts: Array<{ name: string; units: number; revenue: number }>
  recentOrders: Array<{ id: string; total: number; status: string; items: Array<unknown> }>
}

function RevenueTrendChart({ values }: { values: number[] }) {
  const data = values.map((value, index) => ({
    label: `M${index + 1}`,
    value,
  }))

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 6, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#20c4c8" stopOpacity={0.28} />
              <stop offset="70%" stopColor="#20c4c8" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#20c4c8" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <Tooltip
            cursor={false}
            contentStyle={{
              borderRadius: 16,
              border: '1px solid #dbe4f0',
              boxShadow: '0 12px 30px rgba(15,23,42,0.1)',
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#20c4c8"
            strokeWidth={3.25}
            fill="url(#adminRevenueFill)"
            activeDot={{ r: 4.5, fill: '#20c4c8', stroke: '#ffffff', strokeWidth: 2 }}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function CategoryDonutChart({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="h-[240px] w-full max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              stroke="none"
            >
              {segments.map((segment) => (
                <Cell key={segment.label} fill={segment.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                border: '1px solid #dbe4f0',
                boxShadow: '0 12px 30px rgba(15,23,42,0.1)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeeklyOrdersChart({ values }: { values: number[] }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const data = values.map((value, index) => ({
    day: days[index],
    value,
  }))

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 0, left: -16, bottom: 0 }} barCategoryGap={18}>
          <XAxis axisLine={false} tickLine={false} dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={34} />
          <Tooltip
            cursor={{ fill: 'rgba(37,99,235,0.06)' }}
            contentStyle={{
              borderRadius: 16,
              border: '1px solid #dbe4f0',
              boxShadow: '0 12px 30px rgba(15,23,42,0.1)',
            }}
          />
          <Bar dataKey="value" fill="#2563eb" radius={[12, 12, 12, 12]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AdminOverviewPanel({ overview }: { overview: OverviewData }) {
  return (
    <AdminOverviewSection
      metrics={overview.metrics}
      monthlyRevenueChart={
        <>
          <RevenueTrendChart values={overview.monthlyValues} />
          <div className="mt-1 grid grid-cols-6 text-center text-sm text-muted-foreground">
            {overview.monthlyLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </>
      }
      salesByCategoryChart={<CategoryDonutChart segments={overview.categorySegments} />}
      weeklyOrdersChart={<WeeklyOrdersChart values={overview.weeklyOrders} />}
      topProducts={overview.topProducts.map((product) => ({
        name: product.name,
        units: product.units,
        revenue: formatCurrency(product.revenue),
      }))}
      recentOrders={overview.recentOrders.map((order) => ({
        id: order.id,
        total: formatCurrency(order.total),
        status: order.status,
        itemCount: order.items.length,
      }))}
    />
  )
}
