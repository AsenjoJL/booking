import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, MapPin, PencilLine, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addressService } from '@/services/addressService'
import type { Address } from '@/types/address'

const addressSchema = z.object({
  label: z.string().trim().min(2, 'Enter a label for this address'),
  recipientName: z.string().trim().min(2, 'Enter the recipient name'),
  line1: z.string().trim().min(5, 'Enter the street address'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'Enter the city'),
  stateOrProvince: z.string().trim().min(2, 'Enter the state or province'),
  postalCode: z.string().trim().min(3, 'Enter the postal code'),
  country: z.string().trim().min(2, 'Enter the country'),
  phoneNumber: z.string().trim().min(7, 'Enter the phone number'),
  isDefaultShipping: z.boolean(),
})

type AddressFormInput = z.input<typeof addressSchema>
type AddressFormValues = z.output<typeof addressSchema>

const defaultValues: AddressFormValues = {
  label: '',
  recipientName: '',
  line1: '',
  line2: '',
  city: '',
  stateOrProvince: '',
  postalCode: '',
  country: '',
  phoneNumber: '',
  isDefaultShipping: true,
}

type AddressBookProps = {
  addresses: Address[]
  isLoading: boolean
  selectedAddressId: string
  onAddressSelect: (addressId: string) => void
}

