import { zodResolver } from '@hookform/resolvers/zod'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Boxes,
  CircleCheckBig,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderTree,
  Grid2X2,
  LoaderCircle,
  PackagePlus,
  Package,
  Search,
  ShieldAlert,
  ShoppingBag,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { ChangeEvent, DragEvent } from 'react'
import { z } from 'zod'
import deleteIcon from '@/assets/deleteicon.png'
import { AdminConfirmDialog, AdminFeedbackDialog } from '@/components/admin/AdminDialogs'
import { InventorySection } from '@/components/admin/InventorySection'
import AdminRestockModal from '@/components/admin/AdminRestockModal'
import { AdminOrdersSection, AdminPageIntro } from '@/components/admin/AdminSections'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { categoryService } from '@/services/categoryService'
import { orderService } from '@/services/orderService'
import { productService } from '@/services/productService'
import type { InventorySnapshot } from '@/services/productService'
import type { Order, OrderStatus } from '@/types/order'
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

const statusOptionsByCurrent: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Pending', 'Confirmed', 'Shipped', 'Cancelled', 'Expired'],
  PendingPayment: ['PendingPayment', 'Confirmed', 'Shipped', 'Cancelled', 'Expired'],
  Confirmed: ['Confirmed', 'Processing', 'Shipped', 'Cancelled', 'Expired'],
  Processing: ['Processing', 'Shipped', 'Cancelled'],
  Paid: ['Paid', 'Processing', 'Shipped', 'Cancelled'],
  Shipped: ['Shipped', 'OutForDelivery', 'Delivered', 'Cancelled'],
  OutForDelivery: ['OutForDelivery', 'Delivered', 'Cancelled'],
  Delivered: ['Delivered', 'Refunded'],
  Cancelled: ['Cancelled'],
  Expired: ['Expired'],
  Refunded: ['Refunded'],
}

const productSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  slug: z.string().trim().min(3, 'Slug must be at least 3 characters'),
  brand: z.string().trim().min(2, 'Brand must be at least 2 characters'),
  color: z.string().trim().optional(),
  size: z.string().trim().optional(),
  status: z.enum(['Draft', 'Active', 'OutOfStock', 'Archived']),
  sku: z.string().trim().min(4, 'SKU must be at least 4 characters'),
  description: z.string().trim().min(12, 'Description must be at least 12 characters'),
  categoryId: z.string().uuid('Choose a category'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  salePrice: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number().nonnegative('Sale price must be 0 or more').optional(),
  ),
  lowStockThreshold: z.coerce
    .number()
    .int('Threshold must be a whole number')
    .min(0, 'Threshold must be 0 or more'),
  isActive: z.boolean(),
})

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  slug: z.string().trim().min(2, 'Slug must be at least 2 characters'),
  parentCategoryId: z.string().optional(),
})

type ProductFormValues = z.output<typeof productSchema>
type ProductFormInput = z.input<typeof productSchema>
type CategoryFormValues = z.output<typeof categorySchema>
type OverviewMetric = {
  label: string
  value: string
  detail?: string
  icon: typeof Boxes
}

const AdminOverviewPanel = lazy(() => import('@/components/admin/AdminOverviewPanel'))
const AdminProductModal = lazy(() => import('@/components/admin/AdminProductModal'))

type UploadedProductImage = {
  file?: File
  previewUrl: string
  imageUrl?: string
  isExisting?: boolean
}

const restockBrandOptions = ['JLA Everyday', 'Zara', 'H&M', 'Uniqlo', 'Mango', 'COS', '& Other Stories', 'Massimo Dutti', 'Reserved', 'Pull&Bear']
const restockColorOptions = ['Black', 'White', 'Navy', 'Cream', 'Beige', 'Olive', 'Burgundy', 'Charcoal', 'Camel', 'Sage']
const productBrandOptions = ['JLA Everyday', 'Zara', 'H&M', 'Uniqlo', 'Mango', 'COS', '& Other Stories', 'Massimo Dutti', 'Reserved', 'Pull&Bear']
const productColorOptions = ['Black', 'White', 'Navy', 'Cream', 'Beige', 'Olive', 'Burgundy', 'Charcoal', 'Camel', 'Sage', 'Ivory', 'Brown', 'Pink', 'Grey']
const productSizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL']


