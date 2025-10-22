# Hybrid JSX Transformation Strategy

## Overview

Minimact uses a **hybrid approach** to transform JSX to C#, combining compile-time transformation (Option 2) with runtime helpers (Option 3) to balance performance with flexibility.

## The Problem

When converting React/JSX components to C# Minimact components, we face two competing needs:

1. **Performance**: Direct VNode construction is faster than runtime helpers
2. **Flexibility**: Real-world React apps use complex patterns that are hard to transform at compile-time

Pure compile-time transformation would fail on:
- Spread operators: `<div {...props}>`
- Dynamic component types: `<ComponentType />`
- Complex conditional rendering
- Render props and HOCs
- Dynamic children from API data

Pure runtime helpers would work but sacrifice performance for simple cases.

## The Solution: Hybrid Approach

### Strategy

**Simple, Static JSX** → **Direct VNode Construction (Compile-Time)**
```jsx
<div className="container">
  <h1>Title</h1>
  <p>Count: {count}</p>
</div>
```

Generates:
```csharp
new VElement("div", new Dictionary<string, string> { ["className"] = "container" }, new VNode[]
{
    new VElement("h1", "Title"),
    new VElement("p", $"Count: {count}")
})
```

**Complex, Dynamic JSX** → **Runtime Helpers**
```jsx
<div {...props}>
  {items.map(item => <Item key={item.id} {...item} />)}
</div>
```

Generates:
```csharp
Minimact.createElement("div", props,
    items.Select(item => Minimact.createElement("Item",
        new { key = item.Id }.MergeWith(item)
    )).ToArray()
)
```

## Implementation Details

### Phase 1: Runtime Helpers (C# Side)

Add to `Minimact.Runtime.Core`:

```csharp
public static class Minimact
{
    /// <summary>
    /// Creates a VNode element with dynamic props and children
    /// </summary>
    public static VNode createElement(string tagOrComponent, object? props, params object?[]? children)
    {
        var propsDict = ConvertProps(props);
        var vnodeChildren = ConvertChildren(children);

        return new VElement(tagOrComponent, propsDict, vnodeChildren);
    }

    /// <summary>
    /// Fragment container (renders children without wrapper)
    /// </summary>
    public static VNode Fragment(params object?[]? children)
    {
        return new VFragment(ConvertChildren(children));
    }

    private static Dictionary<string, string> ConvertProps(object? props)
    {
        if (props == null) return new Dictionary<string, string>();

        // Handle dictionary
        if (props is Dictionary<string, string> dict) return dict;
        if (props is IDictionary<string, object> objDict)
            return objDict.ToDictionary(kv => kv.Key, kv => kv.Value?.ToString() ?? "");

        // Handle anonymous objects via reflection
        var result = new Dictionary<string, string>();
        foreach (var prop in props.GetType().GetProperties())
        {
            var value = prop.GetValue(props);
            if (value != null)
                result[prop.Name] = value.ToString()!;
        }
        return result;
    }

    private static VNode[] ConvertChildren(object?[]? children)
    {
        if (children == null || children.Length == 0)
            return Array.Empty<VNode>();

        var result = new List<VNode>();
        foreach (var child in children)
        {
            if (child == null) continue;

            if (child is VNode vnode)
                result.Add(vnode);
            else if (child is string str)
                result.Add(new VText(str));
            else if (child is IEnumerable<VNode> vnodes)
                result.AddRange(vnodes);
            else
                result.Add(new VText(child.ToString()!));
        }
        return result.ToArray();
    }

    /// <summary>
    /// Merge two prop objects (for spread operator support)
    /// </summary>
    public static object MergeWith(this object first, object second)
    {
        var merged = new Dictionary<string, object>();

        // Add first object props
        foreach (var prop in first.GetType().GetProperties())
        {
            var value = prop.GetValue(first);
            if (value != null) merged[prop.Name] = value;
        }

        // Add/override with second object props
        foreach (var prop in second.GetType().GetProperties())
        {
            var value = prop.GetValue(second);
            if (value != null) merged[prop.Name] = value;
        }

        return merged;
    }
}
```

