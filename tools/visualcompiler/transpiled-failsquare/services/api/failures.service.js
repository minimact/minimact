import { api } from './client';
/**
 * Failures Service (Posts)
 * Handles all failure documentation related API calls
 * Matches FailuresController.cs exactly
 */
export const failuresService = {
  /**
   * Get top failures/posts
   */
  getTopFailures: async (count = 10, sortBy = 'merit') => {
    return api.get('/failures', {
      params: {
        count,
        sortBy
      }
    });
  },
  /**
   * Get a single failure by ID
   */
  getFailure: async id => {
    return api.get(`/failures/${id}`);
  },
  /**
   * Create a new failure
   */
  createFailure: async command => {
    return api.post('/failures', command);
  },
  /**
   * Update a failure
   */
  updateFailure: async (id, command) => {
    return api.put(`/failures/${id}`, command);
  },
  /**
   * Fork a failure (create a remix)
   */
  forkFailure: async (id, command) => {
    return api.post(`/failures/${id}/fork`, command);
  },
  /**
   * Delete a failure
   */
  deleteFailure: async id => {
    return api.delete(`/failures/${id}`);
  },
  /**
   * Get comments for a failure
   */
  getComments: async (id, sortBy = 'merit', page, pageSize) => {
    return api.get(`/failures/${id}/comments`, {
      params: {
        sortBy,
        page,
        pageSize
      }
    });
  },
  /**
   * Add a comment to a failure
   */
  addComment: async (id, command) => {
    return api.post(`/failures/${id}/comments`, command);
  },
  /**
   * Get trending failures
   */
  getTrendingFailures: async (timeFrame = 'day', category, limit = 10, minMeritScore = 0.0) => {
    return api.get('/failures/trending', {
      params: {
        timeFrame,
        category,
        limit,
        minMeritScore
      }
    });
  },
  /**
   * Get failure version history
   */
  getHistory: async (id, startVersion, endVersion, includeContent = true) => {
    return api.get(`/failures/${id}/history`, {
      params: {
        startVersion,
        endVersion,
        includeContent
      }
    });
  },
  /**
   * Get specific version of a failure
   */
  getVersion: async (id, versionNumber) => {
    return api.get(`/failures/${id}/versions/${versionNumber}`);
  },
  /**
   * Compare two versions of a failure
   */
  compareVersions: async (id, version1, version2) => {
    return api.get(`/failures/${id}/versions/compare`, {
      params: {
        version1,
        version2
      }
    });
  },
  /**
   * Restore a specific version of a failure
   */
  restoreVersion: async (id, versionNumber, reason) => {
    return api.post(`/failures/${id}/versions/${versionNumber}/restore`, {
      reason
    });
  },
  /**
   * Get related failures
   */
  getRelatedFailures: async (id, limit = 5) => {
    return api.get(`/failures/${id}/related`, {
      params: {
        limit
      }
    });
  },
  /**
   * Like a failure
   */
  likeFailure: async id => {
    return api.post(`/failures/${id}/like`);
  },
  /**
   * Unlike a failure
   */
  unlikeFailure: async id => {
    return api.delete(`/failures/${id}/like`);
  }
};
export default failuresService;