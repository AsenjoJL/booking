import type { QueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'

export const shopCatalogQueryKey = ['products', '', 'All', 1] as const

let shopRoutePreloadPromise: Promise<unknown> | null = null

export function preloadShopRoute() {
  if (!shopRoutePreloadPromise) {
    shopRoutePreloadPromise = import('@/pages/ProductListPage')
  }

  return shopRoutePreloadPromise
}

export async function prefetchShopCatalog(queryClient: QueryClient) {
  await Promise.all([
    preloadShopRoute(),
    queryClient.prefetchQuery({
      queryKey: shopCatalogQueryKey,
      queryFn: () => productService.getProductCatalog({ page: 1, pageSize: 8 }),
      staleTime: 1000 * 60 * 5,
    }),
  ])
}
