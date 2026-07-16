import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { getToken, removeToken } from '@/lib/auth/authUtils';

const baseURL = (process.env.NEXT_PUBLIC_API_URL || 'https://new-api.gokabisa.com').replace(/\/$/, '')
const TIMEOUT = 20000;

// Create a safer axios instance creation function
const createSafeAxiosInstance = (showMessage = false, showError = true) => {
  try {
    return axios.create({
      baseURL,
      timeout: TIMEOUT,
      timeoutErrorMessage: "Request timed out",
      validateStatus: () => true,
    });
  } catch (error) {
    // Fallback for build-time errors
    return {
      get: () => Promise.resolve({ data: null, status: 200 }),
      post: () => Promise.resolve({ data: null, status: 200 }),
      put: () => Promise.resolve({ data: null, status: 200 }),
      delete: () => Promise.resolve({ data: null, status: 200 }),
      patch: () => Promise.resolve({ data: null, status: 200 }),
    } as any;
  }
};

const api = (showMessage = false, showError = true) => {
  // During SSR/build, return a safe mock instance
  if (typeof window === 'undefined') {
    return {
      get: () => Promise.resolve({ data: null, status: 200 }),
      post: () => Promise.resolve({ data: null, status: 200 }),
      put: () => Promise.resolve({ data: null, status: 200 }),
      delete: () => Promise.resolve({ data: null, status: 200 }),
      patch: () => Promise.resolve({ data: null, status: 200 }),
    } as any;
  }

  const instance = createSafeAxiosInstance(showMessage, showError);

  // Only add interceptors if this is a real axios instance
  if (instance.interceptors) {
    instance.interceptors.request.use(async (request: InternalAxiosRequestConfig) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Get auth tokens from localStorage
        let storedTokens: string | null = null;
        try {
          storedTokens = localStorage.getItem('auth_tokens');
        } catch (error) {
          // Handle SecurityError (sandboxed iframe) or other localStorage errors
          if (error instanceof DOMException) {
            console.warn('localStorage access denied:', error.message);
          }
        }
        if (storedTokens) {
          try {
            const tokens = JSON.parse(storedTokens);
            if (tokens.accessToken) {
              request.headers.Authorization = `Bearer ${tokens.accessToken}`;
            }
          } catch (error) {
            // Silently handle token parsing errors
          }
        }
      }
      return request;
    });

    instance.interceptors.response.use(
      async (response: AxiosResponse) => {
        // Skip processing during SSR to prevent build errors
        if (typeof window === 'undefined') {
          return response;
        }

        // Handle different status codes manually since validateStatus is set to true
        if (response.status === 401) {
          // Handle 401 Unauthorized
          const errorData = response.data as any;
          
          // Clear invalid tokens immediately
          if (window.localStorage) {
            try {
          localStorage.removeItem('auth_tokens');
          localStorage.removeItem('auth_user');
            } catch (error) {
              // Handle SecurityError (sandboxed iframe) or other localStorage errors
              if (error instanceof DOMException) {
                console.warn('localStorage access denied:', error.message);
              }
            }
          }
          
          // Dispatch a custom event to notify the app about the 401
          if (typeof window !== 'undefined') {
            const authErrorEvent = new CustomEvent('auth:unauthorized', {
              detail: { 
                status: 401, 
                message: 'Session expired or invalid',
                url: response.config?.url 
              }
            });
            window.dispatchEvent(authErrorEvent);
          }
          
          // Use browser navigation for unauthorized requests
          const currentPath = window.location.pathname + window.location.search;
          
          // Try to get country code from current path, fallback to "rw"
          let countryCode = "rw"; // default fallback
          try {
            const pathParts = window.location.pathname.split('/');
            if (pathParts[1] && pathParts[1].length === 2) {
              countryCode = pathParts[1];
            }
          } catch (error) {
            // Keep default "rw" if parsing fails
          }
          
          const loginUrl = `/${countryCode}/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`;
          
          // Redirect immediately without delay
          window.location.href = loginUrl;
          
          // Return a rejected promise to prevent further processing
          return Promise.reject(new Error('Unauthorized - redirecting to login'));
        }
        
        // Handle other error status codes
        if (response.status >= 400) {
          let errorMessage = `Request failed with status ${response.status}`;

          // Check if response is a Blob (happens when responseType: 'blob' is used)
          if (response.data instanceof Blob) {
            // If the blob is JSON, it's an error response
            if (response.data.type === 'application/json') {
              try {
                const text = await response.data.text();
                const errorData = JSON.parse(text);
                errorMessage = errorData?.message || errorData?.error || errorMessage;
              } catch (parseError) {
                // If parsing fails, use the default message
                console.error('Failed to parse blob error response:', parseError);
              }
            }
          } else {
            // Normal JSON response
            const errorData = response.data as any;
            errorMessage = errorData?.message || errorData?.error || errorMessage;
          }

          if (showError) {
            toast.error(errorMessage);
          }

          // Create error with backend message for proper handling in components
          const error = new Error(errorMessage);
          (error as any).response = response;
          (error as any).status = response.status;
          return Promise.reject(error);
        }
        
        // Success responses
        if (response.data && response.data.message && showMessage) {
          toast.success(response.data.message);
        }
        
        return response;
      },
      async (error: any) => {
        const errorObj = error as AxiosError;
        
        // Only handle client-side errors to avoid SSR issues
        if (typeof window === 'undefined') {
          return Promise.reject(error);
        }
        
        // Timeout error handling
        if (
          error.code === "ECONNABORTED" &&
          error.message.includes("timed out") &&
          showError
        ) {
          toast.error("Request timed out. Please try again.");
        } 
        // Network errors or other axios errors
        else if (showError && !error.message?.includes('Unauthorized - redirecting to login')) {
          const errorMessage = errorObj.message || "An unexpected error occurred.";
          toast.error(errorMessage);
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  return instance;
};

export default api;