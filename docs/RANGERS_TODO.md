# Command Center Rangers - Implementation Checklist

## ✅ Existing Rangers

1. 🔴 **Red Ranger** - Core Minimact functionality (useState, useEffect, useRef)
2. 🔵 **Blue Ranger** - Predictive rendering with HintQueue
3. 💚 **Green Ranger** - Worker algorithms (Mouse Trajectory, Scroll Velocity, Focus Prediction)
4. 💛 **Yellow Ranger** - Hook Simulators Test
5. 🩷 **Pink Ranger** - Performance stress testing
6. 🪻 **Lavender Ranger** - Minimact-Punch Extension (useDomElementState)
7. 🩵 **Turquoise Ranger** - Minimact-Query Extension (useDomQuery - SQL for DOM)
8. 💎 **Diamond Ranger** - Template Prediction System (All 9 Phases)

## 🆕 New Rangers to Implement

### 🧡 Topaz Ranger - usePaginatedServerTask ✅ COMPLETED
**Status**: Implemented
**File**: `Rangers/TopazRanger.cs`
**Fixture**: `src/fixtures/UserList.tsx`

**Tests**:
- Pagination with page navigation (next/prev/goto)
- Server task execution for page fetching
- Total count calculation
- Prefetch optimization
- Filter-based pagination

---

### 🔶 Ruby Ranger - useDecisionTree (minimact-trees)
**Status**: TODO
**File**: `Rangers/RubyRanger.cs` (to create)
**Fixture**: `src/fixtures/PricingCalculator.tsx` (to create)

**Tests**:
- Decision tree state management
- Nested path navigation
- Universal value type support
- Predictive transition pre-computation
- TypeScript inference validation

**Example TSX**:
```typescript
import { useDecisionTree } from 'minimact-trees';

export function PricingCalculator() {
  const price = useDecisionTree({
    roleAdmin: 0,
    rolePremium: {
      count5: 0,
      count3: 5
    },
    roleBasic: 10
  }, { role: 'admin', count: 5 });

  return <div>Price: ${price}</div>;
}
```

---

### ⚫ Onyx Ranger - useDynamicState (minimact-dynamic)
**Status**: TODO
**File**: `Rangers/OnyxRanger.cs` (to create)
**Fixture**: `src/fixtures/ProductCard.tsx` (to create)

**Tests**:
- Function-based value binding
- Dependency tracking with Proxy
- Direct DOM updates (< 1ms)
- Server pre-compilation support
- Separation of structure from content

**Example TSX**:
```typescript
import { useDynamicState, dynamic } from 'minimact-dynamic';

export function ProductCard() {
  return (
    <div className="product">
      <span className="price"></span>
      <span className="discount"></span>
    </div>
  );
}

// Bind values separately
dynamic('.price', (state) =>
  state.user.isPremium
    ? state.product.factoryPrice
    : state.product.price
);
```

---

### 💜 Amethyst Ranger - useServerTask
**Status**: TODO
**File**: `Rangers/AmethystRanger.cs` (to create)
**Fixture**: `src/fixtures/FileUpload.tsx` (to create)

**Tests**:
- Long-running async operations
- Progress tracking
- Retry on failure
- Cancellation
- Error handling
- Status management (idle, running, success, error)

**Example TSX**:
```typescript
import { useServerTask } from 'minimact';

export function FileUpload() {
  const upload = useServerTask(async (file: File) => {
    // Server-side file processing
    const result = await processFile(file);
    return result;
  });

  return (
    <div>
      {upload.status === 'running' && (
        <div>Uploading... {upload.progress * 100}%</div>
      )}

      <button onClick={() => upload.start(selectedFile)}>
        Upload
      </button>

      {upload.error && <div>Error: {upload.error}</div>}
    </div>
  );
}
```

---

### 🟡 Citrine Ranger - useArea (minimact-spatial)
**Status**: TODO
**File**: `Rangers/CitrineRanger.cs` (to create)
**Fixture**: `src/fixtures/SpatialLayout.tsx` (to create)

**Tests**:
- Viewport region tracking
- Coverage and density calculations
- Element count in regions
- Reactive spatial queries
- Collision detection

**Example TSX**:
```typescript
import { useArea } from 'minimact-spatial';

export function SpatialLayout() {
  const header = useArea({ top: 0, height: 80 });
  const sidebar = useArea('#sidebar');

  return (
    <div>
      {header.isFull && <div>Header is full - show compact mode</div>}
      {sidebar.elementsCount > 10 && <div>Show scroll indicator</div>}
    </div>
  );
}
```

---

### ⚪ Pearl Ranger - DOM Entanglement (minimact-quantum)
**Status**: TODO
**File**: `Rangers/PearlRanger.cs` (to create)
**Fixture**: `src/fixtures/QuantumSlider.tsx` (to create)

**Tests**:
- Multi-client DOM synchronization
- Mutation vector transmission
- Bidirectional entanglement
- Operational Transform conflict resolution
- Bandwidth efficiency (100x reduction)

