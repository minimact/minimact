# Minimact Template Patch System

## Overview

The **Template Patch System** is a revolutionary approach to predictive rendering that generates **parameterized patch templates at build time** rather than caching state-specific patches at runtime. This enables **100% coverage** of all possible state values with **zero learning overhead**.

## Architecture Flow

```
Build Time:
┌──────────┐     ┌─────────────────┐     ┌──────────────────────┐
│ TSX File │ --> │ Babel Plugin    │ --> │ C# Component with    │
│          │     │ (Analyzes JSX)  │     │ [LoopTemplate] attrs │
└──────────┘     └─────────────────┘     └──────────────────────┘

Runtime:
┌──────────────┐     ┌─────────────┐     ┌────────────────┐     ┌──────────┐
│ C# Reflection│ --> │ Rust        │ --> │ Client Applies │ --> │ DOM      │
│ Reads Attrs  │     │ Predictor   │     │ Template       │     │ Updated  │
└──────────────┘     └─────────────┘     └────────────────┘     └──────────┘
```

## Template Types

### 1. Static Templates

Templates with **no dynamic bindings** - pure literal content.

```json
{
  "template": "FAQs",
  "bindings": [],
  "slots": [],
  "type": "static"
}
```

**Usage:** Headers, labels, static text that never changes.

**Example JSX:**
```tsx
<h1>FAQs</h1>
```

---

### 2. Dynamic Templates with Slot Bindings

Templates with **numbered slots** (`{0}`, `{1}`, etc.) that get filled with state values at runtime.

```json
{
  "template": "{0}",
  "bindings": ["item.text"],
  "slots": [0],
  "type": "dynamic"
}
```

**Slot Syntax:** `{n}` where `n` is the binding index (0-based).

**Example JSX:**
```tsx
<span>{todo.text}</span>
```

**Runtime Application:**
```javascript
// Template: "{0}"
// Bindings: ["item.text"]
// State: { item: { text: "Buy milk" } }
// Result: "Buy milk"
```

---

### 3. Conditional Templates

Templates with **branch-based values** determined by a boolean binding.

```json
{
  "template": "{0}",
  "bindings": ["item.done"],
  "slots": [0],
  "conditionalTemplates": {
    "true": "✓",
    "false": "○"
  },
  "conditionalBindingIndex": 0,
  "type": "conditional"
}
```

**Example JSX:**
```tsx
<span>{todo.done ? '✓' : '○'}</span>
```

**Runtime Application:**
```javascript
// Bindings: ["item.done"]
// State: { item: { done: true } }
// Result: "✓"

// State: { item: { done: false } }
// Result: "○"
```

---

### 4. Complex Binding Templates

Templates with **computed expressions** that require server-side evaluation.

```json
{
  "template": "{0}",
  "bindings": ["__complex__"],
  "slots": [],
  "type": "dynamic"
}
```

**Used for:**
- Function calls: `{formatDate(timestamp)}`
- Arithmetic: `{price * quantity}`
- Method chains: `{user.name.toUpperCase()}`

**Example JSX:**
```tsx
<div>{items.filter(x => x.active).length} active items</div>
```

**Runtime Behavior:**
Since `__complex__` bindings cannot be evaluated client-side, the client **waits for server patch** rather than attempting template application.

---

## Loop Templates

The most powerful feature - templates for **array rendering** with `.map()`.

### Full Loop Template Structure

