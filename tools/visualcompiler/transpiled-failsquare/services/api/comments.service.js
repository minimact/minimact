import { api } from './client';
/**
 * Comments Service
 * Handles all comment-related API calls
 * Matches CommentsController.cs exactly
 */
export const commentsService = {
  /**
   * Add a comment (can be used independently or via failures service)
   */
  addComment: async command => {
    return api.post('/comments', command);
  },
  /**
   * Update a comment
   */
  updateComment: async (id, command) => {
    return api.put(`/comments/${id}`, command);
  },
  /**
   * Delete a comment
   */
  deleteComment: async id => {
    return api.delete(`/comments/${id}`);
  },
  /**
   * Get replies to a comment
   */
  getReplies: async (id, sortBy = 'merit', page, pageSize) => {
    return api.get(`/comments/${id}/replies`, {
      params: {
        sortBy,
        page,
        pageSize
      }
    });
  },
  /**
   * Report a comment
   */
  reportComment: async (id, command) => {
    return api.post(`/comments/${id}/report`, command);
  }
};
export default commentsService;