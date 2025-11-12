# Advanced Patterns Walkthrough: Building Production Apps

Welcome back, **Minimalist**! 👋 You've mastered the basics (MVC, SPA, Server Push). Now it's time to learn **advanced patterns** for building real production applications. In this walkthrough, you'll build a GitHub Issues-style task tracker that demonstrates lifted state, shared context, async server operations, pagination, and custom hooks.

:::tip Prerequisites
Before starting this walkthrough, you should complete:
- [MVC Walkthrough](/v1.0/guide/mvc-walkthrough) or [SPA Walkthrough](/v1.0/guide/spa-walkthrough)
- [Server Push Walkthrough](/v1.0/guide/server-push-walkthrough)
- Have experience with React hooks (useState, useEffect, useContext)
:::

:::tip What You'll Learn
By the end of this walkthrough, you'll understand:
- **Lifted State Pattern** - Parent-child component communication
- **useContext** - Shared state across component tree
- **useServerTask** - Async server operations with loading states
- **usePaginatedServerTask** - Infinite scroll and data tables
- **Custom Hooks** - Building reusable logic
- **Component Composition** - Structuring complex UIs
:::

## What We're Building

A **Task Management System** with:
- 📋 **Task List** - Paginated, filterable, sortable
- 📝 **Task Details** - View/edit individual tasks
- 💬 **Comments** - Real-time comment threads
- 👤 **User Context** - Shared user data across components
- 🎨 **Theme Toggle** - Dark/light mode via context
- ⚡ **Async Operations** - Loading states, error handling

**Estimated Time:** 25 minutes

---

## Architecture Overview

```
App Layout
├── UserContext (provides user data)
├── ThemeContext (provides theme)
└── TaskBoard (lifted state container)
    ├── TaskList (child)
    │   └── TaskItem (grandchild)
    └── TaskDetail (child)
        └── CommentList (grandchild)
            └── CommentItem (great-grandchild)
```

**Key Patterns:**
- **Lifted State** - TaskBoard owns selectedTaskId, children read/write it
- **Context** - User/Theme data accessible anywhere in tree
- **Server Tasks** - Async operations with loading/error states
- **Pagination** - Load tasks in batches (10 at a time)

---

## Step 1: Create Shared Contexts (5 minutes)

First, let's create contexts for user data and theme.

### User Context

Create `Contexts/UserContext.tsx`:

```tsx
import { createContext, useContext } from '@minimact/core';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'admin' | 'user';
}

interface UserContextValue {
  user: User;
  isAdmin: boolean;
}

// Create context (server-side shared state)
const UserContext = createContext<UserContextValue>('UserContext');

// Custom hook for consuming context
export function useUser() {
  return useContext(UserContext);
}

// Provider component
export function UserProvider({ user, children }: { user: User; children: any }) {
  const value: UserContextValue = {
    user,
    isAdmin: user.role === 'admin'
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
```

### Theme Context

Create `Contexts/ThemeContext.tsx`:

```tsx
import { createContext, useContext, useState } from '@minimact/core';

interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  colors: {
    background: string;
    text: string;
    border: string;
    primary: string;
  };
}

const ThemeContext = createContext<ThemeContextValue>('ThemeContext');

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: any }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'light'
    ? {
        background: '#ffffff',
        text: '#1f2937',
        border: '#e5e7eb',
        primary: '#3b82f6'
      }
    : {
        background: '#1f2937',
        text: '#f9fafb',
        border: '#374151',
        primary: '#60a5fa'
      };

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    colors
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**Key Points:**
- `createContext()` creates server-side shared state
- `useContext()` reads context value from anywhere in tree
- Context avoids prop drilling (passing props through many layers)
- Contexts persist across re-renders

---

## Step 2: Create the Lifted State Container (5 minutes)

The **TaskBoard** component owns the selected task state and provides it to children.

Create `Components/TaskBoard.tsx`:

```tsx
import { useState, useProtectedState } from '@minimact/core';
import { useTheme } from '../Contexts/ThemeContext';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee: string;
  createdAt: string;
}

