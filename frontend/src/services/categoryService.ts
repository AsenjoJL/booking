import type { Category } from '@/types/category'
import { api } from './api'

export const categoryService = {
  async getCategories() {
    const { data } = await api.get<Category[]>('/categories')
    return data
  },
  async createCategory(payload: { name: string; slug: string; parentCategoryId?: string | null }) {
    const { data } = await api.post<Category>('/categories', payload)
    return data
  },
  async updateCategory(
    id: string,
    payload: { name: string; slug: string; parentCategoryId?: string | null },
  ) {
    const { data } = await api.put<Category>(`/categories/${id}`, payload)
    return data
  },
  async deleteCategory(id: string) {
    await api.delete(`/categories/${id}`)
  },
}
