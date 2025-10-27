# useServerTask: Streaming Results (Phase 2)

## Vision

**Stream results as they're computed. Update DOM incrementally. Zero layout shifts.**

Instead of waiting for the entire task to complete, stream partial results to the client as they're computed on the server. Each chunk triggers a DOM patch with predictive templates, creating a buttery-smooth progressive loading experience.

```tsx
// Developer writes THIS:
function SearchResults() {
  const search = useServerTask(async function* (query: string) {
    const totalBatches = 10;

    for (let i = 0; i < totalBatches; i++) {
      const batch = await searchDatabase(query, i * 100, 100);
      yield {
        items: batch,
        batch: i,
        total: totalBatches
      };
    }
  }, { stream: true }); // ← STREAMING ENABLED!

  return (
    <div>
      <input
        value={query}
        onChange={e => search.start(e.target.value)}
      />

      {search.running && (
        <p>Loading... {Math.round(search.progress * 100)}%</p>
      )}

      {/* Render partial results as they arrive */}
      <ul>
        {search.partial?.items.map(item => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>

      {search.complete && (
        <p>Found {search.result.totalItems} results</p>
      )}
    </div>
  );
}
```

**What happens**:
1. User types "react"
2. Server starts streaming results in batches
3. Client receives first 100 items → Patches DOM → Shows first results (200ms)
4. Client receives second 100 items → Patches DOM → Appends more (400ms)
5. ... continues until all batches received
6. Final result available at `search.result`

**No loading spinners. No skeleton screens. Just progressive content.**

---

## Architecture

