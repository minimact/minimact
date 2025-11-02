/**
 * @minimact/powered - Client-side types for Minimact.Powered
 *
 * This package provides TypeScript types for the Minimact Powered badge.
 * All rendering happens server-side in C#. This package only provides
 * type definitions for IntelliSense and type safety.
 */

export * from './types';

// Re-export for convenience
export type {
  BadgePosition,
  BadgeTheme,
  PoweredBadgeState
} from './types';

export { createPoweredBadgeState } from './types';