export function TaskBoard({ children }: { children: any }) {
  const { colors } = useTheme();

  // Lifted state: Owned by parent, accessed by children
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Protected state: Children can read but not write directly
  const [tasks, setTasks] = useProtectedState<Task[]>([]);

  // Shared functions for children
  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const clearSelection = () => {
    setSelectedTaskId(null);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  return (
    <div style={{
      backgroundColor: colors.background,
      color: colors.text,
      minHeight: '100vh',
      fontFamily: 'system-ui'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: selectedTaskId ? '400px 1fr' : '1fr',
        gap: '24px'
      }}>
        {/* Pass lifted state to children */}
        {children}
      </div>
    </div>
  );
}

// Export lifted state access (children can import these)
export function useTaskBoard() {
  const [selectedTaskId] = useState<string | null>(null);
  const [tasks] = useProtectedState<Task[]>([]);

  return {
    selectedTaskId,
    tasks,
    selectTask: (id: string) => { /* lifted from parent */ },
    clearSelection: () => { /* lifted from parent */ },
    updateTask: (id: string, updates: any) => { /* lifted from parent */ }
  };
}
```

**Lifted State Pattern:**
- Parent owns state (`selectedTaskId`)
- Children read state via `useTaskBoard()` hook
- Children call parent functions to update state
- No prop drilling needed!

---

## Step 3: Build the Task List with Pagination (7 minutes)

Now let's create a paginated task list using `usePaginatedServerTask`.

Create `Components/TaskList.tsx`:

```tsx
import { useState } from '@minimact/core';
import { usePaginatedServerTask } from '@minimact/core/power';
import { useTheme } from '../Contexts/ThemeContext';
import { useTaskBoard } from './TaskBoard';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee: string;
  createdAt: string;
}

