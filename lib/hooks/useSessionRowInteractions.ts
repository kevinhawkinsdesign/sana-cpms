'use client'

import { useCallback, useRef, useState } from 'react'

interface UseSessionRowInteractionsOptions {
  /** Fired on a normal tap/click that wasn't preceded by a long-press. */
  onClick: (id: string) => void
  /** How long the user must hold before the long-press fires (ms). */
  longPressDurationMs?: number
  /**
   * Pixel drift threshold before we cancel a pending long-press. Mobile users
   * scrolling a table will naturally move their finger; if that movement
   * exceeds this distance we treat the gesture as a scroll, not a hold.
   */
  movementTolerancePx?: number
}

/**
 * Shared row-interaction model for session tables.
 *
 * - A tap/click opens the details popup (via `onClick`).
 * - A long-press (default 500 ms) opens that row's actions dropdown — the
 *   consumer renders a controlled `<DropdownMenu open={openActionsRowId === id}>`.
 *
 * The hook also swallows the click event that fires after a long-press is
 * released, so you don't get both the popup and the dropdown at once.
 *
 * Touch drift > `movementTolerancePx` cancels the long-press so vertical
 * scrolls on phones don't accidentally open the actions menu.
 */
export function useSessionRowInteractions({
  onClick,
  longPressDurationMs = 500,
  movementTolerancePx = 10,
}: UseSessionRowInteractionsOptions) {
  const [openActionsRowId, setOpenActionsRowId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)
  /** Pointer position captured on touch/mouse start; used for drift detection. */
  const startPositionRef = useRef<{ x: number; y: number } | null>(null)

  const cancelLongPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPositionRef.current = null
  }, [])

  const startLongPress = useCallback(
    (id: string, position?: { x: number; y: number }) => {
      cancelLongPress()
      longPressFiredRef.current = false
      startPositionRef.current = position ?? null
      timerRef.current = setTimeout(() => {
        longPressFiredRef.current = true
        setOpenActionsRowId(id)
        timerRef.current = null
        startPositionRef.current = null
      }, longPressDurationMs)
    },
    [cancelLongPress, longPressDurationMs],
  )

  const checkMovement = useCallback(
    (x: number, y: number) => {
      const start = startPositionRef.current
      if (!start) return
      const dx = x - start.x
      const dy = y - start.y
      if (dx * dx + dy * dy > movementTolerancePx * movementTolerancePx) {
        cancelLongPress()
      }
    },
    [cancelLongPress, movementTolerancePx],
  )

  const handleClick = useCallback(
    (id: string) => {
      if (longPressFiredRef.current) {
        // The long-press already opened the actions menu — swallow the click
        // that fires on pointer release.
        longPressFiredRef.current = false
        return
      }
      onClick(id)
    },
    [onClick],
  )

  /**
   * Props to spread onto the clickable `<TableRow>`. Pass the row's id (we use
   * `id` here, not `sessionId`, to keep it stable for non-session rows too).
   *
   * Hover styling: a stronger blue tint + a left-side accent bar (inset shadow
   * rather than a real border, to avoid the row jumping by 3px on hover) and
   * a soft inner ring make it obvious the row is clickable.
   */
  const getRowProps = useCallback(
    (id: string) => ({
      onClick: () => handleClick(id),
      onMouseDown: (e: React.MouseEvent) =>
        startLongPress(id, { x: e.clientX, y: e.clientY }),
      onMouseMove: (e: React.MouseEvent) => checkMovement(e.clientX, e.clientY),
      onMouseUp: cancelLongPress,
      onMouseLeave: cancelLongPress,
      onTouchStart: (e: React.TouchEvent) => {
        const t = e.touches[0]
        startLongPress(id, t ? { x: t.clientX, y: t.clientY } : undefined)
      },
      onTouchMove: (e: React.TouchEvent) => {
        const t = e.touches[0]
        if (t) checkMovement(t.clientX, t.clientY)
      },
      onTouchEnd: cancelLongPress,
      onTouchCancel: cancelLongPress,
      className:
        'cursor-pointer select-none transition-colors duration-150 ' +
        'hover:bg-blue-50 hover:shadow-[inset_3px_0_0_0_#2563eb] ' +
        'focus-visible:bg-blue-50 focus-visible:outline-none',
    }),
    [handleClick, startLongPress, checkMovement, cancelLongPress],
  )

  /**
   * Props to spread onto the action cell so its inner buttons / dropdown don't
   * bubble up and trigger the row click or the long-press timer.
   */
  const actionCellStopProps = {
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
  }

  /**
   * Props to spread onto the row's controlled `<DropdownMenu>`. `id` should
   * match the value passed to `getRowProps`.
   */
  const getDropdownProps = (id: string) => ({
    open: openActionsRowId === id,
    onOpenChange: (open: boolean) => setOpenActionsRowId(open ? id : null),
  })

  return {
    openActionsRowId,
    setOpenActionsRowId,
    getRowProps,
    actionCellStopProps,
    getDropdownProps,
  }
}