```json
{
  "stateKey": "todos",
  "arrayBinding": "todos",
  "itemVar": "todo",
  "indexVar": "index",
  "keyBinding": "todo.id",
  "itemTemplate": {
    "type": "Element",
    "tag": "li",
    "propsTemplates": {
      "className": {
        "template": "{0}",
        "bindings": ["item.done"],
        "slots": [0],
        "conditionalTemplates": {
          "true": "done",
          "false": "pending"
        },
        "conditionalBindingIndex": 0,
        "type": "conditional"
      },
      "data-id": {
        "template": "{0}",
        "bindings": ["item.id"],
        "slots": [0],
        "type": "dynamic"
      }
    },
    "childrenTemplates": [
      {
        "type": "Element",
        "tag": "span",
        "propsTemplates": null,
        "childrenTemplates": [
          {
            "type": "Text",
            "template": "{0}",
            "bindings": ["item.text"],
            "slots": [0]
          }
        ]
      },
      {
        "type": "Element",
        "tag": "button",
        "propsTemplates": {
          "onClick": {
            "template": "toggleTodo({0})",
            "bindings": ["item.id"],
            "slots": [0],
            "type": "event"
          }
        },
        "childrenTemplates": [
          {
            "type": "conditional",
            "template": "{0}",
            "bindings": ["item.done"],
            "slots": [0],
            "conditionalTemplates": {
              "true": "✓",
              "false": "○"
            },
            "conditionalBindingIndex": 0
          }
        ]
      }
    ]
  }
}
```

### Loop Template Fields

| Field | Type | Description |
|-------|------|-------------|
| `stateKey` | `string` | Name of the state variable being mapped |
| `arrayBinding` | `string` | Binding path to the array (e.g., `"todos"`, `"user.posts"`) |
| `itemVar` | `string` | Variable name for each item (e.g., `"todo"`, `"post"`) |
| `indexVar` | `string?` | Optional index variable (e.g., `"index"`, `"i"`) |
| `keyBinding` | `string?` | Optional key binding for React key prop (e.g., `"item.id"`) |
| `itemTemplate` | `object` | Full template structure for each array item |

### Example JSX → Loop Template

**Input JSX:**
```tsx
<ul>
  {todos.map((todo, index) => (
    <li key={todo.id} className={todo.done ? 'done' : 'pending'}>
      <span>{todo.text}</span>
      <button onClick={() => toggleTodo(todo.id)}>
        {todo.done ? '✓' : '○'}
      </button>
    </li>
  ))}
</ul>
```

**Generated C# Attribute:**
```csharp
[LoopTemplate("todos", @"{
  ""stateKey"":""todos"",
  ""arrayBinding"":""todos"",
  ""itemVar"":""todo"",
  ""indexVar"":""index"",
  ""keyBinding"":""item.id"",
  ""itemTemplate"":{...}
}")]
[Component]
public partial class TodoList : MinimactComponent
{
    [State]
    private List<Todo> todos = new();
}
```

---

## C# Attribute Syntax

### LoopTemplateAttribute

```csharp
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
public class LoopTemplateAttribute : Attribute
{
    public string StateKey { get; }
    public string TemplateJson { get; }

    public LoopTemplateAttribute(string stateKey, string templateJson)
    {
        StateKey = stateKey;
        TemplateJson = templateJson;
    }
}
```

### Usage Example

```csharp
using Minimact.AspNetCore.Attributes;

[LoopTemplate("todos", @"{
  ""stateKey"":""todos"",
  ""arrayBinding"":""todos"",
  ""itemVar"":""todo"",
  ""itemTemplate"":{
    ""type"":""Element"",
    ""tag"":""li"",
    ""childrenTemplates"":[
      {
        ""type"":""Text"",
        ""template"":""{0}"",
        ""bindings"":[""item.text""],
        ""slots"":[0]
      }
    ]
  }
}")]
[Component]
public partial class TodoList : MinimactComponent
{
    [State]
    private List<Todo> todos = new List<Todo>
    {
        new Todo { Id = 1, Text = "Learn Minimact", Done = false },
        new Todo { Id = 2, Text = "Build app", Done = false }
    };

    protected override VNode Render()
    {
        return new VNode("div", null, todos.Select(todo =>
            new VNode("li", new { className = todo.Done ? "done" : "pending" },
                new VNode("span", null, todo.Text)
            )
        ).ToList());
    }
}
```

