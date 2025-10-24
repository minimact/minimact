import { api } from './client';
/**
 * Squares Service
 * Handles all square (community) related API calls
 */
export const squaresService = {
  /**
   * Get all squares with pagination
   */
  getSquares: async (page = 1, pageSize = 20) => {
    return api.get('/squares', {
      params: {
        page,
        pageSize
      }
    });
  },
  /**
   * Get a single square by ID
   */
  getSquare: async id => {
    return api.get(`/squares/${id}`);
  },
  /**
   * Get a square by slug
   */
  getSquareBySlug: async slug => {
    return api.get(`/squares/slug/${slug}`);
  },
  /**
   * Create a new square
   */
  createSquare: async data => {
    return api.post('/squares', data);
  },
  /**
   * Update a square
   */
  updateSquare: async (id, data) => {
    return api.put(`/squares/${id}`, data);
  },
  /**
   * Delete a square
   */
  deleteSquare: async id => {
    return api.delete(`/squares/${id}`);
  },
  /**
   * Follow a square
   */
  followSquare: async id => {
    return api.post(`/squares/${id}/follow`);
  },
  /**
   * Unfollow a square
   */
  unfollowSquare: async id => {
    return api.delete(`/squares/${id}/follow`);
  },
  /**
   * Get squares followed by current user
   */
  getFollowedSquares: async () => {
    return api.get('/squares/following');
  },
  /**
   * Get squares followed by a specific user
   */
  getUserFollowedSquares: async userId => {
    return api.get(`/users/${userId}/squares/following`);
  },
  /**
   * Get recommended squares for current user
   */
  getRecommendedSquares: async (limit = 10) => {
    return api.get('/squares/recommended', {
      params: {
        limit
      }
    });
  },
  /**
   * Get trending squares
   */
  getTrendingSquares: async (limit = 10) => {
    return api.get('/squares/trending', {
      params: {
        limit
      }
    });
  },
  /**
   * Get similar squares
   */
  getSimilarSquares: async (id, limit = 10) => {
    return api.get(`/squares/${id}/similar`, {
      params: {
        limit
      }
    });
  },
  /**
   * Search squares
   */
  searchSquares: async (query, page = 1, pageSize = 20) => {
    return api.get('/squares/search', {
      params: {
        query,
        page,
        pageSize
      }
    });
  },
  /**
   * Get square metrics/analytics
   */
  getSquareMetrics: async id => {
    return api.get(`/squares/${id}/metrics`);
  },
  /**
   * Get square followers
   */
  getSquareFollowers: async (id, page = 1, pageSize = 20) => {
    return api.get(`/squares/${id}/followers`, {
      params: {
        page,
        pageSize
      }
    });
  },
  /**
   * Import a square post
   */
  importSquarePost: async (postUrl, squareName, importAsRemix = false, remixNotes) => {
    return api.post('/squares/import', {
      postUrl,
      squareName,
      importAsRemix,
      remixNotes
    });
  },
  /**
   * Validate a square URL
   */
  validateSquareUrl: async url => {
    return api.get('/squares/validate', {
      params: {
        url
      }
    });
  },
  /**
   * Get square feed/posts from external URL
   */
  getSquareFeed: async url => {
    return api.get('/squares/posts', {
      params: {
        url
      }
    });
  }
};
export default squaresService;