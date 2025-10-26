# Array State Helpers for useState

**Status**: Proposed Enhancement
**Priority**: HIGH (complements Loop Templates Phase 4)
**Impact**: Improves DX + Enables Precise Template Extraction

---

## The Problem

Currently, array state updates in Minimact require manual spreading:

```tsx
function TodoList() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text: string) => {
    // 😞 Manual spreading - loses semantic intent
    setTodos([...todos, { id: Date.now(), text, done: false }]);
  };

  const removeTodo = (id: number) => {
    // 😞 Filter - predictor can't tell this is a "remove"
    setTodos(todos.filter(t => t.id !== id));
  };

  const insertTodo = (index: number, text: string) => {
    // 😞 Complex splice logic - hard to understand intent
    const newTodos = [...todos];
    newTodos.splice(index, 0, { id: Date.now(), text, done: false });
    setTodos(newTodos);
  };
}
```

**Issues**:
1. **Lost Intent**: Predictor sees generic `setTodos(newArray)` - can't tell if it's append/prepend/remove/splice
2. **Hard to Extract**: Template extractor has to diff entire arrays to figure out what changed
3. **Inefficient**: For large arrays, diffing is expensive
4. **Verbose**: Developers write more boilerplate

---

## The Solution: Semantic Array Helpers

Add semantic helper methods to useState that **explicitly declare intent**:

```tsx
function TodoList() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text: string) => {
    // ✅ Clear intent: "append to end"
    setTodos.append({ id: Date.now(), text, done: false });
  };

  const prependTodo = (text: string) => {
    // ✅ Clear intent: "prepend to start"
    setTodos.prepend({ id: Date.now(), text, done: false });
  };

  const removeTodo = (id: number) => {
    // ✅ Clear intent: "remove item at index"
    const index = todos.findIndex(t => t.id === id);
    setTodos.removeAt(index);
  };

  const insertTodo = (index: number, text: string) => {
    // ✅ Clear intent: "insert at position"
    setTodos.insertAt(index, { id: Date.now(), text, done: false });
  };

  const updateTodo = (id: number, updates: Partial<Todo>) => {
    // ✅ Clear intent: "update item at index"
    const index = todos.findIndex(t => t.id === id);
    setTodos.updateAt(index, { ...todos[index], ...updates });
  };
}
```

---

## Benefits for Loop Template Extraction

### 1. **Precise Operation Detection**

Instead of diffing entire arrays, the predictor knows EXACTLY what happened:

```rust
// Before: Generic array change
StateChange {
  state_key: "todos",
  old_value: [{ id: 1, text: "A" }],
  new_value: [{ id: 1, text: "A" }, { id: 2, text: "B" }]
  // ❌ Predictor has to diff to figure out: "oh, item was appended"
}

// After: Semantic operation
StateChange {
  state_key: "todos",
  operation: ArrayOperation::Append {
    item: { id: 2, text: "B" }
  }
  // ✅ Predictor knows immediately: "append operation, extract template for new item"
}
```

### 2. **Simpler Template Extraction**

```rust
fn extract_loop_template(
    &self,
    state_change: &StateChange,
    all_state: &HashMap<String, Value>
) -> Option<Vec<Patch>> {
    // Check if this is an array operation
    if let Some(operation) = &state_change.array_operation {
        match operation {
            ArrayOperation::Append { item } => {
                // ✅ We know exactly what was added!
                // No need to diff entire old vs new arrays
                return self.extract_item_template_from_value(item, &state_change.state_key);
            }
            ArrayOperation::Prepend { item } => {
                // ✅ Same template, different position
                return self.extract_item_template_from_value(item, &state_change.state_key);
            }
            ArrayOperation::InsertAt { index, item } => {
                // ✅ Clear insertion point
                return self.extract_item_template_from_value(item, &state_change.state_key);
            }
            ArrayOperation::RemoveAt { index } => {
                // ✅ No template needed, just remove patch
                return Some(vec![Patch::Remove { path: vec![*index] }]);
            }
            ArrayOperation::UpdateAt { index, item } => {
                // ✅ Update existing item template
                return self.extract_update_template(index, item, &state_change.state_key);
            }
        }
    }

    // Fall back to full array diff for generic setTodos(newArray)
    None
}
```

### 3. **Better Predictions**