### Streaming Flow

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT                                                       │
│  const search = useServerTask(async function* () {          │
│    for (let i = 0; i < 10; i++) {                          │
│      yield batch[i];  // ← Generator function!              │
│    }                                                         │
│  }, { stream: true });                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ BABEL TRANSPILATION                                          │
│  Detects: async function* (generator)                       │
│  Transpiles to: C# IAsyncEnumerable<T>                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ SERVER (C#)                                                  │
│  [ServerTask("search", Streaming = true)]                   │
│  private async IAsyncEnumerable<SearchBatch> Search()       │
│  {                                                           │
│      for (int i = 0; i < 10; i++)                          │
│      {                                                       │
│          var batch = await SearchDatabase(...);             │
│          yield return batch;  // ← Streams to client!       │
│      }                                                       │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ SIGNALR STREAMING                                            │
│  Hub streams chunks via SignalR streaming API               │
│  Each chunk → Triggers component re-render                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PREDICTIVE DOM PATCHING                                      │
│  Predictor learns: "Batch N → Append N items"              │
│  Template: ListItem for each item in batch                  │
│  Next batch: Instant append (no layout shift!)             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Design

### Client-Side Interface

```typescript
interface ServerTaskOptions {
  stream?: boolean; // Enable streaming mode
  estimatedChunks?: number; // Hint for progress calculation
  onChunk?: (chunk: any, index: number) => void; // Callback per chunk
}

interface ServerTask<T> {
  // Existing props
  status: ServerTaskStatus;
  result?: T;
  error?: Error;

  // Streaming-specific props
  streaming: boolean; // Is this a streaming task?
  partial?: T; // Latest partial result (accumulated)
  chunks: T[]; // All chunks received so far
  chunkCount: number; // Number of chunks received
  estimatedTotal?: number; // Estimated total chunks
  progress: number; // 0.0 - 1.0 (based on chunks / estimatedTotal)

  // Control
  start(...args: any[]): void;
  cancel(): void;

  // Promise (resolves when complete)
  promise: Promise<T>;
}
```

### Usage Examples

**Example 1: Progressive Search Results**

```tsx
function SearchResults() {
  const [query, setQuery] = useState('');

  const search = useServerTask(async function* (q: string) {
    const pageSize = 50;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await searchAPI(q, page, pageSize);

      yield {
        items: batch.items,
        page: page,
        hasMore: batch.hasMore
      };

      hasMore = batch.hasMore;
      page++;
    }
  }, {
    stream: true,
    onChunk: (chunk, index) => {
      console.log(`Received batch ${index}:`, chunk.items.length, 'items');
    }
  });

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && search.start(query)}
      />

      {search.running && (
        <div className="loading-bar">
          <div style={{ width: `${search.progress * 100}%` }} />
        </div>
      )}

      <ul className="results">
        {search.chunks.flatMap(chunk => chunk.items).map(item => (
          <li key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.snippet}</p>
          </li>
        ))}
      </ul>

      {search.complete && (
        <p>Search complete. Found {search.chunks.length} batches.</p>
      )}
    </div>
  );
}
```

**Generated C#**:

```csharp
[ServerTask("search", Streaming = true)]
private async IAsyncEnumerable<SearchBatch> Search(string q)
{
    var pageSize = 50;
    var page = 0;
    var hasMore = true;

    while (hasMore)
    {
        var batch = await SearchAPI(q, page, pageSize);

        yield return new SearchBatch
        {
            Items = batch.Items,
            Page = page,
            HasMore = batch.HasMore
        };

        hasMore = batch.HasMore;
        page++;
    }
}
```

**Example 2: Large Dataset Processing**

```tsx
function DataProcessor() {
  const process = useServerTask(async function* () {
    const totalRecords = 10000;
    const batchSize = 100;

    for (let offset = 0; offset < totalRecords; offset += batchSize) {
      const batch = await fetchRecords(offset, batchSize);
      const processed = batch.map(record => ({
        ...record,
        normalized: normalizeData(record),
        score: calculateScore(record)
      }));

      yield {
        records: processed,
        offset: offset,
        total: totalRecords,
        progress: offset / totalRecords
      };
    }

    return { totalProcessed: totalRecords, completed: true };
  }, {
    stream: true,
    estimatedChunks: 100
  });

  return (
    <div>
      <button onClick={process.start}>Process Data</button>

      {process.running && (
        <div>
          <progress value={process.progress} max={1} />
          <p>{Math.round(process.progress * 100)}% complete</p>
          <p>Processed {process.chunks.reduce((sum, c) => sum + c.records.length, 0)} records</p>
        </div>
      )}

      {process.complete && (
        <div>
          <h2>Processing Complete!</h2>
          <p>Total: {process.result.totalProcessed} records</p>
        </div>
      )}

      <div className="preview">
        <h3>Latest Batch:</h3>
        {process.partial?.records.slice(0, 5).map(record => (
          <div key={record.id}>
            {record.name} - Score: {record.score}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Example 3: AI Streaming Response**

```tsx
function ChatAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const ai = useServerTask(async function* (prompt: string) {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      stream: true
    });

    let fullResponse = '';
    let wordCount = 0;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      wordCount += content.split(' ').length;

      yield {
        text: fullResponse,
        wordCount: wordCount,
        done: false
      };
    }

    return { text: fullResponse, wordCount: wordCount, done: true };
  }, { stream: true });

  const send = () => {
    ai.start(input);
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
  };

  return (
    <div className="chat">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}

        {ai.running && (
          <div className="assistant streaming">
            {ai.partial?.text || ''}
            <span className="cursor">▊</span>
          </div>
        )}

        {ai.complete && (
          <div className="assistant">
            {ai.result.text}
          </div>
        )}
      </div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && send()}
      />
    </div>
  );
}
```

---

## Implementation

### Phase 2.1: Client-Side Streaming State

**File**: `src/client-runtime/src/server-task.ts` (enhancements)

```typescript
export class ServerTaskImpl<T> implements ServerTask<T> {
  status: ServerTaskStatus = 'idle';
  progress: number = 0;
  result?: T;
  error?: Error;

