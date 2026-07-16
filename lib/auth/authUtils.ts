import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  exp: number;
  role?: string;
  userId?: string;
  email?: string;
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return localStorage.getItem('token');
  } catch (error) {
    if (error instanceof DOMException) {
      console.warn('localStorage access denied for token:', error.message);
    }
    return null;
  }
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem('token', token);
  } catch (error) {
    if (error instanceof DOMException) {
      console.warn('localStorage set failed for token:', error.message);
    }
  }
};

export const removeToken = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem('token');
  } catch (error) {
    if (error instanceof DOMException) {
      console.warn('localStorage remove failed for token:', error.message);
    }
  }
};

export const isTokenValid = (): boolean => {
  const token = getToken();
  if (!token) return false;

  try {
    const decodedToken = jwtDecode<DecodedToken>(token);
    return decodedToken.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const getTokenData = (): DecodedToken | null => {
  const token = getToken();
  if (!token) return null;

  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
};

export const getUserRole = (): string | undefined => {
  const tokenData = getTokenData();
  return tokenData?.role;
};

export const hasRequiredRole = (requiredRoles: string[]): boolean => {
  if (!requiredRoles.length) return true;
  
  const userRole = getUserRole();
  if (!userRole) return false;
  
  return requiredRoles.includes(userRole);
};