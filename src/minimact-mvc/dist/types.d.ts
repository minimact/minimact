/**
 * @minimact/mvc - Types
 *
 * Type definitions for MVC Bridge integration
 */
/**
 * MVC ViewModel wrapper with mutability metadata
 * Embedded in HTML by MinimactPageRenderer
 */
export interface MvcViewModelWrapper<T = any> {
    /**
     * The actual ViewModel data from C#
     */
    data: T;
    /**
     * Mutability metadata (property name → is mutable)
     * Extracted from [Mutable] attributes on C# properties
     */
    _mutability: Record<string, boolean>;
}
/**
 * Hook return type for mutable MVC state
 * Returns both value and setter (like useState)
 */
export type MutableMvcState<T> = [T, (newValue: T | ((prev: T) => T)) => void];
/**
 * Hook return type for immutable MVC state
 * Returns only value (no setter)
 */
export type ImmutableMvcState<T> = [T];
/**
 * Configuration options for useMvcState hook
 */
export interface UseMvcStateOptions {
    /**
     * Default value if property not found in ViewModel
     */
    defaultValue?: any;
    /**
     * Override mutability check (dangerous - use with caution!)
     * This bypasses the [Mutable] attribute check.
     * Server will still validate mutability.
     */
    forceMutable?: boolean;
    /**
     * Custom equality function for change detection
     * Default: Object.is
     */
    equals?: (prev: any, next: any) => boolean;
    /**
     * Sync strategy for mutable state
     * - 'immediate': Sync every change to server (default)
     * - 'debounced': Batch changes (useful for text inputs)
     * - 'manual': No auto-sync (call syncToServer() manually)
     */
    sync?: 'immediate' | 'debounced' | 'manual';
    /**
     * Debounce delay in ms (if sync = 'debounced')
     * Default: 300ms
     */
    syncDelay?: number;
}
/**
 * Metadata about an MVC state binding
 */
export interface MvcStateMetadata {
    propertyName: string;
    isMutable: boolean;
    currentValue: any;
    lastSynced: number;
}
/**
 * Global window interface extension for ViewModel
 */
declare global {
    interface Window {
        /**
         * MVC ViewModel embedded by server
         * Set by MinimactPageRenderer in HTML
         */
        __MINIMACT_VIEWMODEL__?: MvcViewModelWrapper;
    }
}
/**
 * C# decimal type (128-bit precise decimal, for money/financial calculations)
 * Maps to C#: decimal
 *
 * Use this for currency, prices, percentages, and financial data.
 * At runtime, this is just a number, but the Babel plugin will generate C# decimal.
 *
 * @example
 * interface ProductViewModel {
 *   price: decimal;  // ✅ Generates C#: public decimal Price { get; set; }
 *   taxRate: decimal;
 * }
 */
export type decimal = number;
/**
 * C# int (32-bit signed integer)
 * Maps to C#: int
 *
 * Use this for counts, IDs, quantities, and integer values.
 *
 * @example
 * interface ProductViewModel {
 *   quantity: int32;  // ✅ Generates C#: public int Quantity { get; set; }
 *   productId: int32;
 * }
 */
export type int32 = number;
/**
 * C# long (64-bit signed integer)
 * Maps to C#: long
 *
 * Use this for large numbers, timestamps, big IDs.
 *
 * @example
 * interface UserViewModel {
 *   userId: int64;  // ✅ Generates C#: public long UserId { get; set; }
 *   timestampMs: int64;
 * }
 */
export type int64 = number;
/**
 * C# double (64-bit floating point)
 * Maps to C#: double
 *
 * Use this for scientific calculations, coordinates, non-financial decimals.
 *
 * @example
 * interface LocationViewModel {
 *   latitude: float64;  // ✅ Generates C#: public double Latitude { get; set; }
 *   longitude: float64;
 * }
 */
export type float64 = number;
/**
 * C# float (32-bit floating point)
 * Maps to C#: float
 *
 * Use this for graphics, physics, when precision isn't critical.
 *
 * @example
 * interface GameViewModel {
 *   playerSpeed: float32;  // ✅ Generates C#: public float PlayerSpeed { get; set; }
 * }
 */
export type float32 = number;
/**
 * C# byte (unsigned 8-bit integer, 0-255)
 * Maps to C#: byte
 *
 * Use this for RGB values, small unsigned integers.
 *
 * @example
 * interface ColorViewModel {
 *   red: byte;  // ✅ Generates C#: public byte Red { get; set; }
 *   green: byte;
 *   blue: byte;
 * }
 */
export type byte = number;
/**
 * C# short (16-bit signed integer)
 * Maps to C#: short
 *
 * Use this for small integer ranges.
 *
 * @example
 * interface StatsViewModel {
 *   year: int16;  // ✅ Generates C#: public short Year { get; set; }
 * }
 */
export type int16 = number;
/**
 * C# Guid (globally unique identifier)
 * Maps to C#: Guid
 *
 * Use this for UUIDs and GUIDs.
 * At runtime, this is a string in format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 *
 * @example
 * interface UserViewModel {
 *   userId: Guid;  // ✅ Generates C#: public Guid UserId { get; set; }
 * }
 */
export type Guid = string;
/**
 * C# DateTime
 * Maps to C#: DateTime
 *
 * Use this for dates and times.
 * At runtime, this is an ISO 8601 string.
 *
 * @example
 * interface EventViewModel {
 *   createdAt: DateTime;  // ✅ Generates C#: public DateTime CreatedAt { get; set; }
 * }
 */
export type DateTime = string;
/**
 * C# DateOnly (date without time, .NET 6+)
 * Maps to C#: DateOnly
 *
 * Use this for dates without time component (birthdays, deadlines).
 * At runtime, this is a string in format "YYYY-MM-DD"
 *
 * @example
 * interface PersonViewModel {
 *   birthDate: DateOnly;  // ✅ Generates C#: public DateOnly BirthDate { get; set; }
 * }
 */
export type DateOnly = string;
/**
 * C# TimeOnly (time without date, .NET 6+)
 * Maps to C#: TimeOnly
 *
 * Use this for times without date component (business hours, alarms).
 * At runtime, this is a string in format "HH:mm:ss"
 *
 * @example
 * interface StoreViewModel {
 *   openingTime: TimeOnly;  // ✅ Generates C#: public TimeOnly OpeningTime { get; set; }
 * }
 */
export type TimeOnly = string;
export type int = int32;
export type long = int64;
export type double = float64;
export type float = float32;
export type short = int16;
//# sourceMappingURL=types.d.ts.map