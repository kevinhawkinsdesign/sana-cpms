'use client'

import { ClipboardList, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter"

interface FinishRegistrationDialogProps {
  open: boolean
  onClose: () => void
  vehicleId: string
}

export function FinishRegistrationDialog({
  open,
  onClose,
  vehicleId
}: FinishRegistrationDialogProps) {
  const router = useLocalizedRouter()

  const handleComplete = () => {
    router.push(`/dashboard/registration?id=${vehicleId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Complete Vehicle Registration
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            This vehicle requires full registration before proceeding with the charging
            session. Would you like to complete the registration process now?
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleComplete}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Complete Registration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}