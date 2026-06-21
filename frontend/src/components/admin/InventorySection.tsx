import { useMemo } from 'react'
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  PackagePlus,
  Search,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Product } from '@/types/product'
import { formatCurrency } from '@/utils/format'

type InventoryCategoryOption = {
  id: string
  name: string
  slug: string
}

type InventorySectionProps = {
  search: string
  onSearchChange: (value: string) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  categories: InventoryCategoryOption[]
  products: Product[]
  loading: boolean
  totalCount: number
  totalUnits: number
  totalValue: number
  onOpenRestock: (productId?: string | null) => void
  selectedInventoryProductId: string | null
  onSelectProduct: (productId: string) => void
  onDeleteProduct: (productId: string, productName: string) => void
  deletePending: boolean
  currentPage: number
  totalPages: number
  totalItems: number
  onPreviousPage: () => void
  onNextPage: () => void
}

function getInventoryStatus(product: Product) {
  const available = product.quantityAvailable ?? product.stock
  const threshold = product.lowStockThreshold ?? 5

  if (available <= 0) {
    return {
      label: 'Out of Stock',
      className: 'border-red-200 bg-red-50 text-red-600',
    }
  }

  if (available <= threshold) {
    return {
      label: 'Low Stock',
      className: 'border-amber-200 bg-amber-50 text-amber-600',
    }
  }

  return {
    label: 'Good',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  }
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[#dbe4f0] bg-white px-7 py-7 shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
      <p className="text-[13px] font-normal text-[#6b7f99]">{label}</p>
      <p className="mt-4 text-[32px] font-semibold leading-none tracking-[-0.03em] text-[#0f172a]">{value}</p>
    </div>
  )
}

