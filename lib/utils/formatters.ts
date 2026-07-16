/**
 * Formats an enum value into a readable string
 * Example: USER_ADMIN -> User Admin
 */
export function formatEnumValue(value: string | undefined | null): string {
    if (!value) return '';
    
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  /**
   * Gets options array from enum object for select inputs
   */
  export function getEnumOptions(enumObject: Record<string, string>) {
    return Object.values(enumObject).map(value => ({
      value,
      label: formatEnumValue(value)
    }));
  }
  
  /**
   * Formats currency based on locale and currency code
   */
  export function formatCurrency(amount = 0, currency = 'RWF'): string {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency,
    });
  }
  
  /**
   * Formats a date string to a readable format
   * Format: DD-MM-YYYY HH:MMam/pm
   */
  export function formatDate(dateString: string | undefined | null): string {
    if (!dateString) {
      return '-';
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '-';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12; // Convert to 12-hour format

    return `${day}-${month}-${year} ${hours}:${minutes}${ampm}`;
  }

  /**
   * Formats a phone number based on country code
   * Supports Rwanda (+250) and Kenya (+254) with fallback for other countries
   */
export function formatPhoneNumber(value: string, countryCode: 'rw' | 'ke'): string {
  const cleaned = value.replace(/\D/g, '');

  if (countryCode === 'rw') {
    // Rwanda: +250XXXXXXXXX
      if (cleaned.startsWith('250')) {
        return `+${cleaned}`;
      } else if (cleaned.startsWith('0')) {
        return `+250${cleaned.slice(1)}`;
      }
      return cleaned.length > 0 ? `+250${cleaned}` : '';
    }

    if (countryCode === 'ke') {
      // Kenya: +254XXXXXXXXX
      if (cleaned.startsWith('254')) {
        return `+${cleaned}`;
      } else if (cleaned.startsWith('0')) {
        return `+254${cleaned.slice(1)}`;
      }
      return cleaned.length > 0 ? `+254${cleaned}` : '';
    }

    // Fallback for other countries (US format)
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    return match ? `${match[1]}${match[1] && match[2] ? '-' : ''}${match[2]}${match[2] && match[3] ? '-' : ''}${match[3]}` : value;
  }

const MAX_METER_DECIMALS = 4

/**
 * Allows only digits, commas, and periods in meter readings.
 */
export function sanitizeMeterReadingInput(value: string): string {
  return value.replace(/[^\d.,]/g, '')
}

/**
 * Removes grouping characters and ensures at most one decimal point with limited precision.
 */
export function stripMeterReadingFormatting(value: string): string {
  const sanitized = sanitizeMeterReadingInput(value)
  if (!sanitized) return ''

  let cleaned = sanitized.replace(/,/g, '')
  const dotIndex = cleaned.indexOf('.')

  if (dotIndex !== -1) {
    const before = cleaned.slice(0, dotIndex + 1)
    const after = cleaned.slice(dotIndex + 1).replace(/\./g, '')
    cleaned = `${before}${after.slice(0, MAX_METER_DECIMALS)}`
  } else {
    cleaned = cleaned.replace(/\./g, '')
  }

  return cleaned
}

/**
 * Formats the meter reading string with thousand separators while preserving decimals.
 */
export function formatMeterReadingDisplay(value: string): string {
  const sanitizedOriginal = sanitizeMeterReadingInput(value)
  const cleaned = stripMeterReadingFormatting(value)

  if (!cleaned) return ''

  const endsWithDecimal =
    sanitizedOriginal.endsWith('.') || sanitizedOriginal.endsWith(',')

  const [integerPartRaw, decimalPartRaw] = cleaned.split('.')
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, '') || '0'
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  if (decimalPartRaw === undefined) {
    return formattedInteger
  }

  if (decimalPartRaw.length === 0) {
    return endsWithDecimal ? `${formattedInteger}.` : formattedInteger
  }

  return `${formattedInteger}.${decimalPartRaw}`
}

/**
 * Converts the formatted meter reading into a floating-point number.
 */
export function parseMeterReadingValue(value: string): number | undefined {
  const cleaned = stripMeterReadingFormatting(value)

  if (!cleaned || cleaned === '.' || cleaned === '-') {
    return undefined
  }

  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Formats the duration between two timestamps as "Xh Ym".
 * Returns 'Ongoing' when endTime is null / undefined / empty.
 */
export function formatSessionDuration(startTime: string, endTime: string | null | undefined): string {
  if (!endTime) return 'Ongoing'
  const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${diffHours}h ${diffMinutes}m`
}

/**
 * Uppercases a license plate and removes all whitespace characters.
 */
export function normalizeLicensePlate(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

/**
 * Maps session status for display purposes.
 * COMPLETED status is displayed as "UNPAID" in red.
 * Backend communication still uses "COMPLETED".
 */
export function getStatusDisplayLabel(status: string | undefined | null): string {
  if (!status) return ''

  const normalizedStatus = status.toUpperCase()

  switch (normalizedStatus) {
    case 'COMPLETED': return 'UNPAID'
    case 'EBM_ISSUED': return 'EBM Issued'
    case 'PAID': return 'Paid'
    case 'STARTED': return 'Charging'
    case 'PAUSED': return 'Paused'
    case 'CANCELLED': return 'Cancelled'
    case 'REFUNDED': return 'Refunded'
    default: return status
  }
}

/**
 * Gets the color class for session status display.
 * COMPLETED status is shown in red (as UNPAID).
 */
export function getStatusDisplayColor(status: string | undefined | null): string {
  if (!status) return 'bg-gray-100 text-gray-800'
  
  // Normalize to uppercase for comparison
  const normalizedStatus = status.toUpperCase()
  
  switch (normalizedStatus) {
    case 'STARTED':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'PAUSED':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'COMPLETED':
      return 'bg-red-100 text-red-800 border-red-200' // Red for UNPAID
    case 'PAID':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'EBM_ISSUED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'REFUNDED':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}
