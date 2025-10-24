import { api } from './client';
/**
 * Merit Service
 * Handles merit scoring related API calls
 */
export const meritService = {
  /**
   * Get merit score for content
   */
  getMeritScore: async (contentId, contentType) => {
    return api.get('/merit/score', {
      params: {
        contentId,
        contentType
      }
    });
  },
  /**
   * Get merit score history for content
   */
  getMeritHistory: async (contentId, contentType) => {
    return api.get('/merit/history', {
      params: {
        contentId,
        contentType
      }
    });
  },
  /**
   * Recalculate merit score
   */
  recalculateMeritScore: async request => {
    return api.post('/merit/recalculate', request);
  },
  /**
   * Get user's merit score
   */
  getUserMeritScore: async userId => {
    return api.get(`/users/${userId}/merit`);
  },
  /**
   * Get merit leaderboard
   */
  getMeritLeaderboard: async (period = 'all', limit = 100) => {
    return api.get('/merit/leaderboard', {
      params: {
        period,
        limit
      }
    });
  },
  /**
   * Get merit score explanation
   */
  getMeritExplanation: async (contentId, contentType) => {
    return api.get('/merit/explanation', {
      params: {
        contentId,
        contentType
      }
    });
  }
};
export default meritService;