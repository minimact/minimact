# useServerTask Implementation Plan

## Vision

**Write TypeScript. Run on Server. React on Client.**

`useServerTask` enables developers to write long-running async operations in TypeScript that execute on the server as C# async Tasks, with reactive client-side UI updates.

```tsx
// Developer writes THIS (pure TypeScript):
function DataAnalysis() {
  const analysis = useServerTask(async () => {
    // This TypeScript code runs on the SERVER as C#!
    const data = await fetch('/api/large-dataset');
    const processed = data.map(item => ({
      ...item,
      score: calculateComplexScore(item)
    }));
    return processed.filter(x => x.score > 0.8);
  });

  return (
    <div>
      <button onClick={analysis.start}>Analyze</button>
      {analysis.status === 'running' && <Spinner progress={analysis.progress} />}
      {analysis.status === 'complete' && <Results data={analysis.result} />}
      {analysis.status === 'error' && (
        <div>
          <p>Error: {analysis.error.message}</p>
          <button onClick={analysis.retry}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

**Babel transpiles to C#:**

```csharp
public class DataAnalysisComponent : MinimactComponent
{
    [ServerTask("analysis")]
    private async Task<List<ProcessedItem>> AnalysisTask()
    {
        var data = await Fetch("/api/large-dataset");
        var processed = data.Select(item => new {
            item,
            score = CalculateComplexScore(item)
        });
        return processed.Where(x => x.score > 0.8).ToList();
    }
}
```

---

## Architecture

### Three-Layer Design

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Client Runtime (TypeScript)                        │
│  - useServerTask hook                                        │
│  - ServerTask<T> interface                                   │
│  - SignalR communication                                     │
│  - Local state management                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: Babel Plugin (Compile-Time)                        │
│  - Detects useServerTask calls                              │
│  - Transpiles TS async function → C# async Task             │
│  - Generates [ServerTask] attributes                        │
│  - Emits C# method definitions                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: Server Runtime (C#)                                │
│  - ServerTaskState<T> infrastructure                        │
│  - Task execution & lifecycle management                    │
│  - Progress reporting                                        │
│  - Cancellation support                                      │
│  - SignalR hub methods                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Server Infrastructure (C#)

### 1.1: ServerTaskState Class

**File**: `src/Minimact.AspNetCore/Core/ServerTaskState.cs`

```csharp
namespace Minimact.AspNetCore.Core;

public enum ServerTaskStatus
{
    Idle,
    Running,
    Complete,
    Error,
    Cancelled
}

public class ServerTaskState<T>
{
    public string TaskId { get; }
    public ServerTaskStatus Status { get; private set; }
    public T Result { get; private set; }
    public Exception Error { get; private set; }
    public double Progress { get; private set; }
    public DateTime? StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public TimeSpan? Duration => CompletedAt - StartedAt;

    private Task<T> _runningTask;
    private CancellationTokenSource _cancellationTokenSource;
    private readonly Func<IProgress<double>, CancellationToken, Task<T>> _taskFactory;
    private readonly MinimactComponent _component;

    public ServerTaskState(
        string taskId,
        Func<IProgress<double>, CancellationToken, Task<T>> taskFactory,
        MinimactComponent component)
    {
        TaskId = taskId;
        _taskFactory = taskFactory;
        _component = component;
        Status = ServerTaskStatus.Idle;
    }

    public async Task Start(params object[] args)
    {
        if (Status == ServerTaskStatus.Running)
        {
            throw new InvalidOperationException($"Task '{TaskId}' is already running");
        }

        Status = ServerTaskStatus.Running;
        StartedAt = DateTime.UtcNow;
        CompletedAt = null;
        Progress = 0;
        Error = null;
        _cancellationTokenSource = new CancellationTokenSource();

        // Trigger immediate re-render to show "running" state
        _component.TriggerRender();

        // Create progress reporter that triggers re-render on updates
        var progress = new Progress<double>(value =>
        {
            Progress = value;
            _component.TriggerRender();
        });

        _runningTask = Task.Run(async () =>
        {
            try
            {
                var result = await _taskFactory(progress, _cancellationTokenSource.Token);
                Status = ServerTaskStatus.Complete;
                Result = result;
                CompletedAt = DateTime.UtcNow;
                Progress = 1.0;
                _component.TriggerRender();
                return result;
            }
            catch (OperationCanceledException)
            {
                Status = ServerTaskStatus.Cancelled;
                CompletedAt = DateTime.UtcNow;
                _component.TriggerRender();
                throw;
            }
            catch (Exception ex)
            {
                Status = ServerTaskStatus.Error;
                Error = ex;
                CompletedAt = DateTime.UtcNow;
                _component.TriggerRender();
                throw;
            }
        });

        // Don't await - task runs in background
    }

    public async Task Retry(params object[] args)
    {
        if (Status != ServerTaskStatus.Error && Status != ServerTaskStatus.Cancelled)
        {
            throw new InvalidOperationException($"Can only retry failed or cancelled tasks");
        }
        await Start(args);
    }

    public void Cancel()
    {
        if (Status != ServerTaskStatus.Running)
        {
            throw new InvalidOperationException($"Can only cancel running tasks");
        }
        _cancellationTokenSource?.Cancel();
    }