Client-side predictor can immediately predict the right patch:

```typescript
// User clicks "Add Todo"
// Client calls: setTodos.append({ id: 3, text: "New" })

// Predictor sees:
const stateChange = {
  stateKey: 'todos',
  operation: { type: 'Append', item: { id: 3, text: 'New' } }
};

// Instant prediction:
const loopTemplate = templateCache.get('todos');
const newItemNode = renderItemTemplate(loopTemplate.itemTemplate, { item: { id: 3, text: 'New' } });

const predictedPatch = {
  type: 'Create',
  path: [todos.length], // Append to end
  node: newItemNode
};

// ✅ Apply immediately, no server round-trip needed!
```

---

## API Design

### Proposed useState Extension

```typescript
// Enhanced useState return type
type ArrayState<T> = [
  T[],                          // Current array value
  ArrayStateSetter<T>           // Setter with helpers
];

interface ArrayStateSetter<T> {
  // Standard setter (for compatibility)
  (newValue: T[] | ((prev: T[]) => T[])): void;

  // Array operation helpers
  append(item: T): void;
  prepend(item: T): void;
  insertAt(index: number, item: T): void;
  removeAt(index: number): void;
  updateAt(index: number, updates: Partial<T> | ((prev: T) => T)): void;
  clear(): void;

  // Batch operations
  appendMany(items: T[]): void;
  removeMany(indices: number[]): void;

  // Conditional operations
  removeWhere(predicate: (item: T) => boolean): void;
  updateWhere(predicate: (item: T) => boolean, updates: Partial<T>): void;
}
```

### Usage Examples

```tsx
function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // ✅ Append
  setTodos.append({ id: Date.now(), text: "New todo", done: false });

  // ✅ Prepend
  setTodos.prepend({ id: Date.now(), text: "Urgent!", done: false });

  // ✅ Insert at specific position
  setTodos.insertAt(2, { id: Date.now(), text: "Insert here", done: false });

  // ✅ Remove by index
  const index = todos.findIndex(t => t.id === selectedId);
  setTodos.removeAt(index);

  // ✅ Update by index
  const index = todos.findIndex(t => t.id === selectedId);
  setTodos.updateAt(index, { done: true });
  // OR with function
  setTodos.updateAt(index, prev => ({ ...prev, done: !prev.done }));

  // ✅ Clear all
  setTodos.clear();

  // ✅ Remove multiple
  setTodos.removeWhere(t => t.done); // Remove all completed

  // ✅ Update multiple
  setTodos.updateWhere(t => t.done, { archived: true });

  // ✅ Batch append
  setTodos.appendMany([
    { id: 1, text: "Todo 1", done: false },
    { id: 2, text: "Todo 2", done: false }
  ]);

  // ✅ Still supports generic setter for complex updates
  setTodos(prev => prev.sort((a, b) => a.text.localeCompare(b.text)));
}
```

---

## Implementation Plan

### Phase 1: Client-Side Helpers (Week 1)

**File**: `src/client-runtime/src/hooks.ts`

