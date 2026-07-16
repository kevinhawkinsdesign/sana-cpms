'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { getDashboardPathByRole, UserRole } from '@/lib/utils/roleRedirect';
import { useCountry } from '@/lib/providers/country-provider';
import {
  clearSentryUser,
  setSentryContext,
  setSentryUser,
} from '@/lib/utils/sentryUtils';

// Types for the new authentication system
export interface User {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  userType: 'GUEST' | 'KABISA_MEMBER' | 'KABISA_OWNER';
  imageUrl?: string;
  isVerified: boolean;
  autofillEnabled?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  organizationId?: string;
  organization?: { id: string; name: string; logo?: string };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: {
    withPassword: (email: string, password: string) => Promise<boolean>;
    withEmailCode: (email: string) => Promise<boolean>;
    withPhoneCode: (phone: string) => Promise<boolean>;
    withGoogle: (googleToken: string) => Promise<boolean>;
    verifyCode: (code: string, loginMethod: 'EMAIL_CODE' | 'PHONE_CODE', email?: string, phone?: string) => Promise<boolean>;
  };
  register: {
    withPassword: (data: RegisterData) => Promise<boolean>;
    withEmailCode: (data: RegisterData) => Promise<boolean>;
    withPhoneCode: (data: RegisterData) => Promise<boolean>;
    verifyCode: (code: string, loginMethod: 'EMAIL_CODE' | 'PHONE_CODE', email?: string, phone?: string) => Promise<boolean>;
  };
  /** Optional `redirectTo` lets callers land somewhere other than the plain
   *  login page (e.g. back to an invite link with a callbackUrl) — the redirect
   *  happens inside logout, so callers must not also navigate themselves. */
  logout: (redirectTo?: string) => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  /** Adopt tokens minted outside this context (e.g. POST /auth/switch-org) —
   *  keeps in-memory state and localStorage in sync. */
  applyExternalTokens: (tokens: AuthTokens) => void;
  /** Adopt a full externally-minted session (user + tokens) — e.g. after
   *  signup-with-token, where there is no prior user to merge onto. */
  applyExternalSession: (user: User, tokens: AuthTokens) => void;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
  /** Resolves to the server-confirmed user (normalized fields merged in) on
   *  success, or null on failure — callers can adopt it as their new baseline. */
  updateUser: (data: Partial<User>) => Promise<User | null>;
  updateClientUser: (data: Partial<User>) => void;
  getDashboardPath: () => string;
}

