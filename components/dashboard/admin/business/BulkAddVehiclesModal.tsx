'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  MinusCircle,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getCarModelMakes } from '@/lib/api/chargingSessions'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, Car as CarIcon } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { addVehicleToBusiness, type AddVehicleRequest } from '@/lib/api/adminBusiness'
import { splitMakeModel } from '@/lib/utils/vehicleUtils'

const LICENSE_PLATE_REGEX = /^[A-Za-z]{3}\d{3}[A-Za-z]$/

type RowStatus = 'pending' | 'success' | 'skipped' | 'error'

function isAlreadyAssignedMessage(msg: string | undefined | null): boolean {
  if (!msg) return false
  return /already\s+assigned/i.test(msg)
}

interface ParsedRow {
  index: number
  licensePlate: string
  makeModel: string
  vin: string
  imageUrl: string
  batteryCapacity?: number
  errors: string[]
  warnings: string[]
  warningDetails: string[]
  status: RowStatus
  resultMessage?: string
}

interface BulkAddVehiclesModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  businessName: string
  /** License plates already assigned to this business — used to pre-flag duplicates. */
  existingLicensePlates?: string[]
  onSuccess: () => void
}


function sanitizeForFilename(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'Business'
  )
}

function trimString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/**
 * Truncate a long filename to "start…ending.ext", keeping the extension visible.
 * e.g. "KABISA-Invoiced-Customer-Vehicles-For-a-Business-Bank-of-kigali.xlsx"
 *   →  "KABISA-Invoiced…Bank-of-kigali.xlsx"
 */
function middleTruncateFilename(name: string, maxChars = 36): string {
  if (!name || name.length <= maxChars) return name
  const dotIdx = name.lastIndexOf('.')
  const hasExt = dotIdx > 0 && name.length - dotIdx <= 6
  const ext = hasExt ? name.slice(dotIdx) : ''
  const base = hasExt ? name.slice(0, dotIdx) : name

  const budget = Math.max(maxChars - ext.length - 1, 8) // leave room for ellipsis
  const half = Math.floor(budget / 2)
  const start = base.slice(0, half)
  const end = base.slice(base.length - (budget - half))
  return `${start}…${end}${ext}`
}

/**
 * Validate the editable fields. Returns short user-facing labels in `warnings`
 * and the full descriptions in `warningDetails` (for tooltips).
 */
function validateFields(fields: { licensePlate: string; makeModel: string; vin: string }) {
  const errors: string[] = []
  const warnings: string[] = []
  const warningDetails: string[] = []

  if (!fields.licensePlate) errors.push('License plate is required')
  if (!fields.makeModel) errors.push('Make/Model is required')

  // Standard Rwandan plates are 3 letters + 3 digits + 1 letter (e.g. RAA123A).
  // Non-standard plates exist in practice (government like RG001G, custom
  // private plates like "YOGI", diplomatic, etc.) so we don't block import —
  // surface it as a warning instead so the admin can sanity-check the row.
  if (fields.licensePlate && !LICENSE_PLATE_REGEX.test(fields.licensePlate)) {
    warnings.push('Non-standard plate')
    warningDetails.push(
      `"${fields.licensePlate}" doesn't match the standard 3-letters / 3-digits / 1-letter format (e.g. RAA123A). Will still be imported — common for government (RG001G), diplomatic, or custom plates.`,
    )
  }

  // Reject rows where we can't extract both make and model — sending one of
  // them empty (or duplicating the make into the model) corrupts the record.
  if (fields.makeModel) {
    const { make, model } = splitMakeModel(fields.makeModel)
    if (!make || !model) {
      errors.push(
        `"${fields.makeModel}" must include both make and model (e.g. "Tesla Model 3")`,
      )
    }
  }

  if (fields.vin && fields.vin.length !== 17) {
    warnings.push('VIN length')
    warningDetails.push(
      `VIN "${fields.vin}" is ${fields.vin.length} chars (expected 17) — may be rejected on import`,
    )
  }

  return { errors, warnings, warningDetails }
}

