import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { authService, tokenManager } from '../services/api';
import { jsx as _jsx } from "react/jsx-runtime";
const AuthContext = createContext(undefined);
export const AuthProvider = ({
  children
}) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to convert UserProfile to User
  const profileToUser = profile => ({
    id: profile.id,
    email: profile.email,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    meritScore: profile.meritScore
  });

  // Refresh user data from API
  const refreshUser = async () => {
    try {
      const profile = await authService.getCurrentUser();
      setUser(profileToUser(profile));
      setError(null);
    } catch (err) {
      console.error('Failed to refresh user:', err);
      const apiError = err;
      if (apiError && apiError.statusCode === 401) {
        // Token is invalid, clear auth
        tokenManager.clearTokens();
        setUser(null);
      }
    }
  };
  useEffect(() => {
    // Check for stored auth token and validate
    const checkAuth = async () => {
      const token = tokenManager.getToken();
      if (token) {
        try {
          await refreshUser();
        } catch (error) {
          console.error('Auth check failed:', error);
          tokenManager.clearTokens();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);
  const login = async (email, password, rememberMe = false) => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await authService.login({
        email,
        password,
        rememberMe
      });
      if (result.accessToken) {
        // Store tokens
        tokenManager.setToken(result.accessToken);
        if (result.refreshToken) {
          tokenManager.setRefreshToken(result.refreshToken);
        }

        // Set user from result
        setUser(profileToUser(result.user));
        return true;
      } else {
        setError('Login failed');
        return false;
      }
    } catch (err) {
      console.error('Login failed:', err);
      const apiError = err;
      const errorMessage = apiError?.message || 'An unexpected error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  const register = async (email, username, password) => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await authService.register({
        email,
        username,
        password
      });
      if (result.accessToken) {
        // Store tokens
        tokenManager.setToken(result.accessToken);
        if (result.refreshToken) {
          tokenManager.setRefreshToken(result.refreshToken);
        }

        // Set user from result
        setUser(profileToUser(result.user));
        return true;
      } else {
        setError('Registration failed');
        return false;
      }
    } catch (err) {
      console.error('Registration failed:', err);
      const apiError = err;
      const errorMessage = apiError?.message || 'An unexpected error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      tokenManager.clearTokens();
      setUser(null);
      setError(null);
    }
  };
  return /*#__PURE__*/_jsx(AuthContext.Provider, {
    value: {
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshUser
    },
    children: children
  });
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};