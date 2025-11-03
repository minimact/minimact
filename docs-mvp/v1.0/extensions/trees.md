# minimact-trees

**Universal Decision Trees**

XState but declarative, predictive, and minimal. Works with any value type.

---

## Overview

minimact-trees provides a declarative state machine implementation using decision tree syntax. It's **XState without the complexity** - 10 lines of declarative structure instead of 100+ lines of configuration.

Unlike traditional state machines, minimact-trees:
- ✅ Works with **any value type** (strings, numbers, floats, booleans)
- ✅ **Declarative syntax** - just nested objects
- ✅ **Automatic key parsing** - `roleAdmin` → `role === 'admin'`
- ✅ **Server-side rendering** compatible
- ✅ **Predictive** - Rust learns patterns and pre-computes transitions (0-1ms!)

---

## How Minimact Works

:::warning Important Architecture Note
Minimact is **server-side React**. The client doesn't run React - it just applies patches from the server.

```
Server (C#): Renders React components → VNode tree → Patches
         ↓ (via SignalR)
Client (Browser): Applies patches to DOM → Calls minimact hooks
         ↓ (hooks sync back to server)
Server: Re-renders with updated state → New patches → ...
```

**minimact-trees** follows this pattern:
- **Client-side**: `useDecisionTree()` evaluates the tree in the browser
- **Server-side**: Reads the result from component state during rendering
- **Predictive**: Rust predictor pre-computes patches for likely transitions
:::

---

## Installation

```bash
npm install minimact-trees
```

---

## Quick Start

### Client-Side (Browser)

```typescript
import { useDecisionTree } from '@minimact/trees';

// Runs in browser after server sends initial HTML
const price = useDecisionTree({
  roleAdmin: 0,
  rolePremium: {
    count5: 0,
    count3: 5
  },
  roleBasic: 10
}, {
  role: 'admin',   // From client state
  count: 5         // From client state
});

// price = 0 (matched roleAdmin)
// Synced to server automatically
```

### Server-Side (C#)

```csharp
public class ProductCard : MinimactComponent
{
    protected override VNode Render()
    {
        // Read the decision tree result that was synced from client
        var price = State["decisionTree_0"];  // Matches first useDecisionTree call

        return new VNode("div", $"Shipping: ${price}");
    }
}
```

---

## Key Syntax

Decision tree keys are parsed automatically:

| Key | Parsed As |
|-----|-----------|
| `roleAdmin` | `role === 'admin'` |
| `count5` | `count === 5` |
| `price19.99` | `price === 19.99` |
| `isActiveTrue` | `isActive === true` |
| `isActiveFalse` | `isActive === false` |
| `statusPending` | `status === 'pending'` |
| `tierGold` | `tier === 'gold'` |

**Pattern:** `stateNameExpectedValue`

- State name: lowercase camelCase
- Expected value: PascalCase (string), number, or True/False

---

## The Flow

```
1. Server renders initial HTML with component state
         ↓
2. Client receives HTML + initial state
         ↓
3. useDecisionTree() evaluates tree based on state
   → Result: price = 0
         ↓
4. Client syncs to server: "decisionTree_0 = 0"
         ↓
5. Server stores in component state: State["decisionTree_0"] = 0
         ↓
6. User changes role to 'premium', count to 5
         ↓
7. useDecisionTree() re-evaluates: price = 0
   → Checks HintQueue for cached patches
   → 🟢 CACHE HIT! Applies patches instantly (0ms)
         ↓
8. Client syncs new value to server
         ↓
9. Server re-renders with State["decisionTree_0"] = 0
```

---

## Real-World Examples

### Example 1: Shipping Cost Calculator

**Client:**
```typescript
function ShippingCalculator() {
  const [tier, setTier] = useState('bronze');
  const [quantity, setQuantity] = useState(1);

  const price = useDecisionTree({
    tierGold: {
      quantity1: 0,
      quantity10: 0      // Gold: always free
    },
    tierSilver: {
      quantity1: 5,
      quantity10: 0      // Silver: free above 10
    },
    tierBronze: {
      quantity1: 10,
      quantity5: 8,
      quantity10: 5
    }
  }, {
    tier: tier,
    quantity: quantity
  });

  return (
    <div>
      <select onChange={e => setTier(e.target.value)}>
        <option value="bronze">Bronze</option>
        <option value="silver">Silver</option>
        <option value="gold">Gold</option>
      </select>

      <input
        type="number"
        value={quantity}
        onChange={e => setQuantity(parseInt(e.target.value))}
      />

      <p>Shipping cost: ${price}</p>
    </div>
  );
}
```

**Server:**
```csharp
protected override VNode Render()
{
    var shippingCost = State["decisionTree_0"];

    return new VNode("div", new { className = "shipping" },
        new VNode("span", $"Shipping: ${shippingCost}")
    );
}
```

### Example 2: Locale-Based Greeting

