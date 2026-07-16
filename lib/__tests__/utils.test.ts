import { cn, formatCurrency, formatDate, parsePriceString, debounce, generateId, sanitizeDecimalInput, parseDecimal } from '../utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
      expect(cn({ foo: true, bar: false })).toBe('foo')
    })
  })

  describe('formatCurrency', () => {
    it('should format currency in RWF', () => {
      expect(formatCurrency(1000)).toContain('1,000')
      expect(formatCurrency(1234567)).toContain('1,234,567')
      expect(formatCurrency(0)).toContain('0')
    })
  })

  describe('formatDate', () => {
    it('should format valid date strings', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const formatted = formatDate(date.toISOString())
      expect(formatted).toMatch(/\d{2}-\d{2}-\d{4} \d{1,2}:\d{2}(am|pm)/)
    })

    it('should return "-" for invalid dates', () => {
      expect(formatDate(null)).toBe('-')
      expect(formatDate(undefined)).toBe('-')
      expect(formatDate('invalid-date')).toBe('-')
    })
  })

  describe('parsePriceString', () => {
    it('should parse price strings correctly', () => {
      const result = parsePriceString('RWF 1,234.56')
      expect(result.currency).toBe('RWF')
      expect(result.price).toBe(1234.56)
    })

    it('should handle prices without commas', () => {
      const result = parsePriceString('RWF 1234.56')
      expect(result.price).toBe(1234.56)
    })
  })

  describe('debounce', () => {
    jest.useFakeTimers()

    it('should debounce function calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 300)

      debouncedFn('arg1')
      debouncedFn('arg2')
      debouncedFn('arg3')

      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(300)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('arg3')
    })

    afterEach(() => {
      jest.clearAllTimers()
    })
  })

  describe('generateId', () => {
    it('should generate a string of specified length', () => {
      const id = generateId(8)
      expect(id).toHaveLength(8)
      expect(typeof id).toBe('string')
    })

    it('should generate different IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('sanitizeDecimalInput', () => {
    it('should remove non-numeric characters except separators', () => {
      expect(sanitizeDecimalInput('abc123.45def')).toBe('123.45')
      // The function treats the first separator as decimal, so comma becomes decimal separator
      expect(sanitizeDecimalInput('1,234.56')).toBe('1,23456')
    })

    it('should handle empty strings', () => {
      expect(sanitizeDecimalInput('')).toBe('')
    })

    it('should only allow one decimal separator', () => {
      expect(sanitizeDecimalInput('12.34.56')).toBe('12.3456')
    })
  })

  describe('parseDecimal', () => {
    it('should parse valid decimal strings', () => {
      expect(parseDecimal('123.45')).toBe(123.45)
      expect(parseDecimal('123,45')).toBe(123.45)
      expect(parseDecimal('0')).toBe(0)
    })

    it('should return undefined for invalid inputs', () => {
      expect(parseDecimal(null)).toBeUndefined()
      expect(parseDecimal(undefined)).toBeUndefined()
      expect(parseDecimal('abc')).toBeUndefined()
      expect(parseDecimal('')).toBeUndefined()
    })
  })
})