export function TaskList() {
  const { colors } = useTheme();
  const { selectedTaskId, selectTask } = useTaskBoard();
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');

  // Paginated server task
  const {
    data: tasks,
    loading,
    error,
    hasMore,
    loadMore
  } = usePaginatedServerTask<Task>(
    'FetchTasks',
    { filter },  // Parameters sent to server
    {
      pageSize: 10,
      initialLoad: true
    }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#6b7280';
      case 'in-progress': return '#3b82f6';
      case 'done': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return '○';
      case 'in-progress': return '◐';
      case 'done': return '●';
      default: return '○';
    }
  };

  return (
    <div style={{
      backgroundColor: colors.background,
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
          Tasks
        </h2>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'todo', 'in-progress', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 12px',
                backgroundColor: filter === f ? colors.primary : 'transparent',
                color: filter === f ? 'white' : colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                textTransform: 'capitalize'
              }}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.text }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
          <p style={{ margin: 0 }}>Loading tasks...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b'
        }}>
          ❌ Error loading tasks: {error}
        </div>
      )}

      {/* Task List */}
      {!error && tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map(task => (
            <div
              key={task.id}
              onClick={() => selectTask(task.id)}
              style={{
                padding: '16px',
                backgroundColor: selectedTaskId === task.id ? colors.primary + '20' : 'transparent',
                border: `1px solid ${colors.border}`,
                borderLeft: `4px solid ${getStatusColor(task.status)}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px', color: getStatusColor(task.status) }}>
                  {getStatusIcon(task.status)}
                </span>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.text
                  }}>
                    {task.title}
                  </h3>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: colors.text + '80'
                  }}>
                    Assigned to {task.assignee} • {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && !loading && (
        <button
          onClick={loadMore}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '16px',
            backgroundColor: 'transparent',
            color: colors.primary,
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Load More
        </button>
      )}

      {/* Loading More State */}
      {loading && tasks.length > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '16px',
          color: colors.text + '80',
          fontSize: '14px'
        }}>
          Loading more tasks...
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.text + '80' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ margin: 0, fontSize: '14px' }}>No tasks found</p>
        </div>
      )}
    </div>
  );
}
```

**Key Patterns:**
- `usePaginatedServerTask` handles async loading
- `loading`, `error`, `hasMore` states managed automatically
- `loadMore()` fetches next page
- Filter changes reset pagination (new query)
- Lifted state: `selectTask()` from parent

---

## Step 4: Build Task Details with Server Task (5 minutes)

Create `Components/TaskDetail.tsx`:

```tsx
import { useState } from '@minimact/core';
import { useServerTask } from '@minimact/core/power';
import { useTheme } from '../Contexts/ThemeContext';
import { useUser } from '../Contexts/UserContext';
import { useTaskBoard } from './TaskBoard';

interface TaskDetails {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee: string;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export function TaskDetail() {
  const { colors } = useTheme();
  const { user, isAdmin } = useUser();
  const { selectedTaskId, clearSelection, updateTask } = useTaskBoard();

  // Fetch task details
  const {
    data: task,
    loading,
    error,
    execute: fetchTask
  } = useServerTask<TaskDetails>('FetchTaskDetails', {
    taskId: selectedTaskId
  });

  const [newComment, setNewComment] = useState('');

  // Add comment server task
  const {
    loading: submittingComment,
    execute: submitComment
  } = useServerTask('AddComment', {
    taskId: selectedTaskId,
    author: user.name,
    text: newComment
  });

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    await submitComment();
    setNewComment('');
    fetchTask(); // Refresh task details
  };

  const handleStatusChange = (newStatus: string) => {
    updateTask(selectedTaskId!, { status: newStatus as any });
  };

  if (!selectedTaskId) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        color: colors.text + '80'
      }}>
        Select a task to view details
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        color: colors.text
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
          <p style={{ margin: 0 }}>Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: '8px',
        color: '#991b1b'
      }}>
        ❌ Error loading task: {error}
      </div>
    );
  }

  if (!task) return null;

  return (
    <div style={{
      backgroundColor: colors.background,
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px'
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
            {task.title}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: colors.text + '80' }}>
            Created by {task.assignee} on {new Date(task.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={clearSelection}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Status Selector (Admin Only) */}
      {isAdmin && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
            Status
          </label>
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: colors.background,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              fontSize: '14px',
              width: '200px'
            }}
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      )}

      {/* Description */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
          Description
        </h3>
        <p style={{
          margin: 0,
          fontSize: '14px',
          lineHeight: '1.6',
          color: colors.text + '80'
        }}>
          {task.description}
        </p>
      </div>

      {/* Comments */}
      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
          Comments ({task.comments.length})
        </h3>

        {/* Comment List */}
        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {task.comments.map(comment => (
            <div
              key={comment.id}
              style={{
                padding: '12px',
                backgroundColor: colors.background === '#ffffff' ? '#f9fafb' : '#374151',
                borderRadius: '8px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  {comment.author}
                </span>
                <span style={{ fontSize: '12px', color: colors.text + '80' }}>
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                {comment.text}
              </p>
            </div>
          ))}

          {task.comments.length === 0 && (
            <p style={{ margin: 0, fontSize: '14px', color: colors.text + '80', textAlign: 'center', padding: '20px' }}>
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>

        {/* Add Comment Form */}
        <div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              backgroundColor: colors.background,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: '8px'
            }}
          />
          <button
            onClick={handleAddComment}
            disabled={submittingComment || !newComment.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: submittingComment ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: submittingComment || !newComment.trim() ? 0.5 : 1
            }}
          >
            {submittingComment ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Key Patterns:**
- `useServerTask` for async operations (fetch details, add comment)
- `execute()` function to trigger server task
- Context: `useUser()` for current user, `useTheme()` for colors
- Lifted state: `updateTask()`, `clearSelection()` from parent
- Loading/error states handled automatically

---

## Step 5: Create Custom Hook for Task Operations (3 minutes)

Let's extract reusable logic into a custom hook.

Create `Hooks/useTaskOperations.ts`:

```tsx
import { useServerTask } from '@minimact/core/power';
import { useTaskBoard } from '../Components/TaskBoard';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  assignee: string;
}

export function useTaskOperations() {
  const { updateTask } = useTaskBoard();

  // Create task
  const {
    loading: creating,
    error: createError,
    execute: createTask
  } = useServerTask<Task>('CreateTask');

  // Update task
  const {
    loading: updating,
    error: updateError,
    execute: executeUpdate
  } = useServerTask('UpdateTask');

  // Delete task
  const {
    loading: deleting,
    error: deleteError,
    execute: deleteTask
  } = useServerTask('DeleteTask');

  // Wrapper function with optimistic update
  const updateTaskWithOptimisticUI = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic update (instant UI feedback)
    updateTask(taskId, updates);

    try {
      // Send to server
      await executeUpdate({ taskId, updates });
    } catch (error) {
      // Rollback on error
      console.error('Failed to update task:', error);
      // TODO: Rollback to previous state
    }
  };

  return {
    // Operations
    createTask,
    updateTask: updateTaskWithOptimisticUI,
    deleteTask,

    // States
    creating,
    updating,
    deleting,

    // Errors
    createError,
    updateError,
    deleteError
  };
}
```

**Custom Hook Benefits:**
- Reusable across multiple components
- Encapsulates complex logic
- Easier to test
- Cleaner component code

---

## Step 6: Put It All Together (2 minutes)

Create the main app page that combines everything.

Create `Pages/TaskManagerPage.tsx`:

```tsx
import { useMvcViewModel } from '@minimact/mvc';
import { UserProvider } from '../Contexts/UserContext';
import { ThemeProvider, useTheme } from '../Contexts/ThemeContext';
import { TaskBoard } from '../Components/TaskBoard';
import { TaskList } from '../Components/TaskList';
import { TaskDetail } from '../Components/TaskDetail';

interface TaskManagerViewModel {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
    role: 'admin' | 'user';
  };
}

function TaskManagerContent() {
  const { theme, toggleTheme, colors } = useTheme();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        backgroundColor: colors.background,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: colors.text }}>
          Task Manager
        </h1>
        <button
          onClick={toggleTheme}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
          {theme === 'light' ? 'Dark' : 'Light'} Mode
        </button>
      </header>

      {/* Main Content */}
      <TaskBoard>
        <TaskList />
        <TaskDetail />
      </TaskBoard>
    </div>
  );
}

