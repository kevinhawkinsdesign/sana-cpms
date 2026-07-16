import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUpload from '@/components/ui/image-upload'

interface TransferKwhFieldsProps {
  kwhValue: string
  kwhImage: string
  onKwhChange: (value: string) => void
  onImageChange: (url: string) => void
  disabled?: boolean
}

export function TransferKwhFields({
  kwhValue,
  kwhImage,
  onKwhChange,
  onImageChange,
  disabled,
}: TransferKwhFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="transferredKwh" className="text-sm font-medium">
          kWh Reading at Transfer <span className="text-destructive">*</span>
        </Label>
        <Input
          id="transferredKwh"
          type="number"
          step="0.01"
          min="0"
          placeholder="Enter kWh reading (e.g., 25.5)"
          value={kwhValue}
          onChange={(e) => onKwhChange(e.target.value)}
          className="mt-2"
          disabled={disabled}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Record the current kWh reading from the charger at the time of transfer
        </p>
      </div>

      <div>
        <ImageUpload
          name="transferredKwhImage"
          label="kWh Reading Image"
          currentImage={kwhImage}
          onImageChange={(_name, url) => onImageChange(url)}
          isRequired={true}
          uploadContext="session-kwh-meter"
          entityId={undefined}
        />
      </div>
    </div>
  )
}
