import { useState, useEffect, useCallback } from 'react'
import { type Shift } from '@/lib/api/shifts'

interface DraftShift extends Omit<Shift, 'id' | 'isActive'> {
  id: string // Temporary ID for draft
  isDraft: true
  createdAt: string // ISO timestamp
}

interface DraftStorage {
  shifts: DraftShift[]
  lastModified: string
}

const STORAGE_KEY = 'shift_drafts'
const EXPIRY_DAYS = 7

export const useDraftShifts = () => {
  const [drafts, setDrafts] = useState<DraftShift[]>([])
  const [isDraftMode, setIsDraftMode] = useState(false)

  // Load drafts from localStorage on mount
  useEffect(() => {
    loadDrafts()
  }, [])

  // Save drafts to localStorage whenever they change
  useEffect(() => {
    if (drafts.length > 0) {
      saveDrafts(drafts)
    }
  }, [drafts])

  const loadDrafts = useCallback(() => {
    if (typeof window === 'undefined') {
      setDrafts([]);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setDrafts([])
        return
      }

      const data: DraftStorage = JSON.parse(stored)
      const now = new Date()

      // Filter out expired drafts (older than 7 days)
      const validDrafts = data.shifts.filter(draft => {
        const createdDate = new Date(draft.createdAt)
        const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceCreation <= EXPIRY_DAYS
      })

      // If we filtered out any drafts, save the updated list
      if (validDrafts.length !== data.shifts.length) {
        saveDrafts(validDrafts)
      }

      setDrafts(validDrafts)
    } catch (error) {
      // Handle SecurityError (sandboxed iframe) or other localStorage errors
      if (error instanceof DOMException) {
        console.warn('localStorage access denied for drafts:', error.message);
      } else {
        console.error('Error loading drafts:', error);
      }
      setDrafts([])
    }
  }, [])

  const saveDrafts = useCallback((shiftsToSave: DraftShift[]) => {
    if (typeof window === 'undefined') return;

    try {
      const data: DraftStorage = {
        shifts: shiftsToSave,
        lastModified: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      // Handle SecurityError (sandboxed iframe) or other localStorage errors
      if (error instanceof DOMException) {
        console.warn('localStorage access denied for drafts:', error.message);
      } else {
        console.error('Error saving drafts:', error);
      }
    }
  }, [])

  const addDraft = useCallback((shiftData: Omit<DraftShift, 'id' | 'isDraft' | 'createdAt'>) => {
    const newDraft: DraftShift = {
      ...shiftData,
      id: `draft-${Date.now()}-${Math.random()}`,
      isDraft: true,
      createdAt: new Date().toISOString()
    }

    setDrafts(prev => [...prev, newDraft])
    return newDraft
  }, [])

  const updateDraft = useCallback((draftId: string, updates: Partial<DraftShift>) => {
    setDrafts(prev =>
      prev.map(draft =>
        draft.id === draftId
          ? { ...draft, ...updates }
          : draft
      )
    )
  }, [])

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts(prev => prev.filter(draft => draft.id !== draftId))
  }, [])

  const clearAllDrafts = useCallback(() => {
    setDrafts([])
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        if (error instanceof DOMException) {
          console.warn('localStorage access denied for drafts:', error.message);
        }
      }
    }
  }, [])

  const getDraftCount = useCallback(() => {
    return drafts.length
  }, [drafts])

  const getDraftsForWeek = useCallback((startDate: Date) => {
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59, 999)

    return drafts.filter(draft => {
      const draftDate = new Date(draft.shiftDate)
      return draftDate >= startDate && draftDate <= endDate
    })
  }, [drafts])

  const toggleDraftMode = useCallback(() => {
    setIsDraftMode(prev => !prev)
  }, [])

  return {
    drafts,
    isDraftMode,
    setIsDraftMode,
    toggleDraftMode,
    addDraft,
    updateDraft,
    deleteDraft,
    clearAllDrafts,
    getDraftCount,
    getDraftsForWeek,
    reloadDrafts: loadDrafts
  }
}