export function TaskManagerPage() {
  const viewModel = useMvcViewModel<TaskManagerViewModel>();

  return (
    <UserProvider user={viewModel.user}>
      <ThemeProvider>
        <TaskManagerContent />
      </ThemeProvider>
    </UserProvider>
  );
}
```

**Architecture Highlights:**
- **Context Providers** wrap the entire app
- **Lifted State** (TaskBoard) manages shared state
- **Component Composition** (TaskList + TaskDetail as children)
- **Separation of Concerns** (contexts, hooks, components all separate)

---

## Step 7: Server-Side Implementation (3 minutes)

Now let's implement the server-side handlers.

Create `Controllers/TasksController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

namespace MyApp.Controllers;

[ApiController]
[Route("tasks")]
public class TasksController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;
    private readonly ITaskService _taskService;

    public TasksController(
        MinimactPageRenderer renderer,
        ITaskService taskService)
    {
        _renderer = renderer;
        _taskService = taskService;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        var viewModel = new TaskManagerViewModel
        {
            User = new UserInfo
            {
                Id = User.FindFirst("sub")?.Value ?? "user-123",
                Name = User.Identity?.Name ?? "John Doe",
                Email = User.FindFirst("email")?.Value ?? "john@example.com",
                AvatarUrl = "/images/default-avatar.png",
                Role = User.IsInRole("Admin") ? "admin" : "user"
            }
        };

        return await _renderer.RenderPage<TaskManagerPage>(
            viewModel: viewModel,
            pageTitle: "Task Manager"
        );
    }

    // Server task handlers (called by useServerTask/usePaginatedServerTask)

    [HttpPost("fetch")]
    public async Task<IActionResult> FetchTasks([FromBody] FetchTasksRequest request)
    {
        var tasks = await _taskService.GetTasksAsync(
            filter: request.Filter,
            page: request.Page,
            pageSize: request.PageSize
        );

        return Ok(tasks);
    }

    [HttpPost("details")]
    public async Task<IActionResult> FetchTaskDetails([FromBody] FetchTaskDetailsRequest request)
    {
        var task = await _taskService.GetTaskDetailsAsync(request.TaskId);

        if (task == null)
        {
            return NotFound();
        }

        return Ok(task);
    }

    [HttpPost("comment")]
    public async Task<IActionResult> AddComment([FromBody] AddCommentRequest request)
    {
        var comment = await _taskService.AddCommentAsync(
            taskId: request.TaskId,
            author: request.Author,
            text: request.Text
        );

        return Ok(comment);
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
    {
        var task = await _taskService.CreateTaskAsync(
            title: request.Title,
            description: request.Description,
            assignee: request.Assignee
        );

        return Ok(task);
    }

    [HttpPost("update")]
    public async Task<IActionResult> UpdateTask([FromBody] UpdateTaskRequest request)
    {
        await _taskService.UpdateTaskAsync(request.TaskId, request.Updates);
        return Ok();
    }

    [HttpPost("delete")]
    public async Task<IActionResult> DeleteTask([FromBody] DeleteTaskRequest request)
    {
        await _taskService.DeleteTaskAsync(request.TaskId);
        return Ok();
    }
}
```

**Server Task Pattern:**
- Client: `useServerTask('FetchTasks', params)`
- Server: Receives POST to `/tasks/fetch` with params in body
- Server: Returns JSON data
- Client: Receives data in `data` property

---

## Understanding the Patterns

### Pattern 1: Lifted State

```tsx
// Parent (owns state)
const [selectedId, setSelectedId] = useState(null);