function parseRowFromSheet(
  raw: Record<string, unknown>,
  index: number,
  existingPlateSet: Set<string>,
): ParsedRow {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') return v
    }
    return undefined
  }

  // Normalize plates to uppercase so the value we send to the API matches the
  // case-insensitive dedupe checks we run client-side. Rwandan plates are
  // uppercase by convention anyway.
  const licensePlate = trimString(
    get('License Plate', 'license plate', 'licensePlate', 'plate', 'Plate'),
  ).toUpperCase()
  const makeModel = trimString(
    get('Make Model', 'Make/Model', 'make model', 'makeModel', 'Make and Model'),
  )
  const vin = trimString(get('VIN', 'vin', 'Vin'))
  const batteryRaw = get('Battery Capacity (kWh)', 'Battery Capacity', 'batteryCapacity', 'battery')
  const imageUrl = trimString(get('Image URL', 'imageUrl', 'image', 'Image'))

  let batteryCapacity: number | undefined
  if (batteryRaw !== undefined && batteryRaw !== null && String(batteryRaw).trim() !== '') {
    const n = Number(batteryRaw)
    if (Number.isFinite(n) && n >= 0) batteryCapacity = n
  }

  const { errors, warnings, warningDetails } = validateFields({ licensePlate, makeModel, vin })

  // Pre-flag duplicates that are already assigned to this business so admins
  // see them as "Skipped" before clicking Import.
  const isDuplicate =
    licensePlate && existingPlateSet.has(licensePlate.trim().toUpperCase())

  return {
    index,
    licensePlate,
    makeModel,
    vin,
    imageUrl,
    batteryCapacity,
    errors,
    warnings,
    warningDetails,
    status: isDuplicate ? 'skipped' : 'pending',
    resultMessage: isDuplicate ? 'Already assigned to this business' : undefined,
  }
}

/**
 * Lightweight per-row Make/Model combobox. Takes the cached model list from
 * the parent modal so we don't fetch the list once per row.
 */
