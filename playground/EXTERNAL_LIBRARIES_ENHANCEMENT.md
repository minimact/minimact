# Playground Enhancement: External Libraries + Minimact Punch

**Goal:** Enable the playground to test external libraries (lodash, moment, etc.) and ultimately demonstrate Minimact Punch (DOM state observation).

**Status:** Planning
**Timeline:** ~2-3 hours for full implementation

---

## Phase 5A: External Libraries Support

### Overview

The playground already compiles C# and manages sessions. We need to add:
1. **Client-side computation** - Execute lodash/moment in browser
2. **SignalR-like state sync** - Send computed values to backend
3. **Re-rendering** - Trigger component re-render with computed values
4. **Visualization** - Show client-computed variables in UI

---

## Architecture Changes

### Current Flow
```
User types JSX
  ↓
Monaco Editor
  ↓
POST /api/playground/compile
  ↓
Babel transpiles to C#
  ↓
Roslyn compiles C#
  ↓
Component renders
  ↓
HTML returned
  ↓
Preview iframe displays HTML
```

### Enhanced Flow with Client-Computed
```
User types JSX (with lodash/moment)
  ↓
Monaco Editor
  ↓
POST /api/playground/compile
  ↓
Babel transpiles to C# (detects external libs)
  ↓
Roslyn compiles C#
  ↓
Component renders (with placeholder values)
  ↓
HTML + metadata returned
  ├─ HTML with placeholder data
  ├─ List of client-computed variables
  └─ Component registration info
  ↓
Preview iframe displays HTML
  ↓
🆕 Client-side computation runs
  ├─ Extracts component state (items, sortOrder)
  ├─ Executes lodash: _.orderBy(items, ['price'], [sortOrder])
  ├─ Computes all client-computed variables
  └─ Result: { sortedItems: [...], totalPrice: 7.2, ... }
  ↓
🆕 POST /api/playground/update-client-computed
  ├─ Sends: sessionId + computed values
  ↓
Backend re-renders component with real values
  ├─ component.UpdateClientState(computedValues)
  ├─ component.TriggerRender()
  ├─ Generates patches
  └─ Returns: patches + new HTML
  ↓
Preview applies patches
  └─ List updates from [] to [item1, item2, ...]
```

---

## Implementation Plan

### 1. Backend Enhancements

#### 1.1 Add ClientState to PlaygroundSession
**File:** `playground/backend/Services/PlaygroundSession.cs`

```csharp
public class PlaygroundSession
{
    // ... existing properties

    /// <summary>
    /// Client-computed state synced from browser
    /// </summary>
    public Dictionary<string, object> ClientState { get; set; } = new();

    /// <summary>
    /// Metadata about client-computed variables
    /// </summary>
    public List<ClientComputedMetadata> ClientComputedVars { get; set; } = new();

    /// <summary>
    /// Update client-computed state and trigger re-render
    /// </summary>
    public PlaygroundInteractResponse UpdateClientComputedState(Dictionary<string, object> computedValues)
    {
        var sw = Stopwatch.StartNew();

        // Update component's ClientState
        foreach (var kvp in computedValues)
        {
            ClientState[kvp.Key] = kvp.Value;
        }

        Component.UpdateClientState(computedValues);

        // Trigger re-render
        var newVNode = Component.RenderComponent();

        // Compute patches
        var patches = Reconciler.Diff(CurrentVNode, newVNode);
        CurrentVNode = newVNode;

        sw.Stop();

        return new PlaygroundInteractResponse
        {
            ElapsedMs = (int)sw.ElapsedMilliseconds,
            CacheHit = false, // Client-computed doesn't use prediction
            Latency = $"{sw.ElapsedMilliseconds}ms (client-computed)",
            ActualPatches = patches,
            Html = VNodeRenderer.Render(newVNode)
        };
    }
}

public class ClientComputedMetadata
{
    public string VarName { get; set; }
    public string Type { get; set; }
    public List<string> Dependencies { get; set; }
}
```

#### 1.2 Add API Endpoint
**File:** `playground/backend/Controllers/PlaygroundController.cs`

```csharp
/// <summary>
/// Update client-computed state (external library results)
/// </summary>
[HttpPost("update-client-computed")]
public IActionResult UpdateClientComputed([FromBody] UpdateClientComputedRequest request)
{
    if (!_sessions.TryGetValue(request.SessionId, out var session))
    {
        return NotFound(new { error = "Session not found" });
    }

    try
    {
        var response = session.UpdateClientComputedState(request.ComputedValues);
        return Ok(response);
    }
    catch (Exception ex)
    {
        return BadRequest(new { error = ex.Message });
    }
}

public class UpdateClientComputedRequest
{
    public string SessionId { get; set; }
    public Dictionary<string, object> ComputedValues { get; set; }
}
```