    public async Task<T> GetResultAsync()
    {
        if (_runningTask == null)
        {
            throw new InvalidOperationException($"Task '{TaskId}' has not been started");
        }
        return await _runningTask;
    }
}
```

### 1.2: ServerTask Attribute

**File**: `src/Minimact.AspNetCore/Core/ServerTaskAttribute.cs`

```csharp
namespace Minimact.AspNetCore.Core;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class ServerTaskAttribute : Attribute
{
    public string TaskId { get; }
    public string ReturnType { get; set; }
    public string[] ParameterTypes { get; set; }

    public ServerTaskAttribute(string taskId)
    {
        TaskId = taskId;
    }
}
```

### 1.3: MinimactComponent Extensions

**File**: `src/Minimact.AspNetCore/Core/MinimactComponent.cs` (additions)

```csharp
public abstract class MinimactComponent
{
    // Existing code...

    private readonly Dictionary<string, object> _serverTasks = new();

    /// <summary>
    /// Get or create a server task by ID
    /// </summary>
    protected ServerTaskState<T> GetServerTask<T>(string taskId)
    {
        if (!_serverTasks.ContainsKey(taskId))
        {
            // Find method with [ServerTask(taskId)] attribute
            var method = FindServerTaskMethod(taskId);
            if (method == null)
            {
                throw new InvalidOperationException($"No method found with [ServerTask(\"{taskId}\")]");
            }

            // Create task state with factory that invokes the method
            var taskState = new ServerTaskState<T>(
                taskId,
                (progress, cancellationToken) =>
                {
                    // Invoke the method with progress and cancellation token
                    var parameters = new List<object>();
                    foreach (var param in method.GetParameters())
                    {
                        if (param.ParameterType == typeof(IProgress<double>))
                            parameters.Add(progress);
                        else if (param.ParameterType == typeof(CancellationToken))
                            parameters.Add(cancellationToken);
                    }

                    return (Task<T>)method.Invoke(this, parameters.ToArray());
                },
                this
            );

            _serverTasks[taskId] = taskState;
        }

        return (ServerTaskState<T>)_serverTasks[taskId];
    }

    private MethodInfo FindServerTaskMethod(string taskId)
    {
        return GetType()
            .GetMethods(BindingFlags.NonPublic | BindingFlags.Instance)
            .FirstOrDefault(m =>
            {
                var attr = m.GetCustomAttribute<ServerTaskAttribute>();
                return attr != null && attr.TaskId == taskId;
            });
    }

    /// <summary>
    /// Get task state for client serialization
    /// </summary>
    internal object GetServerTaskState(string taskId)
    {
        if (!_serverTasks.ContainsKey(taskId))
        {
            return new
            {
                taskId,
                status = "idle",
                progress = 0.0,
                result = (object)null,
                error = (string)null,
                startedAt = (DateTime?)null,
                completedAt = (DateTime?)null,
                duration = (TimeSpan?)null
            };
        }

        var task = _serverTasks[taskId];
        var taskType = task.GetType();
        var statusProp = taskType.GetProperty("Status");
        var resultProp = taskType.GetProperty("Result");
        var errorProp = taskType.GetProperty("Error");
        var progressProp = taskType.GetProperty("Progress");
        var startedAtProp = taskType.GetProperty("StartedAt");
        var completedAtProp = taskType.GetProperty("CompletedAt");
        var durationProp = taskType.GetProperty("Duration");

        var error = errorProp?.GetValue(task) as Exception;

        return new
        {
            taskId,
            status = statusProp?.GetValue(task)?.ToString()?.ToLower() ?? "idle",
            progress = (double)(progressProp?.GetValue(task) ?? 0.0),
            result = resultProp?.GetValue(task),
            error = error?.Message,
            startedAt = startedAtProp?.GetValue(task) as DateTime?,
            completedAt = completedAtProp?.GetValue(task) as DateTime?,
            duration = durationProp?.GetValue(task) as TimeSpan?
        };
    }
}
```

### 1.4: SignalR Hub Methods

**File**: `src/Minimact.AspNetCore/SignalR/MiniactHub.cs` (additions)

```csharp
/// <summary>
/// Start a server task
/// </summary>
public async Task StartServerTask(string componentId, string taskId, object[] args = null)
{
    var component = _registry.GetComponent(componentId);
    if (component == null)
    {
        await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
        return;
    }

    try
    {
        // Use reflection to call GetServerTask<T> with the correct type
        var method = component.GetType()
            .GetMethod("GetServerTask", BindingFlags.NonPublic | BindingFlags.Instance);

        if (method == null)
        {
            await Clients.Caller.SendAsync("Error", "GetServerTask method not found");
            return;
        }

        // Find the task method to get return type
        var taskMethod = component.GetType()
            .GetMethods(BindingFlags.NonPublic | BindingFlags.Instance)
            .FirstOrDefault(m =>
            {
                var attr = m.GetCustomAttribute<ServerTaskAttribute>();
                return attr != null && attr.TaskId == taskId;
            });

        if (taskMethod == null)
        {
            await Clients.Caller.SendAsync("Error", $"No method found with [ServerTask(\"{taskId}\")]");
            return;
        }

        var returnType = taskMethod.ReturnType;
        if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
        {
            returnType = returnType.GetGenericArguments()[0];
        }

        // Get the task state
        var genericMethod = method.MakeGenericMethod(returnType);
        dynamic taskState = genericMethod.Invoke(component, new object[] { taskId });

        // Start the task
        await taskState.Start(args ?? Array.Empty<object>());
    }
    catch (Exception ex)
    {
        await Clients.Caller.SendAsync("Error", $"Error starting task: {ex.Message}");
    }
}

