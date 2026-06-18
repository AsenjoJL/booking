import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cartService } from '@/services/cartService'
import { productService } from '@/services/productService'
import { useAuthStore } from '@/store/authStore'
import type { CartLine } from '@/types/cart'
import type { Product } from '@/types/product'

type CartStore = {
  items: CartLine[]
  isSyncing: boolean
  addItem: (product: Product) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  resetLocalCart: () => void
  syncServerCart: () => Promise<void>
  mergeGuestCartToServer: () => Promise<void>
}

const toGuestLine = (product: Product, quantity = 1): CartLine => ({
  id: product.id,
  productId: product.id,
  productName: product.name,
  unitPrice: product.price,
  quantity,
  availableStock: product.stock,
  imageUrl: product.image,
  imageFit: product.imageFit,
  imageSurfaceClassName: product.imageSurfaceClassName,
  imagePositionClassName: product.imagePositionClassName,
})

const mergeGuestLine = (items: CartLine[], product: Product) => {
  const existing = items.find((item) => item.productId === product.id)
  if (existing) {
    return items.map((item) =>
      item.productId === product.id
        ? {
            ...item,
            quantity: Math.min(item.quantity + 1, item.availableStock),
          }
        : item,
    )
  }

  return [...items, toGuestLine(product)]
}

const hydrateServerItems = (items: CartLine[]) =>
  items.map((item) => ({ ...item }))

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isSyncing: false,
      addItem: async (product) => {
        const token = useAuthStore.getState().token
        if (!token) {
          set((state) => ({ items: mergeGuestLine(state.items, product) }))
          return
        }

        const previousItems = get().items
        const optimisticItems = mergeGuestLine(previousItems, product)
        set({ items: optimisticItems, isSyncing: true })

        try {
          const resolvedProductId = await productService.resolveServerProductId(product.id)
          const response = await cartService.addItem(resolvedProductId, 1, createIdempotencyKey())
          set({ items: hydrateServerItems(response.items), isSyncing: false })
        } catch (error) {
          set({ items: previousItems, isSyncing: false })
          throw error
        }
      },
      updateQuantity: async (itemId, quantity) => {
        const token = useAuthStore.getState().token
        if (!token) {
          set((state) => ({
            items: state.items
              .map((item) =>
                item.id === itemId
                  ? { ...item, quantity: Math.max(1, Math.min(quantity, item.availableStock)) }
                  : item,
              )
              .filter((item) => item.quantity > 0),
          }))
          return
        }

        const item = get().items.find((entry) => entry.id === itemId)
        if (!item) return

        const previousItems = get().items
        const nextQuantity = Math.max(1, Math.min(quantity, item.availableStock))

        set((state) => ({
          items: state.items.map((entry) =>
            entry.id === itemId
              ? {
                  ...entry,
                  quantity: nextQuantity,
                }
              : entry,
          ),
          isSyncing: true,
        }))

        try {
          const response = await cartService.updateItem(itemId, nextQuantity, item.concurrencyStamp)
          set({ items: hydrateServerItems(response.items), isSyncing: false })
        } catch (error) {
          set({ items: previousItems, isSyncing: false })
          throw error
        }
      },
      removeItem: async (itemId) => {
        const token = useAuthStore.getState().token
        if (!token) {
          set((state) => ({
            items: state.items.filter((item) => item.id !== itemId),
          }))
          return
        }

        const previousItems = get().items
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
          isSyncing: true,
        }))

        try {
          const response = await cartService.removeItem(itemId)
          set({ items: hydrateServerItems(response.items), isSyncing: false })
        } catch (error) {
          set({ items: previousItems, isSyncing: false })
          throw error
        }
      },
      clearCart: async () => {
        const token = useAuthStore.getState().token
        if (!token) {
          set({ items: [] })
          return
        }

        const previousItems = get().items
        set({ items: [], isSyncing: true })

        try {
          const response = await cartService.clear()
          set({ items: hydrateServerItems(response.items), isSyncing: false })
        } catch (error) {
          set({ items: previousItems, isSyncing: false })
          throw error
        }
      },
      resetLocalCart: () => set({ items: [] }),
      syncServerCart: async () => {
        const token = useAuthStore.getState().token
        if (!token) return

        set({ isSyncing: true })
        try {
          const response = await cartService.getCart()
          set({ items: hydrateServerItems(response.items), isSyncing: false })
        } catch (error) {
          set({ isSyncing: false })
          throw error
        }
      },
      mergeGuestCartToServer: async () => {
        const token = useAuthStore.getState().token
        const guestItems = get().items
        if (!token) return

        set({ isSyncing: true })
        try {
          const mergeItems = await Promise.all(
            guestItems.map(async (item) => ({
              productId: await productService.resolveServerProductId(item.productId),
              quantity: item.quantity,
            })),
          )

          const response = await cartService.mergeItems(mergeItems, createIdempotencyKey())
          set({ items: hydrateServerItems(response.items), isSyncing: false })
        } catch (error) {
          set({ isSyncing: false })
          throw error
        }
      },
    }),
    {
      name: 'booking-cart',
      partialize: (state) => ({ items: state.items }),
    },
  ),
)
