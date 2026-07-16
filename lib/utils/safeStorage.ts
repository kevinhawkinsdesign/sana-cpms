/**
 * Safe localStorage utilities that handle sandboxed contexts and SSR
 * 
 * These utilities safely access localStorage and handle cases where:
 * - Code runs during SSR (window is undefined)
 * - Code runs in sandboxed iframes (localStorage is blocked)
 * - localStorage is disabled or throws errors
 */

/**
 * Safely get an item from localStorage
 * Returns null if localStorage is not available or throws an error
 */
export const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch (error) {
    // Handle SecurityError (sandboxed iframe) or other localStorage errors
    if (error instanceof DOMException) {
      console.warn(`localStorage access denied for key "${key}":`, error.message);
    } else {
      console.warn(`localStorage error for key "${key}":`, error);
    }
    return null;
  }
};

/**
 * Safely set an item in localStorage
 * Silently fails if localStorage is not available or throws an error
 */
export const safeSetItem = (key: string, value: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Handle SecurityError (sandboxed iframe), QuotaExceededError, or other errors
    if (error instanceof DOMException) {
      console.warn(`localStorage set failed for key "${key}":`, error.message);
    } else {
      console.warn(`localStorage error for key "${key}":`, error);
    }
    return false;
  }
};

/**
 * Safely remove an item from localStorage
 * Silently fails if localStorage is not available or throws an error
 */
export const safeRemoveItem = (key: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    // Handle SecurityError (sandboxed iframe) or other localStorage errors
    if (error instanceof DOMException) {
      console.warn(`localStorage remove failed for key "${key}":`, error.message);
    } else {
      console.warn(`localStorage error for key "${key}":`, error);
    }
    return false;
  }
};

/**
 * Check if localStorage is available and accessible
 */
export const isLocalStorageAvailable = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

