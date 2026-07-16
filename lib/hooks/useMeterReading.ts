import { useState, useEffect } from 'react'
import {
  sanitizeMeterReadingInput,
  stripMeterReadingFormatting,
} from '@/lib/utils/formatters'

export function useMeterReading() {
  const [meterReading, setMeterReading] = useState('')
  const [meterImage, setMeterImage] = useState('')
  const [meterReading2, setMeterReading2] = useState('')
  const [meterImage2, setMeterImage2] = useState('')

  useEffect(() => {
    if (!meterReading) setMeterImage('')
  }, [meterReading])

  useEffect(() => {
    if (!meterReading2) setMeterImage2('')
  }, [meterReading2])

  function handleMeterReadingChange(value: string) {
    setMeterReading(sanitizeMeterReadingInput(value))
  }

  function handleMeterReadingFocus() {
    setMeterReading((prev) => {
      const stripped = stripMeterReadingFormatting(prev)
      return stripped === prev ? prev : stripped
    })
  }

  function preventInvalidNumberKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault()
    }
  }

  function resetMeterReadings() {
    setMeterReading('')
    setMeterImage('')
    setMeterReading2('')
    setMeterImage2('')
  }

  return {
    meterReading,
    setMeterReading,
    meterImage,
    setMeterImage,
    meterReading2,
    setMeterReading2,
    meterImage2,
    setMeterImage2,
    handleMeterReadingChange,
    handleMeterReadingFocus,
    preventInvalidNumberKey,
    resetMeterReadings,
  }
}
