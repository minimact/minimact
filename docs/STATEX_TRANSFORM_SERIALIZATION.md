# useStateX Transform Function Serialization

**The Challenge:** How do we send client-side JavaScript transform functions to the server for pre-computation?

```typescript
// Client-side transform function
transform: v => `$${v.toFixed(2)}`

// Server needs to execute this in C# to pre-compute patches
// But functions aren't serializable! 🔴
```

---

## The Problem

### Why This Matters

For the Template Patch System to work optimally, the **server needs to know transform logic** so it can:

1. **Pre-compute transformed patches** - Generate patches with final values
2. **Build accurate VNode trees** - Render with transformed values
3. **Enable predictive rendering** - Predict state changes with transformed output
4. **Optimize template slots** - Fill slots with pre-transformed values

### The Naive Approach (Doesn't Work)

```typescript
// ❌ Can't serialize functions over the wire
JSON.stringify({ transform: v => v.toFixed(2) })
// Result: { transform: undefined }

// ❌ Can't eval() on server (security nightmare)
const fnString = "v => v.toFixed(2)";
// Server: eval(fnString) // 🚨 NEVER DO THIS
```

---

## Solution 1: Babel Static Analysis (RECOMMENDED)

### Overview

**Extract transform functions at build time** using the Babel plugin, then generate C# equivalents.

### How It Works

```typescript
// 1. Developer writes client code
const [price, setPrice] = useStateX(99, {
  targets: {
    '.price': {
      transform: v => `$${v.toFixed(2)}`
    }
  }
});
```

```javascript
// 2. Babel plugin analyzes the AST
function analyzeStateX(path) {
  const configArg = path.node.arguments[1]; // Config object
  const targets = configArg.properties.find(p => p.key.name === 'targets');

  targets.value.properties.forEach(target => {
    const transformProp = target.value.properties.find(p => p.key.name === 'transform');

    if (transformProp && t.isArrowFunctionExpression(transformProp.value)) {
      // Extract the transform function AST
      const transformAST = transformProp.value;

      // Analyze the function body
      const analysis = analyzeTransformFunction(transformAST);

      // Generate C# equivalent
      const csharpCode = generateCSharpTransform(analysis);

      // Emit as metadata
      emitTransformMetadata(target.key.value, csharpCode, analysis);
    }
  });
}
```

```javascript
// 3. Babel generates metadata
function analyzeTransformFunction(arrowFn) {
  const param = arrowFn.params[0].name; // 'v'
  const body = arrowFn.body; // TemplateLiteral or Expression

  if (t.isTemplateLiteral(body)) {
    // Template string: `$${v.toFixed(2)}`
    return {
      type: 'template',
      parts: body.quasis.map(q => q.value.raw), // ['$', '']
      expressions: body.expressions.map(expr => {
        // v.toFixed(2)
        if (t.isCallExpression(expr)) {
          return {
            type: 'method-call',
            object: expr.callee.object.name, // 'v'
            method: expr.callee.property.name, // 'toFixed'
            args: expr.arguments.map(arg => arg.value) // [2]
          };
        }
      })
    };
  }

  // Handle other expression types...
}
```

```javascript
// 4. Generate C# code
function generateCSharpTransform(analysis) {
  if (analysis.type === 'template') {
    const parts = analysis.parts;
    const exprs = analysis.expressions;

    // Build C# string interpolation
    let csharp = 'v => $"';

    for (let i = 0; i < parts.length; i++) {
      csharp += parts[i];

      if (i < exprs.length) {
        const expr = exprs[i];

        if (expr.type === 'method-call') {
          // Map JS methods to C# equivalents
          const csharpMethod = mapJSToCSharp(expr.method, expr.args);
          csharp += `{${expr.object}.${csharpMethod}}`;
        }
      }
    }

    csharp += '"';
    return csharp;
  }
}

function mapJSToCSharp(jsMethod, args) {
  const mappings = {
    'toFixed': `ToString("F${args[0]}")`,
    'toUpperCase': 'ToUpper()',
    'toLowerCase': 'ToLower()',
    'toString': 'ToString()',
    'length': 'Length'
  };

  return mappings[jsMethod] || jsMethod;
}

// Result: 'v => $"${v.ToString("F2")}"'
```

```csharp
// 5. Emit C# attribute on component class
[StateXTransform(
  stateKey: "state_0",
  selector: ".price",
  transform: "v => $\"${v.ToString(\"F2\")}\"",
  applyAs: "textContent"
)]
public class ProductCard : MinimactComponent
{
    protected override VNode Render()
    {
        // Server can now apply transform at render time
    }
}
```

