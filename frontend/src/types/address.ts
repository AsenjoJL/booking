export type Address = {
  id: string
  label: string
  recipientName: string
  line1: string
  line2?: string | null
  city: string
  stateOrProvince: string
  postalCode: string
  country: string
  phoneNumber: string
  isDefaultShipping: boolean
}

export type AddressInput = {
  label: string
  recipientName: string
  line1: string
  line2?: string | null
  city: string
  stateOrProvince: string
  postalCode: string
  country: string
  phoneNumber: string
  isDefaultShipping: boolean
}