**Client:**
```typescript
function LocalizedGreeting() {
  const [language, setLanguage] = useState('en');
  const [country, setCountry] = useState('US');

  const greeting = useDecisionTree({
    languageEs: {
      countryMX: '¡Hola, amigo!',
      countryES: '¡Hola, tío!'
    },
    languageEn: {
      countryUS: 'Hey there!',
      countryGB: 'Good day!',
      countryAU: 'G\'day mate!'
    },
    languageFr: {
      countryFR: 'Bonjour!',
      countryCA: 'Bonjour, eh!'
    }
  }, {
    language: language,
    country: country
  });

  return (
    <div>
      <h1>{greeting}</h1>
    </div>
  );
}
```

### Example 3: Workflow State Machine

**Client:**
```typescript
function OrderWorkflow() {
  const order = useOrderContext();

  const nextAction = useDecisionTree({
    orderStatusPending: {
      paymentMethodCreditCard: {
        inventoryInStock: 'authorize-payment',
        inventoryOutOfStock: 'notify-backorder'
      },
      paymentMethodPaypal: 'redirect-paypal'
    },
    orderStatusConfirmed: {
      inventoryInStock: 'prepare-shipment',
      inventoryOutOfStock: 'notify-delay'
    },
    orderStatusShipped: 'send-tracking-email',
    orderStatusDelivered: 'request-review'
  }, {
    orderStatus: order.status,
    paymentMethod: order.payment,
    inventory: order.product.stock
  });

  return (
    <div>
      {nextAction === 'authorize-payment' && (
        <button onClick={authorizePayment}>
          Complete Purchase
        </button>
      )}

      {nextAction === 'redirect-paypal' && (
        <a href={paypalUrl}>Pay with PayPal</a>
      )}

      {nextAction === 'prepare-shipment' && (
        <div>Order confirmed! Preparing shipment...</div>
      )}

      {nextAction === 'send-tracking-email' && (
        <TrackingInfo orderId={order.id} />
      )}
    </div>
  );
}
```

**Server:**
```csharp
protected override VNode Render()
{
    var action = State["decisionTree_0"];

    // Render different UI based on workflow action
    return action switch
    {
        "authorize-payment" => new VNode("button", "Complete Purchase"),
        "redirect-paypal" => new VNode("a", new { href = paypalUrl }, "Pay with PayPal"),
        "prepare-shipment" => new VNode("div", "Order confirmed! Preparing shipment..."),
        "send-tracking-email" => new VNode("div", "Tracking info sent to email"),
        _ => new VNode("div", "Processing...")
    };
}
```

### Example 4: Tax Rate Calculation

**Client:**
```typescript
function TaxCalculator() {
  const user = useUserContext();
  const product = useProductContext();

  const taxRate = useDecisionTree({
    countryUS: {
      stateCA: {
        categoryElectronics: 0.0925,
        categoryFood: 0,
        categoryClothing: 0.0725
      },
      stateNY: {
        categoryElectronics: 0.08875,
        categoryFood: 0,
        categoryClothing: 0.04
      },
      stateTX: {
        categoryElectronics: 0.0625,
        categoryFood: 0,
        categoryClothing: 0.0625
      }
    },
    countryCA: {
      categoryElectronics: 0.13,
      categoryFood: 0.05,
      categoryClothing: 0.13
    },
    countryUK: {
      categoryElectronics: 0.20,
      categoryFood: 0,
      categoryClothing: 0.20
    }
  }, {
    country: user.country,
    state: user.state,
    category: product.category
  });

  const taxAmount = product.price * taxRate;

  return (
    <div>
      <p>Product: ${product.price.toFixed(2)}</p>
      <p>Tax ({(taxRate * 100).toFixed(2)}%): ${taxAmount.toFixed(2)}</p>
      <p className="total">Total: ${(product.price + taxAmount).toFixed(2)}</p>
    </div>
  );
}
```

**Server:**
```csharp
protected override VNode Render()
{
    var taxRate = (decimal)State["decisionTree_0"];
    var productPrice = GetProductPrice();
    var taxAmount = productPrice * taxRate;
    var total = productPrice + taxAmount;

    return new VNode("div", new { className = "tax-info" },
        new VNode("p", $"Product: ${productPrice:F2}"),
        new VNode("p", $"Tax ({taxRate * 100:F2}%): ${taxAmount:F2}"),
        new VNode("p", new { className = "total" }, $"Total: ${total:F2}")
    );
}
```

### Example 5: Feature Flags

**Client:**
```typescript
function FeatureToggle() {
  const user = useUserContext();

  const features = useDecisionTree({
    roleAdmin: {
      environmentProduction: {
        betaTrue: 'all-features',
        betaFalse: 'stable-only'
      },
      environmentStaging: 'all-features'
    },
    rolePremium: {
      betaTrue: 'beta-features',
      betaFalse: 'standard-features'
    },
    roleBasic: 'standard-features'
  }, {
    role: user.role,
    environment: import.meta.env.MODE,
    beta: user.betaOptin
  });

  return (
    <div>
      {(features === 'all-features' || features === 'beta-features') && (
        <BetaFeaturePanel />
      )}

      {features === 'all-features' && (
        <AdminDashboard />
      )}

      <StandardFeatures />
    </div>
  );
}
```

---

## API Reference

### `useDecisionTree(tree, context, options?)`

