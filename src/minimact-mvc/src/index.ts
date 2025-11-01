/**
 * @minimact/mvc
 *
 * MVC Bridge integration for Minimact
 * Seamless connection between ASP.NET MVC Controllers and Minimact components
 *
 * @packageDocumentation
 */

// ============================================================
// HOOKS
// ============================================================

/**
 * Core hooks for accessing MVC ViewModel data
 */
export {
    useMvcState,
    useMvcViewModel,
    isMvcPropertyMutable,
    getMvcStateMetadata,
    flushMvcState
} from './hooks';

/**
 * Internal functions for Minimact runtime integration
 * @internal
 */
export {
    setMvcContext,
    clearMvcContext,
    resetMvcStateIndex
} from './hooks';

// ============================================================
// TYPES
// ============================================================

/**
 * Type definitions
 */
export type {
    MvcViewModelWrapper,
    MutableMvcState,
    ImmutableMvcState,
    UseMvcStateOptions,
    MvcStateMetadata
} from './types';

// ============================================================
// VERSION & METADATA
// ============================================================

export const VERSION = '0.1.0';

/**
 * Package metadata for debugging
 */
export const PACKAGE_INFO = {
    name: '@minimact/mvc',
    version: VERSION,
    description: 'MVC Bridge integration for Minimact',
    features: [
        'useMvcState hook with automatic mutability enforcement',
        'useMvcViewModel hook for read-only ViewModel access',
        'Server-side [Mutable] attribute support',
        'Security boundary validation',
        'Full TypeScript type safety',
        'Sync strategies (immediate, debounced, manual)',
        'Template Patch System integration',
        'PlaygroundBridge support'
    ]
} as const;

/**
 * Usage example:
 *
 * @example
 * // C# ViewModel
 * public class ProductViewModel {
 *     public string ProductName { get; set; }
 *     public decimal Price { get; set; }
 *     public bool IsAdmin { get; set; }
 *
 *     [Mutable]
 *     public int InitialQuantity { get; set; }
 * }
 *
 * @example
 * // TSX Component
 * import { useMvcState, useMvcViewModel } from '@minimact/mvc';
 *
 * interface ProductViewModel {
 *     productName: string;
 *     price: number;
 *     isAdmin: boolean;
 *     initialQuantity: number;
 * }
 *
 * export function ProductPage() {
 *     // Immutable (no setter)
 *     const [productName] = useMvcState<string>('productName');
 *     const [price] = useMvcState<number>('price');
 *     const [isAdmin] = useMvcState<boolean>('isAdmin');
 *
 *     // Mutable (with setter)
 *     const [quantity, setQuantity] = useMvcState<number>('initialQuantity');
 *
 *     // Access entire ViewModel
 *     const viewModel = useMvcViewModel<ProductViewModel>();
 *
 *     return (
 *         <div>
 *             <h1>{productName}</h1>
 *             <p>${price.toFixed(2)}</p>
 *
 *             <div>
 *                 <button onClick={() => setQuantity(quantity - 1)}>-</button>
 *                 <span>{quantity}</span>
 *                 <button onClick={() => setQuantity(quantity + 1)}>+</button>
 *             </div>
 *
 *             {isAdmin && <button>Edit Product</button>}
 *         </div>
 *     );
 * }
 */