// Child (reads/writes via lifted functions)
const { selectedId, selectTask } = useTaskBoard();
selectTask(task.id); // Calls parent's setSelectedId
```

**Benefits:**
- Single source of truth
- Easy to debug (state in one place)
- No prop drilling
- Children can't accidentally break parent state

### Pattern 2: Context

```tsx
// Provider (top level)
<UserProvider value={{ user, isAdmin }}>
  <App />
</UserProvider>

// Consumer (anywhere in tree)
const { user, isAdmin } = useUser();
```

**Benefits:**
- Global state without prop drilling
- Type-safe (TypeScript interfaces)
- Server-side shared state
- Clean component APIs

### Pattern 3: Server Tasks

```tsx
// Declare server task
const { data, loading, error, execute } = useServerTask('FetchTasks', params);

// Trigger manually
execute({ page: 2 });

// Or auto-trigger on mount/param change
usePaginatedServerTask('FetchTasks', { filter }, { initialLoad: true });
```

**Benefits:**
- Automatic loading/error states
- Type-safe parameters
- Easy error handling
- Built-in retry logic

### Pattern 4: Custom Hooks

```tsx
// Extract reusable logic
function useTaskOperations() {
  const { updateTask } = useTaskBoard();
  const { execute } = useServerTask('UpdateTask');

  return {
    updateTask: async (id, updates) => {
      updateTask(id, updates); // Optimistic
      await execute({ id, updates }); // Server
    }
  };
}
```

**Benefits:**
- Reusable across components
- Testable in isolation
- Cleaner component code
- Easier to maintain

---

## Performance Considerations

### Optimization Tips:

1. **Pagination** - Don't load all tasks at once
2. **Lifted State** - Minimize state duplication
3. **Context** - Keep context values stable (avoid recreating objects)
4. **Server Tasks** - Cache results when possible
5. **Optimistic Updates** - Update UI before server confirms

### Example: Stable Context Value

```tsx
// ❌ Bad: Creates new object every render
<UserContext.Provider value={{ user, isAdmin: user.role === 'admin' }}>

// ✅ Good: Memoize value
const value = useMemo(() => ({
  user,
  isAdmin: user.role === 'admin'
}), [user]);
<UserContext.Provider value={value}>
```

---

## Next Steps

Congratulations! 🎉 You've mastered advanced Minimact patterns. You now know:

- ✅ **Lifted State** - Parent-child communication without prop drilling
- ✅ **Context** - Global state accessible anywhere
- ✅ **Server Tasks** - Async operations with automatic loading states
- ✅ **Pagination** - Infinite scroll and "load more" patterns
- ✅ **Custom Hooks** - Reusable logic extraction
- ✅ **Component Composition** - Building complex UIs from small pieces

### Continue Learning

- **[API Reference](/v1.0/api/hooks)** — Deep dive into all hooks
- **[Use Cases](/v1.0/use-cases)** — See more real-world patterns
- **[Examples](/v1.0/examples)** — Complete example applications

### Build Your Own

You're now ready to build production apps! Try:
1. **E-commerce store** - Product catalog, cart, checkout
2. **Social network** - Posts, comments, likes, follows
3. **Admin dashboard** - Users, analytics, settings
4. **Project management** - Tasks, sprints, roadmaps
5. **Chat application** - Rooms, messages, typing indicators

---

## Summary

In 25 minutes, you've learned:
- ✅ Advanced state management patterns
- ✅ How to structure complex production apps
- ✅ Async server operations with loading states
- ✅ Context for global state
- ✅ Custom hooks for reusable logic
- ✅ Component composition for clean architecture

**You're now a Minimact expert!** 🚀 Go build something amazing!

> *"The cactus doesn't just grow — it composes."* — Every Minimalist