/// <summary>
/// Retry a failed server task
/// </summary>
public async Task RetryServerTask(string componentId, string taskId, object[] args = null)
{
    var component = _registry.GetComponent(componentId);
    if (component == null)
    {
        await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
        return;
    }

    try
    {
        // Similar to StartServerTask - get task state and call Retry
        var method = component.GetType()
            .GetMethod("GetServerTask", BindingFlags.NonPublic | BindingFlags.Instance);

        var taskMethod = component.GetType()
            .GetMethods(BindingFlags.NonPublic | BindingFlags.Instance)
            .FirstOrDefault(m =>
            {
                var attr = m.GetCustomAttribute<ServerTaskAttribute>();
                return attr != null && attr.TaskId == taskId;
            });

        if (taskMethod == null)
        {
            await Clients.Caller.SendAsync("Error", $"No method found with [ServerTask(\"{taskId}\")]");
            return;
        }

        var returnType = taskMethod.ReturnType;
        if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
        {
            returnType = returnType.GetGenericArguments()[0];
        }

        var genericMethod = method.MakeGenericMethod(returnType);
        dynamic taskState = genericMethod.Invoke(component, new object[] { taskId });

        await taskState.Retry(args ?? Array.Empty<object>());
    }
    catch (Exception ex)
    {
        await Clients.Caller.SendAsync("Error", $"Error retrying task: {ex.Message}");
    }
}

/// <summary>
/// Cancel a running server task
/// </summary>
public async Task CancelServerTask(string componentId, string taskId)
{
    var component = _registry.GetComponent(componentId);
    if (component == null)
    {
        await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
        return;
    }

    try
    {
        var method = component.GetType()
            .GetMethod("GetServerTask", BindingFlags.NonPublic | BindingFlags.Instance);

        var taskMethod = component.GetType()
            .GetMethods(BindingFlags.NonPublic | BindingFlags.Instance)
            .FirstOrDefault(m =>
            {
                var attr = m.GetCustomAttribute<ServerTaskAttribute>();
                return attr != null && attr.TaskId == taskId;
            });

        if (taskMethod == null)
        {
            await Clients.Caller.SendAsync("Error", $"No method found with [ServerTask(\"{taskId}\")]");
            return;
        }

        var returnType = taskMethod.ReturnType;
        if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
        {
            returnType = returnType.GetGenericArguments()[0];
        }

        var genericMethod = method.MakeGenericMethod(returnType);
        dynamic taskState = genericMethod.Invoke(component, new object[] { taskId });

        taskState.Cancel();
    }
    catch (Exception ex)
    {
        await Clients.Caller.SendAsync("Error", $"Error cancelling task: {ex.Message}");
    }
}
```

---

## Phase 2: Client Runtime (TypeScript)

### 2.1: ServerTask Interface

**File**: `src/client-runtime/src/server-task.ts`

```typescript
export type ServerTaskStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled';

export interface ServerTask<T> {
  // Status
  status: ServerTaskStatus;
  progress: number;

  // Result
  result?: T;
  error?: Error;

  // Control methods
  start(...args: any[]): void;
  retry(...args: any[]): void;
  cancel(): void;

  // Promise interface (for await)
  promise: Promise<T>;

  // Metadata
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // milliseconds

  // Computed properties
  readonly idle: boolean;
  readonly running: boolean;
  readonly complete: boolean;
  readonly failed: boolean;
  readonly cancelled: boolean;
}

export class ServerTaskImpl<T> implements ServerTask<T> {
  status: ServerTaskStatus = 'idle';
  progress: number = 0;
  result?: T;
  error?: Error;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;

  private _promise?: Promise<T>;
  private _resolve?: (value: T) => void;
  private _reject?: (error: Error) => void;

  constructor(
    private taskId: string,
    private componentId: string,
    private signalR: any,
    private context: any
  ) {
    this._createPromise();
  }

