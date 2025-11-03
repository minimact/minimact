# Predictive Rendering

Minimact's predictive rendering system uses **parameterized templates** generated at build time by Babel, achieving **100% coverage** of all possible state values.

## How It Works

Traditional server-rendered apps have a problem: network latency. Every click requires a round-trip to the server.

Minimact solves this by **pre-generating parameterized templates** at build time that can handle any state value.

### The Template Pipeline

1. **Build Time** - Babel analyzes JSX and extracts parameterized templates
2. **Template Metadata** - Templates stored in `.templates.json` files
3. **Runtime Loading** - Server reads template metadata on startup
4. **State Change** - User clicks button, state changes on server
5. **Template Application** - Server fills template slots with new state values
6. **Patch Sending** - Server sends DOM patches to client
7. **Instant Apply** - Client applies patches (typically 1-3ms)

## Example: Counter

```tsx
import { useState } from '@minimact/core';

function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Build Time - Template Generation

Babel analyzes this and generates `Counter.templates.json`:

```json
{
  "component": "Counter",
  "templates": {
    "button[0].text[0]": {
      "template": "{0}",
      "bindings": ["count"],
      "slots": [0],
      "type": "dynamic"
    }
  }
}
```

### Runtime - Template Application

1. User clicks button → `onClick` triggers SignalR call
2. Server executes `setCount(count + 1)` → `count` becomes 1
3. Server looks up template: `"template": "{0}"`
4. Server fills slot `{0}` with count value: `"1"`
5. Server generates patch: `{ type: 'text', path: [0, 0], value: '1' }`
6. Client receives patch and updates DOM (**~1-3ms**)

**Key advantage**: This template works for **any count value** (0, 1, 100, 999, etc.) - no runtime prediction needed!

## Template Types

For a deep dive, see the [Template Patch System](/v1.0/architecture/template-patch-system).

Babel generates different template types based on your JSX:

### 1. Static Templates

No dynamic values:

```tsx
<h1>Welcome to Minimact</h1>
```

Template: `"Welcome to Minimact"` (no slots needed)

### 2. Dynamic Templates

Simple slot filling:

```tsx
<p>Count: {count}</p>
```

Template: `"Count: {0}"` with bindings: `["count"]`

### 3. Conditional Templates

Ternary expressions:

```tsx
<span>{count > 10 ? 'High' : 'Low'}</span>
```

Template: `"{0}"` with conditional map:
```json
{
  "true": "High",
  "false": "Low"
}
```

### 4. Loop Templates

Array rendering:

```tsx
{todos.map(todo => (
  <li key={todo.id}>{todo.text}</li>
))}
```

Loop template with per-item structure and bindings.

## Performance

The template system is **extremely efficient**:

- **Build time**: Babel analysis ~50ms per component
- **Template loading**: ~10µs per component at server startup
- **Template application**: ~20µs per state change
- **Memory overhead**: ~2KB per component (vs ~100KB for full VNode trees)
- **Network**: Only send minimal patches (typically <1KB)

## Advantages Over Runtime Prediction

### 100% Coverage

Traditional prediction systems learn patterns at runtime:
- Need "warm-up" period to learn patterns
- Only predict values they've seen before
- Miss rate on new/unusual values

**Minimact templates work for ALL values immediately**:
- `count` can be 0, 1, 999, -5, etc. - same template
- No learning phase needed
- No cache misses due to unexpected values

### Memory Efficiency

Traditional approach:
```
Store patches for: count=0, count=1, count=2, ..., count=100
= 100 cached patches × 500 bytes = 50KB
```

Template approach:
```
Store one template: "{0}" with binding: "count"
= 1 template × 50 bytes = 50 bytes
```

**1000x memory reduction!**

## Debugging Templates

### View Generated Templates

After transpiling, check the `.templates.json` files next to your `.tsx` files:

```bash
Pages/
├── HomePage.tsx
├── HomePage.cs
└── HomePage.templates.json  ← Template metadata
```

### Enable Template Logging

```csharp
builder.Services.AddMinimact(options =>
{
    options.EnableTemplateLogging = true;
});
```

In browser console:

```
[Minimact] Applied template for button[0].text[0]: "5" (1.2ms)
[Minimact] Loop template applied: 3 items (2.8ms)
```

### Swig Template Inspector

Use **Minimact Swig** IDE's Template Inspector to visualize:
- All templates for each component
- Template types (static, dynamic, conditional, loop)
- Bindings and slots
- Real-time template application

## Best Practices

1. **Keep JSX simple** - Simpler JSX → better templates
2. **Use ternaries for conditionals** - Generates optimal conditional templates
3. **Stable keys in loops** - Ensures efficient list reconciliation
4. **Avoid complex expressions in JSX** - Move to variables or `useComputed`
5. **Check template output** - Review `.templates.json` files

## Next Steps

- See it in action: [Examples](/examples)
- API details: [Hooks API](/api/hooks)
- Deep dive: [Template Patch System](/v1.0/architecture/template-patch-system)