  // Streaming props
  streaming: boolean;
  partial?: T;
  chunks: T[] = [];
  chunkCount: number = 0;
  estimatedTotal?: number;

  private _options: ServerTaskOptions;
  private _streamSubscription?: any;

  constructor(
    private taskId: string,
    private componentId: string,
    private signalR: any,
    private context: any,
    options: ServerTaskOptions = {}
  ) {
    this._options = options;
    this.streaming = options.stream || false;
    this.estimatedTotal = options.estimatedChunks;
    this._createPromise();
  }

  start(...args: any[]): void {
    if (this.streaming) {
      this._startStreaming(args);
    } else {
      this._startNormal(args);
    }
  }

  private async _startStreaming(args: any[]): Promise<void> {
    this.status = 'running';
    this.chunks = [];
    this.chunkCount = 0;
    this.partial = undefined;
    this.progress = 0;

    try {
      // Subscribe to streaming channel
      this._streamSubscription = this.signalR.stream(
        'StreamServerTask',
        this.componentId,
        this.taskId,
        args
      ).subscribe({
        next: (chunk: T) => {
          this._handleChunk(chunk);
        },
        error: (err: Error) => {
          this.status = 'error';
          this.error = err;
          this._reject?.(err);
          this._triggerRerender();
        },
        complete: () => {
          this.status = 'complete';
          this.progress = 1.0;

          // Final result is last chunk or accumulated chunks
          this.result = this.partial || this.chunks[this.chunks.length - 1];

          this._resolve?.(this.result!);
          this._triggerRerender();
        }
      });
    } catch (err) {
      this.status = 'error';
      this.error = err as Error;
      this._reject?.(err as Error);
      this._triggerRerender();
    }
  }

  private _handleChunk(chunk: T): void {
    this.chunks.push(chunk);
    this.chunkCount++;

    // Update partial (accumulate or replace based on chunk structure)
    this.partial = this._accumulateChunk(this.partial, chunk);

    // Update progress
    if (this.estimatedTotal) {
      this.progress = Math.min(this.chunkCount / this.estimatedTotal, 0.99);
    }

    // Call user callback
    if (this._options.onChunk) {
      this._options.onChunk(chunk, this.chunkCount - 1);
    }

    // Trigger component re-render to show new chunk
    this._triggerRerender();
  }

  private _accumulateChunk(current: T | undefined, newChunk: T): T {
    if (!current) return newChunk;

    // Smart accumulation based on chunk structure
    if (Array.isArray(newChunk)) {
      return [...(current as any[]), ...newChunk] as T;
    }

    if (typeof newChunk === 'object' && newChunk !== null) {
      // If chunk has 'items' array, accumulate items
      if ('items' in newChunk && Array.isArray((newChunk as any).items)) {
        return {
          ...(current as any),
          ...(newChunk as any),
          items: [
            ...((current as any).items || []),
            ...(newChunk as any).items
          ]
        } as T;
      }

      // If chunk has 'text' string, accumulate text
      if ('text' in newChunk && typeof (newChunk as any).text === 'string') {
        return {
          ...(current as any),
          ...(newChunk as any),
          text: ((current as any).text || '') + (newChunk as any).text
        } as T;
      }

      // Default: merge objects
      return { ...(current as any), ...(newChunk as any) } as T;
    }

    // Default: replace
    return newChunk;
  }

  private _triggerRerender(): void {
    // Trigger Minimact component re-render
    this.context.hintQueue.matchHint(this.context.componentId, {
      [this.taskId]: {
        status: this.status,
        chunkCount: this.chunkCount,
        progress: this.progress
      }
    });
  }

  cancel(): void {
    if (this._streamSubscription) {
      this._streamSubscription.dispose();
    }
    super.cancel();
  }
}
```

### Phase 2.2: Server-Side Streaming Infrastructure

**File**: `src/Minimact.AspNetCore/Core/ServerTaskState.cs` (streaming support)

```csharp
public class ServerTaskState<T>
{
    public bool IsStreaming { get; }
    private Func<IProgress<double>, CancellationToken, IAsyncEnumerable<T>> _streamingTaskFactory;