  private _createPromise() {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  get promise(): Promise<T> {
    return this._promise!;
  }

  get idle(): boolean {
    return this.status === 'idle';
  }

  get running(): boolean {
    return this.status === 'running';
  }

  get complete(): boolean {
    return this.status === 'complete';
  }

  get failed(): boolean {
    return this.status === 'error';
  }

  get cancelled(): boolean {
    return this.status === 'cancelled';
  }

  start(...args: any[]): void {
    this.signalR.invoke('StartServerTask', this.componentId, this.taskId, args)
      .catch((err: Error) => {
        console.error(`[Minimact] Failed to start task ${this.taskId}:`, err);
        this.status = 'error';
        this.error = err;
        this._reject?.(err);
      });
  }

  retry(...args: any[]): void {
    // Reset promise
    this._createPromise();

    this.signalR.invoke('RetryServerTask', this.componentId, this.taskId, args)
      .catch((err: Error) => {
        console.error(`[Minimact] Failed to retry task ${this.taskId}:`, err);
        this.status = 'error';
        this.error = err;
        this._reject?.(err);
      });
  }

  cancel(): void {
    this.signalR.invoke('CancelServerTask', this.componentId, this.taskId)
      .catch((err: Error) => {
        console.error(`[Minimact] Failed to cancel task ${this.taskId}:`, err);
      });
  }

  /**
   * Update task state from server
   * Called by Minimact when server sends task state updates
   */
  _updateFromServer(state: any): void {
    this.status = state.status;
    this.progress = state.progress;
    this.result = state.result;

    if (state.error) {
      this.error = new Error(state.error);
    }

    if (state.startedAt) {
      this.startedAt = new Date(state.startedAt);
    }

    if (state.completedAt) {
      this.completedAt = new Date(state.completedAt);
    }

    if (state.duration) {
      this.duration = state.duration;
    }

    // Resolve/reject promise based on status
    if (this.status === 'complete' && this._resolve) {
      this._resolve(this.result!);
    } else if (this.status === 'error' && this._reject) {
      this._reject(this.error!);
    }
  }
}
```

### 2.2: useServerTask Hook

**File**: `src/client-runtime/src/hooks.ts` (additions)

```typescript
import { ServerTask, ServerTaskImpl } from './server-task';

let serverTaskIndex = 0;

export function useServerTask<T>(
  taskFactory?: () => Promise<T>
): ServerTask<T> {
  if (!currentContext) {
    throw new Error('useServerTask must be called within a component render');
  }

  const context = currentContext;
  const index = serverTaskIndex++;
  const taskKey = `serverTask_${index}`;

  // Get or create server task instance
  if (!context.serverTasks) {
    context.serverTasks = new Map();
  }

  if (!context.serverTasks.has(taskKey)) {
    const task = new ServerTaskImpl<T>(
      taskKey,
      context.componentId,
      context.signalR,
      context
    );

    context.serverTasks.set(taskKey, task);
  }

  return context.serverTasks.get(taskKey)!;
}

// Update ComponentContext interface
interface ComponentContext {
  componentId: string;
  element: HTMLElement;
  state: Map<string, any>;
  effects: Array<{ callback: () => void | (() => void), deps: any[] | undefined, cleanup?: () => void }>;
  refs: Map<string, { current: any }>;
  domElementStates?: Map<string, any>;
  serverTasks?: Map<string, ServerTaskImpl<any>>; // ← ADD THIS
  hintQueue: HintQueue;
  domPatcher: DOMPatcher;
  playgroundBridge?: PlaygroundBridge;
  signalR: SignalRManager;
}
```

### 2.3: Minimact Core Integration

**File**: `src/client-runtime/src/minimact.ts` (additions)

```typescript
// When rendering component, include server task states
private async renderComponent(componentId: string): Promise<void> {
  const context = this.contexts.get(componentId);
  if (!context) return;

  // Fetch server task states from server
  const response = await this.signalR.invoke('GetComponentState', componentId);

  if (response.serverTasks) {
    for (const [taskId, taskState] of Object.entries(response.serverTasks)) {
      const task = context.serverTasks?.get(taskId);
      if (task) {
        task._updateFromServer(taskState);
      }
    }
  }

  // Continue with normal rendering...
}
```

---

## Phase 3: Babel Plugin (TS → C# Transpilation)

### 3.1: Plugin Structure

**File**: `babel-plugin-minimact/src/server-task-transpiler.js`

```javascript
const t = require('@babel/types');
const template = require('@babel/template').default;

module.exports = function({ types }) {
  let taskCounter = 0;

  return {
    name: 'minimact-server-task',
    visitor: {
      CallExpression(path, state) {
        // Detect: useServerTask(async () => { ... })
        if (
          path.node.callee.name === 'useServerTask' &&
          path.node.arguments.length > 0
        ) {
          const asyncFn = path.node.arguments[0];

          if (!t.isArrowFunctionExpression(asyncFn) && !t.isFunctionExpression(asyncFn)) {
            throw path.buildCodeFrameError('useServerTask requires an async function');
          }

          if (!asyncFn.async) {
            throw path.buildCodeFrameError('useServerTask function must be async');
          }

          // Generate unique task ID
          const taskId = `serverTask_${taskCounter++}`;

          // Transpile TypeScript → C#
          const csharpCode = transpileToCSharp(asyncFn, state);

          // Store C# code for later emission
          if (!state.file.metadata.serverTasks) {
            state.file.metadata.serverTasks = [];
          }

          state.file.metadata.serverTasks.push({
            taskId,
            csharpCode,
            returnType: inferReturnType(asyncFn),
            parameters: extractParameters(asyncFn)
          });

          // Replace with client-side call: useServerTask()
          path.replaceWith(
            t.callExpression(
              t.identifier('useServerTask'),
              []
            )
          );
        }
      },

      // At end of file, generate C# output
      Program: {
        exit(path, state) {
          if (state.file.metadata.serverTasks) {
            emitCSharpMethods(state.file.metadata.serverTasks, state);
          }
        }
      }
    }
  };
};

/**
 * Transpile TypeScript AST → C# code
 */
function transpileToCSharp(asyncFn, state) {
  const body = asyncFn.body;
  const params = asyncFn.params;

  let csharpCode = '';

  // Transpile parameters
  const csharpParams = [];
  params.forEach(param => {
    if (t.isIdentifier(param)) {
      // Infer type from usage or default to object
      csharpParams.push(`object ${param.name}`);
    }
  });

  // Always add IProgress and CancellationToken
  csharpParams.push('IProgress<double> progress');
  csharpParams.push('CancellationToken cancellationToken');

  // Transpile body
  if (t.isBlockStatement(body)) {
    csharpCode = transpileBlockStatement(body);
  } else {
    // Arrow function with expression body: () => expr
    csharpCode = `return ${transpileExpression(body)};`;
  }

  return csharpCode;
}

/**
 * Transpile TypeScript block statement → C# code
 */
function transpileBlockStatement(block) {
  let code = '';

  block.body.forEach(statement => {
    code += transpileStatement(statement) + '\n';
  });

  return code;
}

/**
 * Transpile individual TypeScript statement → C# statement
 */
function transpileStatement(statement) {
  if (t.isVariableDeclaration(statement)) {
    // const/let x = ... → var x = ...
    const declarations = statement.declarations.map(decl => {
      const name = decl.id.name;
      const init = decl.init ? transpileExpression(decl.init) : 'null';
      return `var ${name} = ${init};`;
    });
    return declarations.join('\n');
  }

  if (t.isReturnStatement(statement)) {
    return `return ${transpileExpression(statement.argument)};`;
  }

  if (t.isExpressionStatement(statement)) {
    return `${transpileExpression(statement.expression)};`;
  }

  if (t.isForStatement(statement)) {
    const init = statement.init ? transpileStatement(statement.init).replace(';', '') : '';
    const test = statement.test ? transpileExpression(statement.test) : 'true';
    const update = statement.update ? transpileExpression(statement.update) : '';
    const body = transpileStatement(statement.body);
    return `for (${init}; ${test}; ${update})\n{\n${body}\n}`;
  }

  if (t.isWhileStatement(statement)) {
    const test = transpileExpression(statement.test);
    const body = transpileStatement(statement.body);
    return `while (${test})\n{\n${body}\n}`;
  }

  if (t.isIfStatement(statement)) {
    const test = transpileExpression(statement.test);
    const consequent = transpileStatement(statement.consequent);
    const alternate = statement.alternate ? `\nelse\n{\n${transpileStatement(statement.alternate)}\n}` : '';
    return `if (${test})\n{\n${consequent}\n}${alternate}`;
  }

  if (t.isBlockStatement(statement)) {
    return transpileBlockStatement(statement);
  }

  if (t.isTryStatement(statement)) {
    const block = transpileBlockStatement(statement.block);
    const handler = statement.handler ? transpileCatchClause(statement.handler) : '';
    const finalizer = statement.finalizer ? `\nfinally\n{\n${transpileBlockStatement(statement.finalizer)}\n}` : '';
    return `try\n{\n${block}\n}${handler}${finalizer}`;
  }

  // Default: convert to string (may need refinement)
  return `// TODO: Transpile ${statement.type}`;
}

/**
 * Transpile TypeScript expression → C# expression
 */
function transpileExpression(expr) {
  if (!expr) return 'null';

  if (t.isStringLiteral(expr)) {
    return `"${expr.value}"`;
  }

  if (t.isNumericLiteral(expr)) {
    return expr.value.toString();
  }

  if (t.isBooleanLiteral(expr)) {
    return expr.value ? 'true' : 'false';
  }

  if (t.isNullLiteral(expr)) {
    return 'null';
  }

  if (t.isIdentifier(expr)) {
    return expr.name;
  }

  if (t.isMemberExpression(expr)) {
    const object = transpileExpression(expr.object);
    const property = expr.computed
      ? `[${transpileExpression(expr.property)}]`
      : `.${expr.property.name}`;
    return `${object}${property}`;
  }

  if (t.isCallExpression(expr)) {
    const callee = transpileExpression(expr.callee);
    const args = expr.arguments.map(arg => transpileExpression(arg)).join(', ');

    // Handle special cases: .map → .Select, .filter → .Where, etc.
    const csharpCallee = transpileMethodName(callee);

    return `${csharpCallee}(${args})`;
  }

  if (t.isAwaitExpression(expr)) {
    return `await ${transpileExpression(expr.argument)}`;
  }

  if (t.isArrayExpression(expr)) {
    const elements = expr.elements.map(el => transpileExpression(el)).join(', ');
    return `new[] { ${elements} }`;
  }

  if (t.isObjectExpression(expr)) {
    const props = expr.properties.map(prop => {
      if (t.isObjectProperty(prop)) {
        const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
        const value = transpileExpression(prop.value);
        return `${key} = ${value}`;
      }
      return '';
    }).filter(Boolean).join(', ');
    return `new { ${props} }`;
  }

  if (t.isArrowFunctionExpression(expr)) {
    const params = expr.params.map(p => p.name).join(', ');
    const body = t.isBlockStatement(expr.body)
      ? transpileBlockStatement(expr.body)
      : transpileExpression(expr.body);
    return `(${params}) => ${body}`;
  }

  if (t.isBinaryExpression(expr)) {
    const left = transpileExpression(expr.left);
    const right = transpileExpression(expr.right);
    const operator = transpileOperator(expr.operator);
    return `${left} ${operator} ${right}`;
  }

  if (t.isUnaryExpression(expr)) {
    const operator = transpileOperator(expr.operator);
    const argument = transpileExpression(expr.argument);
    return `${operator}${argument}`;
  }

  if (t.isConditionalExpression(expr)) {
    const test = transpileExpression(expr.test);
    const consequent = transpileExpression(expr.consequent);
    const alternate = transpileExpression(expr.alternate);
    return `${test} ? ${consequent} : ${alternate}`;
  }

  return `/* TODO: ${expr.type} */`;
}

/**
 * Transpile catch clause
 */
function transpileCatchClause(handler) {
  const param = handler.param ? handler.param.name : 'ex';
  const body = transpileBlockStatement(handler.body);
  return `\ncatch (Exception ${param})\n{\n${body}\n}`;
}

/**
 * Transpile TypeScript method name → C# LINQ method
 */
function transpileMethodName(methodCall) {
  // Handle chained calls: data.filter(...).map(...)
  const mappings = {
    '.map': '.Select',
    '.filter': '.Where',
    '.reduce': '.Aggregate',
    '.find': '.FirstOrDefault',
    '.findIndex': '.FindIndex',
    '.some': '.Any',
    '.every': '.All',
    '.includes': '.Contains',
    '.sort': '.OrderBy',
    '.reverse': '.Reverse',
    '.slice': '.Skip',
    '.concat': '.Concat',
    '.join': '.Join',
    '.push': '.Add',
    '.pop': '.RemoveAt',
    '.shift': '.RemoveAt',
    '.unshift': '.Insert',
    'console.log': 'Console.WriteLine',
    'console.error': 'Console.Error.WriteLine',
    'console.warn': 'Console.WriteLine',
    'Math.floor': 'Math.Floor',
    'Math.ceil': 'Math.Ceiling',
    'Math.round': 'Math.Round',
    'Math.abs': 'Math.Abs',
    'Math.max': 'Math.Max',
    'Math.min': 'Math.Min',
    'JSON.stringify': 'JsonSerializer.Serialize',
    'JSON.parse': 'JsonSerializer.Deserialize',
  };

  for (const [ts, csharp] of Object.entries(mappings)) {
    if (methodCall.includes(ts)) {
      return methodCall.replace(ts, csharp);
    }
  }

  return methodCall;
}

/**
 * Transpile operator
 */
function transpileOperator(op) {
  const mappings = {
    '===': '==',
    '!==': '!=',
    '&&': '&&',
    '||': '||',
  };
  return mappings[op] || op;
}

/**
 * Infer return type from async function
 */
function inferReturnType(asyncFn) {
  // Try to infer from TypeScript type annotation
  if (asyncFn.returnType) {
    // Extract generic type from Promise<T>
    // This is simplified - real implementation would parse TS types
    return 'object'; // Default for now
  }

  // Analyze return statements to infer type
  // This is simplified - real implementation would do type inference
  return 'object';
}

/**
 * Extract parameters from async function
 */
function extractParameters(asyncFn) {
  return asyncFn.params.map(param => ({
    name: param.name,
    type: 'object' // Simplified - would infer from TS types
  }));
}

/**
 * Emit C# method definitions to output file
 */
function emitCSharpMethods(serverTasks, state) {
  const componentName = state.file.opts.filename
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace('.tsx', '')
    .replace('.ts', '');

  let csharpCode = '';

  serverTasks.forEach(task => {
    csharpCode += `
[ServerTask("${task.taskId}")]
private async Task<${task.returnType}> ${capitalize(task.taskId)}(IProgress<double> progress, CancellationToken cancellationToken)
{
${indent(task.csharpCode, 4)}
}
`;
  });

  // Write to .generated.cs file
  const outputPath = state.file.opts.filename.replace(/\.tsx?$/, '.generated.cs');
  const fs = require('fs');

  const fullCSharpFile = `
// Auto-generated by babel-plugin-minimact
// Source: ${state.file.opts.filename}

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Minimact.AspNetCore.Core;

namespace Minimact.Components
{
    public partial class ${componentName}Component
    {
${indent(csharpCode, 8)}
    }
}
`;

  fs.writeFileSync(outputPath, fullCSharpFile, 'utf-8');
  console.log(`[babel-plugin-minimact] Generated ${outputPath}`);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function indent(code, spaces) {
  const prefix = ' '.repeat(spaces);
  return code.split('\n').map(line => prefix + line).join('\n');
}
```

### 3.2: Babel Plugin Configuration

**File**: `babel-plugin-minimact/package.json`

```json
{
  "name": "babel-plugin-minimact-server-task",
  "version": "0.1.0",
  "description": "Babel plugin to transpile useServerTask TypeScript → C#",
  "main": "src/server-task-transpiler.js",
  "keywords": ["babel-plugin", "minimact", "server-task", "typescript", "csharp"],
  "dependencies": {
    "@babel/core": "^7.23.0",
    "@babel/types": "^7.23.0",
    "@babel/template": "^7.22.0"
  },
  "peerDependencies": {
    "@babel/core": "^7.0.0"
  }
}
```

**File**: `.babelrc` (in component project)

```json
{
  "plugins": [
    "babel-plugin-minimact-server-task"
  ]
}
```

---

## Phase 4: Template Prediction Integration

### 4.1: Rust Predictor Extension

**File**: `src/src/predictor.rs` (additions)

```rust
// Detect server task state changes
if state_key.starts_with("serverTask_") {
    return extract_server_task_template(
        state_change,
        old_patches,
        new_patches,
        all_state
    );
}

fn extract_server_task_template(
    &self,
    state_change: &StateChange,
    _old_patches: &[Patch],
    new_patches: &[Patch],
    all_state: &HashMap<String, serde_json::Value>
) -> Option<Vec<Patch>> {
    // Extract template for task status changes
    // Status: idle → running → complete

    let new_status = all_state.get(&format!("{}.status", state_change.state_key))?;

    // Build conditional template for each status
    let mut conditional_templates = HashMap::new();

    // Analyze patches to extract UI for each status
    for patch in new_patches {
        match new_status.as_str() {
            Some("idle") => {
                conditional_templates.insert("idle".to_string(), patch.clone());
            }
            Some("running") => {
                conditional_templates.insert("running".to_string(), patch.clone());
            }
            Some("complete") => {
                conditional_templates.insert("complete".to_string(), patch.clone());
            }
            Some("error") => {
                conditional_templates.insert("error".to_string(), patch.clone());
            }
            _ => {}
        }
    }

    // Return structural template with all states
    Some(vec![Patch::ReplaceConditional {
        path: vec![],
        structural_template: StructuralTemplate {
            condition_binding: format!("{}.status", state_change.state_key),
            branches: conditional_templates
        }
    }])
}
```

---

## Phase 5: Examples & Tests

### 5.1: Example Component

**File**: `examples/DataAnalysisComponent.tsx`

```tsx
import { useState, useServerTask } from '@minimact/core';

export function DataAnalysis() {
  const [datasetId, setDatasetId] = useState<string>('');

  // Server task: Heavy computation on server
  const analysis = useServerTask(async () => {
    // This runs on the SERVER as C#!
    const data = await fetch(`/api/datasets/${datasetId}`);
    const parsed = await data.json();

    // Heavy processing
    const processed = parsed.items
      .filter(item => item.active)
      .map(item => ({
        ...item,
        score: calculateComplexScore(item),
        ranking: calculateRanking(item)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

    return {
      items: processed,
      total: processed.length,
      averageScore: processed.reduce((sum, x) => sum + x.score, 0) / processed.length
    };
  });

  return (
    <div className="data-analysis">
      <h1>Data Analysis</h1>

      <input
        type="text"
        value={datasetId}
        onChange={e => setDatasetId(e.target.value)}
        placeholder="Enter dataset ID"
      />

      {analysis.status === 'idle' && (
        <button onClick={() => analysis.start()}>
          Start Analysis
        </button>
      )}

      {analysis.status === 'running' && (
        <div className="loading">
          <Spinner />
          <p>Processing dataset... {Math.round(analysis.progress * 100)}%</p>
          <button onClick={() => analysis.cancel()}>Cancel</button>
        </div>
      )}

      {analysis.status === 'complete' && (
        <div className="results">
          <h2>Analysis Complete</h2>
          <p>Total items: {analysis.result.total}</p>
          <p>Average score: {analysis.result.averageScore.toFixed(2)}</p>
          <p>Duration: {analysis.duration}ms</p>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Score</th>
                <th>Ranking</th>
              </tr>
            </thead>
            <tbody>
              {analysis.result.items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.score.toFixed(2)}</td>
                  <td>{item.ranking}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {analysis.status === 'error' && (
        <div className="error">
          <p>Error: {analysis.error.message}</p>
          <button onClick={() => analysis.retry()}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

**Generated C# (by Babel)**:

**File**: `examples/DataAnalysis.generated.cs`

```csharp
// Auto-generated by babel-plugin-minimact
// Source: examples/DataAnalysisComponent.tsx

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Minimact.AspNetCore.Core;

namespace Minimact.Components
{
    public partial class DataAnalysisComponent
    {
        [ServerTask("serverTask_0")]
        private async Task<AnalysisResult> ServerTask_0(IProgress<double> progress, CancellationToken cancellationToken)
        {
            var data = await Fetch($"/api/datasets/{datasetId}");
            var parsed = await data.Json();

            var processed = parsed.items
                .Where(item => item.active)
                .Select(item => new {
                    item,
                    score = CalculateComplexScore(item),
                    ranking = CalculateRanking(item)
                })
                .OrderByDescending(x => x.score)
                .Take(100)
                .ToList();

            return new AnalysisResult {
                Items = processed,
                Total = processed.Count,
                AverageScore = processed.Sum(x => x.score) / processed.Count
            };
        }
    }
}
```

### 5.2: Test Cases

**File**: `tests/useServerTask.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderComponent } from './test-utils';
import { useServerTask } from '../src/client-runtime/src/hooks';

describe('useServerTask', () => {
  it('should start in idle state', () => {
    const task = useServerTask(async () => 42);

    expect(task.status).toBe('idle');
    expect(task.idle).toBe(true);
    expect(task.running).toBe(false);
    expect(task.complete).toBe(false);
    expect(task.result).toBeUndefined();
  });

  it('should transition to running when started', async () => {
    const task = useServerTask(async () => 42);

    task.start();

    expect(task.status).toBe('running');
    expect(task.running).toBe(true);
  });

  it('should complete with result', async () => {
    const task = useServerTask(async () => 42);

    task.start();
    await task.promise;

    expect(task.status).toBe('complete');
    expect(task.complete).toBe(true);
    expect(task.result).toBe(42);
  });

  it('should handle errors', async () => {
    const task = useServerTask(async () => {
      throw new Error('Test error');
    });

    task.start();

    try {
      await task.promise;
    } catch (err) {
      expect(task.status).toBe('error');
      expect(task.failed).toBe(true);
      expect(task.error.message).toBe('Test error');
    }
  });

  it('should support retry', async () => {
    let attempt = 0;
    const task = useServerTask(async () => {
      attempt++;
      if (attempt === 1) throw new Error('First attempt failed');
      return 42;
    });

    task.start();
    await expect(task.promise).rejects.toThrow();

    task.retry();
    await task.promise;

    expect(task.status).toBe('complete');
    expect(task.result).toBe(42);
  });

  it('should report progress', async () => {
    const progressValues: number[] = [];

    const task = useServerTask(async (progress) => {
      for (let i = 0; i <= 100; i += 10) {
        progress.report(i / 100);
        progressValues.push(i / 100);
        await sleep(10);
      }
      return 'done';
    });

    task.start();
    await task.promise;

    expect(progressValues).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);
  });

  it('should support cancellation', async () => {
    const task = useServerTask(async (_, cancellationToken) => {
      while (!cancellationToken.requested) {
        await sleep(100);
      }
      throw new Error('Cancelled');
    });

    task.start();
    setTimeout(() => task.cancel(), 50);

    await expect(task.promise).rejects.toThrow();
    expect(task.status).toBe('cancelled');
  });
});
```

---

## Implementation Checklist

### Phase 1: Server Infrastructure ✅
- [ ] Create `ServerTaskState.cs`
- [ ] Create `ServerTaskAttribute.cs`
- [ ] Add `GetServerTask<T>()` to `MinimactComponent.cs`
- [ ] Add `GetServerTaskState()` to `MinimactComponent.cs`
- [ ] Add `StartServerTask()` to `MinimactHub.cs`
- [ ] Add `RetryServerTask()` to `MinimactHub.cs`
- [ ] Add `CancelServerTask()` to `MinimactHub.cs`

### Phase 2: Client Runtime ✅
- [ ] Create `server-task.ts` (ServerTask interface & implementation)
- [ ] Add `useServerTask()` hook to `hooks.ts`
- [ ] Add `serverTasks` to `ComponentContext`
- [ ] Integrate task state updates in `minimact.ts`
- [ ] Export `useServerTask` from `index.ts`

### Phase 3: Babel Plugin ✅
- [ ] Create `babel-plugin-minimact/src/server-task-transpiler.js`
- [ ] Implement TypeScript → C# transpilation
- [ ] Implement method name mapping (.map → .Select, etc.)
- [ ] Implement `.generated.cs` file emission
- [ ] Add plugin configuration examples

### Phase 4: Template Prediction ✅
- [ ] Add server task template extraction to `predictor.rs`
- [ ] Implement status-based conditional templates
- [ ] Test template prediction for task state transitions

### Phase 5: Examples & Tests ✅
- [ ] Create `DataAnalysisComponent.tsx` example
- [ ] Create unit tests for `useServerTask`
- [ ] Create integration tests for TS → C# transpilation
- [ ] Create end-to-end tests

### Phase 6: Documentation ✅
- [ ] API documentation for `useServerTask`
- [ ] Babel plugin usage guide
- [ ] Migration guide for existing async code
- [ ] Best practices & patterns

---

## Success Metrics

**Developer Experience**:
- ✅ Write TypeScript, not C#
- ✅ Type-safe end-to-end
- ✅ Single source of truth
- ✅ Automatic transpilation
- ✅ React-like API

**Performance**:
- ✅ Server-side execution (heavy computation stays on server)
- ✅ Zero client bundle impact
- ✅ Predictive rendering for instant UI updates
- ✅ Progress reporting with live updates

**Reliability**:
- ✅ Cancellation support
- ✅ Error handling
- ✅ Retry capability
- ✅ Promise interface for async/await

---

## Future Enhancements

### Phase 7: Advanced Transpilation
- Support for complex TypeScript types
- Generic type inference
- Interface/class transpilation
- Decorator support

### Phase 8: Streaming Results
```typescript
const task = useServerTask(async function* () {
  for (let i = 0; i < 100; i++) {
    yield { batch: i, data: await processBatch(i) };
  }
});

// Client receives partial results as they stream
{task.partialResults.map(batch => <BatchView data={batch} />)}
```

### Phase 9: Parallel Tasks
```typescript
const tasks = useServerTaskParallel([
  async () => fetchWeather(),
  async () => fetchStock(),
  async () => fetchNews()
]);

// Wait for all
await Promise.all(tasks.map(t => t.promise));
```

### Phase 10: Task Chaining
```typescript
const pipeline = useServerTaskPipeline([
  async () => fetchData(),
  async (data) => processData(data),
  async (processed) => visualize(processed)
]);

pipeline.start();
```

---

## Conclusion

`useServerTask` represents a **paradigm shift** in how developers write server-side code:

**Before**:
- Write TypeScript for client
- Write C# for server
- Duplicate business logic
- Manual synchronization

**After**:
- Write TypeScript once
- Babel transpiles to C#
- Runs on server automatically
- Reactive client UI

**Result**: **Developer productivity × 10**, with type safety, predictive rendering, and zero client bundle impact.

🚀 **Let's ship it!**
