# 🗺️ Phase 4: Routing Engine - Implementation Plan

**Estimated Time:** 2-3 hours

**Status:** Ready to implement

---

## 🎯 Goal

Add client-side routing to support:
- Folder-based routing (`/about` → `pages/about.tsx`)
- Clean URLs (`gh://user/repo/about` instead of `gh://user/repo/pages/about.tsx`)
- Browser history (back/forward buttons)
- Link interception (click `<a href="/about">` → navigate without page reload)

---

## 📋 What We Need to Build

### 1. Router Class (30 mins)

**File:** `src/core/router.ts`

**Purpose:** Map URL paths to TSX file paths

**Features:**
- Route matching (exact and prefix)
- Convention-based routing (`/about` → `pages/about.tsx`)
- Custom routes from config
- Wildcard/dynamic routes

### 2. Browser History Integration (30 mins)

**File:** Update `src/components/Navigator.tsx`

**Purpose:** Handle browser back/forward buttons

**Features:**
- Push state on navigation
- Listen to `popstate` events
- Update URL in address bar
- Restore previous page state

### 3. Link Interception (30 mins)

**File:** `src/core/link-interceptor.ts`

**Purpose:** Intercept `<a>` clicks and navigate via router

**Features:**
- Click event delegation
- Internal link detection (`/about`)
- External gh:// link detection (`gh://other/repo`)
- Preserve Ctrl+Click behavior (open in new tab)

### 4. Integration with App.tsx (30 mins)

**Purpose:** Wire router into main application

**Tasks:**
- Create router instance
- Set up link interceptor
- Handle route changes
- Update component rendering

---

## 🔧 Implementation Steps

### Step 1: Create Router Class (30 mins)

**Create `src/core/router.ts`:**

```typescript
export interface Route {
  pattern: string;
  filePath: string;
  exact?: boolean;
}

export class Router {
  private routes: Route[] = [];

  addRoute(pattern: string, filePath: string, exact = false) {
    this.routes.push({ pattern, filePath, exact });
  }

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
   * Create router with convention-based routes
   */
  static createDefault(): Router {
    const router = new Router();

    // Default conventions
    router.addRoute('/', 'pages/index.tsx', true);
    router.addRoute('/index', 'pages/index.tsx', true);

    // Catch-all: /foo → pages/foo.tsx or pages/foo/index.tsx
    // (Will be resolved by GitHub loader)

    return router;
  }

  /**
   * Create router from minimact.config.json
   */
  static fromConfig(config: any): Router {
    const router = Router.createDefault();

    // Custom routes from config
    if (config.routes) {
      for (const [pattern, file] of Object.entries(config.routes)) {
        router.addRoute(pattern, file as string);
      }
    }

    return router;
  }

  /**
   * Resolve path using convention
   * /about → tries pages/about.tsx, then pages/about/index.tsx
   */
  resolvePath(pathname: string): string[] {
    // Try explicit route first
    const matched = this.match(pathname);
    if (matched) return [matched];

    // Try conventions
    const normalized = pathname.startsWith('/') ? pathname.slice(1) : pathname;

    return [
      `pages/${normalized}.tsx`,
      `pages/${normalized}/index.tsx`,
      `pages/${normalized}.mdx`,
    ];
  }
}
```

**Test it:**
```typescript
const router = Router.createDefault();

console.log(router.match('/'));          // pages/index.tsx
console.log(router.resolvePath('/about')); // ['pages/about.tsx', 'pages/about/index.tsx']
console.log(router.resolvePath('/blog/post-1')); // ['pages/blog/post-1.tsx', ...]
```

---

### Step 2: Update Navigator for History (30 mins)

**Update `src/components/Navigator.tsx`:**

