import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7214/api';
const API_TIMEOUT = 30000; // 30 seconds

// Custom error interface for API errors

// Helper to create ApiError
export const createApiError = (statusCode, message, errors, originalError) => ({
  statusCode,
  message,
  errors,
  originalError
});

// Token management
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
export const tokenManager = {
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken: token => {
    localStorage.setItem(TOKEN_KEY, token);
  },
  getRefreshToken: () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken: token => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(config => {
  const token = tokenManager.getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Log request in development
  if (import.meta.env.DEV) {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
    });
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(response => {
  // Log response in development
  if (import.meta.env.DEV) {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data
    });
  }
  return response;
}, async error => {
  const originalRequest = error.config;

  // Log error in development
  if (import.meta.env.DEV) {
    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
  }

  // Handle 401 Unauthorized - Try to refresh token
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call refresh token endpoint
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken
      });
      const {
        token,
        refreshToken: newRefreshToken
      } = response.data;

      // Update tokens
      tokenManager.setToken(token);
      if (newRefreshToken) {
        tokenManager.setRefreshToken(newRefreshToken);
      }

      // Retry original request with new token
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed - clear tokens and redirect to login
      tokenManager.clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }

  // Transform error to ApiError
  const apiError = transformError(error);
  return Promise.reject(apiError);
});

// Transform axios error to ApiError
function transformError(error) {
  if (error.response) {
    // Server responded with error status
    const data = error.response.data;
    return createApiError(error.response.status, data?.message || data?.title || error.message, data?.errors, error);
  } else if (error.request) {
    // Request made but no response
    return createApiError(0, 'No response from server. Please check your connection.', undefined, error);
  } else {
    // Error in request setup
    return createApiError(0, error.message || 'An unexpected error occurred', undefined, error);
  }
}

// Generic request methods with type safety
export const api = {
  get: (url, config) => {
    return apiClient.get(url, config).then(response => response.data);
  },
  post: (url, data, config) => {
    return apiClient.post(url, data, config).then(response => response.data);
  },
  put: (url, data, config) => {
    return apiClient.put(url, data, config).then(response => response.data);
  },
  patch: (url, data, config) => {
    return apiClient.patch(url, data, config).then(response => response.data);
  },
  delete: (url, config) => {
    return apiClient.delete(url, config).then(response => response.data);
  }
};
export default apiClient;