type RestockFormState = {
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

type DeleteConfirmState =
  | {
      kind: 'product'
      productId: string
      productName: string
      source: 'inventory' | 'product-modal'
    }
  | {
      kind: 'category'
      categoryId: string
      categoryName: string
    }
  | null

function createRestockFormState(input?: {
  productName?: string
  brand?: string
  sku?: string
  categoryId?: string
  color?: string
  size?: string
  lowStockThreshold?: number | string
  unitCost?: number | string
  priority?: 'Low' | 'Medium' | 'High'
  supplier?: string
  expectedDelivery?: string
  note?: string
}): RestockFormState {
  return {
    productName: input?.productName ?? '',
    brand: input?.brand ?? '',
    sku: input?.sku ?? '',
    categoryId: input?.categoryId ?? '',
    color: input?.color ?? '',
    size: input?.size ?? '',
    lowStockThreshold: String(input?.lowStockThreshold ?? 5),
    unitCost: String(input?.unitCost ?? 0),
    priority: input?.priority ?? 'Medium',
    supplier: input?.supplier ?? '',
    expectedDelivery: input?.expectedDelivery ?? '',
    note: input?.note ?? '',
  }
}

function areRestockFormsEqual(left: RestockFormState | null, right: RestockFormState) {
  if (!left) {
    return false
  }

  return (
    left.productName === right.productName &&
    left.brand === right.brand &&
    left.sku === right.sku &&
    left.categoryId === right.categoryId &&
    left.color === right.color &&
    left.size === right.size &&
    left.lowStockThreshold === right.lowStockThreshold &&
    left.unitCost === right.unitCost &&
    left.priority === right.priority &&
    left.supplier === right.supplier &&
    left.expectedDelivery === right.expectedDelivery &&
    left.note === right.note
  )
}

function normalizeSkuToken(value?: string) {
  if (!value) {
    return ''
  }

  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .trim()
}

function buildSlug(value?: string) {
  if (!value) {
    return ''
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function buildAutoSku(input: {
  productName?: string
  brand?: string
  category?: string
  color?: string
  size?: string
  productId?: string | null
}) {
  const productToken = normalizeSkuToken(input.productName).slice(0, 10)
  const brandToken = normalizeSkuToken(input.brand).slice(0, 4)
  const categoryToken = normalizeSkuToken(input.category).slice(0, 4)
  const colorToken = normalizeSkuToken(input.color).slice(0, 3)
  const sizeToken = normalizeSkuToken(input.size).slice(0, 4)
  const idToken = normalizeSkuToken(input.productId ?? '').slice(-6)

  const tokens = [brandToken, categoryToken, productToken, colorToken, sizeToken, idToken].filter(Boolean)
  return tokens.join('-') || 'AUTO-SKU'
}

function parseSkuSequence(value?: string | null) {
  if (!value) {
    return null
  }

  const match = value.match(/\d+/g)
  const numericToken = match?.at(-1)

  if (!numericToken) {
    return null
  }

  const parsed = Number(numericToken)
  return Number.isFinite(parsed) ? parsed : null
}

function buildSequentialSku(sequence: number) {
  return `PROD-${String(sequence).padStart(2, '0')}`
}

const defaultProductValues: ProductFormValues = {
  name: '',
  slug: '',
  brand: '',
  color: '',
  size: '',
  status: 'Draft',
  sku: '',
  description: '',
  categoryId: '',
  price: 0,
  salePrice: undefined,
  lowStockThreshold: 5,
  isActive: true,
}

const defaultCategoryValues: CategoryFormValues = {
  name: '',
  slug: '',
  parentCategoryId: '',
}

function pendingOrdersCount(orders: Order[]) {
  return orders.filter((order) =>
    ['Pending', 'PendingPayment', 'Confirmed', 'Processing'].includes(order.status),
  ).length
}

function isSalesOrder(order: Order) {
  return !['Cancelled', 'Expired', 'Refunded'].includes(order.status)
}

function getCatalogStatus(product: {
  status?: string
  isActive?: boolean
  quantityAvailable?: number
  stock: number
  lowStockThreshold?: number
}) {
  const available = product.quantityAvailable ?? product.stock
  const threshold = product.lowStockThreshold ?? 5

  if (!product.isActive || product.status === 'Archived' || product.status === 'Deleted') {
    return {
      label: 'Archived',
      className: 'border-[#dbe4f0] bg-[#f8fafc] text-[#64748b]',
    }
  }

  if (available <= 0 || product.status === 'OutOfStock') {
    return {
      label: 'Out of Stock',
      className: 'border-[#fecdd3] bg-[#fff1f2] text-[#e11d48]',
    }
  }

  if (available <= threshold) {
    return {
      label: 'Low Stock',
      className: 'border-[#fcd34d] bg-[#fffbeb] text-[#d97706]',
    }
  }

  return {
    label: 'Active',
    className: 'border-[#bbf7d0] bg-[#ecfdf3] text-[#047857]',
  }
}

function OrderStatusEditor({ order }: { order: Order }) {
  const queryClient = useQueryClient()
  const availableStatuses = statusOptionsByCurrent[order.status]
  const mutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      orderService.updateStatus({
        id: order.id,
        status,
        concurrencyStamp: order.concurrencyStamp,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ])
    },
  })

  return (
    <div className="flex flex-wrap items-center gap-2">
      {availableStatuses.map((status) => {
        const isActive = status === order.status

        return (
          <button
            key={status}
            type="button"
            aria-pressed={isActive}
            disabled={mutation.isPending || isActive}
            onClick={() => mutation.mutate(status)}
            className={[
              'inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition-colors',
              isActive
                ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-[0_8px_18px_rgba(37,99,235,0.18)]'
                : 'border-[#d7dfeb] bg-white text-[#0f172a] hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#2563eb]',
              mutation.isPending || isActive ? 'cursor-default' : 'cursor-pointer',
              mutation.isPending ? 'opacity-70' : '',
            ].join(' ')}
          >
            {status}
          </button>
        )
      })}
      {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
    </div>
  )
}

function AdminSmsHistoryModal({
  orderId,
  open,
  onClose,
}: {
  orderId: string | null
  open: boolean
  onClose: () => void
}) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['sms-logs', orderId],
    queryFn: () => (orderId ? orderService.getNotifications(orderId) : Promise.resolve([])),
    enabled: Boolean(orderId && open),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-[#dbe4f0] bg-white p-0 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
        <DialogHeader className="border-b border-[#eef2f7] px-6 py-5">
          <DialogTitle className="text-xl font-semibold text-[#0f172a]">SMS Notification Logs</DialogTitle>
          <DialogDescription className="text-[0.95rem] text-muted-foreground">
            History of all automated SMS messages sent for this order.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No SMS logs found for this order.</p>
          ) : (
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div key={log.id} className="rounded-xl border border-[#e5ebf3] bg-[#fbfdff] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-[#334155]">{log.phoneNumber}</p>
                    <Badge variant={log.status === 'Success' ? 'default' : 'outline'}>{log.status}</Badge>
                  </div>
                  <p className="text-sm text-[#475569] mb-2">{log.message}</p>
                  <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                    <span>{new Date(log.sentAtUtc).toLocaleString()}</span>
                    {log.errorMessage ? <span className="text-destructive font-medium truncate max-w-[50%]">{log.errorMessage}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminDashboard() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const adminView: 'overview' | 'inventory' | 'catalog' | 'orders' =
    location.pathname === '/admin/inventory'
      ? 'inventory'
      : location.pathname === '/admin/catalog'
        ? 'catalog'
        : location.pathname === '/admin/orders'
          ? 'orders'
          : 'overview'
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedInventoryProductId, setSelectedInventoryProductId] = useState<string | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [selectedOrderIdForSms, setSelectedOrderIdForSms] = useState<string | null>(null)
  const [productSubmissionError, setProductSubmissionError] = useState<string | null>(null)
  const [productSuccessMessage, setProductSuccessMessage] = useState<string | null>(null)
  const [adminErrorMessage, setAdminErrorMessage] = useState<string | null>(null)
  const [deleteConfirmState, setDeleteConfirmState] = useState<DeleteConfirmState>(null)
  const [productImageFieldError, setProductImageFieldError] = useState<string | null>(null)
  const [productImageFiles, setProductImageFiles] = useState<UploadedProductImage[]>([])
  const [isProductImageDragActive, setIsProductImageDragActive] = useState(false)
  const [restockForm, setRestockForm] = useState<RestockFormState | null>(null)
  const [restockFormError, setRestockFormError] = useState<string | null>(null)
  const [restockQtyToAdd, setRestockQtyToAdd] = useState('0')
  const [productUnitCost, setProductUnitCost] = useState('0')
  const [productProfitMargin, setProductProfitMargin] = useState('0')
  const [search, setSearch] = useState('')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('All Categories')
  const [catalogBrandFilter, setCatalogBrandFilter] = useState('All Brands')
  const [inventoryPage, setInventoryPage] = useState(1)
  const [catalogPage, setCatalogPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState('')
  const inventoryPageSize = 25
  const catalogPageSize = 9

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => orderService.getAllOrders(),
    enabled: adminView === 'overview' || adminView === 'orders',
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productService.getAdminProducts({ pageSize: 24 }),
    enabled: adminView === 'overview',
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const { data: skuSeedProducts = [] } = useQuery({
    queryKey: ['admin-products-sku-seed'],
    queryFn: () => productService.getAdminProducts({ pageSize: 500 }),
    enabled: adminView === 'catalog' || isProductModalOpen || adminView === 'inventory' || adminView === 'overview',
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const {
    data: inventoryCatalog,
    isLoading: inventoryProductsLoading,
  } = useQuery({
    queryKey: ['admin-products-page', debouncedSearch, categoryFilter, statusFilter, inventoryPage, inventoryPageSize],
    queryFn: () =>
      productService.getAdminProductCatalog({
        search: debouncedSearch || undefined,
        category: categoryFilter === 'All Categories' ? undefined : categoryFilter,
        stockState: statusFilter === 'All Statuses' ? undefined : statusFilter,
        page: inventoryPage,
        pageSize: inventoryPageSize,
      }),
    enabled: adminView === 'inventory',
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const {
    data: catalogCatalog,
    isLoading: catalogProductsLoading,
  } = useQuery({
    queryKey: ['admin-catalog-page', debouncedCatalogSearch, catalogCategoryFilter, catalogBrandFilter, catalogPage, catalogPageSize],
    queryFn: () =>
      productService.getAdminProductCatalog({
        search: debouncedCatalogSearch || undefined,
        category: catalogCategoryFilter === 'All Categories' ? undefined : catalogCategoryFilter,
        brand: catalogBrandFilter === 'All Brands' ? undefined : catalogBrandFilter,
        page: catalogPage,
        pageSize: catalogPageSize,
      }),
    enabled: adminView === 'catalog',
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })

  const { data: editingProduct, isFetching: editingProductLoading } = useQuery({
    queryKey: ['admin-product-detail', selectedSlug],
    queryFn: () => productService.getAdminProductBySlug(selectedSlug!),
    enabled: Boolean(selectedSlug),
  })

  const selectedInventoryProduct = useMemo(() => {
    const inventoryMatch = (inventoryCatalog?.items ?? []).find((product) => product.id === selectedInventoryProductId)
    if (inventoryMatch) {
      return inventoryMatch
    }

    return null
  }, [inventoryCatalog?.items, selectedInventoryProductId])

  const { data: restockProductDetail } = useQuery({
    queryKey: ['admin-product-detail', 'restock', selectedInventoryProduct?.slug],
    queryFn: () => productService.getAdminProductBySlug(selectedInventoryProduct!.slug),
    enabled: isRestockModalOpen && Boolean(selectedInventoryProduct?.slug),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const {
    data: selectedInventorySnapshot,
    isLoading: inventorySnapshotLoading,
  } = useQuery<InventorySnapshot>({
    queryKey: ['admin-product-inventory', selectedInventoryProductId],
    queryFn: () => productService.getInventory(selectedInventoryProductId!),
    enabled: isRestockModalOpen && Boolean(selectedInventoryProductId),
    staleTime: 15_000,
    refetchInterval: isRestockModalOpen ? 15_000 : false,
    refetchOnWindowFocus: false,
  })

  const restockDisplayProduct = useMemo(() => {
    if (selectedInventorySnapshot) {
      return {
        productName: selectedInventorySnapshot.productName,
        sku: selectedInventorySnapshot.sku,
        category: selectedInventorySnapshot.category,
        color: selectedInventorySnapshot.color ?? selectedInventoryProduct?.color ?? '',
        size: selectedInventorySnapshot.size ?? selectedInventoryProduct?.size ?? '',
        warehouseCode: selectedInventorySnapshot.warehouseCode,
        qtyOnHand: selectedInventorySnapshot.qtyOnHand,
        qtyReserved: selectedInventorySnapshot.qtyReserved,
        qtyAvailable: selectedInventorySnapshot.qtyAvailable,
        lowStockThreshold: selectedInventorySnapshot.lowStockThreshold,
      }
    }

    if (!selectedInventoryProduct) {
      return null
    }

    return {
      productName: selectedInventoryProduct.name,
      sku: selectedInventoryProduct.sku ?? selectedInventoryProduct.slug,
      category: selectedInventoryProduct.category,
      color: selectedInventoryProduct.color ?? '',
      size: selectedInventoryProduct.size ?? '',
      warehouseCode: 'MAIN',
      qtyOnHand: selectedInventoryProduct.quantityOnHand ?? selectedInventoryProduct.stock,
      qtyReserved: selectedInventoryProduct.quantityReserved ?? 0,
      qtyAvailable:
        selectedInventoryProduct.quantityAvailable ??
        (selectedInventoryProduct.quantityOnHand ?? selectedInventoryProduct.stock) - (selectedInventoryProduct.quantityReserved ?? 0),
      lowStockThreshold: selectedInventoryProduct.lowStockThreshold ?? 5,
    }
  }, [selectedInventoryProduct, selectedInventorySnapshot])

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultProductValues,
  })

  const {
    register: registerCategory,
    handleSubmit: handleCategorySubmit,
    reset: resetCategory,
    formState: { errors: categoryErrors, isSubmitting: categorySubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaultCategoryValues,
  })

  const watchedProductName = watch('name')
  const watchedProductSize = watch('size')

  const generatedProductSku = useMemo(
    () => {
      if (editingProduct?.sku) {
        return editingProduct.sku
      }

      const maxExistingSku = skuSeedProducts.reduce((max, product) => {
        const parsedSku = parseSkuSequence(product.sku)
        return parsedSku && parsedSku > max ? parsedSku : max
      }, 0)

      return buildSequentialSku(maxExistingSku + 1)
    },
    [editingProduct?.sku, skuSeedProducts],
  )
  const generatedProductSlug = useMemo(() => buildSlug(watchedProductName), [watchedProductName])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedCatalogSearch(catalogSearch.trim())
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [catalogSearch])

  useEffect(() => {
    if (generatedProductSku) {
      setValue('sku', generatedProductSku, { shouldDirty: true, shouldValidate: true })
    }

    if (!editingProduct && generatedProductSlug) {
      setValue('slug', generatedProductSlug, { shouldDirty: true, shouldValidate: true })
    }
  }, [editingProduct, generatedProductSku, generatedProductSlug, setValue])

  useEffect(() => {
    if (!editingProduct) {
      return
    }

    reset({
      name: editingProduct.name,
      slug: editingProduct.slug,
      brand: editingProduct.brand ?? '',
      color: editingProduct.color ?? '',
      size: editingProduct.size ?? '',
      status:
        editingProduct.status === 'Active' ||
        editingProduct.status === 'OutOfStock' ||
        editingProduct.status === 'Archived'
          ? editingProduct.status
          : 'Draft',
      sku: editingProduct.sku ?? '',
      description: editingProduct.description,
      categoryId: editingProduct.categoryId,
      price: editingProduct.price,
      salePrice: editingProduct.salePrice ?? undefined,
      lowStockThreshold: editingProduct.lowStockThreshold ?? 5,
      isActive: editingProduct.isActive,
    })
    setProductImageFiles(
      editingProduct.images?.length
        ? editingProduct.images
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((image) => ({
              previewUrl: image.imageUrl,
              imageUrl: image.imageUrl,
              isExisting: true,
            }))
        : editingProduct.imageUrl
          ? [{ previewUrl: editingProduct.imageUrl, imageUrl: editingProduct.imageUrl, isExisting: true }]
          : [],
    )
    setProductUnitCost(String(editingProduct.price))
    setProductProfitMargin('0')
  }, [editingProduct, reset])

  useEffect(() => {
    if (!selectedCategory) {
      return
    }

    resetCategory({
      name: selectedCategory.name,
      slug: selectedCategory.slug,
      parentCategoryId: selectedCategory.parentCategoryId ?? '',
    })
  }, [resetCategory, selectedCategory])

  useEffect(() => {
    if (!isRestockModalOpen) {
      return
    }

    if (!selectedInventorySnapshot && !restockProductDetail) {
      return
    }

    setRestockForm((current) =>
      {
        const nextForm = createRestockFormState({
        productName: (current?.productName || restockDisplayProduct?.productName) ?? selectedInventoryProduct?.name,
        brand: (current?.brand || restockProductDetail?.brand) ?? selectedInventoryProduct?.brand ?? '',
        sku: (current?.sku || restockDisplayProduct?.sku) ?? selectedInventoryProduct?.sku ?? selectedInventoryProduct?.slug,
        categoryId: (current?.categoryId || restockProductDetail?.categoryId) ?? '',
        color: (current?.color || restockDisplayProduct?.color) ?? '',
        size: (current?.size || restockDisplayProduct?.size) ?? '',
        lowStockThreshold: (current?.lowStockThreshold || restockDisplayProduct?.lowStockThreshold) ?? selectedInventoryProduct?.lowStockThreshold ?? 5,
        unitCost: (current?.unitCost || restockProductDetail?.price) ?? selectedInventoryProduct?.price ?? 0,
        priority: current?.priority ?? (selectedInventorySnapshot?.isLowStock ? 'High' : 'Medium'),
        supplier: current?.supplier ?? '',
        expectedDelivery: current?.expectedDelivery ?? '',
        note: current?.note ?? '',
        })

        return areRestockFormsEqual(current, nextForm) ? current : nextForm
      }
    )

    setRestockQtyToAdd((current) => (current === '0' ? current : '0'))
    setRestockFormError((current) => (current ? null : current))
  }, [
    isRestockModalOpen,
    restockDisplayProduct,
    restockProductDetail?.brand,
    restockProductDetail?.categoryId,
    restockProductDetail?.price,
    selectedInventoryProduct?.brand,
    selectedInventoryProduct?.lowStockThreshold,
    selectedInventoryProduct?.name,
    selectedInventoryProduct?.price,
    selectedInventoryProduct?.sku,
    selectedInventoryProduct?.slug,
    selectedInventorySnapshot?.isLowStock,
  ])

  const createMutation = useMutation({
    mutationFn: productService.createProduct,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-products-page'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-catalog-page'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
      setProductSubmissionError(null)
      setIsProductModalOpen(false)
      setSelectedSlug(null)
      reset(defaultProductValues)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof productService.updateProduct>[1] }) =>
      productService.updateProduct(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-products-page'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-catalog-page'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
      setProductSubmissionError(null)
      setIsProductModalOpen(false)
      setSelectedSlug(null)
      reset(defaultProductValues)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onMutate: async (deletedProductId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['admin-products'] }),
        queryClient.cancelQueries({ queryKey: ['admin-products-page'] }),
        queryClient.cancelQueries({ queryKey: ['admin-catalog-page'] }),
        queryClient.cancelQueries({ queryKey: ['products'] }),
      ])

      const previousAdminProducts = queryClient.getQueryData(['admin-products'])
      const previousAdminProductPages = queryClient.getQueriesData({ queryKey: ['admin-products-page'] })
      const previousAdminCatalogPages = queryClient.getQueriesData({ queryKey: ['admin-catalog-page'] })
      const previousProducts = queryClient.getQueriesData({ queryKey: ['products'] })

      queryClient.setQueryData(['admin-products'], (current: any[] | undefined) =>
        current?.filter((product) => product.id !== deletedProductId) ?? current,
      )

      for (const [queryKey] of previousAdminProductPages) {
        queryClient.setQueryData(queryKey, (current: any) => {
          if (!current?.items) {
            return current
          }

          const filteredItems = current.items.filter((product: any) => product.id !== deletedProductId)
          return {
            ...current,
            items: filteredItems,
            totalCount: Math.max(0, (current.totalCount ?? filteredItems.length) - 1),
            totalPages: Math.max(1, Math.ceil(Math.max(0, ((current.totalCount ?? filteredItems.length) - 1)) / (current.pageSize || 25))),
          }
        })
      }

      for (const [queryKey] of previousAdminCatalogPages) {
        queryClient.setQueryData(queryKey, (current: any) => {
          if (!current?.items) {
            return current
          }

          const filteredItems = current.items.filter((product: any) => product.id !== deletedProductId)
          return {
            ...current,
            items: filteredItems,
            totalCount: Math.max(0, (current.totalCount ?? filteredItems.length) - 1),
            totalPages: Math.max(1, Math.ceil(Math.max(0, ((current.totalCount ?? filteredItems.length) - 1)) / (current.pageSize || 25))),
          }
        })
      }

      for (const [queryKey] of previousProducts) {
        queryClient.setQueryData(queryKey, (current: any) => {
          if (Array.isArray(current)) {
            return current.filter((product) => product.id !== deletedProductId)
          }

          if (current?.items) {
            const filteredItems = current.items.filter((product: any) => product.id !== deletedProductId)
            return {
              ...current,
              items: filteredItems,
              totalCount: Math.max(0, (current.totalCount ?? filteredItems.length) - 1),
              totalPages: Math.max(1, Math.ceil(Math.max(0, ((current.totalCount ?? filteredItems.length) - 1)) / (current.pageSize || 25))),
            }
          }

          return current
        })
      }

      return {
        previousAdminProducts,
        previousAdminProductPages,
        previousAdminCatalogPages,
        previousProducts,
      }
    },
    onError: (_error, _deletedProductId, context) => {
      if (context?.previousAdminProducts) {
        queryClient.setQueryData(['admin-products'], context.previousAdminProducts)
      }

      for (const [queryKey, data] of context?.previousAdminProductPages ?? []) {
        queryClient.setQueryData(queryKey, data)
      }

      for (const [queryKey, data] of context?.previousAdminCatalogPages ?? []) {
        queryClient.setQueryData(queryKey, data)
      }

      for (const [queryKey, data] of context?.previousProducts ?? []) {
        queryClient.setQueryData(queryKey, data)
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-products-page'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-catalog-page'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
      setProductSubmissionError(null)
      setIsProductModalOpen(false)
      setSelectedSlug(null)
      reset(defaultProductValues)
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      setSelectedCategoryId(null)
      resetCategory(defaultCategoryValues)
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof categoryService.updateCategory>[1] }) =>
      categoryService.updateCategory(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: categoryService.deleteCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      setSelectedCategoryId(null)
      resetCategory(defaultCategoryValues)
    },
  })

  const adjustInventoryMutation = useMutation({
    mutationFn: ({
      productId,
      qtyOnHand,
      qtyReserved,
      note,
    }: {
      productId: string
      qtyOnHand: number
      qtyReserved: number
      note?: string
    }) => productService.adjustInventory(productId, qtyOnHand, qtyReserved, note),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-products-page'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-catalog-page'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-product-inventory', variables.productId] }),
        queryClient.invalidateQueries({ queryKey: ['admin-product-inventory-history', variables.productId] }),
      ])
    },
  })

  const overview = useMemo(() => {
    const now = new Date()
    const salesOrders = orders.filter(isSalesOrder)
    const totalRevenue = salesOrders.reduce((sum, order) => sum + order.total, 0)
    const totalOrders = orders.length
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    startOfWeek.setDate(startOfWeek.getDate() + mondayOffset)
    startOfWeek.setHours(0, 0, 0, 0)

    const salesToday = salesOrders
      .filter((order) => {
        const createdAt = new Date(order.createdAtUtc)
        return createdAt >= startOfToday && createdAt < startOfTomorrow
      })
      .reduce((sum, order) => sum + order.total, 0)

    const weeklySales = salesOrders
      .filter((order) => {
        const createdAt = new Date(order.createdAtUtc)
        return createdAt >= startOfWeek
      })
      .reduce((sum, order) => sum + order.total, 0)

    const monthlySales = salesOrders
      .filter((order) => {
        const createdAt = new Date(order.createdAtUtc)
        return createdAt >= startOfMonth
      })
      .reduce((sum, order) => sum + order.total, 0)

    const annualSales = salesOrders
      .filter((order) => {
        const createdAt = new Date(order.createdAtUtc)
        return createdAt >= startOfYear
      })
      .reduce((sum, order) => sum + order.total, 0)

    const monthlyValues = Array.from({ length: 6 }, (_, reverseIndex) => {
      const target = new Date(now.getFullYear(), now.getMonth() - (5 - reverseIndex), 1)
      return salesOrders
        .filter((order) => {
          const createdAt = new Date(order.createdAtUtc)
          return createdAt.getFullYear() === target.getFullYear() && createdAt.getMonth() === target.getMonth()
        })
        .reduce((sum, order) => sum + order.total, 0)
    })

    const monthlyLabels = Array.from({ length: 6 }, (_, reverseIndex) => {
      const target = new Date(now.getFullYear(), now.getMonth() - (5 - reverseIndex), 1)
      return target.toLocaleString(undefined, { month: 'short' })
    })

    const previousRevenue = monthlyValues.slice(0, 3).reduce((sum, value) => sum + value, 0)
    const currentRevenue = monthlyValues.slice(3).reduce((sum, value) => sum + value, 0)
    const revenueDelta =
      previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 0

    const previousOrderCount = Math.max(totalOrders - pendingOrdersCount(orders), 0)
    const orderDelta =
      previousOrderCount > 0 ? Math.round((pendingOrdersCount(orders) / previousOrderCount) * 100) : 0

    const categoryRevenueMap = new Map<string, number>()
    const productMap = new Map(products.map((product) => [product.id, product]))
    const productSalesMap = new Map<string, { name: string; units: number; revenue: number }>()
    const inventoryValue = products.reduce(
      (sum, product) => sum + (product.quantityOnHand ?? product.stock) * product.price,
      0,
    )
    const costOfGoodsSold = salesOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((orderSum, item) => {
          const product = productMap.get(item.productId)
          const unitCost = product?.price ?? item.unitPrice
          return orderSum + item.quantity * unitCost
        }, 0)
      )
    }, 0)
    const grossProfit = totalRevenue - costOfGoodsSold
    const profitMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const lowMarginProducts = products.filter((product) => {
      const sellingPrice = product.salePrice ?? product.price
      if (sellingPrice <= 0) {
        return false
      }

      const marginPercent = ((sellingPrice - product.price) / sellingPrice) * 100
      return marginPercent >= 0 && marginPercent < 20
    }).length

    for (const order of salesOrders) {
      for (const item of order.items) {
        const product = productMap.get(item.productId)
        const categoryName = product?.category ?? 'Uncategorized'
        categoryRevenueMap.set(categoryName, (categoryRevenueMap.get(categoryName) ?? 0) + item.lineTotal)

        const existing = productSalesMap.get(item.productId)
        productSalesMap.set(item.productId, {
          name: item.productName,
          units: (existing?.units ?? 0) + item.quantity,
          revenue: (existing?.revenue ?? 0) + item.lineTotal,
        })
      }
    }

    const categorySegments = Array.from(categoryRevenueMap.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([label, value], index) => ({
        label,
        value,
        color: ['#2f7569', '#c89455', '#d5b85a', '#4e93b8'][index] ?? '#94a3b8',
      }))

    const topProducts = Array.from(productSalesMap.values())
      .sort((left, right) => right.units - left.units)
      .slice(0, 4)

    const weeklyOrders = Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(startOfWeek)
      dayStart.setDate(startOfWeek.getDate() + index)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayStart.getDate() + 1)

      return orders.filter((order) => {
        const createdAt = new Date(order.createdAtUtc)
        return createdAt >= dayStart && createdAt < dayEnd
      }).length
    })

    const recentOrders = [...orders]
      .sort((left, right) => new Date(right.createdAtUtc).getTime() - new Date(left.createdAtUtc).getTime())
      .slice(0, 4)

    const overviewMetrics: OverviewMetric[] = [
      {
        label: 'Total Revenue',
        value: formatCurrency(totalRevenue),
        detail: `${revenueDelta >= 0 ? '+' : ''}${revenueDelta}% vs last period`,
        icon: ClipboardList,
      },
      {
        label: 'Today',
        value: formatCurrency(salesToday),
        detail: startOfToday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        icon: CircleCheckBig,
      },
      {
        label: 'This Week',
        value: formatCurrency(weeklySales),
        detail: 'Sales this week',
        icon: ShoppingBag,
      },
      {
        label: 'This Month',
        value: formatCurrency(monthlySales),
        detail: now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        icon: Package,
      },
      {
        label: 'This Year',
        value: formatCurrency(annualSales),
        detail: `Sales in ${now.getFullYear()}`,
        icon: Grid2X2,
      },
      {
        label: 'Inventory Value',
        value: formatCurrency(inventoryValue),
        detail: 'Current stock cost basis',
        icon: PackagePlus,
      },
      {
        label: 'Gross Profit',
        value: formatCurrency(grossProfit),
        detail: 'Revenue minus cost',
        icon: ShoppingBag,
      },
      {
        label: 'Margin %',
        value: `${profitMarginPercent.toFixed(1)}%`,
        detail: '(Gross Profit / Revenue) x 100',
        icon: CircleCheckBig,
      },
      {
        label: 'Low Margin',
        value: String(lowMarginProducts),
        detail: 'Products below 20%',
        icon: ShieldAlert,
      },
      {
        label: 'COGS',
        value: formatCurrency(costOfGoodsSold),
        detail: 'Cost of goods sold',
        icon: Package,
      },
      {
        label: 'Total Orders',
        value: String(totalOrders),
        detail: `${orderDelta >= 0 ? '+' : ''}${orderDelta}% vs last period`,
        icon: ClipboardList,
      },
      { label: 'SKUs', value: String(products.length), icon: Boxes },
      { label: 'Categories', value: String(categories.length), icon: FolderTree },
      {
        label: 'Low Stock',
        value: String(products.filter((product) => product.stock <= 10).length),
        icon: ShieldAlert,
      },
      { label: 'Open Orders', value: String(pendingOrdersCount(orders)), icon: ClipboardList },
    ]

    return {
      metrics: overviewMetrics,
      monthlyValues,
      monthlyLabels,
      categorySegments:
        categorySegments.length > 0 ? categorySegments : [{ label: 'No sales', value: 1, color: '#d9d0c5' }],
      weeklyOrders,
      topProducts,
      recentOrders,
    }
  }, [categories.length, orders, products])

  const inventoryProducts = inventoryCatalog?.items ?? []
  const catalogProducts = catalogCatalog?.items ?? []
  const catalogBrandOptions = productBrandOptions
  const totalCatalogStock = useMemo(
    () => catalogProducts.reduce((sum, product) => sum + (product.quantityOnHand ?? product.stock), 0),
    [catalogProducts],
  )
  const activeCatalogProductsCount = useMemo(
    () => catalogProducts.filter((product) => getCatalogStatus(product).label === 'Active').length,
    [catalogProducts],
  )
  const filteredInventoryProducts = inventoryProducts
  const restockSelectableProducts = useMemo(() => {
    if (filteredInventoryProducts.length > 0) {
      return filteredInventoryProducts
    }

    return inventoryProducts
  }, [filteredInventoryProducts, inventoryProducts])
  const activeInventoryProductId = useMemo(() => {
    if (selectedInventoryProductId && restockSelectableProducts.some((product) => product.id === selectedInventoryProductId)) {
      return selectedInventoryProductId
    }

    return restockSelectableProducts[0]?.id ?? null
  }, [restockSelectableProducts, selectedInventoryProductId])

  useEffect(() => {
    if (selectedInventoryProductId && restockSelectableProducts.some((product) => product.id === selectedInventoryProductId)) {
      return
    }

    if (restockSelectableProducts.length > 0) {
      setSelectedInventoryProductId(restockSelectableProducts[0].id)
      return
    }

    setSelectedInventoryProductId(null)
  }, [restockSelectableProducts, selectedInventoryProductId])

  useEffect(() => {
    if (!isRestockModalOpen || selectedInventoryProductId) {
      return
    }

    const fallbackProductId = restockSelectableProducts[0]?.id ?? null

    if (!fallbackProductId) {
      return
    }

    setSelectedInventoryProductId(fallbackProductId)
  }, [isRestockModalOpen, restockSelectableProducts, selectedInventoryProductId])

  useEffect(() => {
    if (!isRestockModalOpen || selectedInventoryProductId) {
      return
    }

    setRestockForm(null)
    setRestockFormError(
      restockSelectableProducts.length
        ? 'Select a product row to continue with restock.'
        : 'No products are available for restock yet. Create a product first.',
    )
  }, [isRestockModalOpen, restockSelectableProducts, selectedInventoryProductId])

  const totalPages = inventoryCatalog?.totalPages ?? 1
  const totalCount = inventoryCatalog?.totalCount ?? 0
  const currentPage = Math.min(inventoryPage, totalPages)
  const catalogTotalPages = catalogCatalog?.totalPages ?? 1
  const catalogTotalCount = catalogCatalog?.totalCount ?? 0
  const currentCatalogPage = Math.min(catalogPage, catalogTotalPages)

  const totalInventoryUnits = useMemo(
    () => inventoryProducts.reduce((sum, product) => sum + (product.quantityOnHand ?? product.stock), 0),
    [inventoryProducts],
  )
  const totalInventoryValue = useMemo(
    () =>
      inventoryProducts.reduce(
        (sum, product) => sum + (product.quantityOnHand ?? product.stock) * (product.salePrice ?? product.price),
        0,
      ),
    [inventoryProducts],
  )

  useEffect(() => {
    if (inventoryPage <= totalPages) {
      return
    }

    setInventoryPage(totalPages)
  }, [inventoryPage, totalPages])

  useEffect(() => {
    if (catalogPage <= catalogTotalPages) {
      return
    }

    setCatalogPage(catalogTotalPages)
  }, [catalogPage, catalogTotalPages])

  const categoryPathById = useMemo(() => {
    const categoryMap = new Map(categories.map((category) => [category.id, category]))
    const pathMap = new Map<string, string>()

    for (const category of categories) {
      const parts = [category.name]
      let currentParentId = category.parentCategoryId ?? null
      while (currentParentId) {
        const parent = categoryMap.get(currentParentId)
        if (!parent) break
        parts.unshift(parent.name)
        currentParentId = parent.parentCategoryId ?? null
      }

      pathMap.set(category.id, parts.join(' / '))
    }

    return pathMap
  }, [categories])
  const restockCategoryName = useMemo(() => {
    if (!restockForm?.categoryId) {
      return restockDisplayProduct?.category ?? selectedInventoryProduct?.category ?? ''
    }

    return categoryPathById.get(restockForm.categoryId) ?? categories.find((category) => category.id === restockForm.categoryId)?.name ?? ''
  }, [categories, categoryPathById, restockDisplayProduct?.category, restockForm?.categoryId, selectedInventoryProduct?.category])
  const generatedRestockSku = useMemo(
    () =>
      buildAutoSku({
        productName: restockForm?.productName ?? restockDisplayProduct?.productName ?? selectedInventoryProduct?.name,
        brand: restockForm?.brand ?? selectedInventoryProduct?.brand ?? '',
        category: restockCategoryName,
        color: restockForm?.color ?? restockDisplayProduct?.color ?? '',
        size: restockForm?.size ?? restockDisplayProduct?.size ?? '',
        productId: selectedInventoryProductId ?? selectedInventoryProduct?.id ?? null,
      }),
    [
      restockCategoryName,
      restockDisplayProduct?.color,
      restockDisplayProduct?.productName,
      restockDisplayProduct?.size,
      restockForm?.brand,
      restockForm?.color,
      restockForm?.productName,
      restockForm?.size,
      selectedInventoryProduct?.brand,
      selectedInventoryProduct?.id,
      selectedInventoryProduct?.name,
      selectedInventoryProductId,
    ],
  )

  const onSubmit = handleSubmit(async (values) => {
    setProductSubmissionError(null)

    try {
      const persistedImageUrls =
        productImageFiles.length > 0
          ? await Promise.all(
              productImageFiles.map(async (image) => {
                if (image.imageUrl) {
                  return image.imageUrl
                }

                if (!image.file) {
                  return null
                }

                const uploadedUrl = await productService.uploadProductImage(image.file)
                return uploadedUrl
              }),
            )
          : []

      const normalizedImageUrls = persistedImageUrls.filter((imageUrl): imageUrl is string => Boolean(imageUrl))
      const resolvedSku = editingProduct
        ? values.sku.trim().toUpperCase() || generatedProductSku
        : generatedProductSku

      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim().toLowerCase(),
        brand: values.brand.trim(),
        color: values.color?.trim() || undefined,
        size: values.size?.trim() || undefined,
        status: values.status,
        sku: resolvedSku,
        description: values.description.trim(),
        categoryId: values.categoryId,
        imageUrl: normalizedImageUrls[0],
        images: normalizedImageUrls.map((imageUrl, index) => ({
            imageUrl,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        price: values.price,
        salePrice: values.salePrice ?? values.price,
        stockQuantity: editingProduct?.stockQuantity ?? 0,
        lowStockThreshold: values.lowStockThreshold,
        isActive: values.isActive,
        concurrencyStamp: editingProduct?.concurrencyStamp,
      }

      if (editingProduct) {
        await updateMutation.mutateAsync({ id: editingProduct.id, payload })
        setProductSuccessMessage(`${values.name.trim()} updated successfully.`)
        return
      }

      await createMutation.mutateAsync(payload)
      setProductSuccessMessage(`${values.name.trim()} added successfully.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save the product right now.'
      setProductSubmissionError(message)
      setAdminErrorMessage(message)
    }
  })

  const onCategorySubmit = handleCategorySubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim().toLowerCase(),
      parentCategoryId: values.parentCategoryId || null,
    }

    try {
      if (selectedCategory) {
        await updateCategoryMutation.mutateAsync({ id: selectedCategory.id, payload })
        setProductSuccessMessage(`${values.name.trim()} category updated successfully.`)
        setIsCategoryModalOpen(false)
        return
      }

      await createCategoryMutation.mutateAsync(payload)
      setProductSuccessMessage(`${values.name.trim()} category created successfully.`)
      setIsCategoryModalOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save the category right now.'
      setAdminErrorMessage(message)
    }
  })

  const clearUploadedProductPreviews = (images: UploadedProductImage[]) => {
    images.forEach((image) => {
      if (!image.isExisting && image.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(image.previewUrl)
      }
    })
  }

  const appendProductImageFiles = (nextImages: UploadedProductImage[]) => {
    setProductImageFiles((current) => [...current, ...nextImages])
  }

  const validateProductImageFiles = (files: File[]) => {
    if (files.length === 0) {
      return null
    }

    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
    const invalidFile = files.find((file) => !allowedTypes.has(file.type))
    if (invalidFile) {
      setProductImageFieldError('Only PNG, JPG, WEBP, and GIF files are allowed.')
      return null
    }

    const oversizedFile = files.find((file) => file.size > 10 * 1024 * 1024)
    if (oversizedFile) {
      setProductImageFieldError('Each image must be 10 MB or smaller.')
      return null
    }

    setProductImageFieldError(null)
    return files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
  }

  const handleProductImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    const nextImages = validateProductImageFiles(files)
    if (nextImages) {
      appendProductImageFiles(nextImages)
    }
    event.target.value = ''
  }

  const handleProductImageDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isProductImageDragActive) {
      setIsProductImageDragActive(true)
    }
  }

  const handleProductImageDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsProductImageDragActive(false)
  }

  const handleProductImageDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsProductImageDragActive(false)
    const files = Array.from(event.dataTransfer.files ?? [])
    const nextImages = validateProductImageFiles(files)
    if (nextImages) {
      appendProductImageFiles(nextImages)
    }
  }

  const removeProductImageAtIndex = (index: number) => {
    const targetImage = productImageFiles[index]
    if (!targetImage) {
      return
    }

    if (!targetImage.isExisting && targetImage.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(targetImage.previewUrl)
    }

    setProductImageFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const moveProductImage = (index: number, direction: 'left' | 'right') => {
    setProductImageFiles((current) => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const nextImages = [...current]
      const [movedImage] = nextImages.splice(index, 1)
      nextImages.splice(targetIndex, 0, movedImage)
      return nextImages
    })
  }

  const setPrimaryProductImage = (index: number) => {
    setProductImageFiles((current) => {
      if (index <= 0 || index >= current.length) {
        return current
      }

      const nextImages = [...current]
      const [selectedImage] = nextImages.splice(index, 1)
      nextImages.unshift(selectedImage)
      return nextImages
    })
  }

  const beginCreateProduct = () => {
    setProductSubmissionError(null)
    setProductSuccessMessage(null)
    setAdminErrorMessage(null)
    setDeleteConfirmState(null)
    setProductImageFieldError(null)
    setIsProductImageDragActive(false)
    setSelectedSlug(null)
    clearUploadedProductPreviews(productImageFiles)
    setProductImageFiles([])
    reset(defaultProductValues)
    setProductUnitCost('0')
    setProductProfitMargin('0')
    setIsProductModalOpen(true)
  }

  const closeProductModal = () => {
    setIsProductModalOpen(false)
    setProductSubmissionError(null)
    setProductSuccessMessage(null)
    setAdminErrorMessage(null)
    setDeleteConfirmState(null)
    setProductImageFieldError(null)
    setIsProductImageDragActive(false)
    setSelectedSlug(null)
    clearUploadedProductPreviews(productImageFiles)
    setProductImageFiles([])
    reset(defaultProductValues)
    setProductUnitCost('0')
    setProductProfitMargin('0')
  }

  const beginCreateCategory = () => {
    setSelectedCategoryId(null)
    resetCategory(defaultCategoryValues)
    setIsCategoryModalOpen(true)
  }

  const deleteInventoryProduct = async (productId: string, productName: string) => {
    try {
      await deleteMutation.mutateAsync(productId)
      setProductSuccessMessage(`${productName} deleted successfully.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to delete ${productName} right now.`
      setAdminErrorMessage(message)
      return
    }

    if (selectedInventoryProductId === productId) {
      const fallbackProduct = inventoryProducts.find((product) => product.id !== productId)
      setSelectedInventoryProductId(fallbackProduct?.id ?? null)
    }
  }

  const openDeleteConfirmation = (state: NonNullable<DeleteConfirmState>) => {
    setAdminErrorMessage(null)
    setDeleteConfirmState(state)
  }

  const closeDeleteConfirmation = () => {
    if (deleteMutation.isPending || deleteCategoryMutation.isPending) {
      return
    }

    setDeleteConfirmState(null)
  }

  const confirmDeleteAction = async () => {
    if (!deleteConfirmState) {
      return
    }

    if (deleteConfirmState.kind === 'product') {
      await deleteInventoryProduct(deleteConfirmState.productId, deleteConfirmState.productName)
      setDeleteConfirmState(null)
      return
    }

    try {
      await deleteCategoryMutation.mutateAsync(deleteConfirmState.categoryId)
      setProductSuccessMessage(`${deleteConfirmState.categoryName} category deleted successfully.`)
      setDeleteConfirmState(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to delete ${deleteConfirmState.categoryName} right now.`
      setAdminErrorMessage(message)
      setDeleteConfirmState(null)
    }
  }

  const deleteConfirmPending =
    deleteConfirmState?.kind === 'product'
      ? deleteMutation.isPending
      : deleteConfirmState?.kind === 'category'
        ? deleteCategoryMutation.isPending
        : false

  const updateRestockForm = (patch: Partial<RestockFormState>) => {
    setRestockForm((current) => (current ? { ...current, ...patch } : current))
  }

  const closeRestockModal = () => {
    setIsRestockModalOpen(false)
    setRestockForm(null)
    setRestockFormError(null)
    setRestockQtyToAdd('0')
  }

  const syncPriceFromMargin = (unitCostValue: string, marginValue: string) => {
    const normalizedUnitCost = Number(unitCostValue)
    const normalizedMargin = Number(marginValue)

    if (!Number.isFinite(normalizedUnitCost) || normalizedUnitCost < 0 || !Number.isFinite(normalizedMargin) || normalizedMargin < 0) {
      return
    }

    const computedPrice = normalizedUnitCost * (1 + normalizedMargin / 100)
    const roundedPrice = Number(computedPrice.toFixed(2))
    setValue('price', roundedPrice, { shouldDirty: true, shouldValidate: true })
    setValue('salePrice', roundedPrice, { shouldDirty: true, shouldValidate: true })
  }

  const submitInventoryAdjustment = async () => {
    const resolvedInventoryProductId =
      selectedInventoryProductId ??
      activeInventoryProductId ??
      restockSelectableProducts[0]?.id ??
      null

    if (!resolvedInventoryProductId) {
      setRestockFormError('Create a product first before adding restock.')
      return
    }

    if (!restockForm || !restockDisplayProduct) {
      setRestockFormError('Restock details are still loading. Please wait a moment and try again.')
      return
    }

    if (!restockProductDetail) {
      setRestockFormError('Product details are still syncing. Please wait a moment and try again.')
      return
    }

    if (!selectedInventorySnapshot) {
      setRestockFormError('Live stock data is still syncing. Please wait a moment and try again.')
      return
    }

    const cleanQty = restockQtyToAdd.toString().replace(/,/g, '')
    const cleanThreshold = restockForm.lowStockThreshold.toString().replace(/,/g, '')

    const qtyToAdd = Number(cleanQty)
    const qtyOnHand = selectedInventorySnapshot.qtyOnHand + Math.max(0, qtyToAdd || 0)
    const qtyReserved = selectedInventorySnapshot.qtyReserved
    const lowStockThreshold = Number(cleanThreshold)

    if (
      Number.isNaN(qtyToAdd) ||
      Number.isNaN(qtyOnHand) ||
      Number.isNaN(qtyReserved) ||
      Number.isNaN(lowStockThreshold) ||
      qtyToAdd < 0 ||
      qtyOnHand < 0 ||
      qtyReserved < 0 ||
      lowStockThreshold < 0
    ) {
      setRestockFormError('Quantity to add and reorder level must be valid numbers (0 or more).')
      return
    }

    if (qtyReserved > qtyOnHand) {
      setRestockFormError('Reserved stock cannot be greater than current stock.')
      return
    }

    setRestockFormError(null)

    try {
      await adjustInventoryMutation.mutateAsync({
        productId: resolvedInventoryProductId,
        qtyOnHand,
        qtyReserved,
        note: restockForm.note.trim() || undefined,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products-page'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-product-detail', 'restock', selectedInventoryProduct?.slug] }),
        queryClient.invalidateQueries({ queryKey: ['admin-product-inventory', resolvedInventoryProductId] }),
      ])
      closeRestockModal()
      setProductSuccessMessage(`${restockForm.productName.trim()} restocked successfully.`)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to add restock right now. Please make sure the backend was restarted after the inventory quantity update.'

      setRestockFormError(message)
      setAdminErrorMessage(message)
    }
  }

  const openRestockModalForProduct = (productId?: string | null) => {
    if (restockSelectableProducts.length === 0) {
      setIsRestockModalOpen(false)
      setRestockForm(null)
      setRestockFormError('Create a product first before adding restock.')
      return
    }

    setRestockForm(null)
    setRestockFormError(null)
    setRestockQtyToAdd('0')

    if (productId) {
      setSelectedInventoryProductId(productId)
    } else {
      const fallbackProductId =
        selectedInventoryProductId ??
        restockSelectableProducts[0]?.id ??
        null

      if (fallbackProductId) {
        setSelectedInventoryProductId(fallbackProductId)
      }
    }

    setIsRestockModalOpen(true)
  }

  const productFormFields = (
    <>
      <div className="space-y-7">
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5b5cf0]">
              <PackagePlus className="h-4 w-4" />
            </div>
            <h3 className="text-xl font-medium text-foreground">Basic Information</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Product Name *</span>
              <Input {...register('name')} placeholder="e.g. Classic Cotton Tee" className="h-12 rounded-xl border-[#dbe4f0] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)]" />
              {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
            </label>
            <div className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">SKU</span>
                <Input
                  {...register('sku')}
                  value={generatedProductSku || ''}
                  readOnly
                  placeholder="Auto-generated"
                  className="h-12 rounded-xl border-[#dbe4f0] bg-[#f8fafc] shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
                />
              <p className="text-xs text-muted-foreground">Auto-generated in sequence format like PROD-01.</p>
              {errors.sku ? <p className="text-xs text-destructive">{errors.sku.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-5">
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Slug *</span>
              <Input
                {...register('slug')}
                placeholder="classic-cotton-tee"
                readOnly={!editingProduct}
                className={`h-12 rounded-xl border-[#dbe4f0] shadow-[0_4px_14px_rgba(15,23,42,0.06)] ${
                  editingProduct ? 'bg-white' : 'bg-[#f8fafc]'
                }`}
              />
              <p className="text-xs text-muted-foreground">
                {editingProduct ? 'You can still adjust the slug while editing.' : 'Auto-generated from the product name.'}
              </p>
              {errors.slug ? <p className="text-xs text-destructive">{errors.slug.message}</p> : null}
            </label>
          </div>
        </section>

        <div className="border-t border-[#edf1f6]" />

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5b5cf0]">
              <FolderTree className="h-4 w-4" />
            </div>
            <h3 className="text-xl font-medium text-foreground">Classification</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Brand *</span>
              <select {...register('brand')} className="h-12 w-full rounded-xl border border-[#dbe4f0] bg-white px-4 text-base shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                <option value="">Select brand</option>
                {productBrandOptions.map((brandOption) => (
                  <option key={brandOption} value={brandOption}>{brandOption}</option>
                ))}
              </select>
              {errors.brand ? <p className="text-xs text-destructive">{errors.brand.message}</p> : null}
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Category *</span>
              <select {...register('categoryId')} className="h-12 w-full rounded-xl border border-[#dbe4f0] bg-white px-4 text-base shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {errors.categoryId ? <p className="text-xs text-destructive">{errors.categoryId.message}</p> : null}
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Color</span>
              <select {...register('color')} className="h-12 w-full rounded-xl border border-[#dbe4f0] bg-white px-4 text-base shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                <option value="">Select color</option>
                {productColorOptions.map((colorOption) => (
                  <option key={colorOption} value={colorOption}>{colorOption}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="border-t border-[#edf1f6]" />

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5b5cf0]">
              <Boxes className="h-4 w-4" />
            </div>
            <h3 className="text-xl font-medium text-foreground">Available Sizes</h3>
          </div>

          <div className="flex flex-wrap gap-3">
            {productSizeOptions.map((sizeOption) => {
              const selectedSizes = (watchedProductSize ?? '').split(',').map((item) => item.trim()).filter(Boolean)
              const checked = selectedSizes.includes(sizeOption)
              return (
                <button
                  key={sizeOption}
                  type="button"
                  onClick={() => {
                    const nextSizes = checked
                      ? selectedSizes.filter((item) => item !== sizeOption)
                      : [...selectedSizes, sizeOption]
                    setValue('size', nextSizes.join(', '), { shouldDirty: true, shouldValidate: true })
                  }}
                  className={`min-w-14 rounded-2xl border px-5 py-3 text-lg font-medium transition ${
                    checked
                      ? 'border-[#5b5cf0] bg-[#eef1ff] text-[#4c4ddd]'
                      : 'border-[#dbe4f0] bg-white text-[#64748b] hover:border-[#c7d4e6]'
                  }`}
                >
                  {sizeOption}
                </button>
              )
            })}
          </div>
        </section>

        <div className="border-t border-[#edf1f6]" />

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5b5cf0]">
              <ClipboardList className="h-4 w-4" />
            </div>
            <h3 className="text-xl font-medium text-foreground">Pricing & Inventory</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Unit Cost</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={productUnitCost}
                onChange={(event) => {
                  setProductUnitCost(event.target.value)
                  syncPriceFromMargin(event.target.value, productProfitMargin)
                }}
                className="h-12 rounded-xl border-[#dbe4f0] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Profit Margin %</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={productProfitMargin}
                onChange={(event) => {
                  setProductProfitMargin(event.target.value)
                  syncPriceFromMargin(productUnitCost, event.target.value)
                }}
                className="h-12 rounded-xl border-[#dbe4f0] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Base Price *</span>
              <Input type="number" step="0.01" {...register('price')} readOnly className="h-12 rounded-xl border-[#dbe4f0] bg-[#f8fafc] shadow-[0_4px_14px_rgba(15,23,42,0.06)]" />
              {errors.price ? <p className="text-xs text-destructive">{errors.price.message}</p> : <p className="text-xs text-muted-foreground">Auto-computed from unit cost and profit margin.</p>}
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Sales Price</span>
              <Input type="number" step="0.01" {...register('salePrice')} readOnly className="h-12 rounded-xl border-[#dbe4f0] bg-[#f8fafc] shadow-[0_4px_14px_rgba(15,23,42,0.06)]" />
              <p className="text-xs text-muted-foreground">This matches the computed selling price automatically.</p>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Status</span>
              <select {...register('status')} className="h-12 w-full rounded-xl border border-[#dbe4f0] bg-white px-4 text-base shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="OutOfStock">Out of stock</option>
                <option value="Archived">Archived</option>
              </select>
              {errors.status ? <p className="text-xs text-destructive">{errors.status.message}</p> : null}
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Low-stock Alert</span>
              <Input type="number" step="1" {...register('lowStockThreshold')} className="h-12 rounded-xl border-[#dbe4f0] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)]" />
            </label>
          </div>
        </section>

        <div className="border-t border-[#edf1f6]" />

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5b5cf0]">
              <Grid2X2 className="h-4 w-4" />
            </div>
            <h3 className="text-xl font-medium text-foreground">Media</h3>
          </div>

          <label
            className={`block space-y-3 rounded-2xl border-2 border-dashed px-4 py-4 text-sm transition ${
              isProductImageDragActive
                ? 'border-[#5b5cf0] bg-[#eef1ff]'
                : 'border-[#dbe4f0] bg-[#f8fafc]'
            }`}
            onDragOver={handleProductImageDragOver}
            onDragLeave={handleProductImageDragLeave}
            onDrop={handleProductImageDrop}
          >
            <span className="font-medium uppercase tracking-[0.14em] text-[#6b7f9d]">Product Images</span>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={handleProductImageSelection}
              className="h-12 rounded-xl border-[#dbe4f0] bg-white file:mr-4 file:rounded-lg file:border-0 file:bg-[#eef1ff] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#4c4ddd] shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
            />
            <p className="text-xs text-muted-foreground">
              Drag product images here or browse from your device. New uploads are added to the current gallery. The first image becomes the primary storefront image. Max 10 MB each.
            </p>
            {productImageFieldError ? <p className="text-xs text-destructive">{productImageFieldError}</p> : null}
          </label>

          {productImageFiles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productImageFiles.map((image, index) => (
                <div key={`${image.previewUrl}-${index}`} className="overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                  <div className="relative aspect-square bg-[#f8fafc]">
                    <img src={image.previewUrl} alt={`Product preview ${index + 1}`} className="h-full w-full object-cover" />
                    {index === 0 ? (
                      <span className="absolute left-3 top-3 rounded-full bg-[#2563eb] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-white">
                        Primary
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-3 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm text-muted-foreground">
                        {image.file?.name ?? `Current image ${index + 1}`}
                      </p>
                      {index !== 0 ? (
                        <Button type="button" variant="outline" className="rounded-xl border-[#dbe4f0]" onClick={() => setPrimaryProductImage(index)}>
                          Set Primary
                        </Button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="rounded-xl border-[#dbe4f0]"
                        disabled={index === 0}
                        onClick={() => moveProductImage(index, 'left')}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="rounded-xl border-[#dbe4f0]"
                        disabled={index === productImageFiles.length - 1}
                        onClick={() => moveProductImage(index, 'right')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" className="rounded-xl border-[#dbe4f0]" onClick={() => removeProductImageAtIndex(index)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <div className="border-t border-[#edf1f6]" />

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5b5cf0]">
              <ClipboardList className="h-4 w-4" />
            </div>
            <h3 className="text-xl font-medium text-foreground">Description</h3>
          </div>

          <label className="space-y-2 text-sm">
            <textarea
              {...register('description')}
              className="min-h-32 w-full rounded-2xl border border-[#dbe4f0] bg-white px-4 py-3 text-sm outline-none shadow-[0_4px_14px_rgba(15,23,42,0.06)] focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Write a brief product description..."
            />
            {errors.description ? <p className="text-xs text-destructive">{errors.description.message}</p> : null}
          </label>
        </section>

        <div className="border-t border-[#edf1f6]" />

        <label className="flex items-center gap-3 rounded-2xl border border-[#dbe4f0] px-4 py-4 text-sm">
          <input type="checkbox" {...register('isActive')} className="h-4 w-4" />
          <span>
            <span className="font-medium">Visible in storefront</span>
            <span className="block text-muted-foreground">Turn this off to keep the product out of the public catalog.</span>
          </span>
        </label>

        {productSubmissionError ? <p className="text-sm text-destructive">{productSubmissionError}</p> : null}

        <div className="flex flex-col gap-4 border-t border-[#edf1f6] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground"><span className="text-destructive">*</span> Required fields</p>
          <div className="flex flex-wrap justify-end gap-3">
            {editingProduct ? (
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  openDeleteConfirmation({
                    kind: 'product',
                    productId: editingProduct.id,
                    productName: editingProduct.name,
                    source: 'product-modal',
                  })
                }
              >
                <img src={deleteIcon} alt="" className="h-[1.05rem] w-[1.05rem] object-contain opacity-90" aria-hidden="true" />
                Delete
              </Button>
            ) : null}
            <Button type="button" variant="outline" className="min-w-28 rounded-xl border-[#dbe4f0]" onClick={closeProductModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-w-36 rounded-xl bg-[#2563eb] text-sm font-medium text-white hover:bg-[#1d4ed8]"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {editingProduct ? 'Save Product' : 'Add Product'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <section className="mx-auto max-w-[1380px] px-7 py-8 lg:px-10 lg:py-10">
      {adminView === 'overview' ? (
        <AdminPageIntro
          kicker="Dashboard"
          title="Overview"
          description="Monitor sales performance, inventory health, and order activity at a glance."
        />
      ) : null}
      {adminView === 'inventory' ? (
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)]">
            <Grid2X2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-[2rem] font-semibold leading-tight text-foreground">Clothing Manager</h1>
            <p className="text-[1.05rem] text-muted-foreground">Manage catalog, inventory & restocks</p>
          </div>
        </div>
      ) : null}
      {adminView === 'catalog' ? (
        <AdminPageIntro
          kicker="Admin"
          title="Catalog"
          description="Manage product details, media, pricing, visibility, and categories."
        />
      ) : null}
      {adminView === 'orders' ? (
        <AdminPageIntro
          kicker="Admin"
          title="Orders"
          description="Review recent orders and update fulfillment status."
        />
      ) : null}

      {adminView === 'overview' ? (
        <Suspense
          fallback={
            <div className="mt-8 flex min-h-[320px] items-center justify-center rounded-[26px] border border-[#dbe4f0] bg-white">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading overview
              </div>
            </div>
          }
        >
          <AdminOverviewPanel overview={overview} />
        </Suspense>
      ) : null}

      {adminView === 'inventory' ? (
        <InventorySection
          search={search}
          onSearchChange={(value) => {
            setSearch(value)
            setInventoryPage(1)
          }}
          categoryFilter={categoryFilter}
          onCategoryChange={(value) => {
            setCategoryFilter(value)
            setInventoryPage(1)
          }}
          statusFilter={statusFilter}
          onStatusChange={(value) => {
            setStatusFilter(value)
            setInventoryPage(1)
          }}
          categories={categories}
          products={filteredInventoryProducts}
          loading={inventoryProductsLoading}
          totalCount={totalCount}
          totalUnits={totalInventoryUnits}
          totalValue={totalInventoryValue}
          onOpenRestock={openRestockModalForProduct}
          selectedInventoryProductId={selectedInventoryProductId}
          onSelectProduct={setSelectedInventoryProductId}
          onDeleteProduct={(productId, productName) =>
            openDeleteConfirmation({
              kind: 'product',
              productId,
              productName,
              source: 'inventory',
            })
          }
          deletePending={deleteMutation.isPending}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredInventoryProducts.length}
          onPreviousPage={() => setInventoryPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setInventoryPage((current) => Math.min(totalPages, current + 1))}
        />
      ) : null}

      {adminView === 'catalog' ? (
        <div className="mt-8 grid gap-6">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-[22px] border border-[#dbe4f0] bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563eb]">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[1.02rem] text-[#60748f]">Total Products</p>
                  <p className="mt-1 text-[2.15rem] font-medium leading-none text-foreground">{catalogTotalCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[22px] border border-[#dbe4f0] bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563eb]">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[1.02rem] text-[#60748f]">Active Products</p>
                  <p className="mt-1 text-[2.15rem] font-medium leading-none text-foreground">{activeCatalogProductsCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[22px] border border-[#dbe4f0] bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563eb]">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[1.02rem] text-[#60748f]">Total Stock</p>
                  <p className="mt-1 text-[2.15rem] font-medium leading-none text-foreground">{totalCatalogStock}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#dbe4f0] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
            <div className="border-b border-[#e8eef6] px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2563eb]">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <h2 className="text-[1.7rem] font-medium text-foreground">Product Catalog</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-[#dbe4f0] bg-white px-5 text-sm font-medium text-[#0f172a] hover:bg-[#f8fbff]"
                    onClick={beginCreateCategory}
                  >
                    <FolderTree className="h-4 w-4 text-[#2563eb]" />
                    Manage Categories
                  </Button>
                  <Button
                    onClick={beginCreateProduct}
                    className="h-11 rounded-xl bg-[#2563eb] px-6 text-sm font-medium tracking-[0.01em] text-white hover:bg-[#1d4ed8]"
                  >
                    <PackagePlus className="h-4 w-4" />
                    Add Product
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr,190px,190px]">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={catalogSearch}
                    onChange={(event) => {
                      setCatalogSearch(event.target.value)
                      setCatalogPage(1)
                    }}
                    placeholder="Search products..."
                    className="h-12 rounded-xl border-[#dbe4f0] pl-11 text-base shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
                  />
                </label>
              <select
                value={catalogCategoryFilter}
                onChange={(event) => {
                  setCatalogCategoryFilter(event.target.value)
                  setCatalogPage(1)
                }}
                className="h-12 rounded-xl border border-[#dbe4f0] bg-white px-4 text-base shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
              >
                  <option value="All Categories">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>{category.name}</option>
                  ))}
                </select>
                <select
                  value={catalogBrandFilter}
                  onChange={(event) => {
                    setCatalogBrandFilter(event.target.value)
                    setCatalogPage(1)
                  }}
                  className="h-12 rounded-xl border border-[#dbe4f0] bg-white px-4 text-base shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
                >
                  <option>All Brands</option>
                  {catalogBrandOptions.map((brand) => (
                    <option key={brand}>{brand}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {catalogProductsLoading ? (
                <div className="grid gap-5 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="overflow-hidden rounded-[24px] border border-[#dbe4f0] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                      <div className="h-[330px] animate-pulse bg-[#eef3f9]" />
                      <div className="space-y-4 px-5 py-5">
                        <div className="h-7 w-2/3 animate-pulse rounded bg-[#e9eef5]" />
                        <div className="h-5 w-1/2 animate-pulse rounded bg-[#eef3f9]" />
                        <div className="h-4 w-full animate-pulse rounded bg-[#eef3f9]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : catalogTotalCount === 0 &&
                debouncedCatalogSearch.length === 0 &&
                catalogCategoryFilter === 'All Categories' &&
                catalogBrandFilter === 'All Brands' ? (
                <div className="rounded-[22px] border border-dashed border-[#dbe4f0] px-6 py-12 text-center text-muted-foreground">
                  No products yet. Start by adding your first product.
                </div>
              ) : catalogProducts.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#dbe4f0] px-6 py-12 text-center text-muted-foreground">
                  No products match the current filters.
                </div>
              ) : (
                <>
                <div className="grid gap-5 xl:grid-cols-3">
                  {catalogProducts.map((product) => {
                    const status = getCatalogStatus(product)
                    const quantity = product.quantityOnHand ?? product.stock
                    const displayPrice = product.salePrice ?? product.price
                    const sizeList = product.size
                      ? product.size.split(',').map((item) => item.trim()).filter(Boolean)
                      : []

                    return (
                      <article
                        key={product.id}
                        className="overflow-hidden rounded-[24px] border border-[#dbe4f0] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.10)]"
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            setProductSubmissionError(null)
                            setSelectedSlug(product.slug)
                            setIsProductModalOpen(true)
                          }}
                          className="block w-full text-left"
                        >
                          <div className={`relative flex h-[330px] items-center justify-center overflow-hidden bg-[#eef3f9] ${product.imageSurfaceClassName ?? ''}`}>
                            <span className={`absolute left-4 top-4 inline-flex rounded-xl border px-3 py-1.5 text-sm font-medium ${status.className}`}>
                              {status.label}
                            </span>
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className={`h-full w-full ${product.imageFit === 'contain' ? 'object-contain p-8' : 'object-cover'} ${product.imagePositionClassName ?? ''}`}
                              />
                            ) : (
                              <Boxes className="h-16 w-16 text-[#b6c3d5]" />
                            )}
                          </div>
                        </button>

                        <div className="space-y-4 px-5 py-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[1.65rem] font-medium leading-tight text-foreground">{product.name}</p>
                              <p className="mt-1 text-[1.02rem] text-muted-foreground">
                                {(product.brand || 'No brand')} · {product.category}
                              </p>
                            </div>
                            <p className="text-[1.65rem] font-medium text-foreground">{formatCurrency(displayPrice)}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            {product.color ? (
                              <span className="inline-flex rounded-xl bg-[#eef2f7] px-3 py-1.5 text-foreground">
                                {product.color}
                              </span>
                            ) : null}
                            <span className="font-mono text-xs tracking-[0.08em] text-muted-foreground">
                              {product.sku ?? product.slug}
                            </span>
                          </div>

                          <div className="border-t border-[#edf1f6] pt-4">
                            <div className="flex items-center justify-between gap-4 text-[1.02rem]">
                              <div className="flex flex-wrap gap-2 text-muted-foreground">
                                {sizeList.length > 0 ? sizeList.map((size) => <span key={size}>{size}</span>) : <span>No sizes</span>}
                              </div>
                              <span className="font-medium text-foreground">
                                {quantity} in stock
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[1.02rem] text-muted-foreground">
                    Page {currentCatalogPage} of {catalogTotalPages} · {catalogTotalCount} items
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl border-[#dbe4f0] bg-white text-muted-foreground"
                      disabled={catalogPage <= 1}
                      onClick={() => setCatalogPage((current) => Math.max(1, current - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl border-[#dbe4f0] bg-white text-muted-foreground"
                      disabled={currentCatalogPage >= catalogTotalPages}
                      onClick={() => setCatalogPage((current) => Math.min(catalogTotalPages, current + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {adminView === 'orders' ? (
        <AdminOrdersSection
          orders={orders}
          statusVariant={statusVariant}
          formatCurrency={formatCurrency}
          renderStatusEditor={(order) => <OrderStatusEditor order={order} />}
          onViewSmsHistory={(orderId) => setSelectedOrderIdForSms(orderId)}
        />
      ) : null}

      <AdminSmsHistoryModal
        orderId={selectedOrderIdForSms}
        open={Boolean(selectedOrderIdForSms)}
        onClose={() => setSelectedOrderIdForSms(null)}
      />

      <AdminRestockModal
        open={isRestockModalOpen}
        onClose={closeRestockModal}
        inventorySnapshotLoading={inventorySnapshotLoading}
        restockSelectableProductsLength={restockSelectableProducts.length}
        restockForm={restockForm}
        restockDisplayProduct={restockDisplayProduct}
        restockBrandOptions={restockBrandOptions}
        restockColorOptions={restockColorOptions}
        categories={categories}
        generatedRestockSku={generatedRestockSku}
        restockQtyToAdd={restockQtyToAdd}
        setRestockQtyToAdd={setRestockQtyToAdd}
        updateRestockForm={updateRestockForm}
        restockFormError={restockFormError}
        isSubmitting={adjustInventoryMutation.isPending}
        onSubmit={() => void submitInventoryAdjustment()}
      />

      <Suspense fallback={null}>
        <AdminProductModal
          open={isProductModalOpen}
          editingProduct={editingProduct}
          editingProductLoading={editingProductLoading}
          onClose={closeProductModal}
          onSubmit={onSubmit}
        >
          {productFormFields}
        </AdminProductModal>
      </Suspense>

      <Dialog
        open={isCategoryModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCategoryModalOpen(false)
          }
        }}
      >
        <DialogContent className="max-w-5xl border-[#dbe4f0] bg-white p-0 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
          <DialogHeader className="border-b border-[#e8eef6] px-6 py-5 text-left">
            <DialogTitle className="text-[1.55rem] font-semibold text-[#0f172a]">
              {selectedCategory ? 'Edit category' : 'Create category'}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#64748b]">
              Manage storefront categories and hierarchy separately from product creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(category.id)
                      setIsCategoryModalOpen(true)
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      selectedCategoryId === category.id
                        ? 'border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]'
                        : 'border-[#dbe4f0] bg-white text-[#0f172a] hover:border-[#bfdbfe] hover:bg-[#f8fbff]'
                    }`}
                  >
                    {categoryPathById.get(category.id) ?? category.name}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[#dbe4f0]"
                onClick={beginCreateCategory}
              >
                New category
              </Button>
            </div>

            <form className="space-y-4" onSubmit={onCategorySubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-[#0f172a]">Name</span>
                  <Input {...registerCategory('name')} className="rounded-xl border-[#dbe4f0]" />
                  {categoryErrors.name ? <p className="text-xs text-destructive">{categoryErrors.name.message}</p> : null}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-[#0f172a]">Slug</span>
                  <Input {...registerCategory('slug')} className="rounded-xl border-[#dbe4f0]" />
                  {categoryErrors.slug ? <p className="text-xs text-destructive">{categoryErrors.slug.message}</p> : null}
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[#0f172a]">Parent category</span>
                <select
                  {...registerCategory('parentCategoryId')}
                  className="h-11 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 text-sm text-[#0f172a]"
                >
                  <option value="">No parent</option>
                  {categories
                    .filter((category) => category.id !== selectedCategoryId)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  type="submit"
                  className="rounded-xl bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                  disabled={categorySubmitting || createCategoryMutation.isPending || updateCategoryMutation.isPending}
                >
                  {selectedCategory ? 'Save category' : 'Create category'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-[#dbe4f0]"
                  onClick={beginCreateCategory}
                >
                  Reset
                </Button>
                {selectedCategory ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-xl"
                    disabled={deleteCategoryMutation.isPending}
                    onClick={() =>
                      openDeleteConfirmation({
                        kind: 'category',
                        categoryId: selectedCategory.id,
                        categoryName: selectedCategory.name,
                      })
                    }
                  >
                    <img src={deleteIcon} alt="" className="h-[1.05rem] w-[1.05rem] object-contain opacity-90" aria-hidden="true" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={Boolean(deleteConfirmState)}
        title="Confirm delete"
        message={
          deleteConfirmState
            ? deleteConfirmState.kind === 'product'
              ? `Delete ${deleteConfirmState.productName}? This will remove it from the active admin lists and storefront.`
              : `Delete ${deleteConfirmState.categoryName}? This action cannot be undone.`
            : ''
        }
        confirmLabel={deleteConfirmPending ? 'Deleting' : 'Delete'}
        pending={deleteConfirmPending}
        onCancel={closeDeleteConfirmation}
        onConfirm={() => void confirmDeleteAction()}
        icon={ShieldAlert}
      />

      <AdminFeedbackDialog
        open={Boolean(productSuccessMessage)}
        title="Success"
        message={productSuccessMessage ?? ''}
        actionLabel="OK"
        onClose={() => setProductSuccessMessage(null)}
        icon={CircleCheckBig}
        tone="success"
      />

      <AdminFeedbackDialog
        open={Boolean(adminErrorMessage)}
        title="Something went wrong"
        message={adminErrorMessage ?? ''}
        actionLabel="Close"
        onClose={() => setAdminErrorMessage(null)}
        icon={ShieldAlert}
        tone="error"
      />
    </section>
  )
}
