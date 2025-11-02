/**
 * Hook Library - Comprehensive catalog of all available Minimact hooks
 *
 * Categories:
 * - Core Hooks (built-in React-like hooks)
 * - MVC Hooks (@minimact/mvc package)
 * - Punch Hooks (@minimact/punch package - DOM element state)
 * - Query Hooks (@minimact/query package - SQL for the DOM)
 * - Advanced Hooks (server tasks, context, computed)
 *
 * Each hook includes:
 * - Name, description, category
 * - Code example template
 * - Import statement
 * - Default selection status
 */

export interface Hook {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'mvc' | 'punch' | 'query' | 'advanced';
  packageName?: string; // NPM package if not core
  imports: string[]; // Import statements
  example: string; // Code example template
  isDefault: boolean; // Show by default or require expansion
  dependencies?: string[]; // Other hook IDs this depends on
}

export const HOOK_LIBRARY: Hook[] = [
  // ===== CORE HOOKS =====
  {
    id: 'useState',
    name: 'useState',
    description: 'Manage component state with instant updates and template prediction',
    category: 'core',
    imports: ["import { useState } from 'minimact';"],
    example: `export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`,
    isDefault: true
  },

  {
    id: 'useEffect',
    name: 'useEffect',
    description: 'Run side effects after component renders (timers, subscriptions, etc.)',
    category: 'core',
    imports: ["import { useEffect } from 'minimact';"],
    example: `export function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(interval); // Cleanup
  }, []); // Empty deps = run once

  return <div>Elapsed: {seconds}s</div>;
}`,
    isDefault: true,
    dependencies: ['useState']
  },

  {
    id: 'useRef',
    name: 'useRef',
    description: 'Create mutable refs that persist across renders without triggering updates',
    category: 'core',
    imports: ["import { useRef } from 'minimact';"],
    example: `export function FocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <input ref={inputRef} type="text" placeholder="Click button to focus" />
      <button onClick={handleFocus}>Focus Input</button>
    </div>
  );
}`,
    isDefault: true
  },

  // ===== ADVANCED HOOKS =====
  {
    id: 'useContext',
    name: 'useContext',
    description: 'Redis-like server-side cache with scoped lifetimes (session, request, URL, application)',
    category: 'advanced',
    imports: [
      "import { createContext, useContext } from 'minimact';"
    ],
    example: `// Create a session-scoped user context
const UserContext = createContext<User>('current-user', {
  scope: 'session',
  expiry: 3600000 // 1 hour
});

// Component 1: Login form (writes to context)
export function LoginForm() {
  const [_, setUser] = useContext(UserContext);

  const handleLogin = async (credentials) => {
    const user = await authenticate(credentials);
    setUser(user); // Stored in session cache, survives page navigation
  };

  return <form onSubmit={handleLogin}>...</form>;
}

// Component 2: User profile (reads from context)
export function UserProfile() {
  const [user] = useContext(UserContext);

  if (!user) return <Login />;
  return <div>Welcome, {user.name}</div>;
}`,
    isDefault: false
  },

  {
    id: 'useComputed',
    name: 'useComputed',
    description: 'Client-side computation with browser APIs (lodash, geolocation, crypto)',
    category: 'advanced',
    imports: ["import { useComputed } from 'minimact';"],
    example: `export function UserList({ users }) {
  // Use lodash on client (no server bundle bloat)
  const sortedUsers = useComputed('sortedUsers', () => {
    return _.sortBy(users, 'name');
  }, [users]);

  return <ul>{sortedUsers.map(u => <li>{u.name}</li>)}</ul>;
}

export function LocationMap() {
  // Use browser geolocation API
  const location = useComputed('location', async () => {
    const pos = await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(resolve);
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }, []);

  if (!location) return <div>Getting location...</div>;
  return <Map center={location} />;
}`,
    isDefault: false
  },

  {
    id: 'useServerTask',
    name: 'useServerTask',
    description: 'Execute TypeScript on C# or Rust runtime with automatic transpilation',
    category: 'advanced',
    imports: ["import { useServerTask } from 'minimact';"],
    example: `export function DataProcessor() {
  const crunch = useServerTask(async (numbers: number[]) => {
    return numbers
      .map(x => x * x)
      .filter(x => x > 100)
      .reduce((sum, x) => sum + x, 0);
  }, { runtime: 'rust' }); // Choose 'csharp' or 'rust'

  return (
    <div>
      <button onClick={() => crunch.start([1, 2, 3, 4, 5])}>
        Crunch Numbers
      </button>

      {crunch.status === 'running' && <Spinner />}
      {crunch.status === 'complete' && <p>Result: {crunch.result}</p>}
      {crunch.status === 'error' && <p>Error: {crunch.error}</p>}
    </div>
  );
}`,
    isDefault: false
  },

  {
    id: 'usePaginatedServerTask',
    name: 'usePaginatedServerTask',
    description: 'Server-side pagination with prefetching and automatic re-fetch on filters',
    category: 'advanced',
    imports: ["import { usePaginatedServerTask } from 'minimact';"],
    example: `export function UserList() {
  const [filters, setFilters] = useState({ role: 'admin' });

  const users = usePaginatedServerTask(
    async ({ page, pageSize, filters }) => {
      return await db.users
        .where(u => filters.role ? u.role === filters.role : true)
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .toList();
    },
    {
      pageSize: 20,
      getTotalCount: async (filters) => {
        return await db.users
          .where(u => filters.role ? u.role === filters.role : true)
          .count();
      },
      prefetchNext: true,
      runtime: 'csharp',
      dependencies: [filters]
    }
  );

  return (
    <div>
      <ul>
        {users.items.map(user => <li key={user.id}>{user.name}</li>)}
      </ul>

      <div>
        <button onClick={users.prev} disabled={!users.hasPrev}>Previous</button>
        <span>Page {users.page} of {users.totalPages}</span>
        <button onClick={users.next} disabled={!users.hasNext}>Next</button>
      </div>

      {users.pending && <Spinner />}
    </div>
  );
}`,
    isDefault: false,
    dependencies: ['useServerTask', 'useState']
  },

  // ===== MVC HOOKS =====
  {
    id: 'useMvcState',
    name: 'useMvcState',
    description: 'Access MVC ViewModel properties with automatic mutability enforcement',
    category: 'mvc',
    packageName: '@minimact/mvc',
    imports: ["import { useMvcState } from '@minimact/mvc';"],
    example: `export function ProductDetailsPage() {
  // Immutable props (no setter returned)
  const [productName] = useMvcState<string>('productName');
  const [price] = useMvcState<number>('price');

  // Mutable props (setter returned)
  const [quantity, setQuantity] = useMvcState<number>('initialQuantity', {
    sync: 'immediate' // Sync changes to server instantly
  });
  const [color, setColor] = useMvcState<string>('initialSelectedColor', {
    sync: 'debounced',
    debounceMs: 500
  });

  return (
    <div>
      <h1>{productName}</h1>
      <div>\${price.toFixed(2)}</div>

      {/* Quantity selector - client can modify */}
      <div>
        <button onClick={() => setQuantity(quantity - 1)}>-</button>
        <span>{quantity}</span>
        <button onClick={() => setQuantity(quantity + 1)}>+</button>
      </div>

      {/* Color selector - client can modify */}
      <select value={color} onChange={(e) => setColor(e.target.value)}>
        <option value="Black">Black</option>
        <option value="White">White</option>
        <option value="Red">Red</option>
      </select>
    </div>
  );
}`,
    isDefault: false
  },

  {
    id: 'useMvcViewModel',
    name: 'useMvcViewModel',
    description: 'Access the entire MVC ViewModel object with type safety',
    category: 'mvc',
    packageName: '@minimact/mvc',
    imports: ["import { useMvcViewModel } from '@minimact/mvc';"],
    example: `interface ProductViewModel {
  productName: string;
  price: number;
  isAdminRole: boolean;
  userEmail: string;
  initialQuantity: number;
  initialSelectedColor: string;
}

export function ProductDetailsPage() {
  const viewModel = useMvcViewModel<ProductViewModel>();

  return (
    <div>
      <h1>{viewModel.productName}</h1>
      <div>Logged in as: {viewModel.userEmail}</div>
      {viewModel.isAdminRole && (
        <div className="admin-controls">
          <button>Edit Product</button>
        </div>
      )}
    </div>
  );
}`,
    isDefault: false
  },

  // ===== PUNCH HOOKS (DOM Element State) =====
  {
    id: 'useDomElementState',
    name: 'useDomElementState',
    description: 'Make the DOM a reactive data source (80+ properties: intersecting, size, children, etc.)',
    category: 'punch',
    packageName: '@minimact/punch',
    imports: ["import { useDomElementState } from '@minimact/punch';"],
    example: `export function LazyLoadGallery() {
  const container = useDomElementState('.gallery-container');

  return (
    <div>
      <div className="gallery-container">
        {/* Show pagination when > 5 children */}
        {container.childrenCount > 5 && <Pagination />}

        {/* Lazy load content when scrolled into view */}
        {container.isIntersecting && <GalleryContent />}

        {/* Show loading indicator when not in viewport */}
        {!container.isIntersecting && <Skeleton />}
      </div>

      {/* Show statistics */}
      <div>Total items: {container.childrenCount}</div>
    </div>
  );
}`,
    isDefault: false
  },

  {
    id: 'useDomElementState-pseudo',
    name: 'useDomElementState (Pseudo-State)',
    description: 'Query CSS pseudo-classes as reactive state (:hover, :focus, :active)',
    category: 'punch',
    packageName: '@minimact/punch',
    imports: ["import { useDomElementState } from '@minimact/punch';"],
    example: `export function ButtonGroup() {
  const buttons = useDomElementState('button');

  return (
    <div>
      {/* Show global tooltip when ANY button is hovered */}
      {buttons.some(b => b.state.hover) && <GlobalTooltip />}

      {/* Show keyboard outline when focused */}
      {buttons.some(b => b.state.focus) && <KeyboardOutline />}

      {/* Show active animation */}
      {buttons.some(b => b.state.active) && <PressAnimation />}

      <button>Button 1</button>
      <button>Button 2</button>
      <button>Button 3</button>
    </div>
  );
}`,
    isDefault: false,
    dependencies: ['useDomElementState']
  },

  {
    id: 'useDomElementState-theme',
    name: 'useDomElementState (Theme)',
    description: 'React to dark/light mode and responsive breakpoints',
    category: 'punch',
    packageName: '@minimact/punch',
    imports: ["import { useDomElementState } from '@minimact/punch';"],
    example: `export function ResponsiveLayout() {
  const app = useDomElementState('#root');

  return (
    <div>
      {/* Theme-aware components */}
      {app.theme.isDark && <DarkModeStyles />}
      {app.theme.isLight && <LightModeStyles />}

      {/* Responsive breakpoints (Tailwind-style) */}
      {app.breakpoint.sm && <MobileNav />}
      {app.breakpoint.md && <TabletLayout />}
      {app.breakpoint.lg && <DesktopLayout />}
      {app.breakpoint.between('md', 'xl') && <TabletOnlyFeature />}
    </div>
  );
}`,
    isDefault: false,
    dependencies: ['useDomElementState']
  },

  {
    id: 'useDomElementState-history',
    name: 'useDomElementState (Temporal)',
    description: 'Track state history, trends, and stability patterns over time',
    category: 'punch',
    packageName: '@minimact/punch',
    imports: ["import { useDomElementState } from '@minimact/punch';"],
    example: `export function Editor() {
  const editor = useDomElementState('#editor');

  return (
    <div>
      {/* Smart auto-save based on stability */}
      {editor.history.hasStabilized && <AutoSave />}
      {!editor.history.hasStabilized && <SavingIndicator />}

      {/* Performance monitoring */}
      {editor.history.changesPerSecond > 10 && (
        <PerformanceWarning rate={editor.history.changesPerSecond} />
      )}

      {/* Data freshness indicators */}
      {editor.history.timeSinceLastChange > 60000 && <StaleDataWarning />}

      {/* Trend analysis */}
      {editor.history.trend === 'increasing' && <GrowingContent />}
      {editor.history.isOscillating && <DataLoadingIssue />}

      <div id="editor" contentEditable>...</div>
    </div>
  );
}`,
    isDefault: false,
    dependencies: ['useDomElementState']
  },

  {
    id: 'useDomElementState-stats',
    name: 'useDomElementState (Statistics)',
    description: 'Aggregate statistics over collections of elements',
    category: 'punch',
    packageName: '@minimact/punch',
    imports: ["import { useDomElementState } from '@minimact/punch';"],
    example: `export function PriceList() {
  const prices = useDomElementState('.price');

  return (
    <div>
      {/* Show premium badge when average > $100 */}
      {prices.vals.avg() > 100 && <PremiumBadge />}

      {/* Show bulk discount when total > $1000 */}
      {prices.vals.sum() > 1000 && <BulkDiscount />}

      {/* Show statistics */}
      <div className="stats">
        <div>Average: \${prices.vals.avg().toFixed(2)}</div>
        <div>Total: \${prices.vals.sum().toFixed(2)}</div>
        <div>Median: \${prices.vals.median().toFixed(2)}</div>
        <div>Range: \${prices.vals.min()} - \${prices.vals.max()}</div>
      </div>

      <div className="price">$99.99</div>
      <div className="price">$149.99</div>
      <div className="price">$79.99</div>
    </div>
  );
}`,
    isDefault: false,
    dependencies: ['useDomElementState']
  },

  // ===== QUERY HOOKS (SQL for the DOM) =====
  {
    id: 'useDomQuery',
    name: 'useDomQuery',
    description: 'Query the DOM with SQL-like syntax (SELECT, WHERE, ORDER BY, JOIN, GROUP BY)',
    category: 'query',
    packageName: '@minimact/query',
    imports: ["import { useDomQuery } from '@minimact/query';"],
    example: `export function DashboardStats() {
  // Query DOM like a SQL database
  const query = useDomQuery()
    .from('.metric-card')
    .where(card => card.isIntersecting && card.state.hover)
    .orderBy(card => card.history.changeCount, 'DESC')
    .limit(10);

  return (
    <div>
      <h2>Top 10 Most Active Cards</h2>
      {query.select(card => ({
        id: card.attributes.id,
        title: card.textContent,
        changes: card.history.changeCount,
        isHovered: card.state.hover
      })).map(row => (
        <div key={row.id} className={row.isHovered ? 'highlight' : ''}>
          {row.title} - {row.changes} changes
        </div>
      ))}
    </div>
  );
}`,
    isDefault: false
  },

  {
    id: 'useDomQuery-groupby',
    name: 'useDomQuery (GROUP BY)',
    description: 'Aggregate and group DOM elements like SQL GROUP BY with HAVING',
    category: 'query',
    packageName: '@minimact/query',
    imports: ["import { useDomQuery } from '@minimact/query';"],
    example: `export function ComponentStats() {
  const stats = useDomQuery()
    .from('.component')
    .groupBy(c => c.lifecycle.lifecycleState)
    .having(group => group.count > 5); // Only states with 5+ components

  return (
    <div>
      <h2>Component Lifecycle Summary</h2>
      {stats.select(group => ({
        state: group.key,
        count: group.count,
        avgChanges: group.items.reduce((sum, c) =>
          sum + c.history.changeCount, 0) / group.count
      })).map(row => (
        <div key={row.state}>
          <strong>{row.state}</strong>: {row.count} components
          (avg {row.avgChanges.toFixed(1)} changes)
        </div>
      ))}
    </div>
  );
}`,
    isDefault: false,
    dependencies: ['useDomQuery']
  },

  {
    id: 'useDomQuery-join',
    name: 'useDomQuery (JOIN)',
    description: 'Relate DOM elements to each other with SQL JOIN operations',
    category: 'query',
    packageName: '@minimact/query',
    imports: ["import { useDomQuery } from '@minimact/query';"],
    example: `export function ProductReviews() {
  const products = useDomQuery()
    .from('.product')
    .leftJoin(
      useDomQuery().from('.review'),
      (product, review) =>
        product.attributes['data-id'] === review.attributes['data-product-id']
    )
    .where(result => result.right !== null); // Has reviews

  return (
    <div>
      <h2>Products with Reviews</h2>
      {products.select(result => ({
        productId: result.left.attributes['data-id'],
        productName: result.left.textContent,
        reviewCount: result.right?.childrenCount || 0
      })).map(row => (
        <div key={row.productId}>
          {row.productName} - {row.reviewCount} reviews
        </div>
      ))}
    </div>
  );
}`,
    isDefault: false,
    dependencies: ['useDomQuery']
  },

  {
    id: 'useDomQuery-aggregates',
    name: 'useDomQuery (Aggregates)',
    description: 'Use SQL aggregate functions (COUNT, SUM, AVG, MIN, MAX, STDDEV)',
    category: 'query',
    packageName: '@minimact/query',
    imports: ["import { useDomQuery } from '@minimact/query';"],
    example: `export function PerformanceMonitor() {
  const components = useDomQuery().from('.component');

  const unstable = components
    .where(c => c.history.changesPerSecond > 10);

  return (
    <div>
      <h2>Performance Metrics</h2>

      <div className="metrics">
        <div>Total Components: {components.count()}</div>
        <div>Unstable Components: {unstable.count()}</div>
        <div>Avg Changes: {components.avg(c => c.history.changeCount).toFixed(1)}</div>
        <div>Max Changes: {components.max(c => c.history.changeCount)}</div>
        <div>Min Changes: {components.min(c => c.history.changeCount)}</div>
      </div>

      {unstable.any() && (
        <div className="alert">
          ⚠️ {unstable.count()} components are unstable!
        </div>
      )}
    </div>
  );
}`,
    isDefault: false,
    dependencies: ['useDomQuery']
  },

  {
    id: 'useDomQuery-setops',
    name: 'useDomQuery (Set Operations)',
    description: 'Combine queries with SQL set operations (UNION, INTERSECT, EXCEPT)',
    category: 'query',
    packageName: '@minimact/query',
    imports: ["import { useDomQuery } from '@minimact/query';"],
    example: `export function InteractiveElements() {
  const buttons = useDomQuery().from('button');
  const links = useDomQuery().from('a');
  const inputs = useDomQuery().from('input');

  // UNION - all interactive elements
  const allInteractive = buttons.union(links).union(inputs);

  // INTERSECT - elements that are both hovered AND focused
  const hovered = useDomQuery().from('.interactive').where(el => el.state.hover);
  const focused = useDomQuery().from('.interactive').where(el => el.state.focus);
  const both = hovered.intersect(focused);

  // EXCEPT - visible but not in viewport
  const allCards = useDomQuery().from('.card');
  const visible = allCards.where(c => c.isIntersecting);
  const offscreen = allCards.except(visible);

  return (
    <div>
      <div>Interactive elements: {allInteractive.count()}</div>
      <div>Hovered + Focused: {both.count()}</div>
      <div>Offscreen cards: {offscreen.count()}</div>
    </div>
  );
}`,
    isDefault: false,
    dependencies: ['useDomQuery']
  },

  {
    id: 'useDomQueryThrottled',
    name: 'useDomQueryThrottled',
    description: 'Throttled queries - limit updates to once every N milliseconds for performance',
    category: 'query',
    packageName: '@minimact/query',
    imports: ["import { useDomQueryThrottled } from '@minimact/query';"],
    example: `export function LiveDataFeed() {
  // Only update max 4 times per second (every 250ms)
  const liveData = useDomQueryThrottled(250)
    .from('.data-point')
    .where(d => d.isIntersecting)
    .orderBy(d => d.attributes['data-timestamp'], 'DESC')
    .limit(100);

  return (
    <div>
      <h2>Live Data Feed</h2>
      <p className="info">Updates throttled to 250ms for performance</p>

      {liveData.select(d => ({
        id: d.attributes['data-id'],
        value: d.textContent,
        timestamp: d.attributes['data-timestamp']
      })).map(row => (
        <div key={row.id} className="data-row">
          {row.timestamp}: {row.value}
        </div>
      ))}
    </div>
  );
}`,
    isDefault: false
  },

  {
    id: 'useDomQueryDebounced',
    name: 'useDomQueryDebounced',
    description: 'Debounced queries - only update after N milliseconds of DOM inactivity',
    category: 'query',
    packageName: '@minimact/query',
    imports: ["import { useDomQueryDebounced } from '@minimact/query';"],
    example: `export function SearchResults() {
  // Only update after 500ms of no DOM changes (user stopped typing/scrolling)
  const results = useDomQueryDebounced(500)
    .from('.search-result')
    .where(result => result.isIntersecting)
    .orderBy(result => result.attributes['data-relevance'], 'DESC');

  return (
    <div>
      <h2>Search Results</h2>
      <p className="info">Updates debounced to 500ms after activity stops</p>

      <div className="stats">
        Total: {results.count()} results
      </div>

      {results.select(r => ({
        id: r.attributes['data-id'],
        title: r.textContent,
        relevance: r.attributes['data-relevance']
      })).map(row => (
        <div key={row.id}>
          {row.title} (relevance: {row.relevance})
        </div>
      ))}
    </div>
  );
}`,
    isDefault: false
  },

  {
    id: 'useDomQuery-accessibility',
    name: 'useDomQuery (Accessibility Audit)',
    description: 'Query the DOM to audit accessibility issues and violations',
    category: 'query',
    packageName: '@minimact/query',
    imports: ["import { useDomQuery } from '@minimact/query';"],
    example: `export function AccessibilityAudit() {
  // Find buttons without labels
  const unlabeled = useDomQuery()
    .from('button')
    .where(btn =>
      !btn.attributes['aria-label'] &&
      !btn.textContent?.trim()
    );

  // Find disabled elements without aria-disabled
  const improperDisabled = useDomQuery()
    .from('input, button')
    .where(el =>
      el.state.disabled &&
      !el.attributes['aria-disabled']
    );

  // Find images without alt text
  const missingAlt = useDomQuery()
    .from('img')
    .where(img => !img.attributes['alt']);

  const hasIssues = unlabeled.any() || improperDisabled.any() || missingAlt.any();

  return (
    <div className={hasIssues ? 'audit-fail' : 'audit-pass'}>
      <h2>Accessibility Audit</h2>

      <div className="issues">
        <div className={unlabeled.count() > 0 ? 'error' : 'pass'}>
          Unlabeled buttons: {unlabeled.count()}
        </div>
        <div className={improperDisabled.count() > 0 ? 'error' : 'pass'}>
          Improperly disabled: {improperDisabled.count()}
        </div>
        <div className={missingAlt.count() > 0 ? 'error' : 'pass'}>
          Images without alt: {missingAlt.count()}
        </div>
      </div>

      {hasIssues ? (
        <div className="alert">⚠️ Accessibility issues detected!</div>
      ) : (
        <div className="success">✓ All accessibility checks passed!</div>
      )}
    </div>
  );
}`,
    isDefault: false
  }
];