    public ServerTaskState(
        string taskId,
        Func<IProgress<double>, CancellationToken, Task<T>> taskFactory,
        MinimactComponent component,
        bool streaming = false)
    {
        TaskId = taskId;
        IsStreaming = streaming;

        if (streaming)
        {
            // Will be set separately for streaming tasks
        }
        else
        {
            _taskFactory = taskFactory;
        }

        _component = component;
        Status = ServerTaskStatus.Idle;
    }

    public void SetStreamingFactory(Func<IProgress<double>, CancellationToken, IAsyncEnumerable<T>> factory)
    {
        _streamingTaskFactory = factory;
    }

    public async IAsyncEnumerable<T> StreamAsync([EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (!IsStreaming)
        {
            throw new InvalidOperationException("Task is not configured for streaming");
        }

        Status = ServerTaskStatus.Running;
        StartedAt = DateTime.UtcNow;
        Progress = 0;

        var progress = new Progress<double>(value =>
        {
            Progress = value;
            _component.TriggerRender();
        });

        await foreach (var chunk in _streamingTaskFactory(progress, cancellationToken))
        {
            yield return chunk;

            // Trigger render after each chunk
            _component.TriggerRender();
        }

        Status = ServerTaskStatus.Complete;
        CompletedAt = DateTime.UtcNow;
        Progress = 1.0;
        _component.TriggerRender();
    }
}
```

**File**: `src/Minimact.AspNetCore/SignalR/MiniactHub.cs` (streaming hub method)

```csharp
/// <summary>
/// Stream server task results
/// </summary>
public async IAsyncEnumerable<T> StreamServerTask<T>(
    string componentId,
    string taskId,
    object[] args,
    [EnumeratorCancellation] CancellationToken cancellationToken = default)
{
    var component = _registry.GetComponent(componentId);
    if (component == null)
    {
        throw new InvalidOperationException($"Component {componentId} not found");
    }

    // Get streaming task state
    var taskState = component.GetServerTask<T>(taskId);

    if (!taskState.IsStreaming)
    {
        throw new InvalidOperationException($"Task {taskId} is not configured for streaming");
    }

    // Stream chunks to client
    await foreach (var chunk in taskState.StreamAsync(cancellationToken))
    {
        yield return chunk;
    }
}
```

### Phase 2.3: Babel Transpilation for Generators

**File**: `babel-plugin-minimact/src/server-task-transpiler.js` (generator support)

```javascript
function transpileToCSharp(asyncFn, state) {
  const isGenerator = asyncFn.generator; // async function* detected

  if (isGenerator) {
    // Transpile to IAsyncEnumerable<T>
    state.isStreaming = true;
    return transpileGeneratorToCSharp(asyncFn);
  } else {
    // Regular async Task<T>
    return transpileAsyncToCSharp(asyncFn);
  }
}

function transpileGeneratorToCSharp(asyncFn) {
  let csharpCode = '';

  // Transpile body, replacing 'yield' with C# 'yield return'
  asyncFn.body.body.forEach(statement => {
    if (t.isExpressionStatement(statement) &&
        t.isYieldExpression(statement.expression)) {
      // yield { ... } → yield return new { ... };
      const value = transpileExpression(statement.expression.argument);
      csharpCode += `yield return ${value};\n`;
    } else {
      csharpCode += transpileStatement(statement) + '\n';
    }
  });

  return csharpCode;
}

function emitCSharpMethods(serverTasks, state) {
  serverTasks.forEach(task => {
    const returnType = task.returnType || 'object';
    const signature = task.isStreaming
      ? `private async IAsyncEnumerable<${returnType}> ${capitalize(task.taskId)}([EnumeratorCancellation] CancellationToken cancellationToken = default)`
      : `private async Task<${returnType}> ${capitalize(task.taskId)}(IProgress<double> progress, CancellationToken cancellationToken)`;

    csharpCode += `
[ServerTask("${task.taskId}"${task.isStreaming ? ', Streaming = true' : ''})]
${signature}
{
${indent(task.csharpCode, 4)}
}
`;
  });
}
```

### Phase 2.4: Predictive Templates for Streaming

**File**: `src/src/predictor.rs` (streaming template extraction)

```rust
/// Extract template for streaming task chunk
fn extract_streaming_chunk_template(
    &self,
    state_change: &StateChange,
    chunk_data: &serde_json::Value
) -> Option<Vec<Patch>> {
    // Detect: serverTask_N.chunks changed (new chunk added)

    if !state_change.state_key.contains(".chunks") {
        return None;
    }

    // Extract item template from chunk
    // Example: chunk = { items: [...], page: 1 }

    if let Some(items) = chunk_data.get("items").and_then(|v| v.as_array()) {
        if let Some(first_item) = items.first() {
            // Extract template for list item
            let item_template = self.extract_item_template_from_value(
                first_item,
                &state_change.state_key
            )?;

            // Return AppendTemplate patch (append to existing list)
            return Some(vec![Patch::AppendTemplate {
                path: vec![0], // Root list
                item_template,
                count: items.len()
            }]);
        }
    }

    None
}

pub enum Patch {
    // ... existing patches ...

