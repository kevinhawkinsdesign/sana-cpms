import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'RWF',
  });
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) {
    return '-';
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '-';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12; // Convert to 12-hour format and handle midnight (0 becomes 12)
  return `${day}-${month}-${year} ${hours}:${minutes}${ampm}`;
}

export function parsePriceString(priceString: string) {
  const [currency, price] = priceString.split(" ");
  const formattedPrice = parseFloat(price.replace(/,/g, ''));
  return {
    price: formattedPrice,
    currency: currency
  };
}


/**
 * Debounce function to limit the rate at which a function can fire
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Generate a random string for use as IDs
 */
export function generateId(length = 8): string {
  return Math.random().toString(36).substring(2, length + 2);
}

export function sanitizeDecimalInput(value: string): string {
  if (!value) return ''
  const filtered = value.replace(/[^0-9.,]/g, '')
  const firstSeparatorIndex = filtered.search(/[.,]/)

  if (firstSeparatorIndex === -1) {
    return filtered
  }

  const separator = filtered[firstSeparatorIndex]
  const beforeSeparator = filtered.slice(0, firstSeparatorIndex + 1)
  const afterSeparator = filtered
    .slice(firstSeparatorIndex + 1)
    .replace(/[.,]/g, '')

  return `${beforeSeparator}${afterSeparator}`
}

export function parseDecimal(value?: string | null): number | undefined {
  if (!value) return undefined
  const normalized = value.replace(',', '.')
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}
