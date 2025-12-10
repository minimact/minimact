# babel-plugin-minimact Architecture

This document describes the architecture of the Babel plugin that transforms React/TSX components into C# Minimact components.

## Overview

The plugin transforms JSX/TSX React components into:
1. **C# classes** with `[Component]` attributes
2. **Template JSON files** for hot reload
3. **Structural change JSON** for incremental updates
4. **`.tsx.keys` files** with hex paths for DOM diffing

## Entry Point

### `index.cjs`
Main Babel plugin entry. Handles:
- `pre()`: Saves original source before JSX transformation
- `Program.enter`: Collects top-level functions/constants
- `Program.exit`: Generates all output files (.cs, .templates.json, .structural-changes.json, .tsx.keys)
- `FunctionDeclaration`/`ArrowFunctionExpression`: Delegates to `processComponent()`

## Core Processing

### `src/processComponent.cjs`
Main orchestrator for component processing:
1. Detects if function is a component or custom hook
2. Extracts props from function parameters
3. Traverses body to extract hooks, variables, helpers
4. Assigns hex paths to JSX nodes
5. Extracts templates for hot reload
6. Analyzes plugin/timeline usage

## Directory Structure

```
src/
├── analyzers/       # AST analysis utilities
├── extractors/      # Extract data from AST nodes
├── generators/      # Generate C# code
├── transpilers/     # TS→C# transpilation
├── types/           # Type conversion utilities
└── utils/           # Helper functions
```

## Extractors (`src/extractors/`)

| File | Purpose |
|------|---------|
| `hooks.cjs` | Extracts all hook calls (useState, useEffect, useRef, useServerTask, usePub/Sub, etc.) |
| `templates.cjs` | Extracts text/attribute templates with `{0}` placeholders for hot reload |
| `loopTemplates.cjs` | Extracts `.map()` patterns for predictive rendering |
| `eventHandlers.cjs` | Extracts onClick, onChange handlers → C# methods |
| `localVariables.cjs` | Extracts const/let declarations |
| `structuralTemplates.cjs` | Extracts conditional rendering patterns |
| `conditionalElementTemplates.cjs` | Extracts ternary/&& element templates |
| `expressionTemplates.cjs` | Extracts computed value templates |
| `props.cjs` | Extracts component props |
| `hookSignature.cjs` | Tracks hook changes between transpilations |
| `useStateX.cjs` | Extracts declarative state projections |

## Generators (`src/generators/`)

| File | Purpose |
|------|---------|
| `component.cjs` | Generates C# class with [State], [Prop], [Ref] fields |
| `expressions.cjs` | Converts JS expressions → C# expressions |
| `jsx.cjs` | Converts JSX → VElement/VText C# constructors |
| `csharpFile.cjs` | Assembles final .cs file with usings/namespace |
| `serverTask.cjs` | Generates [ServerTask] methods |
| `hookClassGenerator.cjs` | Generates C# classes for custom hooks |
| `runtimeHelpers.cjs` | Generates runtime helper calls for dynamic content |
| `razorMarkdown.cjs` | Handles Razor markdown conversion |
| `timelineGenerator.cjs` | Generates timeline animation attributes |
| `plugin.cjs` | Generates Plugin node C# |
| `renderBody.cjs` | Generates Render() method body |
| `rustTask.cjs` | Generates Rust task bindings |

## Analyzers (`src/analyzers/`)

| File | Purpose |
|------|---------|
| `hookAnalyzer.cjs` | Analyzes custom hook structure |
| `hookDetector.cjs` | Detects if function is a custom hook |
| `hookImports.cjs` | Analyzes imported hooks from other files |
| `propTypeInference.cjs` | Infers prop types from usage |
| `timelineAnalyzer.cjs` | Analyzes @minimact/timeline usage |
| `analyzePluginUsage.cjs` | Detects `<Plugin>` component usage |
| `classification.cjs` | Classifies nodes as client/server/hybrid |
| `dependencies.cjs` | Tracks state dependencies per node |
| `detection.cjs` | Detects spread props, dynamic children |
| `razorDetection.cjs` | Detects Razor syntax in markdown |