```csharp
// 6. Server uses reflection to read attribute
public class MinimactComponent
{
    public string ApplyTransform(string stateKey, string selector, object value)
    {
        var attr = this.GetType()
            .GetCustomAttributes<StateXTransformAttribute>()
            .FirstOrDefault(a => a.StateKey == stateKey && a.Selector == selector);

        if (attr != null)
        {
            // Compile and execute the C# transform
            var transform = CSharpScript.Evaluate<Func<object, string>>(attr.Transform);
            return transform(value);
        }

        return value.ToString();
    }
}
```

### Advantages

- ✅ **Build-time extraction** - No runtime overhead
- ✅ **Type-safe** - Babel validates transform logic
- ✅ **Security** - No eval(), no arbitrary code execution
- ✅ **Performance** - Compiled C# code, not interpreted
- ✅ **Compatibility** - Maps JS → C# automatically

### Limitations

- ⚠️ **Only works with pure, analyzable functions**
- ⚠️ **Can't handle closures or external variables**
- ⚠️ **Complex logic may not map to C#**

### Supported Transform Patterns

```typescript
// ✅ SUPPORTED - Simple templates
transform: v => `$${v.toFixed(2)}`
// → v => $"${v.ToString("F2")}"

// ✅ SUPPORTED - String methods
transform: v => v.toUpperCase()
// → v => v.ToUpper()

// ✅ SUPPORTED - Ternaries
transform: v => v > 10 ? 'High' : 'Low'
// → v => v > 10 ? "High" : "Low"

// ✅ SUPPORTED - Property access
transform: v => v.firstName
// → v => v.FirstName

// ✅ SUPPORTED - Array length
transform: v => v.length.toString()
// → v => v.Length.ToString()

// ✅ SUPPORTED - Conditional with method calls
transform: v => v.done ? '✓' : v.text.toUpperCase()
// → v => v.Done ? "✓" : v.Text.ToUpper()

// ❌ NOT SUPPORTED - Closures
const currency = '$';
transform: v => `${currency}${v}` // References external variable
// → Can't serialize

// ❌ NOT SUPPORTED - Complex logic
transform: v => {
  const tax = v * 0.1;
  const total = v + tax;
  return `$${total.toFixed(2)}`;
}
// → Too complex for static analysis

// ⚠️ FALLBACK - Use Transform Templates (see below)
```

---

## Solution 2: Transform Templates (For Complex Logic)

### Overview

For complex transforms that can't be statically analyzed, use **parameterized templates** instead of inline transforms.

### How It Works

```typescript
// Instead of this (can't serialize):
const [cart, setCart] = useStateX({ items: [], subtotal: 0 }, {
  targets: {
    '.total': {
      transform: v => {
        const tax = v.subtotal * 0.1;
        const shipping = v.subtotal > 50 ? 0 : 5;
        const total = v.subtotal + tax + shipping;
        return `$${total.toFixed(2)}`;
      }
    }
  }
});

// Do this (server can pre-compute):
const [cart, setCart] = useStateX({ items: [], subtotal: 0, tax: 0, shipping: 0, total: 0 }, {
  targets: {
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
    }
  }
});

// Client-side: Compute derived values in setCart
function updateCart(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.1;
  const shipping = subtotal > 50 ? 0 : 5;
  const total = subtotal + tax + shipping;

  setCart({ items, subtotal, tax, shipping, total });
}
```

**Key insight:** Move complex logic into **state derivation** (client-side), keep transforms **simple and serializable**.

### Advantages

- ✅ **All transforms are simple** - Easy to analyze and serialize
- ✅ **Server can pre-compute** - All values already in state
- ✅ **Cleaner separation** - Business logic separate from presentation
- ✅ **Testable** - Derived state logic can be unit tested

### Server-Side Pre-Computation

```csharp
// Server can now render with accurate state
[StateXTransform("state_0", ".total", "v => $\"${v.Total.ToString(\"F2\")}\"")]
public class ShoppingCart : MinimactComponent
{
    [State] private CartState Cart { get; set; }

    protected override VNode Render()
    {
        // All values already computed in Cart state
        // Server just applies simple transforms
        return VNode.Create("div", new {
            children = new[] {
                VNode.Create("div", new {
                    @class = "total",
                    textContent = $"${Cart.Total.ToString("F2")}" // Pre-transformed!
                })
            }
        });
    }
}
```

---

## Solution 3: Transform Registry (Runtime Fallback)

### Overview

For transforms that **absolutely cannot be statically analyzed**, register them at runtime and use **template IDs** as references.

### How It Works

```typescript
// 1. Define reusable transforms
const transforms = {
  'currency-usd': v => `$${v.toFixed(2)}`,
  'percentage': v => `${(v * 100).toFixed(0)}%`,
  'uppercase': v => v.toUpperCase(),
  'date-short': v => new Date(v).toLocaleDateString()
};

// 2. Register transforms globally
StateX.registerTransforms(transforms);

// 3. Reference by ID in config
const [price, setPrice] = useStateX(99, {
  targets: {
    '.price': {
      transformId: 'currency-usd' // Reference, not inline function
    }
  }
});
```

