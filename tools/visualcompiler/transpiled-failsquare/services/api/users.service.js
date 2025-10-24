import { api } from './client';
/**
 * Users Service
 * Handles all user-related API calls
 * Matches UsersController.cs exactly
 */
export const usersService = {
  /**
   * Register a new user (also available via auth service)
   */
  register: async command => {
    return api.post('/users/register', command);
  },
  /**
   * Get user profile by ID
   */
  getUserProfile: async id => {
    return api.get(`/users/${id}/profile`);
  },
  /**
   * Get top contributors
   */
  getTopContributors: async (count = 10, timeFrame = 'all') => {
    return api.get('/users/top-contributors', {
      params: {
        count,
        timeFrame
      }
    });
  },
  /**
   * Get posts by a specific user
   */
  getUserPosts: async id => {
    return api.get(`/users/${id}/posts`);
  },
  /**
   * Get user notifications
   */
  getNotifications: async (id, unreadOnly = false, count) => {
    return api.get(`/users/${id}/notifications`, {
      params: {
        unreadOnly,
        count
      }
    });
  },
  /**
   * Mark notifications as read
   */
  markNotificationsAsRead: async (id, notificationIds) => {
    return api.post(`/users/${id}/notifications/mark-read`, notificationIds);
  },
  /**
   * Get recommended posts for a user
   */
  getRecommendedPosts: async (id, count = 10) => {
    return api.get(`/users/${id}/recommended-posts`, {
      params: {
        count
      }
    });
  },
  /**
   * Get current user's profile
   */
  getCurrentUserProfile: async () => {
    return api.get('/users/me/profile');
  },
  /**
   * Get user merit score
   */
  getUserMeritScore: async id => {
    return api.get(`/users/${id}/merit-score`);
  },
  /**
   * Get user merit history
   */
  getUserMeritHistory: async (id, page = 1, pageSize = 10) => {
    return api.get(`/users/${id}/merit-history`, {
      params: {
        page,
        pageSize
      }
    });
  },
  /**
   * Update current user's profile
   */
  updateProfile: async command => {
    return api.put('/users/me/profile', command);
  },
  /**
   * Update current user's settings
   */
  updateSettings: async command => {
    return api.put('/users/me/settings', command);
  },
  /**
   * Get user contributions
   */
  getUserContributions: async (id, page = 1, pageSize = 10) => {
    return api.get(`/users/${id}/contributions`, {
      params: {
        page,
        pageSize
      }
    });
  }
};
export default usersService;