---

## Path-Based Template References

Templates are identified by **hierarchical paths** through the component tree.

### Path Syntax

```
"[index].tag[index].property[index]"
```

**Examples:**
- `"[0].h1[0].text[0]"` - First h1's first text node
- `"[0].ul[0].text[0]"` - First ul's first text node
- `"div[0].span[1].text[0]"` - First div, second span, first text

### Template Reference Structure

```json
{
  "component": "TodoList",
  "version": "1.0",
  "generatedAt": 1761505724710,
  "templates": {
    "[0].h1[0].text[0]": {
      "template": "Todo List",
      "bindings": [],
      "slots": [],
      "path": [0, 0, 0],
      "type": "static"
    },
    "[0].ul[0].li[*]": {
      "template": "{loop:todos}",
      "type": "loop",
      "loopKey": "todos"
    }
  }
}
```

**Path Array:** `[0, 0, 0]` represents indices for navigation: root → first child → first child → first child.

---

## Template Application on Client

### Pseudo-Algorithm

```javascript
function applyTemplate(element, template, state) {
  switch (template.type) {
    case 'static':
      // No-op or direct text replacement
      element.textContent = template.template;
      break;

    case 'dynamic':
      // Resolve bindings and fill slots
      const values = template.bindings.map(binding =>
        resolvePath(state, binding)
      );
      const result = fillSlots(template.template, values);
      element.textContent = result;
      break;

    case 'conditional':
      // Evaluate condition and pick branch
      const conditionValue = resolvePath(state, template.bindings[0]);
      const branch = conditionValue ? 'true' : 'false';
      const result = template.conditionalTemplates[branch];
      element.textContent = result;
      break;

    case 'loop':
      // Render array items using itemTemplate
      const array = resolvePath(state, template.arrayBinding);
      const items = array.map((item, index) =>
        applyItemTemplate(template.itemTemplate, { item, index })
      );
      replaceChildren(element, items);
      break;
  }
}
```

### Slot Filling

```javascript
function fillSlots(template, values) {
  return template.replace(/\{(\d+)\}/g, (match, index) => {
    return values[parseInt(index)] ?? '';
  });
}

// Example:
fillSlots("Hello {0}, you have {1} messages", ["Alice", 5])
// Result: "Hello Alice, you have 5 messages"
```

### Path Resolution

```javascript
function resolvePath(obj, path) {
  return path.split('.').reduce((current, key) =>
    current?.[key], obj
  );
}

// Example:
resolvePath({ user: { name: "Bob" } }, "user.name")
// Result: "Bob"
```

---

## Advantages Over Hint Queue

| Feature | Hint Queue (Old) | Template Patches (New) |
|---------|------------------|------------------------|
| **Coverage** | Predicted states only | **100% of all states** |
| **Cold Start** | Requires learning phase | **Works from first render** |
| **Memory** | Caches N patches per state | **Single template** |
| **Accuracy** | Depends on predictions | **Perfect (from Babel AST)** |
| **Build Time** | Runtime prediction overhead | **Zero runtime overhead** |
| **Complexity** | ML/pattern learning | **Simple slot filling** |
| **Conditionals** | Separate cache entries | **Single template with branches** |
| **Loops** | One cache per array length | **Single template for any length** |

---

## Template Generation Process

### Phase 1: Babel Plugin Analysis

```javascript
// Input: JSX AST Node
<span className={done ? 'complete' : 'pending'}>{text}</span>

// Output: Template Metadata
{
  tag: "span",
  propsTemplates: {
    className: {
      type: "conditional",
      template: "{0}",
      bindings: ["done"],
      conditionalTemplates: {
        true: "complete",
        false: "pending"
      }
    }
  },
  childrenTemplates: [
    {
      type: "Text",
      template: "{0}",
      bindings: ["text"],
      slots: [0]
    }
  ]
}
```

