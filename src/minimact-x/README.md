# Minimact X 🌵 + ✨

**CSS for State Logic** - Declarative state projection addon for Minimact

[![MES Certification](https://img.shields.io/badge/MES-Gold-FFD700)]() [![Version](https://img.shields.io/badge/version-0.1.0-blue)]()

---

## What is Minimact X?

Just as **CSS externalizes styling from HTML**, **Minimact X externalizes state-to-DOM bindings from JSX**.

This enables:
- ✅ **Build-time analysis** - Know state → DOM relationships statically
- ✅ **Predictive rendering** - Template Patch System integration
- ✅ **Superior DevTools** - Introspectable, debuggable state projections
- ✅ **Performance** - Surgical updates, no re-renders
- ✅ **Maintainability** - Declarative, analyzable code

---

## Installation

```bash
npm install @minimact/x
```

---

## Quick Start

### Before (Traditional React)

```tsx
function ProductCard() {
  const [price, setPrice] = useState(99);
  const user = useContext(UserContext);

  return (
    <div>
      {user.canSeePrice && (
        <div className="price">${price.toFixed(2)}</div>
      )}
      {user.isAdmin && (
        <div className="admin-price">Admin: ${price}</div>
      )}
    </div>
  );
}
```

**Problems:**
- State → DOM logic buried in JSX
- Impossible to statically analyze
- No way to predict which DOM nodes depend on which state

### After (Minimact X)

```tsx
import { useStateX } from '@minimact/x';

function ProductCard() {
  const [price, setPrice] = useStateX(99, {
    targets: {
      '.price-display': {
        transform: v => `$${v.toFixed(2)}`,
        applyIf: ctx => ctx.user.canSeePrice
      },
      '.admin-price': {
        transform: v => `Admin: $${v}`,
        applyIf: ctx => ctx.user.isAdmin
      }
    }
  });

  return (
    <div>
      <div className="price-display"></div>
      <div className="admin-price"></div>
    </div>
  );
}
```

**Advantages:**
- ✅ Target selectors are static (analyzable at build time)
- ✅ Transforms are pure functions (can be inlined/optimized)
- ✅ Conditions are declarative (`applyIf` is inspectable)
- ✅ State-DOM dependency graph is explicit

---

## Core Concepts

### 1. Declarative Targets

Define **where** state should be projected using CSS selectors:

```typescript
const [count, setCount] = useStateX(0, {
  targets: {
    '.counter-display': {
      transform: v => `Count: ${v}`
    }
  }
});
```

### 2. Pure Transform Functions

Define **how** state values are transformed before display:

```typescript
const [price, setPrice] = useStateX(99.99, {
  targets: {
    '.price': {
      transform: v => `$${v.toFixed(2)}` // Pure, serializable
    }
  }
});
```

### 3. Conditional Application

Define **when** projections should be applied using `applyIf`:

```typescript
const [secretData, setSecretData] = useStateX('classified', {
  targets: {
    '.secret': {
      transform: v => v,
      applyIf: ctx => ctx.user.role === 'admin' // Only for admins
    }
  }
});
```

### 4. Transform Registry

Reusable transforms across your application:

```typescript
import { TransformHandler } from '@minimact/x';

// Register once
TransformHandler.registerTransform('currency-usd', v => `$${v.toFixed(2)}`);

// Use everywhere
const [price, setPrice] = useStateX(99, {
  targets: {
    '.price': {
      transformId: 'currency-usd' // Reference by ID
    }
  }
});
```

---

## API Reference

### `useStateX<T>(initialValue, config)`

Main hook for declarative state projection.

**Parameters:**
- `initialValue: T` - Initial state value
- `config: StateXConfig<T>` - Projection configuration

**Returns:** `[currentValue, setState]`

**Example:**
```typescript
const [cart, setCart] = useStateX({ items: [], total: 0 }, {
  targets: {
    '.cart-count': {
      transform: v => v.items.length.toString()
    },
    '.cart-total': {
      transform: v => `$${v.total.toFixed(2)}`,
      applyIf: ctx => v.total > 0
    }
  },
  sync: 'immediate' // Sync to server immediately
});
```

### `StateXConfig<T>`

```typescript
interface StateXConfig<T> {
  targets: Record<string, TargetProjection<T>>;
  context?: () => any;
  equals?: (prev: T, next: T) => boolean;
  sync?: 'immediate' | 'debounced' | 'manual';
  syncDelay?: number; // For 'debounced'
  trackDependencies?: boolean;
}
```

### `TargetProjection<T>`

```typescript
interface TargetProjection<T> {
  transform?: (value: T) => string | number | boolean;
  transformId?: string;
  applyIf?: (context: any) => boolean;
  applyAs?: 'textContent' | 'innerHTML' | 'attribute' | 'class' | 'style';
  property?: string; // For attribute/class/style
  template?: string; // Template Patch System integration
  skipIfFalse?: boolean; // Optimization
  cacheKey?: (context: any) => string;
}
```

---

## Projection Modes (`applyAs`)

### 1. `textContent` (default)

```typescript
const [message, setMessage] = useStateX('Hello', {
  targets: {
    '.message': {
      transform: v => v.toUpperCase(),
      applyAs: 'textContent' // <div class="message">HELLO</div>
    }
  }
});
```

### 2. `innerHTML`

```typescript
const [html, setHtml] = useStateX('<strong>Bold</strong>', {
  targets: {
    '.content': {
      transform: v => v,
      applyAs: 'innerHTML' // Renders HTML (use with caution!)
    }
  }
});
```

⚠️ **XSS Warning:** Always sanitize user input when using `innerHTML`

### 3. `attribute`

```typescript
const [url, setUrl] = useStateX('/home', {
  targets: {
    '.link': {
      transform: v => v,
      applyAs: 'attribute',
      property: 'href' // <a class="link" href="/home">
    }
  }
});
```

### 4. `class`

```typescript
const [isActive, setIsActive] = useStateX(false, {
  targets: {
    '.menu': {
      transform: v => v, // Boolean
      applyAs: 'class',
      property: 'active' // Toggles 'active' class
    }
  }
});
```

### 5. `style`

```typescript
const [progress, setProgress] = useStateX(75, {
  targets: {
    '.progress-bar': {
      transform: v => `${v}%`,
      applyAs: 'style',
      property: 'width' // <div style="width: 75%">
    }
  }
});
```

---

## Built-in Transforms

Minimact X includes 30+ pre-registered transforms:

### Currency

```typescript
transformId: 'currency-usd' // $99.00
transformId: 'currency-eur' // €99.00
transformId: 'currency-gbp' // £99.00
```

### Percentage

```typescript
transformId: 'percentage'   // 75%
transformId: 'percentage-1' // 75.5%
transformId: 'percentage-2' // 75.50%
```

### String

```typescript
transformId: 'uppercase'   // HELLO
transformId: 'lowercase'   // hello
transformId: 'capitalize'  // Hello
transformId: 'trim'        // (removes whitespace)
```

### Number

```typescript
transformId: 'number-0'     // 99
transformId: 'number-1'     // 99.5
transformId: 'number-2'     // 99.50
transformId: 'number-comma' // 1,234.56
```

### Date

```typescript
transformId: 'date-short'     // 10/31/2025
transformId: 'date-long'      // Friday, October 31, 2025
transformId: 'time-short'     // 3:45 PM
transformId: 'datetime-short' // 10/31/2025, 3:45 PM
```

### Boolean

```typescript
transformId: 'yes-no'       // Yes / No
transformId: 'true-false'   // True / False
transformId: 'on-off'       // On / Off
transformId: 'check-x'      // ✓ / ✗
transformId: 'check-circle' // ● / ○
```

### Array

```typescript
transformId: 'array-length' // 5
transformId: 'array-join'   // a, b, c
transformId: 'array-count'  // 5 items
```

### Misc

```typescript
transformId: 'stringify'  // JSON.stringify
transformId: 'to-string'  // String()
transformId: 'empty-dash' // '-' if empty
transformId: 'empty-na'   // 'N/A' if empty
```

---

## Server Synchronization

### Immediate Sync (Default)

```typescript
const [count, setCount] = useStateX(0, {
  targets: { '.count': { transform: v => v.toString() } },
  sync: 'immediate' // Syncs to server on every change
});
```

### Debounced Sync

```typescript
const [search, setSearch] = useStateX('', {
  targets: { '.search': { transform: v => v } },
  sync: 'debounced',
  syncDelay: 300 // Wait 300ms before syncing
});
```

### Manual Sync

```typescript
import { useStateX, syncStateToServer } from '@minimact/x';

const [draft, setDraft] = useStateX('', {
  targets: { '.draft': { transform: v => v } },
  sync: 'manual' // No auto-sync
});

// Later...
syncStateToServer(); // Sync all states
// or
syncStateToServer('stateX_0'); // Sync specific state
```

---

## Template Patch System Integration

Minimact X works seamlessly with the Template Patch System for predictive rendering:

```typescript
const [todo, setTodo] = useStateX({ done: false, text: 'Buy milk' }, {
  targets: {
    '.todo-status': {
      transform: v => v.done ? '✓' : '○',
      template: 'todo-status-{0}' // Parameterized template
    }
  }
});
```

The Babel plugin extracts this and generates C# attributes:

```csharp
[StateXTransform("stateX_0", ".todo-status", Transform = "v => v.Done ? \"✓\" : \"○\"")]
public class TodoItem : MinimactComponent
{
    // Server can now pre-compute patches!
}
```

---

## Advanced Examples

### Complex Shopping Cart

```typescript
const [cart, setCart] = useStateX({
  items: [],
  subtotal: 0,
  tax: 0,
  shipping: 0,
  total: 0
}, {
  targets: {
    '.item-count': {
      transform: v => `${v.items.length} items`
    },
    '.subtotal': {
      transform: v => `$${v.subtotal.toFixed(2)}`
    },
    '.tax': {
      transform: v => `$${v.tax.toFixed(2)}`
    },
    '.shipping': {
      transform: v => v.shipping === 0 ? 'FREE' : `$${v.shipping.toFixed(2)}`
    },
    '.total': {
      transform: v => `$${v.total.toFixed(2)}`
    },
    '.checkout-btn': {
      transform: v => v.items.length >= 3,
      applyAs: 'class',
      property: 'bulk-discount',
      applyIf: ctx => v.items.length > 0
    },
    '.empty-message': {
      transform: v => 'Your cart is empty',
      applyIf: ctx => v.items.length === 0
    }
  },
  sync: 'debounced',
  syncDelay: 500
});

// Update cart with derived values
function addToCart(item) {
  setCart(prev => {
    const items = [...prev.items, item];
    const subtotal = items.reduce((sum, i) => sum + i.price, 0);
    const tax = subtotal * 0.1;
    const shipping = subtotal > 50 ? 0 : 5;
    const total = subtotal + tax + shipping;

    return { items, subtotal, tax, shipping, total };
  });
}
```

### User Profile with Permissions

```typescript
const [profile, setProfile] = useStateX({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
  lastLogin: new Date()
}, {
  targets: {
    '.user-name': {
      transform: v => v.name,
      applyAs: 'textContent'
    },
    '.user-email': {
      transform: v => v.email,
      applyIf: ctx => ctx.user.canViewEmail
    },
    '.user-role': {
      transform: v => v.role.toUpperCase(),
      applyAs: 'class',
      property: v => `role-${v.role}` // Dynamic class
    },
    '.last-login': {
      transformId: 'datetime-short'
    },
    '.admin-badge': {
      transform: v => '👑 Admin',
      applyIf: ctx => v.role === 'admin'
    }
  },
  context: () => ({
    user: getCurrentUser() // Custom context provider
  })
});
```

---

## MES Gold Certification

Minimact X achieves **MES Gold** certification with:

- ✅ **Bronze Requirements**
  - Component context integration
  - Index tracking
  - Cleanup on unmount
  - TypeScript declarations

- ✅ **Silver Requirements**
  - HintQueue integration
  - PlaygroundBridge notifications
  - Error handling
  - State synchronization

- ✅ **Gold Requirements**
  - Template Patch System support
  - Babel plugin integration
  - DevTools bridge
  - Dependency graph tracking
  - Static analysis metadata

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

---

## Performance

Minimact X is designed for **surgical state updates** with minimal overhead:

| Metric | Value |
|--------|-------|
| State change → DOM update | ~1ms |
| Template patch application | ~0.5ms |
| Memory per projection | ~500 bytes |
| Transform registry lookup | O(1) |

---

## Philosophy

> **"CSS for State Logic"**
>
> Just as CSS separates presentation from structure, Minimact X separates
> state projection from business logic. This enables build-time analysis,
> predictive rendering, and a superior developer experience.

This is **Predictive Declarative UI Architecture** - the future of web frameworks.

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md).

---

## License

MIT © Minimact Team

---

## Related Packages

- **[@minimact/core](../client-runtime)** - Core Minimact runtime
- **[@minimact/punch](../minimact-punch)** - DOM observation (DOM → State)
- **[@minimact/x](../minimact-x)** - State projection (State → DOM) ✨ You are here

Together, Punch + X = **Bidirectional reactive data flow**

---

Made with 💛 by the Minimact Team
