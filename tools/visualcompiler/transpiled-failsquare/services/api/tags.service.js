import { api } from './client';
/**
 * Tags Service
 * Handles all tag-related API calls
 * Matches TagsController.cs exactly
 */
export const tagsService = {
  /**
   * Get popular tags
   */
  getPopularTags: async (count = 10) => {
    return api.get('/tags/popular', {
      params: {
        count
      }
    });
  },
  /**
   * Search tags by search term
   */
  searchTags: async searchTerm => {
    return api.get('/tags/search', {
      params: {
        searchTerm
      }
    });
  },
  /**
   * Get posts by tag name
   */
  getPostsByTag: async (name, sortBy = 'merit', page, pageSize) => {
    return api.get(`/tags/${name}/posts`, {
      params: {
        sortBy,
        page,
        pageSize
      }
    });
  },
  /**
   * Create a new tag
   */
  createTag: async command => {
    return api.post('/tags', command);
  },
  /**
   * Get a tag by name
   */
  getTag: async name => {
    return api.get(`/tags/${name}`);
  },
  /**
   * Add a tag to a post
   */
  addTagToPost: async (tagName, postId, category) => {
    return api.post(`/tags/${tagName}/posts/${postId}`, null, {
      params: {
        category
      }
    });
  },
  /**
   * Remove a tag from a post
   */
  removeTagFromPost: async (tagName, postId) => {
    return api.delete(`/tags/${tagName}/posts/${postId}`);
  },
  /**
   * Get trending topics
   */
  getTrendingTopics: async (count = 10, timeFrame = 'day') => {
    return api.get('/tags/trending', {
      params: {
        count,
        timeFrame
      }
    });
  },
  /**
   * Get related tags
   */
  getRelatedTags: async id => {
    return api.get(`/tags/${id}/related`);
  },
  /**
   * Get tags for a specific user
   */
  getUserTags: async userId => {
    return api.get(`/tags/user/${userId}`);
  },
  /**
   * Get tag synonyms
   */
  getTagSynonyms: async id => {
    return api.get(`/tags/${id}/synonyms`);
  },
  /**
   * Add a tag synonym
   */
  addTagSynonym: async (id, command) => {
    return api.post(`/tags/${id}/synonyms`, command);
  },
  /**
   * Get tag wiki
   */
  getTagWiki: async id => {
    return api.get(`/tags/${id}/wiki`);
  },
  /**
   * Update tag wiki
   */
  updateTagWiki: async (id, command) => {
    return api.put(`/tags/${id}/wiki`, command);
  },
  /**
   * Get tag relationships
   */
  getTagRelationships: async id => {
    return api.get(`/tags/${id}/relationships`);
  },
  /**
   * Add a tag relationship
   */
  addTagRelationship: async command => {
    return api.post('/tags/relationships', command);
  },
  /**
   * Remove a tag relationship
   */
  removeTagRelationship: async (parentTagId, childTagId) => {
    return api.delete(`/tags/relationships/${parentTagId}/${childTagId}`);
  },
  /**
   * Get tag statistics
   */
  getTagStats: async id => {
    return api.get(`/tags/${id}/stats`);
  },
  /**
   * Follow a tag
   */
  followTag: async id => {
    return api.post(`/tags/${id}/follow`);
  },
  /**
   * Unfollow a tag
   */
  unfollowTag: async id => {
    return api.delete(`/tags/${id}/follow`);
  },
  /**
   * Get tags followed by current user
   */
  getFollowedTags: async () => {
    return api.get('/tags/following');
  },
  /**
   * Get tag moderation history
   */
  getTagModerationHistory: async id => {
    return api.get(`/tags/${id}/moderation-history`);
  }
};
export default tagsService;