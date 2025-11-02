import { GridPatcher } from './grid-patcher';
import {
  DataGridConfig,
  DataGrid,
  GridPatch,
  GridRegistrationRequest,
  GridItemUpdateRequest,
  GridItemDeleteRequest,
  GridItemAddRequest,
  GridSortRequest,
  GridRefreshRequest,
  GridPageChangeRequest
} from './types';

/**
 * useDataGrid - Server-side JSX templates with client-side surgical patching
 *
 * @example
 * ```tsx
 * const grid = useDataGrid({
 *   itemTemplate: ({ user }) => (
 *     <div className="user-row">
 *       <span>{user.name}</span>
 *       <button onClick={() => handleEdit(user.id)}>Edit</button>
 *     </div>
 *   ),
 *   data: users
 * });
 *
 * return grid.render();
 * ```
 */
export function useDataGrid<T extends Record<string, any>>(
  config: DataGridConfig<T>
): DataGrid<T> {

  // NOTE: This will be integrated with Minimact's component context
  // For now, we create a standalone implementation that can be enhanced later

  const gridId = config.gridId || `grid-${Math.random().toString(36).slice(2, 11)}`;
  const keyField = config.keyField || 'id';
  const pageSize = config.pageSize || 10;
  let currentPage = 0;
  let gridPatcher: GridPatcher | null = null;

  // Initialize grid patcher after mount
  const initializePatcher = () => {
    if (typeof window === 'undefined') return; // SSR guard

    const container = document.querySelector(`[data-grid-id="${gridId}"]`);
    if (container instanceof HTMLElement) {
      gridPatcher = new GridPatcher(container, gridId, {
        insertDuration: config.enableAnimations !== false ? 300 : 0,
        updateDuration: config.enableAnimations !== false ? 500 : 0,
        deleteDuration: config.enableAnimations !== false ? 300 : 0,
        flashOnUpdate: config.enableAnimations !== false
      });
    }
  };

  // Register grid with server (will be called via useEffect in integration)
  const registerGrid = (signalR: any, componentId: string) => {
    const request: GridRegistrationRequest = {
      componentId,
      gridId,
      keyField,
      initialPage: 0,
      pageSize: config.pageable ? pageSize : undefined
    };

    return signalR.invoke('RegisterDataGridInstance', request);
  };

  // Unregister grid from server
  const unregisterGrid = (signalR: any, componentId: string) => {
    return signalR.invoke('UnregisterDataGridInstance', {
      componentId,
      gridId
    });
  };

  // Listen for grid patches from server
  const handlePatch = (patch: GridPatch) => {
    if (gridPatcher) {
      gridPatcher.applyPatch(patch);
    }
  };

  // Grid operations
  const updateItem = (signalR: any, componentId: string, id: string | number, updates: Partial<T>) => {
    const request: GridItemUpdateRequest<T> = {
      componentId,
      gridId,
      itemId: id,
      updates
    };

    return signalR.invoke('UpdateGridItem', request).catch((err: any) => {
      console.error('[useDataGrid] Failed to update item:', err);
    });
  };

  const deleteItem = (signalR: any, componentId: string, id: string | number) => {
    const request: GridItemDeleteRequest = {
      componentId,
      gridId,
      itemId: id
    };

    return signalR.invoke('DeleteGridItem', request).catch((err: any) => {
      console.error('[useDataGrid] Failed to delete item:', err);
    });
  };

  const addItem = (signalR: any, componentId: string, item: T) => {
    const request: GridItemAddRequest<T> = {
      componentId,
      gridId,
      item
    };

    return signalR.invoke('AddGridItem', request).catch((err: any) => {
      console.error('[useDataGrid] Failed to add item:', err);
    });
  };

  const refresh = (signalR: any, componentId: string) => {
    const request: GridRefreshRequest = {
      componentId,
      gridId
    };

    return signalR.invoke('RefreshGrid', request).catch((err: any) => {
      console.error('[useDataGrid] Failed to refresh grid:', err);
    });
  };

  const sort = (signalR: any, componentId: string, field: keyof T, direction: 'asc' | 'desc') => {
    const request: GridSortRequest = {
      componentId,
      gridId,
      field: field.toString(),
      direction
    };

    return signalR.invoke('SortGrid', request).catch((err: any) => {
      console.error('[useDataGrid] Failed to sort grid:', err);
    });
  };

  const filter = (signalR: any, componentId: string, predicate: (item: T) => boolean) => {
    // TODO: Implement filter serialization
    console.warn('[useDataGrid] Filter not yet implemented');
  };

  const clearFilters = (signalR: any, componentId: string) => {
    return signalR.invoke('ClearGridFilters', {
      componentId,
      gridId
    }).catch((err: any) => {
      console.error('[useDataGrid] Failed to clear filters:', err);
    });
  };

  const goToPage = (signalR: any, componentId: string, page: number) => {
    if (!config.pageable) {
      console.warn('[useDataGrid] Grid is not pageable');
      return;
    }

    currentPage = page;

    const request: GridPageChangeRequest = {
      componentId,
      gridId,
      page
    };

    return signalR.invoke('ChangeGridPage', request).catch((err: any) => {
      console.error('[useDataGrid] Failed to change page:', err);
    });
  };

  const render = () => {
    // Server renders initial HTML with data-grid-id
    // Client applies patches
    return null; // Actual rendering handled by server
  };

  const totalPages = config.pageable
    ? Math.ceil(config.data.length / pageSize)
    : 1;

  // Return DataGrid instance
  // NOTE: In integration mode, these methods will be wrapped with context
  return {
    render,
    data: config.data,
    gridId,
    refresh: () => console.warn('[useDataGrid] Not integrated with Minimact context'),
    updateItem: () => console.warn('[useDataGrid] Not integrated with Minimact context'),
    deleteItem: () => console.warn('[useDataGrid] Not integrated with Minimact context'),
    addItem: () => console.warn('[useDataGrid] Not integrated with Minimact context'),
    sort: () => console.warn('[useDataGrid] Not integrated with Minimact context'),
    filter: () => console.warn('[useDataGrid] Not integrated with Minimact context'),
    clearFilters: () => console.warn('[useDataGrid] Not integrated with Minimact context'),
    goToPage: () => console.warn('[useDataGrid] Not integrated with Minimact context'),
    currentPage,
    totalPages
  };
}

/**
 * Internal helper functions (will be used by integration layer)
 */
export const GridHelpers = {
  initializePatcher: (
    container: HTMLElement,
    gridId: string,
    enableAnimations: boolean = true
  ): GridPatcher => {
    return new GridPatcher(container, gridId, {
      insertDuration: enableAnimations ? 300 : 0,
      updateDuration: enableAnimations ? 500 : 0,
      deleteDuration: enableAnimations ? 300 : 0,
      flashOnUpdate: enableAnimations
    });
  }
};