### Phase 2: C# Code Generation

```csharp
// Babel generates this attribute on the C# component class
[LoopTemplate("items", @"{
  ""stateKey"":""items"",
  ""itemTemplate"":{
    ""tag"":""span"",
    ""propsTemplates"":{
      ""className"":{
        ""type"":""conditional"",
        ""template"":""{0}"",
        ""bindings"":[""done""],
        ""conditionalTemplates"":{
          ""true"":""complete"",
          ""false"":""pending""
        }
      }
    }
  }
}")]
```

### Phase 3: Runtime Reflection

```csharp
// C# reads attribute via reflection
var attr = typeof(TodoList)
    .GetCustomAttribute<LoopTemplateAttribute>();

var template = JsonSerializer.Deserialize<LoopTemplate>(attr.TemplateJson);

// Template now available to Rust predictor
```

### Phase 4: Rust Patch Generation

```rust
// Rust generates parameterized patch
Patch::ApplyTemplate {
    selector: "#todo-list",
    template_key: "todos",
    state_bindings: vec!["todos"],
}
```

### Phase 5: Client Template Application

```javascript
// Client receives patch and applies template
const template = componentMetadata.templates.todos;
const state = { todos: [...] };
applyTemplate(element, template, state);
```

---

## Complex Example: Nested Loops with Conditionals

### JSX Input

```tsx
function CommentSection() {
  const [posts, setPosts] = useState([]);

  return (
    <div>
      {posts.map(post => (
        <article key={post.id} className={post.pinned ? 'pinned' : ''}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
          <div className="comments">
            {post.comments.map((comment, idx) => (
              <div key={comment.id} className={comment.edited ? 'edited' : ''}>
                <strong>{comment.author}</strong>
                <span>{comment.text}</span>
                {comment.edited && <em>(edited)</em>}
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
```

### Generated Template (Simplified)

```json
{
  "stateKey": "posts",
  "arrayBinding": "posts",
  "itemVar": "post",
  "itemTemplate": {
    "type": "Element",
    "tag": "article",
    "propsTemplates": {
      "className": {
        "type": "conditional",
        "bindings": ["item.pinned"],
        "conditionalTemplates": { "true": "pinned", "false": "" }
      }
    },
    "childrenTemplates": [
      {
        "type": "Element",
        "tag": "h2",
        "childrenTemplates": [
          { "type": "Text", "template": "{0}", "bindings": ["item.title"] }
        ]
      },
      {
        "type": "Element",
        "tag": "div",
        "propsTemplates": { "className": { "template": "comments", "type": "static" } },
        "childrenTemplates": [
          {
            "type": "loop",
            "arrayBinding": "item.comments",
            "itemVar": "comment",
            "itemTemplate": {
              "type": "Element",
              "tag": "div",
              "propsTemplates": {
                "className": {
                  "type": "conditional",
                  "bindings": ["nested.edited"],
                  "conditionalTemplates": { "true": "edited", "false": "" }
                }
              },
              "childrenTemplates": [
                {
                  "type": "Element",
                  "tag": "strong",
                  "childrenTemplates": [
                    { "type": "Text", "template": "{0}", "bindings": ["nested.author"] }
                  ]
                },
                {
                  "type": "Element",
                  "tag": "span",
                  "childrenTemplates": [
                    { "type": "Text", "template": "{0}", "bindings": ["nested.text"] }
                  ]
                },
                {
                  "type": "conditional-element",
                  "bindings": ["nested.edited"],
                  "conditionalTemplates": {
                    "true": {
                      "type": "Element",
                      "tag": "em",
                      "childrenTemplates": [
                        { "type": "Text", "template": "(edited)", "type": "static" }
                      ]
                    },
                    "false": null
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  }
}
```

---

## Template Binding Paths

### Simple Bindings
- `"item.text"` → Access `text` property of loop item
- `"item.done"` → Access `done` property of loop item
- `"item.user.name"` → Nested property access