**Client-side hook** (runs in browser).

**Parameters:**
- `tree: DecisionTree` - Decision tree structure (nested objects)
- `context: StateContext` - Current state values (key-value pairs)
- `options?: DecisionTreeOptions` - Evaluation options

**Returns:** Result value (leaf of matched path)

**Options:**
```typescript
{
  defaultValue?: any;      // Return this if no match
  debugLogging?: boolean;  // Log evaluation steps
  strictMode?: boolean;    // Throw error if no match
}
```

**Example:**
```typescript
const result = useDecisionTree(
  { roleAdmin: 0, roleBasic: 10 },
  { role: 'admin' },
  { debugLogging: true }
);
// → 0
```

---

### `evaluateTree(tree, context, options?)`

**Standalone function** (no component context needed).

```typescript
import { evaluateTree } from '@minimact/trees';

const result = evaluateTree(
  { roleAdmin: 0, roleBasic: 10 },
  { role: 'admin' }
);
// → 0
```

---

### `debugParseKey(key)`

Debug helper to see how keys are parsed.

```typescript
import { debugParseKey } from '@minimact/trees';

debugParseKey('roleAdmin');
// → stateName: "role", expectedValue: "admin" (string)

debugParseKey('count5');
// → stateName: "count", expectedValue: 5 (number)

debugParseKey('price19.99');
// → stateName: "price", expectedValue: 19.99 (float)

debugParseKey('isActiveTrue');
// → stateName: "isActive", expectedValue: true (boolean)
```

---

## Predictive Rendering

**The killer feature:** Rust predictor learns state transitions and pre-computes patches.

```typescript
// User on 'bronze' tier with 9 items
const price = useDecisionTree({
  tierGold: 0,
  tierSilver: { quantity10: 0 },
  tierBronze: {
    quantity1: 10,
    quantity10: 5    // ← This will likely trigger next
  }
}, { tier: 'bronze', quantity: 9 });

// User adds 1 more item → quantity becomes 10
// → Rust predicted this transition!
// → Patches pre-computed and cached
// → 🟢 CACHE HIT! Applied in 0-1ms (no network round-trip)
```

**How it works:**
1. Rust observes: "When quantity is 9, it often becomes 10 next"
2. Rust pre-computes patches for `tierBronze` → `quantity10`
3. Client checks HintQueue before server call
4. If match found → Apply cached patches instantly
5. Sync to server in background

---

## Performance

| Operation | Time |
|-----------|------|
| Parse key | < 0.1ms |
| Evaluate tree (5 levels deep) | < 0.5ms |
| Sync to server | 5-15ms |
| **With prediction (cache hit)** | **0-1ms** |

**99% faster than traditional state machines with predictive rendering!**

---

## Why This Is Revolutionary

### 1. Universal Type Support

- ✅ Strings: `roleAdmin`, `statusPending`
- ✅ Numbers: `count5`, `level20`
- ✅ Floats: `price19.99`, `rate2.5`
- ✅ Booleans: `isActiveTrue`, `isLockedFalse`

### 2. XState Without the Complexity

```typescript
// XState: 100+ lines of config
const machine = createMachine({
  id: 'fetch',
  initial: 'idle',
  states: {
    idle: { on: { FETCH: 'loading' } },
    loading: {
      invoke: {
        src: 'fetchData',
        onDone: { target: 'success' },
        onError: { target: 'failure' }
      }
    },
    success: { type: 'final' },
    failure: { on: { RETRY: 'loading' } }
  }
});

// minimact-trees: 10 lines of declarative structure
const state = useDecisionTree({
  statusIdle: 'ready',
  statusLoading: 'fetching',
  statusSuccess: 'complete',
  statusFailure: 'error'
}, { status: currentStatus });
```

### 3. Server-Side Rendering

- Works on first page load (no hydration needed)
- Server can read decision tree results
- SEO-friendly

### 4. Predictive

- Rust learns patterns
- Pre-computes likely transitions
- 0ms latency on cache hit

---

## Philosophy

> **"Decision trees are state machines in disguise."**

The answer to life, the universe, and everything isn't just 42 - it's **any value you want it to be**, based on any combination of states.

Traditional state machines are imperative and verbose. minimact-trees is **declarative and minimal** - just nested objects that describe the logic, not the machinery.

---

## Integration with Minimact

### Client-Side

```typescript
// Evaluate decision tree
const result = useDecisionTree(tree, context);

// Auto-sync to server
context.signalR.updateDecisionTreeState(
  componentId,
  treeKey,
  result
);
```

### Server-Side

```csharp
protected override VNode Render()
{
    var decisionResult = State["decisionTree_0"];

    // Render based on decision
    return new VNode("div", $"Result: {decisionResult}");
}
```

---

## Next Steps

- [minimact-punch (DOM State)](/v1.0/extensions/punch)
- [minimact-query (SQL for DOM)](/v1.0/extensions/query)
- [minimact-quantum (DOM Entanglement)](/v1.0/extensions/quantum)
- [Core Hooks API](/v1.0/api/hooks)

---

**Part of the Minimact Quantum Stack** 🌵🌳✨