/**
 * Get hooks by category
 */
export function getHooksByCategory(category: Hook['category']): Hook[] {
  return HOOK_LIBRARY.filter(h => h.category === category);
}

/**
 * Get default hooks (shown by default in UI)
 */
export function getDefaultHooks(): Hook[] {
  return HOOK_LIBRARY.filter(h => h.isDefault);
}

/**
 * Get non-default hooks (shown when expanded)
 */
export function getAdvancedHooks(): Hook[] {
  return HOOK_LIBRARY.filter(h => !h.isDefault);
}

/**
 * Get hook by ID
 */
export function getHookById(id: string): Hook | undefined {
  return HOOK_LIBRARY.find(h => h.id === id);
}

/**
 * Get all dependencies for a hook (recursively)
 */
export function getHookDependencies(hookId: string): string[] {
  const hook = getHookById(hookId);
  if (!hook || !hook.dependencies) return [];

  const deps = new Set<string>();
  const queue = [...hook.dependencies];

  while (queue.length > 0) {
    const depId = queue.shift()!;
    if (deps.has(depId)) continue;

    deps.add(depId);
    const depHook = getHookById(depId);
    if (depHook?.dependencies) {
      queue.push(...depHook.dependencies);
    }
  }

  return Array.from(deps);
}

/**
 * Get required NPM packages for selected hooks
 */
export function getRequiredPackages(selectedHookIds: string[]): string[] {
  const packages = new Set<string>();

  for (const hookId of selectedHookIds) {
    const hook = getHookById(hookId);
    if (hook?.packageName) {
      packages.add(hook.packageName);
    }
  }

  return Array.from(packages);
}
