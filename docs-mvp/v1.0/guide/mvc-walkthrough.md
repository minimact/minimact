# MVC Walkthrough: Your First Minimact App

Welcome, future **Minimalist**! 👋 This walkthrough will take you from zero to a fully functional Minimact **MVC application** in **under 10 minutes**. You'll build a real-time task manager that demonstrates the core concepts of predictive rendering, server-first architecture, and instant interactivity using the **MVC Bridge pattern**.

:::tip Looking for SPA?
This walkthrough covers the **MVC pattern** (traditional server-side rendering). If you want to build a **Single Page Application** with client-side navigation, check out the [SPA Walkthrough](/v1.0/guide/spa-walkthrough).
:::

:::tip What You'll Learn
By the end of this walkthrough, you'll understand:
- How to set up a Minimact project with ASP.NET Core
- Writing components with React syntax that transpile to C#
- How predictive rendering delivers 2-3ms interactions
- The relationship between Controllers, ViewModels, and Minimact components
- How the Rust reconciler enables instant DOM updates
:::

## Before You Begin

**Prerequisites:**
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download) or later
- [Node.js 18+](https://nodejs.org/)
- Basic understanding of React (useState, JSX)
- Basic understanding of ASP.NET Core MVC (Controllers, Models)

**Estimated Time:** 10 minutes

---

## Step 1: Install Minimact Swig (2 minutes)

**Swig** is the official IDE for Minimact development. It's an Electron-based tool that provides Monaco editor, auto-transpilation, and one-click build/run.

```bash
# Clone Swig repository
git clone https://github.com/minimact/swig
cd swig/swig

# Install dependencies
npm install

# Launch Swig IDE
npm start
```

The Swig IDE window will open automatically! 🎉

:::info What is Swig?
**Swig** = **S**uper **W**izard **I**ntegrated **G**UI. It's named after a tool that brings things together — like how Minimact brings React and .NET together. Learn more in the [Glossary](/v1.0/glossary).
:::

---

## Step 2: Create a New Project (1 minute)

In the Swig IDE:

1. **Click "Create New Project"**
2. **Choose a directory** (e.g., `C:\Projects\MyTaskManager`)
3. **Select "Empty" template** (we'll build from scratch)
4. **Click "Create"**

Swig scaffolds your project structure:

```
MyTaskManager/
├── Program.cs              # ASP.NET Core startup
├── MyTaskManager.csproj    # .NET project file
├── Controllers/            # MVC Controllers
│   └── HomeController.cs
├── Pages/                  # Minimact TSX components
│   └── Index.tsx
├── ViewModels/            # Data models
├── wwwroot/               # Static files
│   └── js/
│       └── minimact.js    # 12.01 KB client runtime
└── mact_modules/          # Client-side modules
```

:::tip The Minimact Pattern
Every Minimact app follows the **MVC Bridge pattern**:
- **Controller** → Fetches data, creates ViewModel
- **ViewModel** → Plain C# POCO with properties
- **Minimact Component** → TSX file that renders the ViewModel
:::

---

## Step 3: Understand the Starter Code (2 minutes)

Open `Pages/Index.tsx` in Swig. You'll see a minimal component:

```tsx
import { useState } from '@minimact/core';

export function Index() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Welcome to Minimact!</h1>
      <button onClick={() => setCount(count + 1)}>
        Clicked {count} times
      </button>
    </div>
  );
}
```

**What's happening:**
- Familiar React syntax with `useState` hook
- JSX structure with event handlers
- When you save, Babel **auto-transpiles** this to C# → `Index.cs`

Open `Controllers/HomeController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

namespace MyTaskManager.Controllers;

[ApiController]
[Route("[controller]")]
public class HomeController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public HomeController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        // Render Minimact page
        return await _renderer.RenderPage<Minimact.Components.Index>(
            pageTitle: "My Task Manager"
        );
    }
}
```

**What's happening:**
- Standard ASP.NET Core MVC controller
- Uses `MinimactPageRenderer` to render the Minimact component
- No manual HTML — component renders on the server

---

## Step 4: Build a Task Manager (3 minutes)

Let's build something real! We'll create a task manager with:
- Add tasks
- Mark tasks complete
- Real-time updates with predictive rendering

### Create the ViewModel

Create `ViewModels/TaskManagerViewModel.cs`:

```csharp
namespace MyTaskManager.ViewModels;

public class TaskManagerViewModel
{
    // Server-authoritative data (from database)
    public List<TaskItem> Tasks { get; set; } = new();
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
}

public class TaskItem
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool Done { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### Update the Controller

Update `Controllers/HomeController.cs`:

```csharp
[HttpGet]
public async Task<IActionResult> Index()
{
    // Simulate fetching from database
    var tasks = new List<TaskItem>
    {
        new() { Id = 1, Text = "Learn Minimact", Done = false, CreatedAt = DateTime.Now.AddDays(-2) },
        new() { Id = 2, Text = "Build first app", Done = false, CreatedAt = DateTime.Now.AddDays(-1) },
        new() { Id = 3, Text = "Deploy to production", Done = false, CreatedAt = DateTime.Now }
    };

    var viewModel = new TaskManagerViewModel
    {
        Tasks = tasks,
        TotalTasks = tasks.Count,
        CompletedTasks = tasks.Count(t => t.Done)
    };

    return await _renderer.RenderPage<Minimact.Components.Index>(
        viewModel: viewModel,
        pageTitle: "Task Manager"
    );
}
```

### Build the Component

Update `Pages/Index.tsx`:

```tsx
import { useState } from '@minimact/core';
import { useMvcViewModel } from '@minimact/mvc';

interface TaskItem {
  id: number;
  text: string;
  done: boolean;
  createdAt: string;
}

interface TaskManagerViewModel {
  tasks: TaskItem[];
  totalTasks: number;
  completedTasks: number;
}

export function Index() {
  const viewModel = useMvcViewModel<TaskManagerViewModel>();
  const [tasks, setTasks] = useState(viewModel.tasks);
  const [newTaskText, setNewTaskText] = useState('');

  const addTask = () => {
    if (!newTaskText.trim()) return;

    const newTask: TaskItem = {
      id: Date.now(),
      text: newTaskText,
      done: false,
      createdAt: new Date().toISOString()
    };

    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, done: !task.done } : task
    ));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const completedCount = tasks.filter(t => t.done).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Task Manager</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        {completedCount} of {tasks.length} tasks completed ({Math.round(progress)}%)
      </p>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: '#10b981',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Add Task Form */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a new task..."
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={addTask}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Add
        </button>
      </div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
            No tasks yet. Add one above!
          </p>
        )}

        {tasks.map(task => (
          <div
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              backgroundColor: task.done ? '#f3f4f6' : 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTask(task.id)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{
              flex: 1,
              fontSize: '14px',
              textDecoration: task.done ? 'line-through' : 'none',
              color: task.done ? '#9ca3af' : '#111827'
            }}>
              {task.text}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              style={{
                padding: '4px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 5: Build and Run (1 minute)

In Swig IDE:

1. **Click "Build"** — Transpiles TSX → C# and compiles .NET project
2. **Click "Run"** — Launches ASP.NET Core server
3. **Click "Open in Browser"** — Opens `http://localhost:5000`

You should see your task manager! Try:
- Adding a task (press Enter or click "Add")
- Marking tasks complete (checkbox)
- Deleting tasks

**Notice how fast it feels?** That's predictive rendering in action! 🚀

---

## Step 6: Understanding What Just Happened (1 minute)

Let's break down the magic:

### 1. Transpilation (Babel)

When you saved `Index.tsx`, Babel transpiled it to `Index.cs`:

```csharp
[Component]
public partial class Index : MinimactComponent
{
    [State]
    private List<TaskItem> tasks = new();

    [State]
    private string newTaskText = "";

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // VNode tree represents your JSX
        return new VElement("div", new Dictionary<string, string> { ... })
        {
            Children = new List<VNode> { ... }
        };
    }

    [EventHandler]
    public void AddTask_10000000()
    {
        // Inline arrow function compiled to method
        if (string.IsNullOrWhiteSpace(newTaskText)) return;

        var newTask = new TaskItem
        {
            Id = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
            Text = newTaskText,
            Done = false,
            CreatedAt = DateTime.Now
        };

        tasks.Add(newTask);
        newTaskText = "";
        TriggerRender();
    }
}
```

**Key Points:**
- `useState` → `[State]` private fields
- JSX → VNode tree construction
- Event handlers → `[EventHandler]` methods
- Arrow functions → Named methods with unique IDs

### 2. Predictive Rendering Flow

When you click "Add Task":

```
1. Client: Button clicked
   ↓
2. Client: Apply cached patches (0-2ms) ⚡
   → DOM updates INSTANTLY
   ↓
3. Client: Sync state to server (SignalR)
   ↓
4. Server: Receive state change
   ↓
5. Server: Re-render component (C#)
   ↓
6. Server: Rust reconciler diffs VNode trees
   ↓
7. Server: Generate patches (DOM operations)
   ↓
8. Server: Send patches to client
   ↓
9. Client: Apply patches (usually no-op, prediction was correct!)
   ↓
10. Result: User sees instant feedback, server confirms
```

**This is why Minimact feels instant even on 3G connections!**

### 3. The Rust Reconciler

The Rust reconciler is the heart of Minimact's performance:

```rust
// Simplified pseudo-code
pub fn reconcile(old_vnode: &VNode, new_vnode: &VNode) -> Vec<Patch> {
    let mut patches = Vec::new();

    // Diff algorithm (similar to React's reconciliation)
    if old_vnode.tag != new_vnode.tag {
        patches.push(Patch::Replace { path, new_vnode });
    } else {
        // Diff attributes
        for (key, new_val) in &new_vnode.attrs {
            if old_vnode.attrs.get(key) != Some(new_val) {
                patches.push(Patch::SetAttribute { path, key, value: new_val });
            }
        }

        // Diff children recursively
        diff_children(old_vnode, new_vnode, &mut patches);
    }

    patches
}
```

**Why Rust?**
- **Speed:** ~1ms reconciliation for typical components
- **Memory Safety:** No garbage collection pauses
- **FFI Integration:** Seamless C# ↔ Rust communication

---

## Next Steps

Congratulations! 🎉 You've built your first Minimact application. You now understand:

- ✅ The MVC Bridge pattern (Controller → ViewModel → Component)
- ✅ How Babel transpiles TSX to C#
- ✅ How predictive rendering delivers instant interactions
- ✅ The role of the Rust reconciler in DOM diffing

### Continue Learning

- **[Predictive Rendering Deep Dive](/v1.0/guide/predictive-rendering)** — Learn how hint queues and template systems work
- **[Swig CLI Guide](/v1.0/guide/swig-cli)** — Master the `swig` command-line tool
- **[API Reference](/v1.0/api/)** — Explore all available hooks and APIs
- **[Examples](/v1.0/examples)** — Build more complex apps (Todo, E-commerce, etc.)

### Add More Features

Try extending your task manager:

1. **Persistence:** Store tasks in a database using Entity Framework Core
2. **Filtering:** Add "All / Active / Completed" filter buttons
3. **Search:** Add a search bar to filter tasks by text
4. **Due Dates:** Add due dates and sort tasks
5. **Categories:** Group tasks by category with color coding

### Join the Community

- 💬 [Discord Server](https://discord.gg/minimact) — Chat with other Minimalists
- 🐛 [GitHub Issues](https://github.com/minimact/minimact/issues) — Report bugs or request features
- 🌟 [GitHub Discussions](https://github.com/minimact/minimact/discussions) — Share your projects
- 🐦 [Twitter @MinimactJS](https://twitter.com/MinimactJS) — Follow for updates

---

## Troubleshooting

### Build fails with "TSX syntax error"

**Solution:** Check your TSX syntax. Common issues:
- Missing closing tags
- Self-closing tags need `/` (e.g., `<input />`)
- Event handlers must use arrow functions or method references

### "No Minimact instance found" in browser console

**Solution:** Ensure `<script src="/js/minimact.js"></script>` is in your HTML. The `MinimactPageRenderer` adds this automatically.

### State changes don't reflect in UI

**Solution:** Make sure you're using `setState` (from `useState`) or `setTasks` (in our example). Direct mutation won't trigger re-renders.

### Hot reload not working

**Solution:** In Swig, check the "Hot Reload" status indicator. If it's red, click to reconnect. Ensure ASP.NET Core is running.

---

## Summary

In just 10 minutes, you've:
- ✅ Set up Minimact Swig IDE
- ✅ Created an ASP.NET Core + Minimact project
- ✅ Built a real-time task manager with predictive rendering
- ✅ Understood the transpilation pipeline (TSX → C# → Rust → DOM)
- ✅ Experienced 2-3ms interactions firsthand

**Welcome to the Minimalist community!** 🌵

> *"The cactus doesn't hydrate — it stores."* — Every Minimalist