### Phase 2: Babel Plugin Logic

The Babel plugin (`index-full.cjs`) decides which approach to use:

```javascript
function generateJSXElement(node, component, indent) {
    const tagName = node.openingElement.name.name;
    const attributes = node.openingElement.attributes;
    const children = node.children;

    // Detect if this needs runtime helpers
    const needsRuntimeHelper = hasSpreadProps(attributes) ||
                                hasDynamicChildren(children) ||
                                hasComplexProps(attributes);

    if (needsRuntimeHelper) {
        return generateRuntimeHelperCall(tagName, attributes, children, component, indent);
    } else {
        return generateDirectVNode(tagName, attributes, children, component, indent);
    }
}

function hasSpreadProps(attributes) {
    return attributes.some(attr => t.isJSXSpreadAttribute(attr));
}

function hasDynamicChildren(children) {
    return children.some(child =>
        t.isJSXExpressionContainer(child) &&
        t.isCallExpression(child.expression) &&
        child.expression.callee.property?.name === 'map'
    );
}

function hasComplexProps(attributes) {
    return attributes.some(attr =>
        t.isJSXExpressionContainer(attr.value) &&
        (t.isConditionalExpression(attr.value.expression) ||
         t.isLogicalExpression(attr.value.expression))
    );
}
```

## Decision Matrix

| JSX Pattern | Approach | Reason |
|-------------|----------|--------|
| `<div className="foo">` | Direct VNode | Static, simple |
| `<div className={cls}>` | Direct VNode | Simple expression |
| `<div {...props}>` | Runtime Helper | Spread operator |
| `<button disabled={!active}>` | Direct VNode | Simple boolean |
| `<div {...(show && { title: "x" })}>` | Runtime Helper | Conditional spread |
| `<div>{count}</div>` | Direct VNode | Simple expression |
| `<ul>{items.map(...)}</ul>` | Runtime Helper | Array iteration |
| `<Component />` | Direct VNode | Known component |
| `<ComponentType />` | Runtime Helper | Variable component |
| `{user && <Profile />}` | Direct VNode | Simple conditional |
| `{users.map(u => <User {...u} />)}` | Runtime Helper | Spread in map |

## Benefits

### Performance
- ✅ **Hot paths optimized**: Most common JSX patterns generate direct VNode construction
- ✅ **Zero overhead for simple cases**: No runtime helper calls needed
- ✅ **Type-safe**: Direct construction is fully type-checked at compile time

### Flexibility
- ✅ **Handles complex patterns**: Spread, dynamic children, HOCs all work
- ✅ **React compatibility**: Most React patterns translate cleanly
- ✅ **Extensible**: New patterns can use runtime helpers without plugin changes

### Maintainability
- ✅ **Simpler plugin logic**: Don't need to handle every edge case at compile time
- ✅ **Clear separation**: Easy to understand when each approach is used
- ✅ **Debuggable**: Generated C# is readable in both cases

## Migration Path

### Phase 1: Foundation (Current)
- [x] Direct VNode generation for simple JSX
- [x] Basic hooks (useState, useEffect, useRef)
- [ ] Runtime helper infrastructure

### Phase 2: Runtime Helpers
- [ ] Implement `Minimact.createElement()` in C# runtime
- [ ] Implement `Minimact.Fragment`
- [ ] Add prop merging utilities
- [ ] Update Babel plugin to detect complex patterns

### Phase 3: Advanced Patterns
- [ ] Spread operator support
- [ ] Dynamic component types
- [ ] Render props pattern
- [ ] HOC support
- [ ] Children as functions

### Phase 4: Optimization
- [ ] Profile performance of each approach
- [ ] Tune decision heuristics
- [ ] Add compile-time optimizations for common runtime patterns
- [ ] Consider IL generation for hot paths

## Examples

### Example 1: Simple Form (Direct VNode)

**Input JSX:**
```jsx
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form>
      <input type="email" value={email} />
      <input type="password" value={password} />
      <button type="submit">Login</button>
    </form>
  );
}
```

