/**
 * Auth storage utilities for safely accessing authentication tokens
 * Handles localStorage access with proper error handling for sandboxed contexts
 */

import { safeGetItem } from './safeStorage';

/**
 * Safely get auth tokens from localStorage
 * Returns parsed tokens object or null if not available
 */
export const getAuthTokens = (): { accessToken?: string; refreshToken?: string } | null => {
  const storedTokens = safeGetItem('auth_tokens');
  if (!storedTokens) {
    return null;
  }
  
  try {
    return JSON.parse(storedTokens);
  } catch (error) {
    console.error('Error parsing auth tokens:', error);
    return null;
  }
};

/**
 * Safely get access token from localStorage
 * Returns the access token string or empty string if not available
 */
export const getAccessToken = (): string => {
  const storedTokens = safeGetItem('auth_tokens');
  if (!storedTokens) {
    // Fallback to old accessToken key for backward compatibility
    return safeGetItem('accessToken') || '';
  }
  
  try {
    const tokens = JSON.parse(storedTokens);
    return tokens.accessToken || '';
  } catch (error) {
    console.error('Error parsing auth tokens:', error);
    // Fallback to old accessToken key
    return safeGetItem('accessToken') || '';
  }
};