    /// Append items using template (for streaming)
    AppendTemplate {
        path: Vec<usize>,
        item_template: ItemTemplate,
        count: usize,
    }
}
```

**Client-side application**:

```typescript
// In DOMPatcher.ts
applyPatch(element: HTMLElement, patch: Patch): void {
  switch (patch.type) {
    case 'AppendTemplate':
      // Don't replace entire list - just append new items!
      const container = this.findElement(element, patch.path);

      for (let i = 0; i < patch.count; i++) {
        const itemElement = this.renderTemplate(patch.itemTemplate, i);
        container.appendChild(itemElement); // Smooth append, no layout shift!
      }
      break;

    // ... other patches ...
  }
}
```

---

## Killer Features Breakdown

### ✅ `stream: true` - Declarative Opt-In

```tsx
const task = useServerTask(async function* () {
  yield batch1;
  yield batch2;
}, { stream: true }); // ← Just add this!
```

**How it works**:
- Babel detects `async function*` generator
- Transpiles to `IAsyncEnumerable<T>` in C#
- SignalR uses streaming hub method
- Client accumulates chunks automatically

### ✅ `.partial` Prop - Access Chunks as They Arrive

```tsx
{task.partial?.items.map(item => <Item data={item} />)}
```

**Smart accumulation**:
- Arrays: Concatenate
- Objects with `items`: Merge items arrays
- Objects with `text`: Concatenate strings
- Custom: Define accumulator function

### ✅ `.progress` Prop - Percent Completion

```tsx
<progress value={task.progress} max={1} />
{Math.round(task.progress * 100)}%
```

**Progress calculation**:
```typescript
// If estimatedTotal provided:
progress = chunkCount / estimatedTotal

// If chunk includes progress field:
progress = chunk.progress

// Otherwise:
progress = 0 (indeterminate)
```

### ✅ DOM Patching Per Chunk - Only Update What's New

```rust
Patch::AppendTemplate {
  path: vec![0],
  item_template: ListItem,
  count: newItems.len()
}
```

**No re-render. Just append.**

### ✅ Predictive Templates Per Batch - No Layout Shifts

**First chunk**: Extract template
```rust
// User gets batch 1
Predictor learns: "Chunk N → Append 100 <li> items"
Template: <li>{item.title}</li>
```

**Second chunk**: Instant prediction
```rust
// User gets batch 2
Predictor predicts: "Append 100 more <li> items"
Client: Appends instantly using cached template (0ms latency!)
Server: Confirms with actual patches
```

**Result**: Buttery smooth scrolling, zero layout shifts

### ✅ Final `.result` When Complete

```tsx
{task.complete && (
  <p>Total results: {task.result.totalCount}</p>
)}
```

**Streaming task returns final value**:
```typescript
async function* search() {
  yield batch1;
  yield batch2;
  return { totalCount: 200, completed: true }; // ← Final result
}
```

### ✅ Error Boundaries for Partial Results

```tsx
{task.failed && (
  <div>
    <p>Error after {task.chunkCount} chunks: {task.error.message}</p>
    <button onClick={task.retry}>Retry from beginning</button>

    {/* Show partial results even on error! */}
    {task.chunks.length > 0 && (
      <div className="partial-results">
        <h3>Partial Results (before error):</h3>
        {task.chunks.flatMap(c => c.items).map(item => (
          <Item key={item.id} data={item} />
        ))}
      </div>
    )}
  </div>
)}
```

### ✅ Progressive Memory Use - Avoid Client-Side Spikes

**Problem**: Loading 10,000 items at once = 50MB spike in memory

**Solution**: Stream 100 items at a time
```tsx
const load = useServerTask(async function* () {
  for (let i = 0; i < 100; i++) {
    yield await fetchBatch(i); // 100 items

    // Optional: Clear old chunks to save memory
    if (i > 10) {
      clearOldChunks(i - 10);
    }
  }
}, {
  stream: true,
  maxChunksInMemory: 10 // Keep only last 10 chunks
});
```

**Memory graph**:
```
Without streaming: 0 → 50MB (instant spike)
With streaming:    0 → 5MB → 10MB → 15MB → 10MB (stabilizes)
```

---

## Performance Comparison

### Before (Traditional Loading)

```tsx
const search = useServerTask(async (query) => {
  return await searchAllResults(query); // Wait 5 seconds
});

// Timeline:
// 0ms: User clicks search
// 0-5000ms: Loading spinner 🌀
// 5000ms: All 1000 results appear (layout shift!)
```

**User experience**: 😴 Wait 5 seconds, then sudden flood of content

### After (Streaming)

```tsx
const search = useServerTask(async function* (query) {
  for (let page = 0; page < 10; page++) {
    yield await searchPage(query, page);
  }
}, { stream: true });

// Timeline:
// 0ms: User clicks search
// 200ms: First 100 results appear ✨
// 400ms: Next 100 results append ✨
// 600ms: Next 100 results append ✨
// ... smooth progression
// 2000ms: All 1000 results loaded
```

**User experience**: 🚀 Content starts flowing immediately, smooth additions

---

## Real-World Use Cases

### 1. Infinite Scroll Search

```tsx
const search = useServerTask(async function* (query: string) {
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await searchAPI(query, page++);
    hasMore = batch.hasMore;
    yield batch;
  }
}, { stream: true });

