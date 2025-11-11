# Minimact Manual Testing Plan

Comprehensive manual testing guide for validating Minimact's core functionality.

---

## 🎯 Testing Priority Matrix

### **P0 - Critical Path (Must Work)**
1. Basic rendering (TSX → C# → HTML)
2. useState with instant updates (cache hit)
3. Event handlers (onClick, onChange)
4. State synchronization (client → server)
5. Template prediction system (cache hits)

### **P1 - Core Features**
6. useEffect (client execution + server attributes)
7. Lifted State Components
8. useProtectedState (access control)
9. Conditional rendering (VNull nodes)
10. Hot reload (state preservation)

### **P2 - Advanced Features**
11. useDomElementState (Minimact Punch)
12. MVC Bridge (useMvcState)
13. Loop templates (.map() patterns)
14. Hex path stability
15. Minimact Swig IDE integration

---

## 📋 Test Scenarios

### **1. Basic Rendering & State (P0)**

**Test: Counter Component**
```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

**Manual Steps:**
1. ✅ Verify initial render shows "Count: 0"
2. ✅ Click button → Should update to "Count: 1" **instantly** (2-3ms)
3. ✅ Check browser console for green "🟢 CACHE HIT" message
4. ✅ Click 10 more times → All should be instant cache hits
5. ✅ Open Network tab → Verify SignalR "UpdateComponentState" messages sent in background
6. ❌ **Failure case:** If update is slow (>50ms), cache miss occurred

**What You're Testing:**
- Template extraction (Babel generated `{0}` template for count)
- Client-side instant patch application
- State synchronization to server
- Prediction accuracy

---

### **2. State Synchronization (P0)**

**Test: Stale Data Prevention**
```tsx
function Menu() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle Menu</button>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Theme: {theme}
      </button>
      {isOpen && <div>Menu Content</div>}
    </>
  );
}
```

**Manual Steps:**
1. ✅ Click "Toggle Menu" → Menu appears instantly
2. ✅ Click "Theme: light" → Changes to "Theme: dark" instantly
3. ✅ **Critical Test:** Click Theme button again
4. ✅ Menu should **stay visible** (not disappear)
5. ❌ **Failure case:** If menu disappears, server has stale `isOpen` state

**What You're Testing:**
- State sync prevents server stale data
- Multiple state changes don't conflict
- Server re-render uses updated state

---

### **3. Conditional Rendering with VNull (P1)**

**Test: VNull Node Stability**
```tsx
function Dashboard() {
  const [showProfile, setShowProfile] = useState(false);
  const [showCart, setShowCart] = useState(false);

  return (
    <>
      <button onClick={() => setShowProfile(!showProfile)}>Profile</button>
      <button onClick={() => setShowCart(!showCart)}>Cart</button>
      {showProfile && <div id="profile">Profile Section</div>}
      {showCart && <div id="cart">Cart Section</div>}
      <div id="footer">Footer</div>
    </>
  );
}
```

**Manual Steps:**
1. ✅ Initially both sections hidden, footer visible
2. ✅ Click "Profile" → Profile appears, footer stays
3. ✅ Click "Cart" → Cart appears, profile and footer stay
4. ✅ Click "Profile" again → Profile hides, cart and footer stay
5. ✅ Rapidly toggle both → No flicker, no DOM shift bugs
6. ❌ **Failure case:** If footer moves unexpectedly, VNull not working

**What You're Testing:**
- VNull nodes maintain stable positions
- PathConverter correctly maps hex paths → DOM indices
- Conditional rendering doesn't cause index shifts

---

### **4. Lifted State Components (P1)**

**Test: Parent Accessing Child State**
```tsx
function App() {
  const userEditing = state["UserProfile.isEditing"];

  return (
    <>
      <div>User is editing: {userEditing ? 'Yes' : 'No'}</div>
      <Component name="UserProfile" state={{ isEditing: false }}>
        <UserProfile />
      </Component>
    </>
  );
}

function UserProfile() {
  const isEditing = state.isEditing;  // Auto-prefixed

  return (
    <button onClick={() => setState('isEditing', !isEditing)}>
      {isEditing ? 'Save' : 'Edit'}
    </button>
  );
}
```

**Manual Steps:**
1. ✅ Initially shows "User is editing: No" and button says "Edit"
2. ✅ Click "Edit" → Both update instantly
3. ✅ Parent shows "User is editing: Yes", button says "Save"
4. ✅ Verify both changes were instant (cache hits)
5. ❌ **Failure case:** If parent doesn't update, state lifting broken

**What You're Testing:**
- State automatically lifted to parent
- Namespace prefixing (UserProfile.isEditing)
- Parent can observe child state
- Both parent and child render correctly

---

### **5. useProtectedState (P1)**

**Test: Access Control Runtime Enforcement**
```tsx
function Counter() {
  const [count, setCount] = useState(0);  // Public
  const [cache, setCache] = useProtectedState([]);  // Protected

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}

