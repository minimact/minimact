// Export all API services from a central location

export { api, tokenManager, createApiError } from './client';
export { authService } from './auth.service';
export { failuresService } from './failures.service';
export { squaresService } from './squares.service';
export { meritService } from './merit.service';
export { commentsService } from './comments.service';
export { tagsService } from './tags.service';
export { usersService } from './users.service';

// Re-export types for convenience