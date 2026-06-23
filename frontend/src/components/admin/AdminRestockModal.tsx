import { Boxes, LoaderCircle, PackagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type CategoryOption = {
  id: string
  name: string
}

type RestockDisplayProduct = {
  sku?: string
  productName?: string
  category?: string
  warehouseCode?: string
  color?: string
  size?: string
  qtyOnHand?: number
  qtyReserved?: number
  qtyAvailable?: number
}

type RestockFormShape = {
  productName: string
  brand: string
  sku: string
  categoryId: string
  color: string
  size: string
  lowStockThreshold: string
  unitCost: string
  priority: 'Low' | 'Medium' | 'High'
  supplier: string
  expectedDelivery: string
  note: string
}

type AdminRestockModalProps = {
  open: boolean
  onClose: () => void
  inventorySnapshotLoading: boolean
  restockSelectableProductsLength: number
  restockForm: RestockFormShape | null
  restockDisplayProduct: RestockDisplayProduct | null
  restockBrandOptions: string[]
  restockColorOptions: string[]
  categories: CategoryOption[]
  generatedRestockSku: string
  restockQtyToAdd: string
  setRestockQtyToAdd: (value: string) => void
  updateRestockForm: (patch: Partial<RestockFormShape>) => void
  restockFormError: string | null
  isSubmitting: boolean
  onSubmit: () => Promise<void> | void
}

export default function AdminRestockModal({
  open,
  onClose,
  inventorySnapshotLoading,
  restockSelectableProductsLength,
  restockForm,
  restockDisplayProduct,
  restockBrandOptions,
  restockColorOptions,
  categories,
  generatedRestockSku,
  restockQtyToAdd,
  setRestockQtyToAdd,
  updateRestockForm,
  restockFormError,
  isSubmitting,
  onSubmit,
}: AdminRestockModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/20 px-4 py-6 sm:py-8">
      <div className="w-full max-w-6xl">
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#dbe4f0] bg-white p-2 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-5 py-3 text-sm font-medium text-foreground shadow-[0_2px_8px_rgba(15,23,42,0.05)]"
          >
            <PackagePlus className="h-4 w-4" />
            Add Stock
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-normal text-muted-foreground"
          >
            <Boxes className="h-4 w-4" />
            Stock History
          </button>
        </div>

        <div className="max-h-[92vh] overflow-y-auto rounded-[24px] border border-[#dbe4f0] bg-white text-foreground shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e8eef6] bg-white px-8 py-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ff] text-[#2563eb]">
                <PackagePlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[1.65rem] font-medium text-foreground">Add Stock</h2>
                <p className="mt-1 text-sm font-normal text-muted-foreground">
                  Fill in the product details to add stock to your inventory.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl border-[#d7e0eb] bg-white text-foreground hover:bg-[#f6f8fb]"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6 px-8 py-8">
            {!restockForm && !restockDisplayProduct ? (
              <div className="rounded-2xl border border-[#dbe4f0] bg-white px-5 py-4 text-sm font-normal text-muted-foreground">
                {inventorySnapshotLoading ? (
                  <div className="flex items-center gap-3">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading live inventory data
                  </div>
                ) : restockSelectableProductsLength === 0 ? (
                  'No products are available for restock yet. Create a product first, then come back here.'
                ) : (
                  'Select a product row to load its restock details.'
                )}
              </div>
            ) : (
              <div className="space-y-7 rounded-[24px] border border-[#dbe4f0] bg-white p-7 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                {inventorySnapshotLoading ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-[#dbe4f0] bg-white px-4 py-3 text-sm font-normal text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Syncing latest stock details
                  </div>
                ) : null}

                <div className="grid gap-5 md:grid-cols-3">
                  <label className="space-y-2 text-sm">
                    <span className="font-normal text-foreground">Product Name</span>
                    <Input
                      value={restockForm?.productName ?? ''}
                      onChange={(event) => updateRestockForm({ productName: event.target.value })}
                      placeholder="e.g. Classic Cotton Tee"
                      className="h-12 rounded-xl border-[#dbe4f0] bg-white text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-normal text-foreground">Brand</span>
                    <select
                      value={restockForm?.brand ?? ''}
                      onChange={(event) => updateRestockForm({ brand: event.target.value })}
                      className="h-12 w-full rounded-xl border border-[#dbe4f0] bg-white px-4 text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                    >
                      <option value="">Select brand</option>
                      {restockBrandOptions.map((brandOption) => (
                        <option key={brandOption} value={brandOption}>
                          {brandOption}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-normal text-foreground">SKU</span>
                    <Input
                      value={generatedRestockSku}
                      readOnly
                      placeholder="Auto-generated"
                      className="h-12 rounded-xl border-[#dbe4f0] bg-[#f8fbff] text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                    />
                    <p className="text-xs text-muted-foreground">Generated automatically from the product details.</p>
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-normal text-foreground">Category</span>
                    <select
                      value={restockForm?.categoryId ?? ''}
                      onChange={(event) => updateRestockForm({ categoryId: event.target.value })}
                      className="h-12 w-full rounded-xl border border-[#dbe4f0] bg-white px-4 text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-normal text-foreground">Color</span>
                    <select
                      value={restockForm?.color ?? ''}
                      onChange={(event) => updateRestockForm({ color: event.target.value })}
                      className="h-12 w-full rounded-xl border border-[#dbe4f0] bg-white px-4 text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                    >
                      <option value="">Select color</option>
                      {restockColorOptions.map((colorOption) => (
                        <option key={colorOption} value={colorOption}>
                          {colorOption}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-normal text-foreground">Sizes</p>
                  <div className="flex flex-wrap gap-4">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((sizeOption) => {
                      const checked = restockForm?.size === sizeOption
                      return (
                        <label key={sizeOption} className="inline-flex items-center gap-2 text-sm font-normal text-foreground">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => updateRestockForm({ size: checked ? '' : sizeOption })}
                            className="h-5 w-5 rounded border-[#2563eb] text-[#2563eb]"
                          />
                          <span>{sizeOption}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <label className="space-y-2 text-sm">
                    <span className="font-normal text-foreground">Qty</span>
                    <Input
                      type="number"
                      min="0"
                      value={restockQtyToAdd}
                      onChange={(event) => setRestockQtyToAdd(event.target.value)}
                      className="h-12 rounded-xl border-[#dbe4f0] bg-white text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-normal text-foreground">Unit Cost (₱)</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={restockForm?.unitCost ?? '0'}
                      onChange={(event) => updateRestockForm({ unitCost: event.target.value })}
                      className="h-12 rounded-xl border-[#dbe4f0] bg-white text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-normal text-foreground">Priority</span>
                    <select
                      value={restockForm?.priority ?? 'Medium'}
                      onChange={(event) => updateRestockForm({ priority: event.target.value as RestockFormShape['priority'] })}
                      className="h-12 w-full rounded-xl border border-[#dbe4f0] bg-white px-4 text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-normal text-foreground">Supplier (optional)</span>
                    <Input
                      value={restockForm?.supplier ?? ''}
                      onChange={(event) => updateRestockForm({ supplier: event.target.value })}
                      placeholder="e.g. FabricCo"
                      className="h-12 rounded-xl border-[#dbe4f0] bg-white text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-normal text-foreground">Expected Delivery (optional)</span>
                    <Input
                      type="date"
                      value={restockForm?.expectedDelivery ?? ''}
                      onChange={(event) => updateRestockForm({ expectedDelivery: event.target.value })}
                      className="h-12 rounded-xl border-[#dbe4f0] bg-white text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-[#dbe4f0] bg-white p-5">
                  <p className="text-sm font-medium text-foreground">Product details</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">SKU</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{restockDisplayProduct?.sku ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Product</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{restockDisplayProduct?.productName ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Category</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{restockDisplayProduct?.category ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Warehouse</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{restockDisplayProduct?.warehouseCode ?? 'MAIN'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Color</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{restockDisplayProduct?.color || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Size</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{restockDisplayProduct?.size || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                <label className="block space-y-2 text-sm">
                  <span className="font-normal text-foreground">Reorder level</span>
                  <Input
                    type="number"
                    min="0"
                    value={restockForm?.lowStockThreshold ?? '0'}
                    onChange={(event) => updateRestockForm({ lowStockThreshold: event.target.value })}
                    className="h-12 rounded-xl border-[#dbe4f0] bg-white text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-normal text-foreground">Notes (optional)</span>
                  <textarea
                    value={restockForm?.note ?? ''}
                    onChange={(event) => updateRestockForm({ note: event.target.value })}
                    placeholder="Additional details..."
                    className="min-h-28 w-full rounded-xl border border-[#dbe4f0] bg-white px-4 py-4 text-sm text-foreground outline-none shadow-[0_2px_8px_rgba(15,23,42,0.04)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#2563eb]"
                  />
                </label>

                <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-5 text-sm text-foreground">
                  <p className="font-medium text-[#1d4ed8]">Stock after restock</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#5b7ab8]">Current</p>
                      <p className="mt-1 text-3xl font-medium text-foreground">
                        {(restockDisplayProduct?.qtyOnHand ?? 0) + Math.max(0, Number(restockQtyToAdd) || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#5b7ab8]">Reserved</p>
                      <p className="mt-1 text-3xl font-medium text-foreground">{restockDisplayProduct?.qtyReserved ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#5b7ab8]">Available</p>
                      <p className="mt-1 text-3xl font-medium text-foreground">
                        {(restockDisplayProduct?.qtyAvailable ?? 0) + Math.max(0, Number(restockQtyToAdd) || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {restockFormError ? <p className="text-sm text-destructive">{restockFormError}</p> : null}

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    className="min-w-48 rounded-xl bg-[#2563eb] px-8 py-6 text-sm font-medium tracking-[0.01em] text-white hover:bg-[#1d4ed8]"
                    disabled={isSubmitting}
                    onClick={() => void onSubmit()}
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      'Add Restock'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