#### 1.3 Enhance Compile Response with Metadata
**File:** `playground/backend/Services/CompilationService.cs`

```csharp
public PlaygroundCompileResponse Compile(string csharpCode, List<PredictHint> predictHints)
{
    // ... existing compilation

    // Extract client-computed metadata from generated C#
    var clientComputedVars = ExtractClientComputedMetadata(csharpCode);

    return new PlaygroundCompileResponse
    {
        // ... existing properties
        ClientComputedVars = clientComputedVars
    };
}

private List<ClientComputedMetadata> ExtractClientComputedMetadata(string csharpCode)
{
    var vars = new List<ClientComputedMetadata>();

    // Parse C# code for [ClientComputed("varName")] attributes
    var matches = Regex.Matches(csharpCode, @"\[ClientComputed\(""(\w+)""\)\]\s*private\s+(\S+)\s+(\w+)");

    foreach (Match match in matches)
    {
        vars.Add(new ClientComputedMetadata
        {
            VarName = match.Groups[1].Value,
            Type = match.Groups[2].Value,
            Dependencies = new List<string>() // Could parse JSX comments for this
        });
    }

    return vars;
}
```

---

### 2. Frontend Enhancements

#### 2.1 Add lodash/moment to Frontend
**File:** `playground/frontend/package.json`

```json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "moment": "^2.29.4"
  }
}
```

#### 2.2 Create Client Computation Service
**File:** `playground/frontend/src/services/client-computed.ts`

```typescript
import _ from 'lodash';
import moment from 'moment';

/**
 * Extracts component state from compiled component
 */
export function extractComponentState(sessionId: string): Record<string, any> {
  // In real scenario, this would come from the component's State dictionary
  // For playground, we'll extract from the initial render response
  return window.__PLAYGROUND_STATE__?.[sessionId] || {};
}

/**
 * Computes client-computed variables using external libraries
 */
export function computeClientState(
  state: Record<string, any>,
  clientComputedVars: ClientComputedMetadata[]
): Record<string, any> {
  const computed: Record<string, any> = {};

  // For ExternalLibrariesTest, manually define computations
  // In real implementation, this would be parsed from JSX or provided as functions

  if (state.items && Array.isArray(state.items)) {
    const items = state.items;
    const sortOrder = state.sortOrder || 'asc';

    computed.sortedItems = _.orderBy(items, ['price'], [sortOrder]);
    computed.totalPrice = _.sumBy(items, 'price');
    computed.avgPrice = _.meanBy(items, 'price');
    computed.cheapestItem = _.minBy(items, 'price');
    computed.expensiveItems = _.filter(items, item => item.price > 1.00);

    // Format date function (returns function reference)
    computed.formatDate = (dateStr: string) => moment(dateStr).format('MMM DD, YYYY');
  }

  return computed;
}

interface ClientComputedMetadata {
  varName: string;
  type: string;
  dependencies: string[];
}
```

#### 2.3 Enhance Preview Component
**File:** `playground/frontend/src/components/Preview.tsx`

```typescript
import { computeClientState, extractComponentState } from '../services/client-computed';

export function Preview({ sessionId, html, clientComputedVars }: PreviewProps) {
  const [renderedHtml, setRenderedHtml] = useState(html);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // After initial render, compute client-computed state
    if (clientComputedVars && clientComputedVars.length > 0) {
      computeAndSync();
    }
  }, [sessionId, clientComputedVars]);

  const computeAndSync = async () => {
    try {
      // 1. Extract component state
      const state = extractComponentState(sessionId);

      // 2. Compute client-computed variables
      const computed = computeClientState(state, clientComputedVars);

      console.log('[Playground] Computed client state:', computed);

      // 3. Send to backend
      const response = await playgroundApi.updateClientComputed(sessionId, computed);

      // 4. Update preview with new HTML
      setRenderedHtml(response.html);

      // 5. Show success toast
      toast.success(`✓ Computed ${Object.keys(computed).length} values`);
    } catch (error) {
      console.error('[Playground] Client computation failed:', error);
      toast.error('Failed to compute client state');
    }
  };

  return (
    <div className="preview">
      {clientComputedVars?.length > 0 && (
        <div className="client-computed-banner">
          <span>🔄 {clientComputedVars.length} client-computed variables</span>
          <button onClick={computeAndSync}>Recompute</button>
        </div>
      )}

      <iframe
        ref={iframeRef}
        srcDoc={renderedHtml}
        sandbox="allow-scripts"
      />
    </div>
  );
}
```

