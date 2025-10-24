import { api, tokenManager } from './client';
/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
export const authService = {
  /**
   * Login with email and password
   */
  login: async credentials => {
    return api.post('/auth/login', credentials);
  },
  /**
   * Register a new user
   */
  register: async data => {
    return api.post('/auth/register', data);
  },
  /**
   * Logout (optionally revoke refresh token)
   */
  logout: async () => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/revoke', {
          refreshToken
        });
      }
    } catch (error) {
      // Silently fail - user will still be logged out locally
      console.error('Failed to revoke token:', error);
    }
  },
  /**
   * Refresh access token
   */
  refreshToken: async refreshToken => {
    return api.post('/auth/refresh', {
      refreshToken
    });
  },
  /**
   * Get current user profile
   */
  getCurrentUser: async () => {
    return api.get('/auth/me');
  },
  /**
   * Update user profile
   */
  updateProfile: async data => {
    return api.put('/auth/profile', data);
  },
  /**
   * Get user settings
   */
  getSettings: async () => {
    return api.get('/auth/settings');
  },
  /**
   * Update user settings
   */
  updateSettings: async settings => {
    return api.put('/auth/settings', settings);
  },
  /**
   * Change password
   */
  changePassword: async (currentPassword, newPassword) => {
    return api.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
  },
  /**
   * Request password reset
   */
  requestPasswordReset: async email => {
    return api.post('/auth/forgot-password', {
      email
    });
  },
  /**
   * Reset password with token
   */
  resetPassword: async (token, newPassword) => {
    return api.post('/auth/reset-password', {
      token,
      newPassword
    });
  },
  // Two-Factor Authentication

  /**
   * Setup two-factor authentication
   */
  setupTwoFactor: async () => {
    return api.post('/auth/2fa/setup');
  },
  /**
   * Verify and enable two-factor authentication
   */
  verifyTwoFactor: async code => {
    return api.post('/auth/2fa/verify', {
      code
    });
  },
  /**
   * Disable two-factor authentication
   */
  disableTwoFactor: async code => {
    return api.post('/auth/2fa/disable', {
      code
    });
  },
  /**
   * Verify 2FA code during login
   */
  verifyTwoFactorLogin: async code => {
    return api.post('/auth/2fa/login', {
      code
    });
  },
  // Google OAuth

  /**
   * Sign in with Google ID token
   */
  googleSignIn: async idToken => {
    return api.post('/auth/google', {
      idToken
    });
  },
  /**
   * Link Google account to existing user
   */
  linkGoogleAccount: async idToken => {
    return api.post('/auth/google/link', {
      idToken
    });
  },
  /**
   * Unlink Google account
   */
  unlinkGoogleAccount: async () => {
    return api.post('/auth/google/unlink');
  },
  /**
   * Revoke refresh token (logout from all devices)
   */
  revokeToken: async refreshToken => {
    return api.post('/auth/revoke', {
      refreshToken
    });
  },
  // Audit Logs

  /**
   * Get user's audit logs
   */
  getAuditLogs: async (page = 1, pageSize = 20) => {
    return api.get('/auth/audit-logs', {
      params: {
        page,
        pageSize
      }
    });
  }
};
export default authService;