```typescript
import { useEffect, useState, useRef } from 'react';
import { parseGhUrl, buildGhUrl } from '../core/gh-protocol';
import { Router } from '../core/router';

export function Navigator({ initialUrl }: { initialUrl: string }) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const routerRef = useRef<Router>(Router.createDefault());

  // Navigate to URL
  async function navigate(url: string, pushState = true) {
    setLoading(true);
    setError(null);

    try {
      console.log('[Navigator] Navigating to:', url);

      // Parse gh:// URL
      const parsed = parseGhUrl(url);
      if (!parsed) {
        throw new Error(`Invalid gh:// URL: ${url}`);
      }

      // Resolve route
      const possiblePaths = routerRef.current.resolvePath(parsed.path);
      console.log('[Navigator] Trying paths:', possiblePaths);

      // Try each path until one works
      let result = null;
      for (const tryPath of possiblePaths) {
        try {
          const tryUrl = buildGhUrl({ ...parsed, path: tryPath });
          result = await loadAndRender(tryUrl);
          break;
        } catch (err) {
          console.log(`[Navigator] Path ${tryPath} failed, trying next...`);
        }
      }

      if (!result) {
        throw new Error(`No file found for route: ${parsed.path}`);
      }

      setHtml(result.html);
      setCurrentUrl(url);

      // Update browser history
      if (pushState) {
        window.history.pushState({ url }, '', `#${url}`);
      }

    } catch (err: any) {
      console.error('[Navigator] Navigation failed:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  // Handle back/forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.url) {
        console.log('[Navigator] Navigating back/forward to:', e.state.url);
        navigate(e.state.url, false); // Don't push state again
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate on mount
  useEffect(() => {
    navigate(initialUrl);
  }, []);

  if (error) {
    return <ErrorOverlay error={error} />;
  }

  if (loading) {
    return <LoadingSpinner message="Loading page..." />;
  }

  return (
    <div
      className="site-viewer"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

async function loadAndRender(url: string): Promise<{ html: string }> {
  // Use existing render pipeline
  // (Will be integrated with SignalM² in next step)
  const { invoke } = await import('@tauri-apps/api/core');

  const result = await invoke('render_gh_url', { url });
  return result as { html: string };
}
```

---

### Step 3: Add Link Interception (30 mins)

**Create `src/core/link-interceptor.ts`:**

```typescript
import { parseGhUrl, buildGhUrl } from './gh-protocol';

export interface LinkInterceptorOptions {
  onNavigate: (url: string) => void;
  getCurrentUrl: () => string;
}

export class LinkInterceptor {
  private container: HTMLElement;
  private options: LinkInterceptorOptions;
  private abortController: AbortController;

  constructor(container: HTMLElement, options: LinkInterceptorOptions) {
    this.container = container;
    this.options = options;
    this.abortController = new AbortController();

    this.start();
  }

  start() {
    this.container.addEventListener('click', this.handleClick, {
      signal: this.abortController.signal
    });

    console.log('[LinkInterceptor] Started');
  }

  stop() {
    this.abortController.abort();
    console.log('[LinkInterceptor] Stopped');
  }

  private handleClick = (e: MouseEvent) => {
    // Find closest <a> tag
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');

    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Allow Ctrl+Click / Cmd+Click to open in new tab
    if (e.ctrlKey || e.metaKey) return;

    // Allow middle-click to open in new tab
    if (e.button === 1) return;

    // Handle different link types
    if (this.handleInternalLink(href, e)) return;
    if (this.handleGhLink(href, e)) return;
    if (this.handleExternalLink(href, e)) return;
  };

  private handleInternalLink(href: string, e: MouseEvent): boolean {
    // Internal link: /about, /blog, etc.
    if (!href.startsWith('/')) return false;

    e.preventDefault();

    // Get current gh:// base URL
    const currentUrl = this.options.getCurrentUrl();
    const parsed = parseGhUrl(currentUrl);

    if (!parsed) {
      console.error('[LinkInterceptor] Invalid current URL:', currentUrl);
      return false;
    }

    // Build new URL with same repo, new path
    const newUrl = buildGhUrl({
      ...parsed,
      path: href
    });

    console.log('[LinkInterceptor] Internal link:', href, '→', newUrl);
    this.options.onNavigate(newUrl);

    return true;
  }

  private handleGhLink(href: string, e: MouseEvent): boolean {
    // External gh:// link
    if (!href.startsWith('gh://')) return false;

    e.preventDefault();

    console.log('[LinkInterceptor] gh:// link:', href);
    this.options.onNavigate(href);

    return true;
  }

  private handleExternalLink(href: string, e: MouseEvent): boolean {
    // HTTP/HTTPS links - open in system browser
    if (href.startsWith('http://') || href.startsWith('https://')) {
      e.preventDefault();

      console.log('[LinkInterceptor] External link:', href);

      // Open in system browser (Tauri API)
      import('@tauri-apps/plugin-shell').then(({ open }) => {
        open(href);
      });

      return true;
    }

    return false;
  }
}
```

**Usage:**
```typescript
const interceptor = new LinkInterceptor(document.body, {
  onNavigate: (url) => navigate(url),
  getCurrentUrl: () => currentUrl
});

// Clean up on unmount
return () => interceptor.stop();
```

---

### Step 4: Integrate with App.tsx (30 mins)

**Update `src/App.tsx`:**

```typescript
import { useEffect, useState, useRef } from 'react';
import { Navigator } from './components/Navigator';
import { LinkInterceptor } from './core/link-interceptor';
import { AddressBar } from './components/AddressBar';

export default function App() {
  const [currentUrl, setCurrentUrl] = useState('gh://minimact/docs');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const navigatorRef = useRef<any>(null);

  // Set up link interceptor
  useEffect(() => {
    const interceptor = new LinkInterceptor(document.body, {
      onNavigate: (url) => {
        console.log('[App] Navigating to:', url);
        setCurrentUrl(url);
      },
      getCurrentUrl: () => currentUrl
    });

    return () => interceptor.stop();
  }, [currentUrl]);

  // Update back/forward button states
  useEffect(() => {
    const updateHistoryState = () => {
      setCanGoBack(window.history.length > 1);
      // Note: Can't reliably detect forward history in browser
    };

    window.addEventListener('popstate', updateHistoryState);
    updateHistoryState();

    return () => window.removeEventListener('popstate', updateHistoryState);
  }, []);

  function handleBack() {
    window.history.back();
  }

  function handleForward() {
    window.history.forward();
  }

  function handleReload() {
    // Force reload current URL
    setCurrentUrl(prev => prev + '?reload=' + Date.now());
  }

  return (
    <div className="app">
      <div className="browser-chrome">
        {/* Navigation buttons */}
        <div className="nav-buttons">
          <button onClick={handleBack} disabled={!canGoBack} title="Back">
            ←
          </button>
          <button onClick={handleForward} disabled={!canGoForward} title="Forward">
            →
          </button>
          <button onClick={handleReload} title="Reload">
            ⟳
          </button>
        </div>

        {/* Address bar */}
        <AddressBar
          value={currentUrl}
          onChange={(url) => setCurrentUrl(url)}
          onSubmit={(url) => setCurrentUrl(url)}
        />
      </div>

      {/* Navigator renders the actual page */}
      <Navigator
        ref={navigatorRef}
        initialUrl={currentUrl}
        key={currentUrl} // Force remount on URL change
      />
    </div>
  );
}
```

---

## ✅ Success Criteria

After implementing Phase 4, you should be able to:

- [x] **Navigate via URL paths**
  ```
  gh://minimact/docs          → pages/index.tsx
  gh://minimact/docs/about    → pages/about.tsx
  gh://minimact/docs/blog     → pages/blog/index.tsx
  ```

- [x] **Click internal links**
  ```html
  <a href="/about">About</a>
  ```
  → Navigates to `gh://minimact/docs/about` without page reload

- [x] **Click gh:// links**
  ```html
  <a href="gh://other/repo">Other Site</a>
  ```
  → Navigates to different repository

- [x] **Back/forward buttons work**
  - Click link → Browser back button → Returns to previous page
  - State preserved in history

- [x] **URL updates in address bar**
  - Navigate to `/about` → Address bar shows `gh://user/repo/about`

- [x] **External links open in browser**
  ```html
  <a href="https://google.com">Google</a>
  ```
  → Opens in system browser (not in Cactus)

---

## 🧪 Testing

### Manual Test Plan

**1. Test basic routing:**
```typescript
// In browser console
const router = Router.createDefault();

// Should return pages/index.tsx
console.log(router.match('/'));

// Should return possible paths
console.log(router.resolvePath('/about'));
// → ['pages/about.tsx', 'pages/about/index.tsx', ...]
```

**2. Test navigation:**
- Load `gh://minimact/docs`
- Click a link to `/about`
- Verify URL changes to `gh://minimact/docs/about`
- Verify page content changes
- Click browser back button
- Verify returns to previous page

**3. Test link types:**
```html
<!-- Create test page with these links -->
<a href="/about">Internal</a>            <!-- Should intercept -->
<a href="gh://other/repo">External gh://</a>  <!-- Should intercept -->
<a href="https://google.com">Web</a>     <!-- Should open in browser -->
```

**4. Test Ctrl+Click:**
- Ctrl+Click (Windows) or Cmd+Click (Mac) on internal link
- Should open in new tab/window (not intercepted)

---

## 📚 Additional Features (Optional)

### Dynamic Routes

Support parameters in routes:

```typescript
// Pattern: /blog/:slug
router.addRoute('/blog/:slug', 'pages/blog/[slug].tsx');

// Usage:
router.match('/blog/hello-world');
// → { file: 'pages/blog/[slug].tsx', params: { slug: 'hello-world' } }
```

### Catch-All Routes

Support wildcard routes:

```typescript
router.addRoute('/docs/*', 'pages/docs/[...slug].tsx');

// Usage:
router.match('/docs/api/components/button');
// → { file: 'pages/docs/[...slug].tsx', params: { slug: ['api', 'components', 'button'] } }
```

### Query Parameters

Preserve query params in navigation:

```typescript
// Navigate to /search?q=hello
navigate('/search?q=hello');

// In component:
const params = new URLSearchParams(window.location.search);
const query = params.get('q'); // 'hello'
```

---

## 🎯 Estimated Timeline

| Task | Time |
|------|------|
| 1. Create Router class | 30 mins |
| 2. Update Navigator for history | 30 mins |
| 3. Add link interceptor | 30 mins |
| 4. Integrate with App.tsx | 30 mins |
| **Total** | **2 hours** |

Add 1 hour for testing and polish → **3 hours total**

---

## 🚀 Next Steps After Phase 4

Once routing is complete:

1. **Test end-to-end** - Load multi-page site from GitHub
2. **Add caching (Phase 6)** - Cache compiled routes
3. **Add PostWeb Index (Phase 7)** - Browse site registry
4. **Ship Alpha!** - Package and distribute

---

## 📖 References

- [React Router](https://reactrouter.com/) - Inspiration for API design
- [Next.js Routing](https://nextjs.org/docs/routing/introduction) - File-based routing conventions
- [gh-protocol.ts](../src/core/gh-protocol.ts) - URL parsing utilities
- [Navigator.tsx](../src/components/Navigator.tsx) - Current navigation component

---

<p align="center">
  <strong>Ready to add routing! 🗺️</strong>
</p>

<p align="center">
  Estimated time: 2-3 hours
</p>

<p align="center">
  After this, we'll be <strong>90% ready for Alpha</strong>! 🚀🌵
</p>