### Nested Loop Bindings
- `"nested.author"` → Property of nested loop item
- `"nested.edited"` → Property of nested loop item

### Index Bindings
- `"index"` → Current loop index (0-based)
- `"item.id"` → Item property used as key

---

## Performance Characteristics

### Build Time
- **Babel Analysis:** O(n) where n = JSX nodes
- **Template Generation:** O(n) where n = dynamic expressions
- **One-time cost** at transpilation

### Runtime (Server)
- **Reflection:** O(1) - Cached after first access
- **Template Lookup:** O(1) - Hash table
- **Patch Generation:** O(1) - Template already prepared

### Runtime (Client)
- **Template Application:** O(m) where m = number of bindings
- **Slot Filling:** O(s) where s = number of slots
- **DOM Updates:** O(k) where k = changed elements

### Comparison to Full Render
- **Full Render:** O(n) where n = total DOM nodes
- **Template Patch:** O(m) where m = bindings (typically m << n)
- **Speedup:** 10x-100x depending on component complexity

---

## Limitations and Edge Cases

### 1. Complex Expressions
Templates with `__complex__` bindings require server evaluation:
```tsx
<div>{users.filter(u => u.active).map(u => u.name).join(', ')}</div>
```
**Solution:** Client waits for server patch instead of template application.

### 2. Component Boundaries
Templates don't cross component boundaries:
```tsx
<div>{items.map(item => <TodoItem item={item} />)}</div>
```
**Solution:** Separate templates for parent and child components.

### 3. Dynamic Tag Names
JSX with dynamic element types:
```tsx
<>{items.map(item => React.createElement(item.type, {}, item.content))}</>
```
**Solution:** Not supported - requires server rendering.

### 4. Refs and Imperative APIs
Templates work for declarative updates only:
```tsx
const ref = useRef();
useEffect(() => { ref.current.focus(); }, []);
```
**Solution:** Imperative code runs separately from template system.

---

## Future Enhancements

### 1. Template Composition
Allow templates to reference other templates:
```json
{
  "template": "{0} - {template:userBadge}",
  "bindings": ["item.name"],
  "referencedTemplates": ["userBadge"]
}
```

### 2. Expression Functions
Support basic transformations client-side:
```json
{
  "template": "{0}",
  "bindings": ["item.price"],
  "transform": "currency:USD"
}
```

### 3. Animation Templates
Specify transition parameters in templates:
```json
{
  "template": "{0}",
  "transition": {
    "duration": 300,
    "easing": "ease-in-out"
  }
}
```

### 4. Template Versioning
Track template versions for cache invalidation:
```json
{
  "component": "TodoList",
  "version": "2.0",
  "templateHash": "a3f2b8c1"
}
```

---

## Developer Tools Integration

### SWIG Electron Features for Templates

1. **Template Inspector**
   - List all `[LoopTemplate]` attributes
   - Show template structure as tree
   - Highlight bindings and slots

2. **Template Preview**
   - Apply template with current state
   - Show before/after comparison
   - Visualize conditional branches

3. **Template Coverage**
   - Track which templates were used
   - Show template vs full-render ratio
   - Identify unused templates

4. **Template Performance**
   - Measure template application time
   - Compare to full render time
   - Show binding resolution time

5. **Template Debugger**
   - Step through template application
   - Inspect binding values
   - Validate template syntax

---

## Conclusion

The **Template Patch System** represents a paradigm shift in predictive rendering:

- ✅ **Zero-prediction architecture** - No ML, no learning phase
- ✅ **100% state coverage** - Works for any state value
- ✅ **Build-time analysis** - Leverages Babel AST parsing
- ✅ **Instant feedback** - Client applies templates immediately
- ✅ **Perfect accuracy** - Templates extracted from source JSX

This system makes Minimact's predictive rendering **deterministic, reliable, and universally applicable** to any React component.
