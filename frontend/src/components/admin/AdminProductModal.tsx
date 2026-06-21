import type { FormEventHandler, ReactNode } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type AdminProductModalProps = {
  open: boolean
  editingProduct: { id: string } | null | undefined
  editingProductLoading: boolean
  onClose: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  children: ReactNode
}

export default function AdminProductModal({
  open,
  editingProduct,
  editingProductLoading,
  onClose,
  onSubmit,
  children,
}: AdminProductModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-[#ddd4c8] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[#eee3d7] bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#2563eb]">Inventory</p>
            <h2 className="mt-2 text-[1.6rem] font-medium text-foreground">
              {editingProduct ? 'Edit product' : 'Create product'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update pricing, stock, media, and storefront visibility.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {editingProductLoading ? <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl border-[#ddd4c8]"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <form className="space-y-4 px-6 py-6" onSubmit={onSubmit}>
          {children}
        </form>
      </div>
    </div>
  )
}
