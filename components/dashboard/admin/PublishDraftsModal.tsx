'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Clock, MapPin, User, Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { type User as OperatorUser } from '@/lib/api/shifts'

interface DraftShift {
  id: string
  operatorId: string
  shiftDate: string
  startTime?: string
  endTime?: string
  chargerId?: string
  operator?: {
    firstName?: string
    lastName?: string
  }
  charger?: {
    name?: string
  }
  isDraft: true
}

interface PublishDraftsModalProps {
  isOpen: boolean
  drafts: DraftShift[]
  operators: OperatorUser[]
  onClose: () => void
  onPublish: (draftIds: string[]) => Promise<void>
}

export const PublishDraftsModal: React.FC<PublishDraftsModalProps> = ({
  isOpen,
  drafts,
  operators,
  onClose,
  onPublish
}) => {
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set(drafts.map(d => d.id)))
  const [isPublishing, setIsPublishing] = useState(false)
  
  useEffect(() => {
    setSelectedDrafts(new Set(drafts.map(d => d.id)))
  }, [drafts])

  // Group drafts by operator
  const draftsByOperator = useMemo(() => {
    const grouped: { [operatorId: string]: DraftShift[] } = {}
    drafts.forEach(draft => {
      if (!grouped[draft.operatorId]) {
        grouped[draft.operatorId] = []
      }
      grouped[draft.operatorId].push(draft)
    })
    return grouped
  }, [drafts])

  const toggleDraft = (draftId: string) => {
    setSelectedDrafts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(draftId)) {
        newSet.delete(draftId)
      } else {
        newSet.add(draftId)
      }
      return newSet
    })
  }

  const toggleAll = () => {
    if (selectedDrafts.size === drafts.length) {
      setSelectedDrafts(new Set())
    } else {
      setSelectedDrafts(new Set(drafts.map(d => d.id)))
    }
  }

  const handlePublish = async () => {
    if (selectedDrafts.size === 0) return

    setIsPublishing(true)
    try {
      await onPublish(Array.from(selectedDrafts))
      onClose()
    } catch (error) {
      console.error('Error publishing drafts:', error)
    } finally {
      setIsPublishing(false)
    }
  }

  const getOperatorName = (operatorId: string) => {
    const operator = operators.find(op => op.id === operatorId)
    if (operator) {
      return `${operator.lastName || ''}, ${operator.firstName || ''}`.trim()
    }
    return 'Unknown Operator'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-600" />
            Publish Draft Shifts
          </DialogTitle>
          <DialogDescription>
            Select the draft shifts you want to publish. Published shifts will be visible to all users and operators.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Select All */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border mb-4">
            <Checkbox
              id="select-all"
              checked={selectedDrafts.size === drafts.length}
              onCheckedChange={toggleAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer flex-1"
            >
              Select All ({drafts.length} draft{drafts.length === 1 ? '' : 's'})
            </label>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {selectedDrafts.size} selected
            </Badge>
          </div>

          {/* Drafts List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {Object.entries(draftsByOperator).map(([operatorId, operatorDrafts]) => (
                <div key={operatorId} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <User className="h-4 w-4" />
                    {getOperatorName(operatorId)}
                    <Badge variant="outline" className="ml-auto">
                      {operatorDrafts.length} shift{operatorDrafts.length === 1 ? '' : 's'}
                    </Badge>
                  </div>

                  {operatorDrafts.map(draft => (
                    <div
                      key={draft.id}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer
                        ${selectedDrafts.has(draft.id)
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-white border-gray-200 hover:border-amber-200'
                        }
                      `}
                      onClick={() => toggleDraft(draft.id)}
                    >
                      <Checkbox
                        checked={selectedDrafts.has(draft.id)}
                        onCheckedChange={() => toggleDraft(draft.id)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                          <span>
                            {formatDate(draft.shiftDate)}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-700">
                            {draft.startTime && draft.endTime
                              ? `${draft.startTime} - ${draft.endTime}`
                              : 'Flexible'}
                          </span>
                        </div>

                        {draft.charger?.name && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span>{draft.charger.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Warning */}
          {selectedDrafts.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Publishing {selectedDrafts.size} shift{selectedDrafts.size === 1 ? '' : 's'} will make {selectedDrafts.size === 1 ? 'it' : 'them'} visible to all users and {selectedDrafts.size === 1 ? 'remove it' : 'remove them'} from drafts.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={selectedDrafts.size === 0 || isPublishing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPublishing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Publishing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Publish {selectedDrafts.size} Shift{selectedDrafts.size === 1 ? '' : 's'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
