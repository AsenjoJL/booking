import type { LucideIcon } from 'lucide-react'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type AdminFeedbackDialogProps = {
  open: boolean
  title: string
  message: string
  actionLabel: string
  onClose: () => void
  icon: LucideIcon
  tone: 'success' | 'error'
}

const feedbackToneStyles: Record<AdminFeedbackDialogProps['tone'], {
  border: string
  iconWrap: string
  icon: string
  action: string
  overlay: string
}> = {
  success: {
    border: 'border-emerald-200',
    iconWrap: 'bg-emerald-50',
    icon: 'text-emerald-600',
    action: 'bg-emerald-600 text-white hover:bg-emerald-700',
    overlay: 'bg-black/35',
  },
  error: {
    border: 'border-rose-200',
    iconWrap: 'bg-rose-50',
    icon: 'text-rose-600',
    action: 'bg-rose-600 text-white hover:bg-rose-700',
    overlay: 'bg-black/40',
  },
}

export function AdminFeedbackDialog({
  open,
  title,
  message,
  actionLabel,
  onClose,
  icon: Icon,
  tone,
}: AdminFeedbackDialogProps) {
  if (!open) {
    return null
  }

  const styles = feedbackToneStyles[tone]

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent
        hideClose
        className={cn('max-w-md border p-7 text-center', styles.border)}
      >
        <div className={cn('mx-auto flex h-16 w-16 items-center justify-center rounded-full', styles.iconWrap, styles.icon)}>
          <Icon className="h-9 w-9" />
        </div>
        <DialogHeader className="mt-5 text-center">
          <DialogTitle className="text-center text-[1.6rem] font-medium">{title}</DialogTitle>
          <DialogDescription className="mt-1 text-center">{message}</DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex justify-center">
          <Button type="button" className={cn('min-w-32 rounded-xl px-6', styles.action)} onClick={onClose}>
            {actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type AdminConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
  icon: LucideIcon
}

export function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  pending = false,
  onCancel,
  onConfirm,
  icon: Icon,
}: AdminConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
      <DialogContent hideClose className="max-w-md border-[#ead9c9] p-7 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Icon className="h-9 w-9" />
        </div>
        <DialogHeader className="mt-5 text-center">
          <DialogTitle className="text-center text-[1.6rem] font-medium">{title}</DialogTitle>
          <DialogDescription className="mt-1 text-center">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 justify-center sm:justify-center">
          <Button
            type="button"
            variant="outline"
            className="min-w-32 rounded-xl border-[#ddd4c8]"
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-w-32 rounded-xl"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
