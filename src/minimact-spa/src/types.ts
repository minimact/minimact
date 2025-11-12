/**
 * Response from server NavigateTo SignalR call
 */
export interface NavigationResponse {
  /**
   * Whether navigation succeeded
   */
  success: boolean;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Name of the shell component
   */
  shellName?: string;

  /**
   * Whether shell changed (full swap vs page-only swap)
   */
  shellChanged: boolean;

  /**
   * DOM patches to apply (from Rust reconciler)
   */
  patches: Patch[];

  /**
   * Page ViewModel data (for updating MVC state)
   */
  pageData?: any;

  /**
   * Final URL (for history.pushState)
   */
  url: string;
}

/**
 * DOM patch from Rust reconciler
 */
export interface Patch {
  type: string;
  path?: string;
  value?: any;
  // ... other patch fields
}

/**
 * Navigation options
 */
export interface NavigationOptions {
  /**
   * Replace current history entry instead of pushing new one
   */
  replace?: boolean;

  /**
   * Custom state to store in history
   */
  state?: any;

  /**
   * Skip scroll to top
   */
  skipScroll?: boolean;
}

/**
 * Link component props
 */
export interface LinkProps {
  /**
   * Target URL
   */
  to: string;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Click handler (called after navigation)
   */
  onClick?: (e: MouseEvent) => void;

  /**
   * Prefetch on hover
   */
  prefetch?: boolean;

  /**
   * Replace history instead of push
   */
  replace?: boolean;

  /**
   * Child elements
   */
  children?: any;

  /**
   * Additional HTML attributes
   */
  [key: string]: any;
}