function Parent() {
  const count = state["Counter.count"];  // Should work
  const cache = state["Counter.cache"];  // Should throw error

  return <div>Count: {count}</div>;
}
```

**Manual Steps:**
1. ✅ Verify component renders without trying to access cache
2. ✅ In browser console, try: `state["Counter.count"]` → Should work
3. ✅ Try: `state["Counter.cache"]` → Should throw runtime error
4. ✅ Check error message mentions "protected state"
5. ❌ **Failure case:** If no error thrown, protection not working

**What You're Testing:**
- Runtime access control enforcement
- Public state accessible
- Protected state blocked
- Clear error messages

---

### **6. useEffect Dual Execution (P1)**

**Test: Client Execution + Server Attributes**
```tsx
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    console.log('[Client] Timer mounted');
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => {
      console.log('[Client] Timer cleanup');
      clearInterval(interval);
    };
  }, []);

  return <div>Seconds: {seconds}</div>;
}
```

**Manual Steps:**
1. ✅ Check browser console → Should see "[Client] Timer mounted"
2. ✅ Wait 3 seconds → Counter should update to 3
3. ✅ Verify updates are instant (cache hits)
4. ✅ Remove component (navigate away) → Should see "[Client] Timer cleanup"
5. ✅ Check C# code → Should have `[OnMounted]` attribute
6. ❌ **Failure case:** If timer doesn't run, effect not executing on client

**What You're Testing:**
- useEffect runs on client (source of truth)
- Cleanup functions work
- C# attributes generated for server documentation
- State updates from effects are synced

---

### **7. useDomElementState (P2)**

**Test: DOM as Reactive Data Source**
```tsx
function LazyImage() {
  const box = useDomElementState('.lazy-image');

  return (
    <div className="lazy-image" style={{ height: '200px' }}>
      {box.isIntersecting ? (
        <img src="large-image.jpg" />
      ) : (
        <div>Placeholder</div>
      )}
    </div>
  );
}
```

**Manual Steps:**
1. ✅ Initially shows "Placeholder" (not in viewport)
2. ✅ Scroll down until component visible
3. ✅ Image should load **instantly** when intersecting
4. ✅ Check console → Should see cache hit
5. ✅ Scroll back up → Image stays loaded (intentional)
6. ❌ **Failure case:** If slow to load, prediction failed

**What You're Testing:**
- IntersectionObserver integration
- DOM state changes trigger updates
- Predictions work with DOM state
- useDomElementState syncs to server

---

### **8. Template Prediction Coverage (P0)**

**Test: Dynamic Slot Filling**
```tsx
function Greeting() {
  const [name, setName] = useState('World');

  return (
    <>
      <input value={name} onChange={e => setName(e.target.value)} />
      <div>Hello, {name}!</div>
    </>
  );
}
```

**Manual Steps:**
1. ✅ Type "Alice" → Should update instantly on each keystroke
2. ✅ Every keystroke should be a cache hit (green in console)
3. ✅ Type "Bob" → Still instant
4. ✅ Type emojis "🌵🦀" → Still instant
5. ✅ Verify template is `"Hello, {0}!"` (check generated C# or console)
6. ❌ **Failure case:** If first keystroke is slow, template not extracted

**What You're Testing:**
- Babel extracted template at build time
- 100% coverage from first interaction (no learning phase)
- Slot filling works with any value
- No cache misses after initial render

---

### **9. Loop Templates (P2)**

**Test: Array.map() Predictions**
```tsx
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn Minimact', done: false },
    { id: 2, text: 'Build app', done: false }
  ]);

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id} onClick={() => toggleTodo(todo.id)}>
          {todo.done ? '✓' : '○'} {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**Manual Steps:**
1. ✅ Initially shows 2 todos with ○ icons
2. ✅ Click first todo → Changes to ✓ instantly
3. ✅ Click second todo → Changes to ✓ instantly
4. ✅ Click first todo again → Changes back to ○ instantly
5. ✅ All clicks should be cache hits
6. ❌ **Failure case:** If slow, loop template not working

**What You're Testing:**
- Loop template extraction (`.map()` pattern)
- Conditional template (`{todo.done ? '✓' : '○'}`)
- Multiple bindings per item
- Array state updates sync correctly

---

### **10. Hot Reload State Preservation (P1)**

**Test: State Survives Reloads**
```tsx
function Form() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" />
    </>
  );
}
```

**Manual Steps:**
1. ✅ Type "test@example.com" in email field
2. ✅ Type "secret123" in password field
3. ✅ Save the TSX file (trigger hot reload)
4. ✅ Both fields should **still contain the typed values**
5. ✅ Make a code change (add a console.log)
6. ✅ Save again → State should still be preserved
7. ❌ **Failure case:** If fields clear, hex paths or state lifting broken

**What You're Testing:**
- Hex paths remain stable across reloads
- Lifted state survives hot reload
- Form data doesn't disappear
- Developer experience quality

---

### **11. MVC Bridge Integration (P2)**

**Test: ViewModel → Component State**
```csharp
// Controller
public async Task<IActionResult> Product(int id) {
    var viewModel = new ProductViewModel {
        ProductName = "Laptop",
        Price = 999.99,
        InitialQuantity = 1
    };
    return await _renderer.RenderPage<ProductPage>(viewModel);
}
```

```tsx
function ProductPage() {
  const [productName] = useMvcState<string>('productName');  // Immutable
  const [price] = useMvcState<number>('price');              // Immutable
  const [quantity, setQuantity] = useMvcState<number>('initialQuantity'); // Mutable

  return (
    <>
      <h1>{productName}</h1>
      <div>${price.toFixed(2)}</div>
      <button onClick={() => setQuantity(quantity + 1)}>Qty: {quantity}</button>
    </>
  );
}
```

**Manual Steps:**
1. ✅ Navigate to /product/123
2. ✅ Verify "Laptop" and "$999.99" render correctly
3. ✅ Verify "Qty: 1" shows initially
4. ✅ Click quantity button → Updates to "Qty: 2" instantly
5. ✅ Quantity syncs to server, name/price don't
6. ❌ **Failure case:** If ViewModel values don't render, MVC bridge broken

**What You're Testing:**
- ViewModel data passed to React component
- useMvcState reads ViewModel properties
- Immutable vs mutable ViewModel fields
- MVC pattern integration

---

### **12. Hex Path Stability Under Insertions (P2)**

**Test: DOM Manipulation Doesn't Break Paths**
```tsx
function List() {
  const [items, setItems] = useState(['A', 'B', 'C']);

  const insertMiddle = () => {
    setItems(['A', 'B', 'NEW', 'C']);
  };

  return (
    <>
      <button onClick={insertMiddle}>Insert</button>
      <ul>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </>
  );
}
```

**Manual Steps:**
1. ✅ Initially shows A, B, C
2. ✅ Click "Insert" → Should show A, B, NEW, C instantly
3. ✅ Verify no flicker or re-render of A, B, C
4. ✅ Inspect DOM hex paths (if visible) → Should be stable
5. ✅ Click "Insert" multiple times → Always instant
6. ❌ **Failure case:** If flickers, hex paths shifted

**What You're Testing:**
- Hex path gap allocation
- Insertions don't re-index existing elements
- DOM stability under mutations
- PathConverter accuracy

---

### **13. Network Failure Resilience (P1)**

**Test: Offline Behavior**
```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

**Manual Steps:**
1. ✅ Click button → Works normally (count: 1)
2. ✅ Open DevTools Network tab → Set to "Offline"
3. ✅ Click button 5 more times → Should still update UI instantly (count: 6)
4. ✅ Check console → Should see SignalR connection errors
5. ✅ Disable offline mode → SignalR reconnects
6. ✅ Click button again → Should sync missed updates to server
7. ❌ **Failure case:** If UI doesn't update offline, client-side prediction broken

**What You're Testing:**
- Client-side cache works offline
- UI responds without server
- SignalR handles reconnection
- State syncs after reconnection

---

### **14. Prediction Accuracy Dashboard (P2)**

**Test: Swig IDE Metrics**

**Manual Steps (if Swig IDE is running):**
1. ✅ Open Minimact Swig IDE
2. ✅ Connect to running app via SignalR
3. ✅ View component state tree in real-time
4. ✅ Click buttons in app → See state updates in Swig
5. ✅ Check prediction metrics:
   - Cache hit rate should be 95-98%
   - Average latency should be 2-5ms
   - False positives should be <2%
6. ❌ **Failure case:** If hit rate <90%, prediction not working well

**What You're Testing:**
- Swig IDE SignalR connection
- Real-time state inspection
- Prediction analytics accuracy
- Developer debugging experience

---

### **15. Complex Conditional Templates (P2)**

**Test: Nested Ternaries**
```tsx
function Status() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  return (
    <>
      <button onClick={() => setStatus('loading')}>Start</button>
      <div>
        {status === 'idle' ? '⏸️ Idle' :
         status === 'loading' ? '⏳ Loading...' :
         status === 'success' ? '✅ Success' :
         '❌ Error'}
      </div>
    </>
  );
}
```

**Manual Steps:**
1. ✅ Initially shows "⏸️ Idle"
2. ✅ Click "Start" → Changes to "⏳ Loading..." instantly
3. ✅ Programmatically trigger success → "✅ Success" instantly
4. ✅ All transitions should be cache hits
5. ❌ **Failure case:** If any transition is slow, conditional template extraction failed

**What You're Testing:**
- Complex ternary extraction
- Multiple conditional branches
- Template covers all possible values
- 100% coverage from first interaction

---

## 🎯 Testing Checklist Summary

**Critical Path (P0) - Must Pass:**
- [ ] Basic counter works instantly
- [ ] State synchronization prevents stale data
- [ ] Template prediction 100% coverage
- [ ] Network requests sent in background
- [ ] Cache hit rate >90%

**Core Features (P1) - Should Pass:**
- [ ] useEffect runs on client, cleanup works
- [ ] Lifted state components work
- [ ] useProtectedState enforces access control
- [ ] Conditional rendering (VNull) stable
- [ ] Hot reload preserves state

**Advanced Features (P2) - Nice to Have:**
- [ ] useDomElementState reactive
- [ ] MVC bridge integration
- [ ] Loop templates work
- [ ] Hex paths stable under insertions
- [ ] Swig IDE connects and shows metrics

---

## 🔍 Debugging Tips

**If cache misses occur:**
- Check browser console for "🔴 CACHE MISS" logs
- Verify Babel plugin generated templates in C# code
- Check if state shape matches template expectations

**If state sync fails:**
- Check Network tab for "UpdateComponentState" SignalR messages
- Verify `context.signalR.updateComponentState()` is called in hooks.ts
- Check C# MinimactHub has UpdateComponentState method

**If VNull broken:**
- Inspect hex paths in DOM (if visible)
- Check PathConverter correctly accounts for VNull nodes
- Verify conditionals don't cause DOM index shifts

**If lifted state fails:**
- Check state namespace prefixing (e.g., "UserProfile.isEditing")
- Verify parent can read `state["ChildName.property"]`
- Check Component wrapper sets name attribute

---

## 📊 Success Criteria

**Production Ready:**
- ✅ All P0 tests pass
- ✅ 95%+ cache hit rate
- ✅ 2-5ms average interaction latency
- ✅ State sync works reliably
- ✅ Hot reload preserves state

**Beta Ready:**
- ✅ All P0 + P1 tests pass
- ✅ 90%+ cache hit rate
- ✅ <10ms average latency
- ✅ Basic features work

**Alpha Ready:**
- ✅ Basic counter works
- ✅ State synchronization works
- ✅ Can build and run

---

## 🚀 Getting Started with Testing

1. **Start with P0 tests** - These are critical path features
2. **Use browser DevTools** - Console shows cache hits/misses, Network shows SignalR
3. **Check logs** - Both client and server logs are valuable
4. **Test incrementally** - Don't move to P1 until P0 passes
5. **Document failures** - Note which tests fail and error messages

**Recommended Order:**
1. Test #1 - Basic Counter (warmup)
2. Test #8 - Template Prediction (validate build-time extraction)
3. Test #2 - State Synchronization (critical for correctness)
4. Test #3 - VNull Stability (DOM correctness)
5. Continue with remaining P0 tests
6. Move to P1 tests once P0 passes
7. Test P2 features as needed

---

## 📝 Notes

- **Cache warmup:** First interaction may be slightly slower as templates are loaded
- **Network conditions:** Test on both fast and slow networks to see prediction benefits
- **Browser compatibility:** Test on Chrome, Firefox, Safari, Edge
- **Mobile testing:** Touch events should work identically to mouse clicks
- **Stress testing:** Rapidly click/type to verify prediction doesn't break under load

---

This testing plan covers all implemented Minimact features systematically. Start with P0 (critical path) and work through P1 and P2 as you validate core functionality.
