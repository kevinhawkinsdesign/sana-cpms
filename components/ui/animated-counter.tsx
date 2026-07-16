'use client'

import { useEffect, useRef, useState, useMemo } from 'react'

interface AnimatedCounterProps {
  readonly value: number
  readonly decimals?: number
  readonly suffix?: string
  readonly duration?: number
  readonly className?: string
  readonly highlightOnChange?: boolean
}

const DIGIT_H = 28

/**
 * Odometer / rolling-number animated counter.
 * Each digit rolls upward from its old value to the new value.
 * Color #FFD400 on change, with a zoom pulse.
 */
export function AnimatedCounter({
  value,
  decimals = 2,
  suffix = '',
  duration = 1200,
  className = '',
  highlightOnChange = true,
}: AnimatedCounterProps) {
  const formatted = value.toFixed(decimals)
  const prevFormattedRef = useRef(formatted)
  const [isAnimating, setIsAnimating] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const chars = useMemo(() => formatted.split(''), [formatted])
  const prevChars = useRef(chars)

  useEffect(() => {
    const prev = prevFormattedRef.current
    prevFormattedRef.current = formatted

    if (prev === formatted) return

    prevChars.current = prev.split('')
    setIsAnimating(true)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false)
    }, duration + 100)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [formatted, duration])

  return (
    <span
      className={`
        inline-flex items-center transition-transform
        ${isAnimating && highlightOnChange ? 'scale-110' : 'scale-100'}
        ${className}
      `}
      style={{
        color: isAnimating && highlightOnChange ? '#FFD400' : undefined,
        transition: `transform ${duration}ms cubic-bezier(0.22,1,0.36,1), color 200ms ease`,
      }}
    >
      {chars.map((char, i) => {
        const isDigit = /\d/.test(char)
        if (!isDigit) {
          return <span key={`s-${char}-${i}`} className="inline-block" style={{ lineHeight: `${DIGIT_H}px` }}>{char}</span>
        }

        const to = Number(char)
        const prevChar = prevChars.current[i]
        const from = prevChar != null && /\d/.test(prevChar) ? Number(prevChar) : to
        const changed = from !== to && isAnimating

        return (
          <RollingDigit
            key={`d-${i}`}
            from={from}
            to={to}
            animate={changed}
            duration={duration}
          />
        )
      })}
      {suffix && <span style={{ lineHeight: `${DIGIT_H}px` }}>{suffix}</span>}
    </span>
  )
}

interface RollingDigitProps {
  readonly from: number
  readonly to: number
  readonly animate: boolean
  readonly duration: number
}

function RollingDigit({ from, to, animate, duration }: RollingDigitProps) {
  const seq = useMemo(() => {
    if (!animate || from === to) return [to]
    const digits: number[] = []
    const steps = (to - from + 10) % 10 || 10
    for (let i = 0; i <= steps; i++) {
      digits.push((from + i) % 10)
    }
    return digits
  }, [from, to, animate])

  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = stripRef.current
    if (!animate || !el) return
    // Reset to top
    el.style.transition = 'none'
    el.style.transform = 'translateY(0)'
    // Force reflow then animate
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight
    el.style.transition = `transform ${duration}ms cubic-bezier(0.22,1,0.36,1)`
    el.style.transform = `translateY(-${(seq.length - 1) * DIGIT_H}px)`
  }, [animate, seq, duration])

  if (!animate) {
    return (
      <span
        className="inline-block text-center overflow-hidden"
        style={{ height: DIGIT_H, width: '0.62em', lineHeight: `${DIGIT_H}px` }}
      >
        {to}
      </span>
    )
  }

  return (
    <span
      className="inline-block text-center overflow-hidden"
      style={{ height: DIGIT_H, width: '0.62em' }}
    >
      <div ref={stripRef}>
        {seq.map((d) => (
          <div
            key={`roll-${d}`}
            className="text-center font-inherit"
            style={{ height: DIGIT_H, lineHeight: `${DIGIT_H}px` }}
          >
            {d}
          </div>
        ))}
      </div>
    </span>
  )
}
