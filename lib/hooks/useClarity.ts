"use client"

import { useCallback } from 'react'

interface ClarityEventData {
  [key: string]: any
}

export function useClarity() {
  const trackEvent = useCallback((eventName: string, data?: ClarityEventData) => {
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('event', eventName, data)
    }
  }, [])

  const setPageView = useCallback((pagePath: string) => {
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('set', 'page_view', pagePath)
    }
  }, [])

  const setUser = useCallback((userId: string, userProperties?: ClarityEventData) => {
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('set', 'user_id', userId)
      if (userProperties) {
        window.clarity('set', 'user_properties', userProperties)
      }
    }
  }, [])

  const setSession = useCallback((sessionData: ClarityEventData) => {
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('set', 'session_data', sessionData)
    }
  }, [])

  return {
    trackEvent,
    setPageView,
    setUser,
    setSession
  }
}

// Add Clarity to the global window object for TypeScript
declare global {
  interface Window {
    clarity: (command: string, ...args: any[]) => void
  }
} 