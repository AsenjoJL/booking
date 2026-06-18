import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  EyeOff,
  FolderTree,
  LoaderCircle,
  PackagePlus,
  PencilLine,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { categoryService } from '@/services/categoryService'
import { orderService } from '@/services/orderService'
import { productService } from '@/services/productService'
import type { Order, OrderStatus } from '@/types/order'
import { formatCurrency } from '@/utils/format'

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'muted'> = {
  Pending: 'muted',
  PendingPayment: 'muted',
  Confirmed: 'secondary',
  Processing: 'secondary',
  Paid: 'default',
  Shipped: 'secondary',
  Delivered: 'outline',
  Cancelled: 'outline',
  Expired: 'outline',
  Refunded: 'outline',
}

const statusOptionsByCurrent: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Pending', 'Confirmed', 'Cancelled', 'Expired'],
  PendingPayment: ['PendingPayment', 'Confirmed', 'Cancelled', 'Expired'],
  Confirmed: ['Confirmed', 'Processing', 'Cancelled', 'Expired'],
  Processing: ['Processing', 'Shipped', 'Cancelled'],
  Paid: ['Paid', 'Processing', 'Cancelled'],
  Shipped: ['Shipped', 'Delivered', 'Cancelled'],
  Delivered: ['Delivered', 'Refunded'],
  Cancelled: ['Cancelled'],
  Expired: ['Expired'],
  Refunded: ['Refunded'],
}

const productSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  slug: z.string().trim().min(3, 'Slug must be at least 3 characters'),
  description: z.string().trim().min(12, 'Description must be at least 12 characters'),
  categoryId: z.string().uuid('Choose a category'),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), 'Enter a valid image URL'),
  imageUrls: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        value
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
          .every((item) => /^https?:\/\//i.test(item)),
      'Each image URL must be a valid http or https URL',
    ),
  price: z.coerce.number().positive('Price must be greater than 0'),
  salePrice: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number().nonnegative('Sale price must be 0 or more').optional(),
  ),
  stockQuantity: z.coerce
    .number()
    .int('Stock must be a whole number')
    .min(0, 'Stock must be 0 or more'),
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

const defaultProductValues: ProductFormValues = {
  name: '',
  slug: '',
  description: '',
  categoryId: '',
  imageUrl: '',
  imageUrls: '',
  price: 0,
  salePrice: undefined,
  stockQuantity: 0,
  isActive: true,
}

const defaultCategoryValues: CategoryFormValues = {
  name: '',
  slug: '',
  parentCategoryId: '',
}

function OrderStatusEditor({ order }: { order: Order }) {
  const queryClient = useQueryClient()
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
    <div className="flex items-center gap-2">
      <select
        aria-label={`Update order ${order.id} status`}
        className="h-9 rounded-md border bg-background px-3 text-sm"
        defaultValue={order.status}
        disabled={mutation.isPending}
        onChange={(event) => mutation.mutate(event.target.value as OrderStatus)}
      >
        {statusOptionsByCurrent[order.status].map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
    </div>
  )
}