**Generated C#:**
```csharp
[Component]
public partial class LoginForm : MinimactComponent
{
    [State] private string email = "";
    [State] private string password = "";

    protected override VNode Render()
    {
        return new VElement("form", new VNode[]
        {
            new VElement("input", new Dictionary<string, string>
            {
                ["type"] = "email",
                ["value"] = email
            }),
            new VElement("input", new Dictionary<string, string>
            {
                ["type"] = "password",
                ["value"] = password
            }),
            new VElement("button", new Dictionary<string, string>
            {
                ["type"] = "submit"
            }, "Login")
        });
    }
}
```

### Example 2: Dynamic List (Runtime Helpers)

**Input JSX:**
```jsx
export function UserList({ users, onSelect }) {
  return (
    <div className="user-list">
      {users.map(user => (
        <UserCard
          key={user.id}
          {...user}
          onClick={() => onSelect(user)}
        />
      ))}
    </div>
  );
}
```

**Generated C#:**
```csharp
[Component]
public partial class UserList : MinimactComponent
{
    [Prop] public List<User> users { get; set; }
    [Prop] public Action<User> onSelect { get; set; }

    protected override VNode Render()
    {
        return Minimact.createElement("div",
            new { className = "user-list" },
            users.Select(user =>
                Minimact.createElement("UserCard",
                    new { key = user.Id }
                        .MergeWith(user)
                        .MergeWith(new { onClick = () => onSelect(user) })
                )
            ).ToArray()
        );
    }
}
```

### Example 3: Conditional with Spread (Mixed)

**Input JSX:**
```jsx
export function Button({ primary, disabled, ...rest }) {
  return (
    <button
      className={primary ? 'btn-primary' : 'btn-secondary'}
      disabled={disabled}
      {...rest}
    >
      {rest.children}
    </button>
  );
}
```

**Generated C#:**
```csharp
[Component]
public partial class Button : MinimactComponent
{
    [Prop] public bool primary { get; set; }
    [Prop] public bool disabled { get; set; }
    [Prop] public Dictionary<string, object> rest { get; set; }

    protected override VNode Render()
    {
        // Uses runtime helper because of spread operator
        return Minimact.createElement("button",
            new {
                className = primary ? "btn-primary" : "btn-secondary",
                disabled = disabled
            }.MergeWith(rest),
            rest["children"]
        );
    }
}
```

## Performance Characteristics

### Direct VNode Construction
- **Compile time**: Fast (simple AST transformation)
- **Runtime**: ~10-50ns per element (direct allocation)
- **Memory**: Minimal (no intermediate objects)
- **Type safety**: Full (compile-time checked)

### Runtime Helpers
- **Compile time**: Fast (simple helper call generation)
- **Runtime**: ~100-500ns per element (reflection + conversion)
- **Memory**: Higher (intermediate dictionaries/arrays)
- **Type safety**: Partial (runtime conversion)

### Recommendation
For production apps, expect:
- 80-90% of JSX uses direct VNode (fast path)
- 10-20% uses runtime helpers (complex patterns)
- Overall performance: Excellent (dominated by fast path)

## Future Optimizations

### 1. IL Generation for Hot Paths
Compile frequently-used runtime helper patterns to IL for near-native performance.

### 2. Prop Caching
Cache converted props for repeated renders with same data.

### 3. JIT Compilation
Detect runtime patterns and compile them to optimized IL on-the-fly.

### 4. Source Generators
Use C# source generators to pre-compile helper calls at build time.

## Testing Strategy

### Unit Tests
- Direct VNode generation for all simple patterns
- Runtime helpers for all complex patterns
- Edge cases (null, empty, nested)

### Integration Tests
- Real-world component examples
- Performance benchmarks
- Memory profiling

### Compatibility Tests
- Common React patterns
- Third-party component libraries
- Complex app structures

## Conclusion

The hybrid approach gives us the best of both worlds:
- **Performance** where it matters (common cases)
- **Flexibility** where we need it (complex patterns)
- **Maintainability** for long-term success

This positions Minimact to handle real-world production React applications while maintaining excellent performance characteristics.