## Transpilers (`src/transpilers/`)

| File | Purpose |
|------|---------|
| `typescriptToCSharp.cjs` | Transpiles TS async functions → C# async Tasks |
| `typescriptToRust.cjs` | Transpiles TS → Rust (experimental) |

## Utils (`src/utils/`)

| File | Purpose |
|------|---------|
| `helpers.cjs` | String escaping, component name extraction |
| `hexPath.cjs` | Generates hex paths for DOM nodes |
| `pathAssignment.cjs` | Assigns `__minimactPath` to AST nodes |
| `styleConverter.cjs` | Converts JS style objects → CSS strings |

## Types (`src/types/`)

| File | Purpose |
|------|---------|
| `typeConversion.cjs` | Maps TS types → C# types (string→string, number→double, etc.) |

## Supported Hooks

| Hook | C# Output |
|------|-----------|
| `useState` | `[State]` field |
| `useClientState` | Client-side state (no C# field) |
| `useProtectedState` | `[ProtectedState]` field |
| `useEffect` | `[OnStateChanged]` method |
| `useRef` | `[Ref]` field |
| `useMarkdown` | Markdown state with `MarkdownHelper.ToHtml()` |
| `useTemplate` | Changes base class inheritance |
| `useValidation` | `[Validation]` field with rules |
| `useServerTask` | `[ServerTask]` async method |
| `usePaginatedServerTask` | Fetch + count server tasks |
| `usePub` / `useSub` | Pub/sub channel fields |
| `useSignalR` | SignalR hub connection |
| `useMicroTask` / `useMacroTask` | Scheduled task flags |
| `usePredictHint` | Hint ID fields |
| `useMvcState` | MVC ViewModel property access |
| `useModal` / `useToggle` / `useDropdown` | UI state helpers |

## Examples by File

### Extractors

#### `hooks.cjs`
```tsx
// Input
const [count, setCount] = useState(0);
const [query, setQuery] = useClientState('');
const task = useServerTask(async () => { return await fetch('/api'); });

// Extracted
component.useState = [{ name: 'count', setter: 'setCount', initialValue: '0', type: 'int' }]
component.useClientState = [{ name: 'query', setter: 'setQuery', initialValue: '""', type: 'string' }]
component.useServerTask = [{ name: 'task', isStreaming: false, returnType: 'object' }]
```

#### `templates.cjs`
```tsx
// Input
<p>Hello {name}, you have {count} items</p>

// Extracted template
{
  "1.2": {
    "template": "Hello {0}, you have {1} items",
    "bindings": ["name", "count"],
    "slots": [0, 1]
  }
}
```

#### `loopTemplates.cjs`
```tsx
// Input
{todos.map(todo => <li key={todo.id}>{todo.text}</li>)}

// Extracted
{
  "stateKey": "todos",
  "itemVar": "todo",
  "keyBinding": "item.id",
  "itemTemplate": { "type": "Element", "tag": "li", ... }
}
```

#### `eventHandlers.cjs`
```tsx
// Input
<button onClick={() => setCount(count + 1)}>+</button>
<input onChange={(e) => setQuery(e.target.value)} />

// Extracted handlers
component.eventHandlers = [
  { name: 'Handle0', body: 'setCount(count + 1)' },
  { name: 'Handle1', body: 'setQuery(e.target.value)', hasEventParam: true }
]
```

#### `localVariables.cjs`
```tsx
// Input
const doubled = count * 2;
const filtered = items.filter(x => x.active);

// Extracted
component.localVariables = [
  { name: 'doubled', expression: 'count * 2' },
  { name: 'filtered', expression: 'items.filter(x => x.active)' }
]
```

### Generators

#### `component.cjs`
```tsx
// Input
function Counter() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// Output C#
[Component]
public partial class Counter : MinimactComponent
{
    [State]
    private int count = 0;

    protected override VNode Render() { ... }
}
```

#### `expressions.cjs`
```tsx
// Input expressions → Output C#
count + 1                    → count + 1
user.name                    → user.name
items.length                 → items.Count
item.price.toFixed(2)        → item.price.ToString("F2")
condition ? a : b            → (condition) ? a : b
arr.map(x => x.id)           → arr.Select(x => x.id).ToArray()
obj?.prop                    → obj?.prop
```

#### `jsx.cjs`
```tsx
// Input
<div className="card">
  <h1>{title}</h1>
  <button onClick={handleClick}>Click</button>
</div>

// Output C#
new VElement("div", "1", new Dictionary<string, string> { ["class"] = "card" }, new VNode[]
{
    new VElement("h1", "1.1", new Dictionary<string, string>(), new VNode[]
    {
        new VText($"{title}", "1.1.1")
    }),
    new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "handleClick" }, "Click")
})
```

#### `serverTask.cjs`
```tsx
// Input
const fetchData = useServerTask(async (id: number) => {
  const response = await fetch(`/api/data/${id}`);
  return await response.json();
});

// Output C#
[ServerTask]
public async Task<object> fetchData(double id)
{
    var response = await HttpClient.GetAsync($"/api/data/{id}");
    return await response.Content.ReadFromJsonAsync<object>();
}
```

### Transpilers

#### `typescriptToCSharp.cjs`
```typescript
// Input TS
async function process(items: string[]) {
  const results = [];
  for (const item of items) {
    if (item.length > 0) {
      results.push(await transform(item));
    }
  }
  return results;
}

// Output C#
var results = new List<object>();
foreach (var item in items)
{
    if (item.Length > 0)
    {
        results.Add(await transform(item));
    }
}
return results;
```

### Analyzers

#### `hookDetector.cjs`
```tsx
// Detects custom hooks (start with 'use', return array/object)
function useCounter(initial) {        // ✓ Custom hook
  const [count, setCount] = useState(initial);
  return [count, () => setCount(c => c + 1)];
}

function Counter() { ... }            // ✗ Component (PascalCase)
function helper() { ... }             // ✗ Helper (no 'use' prefix)
```

#### `propTypeInference.cjs`
```tsx
// Input - prop types inferred from usage
function Card({ title, count, onClick }) {
  return (
    <div>
      <h1>{title.toUpperCase()}</h1>    // title: string
      <p>{count * 2}</p>                 // count: number
      <button onClick={onClick} />       // onClick: function
    </div>
  );
}

// Inferred
component.props = [
  { name: 'title', type: 'string' },
  { name: 'count', type: 'double' },
  { name: 'onClick', type: 'Action' }
]
```

### Utils

#### `hexPath.cjs`
```tsx
// Assigns unique paths to JSX nodes
<div>           // path: "1"
  <h1>          // path: "1.1"
    {title}     // path: "1.1.1"
  </h1>
  <ul>          // path: "1.2"
    {items.map(item =>
      <li>      // path: "1.2.1" (template)
    )}
  </ul>
</div>
```

#### `styleConverter.cjs`
```tsx
// Input
<div style={{ marginTop: 20, backgroundColor: 'red', fontSize: '14px' }} />

// Output
["style"] = "margin-top: 20px; background-color: red; font-size: 14px"
```

## Data Flow

```
TSX Source
    ↓
Babel Parser (AST)
    ↓
processComponent()
    ├── extractHook() → component.useState, useEffect, etc.
    ├── extractLocalVariables()
    ├── assignPathsToJSX() → __minimactPath on nodes
    ├── extractTemplates() → component.templates
    └── extractLoopTemplates() → component.loopTemplates
    ↓
generateCSharpFile()
    ├── generateComponent() → class with fields
    ├── generateJSXElement() → Render() body
    └── generateServerTaskMethods()
    ↓
Output Files
    ├── Component.cs
    ├── Component.templates.json
    ├── Component.hooks.json
    ├── Component.structural-changes.json
    └── Component.tsx.keys
```
