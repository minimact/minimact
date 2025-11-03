# Core Concepts

Understanding the core concepts behind Minimact will help you build better applications.

## Server-Side React

Minimact brings the React development experience to the server. You write familiar JSX/TSX components, but they run entirely on the ASP.NET Core server.

### How It Works

1. **Write JSX/TSX** - Use familiar React syntax
2. **Transpile to C#** - Babel converts your components to C# classes
3. **Server Rendering** - Components render HTML on the server
4. **SignalR Communication** - Real-time updates via SignalR
5. **DOM Patching** - Efficient client-side DOM updates

## State Management

### Server State

Server state is managed by your C# component and lives on the server:

```tsx
const [count, setCount] = useState(0); // Lives on server
```

This transpiles to:

```csharp
private int count = 0;

public void SetCount(int value)
{
    count = value;
    StateHasChanged();
}
```

## Component Lifecycle

Minimact components follow a simplified lifecycle:

1. **Mount** - Component is created on the server
2. **Render** - HTML is generated and sent to client
3. **Update** - State changes trigger re-renders
4. **Unmount** - Component is disposed

```tsx
export function MyComponent() {
    useEffect(() => {
        console.log('Component mounted');

        return () => {
            console.log('Component unmounted');
        };
    }, []);

    return <div>Hello</div>;
}
```

## Hooks

Minimact supports most React hooks:

- ✅ `useState` - Server-side state
- ✅ `useEffect` - Side effects
- ✅ `useMemo` - Memoized values
- ✅ `useCallback` - Memoized callbacks
- ✅ `useRef` - References
- ✅ `useContext` - Context API
- 🆕 `useServerTask` - Long-running server tasks

## Event Handlers

Event handlers are automatically wired to call server methods:

```tsx
<button onClick={() => setCount(count + 1)}>
    Increment
</button>
```

This becomes:

```csharp
<button onclick="increment">Increment</button>

[ServerMethod]
public void Increment()
{
    count++;
    StateHasChanged();
}
```

## Predictive Updates

Minimact's killer feature: it predicts what will happen when you click a button and pre-sends the patches.

When the server detects a pattern (like incrementing a counter), it:

1. Predicts the next state
2. Generates DOM patches
3. Sends them to the client **before you click**
4. Client caches the patches
5. You click → **instant update (0ms latency)**
6. Server verifies and corrects if needed

Learn more in [Predictive Rendering](/guide/predictive-rendering).

## Next Steps

- Dive into [Predictive Rendering](/guide/predictive-rendering)
- Explore the [API Reference](/api/hooks)
- See [Examples](/examples)