export interface RegisterData {
  authMethod: 'EMAIL_CODE' | 'PHONE_CODE' | 'PASSWORD';
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  userType?: 'GUEST' | 'KABISA_MEMBER' | 'KABISA_OWNER';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Nullish coalescing (not ||) matters here: the static-export build sets
// this to "" on purpose (same-origin, whatever origin that turns out to be
// at runtime), and "" is falsy so `||` would silently discard it.
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Safe localStorage helpers that handle sandboxed contexts
  const safeLocalStorage = {
    getItem: (key: string): string | null => {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      try {
        return localStorage.getItem(key);
      } catch (error) {
        if (error instanceof DOMException) {
          console.warn(`localStorage access denied for "${key}":`, error.message);
        }
        return null;
      }
    },
    setItem: (key: string, value: string): boolean => {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        if (error instanceof DOMException) {
          console.warn(`localStorage set failed for "${key}":`, error.message);
        }
        return false;
      }
    },
    removeItem: (key: string): boolean => {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        if (error instanceof DOMException) {
          console.warn(`localStorage remove failed for "${key}":`, error.message);
        }
        return false;
      }
    }
  };

  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  });
  // useCountry() has a fallback, so it's safe to call even without CountryProvider
  // It will return { countryCode: 'rw', countryName: 'Rwanda' } as fallback
  const { countryCode: contextCountryCode } = useCountry();
  const router = useLocalizedRouter();
  
  // Helper to get country code from URL path (fallback when context isn't available)
  // Using a regular function (not useCallback) since it doesn't depend on any props/state that change
  function getCountryCodeFromUrl(): string {
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      if (pathParts[1] && pathParts[1].length === 2 && ['rw', 'ke'].includes(pathParts[1])) {
        return pathParts[1];
      }
    }
    return contextCountryCode || 'rw';
  }

  const syncSentryAuthState = (user: User | null) => {
    if (user) {
      const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      setSentryUser({
        id: user.id,
        email: user.email,
        username: fullName.length > 0 ? fullName : user.email,
        role: user.role,
      });

      setSentryContext('auth', {
        isAuthenticated: true,
        role: user.role,
        userType: user.userType,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
      });
    } else {
      clearSentryUser();
      setSentryContext('auth', null);
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      // Check if localStorage is available before accessing
      if (typeof window === 'undefined') {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const storedTokens = safeLocalStorage.getItem('auth_tokens');
        const storedUser = safeLocalStorage.getItem('auth_user');
        
        if (storedTokens && storedUser) {
          const tokens = JSON.parse(storedTokens);
          const user = JSON.parse(storedUser);
          
          // Map backend role to frontend role
          if (user && user.role === 'USER') {
            user.role = UserRole.CUSTOMER;
          }
          
          // Check if access token is still valid
          if (tokens.accessToken) {
            setState({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
            });
            syncSentryAuthState(user);
          } else {
            // Token expired, clear storage
            safeLocalStorage.removeItem('auth_tokens');
            safeLocalStorage.removeItem('auth_user');
            setState({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
            });
            syncSentryAuthState(null);
          }
        } else {
          setState({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
          });
          syncSentryAuthState(null);
        }
      } catch (error) {
        safeLocalStorage.removeItem('auth_tokens');
        safeLocalStorage.removeItem('auth_user');
        setState({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
        syncSentryAuthState(null);
      }
    };

    initializeAuth();
  }, []);

  // Listen for unauthorized API responses
  useEffect(() => {
    const handleUnauthorized = (event: CustomEvent) => {
      // Clear auth state and redirect to login
      updateAuthState(null, null);
      
      const currentPath = window.location.pathname + window.location.search;
      const countryCode = getCountryCodeFromUrl();
      const loginUrl = `/${countryCode}/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`;
      
      // Use router if available, otherwise use window.location
      if (router) {
        router.push(loginUrl);
      } else {
        window.location.href = loginUrl;
      }
    };

    // Add event listener
    window.addEventListener('auth:unauthorized', handleUnauthorized as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized as EventListener);
    };
  }, [router]);

  // API helper function
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth header if we have tokens
    if (state.tokens?.accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${state.tokens.accessToken}`,
      };
    }

    

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  // Token management
  const setTokens = (tokens: AuthTokens | null) => {
    if (tokens) {
      safeLocalStorage.setItem('auth_tokens', JSON.stringify(tokens));
    } else {
      safeLocalStorage.removeItem('auth_tokens');
    }
  };

  const setUser = (user: User | null) => {
    if (user) {
      safeLocalStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      safeLocalStorage.removeItem('auth_user');
    }
  };

  const updateAuthState = (user: User | null, tokens: AuthTokens | null) => {
    // // Map backend role to frontend role
    // if (user && user.role === 'USER') {
    //   user.role = UserRole.CUSTOMER;
    // }
    
    setState({
      user,
      tokens,
      isAuthenticated: !!user && !!tokens,
      isLoading: false,
    });
    
    // Store in localStorage
    if (user && tokens) {
      safeLocalStorage.setItem('auth_user', JSON.stringify(user));
      safeLocalStorage.setItem('auth_tokens', JSON.stringify(tokens));
    } else {
      safeLocalStorage.removeItem('auth_user');
      safeLocalStorage.removeItem('auth_tokens');
    }

    if (typeof window !== 'undefined' && window.clarity) {
      try {
        if (user && tokens) {
          window.clarity('identify', user.id, { role: user.role.toLowerCase() });
        } else {
          window.clarity('set', 'user_id', null);
          window.clarity('set', 'user_properties', null);
        }
      } catch (error) {
        console.warn('Clarity identity update failed:', error);
      }
    }

    syncSentryAuthState(user && tokens ? user : null);
  };

  const redirectAfterLogin = (userRole: string) => {
    const returnUrl = safeLocalStorage.getItem('returnUrl');
    if (returnUrl) {
      safeLocalStorage.removeItem('returnUrl');
      router.push(returnUrl);
    } else {
      router.push(getDashboardPathByRole(userRole));
    }
  };

  // Refresh token function
  const refreshToken = async (): Promise<boolean> => {
    try {
      if (!state.tokens?.refreshToken) {
        return false;
      }

      const data = await apiCall('/api/auth/refresh-token', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: state.tokens.refreshToken,
        }),
      });

      if (data.status === 'success' && data.data) {
        const newTokens = {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          expiresIn: data.data.expiresIn,
        };
        
        updateAuthState(state.user, newTokens);
        return true;
      }
      
      return false;
    } catch (error) {
      // Clear invalid tokens
      updateAuthState(null, null);
      return false;
    }
  };

  // Login methods
  const loginWithPassword = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiCall('/api/auth/login/password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      
      
      if (response.status === 'success' && response.data) {
        const { user, accessToken, refreshToken, expiresIn } = response.data;
        const tokens = { accessToken, refreshToken, expiresIn };
        
        updateAuthState(user, tokens);
        redirectAfterLogin(user.role);
        toast.success('Login successful!');
        return true;
      }

      return false;
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      return false;
    }
  };

  const loginWithEmailCode = async (email: string): Promise<boolean> => {
    try {

      
      const data = await apiCall('/api/auth/login/email', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (data.status === 'success') {
        toast.success(`Login code sent to ${data.data.maskedEmail}`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Failed to send login code');
      return false;
    }
  };

  const loginWithPhoneCode = async (phone: string): Promise<boolean> => {
    try {

      
      const data = await apiCall('/api/auth/login/phone', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      if (data.status === 'success') {
        toast.success(`Login code sent to ${data.data.maskedPhone}`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Failed to send login code');
      return false;
    }
  };

  const loginWithGoogle = async (googleToken: string): Promise<boolean> => {
    try {
      const response = await apiCall('/api/auth/login/google', {
        method: 'POST',
        body: JSON.stringify({ googleToken }),
      });


      
      if (response.status === 'success' && response.data) {
        const { user, accessToken, refreshToken, expiresIn } = response.data;
        const tokens = { accessToken, refreshToken, expiresIn };
        
        updateAuthState(user, tokens);
        redirectAfterLogin(user.role);
        toast.success('Google login successful!');
        return true;
      }
      

      return false;
    } catch (error: any) {
      toast.error(error.message || 'Google login failed');
      return false;
    }
  };

  const verifyCode = async (code: string, loginMethod: 'EMAIL_CODE' | 'PHONE_CODE', email?: string, phone?: string): Promise<boolean> => {
    try {

      
      const data = await apiCall('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          code,
          loginMethod,
          email,
          phone,
        }),
      });

      if (data.status === 'success' && data.data) {
        const { user, accessToken, refreshToken, expiresIn } = data.data;
        const tokens = { accessToken, refreshToken, expiresIn };
        
        updateAuthState(user, tokens);
        redirectAfterLogin(user.role);
        toast.success('Login successful!');
        return true;
      }
      

      return false;
    } catch (error: any) {
      toast.error(error.message || 'Code verification failed');
      return false;
    }
  };

  // Registration methods
  const registerWithPassword = async (data: RegisterData): Promise<boolean> => {
    try {
      const response = await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.status === 'success' && response.data) {
        const { user, accessToken, refreshToken, expiresIn } = response.data;
        const tokens = { accessToken, refreshToken, expiresIn };
        
        updateAuthState(user, tokens);
        toast.success('Registration successful!');
        return true;
      }
      
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      return false;
    }
  };

  const registerWithEmailCode = async (data: RegisterData): Promise<boolean> => {
    try {
      const response = await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.status === 'success') {
        toast.success('Registration successful! Please verify your account with the code sent to your email.');
        return true;
      }
      
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      return false;
    }
  };

  const registerWithPhoneCode = async (data: RegisterData): Promise<boolean> => {
    try {
      const response = await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.status === 'success') {
        toast.success('Registration successful! Please verify your account with the code sent to your phone.');
        return true;
      }
      
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      return false;
    }
  };

  const verifyRegistrationCode = async (code: string, loginMethod: 'EMAIL_CODE' | 'PHONE_CODE', email?: string, phone?: string): Promise<boolean> => {
    try {

      
      const data = await apiCall('/api/auth/verify-registration-code', {
        method: 'POST',
        body: JSON.stringify({
          code,
          loginMethod,
          email,
          phone,
        }),
      });

      if (data.status === 'success' && data.data) {
        const { user } = data.data;
        
        updateAuthState(user, state.tokens);
        toast.success('Account verified successfully!');

        return true;
      }
      

      return false;
    } catch (error: any) {
      toast.error(error.message || 'Code verification failed');
      return false;
    }
  };

  // Helper function to redirect to login page
  const redirectToLogin = () => {
    const countryCode = getCountryCodeFromUrl();
    window.location.href = `/${countryCode}/auth/login`;
  };

  // Helper function to clear all auth-related storage
  const clearAuthStorage = () => {
    // Clear all stored data
    updateAuthState(null, null);
    
    // Clear any stored URLs or session data
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch (error) {
        // Silently handle sessionStorage errors
      }
    }
    safeLocalStorage.removeItem('auth_tokens');
    safeLocalStorage.removeItem('auth_user');
    
    // Clear any stored redirect URLs
    if (typeof window !== 'undefined') {
      // Clear any stored URLs that might interfere
      try {
        sessionStorage.removeItem('redirectUrl');
        sessionStorage.removeItem('callbackUrl');
      } catch (error) {
        // Silently handle sessionStorage errors
      }
      safeLocalStorage.removeItem('redirectUrl');
      safeLocalStorage.removeItem('callbackUrl');
    }
  };

  // Logout methods
  const logout = async (redirectTo?: string): Promise<void> => {
    try {
      if (state.tokens?.refreshToken) {
        await apiCall('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({
            refreshToken: state.tokens.refreshToken,
          }),
        });
      }
    } catch (error: any) {
      // Clear auth state
      updateAuthState(null, null);
    } finally {
      clearAuthStorage();
      toast.success('Logged out successfully');
      // Navigate here (not by the caller) so there's no race with the redirect.
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        redirectToLogin();
      }
    }
  };

  const logoutAll = async (): Promise<void> => {
    try {
      await apiCall('/api/auth/logout-all', {
        method: 'POST',
      });
    } catch (error) {
    } finally {
      clearAuthStorage();
      toast.success('Logged out from all devices successfully');
      redirectToLogin();
    }
  };

  // Password reset methods
  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      const data = await apiCall('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (data.status === 'success') {
        toast.success(`Password reset code sent to ${data.data.maskedEmail}`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Failed to send password reset code');
      return false;
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<boolean> => {
    try {
      const data = await apiCall('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });

      if (data.status === 'success') {
        toast.success('Password reset successfully');
        return true;
      }
      
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Password reset failed');
      return false;
    }
  };

  // Update user profile
  const updateUser = async (data: Partial<User>): Promise<User | null> => {
    try {
      const response = await apiCall('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (response.status === 'success' && response.data) {
        const updatedUser = { ...state.user, ...response.data.user } as User;
        updateAuthState(updatedUser, state.tokens);
        toast.success('Profile updated successfully');
        return updatedUser;
      }

      return null;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
      return null;
    }
  };

  const updateClientUser = (data: Partial<User>) => {
    setState(prev => {
      if (!prev.user) {
        return prev;
      }

      const nextUser = { ...prev.user, ...data };

      try {
        safeLocalStorage.setItem('auth_user', JSON.stringify(nextUser));
      } catch {
        // Ignore storage errors
      }

      syncSentryAuthState(nextUser);

      return {
        ...prev,
        user: nextUser,
      };
    });
  };

  const getDashboardPath = () => {
    if (!state.user?.role) return '/dashboard';
    return getDashboardPathByRole(state.user.role);
  };

  const value: AuthContextType = {
    ...state,
    login: {
      withPassword: loginWithPassword,
      withEmailCode: loginWithEmailCode,
      withPhoneCode: loginWithPhoneCode,
      withGoogle: loginWithGoogle,
      verifyCode,
    },
    register: {
      withPassword: registerWithPassword,
      withEmailCode: registerWithEmailCode,
      withPhoneCode: registerWithPhoneCode,
      verifyCode: verifyRegistrationCode,
    },
    logout,
    logoutAll,
    refreshToken,
    applyExternalTokens: (tokens: AuthTokens) => updateAuthState(state.user, tokens),
    applyExternalSession: (user: User, tokens: AuthTokens) => updateAuthState(user, tokens),
    forgotPassword,
    resetPassword,
    updateUser,
    updateClientUser,
    getDashboardPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During SSR or when AuthProvider is not available, return a safe fallback
    if (typeof window === 'undefined') {
      return {
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: true,
        login: {
          withPassword: async () => false,
          withEmailCode: async () => false,
          withPhoneCode: async () => false,
          withGoogle: async () => false,
          verifyCode: async () => false,
        },
        register: {
          withPassword: async () => false,
          withEmailCode: async () => false,
          withPhoneCode: async () => false,
          verifyCode: async () => false,
        },
        logout: async () => {},
        logoutAll: async () => {},
        refreshToken: async () => false,
        applyExternalTokens: () => {},
        applyExternalSession: () => {},
        forgotPassword: async () => false,
        resetPassword: async () => false,
        updateUser: async () => null,
        updateClientUser: () => {},
        getDashboardPath: () => '/', // Default fallback
      };
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
