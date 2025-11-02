/**
 * Type definitions for @minimact/powered
 */

export type BadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type BadgeTheme = 'dark' | 'light';

export interface PoweredBadgeState {
  /**
   * Badge position on screen
   * @default 'bottom-right'
   */
  position?: BadgePosition;

  /**
   * Whether badge is expanded (showing full text)
   * @default false
   */
  expanded?: boolean;

  /**
   * Theme: "dark" or "light"
   * @default 'dark'
   */
  theme?: BadgeTheme;

  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;

  /**
   * Custom link URL
   * @default 'https://minimact.dev'
   */
  linkUrl?: string;

  /**
   * Whether to open link in new tab
   * @default true
   */
  openInNewTab?: boolean;
}

/**
 * Helper function to create a PoweredBadgeState with defaults
 */
export function createPoweredBadgeState(
  overrides?: Partial<PoweredBadgeState>
): PoweredBadgeState {
  return {
    position: 'bottom-right',
    expanded: false,
    theme: 'dark',
    animationDuration: 300,
    linkUrl: 'https://minimact.dev',
    openInNewTab: true,
    ...overrides
  };
}
