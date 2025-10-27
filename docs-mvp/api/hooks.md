# Hooks API Reference

Minimact supports most React hooks, plus some server-specific ones.

## useState

Server-side state management.

```tsx
const [count, setCount] = useState(0);
const [name, setName] = useState('');
const [user, setUser] = useState<User | null>(null);
```

**Transpiles to:**

```csharp
private int count = 0;
private string name = "";
private User? user = null;
```

**Updates trigger re-render:**

```tsx
setCount(count + 1); // Server re-renders, sends patch to client
```

## useEffect

Side effects that run on the server.

```tsx
useEffect(() => {
    console.log('Component mounted');

    return () => {
        console.log('Component unmounted');
    };
}, []);
```

**With dependencies:**

```tsx
useEffect(() => {
    fetchData(userId);
}, [userId]); // Re-runs when userId changes
```

## useMemo

Memoize expensive computations.

```tsx
const expensiveValue = useMemo(() => {
    return computeExpensiveValue(a, b);
}, [a, b]);
```

## useCallback

Memoize callbacks.

```tsx
const handleClick = useCallback(() => {
    doSomething(a, b);
}, [a, b]);
```

## useRef

Create a mutable ref.

```tsx
const inputRef = useRef<HTMLInputElement>(null);

<input ref={inputRef} />
```

## useContext

Access React context.

```tsx
const theme = useContext(ThemeContext);
```

## useServerTask

Execute long-running server tasks with progress updates.

```tsx
const [task, startTask] = useServerTask(async () => {
    for (let i = 0; i <= 100; i += 10) {
        await delay(500);
        updateProgress(i); // Client receives progress updates
    }
    return 'Complete!';
});

return (
    <div>
        <button onClick={startTask} disabled={task.isRunning}>
            Process Data
        </button>
        {task.isRunning && <progress value={task.progress} max={100} />}
        {task.error && <p>Error: {task.error}</p>}
        {task.result && <p>Result: {task.result}</p>}
    </div>
);
```

**Properties:**

- `task.isRunning` - Task is executing
- `task.progress` - Current progress (0-100)
- `task.result` - Task result (when complete)
- `task.error` - Error message (if failed)

## useClientState

Client-only state (never sent to server).

```tsx
const [mousePos, setMousePos] = useClientState({ x: 0, y: 0 });

useEffect(() => {
    const handleMove = (e: MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY }); // Instant, no server call
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
}, []);
```

## useQuery

Fetch data with caching and revalidation.

```tsx
const { data, loading, error, refetch } = useQuery(
    'users',
    async () => await apiClient.getUsers()
);

if (loading) return <Spinner />;
if (error) return <Error message={error} />;

return (
    <div>
        {data.map(user => <UserCard key={user.id} user={user} />)}
        <button onClick={refetch}>Refresh</button>
    </div>
);
```

## useMutation

Execute mutations with optimistic updates.

```tsx
const [updateUser, { loading }] = useMutation(
    async (userId: number, data: UserData) => {
        return await apiClient.updateUser(userId, data);
    },
    {
        onSuccess: () => {
            toast.success('User updated!');
        }
    }
);

return (
    <button onClick={() => updateUser(user.id, formData)} disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
    </button>
);
```

## useDebounce

Debounce a value.

```tsx
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
    if (debouncedSearch) {
        searchAPI(debouncedSearch);
    }
}, [debouncedSearch]);
```

## useInterval

Run a callback on an interval.

```tsx
const [seconds, setSeconds] = useState(0);

useInterval(() => {
    setSeconds(s => s + 1);
}, 1000); // Every 1 second
```

## usePrevious

Get the previous value.

```tsx
const [count, setCount] = useState(0);
const prevCount = usePrevious(count);

return <p>Now: {count}, was: {prevCount}</p>;
```

## useToggle

Boolean state with toggle function.

```tsx
const [isOpen, toggle] = useToggle(false);

return (
    <div>
        <button onClick={toggle}>Toggle</button>
        {isOpen && <Modal />}
    </div>
);
```

## Next Steps

- Learn about [Custom Predictors](/api/custom-predictors)
- Explore [Component API](/api/components)
- See [Examples](/examples)