#### 2.4 Add Client-Computed Panel
**File:** `playground/frontend/src/components/ClientComputedPanel.tsx`

```typescript
/**
 * Displays client-computed variables and their metadata
 */
export function ClientComputedPanel({ vars, values }: ClientComputedPanelProps) {
  return (
    <div className="client-computed-panel">
      <h3>Client-Computed Variables</h3>

      {vars.length === 0 ? (
        <p className="empty">No client-computed variables detected</p>
      ) : (
        <div className="vars-list">
          {vars.map(v => (
            <div key={v.varName} className="var-item">
              <div className="var-header">
                <span className="var-name">{v.varName}</span>
                <span className="var-type">{v.type}</span>
              </div>

              {values?.[v.varName] && (
                <div className="var-value">
                  <pre>{JSON.stringify(values[v.varName], null, 2)}</pre>
                </div>
              )}

              {v.dependencies?.length > 0 && (
                <div className="var-deps">
                  Depends on: {v.dependencies.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 2.5 Update Main Layout
**File:** `playground/frontend/src/components/Layout.tsx`

```typescript
export function Layout() {
  const [session, setSession] = useState<PlaygroundSession | null>(null);
  const [clientComputedValues, setClientComputedValues] = useState<Record<string, any>>({});

  return (
    <div className="playground-layout">
      <div className="left-panel">
        <Editor onCompile={handleCompile} />
        <ClientComputedPanel
          vars={session?.clientComputedVars || []}
          values={clientComputedValues}
        />
      </div>

      <div className="center-panel">
        <Preview
          sessionId={session?.sessionId}
          html={session?.html}
          clientComputedVars={session?.clientComputedVars}
          onClientComputedUpdate={setClientComputedValues}
        />
      </div>

      <div className="right-panel">
        <MetricsDashboard sessionId={session?.sessionId} />
      </div>
    </div>
  );
}
```

---

## 3. Testing Workflow

### Test Case: ExternalLibrariesTest

**Step 1: Paste JSX**
```jsx
import _ from 'lodash';
import moment from 'moment';

function ExternalLibrariesTest() {
  const [items, setItems] = useState([
    { id: 1, name: 'Apple', price: 1.20, created: '2024-01-15' },
    { id: 2, name: 'Banana', price: 0.50, created: '2024-01-16' },
    { id: 3, name: 'Cherry', price: 3.00, created: '2024-01-17' },
    { id: 4, name: 'Date', price: 2.50, created: '2024-01-18' },
  ]);

  const [sortOrder, setSortOrder] = useState('asc');

  const sortedItems = _.orderBy(items, ['price'], [sortOrder]);
  const totalPrice = _.sumBy(items, 'price');

  return (
    <div>
      <h1>Total: ${totalPrice.toFixed(2)}</h1>
      {sortedItems.map(item => (
        <div key={item.id}>{item.name}: ${item.price}</div>
      ))}
      <button onClick={() => setSortOrder('desc')}>Sort Desc</button>
    </div>
  );
}
```

**Step 2: Click Compile**
- Babel transpiles JSX → C#
- Detects `_` and `moment` as external
- Generates `[ClientComputed]` properties
- Backend compiles C# successfully

**Step 3: View Initial Render**
- Preview shows HTML with **placeholder values**:
  - `Total: $0.00`
  - Empty list

**Step 4: Client Computation Runs**
- Frontend extracts state: `{ items: [...], sortOrder: 'asc' }`
- Executes lodash: `_.orderBy(items, ['price'], ['asc'])`
- Computes: `{ sortedItems: [Banana, Apple, Date, Cherry], totalPrice: 7.2 }`
- Sends to backend via `POST /api/playground/update-client-computed`

**Step 5: Re-render with Real Values**
- Backend receives computed values
- Calls `component.UpdateClientState()`
- Triggers `component.TriggerRender()`
- Computes patches
- Returns new HTML

**Step 6: Preview Updates**
- Applies patches to DOM
- List populates: Banana, Apple, Date, Cherry
- Total updates: `$7.20`
- ✅ Success!

**Step 7: User Interaction**
- Click "Sort Desc" button
- Client recomputes: `_.orderBy(items, ['price'], ['desc'])`
- New order: Cherry, Date, Apple, Banana
- Patches applied
- DOM updates without refresh

---

## Phase 5B: Minimact Punch Integration

### Overview

Once external libraries work, Minimact Punch is just another external library!

### Implementation

#### 1. Create Punch Package (Mock for Playground)
**File:** `playground/frontend/src/services/minimact-punch.ts`

```typescript
/**
 * Minimact Punch - Mock implementation for playground
 * Real implementation would use MutationObserver, ResizeObserver, etc.
 */