```typescript
export function useState<T>(initialValue: T): [T, StateSetter<T>] {
  if (!currentContext) {
    throw new Error('useState must be called within a component render');
  }

  const context = currentContext;
  const index = stateIndex++;
  const stateKey = `state_${index}`;

  // Initialize state
  if (!context.state.has(stateKey)) {
    context.state.set(stateKey, initialValue);
  }

  const currentValue = context.state.get(stateKey) as T;

  // Create setter function
  const setState = (newValue: T | ((prev: T) => T)) => {
    const actualNewValue = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(context.state.get(stateKey) as T)
      : newValue;

    // Update local state
    context.state.set(stateKey, actualNewValue);

    const stateChanges: Record<string, any> = {
      [stateKey]: actualNewValue
    };

    // Check hint queue
    const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

    if (hint) {
      context.domPatcher.applyPatches(context.element, hint.patches);
    }

    // Sync to server
    context.signalR.updateComponentState(context.componentId, stateKey, actualNewValue)
      .catch(err => console.error('[Minimact] Failed to sync state:', err));
  };

  // If value is an array, add array helpers
  if (Array.isArray(currentValue)) {
    return [currentValue, createArrayStateSetter(setState, currentValue, stateKey, context)];
  }

  return [currentValue, setState];
}

function createArrayStateSetter<T>(
  baseSetState: (value: T[]) => void,
  currentArray: T[],
  stateKey: string,
  context: ComponentContext
): ArrayStateSetter<T> {
  // Base setter function
  const setter: any = baseSetState;

  // Append helper
  setter.append = (item: T) => {
    const newArray = [...currentArray, item];

    // Notify server of APPEND operation (not just new array)
    context.signalR.updateComponentStateWithOperation(
      context.componentId,
      stateKey,
      newArray,
      { type: 'Append', item }
    );

    // Update local state
    context.state.set(stateKey, newArray);

    // Try to predict patch
    const prediction = predictArrayAppend(context, stateKey, item);
    if (prediction) {
      context.domPatcher.applyPatches(context.element, prediction);
    }
  };

  // Prepend helper
  setter.prepend = (item: T) => {
    const newArray = [item, ...currentArray];

    context.signalR.updateComponentStateWithOperation(
      context.componentId,
      stateKey,
      newArray,
      { type: 'Prepend', item }
    );

    context.state.set(stateKey, newArray);

    const prediction = predictArrayPrepend(context, stateKey, item);
    if (prediction) {
      context.domPatcher.applyPatches(context.element, prediction);
    }
  };

  // InsertAt helper
  setter.insertAt = (index: number, item: T) => {
    const newArray = [...currentArray];
    newArray.splice(index, 0, item);

    context.signalR.updateComponentStateWithOperation(
      context.componentId,
      stateKey,
      newArray,
      { type: 'InsertAt', index, item }
    );

    context.state.set(stateKey, newArray);

    const prediction = predictArrayInsert(context, stateKey, index, item);
    if (prediction) {
      context.domPatcher.applyPatches(context.element, prediction);
    }
  };

  // RemoveAt helper
  setter.removeAt = (index: number) => {
    const newArray = currentArray.filter((_, i) => i !== index);

    context.signalR.updateComponentStateWithOperation(
      context.componentId,
      stateKey,
      newArray,
      { type: 'RemoveAt', index }
    );

    context.state.set(stateKey, newArray);

    const prediction = predictArrayRemove(context, stateKey, index);
    if (prediction) {
      context.domPatcher.applyPatches(context.element, prediction);
    }
  };

  // UpdateAt helper
  setter.updateAt = (index: number, updates: Partial<T> | ((prev: T) => T)) => {
    const newArray = [...currentArray];
    newArray[index] = typeof updates === 'function'
      ? (updates as (prev: T) => T)(currentArray[index])
      : { ...currentArray[index], ...updates };

    context.signalR.updateComponentStateWithOperation(
      context.componentId,
      stateKey,
      newArray,
      { type: 'UpdateAt', index, item: newArray[index] }
    );

    context.state.set(stateKey, newArray);

    const prediction = predictArrayUpdate(context, stateKey, index, newArray[index]);
    if (prediction) {
      context.domPatcher.applyPatches(context.element, prediction);
    }
  };

  // Clear helper
  setter.clear = () => {
    baseSetState([]);
  };

  // RemoveWhere helper
  setter.removeWhere = (predicate: (item: T) => boolean) => {
    const indicesToRemove = currentArray
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => predicate(item))
      .map(({ index }) => index);

    const newArray = currentArray.filter((_, i) => !indicesToRemove.includes(i));
    baseSetState(newArray);
  };

  // UpdateWhere helper
  setter.updateWhere = (predicate: (item: T) => boolean, updates: Partial<T>) => {
    const newArray = currentArray.map(item =>
      predicate(item) ? { ...item, ...updates } : item
    );
    baseSetState(newArray);
  };

  // AppendMany helper
  setter.appendMany = (items: T[]) => {
    const newArray = [...currentArray, ...items];
    baseSetState(newArray);
  };

  return setter as ArrayStateSetter<T>;
}
```

---

### Phase 2: Server-Side Operation Handling (Week 2)

**File**: `src/Minimact.AspNetCore/SignalR/MiniactHub.cs`

Add method to handle array operations:

```csharp
public class ArrayOperation
{
    public string Type { get; set; } // "Append", "Prepend", "InsertAt", "RemoveAt", "UpdateAt"
    public int? Index { get; set; }
    public object Item { get; set; }
}

public async Task UpdateComponentStateWithOperation(
    string componentId,
    string stateKey,
    object newValue,
    ArrayOperation operation
)
{
    var component = _registry.GetComponent(componentId);
    if (component == null) return;

    // Store operation metadata for predictor
    component.LastArrayOperation = operation;

    // Update state
    component.SetStateFromClient(stateKey, newValue);

    // Trigger render with operation context
    component.TriggerRenderWithOperationContext(operation);
}
```

---

### Phase 3: Predictor Enhancement (Week 2)

**File**: `src/src/predictor.rs`

```rust
/// Array operation metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ArrayOperation {
    Append { item: serde_json::Value },
    Prepend { item: serde_json::Value },
    InsertAt { index: usize, item: serde_json::Value },
    RemoveAt { index: usize },
    UpdateAt { index: usize, item: serde_json::Value },
}

/// Enhanced state change with operation metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateChange {
    pub component_id: String,
    pub state_key: String,
    pub old_value: serde_json::Value,
    pub new_value: serde_json::Value,
    /// Optional: Semantic array operation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub array_operation: Option<ArrayOperation>,
}
```

Modified extraction:

```rust
fn extract_loop_template(
    &self,
    state_change: &StateChange,
    old_patches: &[Patch],
    new_patches: &[Patch],
    all_state: &HashMap<String, serde_json::Value>
) -> Option<Vec<Patch>> {
    // If we have array operation metadata, use it!
    if let Some(operation) = &state_change.array_operation {
        return self.extract_loop_template_from_operation(
            state_change,
            operation,
            all_state
        );
    }

    // Fall back to diffing for generic setArray(newArray) calls
    self.extract_loop_template_from_diff(state_change, old_patches, new_patches, all_state)
}

fn extract_loop_template_from_operation(
    &self,
    state_change: &StateChange,
    operation: &ArrayOperation,
    all_state: &HashMap<String, serde_json::Value>
) -> Option<Vec<Patch>> {
    match operation {
        ArrayOperation::Append { item } => {
            // Extract template from appended item
            let item_template = self.extract_item_template_from_value(
                item,
                &state_change.state_key
            )?;

            Some(vec![Patch::UpdateListTemplate {
                path: vec![],
                loop_template: LoopTemplate {
                    array_binding: state_change.state_key.clone(),
                    item_template,
                    index_var: None,
                    separator: None,
                }
            }])
        }
        // ... handle other operations
    }
}
```

---

## Migration Path

### Backward Compatibility

```tsx
// ✅ Old code still works
const [todos, setTodos] = useState([]);
setTodos([...todos, newTodo]); // Generic setter, falls back to diffing

// ✅ New code is opt-in
setTodos.append(newTodo); // Semantic helper, instant template extraction
```

### Gradual Adoption

Developers can adopt helpers incrementally:

1. Start with generic `setTodos(newArray)` - works as before
2. Replace hot paths with `.append()` / `.removeAt()` - get instant predictions
3. Optionally refactor all array updates - max performance

---

## Success Metrics

### Before Array Helpers
```
User clicks "Add Todo"
→ Client: setTodos([...todos, newTodo])
→ Server: Receives newArray, diffs old vs new
→ Predictor: Analyzes diff, extracts template
→ Learning time: 100-200ms
→ Memory: Full array diff stored
```

### After Array Helpers
```
User clicks "Add Todo"
→ Client: setTodos.append(newTodo)
→ Server: Receives operation={ type: 'Append', item: newTodo }
→ Predictor: Immediately knows "append", extracts template from item
→ Learning time: 10-20ms (10x faster!)
→ Memory: Only item template stored (not full diff)
```

---

## Conclusion

Array state helpers are **the perfect complement to Loop Templates**:

✅ **Developer Experience**: Cleaner, more semantic code
✅ **Prediction Accuracy**: Predictor knows exactly what changed
✅ **Template Extraction**: Simpler, faster, more precise
✅ **Performance**: No full array diffing needed
✅ **Backward Compatible**: Opt-in enhancement

**Recommendation**: Implement alongside Phase 4 (Loop Templates) for maximum impact.

🎯 **Timeline**: 2-3 weeks (parallel with Loop Templates)
🎯 **Impact**: 10x faster template extraction + better DX
