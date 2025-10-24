import { useEffect, useState, useRef } from 'react';
import { DomQueryBuilder } from './query-builder';
import type { DomElementState } from 'minimact-punch';

/**
 * useDomQuery - Reactive React hook for querying the DOM
 *
 * Automatically re-runs the query when the DOM changes, providing
 * real-time reactive query results.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const query = useDomQuery()
 *     .from('.card')
 *     .where(card => card.state.hover && card.isIntersecting)
 *     .orderBy(card => card.history.changeCount, 'DESC')
 *     .limit(10);
 *
 *   return (
 *     <div>
 *       {query.select(card => ({
 *         id: card.attributes.id,
 *         title: card.textContent
 *       })).map(row => (
 *         <div key={row.id}>{row.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDomQuery<T = DomElementState>(): DomQueryBuilder<T> {
  const queryRef = useRef<DomQueryBuilder<T>>(new DomQueryBuilder<T>());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // Set up MutationObserver to watch for DOM changes
    const observer = new MutationObserver(() => {
      // Force re-render when DOM changes
      forceUpdate((prev: number) => prev + 1);
    });

    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: false,
      characterData: false
    });

    // Also listen for custom events from minimact-punch trackers
    const handlePunchUpdate = () => {
      forceUpdate((prev: number) => prev + 1);
    };

    document.addEventListener('minimact-punch:update', handlePunchUpdate);

    return () => {
      observer.disconnect();
      document.removeEventListener('minimact-punch:update', handlePunchUpdate);
    };
  }, []);

  return queryRef.current;
}

/**
 * useDomQueryStatic - Non-reactive version that only runs once
 *
 * Use this when you don't need automatic updates on DOM changes.
 *
 * @example
 * ```typescript
 * const query = useDomQueryStatic()
 *   .from('.card')
 *   .where(card => card.childrenCount > 5);
 * ```
 */
export function useDomQueryStatic<T = DomElementState>(): DomQueryBuilder<T> {
  const queryRef = useRef<DomQueryBuilder<T>>(new DomQueryBuilder<T>());
  return queryRef.current;
}

/**
 * useDomQueryThrottled - Reactive with throttling
 *
 * Limits re-renders to once every N milliseconds for performance.
 *
 * @example
 * ```typescript
 * const query = useDomQueryThrottled(250) // Max 4 updates per second
 *   .from('.card');
 * ```
 */
export function useDomQueryThrottled<T = DomElementState>(throttleMs: number = 100): DomQueryBuilder<T> {
  const queryRef = useRef<DomQueryBuilder<T>>(new DomQueryBuilder<T>());
  const [, forceUpdate] = useState(0);
  const lastUpdateRef = useRef(0);
  const pendingUpdateRef = useRef<number | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      if (timeSinceLastUpdate >= throttleMs) {
        // Immediate update if enough time has passed
        lastUpdateRef.current = now;
        forceUpdate((prev: number) => prev + 1);
      } else {
        // Schedule update for later
        if (pendingUpdateRef.current !== null) {
          clearTimeout(pendingUpdateRef.current);
        }

        pendingUpdateRef.current = window.setTimeout(() => {
          lastUpdateRef.current = Date.now();
          forceUpdate((prev: number) => prev + 1);
          pendingUpdateRef.current = null;
        }, throttleMs - timeSinceLastUpdate);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    return () => {
      observer.disconnect();
      if (pendingUpdateRef.current !== null) {
        clearTimeout(pendingUpdateRef.current);
      }
    };
  }, [throttleMs]);

  return queryRef.current;
}

/**
 * useDomQueryDebounced - Reactive with debouncing
 *
 * Only re-renders after N milliseconds of inactivity.
 *
 * @example
 * ```typescript
 * const query = useDomQueryDebounced(500) // Wait for 500ms of quiet
 *   .from('.card');
 * ```
 */
export function useDomQueryDebounced<T = DomElementState>(debounceMs: number = 250): DomQueryBuilder<T> {
  const queryRef = useRef<DomQueryBuilder<T>>(new DomQueryBuilder<T>());
  const [, forceUpdate] = useState(0);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Clear existing timer
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = window.setTimeout(() => {
        forceUpdate((prev: number) => prev + 1);
        debounceTimerRef.current = null;
      }, debounceMs);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    return () => {
      observer.disconnect();
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debounceMs]);

  return queryRef.current;
}