```typescript
// 4. Babel emits transform ID
[StateXTransform(
  stateKey: "state_0",
  selector: ".price",
  transformId: "currency-usd" // Just the ID
)]
```

```csharp
// 5. Server has matching transform registry
public static class TransformRegistry
{
    private static readonly Dictionary<string, Func<object, string>> Transforms = new()
    {
        ["currency-usd"] = v => $"${((double)v).ToString("F2")}",
        ["percentage"] = v => $"{((double)v * 100).ToString("F0")}%",
        ["uppercase"] = v => v.ToString().ToUpper(),
        ["date-short"] = v => ((DateTime)v).ToShortDateString()
    };

    public static string ApplyTransform(string transformId, object value)
    {
        if (Transforms.TryGetValue(transformId, out var transform))
        {
            return transform(value);
        }

        return value.ToString();
    }
}
```

### Advantages

- ✅ **Works for any transform** - Even complex, non-serializable ones
- ✅ **Reusable** - Define once, use everywhere
- ✅ **Type-safe** - Both client and server have matching transforms
- ✅ **Maintainable** - Centralized transform logic

### Limitations

- ⚠️ **Manual synchronization** - Must keep client/server registries in sync
- ⚠️ **Not fully optimized** - Server can't inline transforms

---

## Solution 4: Hybrid Approach (BEST)

### Strategy

Combine all three approaches for maximum flexibility:

1. **Static Analysis (Primary)** - Babel extracts simple transforms → C# code
2. **Transform Templates (Secondary)** - Move complex logic to state derivation
3. **Transform Registry (Fallback)** - Shared client/server transforms for edge cases

### Decision Tree

```
Is the transform a pure, simple function?
├─ YES → Use Babel static analysis (Solution 1)
│         Examples: toFixed, toUpperCase, ternaries, property access
│
└─ NO → Is it complex business logic?
    ├─ YES → Use Transform Templates (Solution 2)
    │         Move logic to state derivation, keep transforms simple
    │
    └─ NO → Is it reusable across components?
        ├─ YES → Use Transform Registry (Solution 3)
        │         Register as shared transform with ID
        │
        └─ NO → ⚠️ Consider refactoring
                  This transform may be too complex
```

### Implementation

```typescript
// minimact-x/src/transform-handler.ts

export class TransformHandler {
  private static registry = new Map<string, (v: any) => any>();

  /**
   * Register reusable transforms
   */
  static registerTransform(id: string, fn: (v: any) => any) {
    this.registry.set(id, fn);
  }

  /**
   * Apply transform (with automatic fallback)
   */
  static applyTransform(
    config: TargetProjection<any>,
    value: any
  ): string {
    // 1. Check if transform ID is provided (Registry approach)
    if (config.transformId) {
      const fn = this.registry.get(config.transformId);
      if (fn) return fn(value);

      console.warn(`[useStateX] Transform '${config.transformId}' not found`);
    }

    // 2. Use inline transform (Static Analysis approach)
    if (config.transform) {
      return config.transform(value);
    }

    // 3. Fallback to toString
    return String(value);
  }
}
```

### Example Usage

```typescript
// Component using hybrid approach
const [product, setProduct] = useStateX({
  price: 99,
  discount: 0.1,
  createdAt: new Date()
}, {
  targets: {
    // ✅ Simple transform → Babel extracts
    '.price': {
      transform: v => `$${v.price.toFixed(2)}`
    },

    // ✅ Derived state → Template approach
    '.savings': {
      transform: v => `Save $${(v.price * v.discount).toFixed(2)}`
    },

    // ✅ Reusable transform → Registry approach
    '.created': {
      transformId: 'date-short'
    }
  }
});
```

---

## C# Server-Side Integration

### StateXTransformAttribute

```csharp
// Minimact.AspNetCore/Attributes/StateXTransformAttribute.cs

[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
public class StateXTransformAttribute : Attribute
{
    public string StateKey { get; }
    public string Selector { get; }

    /// <summary>
    /// C# lambda expression (generated by Babel)
    /// Example: "v => $\"{v.ToString(\"F2\")}\""
    /// </summary>
    public string? Transform { get; set; }

    /// <summary>
    /// Transform ID from registry
    /// Example: "currency-usd"
    /// </summary>
    public string? TransformId { get; set; }

    public string ApplyAs { get; set; } = "textContent";

    /// <summary>
    /// Conditional expression (if provided)
    /// Example: "ctx => ctx.User.CanSeePrice"
    /// </summary>
    public string? ApplyIf { get; set; }

    public StateXTransformAttribute(string stateKey, string selector)
    {
        StateKey = stateKey;
        Selector = selector;
    }
}
```

