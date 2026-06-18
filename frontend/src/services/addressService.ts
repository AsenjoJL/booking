import type { Address, AddressInput } from '@/types/address'
import { api } from './api'

export const addressService = {
  async getMyAddresses() {
    const { data } = await api.get<Address[]>('/addresses')
    return data
  },

  async createAddress(payload: AddressInput) {
    const { data } = await api.post<Address>('/addresses', payload)
    return data
  },

  async updateAddress(addressId: string, payload: AddressInput) {
    const { data } = await api.put<Address>(`/addresses/${addressId}`, payload)
    return data
  },

  async deleteAddress(addressId: string) {
    await api.delete(`/addresses/${addressId}`)
  },
}