export default function AdminDashboard() {
  const queryClient = useQueryClient()
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'active' | 'hidden'>('all')
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({})
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 8

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => orderService.getAllOrders(),
  })

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productService.getAdminProducts(),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  })

  const { data: editingProduct, isFetching: editingProductLoading } = useQuery({
    queryKey: ['admin-product-detail', selectedSlug],
    queryFn: () => productService.getAdminProductBySlug(selectedSlug!),
    enabled: Boolean(selectedSlug),
  })

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  )

  const {
    register,
    handleSubmit,
    reset,
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

  useEffect(() => {
    if (!editingProduct) {
      return
    }

    reset({
      name: editingProduct.name,
      slug: editingProduct.slug,
      description: editingProduct.description,
      categoryId: editingProduct.categoryId,
      imageUrl: editingProduct.imageUrl ?? '',
      imageUrls: editingProduct.images
        ?.sort((left, right) => left.sortOrder - right.sortOrder)
        .map((image) => image.imageUrl)
        .join('\n') ?? editingProduct.imageUrl ?? '',
      price: editingProduct.price,
      salePrice: editingProduct.salePrice ?? undefined,
      stockQuantity: editingProduct.stockQuantity,
      isActive: editingProduct.isActive,
    })
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

  const createMutation = useMutation({
    mutationFn: productService.createProduct,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
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
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
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

  const bulkStockMutation = useMutation({
    mutationFn: productService.bulkUpdateStock,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
    },
  })

  const bulkVisibilityMutation = useMutation({
    mutationFn: productService.bulkUpdateVisibility,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
      setSelectedProductIds([])
    },
  })

  const metrics = useMemo(() => {
    const hiddenCount = products.filter((product) => !product.isActive).length
    const lowStockCount = products.filter((product) => product.stock <= 10).length
    const pendingOrders = orders.filter((order) =>
      ['Pending', 'PendingPayment', 'Confirmed', 'Processing'].includes(order.status),
    ).length

    return [
      { label: 'SKUs', value: String(products.length), icon: Boxes },
      { label: 'Categories', value: String(categories.length), icon: FolderTree },
      { label: 'Low stock', value: String(lowStockCount), icon: ShieldAlert },
      { label: 'Hidden', value: String(hiddenCount), icon: EyeOff },
      { label: 'Open orders', value: String(pendingOrders), icon: ClipboardList },
    ]
  }, [categories.length, orders, products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        search.trim().length === 0 ||
        product.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        product.slug.toLowerCase().includes(search.trim().toLowerCase())
      const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter
      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'active' && product.isActive) ||
        (visibilityFilter === 'hidden' && !product.isActive)

      return matchesSearch && matchesCategory && matchesVisibility
    })
  }, [categoryFilter, products, search, visibilityFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [currentPage, filteredProducts])

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.stock <= 10).slice(0, 6),
    [products],
  )

  const selectedProducts = useMemo(
    () => filteredProducts.filter((product) => selectedProductIds.includes(product.id)),
    [filteredProducts, selectedProductIds],
  )

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

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim().toLowerCase(),
      description: values.description.trim(),
      categoryId: values.categoryId,
      imageUrl: values.imageUrl?.trim() || undefined,
      images: values.imageUrls
        ?.split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((imageUrl, index) => ({
          imageUrl,
          isPrimary: index === 0,
          sortOrder: index,
        })),
      price: values.price,
      salePrice: values.salePrice,
      stockQuantity: values.stockQuantity,
      isActive: values.isActive,
      concurrencyStamp: editingProduct?.concurrencyStamp,
    }

    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, payload })
      return
    }

    await createMutation.mutateAsync(payload)
  })

  const onCategorySubmit = handleCategorySubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim().toLowerCase(),
      parentCategoryId: values.parentCategoryId || null,
    }

    if (selectedCategory) {
      await updateCategoryMutation.mutateAsync({ id: selectedCategory.id, payload })
      return
    }

    await createCategoryMutation.mutateAsync(payload)
  })

  const beginCreateProduct = () => {
    setSelectedSlug(null)
    reset(defaultProductValues)
  }

  const beginCreateCategory = () => {
    setSelectedCategoryId(null)
    resetCategory(defaultCategoryValues)
  }

  const applyBulkStock = async () => {
    const items = lowStockProducts.map((product) => ({
      productId: product.id,
      stockQuantity: Number(stockDrafts[product.id] ?? product.stock),
      concurrencyStamp: product.concurrencyStamp,
    }))

    await bulkStockMutation.mutateAsync(items)
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )
  }

  const togglePageSelection = () => {
    const pageIds = pagedProducts.map((product) => product.id)
    const allSelected = pageIds.every((id) => selectedProductIds.includes(id))

    setSelectedProductIds((current) =>
      allSelected
        ? current.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...current, ...pageIds])),
    )
  }

  const applyBulkVisibility = async (isActive: boolean) => {
    await bulkVisibilityMutation.mutateAsync(
      selectedProducts.map((product) => ({
        productId: product.id,
        isActive,
        concurrencyStamp: product.concurrencyStamp,
      })),
    )
  }

  return (
    <section id="overview" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-primary">Admin module</p>
        <h1 className="text-3xl font-semibold">Inventory control</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Manage catalog visibility, stock levels, categories, and product content from the live API.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: index * 0.04 }}
            className="rounded-lg border bg-card p-5"
          >
            <metric.icon className="h-5 w-5 text-primary" />
            <p className="mt-4 text-2xl font-semibold">{metric.value}</p>
            <p className="text-sm text-muted-foreground">{metric.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr,0.85fr]">
        <div className="space-y-6">
          <div id="inventory" className="rounded-lg border bg-card">
            <div className="flex flex-col gap-4 border-b px-6 py-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Inventory list</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search across SKUs, filter by visibility, and edit any product directly.
                </p>
              </div>
              <Button onClick={beginCreateProduct}>
                <PackagePlus className="h-4 w-4" />
                New product
              </Button>
            </div>

            <div className="grid gap-3 border-b px-6 py-4 md:grid-cols-[1fr,180px,180px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search name or slug"
                  className="pl-9"
                />
              </label>
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option>All</option>
                {categories.map((category) => (
                  <option key={category.id}>{category.name}</option>
                ))}
              </select>
              <select
                value={visibilityFilter}
                onChange={(event) => {
                  setVisibilityFilter(event.target.value as typeof visibilityFilter)
                  setPage(1)
                }}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All visibility</option>
                <option value="active">Active only</option>
                <option value="hidden">Hidden only</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 border-b px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} products • page {currentPage} of {totalPages}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedProducts.length === 0 || bulkVisibilityMutation.isPending}
                  onClick={() => void applyBulkVisibility(true)}
                >
                  Show selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedProducts.length === 0 || bulkVisibilityMutation.isPending}
                  onClick={() => void applyBulkVisibility(false)}
                >
                  Hide selected
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {productsLoading ? (
                <div className="px-6 py-10 text-sm text-muted-foreground">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="px-6 py-10 text-sm text-muted-foreground">No products match the current filters.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={
                            pagedProducts.length > 0 &&
                            pagedProducts.every((product) => selectedProductIds.includes(product.id))
                          }
                          onChange={togglePageSelection}
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Stock</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedProducts.map((product) => (
                      <tr key={product.id} className="border-b last:border-b-0">
                        <td className="px-4 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                          />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border ${
                              product.imageSurfaceClassName ?? 'bg-[#f6f1ea]'
                            }`}>
                              <img
                                src={product.image}
                                alt={product.name}
                                className={`h-full w-full ${
                                  product.imageFit === 'contain'
                                    ? `object-contain px-1.5 pb-0 pt-1.5 ${product.imagePositionClassName ?? 'object-center'}`
                                    : `object-cover ${product.imagePositionClassName ?? 'object-center'}`
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{product.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{product.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-muted-foreground">{product.category}</td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <span>{product.stock}</span>
                            {product.stock <= 10 ? <Badge variant="muted">Low</Badge> : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top font-medium">{formatCurrency(product.price)}</td>
                        <td className="px-4 py-4 align-top">
                          <Badge variant={product.isActive ? 'default' : 'outline'}>
                            {product.isActive ? 'Active' : 'Hidden'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right align-top">
                          <Button variant="outline" size="sm" onClick={() => setSelectedSlug(product.slug)}>
                            <PencilLine className="h-4 w-4" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between border-t px-6 py-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div id="stock" className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Bulk stock update</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adjust the most urgent low-stock items without opening each record.
                </p>
              </div>
              <Button
                onClick={() => void applyBulkStock()}
                disabled={bulkStockMutation.isPending || lowStockProducts.length === 0}
              >
                Save stock
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No low-stock products right now.</p>
              ) : (
                lowStockProducts.map((product) => (
                  <div key={product.id} className="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr,120px,120px] md:items-center">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Current {product.stock}</p>
                    <Input
                      type="number"
                      value={String(stockDrafts[product.id] ?? product.stock)}
                      onChange={(event) =>
                        setStockDrafts((current) => ({
                          ...current,
                          [product.id]: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div id="catalog" className="rounded-lg border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingProduct ? 'Edit product' : 'Create product'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep pricing, copy, and stock aligned with the live catalog.
                </p>
              </div>
              {editingProductLoading ? (
                <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Name</span>
                  <Input {...register('name')} />
                  {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Slug</span>
                  <Input {...register('slug')} />
                  {errors.slug ? <p className="text-xs text-destructive">{errors.slug.message}</p> : null}
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Description</span>
                <textarea
                  {...register('description')}
                  className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {errors.description ? <p className="text-xs text-destructive">{errors.description.message}</p> : null}
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Category</span>
                <select
                  {...register('categoryId')}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId ? <p className="text-xs text-destructive">{errors.categoryId.message}</p> : null}
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Image URL</span>
                <Input {...register('imageUrl')} placeholder="https://..." />
                {errors.imageUrl ? <p className="text-xs text-destructive">{errors.imageUrl.message}</p> : null}
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Gallery image URLs</span>
                <textarea
                  {...register('imageUrls')}
                  className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={'https://example.com/image-1.jpg\nhttps://example.com/image-2.jpg'}
                />
                <p className="text-xs text-muted-foreground">
                  Add one URL per line. The first URL becomes the primary storefront image.
                </p>
                {errors.imageUrls ? <p className="text-xs text-destructive">{errors.imageUrls.message}</p> : null}
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Price</span>
                  <Input type="number" step="0.01" {...register('price')} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Sale price</span>
                  <Input type="number" step="0.01" {...register('salePrice')} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Stock</span>
                  <Input type="number" step="1" {...register('stockQuantity')} />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-md border px-3 py-3 text-sm">
                <input type="checkbox" {...register('isActive')} className="h-4 w-4" />
                <span>
                  <span className="font-medium">Visible in storefront</span>
                  <span className="block text-muted-foreground">
                    Turn this off to keep the product out of the public catalog.
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                  {editingProduct ? 'Save changes' : 'Create product'}
                </Button>
                <Button type="button" variant="outline" onClick={beginCreateProduct}>
                  Reset form
                </Button>
                {editingProduct ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (!window.confirm(`Delete ${editingProduct.name}?`)) {
                        return
                      }

                      void deleteMutation.mutateAsync(editingProduct.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedCategory ? 'Edit category' : 'Create category'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Shape the catalog taxonomy without leaving inventory control.
                </p>
              </div>
              <Button variant="outline" onClick={beginCreateCategory}>
                New category
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    selectedCategoryId === category.id ? 'border-primary bg-primary/10 text-foreground' : 'bg-background'
                  }`}
                >
                  {categoryPathById.get(category.id) ?? category.name}
                </button>
              ))}
            </div>

            <form className="mt-5 space-y-4" onSubmit={onCategorySubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Name</span>
                  <Input {...registerCategory('name')} />
                  {categoryErrors.name ? (
                    <p className="text-xs text-destructive">{categoryErrors.name.message}</p>
                  ) : null}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Slug</span>
                  <Input {...registerCategory('slug')} />
                  {categoryErrors.slug ? (
                    <p className="text-xs text-destructive">{categoryErrors.slug.message}</p>
                  ) : null}
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Parent category</span>
                <select
                  {...registerCategory('parentCategoryId')}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
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
                  disabled={
                    categorySubmitting ||
                    createCategoryMutation.isPending ||
                    updateCategoryMutation.isPending
                  }
                >
                  {selectedCategory ? 'Save category' : 'Create category'}
                </Button>
                <Button type="button" variant="outline" onClick={beginCreateCategory}>
                  Reset
                </Button>
                {selectedCategory ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteCategoryMutation.isPending}
                    onClick={() => {
                      if (!window.confirm(`Delete ${selectedCategory.name}?`)) {
                        return
                      }

                      void deleteCategoryMutation.mutateAsync(selectedCategory.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </form>
          </div>

          <div id="orders" className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Open order queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep one eye on fulfillment while you manage stock.
            </p>
            <div className="mt-5 space-y-3">
              {orders.slice(0, 4).map((order) => (
                <div key={order.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {new Date(order.createdAtUtc).toLocaleString()}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(order.total)}</p>
                  </div>
                  <div className="mt-3">
                    <OrderStatusEditor order={order} />
                  </div>
                </div>
              ))}
              {orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders in queue.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