export function AddressBook({
  addresses,
  isLoading,
  selectedAddressId,
  onAddressSelect,
}: AddressBookProps) {
  const queryClient = useQueryClient()
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const editingAddress = useMemo(
    () => addresses.find((address) => address.id === editingAddressId) ?? null,
    [addresses, editingAddressId],
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormInput, unknown, AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!editingAddress) {
      reset({
        ...defaultValues,
        isDefaultShipping: addresses.length === 0,
      })
      return
    }

    reset({
      label: editingAddress.label,
      recipientName: editingAddress.recipientName,
      line1: editingAddress.line1,
      line2: editingAddress.line2 ?? '',
      city: editingAddress.city,
      stateOrProvince: editingAddress.stateOrProvince,
      postalCode: editingAddress.postalCode,
      country: editingAddress.country,
      phoneNumber: editingAddress.phoneNumber,
      isDefaultShipping: editingAddress.isDefaultShipping,
    })
  }, [addresses.length, editingAddress, reset])

  const createMutation = useMutation({
    mutationFn: addressService.createAddress,
    onSuccess: async (address) => {
      await queryClient.invalidateQueries({ queryKey: ['addresses'] })
      onAddressSelect(address.id)
      setIsFormVisible(false)
      setEditingAddressId(null)
      reset(defaultValues)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ addressId, payload }: { addressId: string; payload: AddressFormValues }) =>
      addressService.updateAddress(addressId, payload),
    onSuccess: async (address) => {
      await queryClient.invalidateQueries({ queryKey: ['addresses'] })
      onAddressSelect(address.id)
      setIsFormVisible(false)
      setEditingAddressId(null)
      reset(defaultValues)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: addressService.deleteAddress,
    onSuccess: async (_, deletedAddressId) => {
      const remainingAddresses = addresses.filter((address) => address.id !== deletedAddressId)
      const nextSelectedAddressId =
        remainingAddresses.find((address) => address.isDefaultShipping)?.id ?? remainingAddresses[0]?.id ?? ''

      await queryClient.invalidateQueries({ queryKey: ['addresses'] })
      onAddressSelect(nextSelectedAddressId)

      if (editingAddressId === deletedAddressId) {
        setEditingAddressId(null)
        setIsFormVisible(false)
        reset(defaultValues)
      }
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const payload: AddressFormValues = {
      label: values.label.trim(),
      recipientName: values.recipientName.trim(),
      line1: values.line1.trim(),
      line2: values.line2?.trim() || '',
      city: values.city.trim(),
      stateOrProvince: values.stateOrProvince.trim(),
      postalCode: values.postalCode.trim(),
      country: values.country.trim(),
      phoneNumber: values.phoneNumber.trim(),
      isDefaultShipping: values.isDefaultShipping,
    }

    if (editingAddress) {
      await updateMutation.mutateAsync({ addressId: editingAddress.id, payload })
      return
    }

    await createMutation.mutateAsync(payload)
  })

  const beginCreate = () => {
    setEditingAddressId(null)
    setIsFormVisible(true)
    reset({
      ...defaultValues,
      isDefaultShipping: addresses.length === 0,
    })
  }

  const beginEdit = (addressId: string) => {
    setEditingAddressId(addressId)
    setIsFormVisible(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-[#d36d3d]" />
          <div>
            <h2 className="font-serif text-3xl text-foreground">Shipping details</h2>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              Choose the address checkout should use, or keep your saved destinations up to date.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 rounded-none border-foreground/15 px-5 text-xs uppercase tracking-[0.22em]"
          onClick={beginCreate}
        >
          <Plus className="h-4 w-4" />
          Add address
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-32 items-center gap-3 border bg-card px-5 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading addresses
        </div>
      ) : addresses.length === 0 ? (
        <div className="border border-dashed p-6">
          <p className="font-serif text-2xl text-foreground">No shipping addresses yet</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Add one below and we&apos;ll use it for this order right away.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`border p-5 transition-colors ${
                selectedAddressId === address.id
                  ? 'border-[#d36d3d] bg-[#fff7f1]'
                  : 'border-border bg-card hover:border-foreground/20'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    checked={selectedAddressId === address.id}
                    onChange={() => onAddressSelect(address.id)}
                    className="mt-1 h-4 w-4 accent-[#d36d3d]"
                  />
                  <div className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-serif text-2xl text-foreground">{address.label}</p>
                      {address.isDefaultShipping ? (
                        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#d36d3d]">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-medium text-foreground">{address.recipientName}</p>
                    <p className="mt-2 leading-7 text-muted-foreground">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.stateOrProvince}{' '}
                      {address.postalCode}
                    </p>
                    <p className="leading-7 text-muted-foreground">{address.country}</p>
                    <p className="leading-7 text-muted-foreground">{address.phoneNumber}</p>
                  </div>
                </label>

                <div className="flex items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-none border-foreground/15 px-4 text-[0.72rem] uppercase tracking-[0.2em]"
                    onClick={() => beginEdit(address.id)}
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-10 rounded-none px-4 text-[0.72rem] uppercase tracking-[0.2em]"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (!window.confirm(`Delete ${address.label}?`)) {
                        return
                      }

                      void deleteMutation.mutateAsync(address.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormVisible ? (
        <form className="border bg-[#fbf8f4] p-6 sm:p-7" onSubmit={onSubmit}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#d36d3d]">
                {editingAddress ? 'Update entry' : 'New address'}
              </p>
              <h3 className="mt-2 font-serif text-3xl text-foreground">
                {editingAddress ? 'Edit address' : 'Add address'}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Keep delivery details current so checkout can finish cleanly.
              </p>
            </div>
            {(createMutation.isPending || updateMutation.isPending) && (
              <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Label</span>
              <Input {...register('label')} placeholder="Home, Office, Condo" className="h-12 rounded-none bg-white" />
              {errors.label ? <p className="text-xs text-destructive">{errors.label.message}</p> : null}
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Recipient</span>
              <Input
                {...register('recipientName')}
                placeholder="John Lester"
                className="h-12 rounded-none bg-white"
              />
              {errors.recipientName ? (
                <p className="text-xs text-destructive">{errors.recipientName.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="font-medium text-foreground">Address line 1</span>
              <Input
                {...register('line1')}
                placeholder="Street, building, barangay"
                className="h-12 rounded-none bg-white"
              />
              {errors.line1 ? <p className="text-xs text-destructive">{errors.line1.message}</p> : null}
            </label>
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="font-medium text-foreground">Address line 2</span>
              <Input
                {...register('line2')}
                placeholder="Unit, floor, landmark"
                className="h-12 rounded-none bg-white"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">City</span>
              <Input {...register('city')} className="h-12 rounded-none bg-white" />
              {errors.city ? <p className="text-xs text-destructive">{errors.city.message}</p> : null}
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">State or province</span>
              <Input {...register('stateOrProvince')} className="h-12 rounded-none bg-white" />
              {errors.stateOrProvince ? (
                <p className="text-xs text-destructive">{errors.stateOrProvince.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Postal code</span>
              <Input {...register('postalCode')} className="h-12 rounded-none bg-white" />
              {errors.postalCode ? <p className="text-xs text-destructive">{errors.postalCode.message}</p> : null}
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Country</span>
              <Input {...register('country')} className="h-12 rounded-none bg-white" />
              {errors.country ? <p className="text-xs text-destructive">{errors.country.message}</p> : null}
            </label>
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="font-medium text-foreground">Phone number</span>
              <Input
                {...register('phoneNumber')}
                placeholder="+63 900 000 0000"
                className="h-12 rounded-none bg-white"
              />
              {errors.phoneNumber ? <p className="text-xs text-destructive">{errors.phoneNumber.message}</p> : null}
            </label>
          </div>

          <label className="mt-5 flex items-center gap-3 border bg-white px-4 py-4 text-sm">
            <input type="checkbox" {...register('isDefaultShipping')} className="h-4 w-4 accent-[#d36d3d]" />
            <span>
              <span className="font-medium text-foreground">Use as default shipping address</span>
              <span className="mt-1 block leading-6 text-muted-foreground">
                New orders will preselect this address automatically.
              </span>
            </span>
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              className="h-12 rounded-none bg-[#cf6c3e] px-6 text-xs uppercase tracking-[0.22em] hover:bg-[#ba5d33]"
            >
              {editingAddress ? 'Save address' : 'Add address'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-none border-foreground/15 px-6 text-xs uppercase tracking-[0.22em]"
              onClick={() => {
                setEditingAddressId(null)
                setIsFormVisible(false)
                reset(defaultValues)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