interface DomElementState {
  count: number;
  elements: HTMLElement[];
  avg: (prop: string) => number;
  sum: (prop: string) => number;
  // ... all 10 dimensions
}

export function useDomElementState(selector: string): DomElementState {
  // In playground, we'll simulate DOM observation
  const elements = document.querySelectorAll(selector);

  return {
    count: elements.length,
    elements: Array.from(elements) as HTMLElement[],

    avg: (prop: string) => {
      const values = Array.from(elements).map(el =>
        parseFloat(getComputedStyle(el)[prop as any]) || 0
      );
      return values.reduce((a, b) => a + b, 0) / values.length;
    },

    sum: (prop: string) => {
      return Array.from(elements).reduce((sum, el) =>
        sum + (parseFloat(getComputedStyle(el)[prop as any]) || 0), 0
      );
    },

    // ... implement all 10 dimensions
  };
}
```

#### 2. Test Punch in Playground

**Paste Punch JSX:**
```jsx
import { useDomElementState } from 'minimact-punch';

function PunchDemo() {
  const items = useDomElementState('.item');

  return (
    <div>
      <h1>Punch Demo</h1>
      <p>Found {items.count} items</p>
      <p>Average height: {items.avg('height')}px</p>

      {items.count > 10 && <Pagination />}

      <div className="items">
        <div className="item">Item 1</div>
        <div className="item">Item 2</div>
        <div className="item">Item 3</div>
      </div>
    </div>
  );
}
```

**Result:**
- Babel detects `useDomElementState` as external
- C#: `[ClientComputed("items")] private DomElementState items => GetClientState(...)`
- Client observes DOM: `{ count: 3, avg: () => {...} }`
- Syncs to server
- Re-renders with real data
- ✅ **Minimact Punch works!** 🌵 + 🍹

---

## Visual Enhancements

### 1. Syntax Highlighting
Highlight client-computed variables in C# output:
```csharp
[ClientComputed("sortedItems")]  ← Green highlight
private List<dynamic> sortedItems => GetClientState<List<dynamic>>("sortedItems");
```

### 2. Computation Badge
Show badge on preview when client computation runs:
```
🔄 Computing 6 variables...
✓ Computed in 12ms
```

### 3. State Inspector
Show component state tree:
```
Component State:
├─ items: Array(4)  [Server State]
├─ sortOrder: "asc"  [Server State]
└─ Client-Computed:
   ├─ sortedItems: Array(4)  [Computed]
   ├─ totalPrice: 7.2  [Computed]
   └─ avgPrice: 1.8  [Computed]
```

---

## Success Metrics

Phase 5 is complete when:

- [ ] lodash and moment work in playground
- [ ] Client-computed variables display in UI
- [ ] Computation → sync → re-render flow works
- [ ] State changes trigger selective recomputation
- [ ] Visual feedback shows client-computed status
- [ ] Minimact Punch JSX compiles and runs
- [ ] Documentation updated with examples

---

## Timeline

| Task | Time | Cumulative |
|------|------|------------|
| Backend: Add ClientState support | 20 min | 20 min |
| Backend: Add API endpoint | 15 min | 35 min |
| Backend: Extract metadata | 20 min | 55 min |
| Frontend: Install lodash/moment | 2 min | 57 min |
| Frontend: Create computation service | 30 min | 1h 27min |
| Frontend: Enhance Preview component | 25 min | 1h 52min |
| Frontend: Add ClientComputed panel | 20 min | 2h 12min |
| Testing: ExternalLibrariesTest | 15 min | 2h 27min |
| Testing: Minimact Punch demo | 15 min | 2h 42min |
| Documentation | 15 min | **2h 57min** |

**Total: ~3 hours**

---

## Benefits

### Immediate
- ✅ Test external libraries visually
- ✅ Demo Minimact Punch live
- ✅ Validate Phases 1-4 work end-to-end
- ✅ Marketing tool for Minimact

### Long-term
- ✅ Interactive documentation
- ✅ Developer onboarding
- ✅ Live coding demos
- ✅ Visual Compiler integration
- ✅ Community examples

---

## Next Steps

1. **Implement Phase 5A** (External Libraries)
   - Backend enhancements
   - Frontend client computation
   - Test with ExternalLibrariesTest

2. **Implement Phase 5B** (Minimact Punch)
   - Mock Punch implementation
   - Test with Punch demo JSX
   - Validate all 10 dimensions

3. **Polish & Document**
   - Add visual indicators
   - Update README
   - Create video demo

Then: **Ship it!** 🚀 🌵 + 🍹
