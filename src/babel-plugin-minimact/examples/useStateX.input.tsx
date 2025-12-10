/**
 * Example: useStateX.cjs - Extracts declarative state projections
 *
 * Features:
 * - targets: object with CSS selectors as keys
 * - transform: v => expression (template, ternary, method call, property access)
 * - transformId: string reference to registered transform
 * - applyAs: 'textContent' (default), 'attribute', 'class'
 * - applyIf: ctx => condition (show transform only when true)
 * - property: attribute name when applyAs='attribute'
 * - template: string template when transformType='template'
 * - sync: 'immediate' (default), 'batch', 'debounce'
 *
 * C# Output:
 * - [StateXTransform(selector, transformCode, applyAs, property)]
 * - StateXProjection objects in component metadata
 */
import { useState, useStateX } from '@minimact/core';

export function UseStateXExample() {
  // Basic useStateX with targets object
  const [price, setPrice] = useStateX(99.99, {
    targets: {
      // 1. Template literal transform → $"${v.ToString("F2")}"
      '.price-display': {
        transform: v => `$${v.toFixed(2)}`
      },
      // 2. Ternary transform → v > 100 ? "expensive" : "cheap"
      '.price-label': {
        transform: v => v > 100 ? 'Expensive' : 'Affordable'
      },
      // 3. Method call transform → v.ToString()
      '.price-raw': {
        transform: v => v.toString()
      },
      // 4. applyIf condition → only apply when condition is true
      '.price-highlight': {
        transform: () => 'on-sale',
        applyAs: 'class',
        applyIf: ctx => ctx.user.canSeePrice
      }
    }
  });

  // useStateX with property access transform
  const [user, setUser] = useStateX({ firstName: 'John', lastName: 'Doe', score: 100 }, {
    targets: {
      // 5. Property access → v.FirstName
      '.user-name': {
        transform: v => v.firstName
      },
      // 6. applyAs: 'attribute' with property
      '.user-avatar': {
        transform: v => `https://avatar.example.com/${v.firstName}`,
        applyAs: 'attribute',
        property: 'src'
      },
      // 7. applyAs: 'class' with conditional
      '.user-badge': {
        transform: () => 'high-score',
        applyAs: 'class',
        applyIf: v => v.score > 50
      }
    }
  });

  // useStateX with transformId (registered transform)
  const [count, setCount] = useStateX(0, {
    targets: {
      // 8. transformId → lookup in transform registry
      '.counter': {
        transformId: 'formatNumber'
      }
    }
  });

  // useStateX with sync strategy
  const [searchQuery, setSearchQuery] = useStateX('', {
    targets: {
      '.search-display': {
        transform: v => v.toUpperCase()
      }
    },
    // 9. sync strategy → controls when DOM updates happen
    sync: 'debounce' // or 'immediate', 'batch'
  });

  return (
    <div>
      <span className="price-display"></span>
      <span className="price-label"></span>
      <span className="price-raw"></span>
      <span className="price-highlight"></span>
      <span className="user-name"></span>
      <img className="user-avatar" />
      <span className="user-badge"></span>
      <span className="counter"></span>
      <span className="search-display"></span>
      <button onClick={() => setPrice(price + 10)}>Increase Price</button>
      <input onInput={(e) => setSearchQuery(e.target.value)} />
    </div>
  );
}