const MakeModelCombobox: React.FC<{
  value: string
  onValueChange: (next: string) => void
  models: string[]
  disabled?: boolean
}> = ({ value, onValueChange, models, disabled }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'inline-flex w-full items-center justify-between gap-1.5 rounded-md border border-input bg-white px-2.5 h-8 text-xs',
            'hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            disabled && 'opacity-50 cursor-not-allowed',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <CarIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
            <span className="truncate">{value || 'Select make/model…'}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search make/model…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No matches</CommandEmpty>
            <CommandGroup>
              {models.map((m) => (
                <CommandItem
                  key={m}
                  value={m}
                  onSelect={() => {
                    onValueChange(m)
                    setOpen(false)
                  }}
                  className="cursor-pointer text-xs"
                >
                  <Check className={cn('mr-2 h-3.5 w-3.5', value === m ? 'opacity-100' : 'opacity-0')} />
                  {m}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export const BulkAddVehiclesModal: React.FC<BulkAddVehiclesModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  existingLicensePlates = [],
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [fileName, setFileName] = useState<string>('')
  const [rows, setRows] = useState<ParsedRow[]>([])

  // Normalize existing license plates for O(1) lookup
  const existingPlateSet = useMemo(
    () => new Set(existingLicensePlates.map((p) => String(p || '').trim().toUpperCase())),
    [existingLicensePlates],
  )

  /** True if the plate already belongs to this business. */
  const isAlreadyOnBusiness = (plate: string) =>
    !!plate && existingPlateSet.has(plate.trim().toUpperCase())
  const [parseError, setParseError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [didRun, setDidRun] = useState(false)

  /**
   * Bucket every row into exactly one category. Order matters — once a row
   * reaches a terminal status (success/error/skipped) it counts there and not
   * in the pre-import categories. Pending rows are then split by validation:
   * blocked (any errors) → warning (any warnings) → clean.
   */
  const counts = useMemo(() => {
    let success = 0
    let error = 0
    let skipped = 0
    let blocked = 0
    let withWarnings = 0
    let clean = 0
    for (const r of rows) {
      if (r.status === 'success') success++
      else if (r.status === 'error') error++
      else if (r.status === 'skipped') skipped++
      else if (r.errors.length > 0) blocked++
      else if (r.warnings.length > 0) withWarnings++
      else clean++
    }
    return { total: rows.length, success, error, skipped, blocked, withWarnings, clean }
  }, [rows])

  // Cache the model list so the dropdown can be populated in the template.
  const { data: carModels = [] } = useQuery({
    queryKey: ['car-model-makes'],
    queryFn: getCarModelMakes,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  })

  const [isBuildingTemplate, setIsBuildingTemplate] = useState(false)

  const handleDownloadTemplate = async () => {
    setIsBuildingTemplate(true)
    try {
      // Dynamic import keeps exceljs out of the initial bundle.
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Kabisa Admin'
      wb.created = new Date()

      const sheet = wb.addWorksheet('Vehicles', {
        views: [{ state: 'frozen', ySplit: 1 }],
      })

      sheet.columns = [
        { header: 'License Plate', key: 'licensePlate', width: 18 },
        { header: 'Make Model', key: 'makeModel', width: 30 },
        { header: 'VIN', key: 'vin', width: 22 },
      ]

      // Style the header row
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' }, // gray-800
      }
      headerRow.alignment = { vertical: 'middle', horizontal: 'left' }
      headerRow.height = 22

      // Hidden sheet that holds the Make/Model dropdown list
      const models = carModels && carModels.length > 0 ? carModels : [
        'Tesla Model 3',
        'Tesla Model Y',
        'BYD Atto 3',
        'BMW iX1',
        'Volkswagen ID.4',
      ]
      const modelsSheet = wb.addWorksheet('Models', { state: 'hidden' })
      modelsSheet.getColumn(1).width = 40
      modelsSheet.addRow(['Make / Model'])
      models.forEach((m) => modelsSheet.addRow([m]))

      const VALIDATION_ROWS = 500
      const lastModelRow = models.length + 1 // +1 for header

      // Per-cell license plate validation formula (matches RAA111A pattern).
      // Mirrors the conditional-formatting check below, but as a positive
      // "is valid?" expression for data validation.
      const validPlateFormula = (cell: string) =>
        'AND(' +
        `LEN(TRIM(${cell}))=7,` +
        // positions 1-3 must be letters (NOT digits)
        `NOT(ISNUMBER(--MID(${cell},1,1))),NOT(ISNUMBER(--MID(${cell},2,1))),NOT(ISNUMBER(--MID(${cell},3,1))),` +
        // positions 4-6 must be digits
        `ISNUMBER(--MID(${cell},4,1)),ISNUMBER(--MID(${cell},5,1)),ISNUMBER(--MID(${cell},6,1)),` +
        // position 7 must be a letter
        `NOT(ISNUMBER(--MID(${cell},7,1)))` +
        ')'

      // Plate cell uses a *warning* (not blocking) validation so non-standard
      // plates — government (RG001G), custom private (YOGI), diplomatic — can
      // still be entered after dismissing the prompt. The Make Model column
      // keeps its dropdown.
      for (let r = 2; r <= VALIDATION_ROWS + 1; r++) {
        sheet.getCell(`A${r}`).dataValidation = {
          type: 'custom',
          allowBlank: true,
          formulae: [`=${validPlateFormula(`A${r}`)}`],
          showErrorMessage: true,
          errorStyle: 'warning',
          errorTitle: 'Non-standard plate',
          error:
            'This plate doesn\'t match the standard RAA123A format. Click Yes to keep it (allowed for government / custom / diplomatic plates).',
        }

        sheet.getCell(`B${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`=Models!$A$2:$A$${lastModelRow}`],
          showErrorMessage: false,
        }
      }

      // Conditional formatting: tint non-standard plates amber as a soft
      // visual hint (was red — but it's a warning now, not an error).
      const invalidPlateFormula =
        'AND(' +
        'TRIM(A2)<>"",' +
        'OR(' +
        'LEN(TRIM(A2))<>7,' +
        'ISNUMBER(--MID(A2,1,1)),ISNUMBER(--MID(A2,2,1)),ISNUMBER(--MID(A2,3,1)),' +
        'NOT(ISNUMBER(--MID(A2,4,1))),NOT(ISNUMBER(--MID(A2,5,1))),NOT(ISNUMBER(--MID(A2,6,1))),' +
        'ISNUMBER(--MID(A2,7,1))' +
        ')' +
        ')'

      sheet.addConditionalFormatting({
        ref: `A2:A${VALIDATION_ROWS + 1}`,
        rules: [
          {
            type: 'expression',
            formulae: [invalidPlateFormula],
            priority: 1,
            style: {
              font: { color: { argb: 'FF92400E' } }, // amber-800
              fill: {
                type: 'pattern',
                pattern: 'solid',
                bgColor: { argb: 'FFFEF3C7' }, // amber-100
                fgColor: { argb: 'FFFEF3C7' },
              },
            },
          },
        ],
      })

      // Light grid styling on the data area for readability
      const lastCol = String.fromCharCode(64 + sheet.columnCount) // 'C'
      const border: any = { style: 'thin', color: { argb: 'FFE5E7EB' } }
      for (let r = 1; r <= VALIDATION_ROWS + 1; r++) {
        for (let c = 1; c <= sheet.columnCount; c++) {
          const cell = sheet.getRow(r).getCell(c)
          cell.border = { top: border, left: border, right: border, bottom: border }
        }
      }
      void lastCol

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KABISA-Invoiced-Customer-Vehicles-For-a-Business-${sanitizeForFilename(businessName)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Template build failed', err)
      toast.error(err?.message || 'Failed to build template')
    } finally {
      setIsBuildingTemplate(false)
    }
  }

  const handleFile = async (file: File) => {
    setParseError('')
    setRows([])
    setDidRun(false)
    setProgress(0)
    setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheetName = wb.SheetNames[0]
      if (!sheetName) {
        setParseError('No sheets found in workbook')
        return
      }
      const ws = wb.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      if (json.length === 0) {
        setParseError(
          'No data rows found. Make sure the first row is headers and there is at least one vehicle below.',
        )
        return
      }
      const parsed = json.map((row, i) => parseRowFromSheet(row, i + 2, existingPlateSet))
      setRows(parsed)
    } catch (err: any) {
      setParseError(err?.message || 'Failed to read file')
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const updateRow = (index: number, patch: Partial<Pick<ParsedRow, 'licensePlate' | 'makeModel' | 'vin'>>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.index !== index) return r
        // Locked once successfully added. Pending/skipped/error rows can all be
        // edited so the admin can fix them and retry.
        if (r.status === 'success') return r
        const next = {
          ...r,
          licensePlate: patch.licensePlate !== undefined ? patch.licensePlate.trim().toUpperCase() : r.licensePlate,
          makeModel: patch.makeModel !== undefined ? patch.makeModel.trim() : r.makeModel,
          vin: patch.vin !== undefined ? patch.vin.trim() : r.vin,
        }
        const v = validateFields({
          licensePlate: next.licensePlate,
          makeModel: next.makeModel,
          vin: next.vin,
        })
        const isDuplicate = isAlreadyOnBusiness(next.licensePlate)
        return {
          ...next,
          ...v,
          status: isDuplicate ? 'skipped' : 'pending',
          resultMessage: isDuplicate ? 'Already assigned to this business' : undefined,
        }
      }),
    )
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((r) => r.index !== index))
  }

  const importMutation = useMutation({
    mutationFn: async (toImport: ParsedRow[]) => {
      let done = 0
      let added = 0
      let skipped = 0
      let failed = 0
      for (const row of toImport) {
        const { make, model } = splitMakeModel(row.makeModel)
        // Defense in depth: validateFields blocks rows where either side is
        // empty, so this is unreachable on a normal flow. If it ever happens,
        // mark the row as failed rather than corrupt the record.
        if (!make || !model) {
          failed++
          setRows((prev) =>
            prev.map((r) =>
              r.index === row.index
                ? { ...r, status: 'error', resultMessage: 'Make and model are both required' }
                : r,
            ),
          )
          done++
          setProgress(Math.round((done / toImport.length) * 100))
          continue
        }
        const payload: AddVehicleRequest = {
          // Plate is already normalized at parse/edit time; uppercase again
          // defensively in case any callsite skipped the helper.
          licensePlate: row.licensePlate.trim().toUpperCase(),
          make,
          model,
          vin: row.vin || undefined,
          imageUrl: row.imageUrl || undefined,
          batteryCapacity: row.batteryCapacity,
        }
        try {
          await addVehicleToBusiness(businessId, payload, { silent: true })
          added++
          setRows((prev) =>
            prev.map((r) =>
              r.index === row.index ? { ...r, status: 'success', resultMessage: 'Added' } : r,
            ),
          )
        } catch (e: any) {
          const msg = e?.message || 'Failed'
          const wasAlreadyAssigned = isAlreadyAssignedMessage(msg)
          if (wasAlreadyAssigned) skipped++
          else failed++
          setRows((prev) =>
            prev.map((r) =>
              r.index === row.index
                ? {
                    ...r,
                    status: wasAlreadyAssigned ? 'skipped' : 'error',
                    resultMessage: wasAlreadyAssigned ? 'Already assigned to this business' : msg,
                  }
                : r,
            ),
          )
        }
        done++
        setProgress(Math.round((done / toImport.length) * 100))
      }
      return { added, skipped, failed }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', businessId] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })

  const handleConfirmImport = async () => {
    const toImport = rows.filter((r) => r.errors.length === 0 && r.status === 'pending')
    if (toImport.length === 0) {
      toast.error('No valid rows to import')
      return
    }
    setIsProcessing(true)
    setDidRun(true)
    // Rows pre-flagged as duplicates before clicking Import should be counted
    // in the summary, even though they never went through the API loop.
    const preSkipped = rows.filter((r) => r.status === 'skipped').length
    try {
      const { added, skipped: runtimeSkipped, failed } = await importMutation.mutateAsync(toImport)
      const skipped = runtimeSkipped + preSkipped
      const parts: string[] = []
      if (added > 0) parts.push(`${added} added`)
      if (skipped > 0) parts.push(`${skipped} skipped`)
      if (failed > 0) parts.push(`${failed} failed`)
      const summary = parts.join(', ')
      if (failed === 0 && skipped === 0 && added > 0) {
        toast.success(`${added} vehicle${added === 1 ? '' : 's'} added successfully`)
      } else if (failed === 0 && (added > 0 || skipped > 0)) {
        toast.success(summary)
      } else if (failed > 0) {
        toast.warning(`${summary} — see details below`)
      }
      // Only notify the parent to refetch when at least one vehicle was actually
      // added. Pure skip/fail runs leave the server state unchanged.
      if (added > 0) {
        onSuccess()
      }
    } catch (e: any) {
      toast.error(e?.message || 'Bulk import failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (isProcessing) return
    setRows([])
    setFileName('')
    setParseError('')
    setProgress(0)
    setDidRun(false)
    onClose()
  }

  const importable = rows.filter((r) => r.errors.length === 0 && r.status === 'pending').length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="!max-w-6xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Add Vehicles to {businessName}
          </DialogTitle>
          <DialogDescription>
            Download the template, fill it out, then upload it back. We'll validate every row before
            importing — you can fix any row inline before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
              disabled={isBuildingTemplate}
              className="sm:w-auto shrink-0"
            >
              {isBuildingTemplate ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download Template
            </Button>
            <label className="flex-1 sm:max-w-md inline-flex">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleFileInput}
                disabled={isProcessing}
              />
              <span
                className={`w-full inline-flex items-center gap-2 px-3 h-9 rounded-md border text-sm cursor-pointer transition-colors ${
                  isProcessing
                    ? 'opacity-50 cursor-not-allowed border-gray-200'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                title={fileName || undefined}
              >
                <Upload className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {fileName ? `Replace file (${middleTruncateFilename(fileName)})` : 'Upload Excel'}
                </span>
              </span>
            </label>
          </div>

          {parseError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-start gap-2 p-3 text-sm text-red-700">
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{parseError}</span>
              </CardContent>
            </Card>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                  {counts.total} rows
                </Badge>
                {counts.clean > 0 && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {counts.clean} ok
                  </Badge>
                )}
                {counts.success > 0 && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {counts.success} added
                  </Badge>
                )}
                {counts.withWarnings > 0 && (
                  <Badge className="bg-amber-50 text-amber-800 border-amber-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {counts.withWarnings} warning{counts.withWarnings === 1 ? '' : 's'}
                  </Badge>
                )}
                {counts.skipped > 0 && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                    <MinusCircle className="h-3 w-3 mr-1" />
                    {counts.skipped} skipped
                  </Badge>
                )}
                {counts.blocked > 0 && (
                  <Badge className="bg-red-50 text-red-700 border-red-200">
                    <XCircle className="h-3 w-3 mr-1" />
                    {counts.blocked} blocked
                  </Badge>
                )}
                {counts.error > 0 && (
                  <Badge className="bg-red-50 text-red-700 border-red-200">
                    <XCircle className="h-3 w-3 mr-1" />
                    {counts.error} failed
                  </Badge>
                )}
              </div>

              {isProcessing && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Importing…</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="max-h-[50vh] overflow-y-auto">
                  <TooltipProvider delayDuration={150}>
                    <Table>
                      <TableHeader className="sticky top-0 bg-gray-50 z-10">
                        <TableRow>
                          <TableHead className="w-12 text-xs">#</TableHead>
                          <TableHead className="text-xs w-44">License Plate</TableHead>
                          <TableHead className="text-xs">Make / Model</TableHead>
                          <TableHead className="text-xs w-56">VIN</TableHead>
                          <TableHead className="text-xs w-48">Status</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r) => {
                          const blocked = r.errors.length > 0
                          // Successful rows are locked. Everything else (pending,
                          // skipped, error) stays editable so the admin can fix
                          // duplicates or failures and retry.
                          const isEditable = !isProcessing && r.status !== 'success'
                          const rowTone =
                            r.status === 'success'
                              ? 'bg-emerald-50/30'
                              : r.status === 'skipped'
                                ? 'bg-blue-50/30'
                                : r.status === 'error'
                                  ? 'bg-red-50/40'
                                  : blocked
                                    ? 'bg-red-50/30'
                                    : r.warnings.length > 0
                                      ? 'bg-amber-50/30'
                                      : ''
                          return (
                            <TableRow key={r.index} className={rowTone}>
                              <TableCell className="text-xs text-gray-500 align-top pt-3">
                                {r.index}
                              </TableCell>
                              <TableCell className="align-top">
                                <Input
                                  value={r.licensePlate}
                                  onChange={(e) =>
                                    updateRow(r.index, { licensePlate: e.target.value })
                                  }
                                  disabled={!isEditable}
                                  placeholder="RAA123A"
                                  className="h-8 text-xs font-mono uppercase"
                                />
                              </TableCell>
                              <TableCell className="align-top">
                                <MakeModelCombobox
                                  value={r.makeModel}
                                  onValueChange={(next) => updateRow(r.index, { makeModel: next })}
                                  models={carModels}
                                  disabled={!isEditable}
                                />
                              </TableCell>
                              <TableCell className="align-top">
                                <Input
                                  value={r.vin}
                                  onChange={(e) => updateRow(r.index, { vin: e.target.value })}
                                  disabled={!isEditable}
                                  placeholder="(optional)"
                                  className="h-8 text-xs font-mono"
                                />
                              </TableCell>
                              <TableCell className="align-top">
                                <div className="flex flex-col gap-1 pt-1">
                                  {r.status === 'success' && (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Added
                                    </Badge>
                                  )}
                                  {r.status === 'skipped' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 w-fit cursor-help">
                                          <MinusCircle className="h-3 w-3 mr-1" /> Skipped
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="left">
                                        {r.resultMessage || 'Already assigned'}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {r.status === 'error' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-red-50 text-red-700 border-red-200 w-fit cursor-help">
                                          <XCircle className="h-3 w-3 mr-1" /> Failed
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="left">
                                        {r.resultMessage || 'Failed'}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {r.status === 'pending' && blocked && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-red-50 text-red-700 border-red-200 w-fit cursor-help">
                                          <XCircle className="h-3 w-3 mr-1" /> Blocked
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-xs">
                                        <ul className="list-disc pl-4 space-y-0.5">
                                          {r.errors.map((m, i) => (
                                            <li key={i}>{m}</li>
                                          ))}
                                        </ul>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {r.status === 'pending' && !blocked && r.warnings.length > 0 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-amber-50 text-amber-800 border-amber-200 w-fit cursor-help">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          {r.warnings[0]}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-xs">
                                        <ul className="list-disc pl-4 space-y-0.5">
                                          {r.warningDetails.map((m, i) => (
                                            <li key={i}>{m}</li>
                                          ))}
                                        </ul>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {r.status === 'pending' &&
                                    !blocked &&
                                    r.warnings.length === 0 && (
                                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
                                      </Badge>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell className="align-top pt-2">
                                {isEditable && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeRow(r.index)}
                                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                                        aria-label="Remove row"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">Remove row</TooltipContent>
                                  </Tooltip>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TooltipProvider>
                </div>
              </div>
            </>
          )}

          {rows.length === 0 && !parseError && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <FileSpreadsheet className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-700">No file selected</p>
                <p className="text-xs text-gray-500 mt-1">
                  Download the template, fill it in, then upload it here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isProcessing}>
            <X className="h-4 w-4 mr-2" />
            {didRun ? 'Close' : 'Cancel'}
          </Button>
          <Button
            type="button"
            disabled={rows.length === 0 || importable === 0 || isProcessing}
            onClick={handleConfirmImport}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {importable > 0 ? `${importable} vehicle${importable === 1 ? '' : 's'}` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