### Usage in Component

```csharp
[StateXTransform("state_0", ".price", Transform = "v => $\"${v.ToString(\"F2\")}\"")]
[StateXTransform("state_0", ".created", TransformId = "date-short")]
public class ProductCard : MinimactComponent
{
    [State] private decimal Price { get; set; } = 99;
    [State] private DateTime CreatedAt { get; set; } = DateTime.Now;

    protected override VNode Render()
    {
        // Apply transforms at render time
        var priceTransformed = ApplyTransform("state_0", ".price", Price);
        var createdTransformed = ApplyTransform("state_0", ".created", CreatedAt);

        return VNode.Create("div", new {
            children = new[] {
                VNode.Create("div", new {
                    @class = "price",
                    textContent = priceTransformed // "$99.00"
                }),
                VNode.Create("div", new {
                    @class = "created",
                    textContent = createdTransformed // "10/31/2025"
                })
            }
        });
    }
}
```

---

## Babel Plugin Implementation

```javascript
// packages/babel-plugin-minimact/src/transform-statex.js

function extractStateXTransforms(path, state) {
  const callExpr = path.node;

  // Ensure it's a useStateX call
  if (!t.isIdentifier(callExpr.callee, { name: 'useStateX' })) {
    return;
  }

  const [initialValue, config] = callExpr.arguments;

  if (!t.isObjectExpression(config)) {
    return;
  }

  // Find targets property
  const targetsprop = config.properties.find(
    p => t.isIdentifier(p.key, { name: 'targets' })
  );

  if (!targetsprop || !t.isObjectExpression(targetsprop.value)) {
    return;
  }

  // Process each target
  const stateKey = `state_${state.stateIndex++}`;
  const transforms = [];

  targetsP.value.properties.forEach(targetProp => {
    const selector = targetProp.key.value;
    const targetConfig = targetProp.value;

    let transformCode = null;
    let transformId = null;
    let applyAs = 'textContent';
    let applyIf = null;

    // Extract transform
    const transformProp = targetConfig.properties.find(
      p => t.isIdentifier(p.key, { name: 'transform' })
    );

    if (transformProp && t.isArrowFunctionExpression(transformProp.value)) {
      // Attempt static analysis
      transformCode = generateCSharpTransform(transformProp.value);
    }

    // Extract transformId
    const transformIdProp = targetConfig.properties.find(
      p => t.isIdentifier(p.key, { name: 'transformId' })
    );

    if (transformIdProp && t.isStringLiteral(transformIdProp.value)) {
      transformId = transformIdProp.value.value;
    }

    // Extract applyAs
    const applyAsProp = targetConfig.properties.find(
      p => t.isIdentifier(p.key, { name: 'applyAs' })
    );

    if (applyAsProp && t.isStringLiteral(applyAsProp.value)) {
      applyAs = applyAsProp.value.value;
    }

    // Extract applyIf
    const applyIfProp = targetConfig.properties.find(
      p => t.isIdentifier(p.key, { name: 'applyIf' })
    );

    if (applyIfProp && t.isArrowFunctionExpression(applyIfProp.value)) {
      applyIf = generateCSharpCondition(applyIfProp.value);
    }

    transforms.push({
      stateKey,
      selector,
      transformCode,
      transformId,
      applyAs,
      applyIf
    });
  });

  // Emit C# attributes
  state.componentMetadata.stateXTransforms = transforms;
}
```

---

## Summary

### Recommended Approach: **Hybrid Strategy**

1. **Simple transforms** → Babel static analysis extracts and converts to C#
2. **Complex business logic** → Move to state derivation (compute before setState)
3. **Reusable transforms** → Central registry with IDs

### Coverage

| Transform Type | Solution | Example |
|---------------|----------|---------|
| String formatting | Babel → C# | `v => \`$${v.toFixed(2)}\`` |
| String methods | Babel → C# | `v => v.toUpperCase()` |
| Ternaries | Babel → C# | `v => v > 10 ? 'High' : 'Low'` |
| Property access | Babel → C# | `v => v.firstName` |
| Complex calc | State derivation | Move to `setCart()` logic |
| Date formatting | Registry | `transformId: 'date-short'` |
| Custom logic | Registry | `transformId: 'custom-formatter'` |

### Benefits

- ✅ **90%+ transforms work automatically** (via Babel static analysis)
- ✅ **Server can pre-compute patches** (accurate VNode rendering)
- ✅ **Security** (no eval, no arbitrary code execution)
- ✅ **Performance** (compiled C#, not interpreted)
- ✅ **Maintainable** (clear patterns, fallback strategies)

This is a **pragmatic, production-ready solution** that balances developer experience with technical constraints.