**Example TSX**:
```typescript
import { quantum } from 'minimact-quantum';

export function QuantumSlider() {
  const slider = useRef<HTMLElement>(null);

  useEffect(() => {
    // Entangle slider across clients
    const link = await quantum.entangle(slider.current, {
      clientId: 'user-b',
      selector: '#volume-slider'
    }, 'bidirectional');

    // User A drags → User B's slider moves instantly
  }, []);

  return <input ref={slider} type="range" />;
}
```

---

### 🟠 Amber Ranger - usePub/useSub (Pub/Sub Events)
**Status**: TODO
**File**: `Rangers/AmberRanger.cs` (to create)
**Fixture**: `src/fixtures/ChatRoom.tsx` (to create)

**Tests**:
- Client-side event aggregation
- Channel subscription/unsubscription
- Message publishing
- Component-to-component communication
- Last message retrieval

**Example TSX**:
```typescript
import { usePub, useSub } from 'minimact';

export function ChatRoom() {
  const publish = usePub('chat-messages');
  const messages = useSub('chat-messages', (msg) => {
    console.log('New message:', msg.value);
  });

  return (
    <div>
      <button onClick={() => publish({ text: 'Hello!' })}>
        Send
      </button>
    </div>
  );
}
```

---

### 💚 Emerald Ranger - useSignalR (SignalR Connection)
**Status**: TODO
**File**: `Rangers/EmeraldRanger.cs` (to create)
**Fixture**: `src/fixtures/LiveNotifications.tsx` (to create)

**Tests**:
- SignalR connection lifecycle
- Real-time message handling
- Connection state tracking
- Custom hub methods
- Error handling and reconnection

**Example TSX**:
```typescript
import { useSignalR } from 'minimact';

export function LiveNotifications() {
  const notifications = useSignalR('/hubs/notifications', (data) => {
    console.log('New notification:', data);
  });

  return (
    <div>
      Status: {notifications.state.connected ? 'Connected' : 'Disconnected'}
      {notifications.state.data && <div>{notifications.state.data}</div>}
    </div>
  );
}
```

---

## 📋 Implementation Checklist

For each Ranger, follow these steps:

1. ✅ Create Ranger test class in `Rangers/[Name]Ranger.cs`
2. ✅ Extend `RangerTest` base class
3. ✅ Implement `Name`, `Description`, and `RunAsync()` properties/methods
4. ✅ Create corresponding fixture TSX file in `src/fixtures/`
5. ✅ Add [Fact] attribute for xUnit test discovery
6. ✅ Include comprehensive assertions with `report.Assert*` methods
7. ✅ Log steps with `report.RecordStep()`
8. ✅ Test with both Mock and Real client modes (if applicable)
9. ✅ Verify Babel transpilation works correctly
10. ✅ Test component registration and initialization
11. ✅ Verify DOM rendering and state updates
12. ✅ Test prediction/hint queue integration (if applicable)
13. ✅ Add to MainWindow.xaml for WPF UI integration
14. ✅ Document expected results in Ranger comments

---

## 🎯 Priority Order

1. **Amethyst Ranger** (useServerTask) - Most critical, tests long-running operations
2. **Ruby Ranger** (useDecisionTree) - State machine testing
3. **Amber Ranger** (usePub/useSub) - Component communication
4. **Emerald Ranger** (useSignalR) - Connection management
5. **Onyx Ranger** (useDynamicState) - Performance optimization
6. **Citrine Ranger** (useArea) - Spatial computing
7. **Pearl Ranger** (quantum) - Advanced experimental feature

---

## 🏗️ Architecture Notes

### Ranger Base Class Pattern
```csharp
public class MyRanger : RangerTest
{
    public override string Name => "🎨 My Ranger";
    public override string Description => "What this tests";

    [Fact]
    public async Task Test_MyFeature()
    {
        await SetupAsync();
        try
        {
            await RunAsync();
        }
        finally
        {
            await TeardownAsync();
        }
    }

    public override async Task RunAsync()
    {
        // 1. Transpile TSX → C#
        // 2. Compile → Component instance
        // 3. Register with RealHub
        // 4. Connect to server
        // 5. Initialize component
        // 6. Test interactions
        // 7. Assert results
    }
}
```

### Fixture TSX Pattern
```typescript
import { useHookName } from 'minimact' | 'minimact-extension';

export function ComponentName() {
  const hookResult = useHookName(...);

  return (
    <div>
      {/* Component UI */}
    </div>
  );
}
```

---

## 🦕 "It's morphin' time!"

Each Ranger tests a critical piece of Minimact's architecture. Together, they form a comprehensive test suite that validates the entire framework - from core hooks to advanced extensions.

**When all Rangers pass:**
- ✅ Core functionality works
- ✅ Predictive rendering works
- ✅ All extensions work
- ✅ Performance is validated
- ✅ Framework is production-ready

**Power Rangers, UNITE!** 🦕⚡
