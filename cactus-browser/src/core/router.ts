/**
 * Router - Client-side routing for Cactus Browser
 *
 * Maps URL paths to TSX file paths using convention-based routing
 */

export interface Route {
  pattern: string;
  filePath: string;
  exact?: boolean;
}

export interface RouteMatch {
  filePath: string;
  params?: Record<string, string>;
}

export class Router {
  private routes: Route[] = [];

  /**
   * Add a route to the router
   */
  addRoute(pattern: string, filePath: string, exact = false) {
    this.routes.push({ pattern, filePath, exact });
  }

  /**
   * Match a pathname against registered routes
   * Returns the file path if a route matches, null otherwise
   */
  match(pathname: string): string | null {
    for (const route of this.routes) {
      // Exact match
      if (route.exact && route.pattern === pathname) {
        return route.filePath;
      }

      // Prefix match
      if (!route.exact && pathname.startsWith(route.pattern)) {
        return route.filePath;
      }
    }

    return null;
  }

  /**
   * Resolve a pathname to possible file paths using conventions
   *
   * Examples:
   *   /about → ['pages/about.tsx', 'pages/about/index.tsx']
   *   /blog/post → ['pages/blog/post.tsx', 'pages/blog/post/index.tsx']
   */
  resolvePath(pathname: string): string[] {
    // Try explicit route first
    const matched = this.match(pathname);
    if (matched) return [matched];

    // Normalize pathname (remove leading slash)
    const normalized = pathname.startsWith('/') ? pathname.slice(1) : pathname;

    // Handle root
    if (normalized === '' || normalized === 'index') {
      return ['pages/index.tsx'];
    }

    // Try conventions
    return [
      `pages/${normalized}.tsx`,
      `pages/${normalized}/index.tsx`,
    ];
  }

  /**
   * Create router with default convention-based routes
   */
  static createDefault(): Router {
    const router = new Router();

    // Root route
    router.addRoute('/', 'pages/index.tsx', true);
    router.addRoute('/index', 'pages/index.tsx', true);

    return router;
  }

  /**
   * Create router from minimact.config.json
   */
  static fromConfig(config: any): Router {
    const router = Router.createDefault();

    // Custom routes from config
    if (config?.routes) {
      for (const [pattern, file] of Object.entries(config.routes)) {
        router.addRoute(pattern, file as string);
      }
    }

    return router;
  }
}