// Renders results as they stream in
```

### 2. Large File Upload with Processing

```tsx
const upload = useServerTask(async function* (file: File) {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    await uploadChunk(chunk);

    yield {
      uploaded: (i + 1) * chunkSize,
      total: file.size,
      progress: (i + 1) / totalChunks
    };
  }

  return { fileId: '...', url: '...' };
}, { stream: true });
```

### 3. Real-Time Log Streaming

```tsx
const logs = useServerTask(async function* () {
  const logStream = await connectToLogServer();

  for await (const logLine of logStream) {
    yield { line: logLine, timestamp: Date.now() };
  }
}, { stream: true });

// Auto-scrolling log viewer
useEffect(() => {
  if (logs.running) {
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}, [logs.chunkCount]);
```

### 4. AI Text Generation

```tsx
const ai = useServerTask(async function* (prompt: string) {
  const stream = await openai.completions.create({
    prompt,
    stream: true
  });

  let fullText = '';
  for await (const chunk of stream) {
    fullText += chunk.choices[0].text;
    yield { text: fullText };
  }

  return { text: fullText, tokens: fullText.split(' ').length };
}, { stream: true });

// Shows text as it's generated (like ChatGPT)
```

---

## Implementation Checklist

### Phase 2.1: Client Streaming ✅
- [ ] Add `streaming`, `partial`, `chunks` to `ServerTask` interface
- [ ] Implement `_startStreaming()` in `ServerTaskImpl`
- [ ] Implement chunk accumulation logic
- [ ] Add `onChunk` callback support
- [ ] Add progress calculation from chunks

### Phase 2.2: Server Streaming ✅
- [ ] Add `IsStreaming` to `ServerTaskState`
- [ ] Implement `StreamAsync()` method
- [ ] Add `StreamServerTask<T>()` hub method
- [ ] Add `[EnumeratorCancellation]` support

### Phase 2.3: Babel Generator Support ✅
- [ ] Detect `async function*` generators
- [ ] Transpile `yield` → `yield return`
- [ ] Generate `IAsyncEnumerable<T>` signature
- [ ] Add `Streaming = true` to attribute

### Phase 2.4: Predictive Streaming ✅
- [ ] Add `Patch::AppendTemplate` to Rust
- [ ] Implement streaming chunk template extraction
- [ ] Implement client-side append patching (no re-render)
- [ ] Test: Second batch uses cached template

### Phase 2.5: Memory Management ✅
- [ ] Add `maxChunksInMemory` option
- [ ] Implement chunk cleanup for long streams
- [ ] Add virtual scrolling integration
- [ ] Test: Memory stays bounded during infinite scroll

---

## Success Metrics

**Performance**:
- ✅ First content visible in <200ms (vs 5s for full load)
- ✅ Smooth 60fps scrolling during streaming
- ✅ Zero layout shifts between chunks
- ✅ Memory usage stays bounded (<50MB for infinite streams)

**Developer Experience**:
- ✅ Write `async function*` in TypeScript
- ✅ Automatically transpiled to C# `IAsyncEnumerable`
- ✅ Declarative `stream: true` opt-in
- ✅ Smart `.partial` accumulation (no manual merging)

**User Experience**:
- ✅ Content starts flowing immediately
- ✅ No loading spinners (progressive content)
- ✅ Smooth additions (no jumps)
- ✅ Partial results visible even on error

---

## Future Enhancements

### Phase 2.6: Bidirectional Streaming

```tsx
const chat = useServerTask(async function* (userMessage: string) {
  const stream = await openai.chat.stream(userMessage);

  for await (const chunk of stream) {
    yield chunk;

    // User can interrupt mid-stream
    if (task.interrupted) {
      await stream.cancel();
      break;
    }
  }
}, { stream: true, interruptible: true });

// User can stop generation
<button onClick={() => chat.interrupt()}>Stop Generating</button>
```

### Phase 2.7: Chunk Priorities

```tsx
const load = useServerTask(async function* () {
  yield { priority: 'high', data: aboveTheFold }; // Render first
  yield { priority: 'medium', data: visible };
  yield { priority: 'low', data: belowTheFold };
}, { stream: true, respectPriority: true });
```

### Phase 2.8: Optimistic Streaming

```tsx
// Predict next chunk while waiting
const search = useServerTask(async function* (query) {
  yield batch1;
  // Predictor: "Based on query pattern, batch2 will have X items"
  // Client: Shows skeleton for predicted items
  yield batch2; // Replaces skeleton with real data
}, { stream: true, optimistic: true });
```

---

## Conclusion

Streaming transforms `useServerTask` from **"load then show"** to **"show as you load"**.

**Before**: Wait → Spinner → Content (5s delay)
**After**: Content → Content → Content (200ms to first paint)

**Result**: **Perceived performance × 10**, zero layout shifts, bounded memory, buttery smooth UX.

🔥 **Let's ship streaming!**