function TableHeader({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#60748f]">
      {label}
      <ArrowUpDown className="h-4 w-4 text-[#7b8da8]" />
    </span>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function InventorySection({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  categories,
  products,
  loading,
  totalCount,
  totalUnits,
  totalValue,
  onOpenRestock,
  selectedInventoryProductId,
  onSelectProduct,
  onDeleteProduct,
  deletePending,
  currentPage,
  totalPages,
  totalItems,
  onPreviousPage,
  onNextPage,
}: InventorySectionProps) {
  const rows = useMemo(() => products, [products])
  const totalPagesSafe = Math.max(totalPages, 1)

  return (
    <section className="mt-8 space-y-6">
      <div className="grid gap-5 md:grid-cols-3">
        <MetricCard label="Total Products" value={String(totalCount)} />
        <MetricCard label="Total Units" value={String(totalUnits)} />
        <MetricCard label="Total Value" value={formatCurrency(totalValue)} />
      </div>

      <div className="overflow-hidden rounded-[26px] border border-[#dbe4f0] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
        <div className="border-b border-[#e7edf6] px-7 py-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2563eb]">
              <Grid2X2 className="h-5 w-5" />
            </div>
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">Inventory List</h2>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr,190px,190px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search products..."
                className="h-12 rounded-xl border-[#d9e3f0] bg-white pl-11 text-[15px] font-normal text-[#334155] shadow-[0_6px_14px_rgba(15,23,42,0.06)]"
              />
            </label>

            <FilterSelect
              value={categoryFilter}
              onChange={onCategoryChange}
              options={['All Categories', ...categories.map((category) => category.name)]}
            />

            <FilterSelect
              value={statusFilter}
              onChange={onStatusChange}
              options={['All Statuses', 'Good', 'Low Stock', 'Out of Stock']}
            />
          </div>
        </div>

        <div className="px-7 py-7">
          <div className="overflow-hidden rounded-[16px] border border-[#dbe4f0] bg-white">
            {loading ? (
              <div className="space-y-0">
                <div className="grid grid-cols-[2.3fr_0.9fr_1fr_0.8fr_0.9fr_0.8fr_1fr_1fr_1.2fr_56px] gap-4 border-b border-[#dbe4f0] bg-white px-5 py-4">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div key={index} className="h-4 rounded bg-slate-100" />
                  ))}
                </div>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid animate-pulse grid-cols-[2.3fr_0.9fr_1fr_0.8fr_0.9fr_0.8fr_1fr_1fr_1.2fr_56px] gap-4 border-b border-[#eef2f7] bg-white px-5 py-5"
                  >
                    <div className="space-y-2">
                      <div className="h-5 w-40 rounded bg-slate-100" />
                      <div className="h-3 w-28 rounded bg-slate-100" />
                    </div>
                    {Array.from({ length: 9 }).map((__, innerIndex) => (
                      <div key={innerIndex} className="h-5 rounded bg-slate-100" />
                    ))}
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="px-8 py-14 text-center">
                <p className="text-[16px] font-medium text-slate-700">No inventory items found</p>
                <p className="mt-2 text-[13px] font-normal text-slate-500">Try adjusting the current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="border-b border-[#dbe4f0] px-5 py-4 text-left"><TableHeader label="Product" /></th>
                      <th className="border-b border-[#dbe4f0] px-4 py-4 text-left"><TableHeader label="Brand" /></th>
                      <th className="border-b border-[#dbe4f0] px-4 py-4 text-left"><TableHeader label="Category" /></th>
                      <th className="border-b border-[#dbe4f0] px-4 py-4 text-left"><TableHeader label="Sizes" /></th>
                      <th className="border-b border-[#dbe4f0] px-4 py-4 text-left"><TableHeader label="Color" /></th>
                      <th className="border-b border-[#dbe4f0] px-4 py-4 text-left"><TableHeader label="Qty" /></th>
                      <th className="border-b border-[#dbe4f0] px-4 py-4 text-left"><TableHeader label="Unit Cost" /></th>
                      <th className="border-b border-[#dbe4f0] px-4 py-4 text-left"><TableHeader label="Total" /></th>
                      <th className="border-b border-[#dbe4f0] px-4 py-4 text-left"><TableHeader label="Status" /></th>
                      <th className="border-b border-[#dbe4f0] px-4 py-4 text-center" />
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((product) => {
                      const quantity = product.quantityOnHand ?? product.stock
                      const unitCost = product.salePrice ?? product.price
                      const total = quantity * unitCost
                      const status = getInventoryStatus(product)
                      const isSelected = selectedInventoryProductId === product.id

                      return (
                        <tr
                          key={product.id}
                          className={`group cursor-pointer transition ${isSelected ? 'bg-white' : 'bg-white hover:bg-[#fdfefe]'}`}
                          onClick={() => onSelectProduct(product.id)}
                        >
                          <td className="border-b border-[#eef2f7] px-5 py-4 align-top">
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={(event) => {
                                event.stopPropagation()
                                onSelectProduct(product.id)
                              }}
                            >
                              <p className="text-[15px] font-semibold leading-6 text-[#0f172a]">{product.name}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-[#64748b]">{product.sku ?? product.slug}</p>
                            </button>
                          </td>
                          <td className="border-b border-[#eef2f7] px-4 py-4 align-top text-[15px] text-[#64748b]">
                            {product.brand || '—'}
                          </td>
                          <td className="border-b border-[#eef2f7] px-4 py-4 align-top">
                            <span className="inline-flex rounded-lg bg-[#f1f5f9] px-3 py-1 text-[12px] font-medium text-[#0f172a]">
                              {product.category}
                            </span>
                          </td>
                          <td className="border-b border-[#eef2f7] px-4 py-4 align-top text-[15px] text-[#0f172a]">{product.size || '—'}</td>
                          <td className="border-b border-[#eef2f7] px-4 py-4 align-top text-[15px] text-[#0f172a]">{product.color || '—'}</td>
                          <td className="border-b border-[#eef2f7] px-4 py-4 align-top text-[15px] font-semibold text-[#0f172a]">{quantity}</td>
                          <td className="border-b border-[#eef2f7] px-4 py-4 align-top text-[15px] text-[#0f172a]">{formatCurrency(unitCost)}</td>
                          <td className="border-b border-[#eef2f7] px-4 py-4 align-top text-[15px] font-semibold text-[#0f172a]">{formatCurrency(total)}</td>
                          <td className="border-b border-[#eef2f7] px-4 py-4 align-top">
                            <div className="inline-flex min-w-[148px] items-center justify-between rounded-xl border border-[#dbe4f0] bg-white px-3 py-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
                              <span className={`inline-flex rounded-lg border px-3 py-1 text-[12px] font-medium ${status.className}`}>
                                {status.label}
                              </span>
                              <ChevronDown className="h-4 w-4 text-[#94a3b8]" />
                            </div>
                          </td>
                          <td className="border-b border-[#eef2f7] px-4 py-4 align-top">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-[#64748b] hover:bg-[#eff6ff] hover:text-[#2563eb]"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onOpenRestock(product.id)
                                }}
                              >
                                <PackagePlus className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={deletePending}
                                className="h-8 w-8 rounded-lg text-[#64748b] hover:bg-[#eff6ff] hover:text-[#2563eb]"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onDeleteProduct(product.id, product.name)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 px-1 pb-1 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] font-medium text-[#64748b]">
              Page {currentPage} of {totalPagesSafe} · {totalItems} item{totalItems === 1 ? '' : 's'}
            </p>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl border-[#dbe4f0] bg-white text-[#94a3b8] shadow-[0_6px_16px_rgba(15,23,42,0.05)] hover:text-[#2563eb]"
                disabled={currentPage <= 1}
                onClick={onPreviousPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl border-[#dbe4f0] bg-white text-[#94a3b8] shadow-[0_6px_16px_rgba(15,23,42,0.05)] hover:text-[#2563eb]"
                disabled={currentPage >= totalPagesSafe}
                onClick={onNextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
