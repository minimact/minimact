/**
 * Example: hookClassGenerator.cjs - Generates C# classes for custom hooks
 *
 * Output C# class structure:
 * ```csharp
 * [Hook]
 * public partial class UsePaginationHook : MinimactComponent
 * {
 *     // Configuration (from hook arguments)
 *     private int pageSize => GetState<int>("_config.pageSize");
 *
 *     // Hook state
 *     [State]
 *     private int currentPage = 1;
 *     [State]
 *     private int totalPages = 0;
 *     [State]
 *     private bool isLoading = false;
 *
 *     // State setters
 *     private void setCurrentPage(int value) { SetState(nameof(currentPage), value); }
 *     private void setTotalPages(int value) { SetState(nameof(totalPages), value); }
 *     private void setIsLoading(bool value) { SetState(nameof(isLoading), value); }
 *
 *     // Hook methods
 *     private void goToPage(int page) { ... }
 *     private void nextPage() { goToPage(currentPage + 1); }
 *     private void prevPage() { goToPage(currentPage - 1); }
 *     private void setTotal(int total) { setTotalPages((int)Math.Ceiling((double)total / pageSize)); }
 *
 *     // Hook UI rendering
 *     protected override VNode Render()
 *     {
 *         StateManager.SyncMembersToState(this);
 *         return new VElement("div", ...);
 *     }
 *
 *     // Event handlers
 *     public void Handle0(dynamic e) { prevPage(); }
 *     public void Handle1(dynamic e) { nextPage(); }
 * }
 * ```
 *
 * Functions exported:
 * - generateHookClass(analysis, component) → C# class code string
 * - generateVComponentWrapper(analysis, namespace, hexPath, args) → VComponentWrapper code
 * - generateStateAccess(analysis, namespace, returnBindings) → state accessors for parent
 * - mapTypeToCSharp(jsType) → C# type string
 * - getDefaultValue(csharpType) → default value string
 *
 * Type mapping:
 * - string → string
 * - number → int
 * - boolean → bool
 * - any → dynamic
 * - void → void
 * - object → object
 * - any[] → List<dynamic>
 * - string[] → List<string>
 * - number[] → List<int>
 */
import { useState, useEffect, useRef } from '@minimact/core';

// Custom hook that will be converted to a [Hook] C# class
function usePagination(namespace: string, pageSize: number) {
  // 1. STATE → [State] attributes + setter methods
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 2. METHODS → private methods in C# class
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    goToPage(currentPage + 1);
  };

  const prevPage = () => {
    goToPage(currentPage - 1);
  };

  const setTotal = (total: number) => {
    // Note: Uses pageSize config parameter
    setTotalPages(Math.ceil(total / pageSize));
  };

  // 3. JSX → Render() method with hex paths assigned
  const paginationUI = (
    <div className="pagination">
      {/* Event handlers become Handle0, Handle1, etc. */}
      <button onClick={prevPage} disabled={currentPage <= 1}>Prev</button>
      <span>{currentPage} / {totalPages}</span>
      <button onClick={nextPage} disabled={currentPage >= totalPages}>Next</button>
    </div>
  );

  // 4. RETURN → determines what parent component can access
  return [currentPage, totalPages, isLoading, goToPage, nextPage, prevPage, setTotal, paginationUI];
}

export function HookClassGeneratorExample() {
  // When hook is called, parent gets:
  // - state values via GetState<T>("namespace.stateName")
  // - methods via hook instance
  // - JSX via VComponentWrapper
  const [page, total, loading, goTo, next, prev, setTotal, ui] = usePagination('products', 10);

  // In parent's generated C#:
  // var page = GetState<int>("products.currentPage");
  // var total = GetState<int>("products.totalPages");
  // var loading = GetState<bool>("products.isLoading");
  // // goTo, next, prev, setTotal → method calls
  // // ui → VComponentWrapper with ComponentType="UsePaginationHook"

  return (
    <div>
      <h1>Products (Page {page})</h1>
      {/* ui renders as VComponentWrapper in parent's Render() */}
      {ui}
    </div>
  );
}

// VComponentWrapper generated for hook UI:
// ```csharp
// new VComponentWrapper
// {
//     ComponentName = "products",
//     ComponentType = "UsePaginationHook",
//     HexPath = "1.3",
//     InitialState = new Dictionary<string, object>
//     {
//         ["currentPage"] = 1,
//         ["totalPages"] = 0,
//         ["isLoading"] = false,
//         ["_config.pageSize"] = 10
//     }
// }
// ```
