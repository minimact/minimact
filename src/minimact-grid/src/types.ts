/**
 * Types for @minimact/grid
 */

/**
 * DataGrid configuration
 * Templates are converted to parameterized patches by Babel at build time
 */
export interface DataGridConfig<T = any> {
  /** Static header JSX (rendered once) */
  header?: any;

  /** Item template (parameterized, rendered per row) */
  itemTemplate: (item: { [key: string]: T }) => any;

  /** Subitem template (nested, rendered per child) */
  subitemTemplate?: (subitem: any) => any;

  /** Footer JSX (can be static or data-bound) */
  footer?: any;

  /** Data source */
  data: T[];

  /** Key field for item identification (default: 'id') */
  keyField?: string;

  /** Grid ID (auto-generated if not provided) */
  gridId?: string;

  /** Enable row animations (default: true) */
  enableAnimations?: boolean;

  /** Custom CSS class for grid container */
  className?: string;

  /** Enable sorting (default: false) */
  sortable?: boolean;

  /** Enable filtering (default: false) */
  filterable?: boolean;

  /** Enable pagination (default: false) */
  pageable?: boolean;

  /** Items per page (if pageable) */
  pageSize?: number;
}

/**
 * DataGrid instance returned by useDataGrid
 */
export interface DataGrid<T = any> {
  /** Render the grid (returns VNode from server) */
  render: () => any;

  /** Current data */
  data: T[];

  /** Grid ID */
  gridId: string;

  /** Refresh entire grid from server */
  refresh: () => void;

  /** Update a single item */
  updateItem: (id: string | number, updates: Partial<T>) => void;

  /** Delete an item */
  deleteItem: (id: string | number) => void;

  /** Add a new item */
  addItem: (item: T) => void;

  /** Sort by field */
  sort: (field: keyof T, direction: 'asc' | 'desc') => void;

  /** Filter items (server-side predicate) */
  filter: (predicate: (item: T) => boolean) => void;

  /** Clear all filters */
  clearFilters: () => void;

  /** Go to page (if pageable) */
  goToPage: (page: number) => void;

  /** Get current page (if pageable) */
  currentPage: number;

  /** Get total pages (if pageable) */
  totalPages: number;
}

/**
 * Grid patch types from server
 */
export type GridPatchType =
  | 'insertRow'
  | 'updateRow'
  | 'deleteRow'
  | 'updateCell'
  | 'replaceGrid'
  | 'replacePage';

/**
 * Grid patch from server
 */
export interface GridPatch {
  /** Type of patch operation */
  type: GridPatchType;

  /** Grid ID */
  gridId: string;

  /** Row index (for row operations) */
  rowIndex?: number;

  /** Cell index (for cell operations) */
  cellIndex?: number;

  /** HTML content (for insert/update operations) */
  html?: string;

  /** Cell value (for updateCell) */
  value?: any;

  /** Page number (for replacePage) */
  page?: number;
}

/**
 * Options for grid row animation
 */
export interface GridAnimationOptions {
  /** Insert animation duration (ms) */
  insertDuration?: number;

  /** Update animation duration (ms) */
  updateDuration?: number;

  /** Delete animation duration (ms) */
  deleteDuration?: number;

  /** Enable row flash on update */
  flashOnUpdate?: boolean;

  /** Flash color */
  flashColor?: string;
}

/**
 * Grid state (for internal tracking)
 */
export interface GridState<T = any> {
  /** Grid ID */
  gridId: string;

  /** Current data */
  data: T[];

  /** Key field */
  keyField: string;

  /** Current page (if pageable) */
  currentPage: number;

  /** Page size (if pageable) */
  pageSize: number;

  /** Total item count */
  totalItems: number;

  /** Current sort field */
  sortField?: keyof T;

  /** Current sort direction */
  sortDirection?: 'asc' | 'desc';

  /** Active filters */
  filters: Array<(item: T) => boolean>;
}

/**
 * Grid registration request
 */
export interface GridRegistrationRequest {
  /** Component ID */
  componentId: string;

  /** Grid ID */
  gridId: string;

  /** Key field */
  keyField: string;

  /** Initial page (if pageable) */
  initialPage?: number;

  /** Page size (if pageable) */
  pageSize?: number;
}

/**
 * Grid item update request
 */
export interface GridItemUpdateRequest<T = any> {
  /** Component ID */
  componentId: string;

  /** Grid ID */
  gridId: string;

  /** Item ID */
  itemId: string | number;

  /** Updates to apply */
  updates: Partial<T>;
}

/**
 * Grid item delete request
 */
export interface GridItemDeleteRequest {
  /** Component ID */
  componentId: string;

  /** Grid ID */
  gridId: string;

  /** Item ID */
  itemId: string | number;
}

/**
 * Grid item add request
 */
export interface GridItemAddRequest<T = any> {
  /** Component ID */
  componentId: string;

  /** Grid ID */
  gridId: string;

  /** Item to add */
  item: T;
}

/**
 * Grid sort request
 */
export interface GridSortRequest {
  /** Component ID */
  componentId: string;

  /** Grid ID */
  gridId: string;

  /** Field to sort by */
  field: string;

  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Grid refresh request
 */
export interface GridRefreshRequest {
  /** Component ID */
  componentId: string;

  /** Grid ID */
  gridId: string;
}

/**
 * Grid page change request
 */
export interface GridPageChangeRequest {
  /** Component ID */
  componentId: string;

  /** Grid ID */
  gridId: string;

  /** Page number (0-indexed) */
  page: number;
}
