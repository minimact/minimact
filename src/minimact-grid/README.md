# @minimact/grid 🌵📊

**Server-side JSX templates with surgical client-side patching for data grids.**

The cactus that grows in rows - write JSX once, runs on server, patches on client.

---

## **The Revolution**

Write **JSX in JavaScript arrow functions**, Babel extracts it at build time, server executes with data binding, and client receives **surgical row/cell patches**.

**100x faster than full grid re-render.**

---

## **Installation**

```bash
npm install @minimact/grid
```

---

## **Quick Start**

```tsx
import { useDataGrid } from '@minimact/grid';
import { useState } from 'minimact';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin', active: true },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'User', active: true },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'User', active: false }
  ]);

  const grid = useDataGrid({
    header: (
      <div className="grid-header">
        <h2>User Management</h2>
        <button onClick={handleAddUser}>Add User</button>
      </div>
    ),

    itemTemplate: ({ user }) => (
      <div className="user-row" data-id={user.id}>
        <span className="user-name">{user.name}</span>
        <span className="user-email">{user.email}</span>
        <span className={`badge badge-${user.role.toLowerCase()}`}>
          {user.role}
        </span>
        <span className={user.active ? "status-active" : "status-inactive"}>
          {user.active ? "Active" : "Inactive"}
        </span>
        <div className="user-actions">
          <button onClick={() => handleEdit(user.id)}>Edit</button>
          <button onClick={() => handleDelete(user.id)}>Delete</button>
        </div>
      </div>
    ),

    footer: (
      <div className="grid-footer">
        <span>Total Users: {users.length}</span>
        <span>Active: {users.filter(u => u.active).length}</span>
      </div>
    ),

    data: users
  });

  const handleEdit = (userId: number) => {
    grid.updateItem(userId, { name: 'Updated Name' });
  };

  const handleDelete = (userId: number) => {
    grid.deleteItem(userId);
  };

  const handleAddUser = () => {
    grid.addItem({
      id: Date.now(),
      name: 'New User',
      email: 'new@example.com',
      role: 'User',
      active: true
    });
  };

  return (
    <div className="user-management">
      {grid.render()}
    </div>
  );
}
```

---

## **How It Works**

### **1. JSX in Arrow Functions**

You write JSX **inside arrow functions**:

```tsx
itemTemplate: ({ user }) => (
  <div>{user.name}</div>
)
```

### **2. Babel Extraction**

At **build time**, the Babel plugin:
- Parses the JSX AST
- Extracts template structure
- Converts to parameterized patches with bindings

```json
{
  "type": "Element",
  "tag": "div",
  "children": [
    { "type": "Binding", "path": "user.name" }
  ]
}
```

### **3. Server Execution**

The **C# TemplateRenderer**:
- Reads `[LoopTemplate]` attributes (emitted by Babel)
- Executes template with data binding
- Fills slots: `{user.name}` → `"Alice"`

```csharp
foreach (var user in users)
{
    html += templateRenderer.Render(itemTemplate, user);
}
```

### **4. Surgical Patching**

The client receives **row-level patches**:

```json
{
  "type": "updateRow",
  "gridId": "userGrid",
  "rowIndex": 2,
  "html": "<div class=\"user-row\">Alice Smith</div>"
}
```

**GridPatcher** applies the patch:
- No full grid re-render
- No VDOM diffing
- Just surgical DOM updates

---

## **Supported Features**

### **✅ Data Bindings**

```tsx
<span>{user.name}</span>
<span>{user.profile.email}</span>
```

### **✅ Method Calls**

```tsx
<span className={user.role.toLowerCase()}>
  {user.role}
</span>
```

Converted to C#: `user.Role.ToLower()`

### **✅ Template Strings**

```tsx
<div className={`badge badge-${user.role}`}>
  {user.role}
</div>
```

Converted to: `string.Format("badge badge-{0}", user.Role)`

### **✅ Conditionals**

```tsx
{user.isAdmin && <span className="badge">Admin</span>}
```

### **✅ Ternary Operators**

```tsx
<span className={user.active ? "active" : "inactive"}>
  {user.active ? "Active" : "Inactive"}
</span>
```

### **✅ Event Handlers**

```tsx
<button onClick={() => handleEdit(user.id)}>Edit</button>
<button onClick={() => handleDelete(user.id)}>Delete</button>
```

Args are extracted and passed to server method.

---

## **API Reference**

### **useDataGrid<T>(config: DataGridConfig<T>): DataGrid<T>**

Creates a data grid with server-side templates and client-side patching.

#### **Config Options**

```tsx
interface DataGridConfig<T> {
  /** Static header JSX (rendered once) */
  header?: React.ReactNode;

  /** Item template (parameterized, rendered per row) */
  itemTemplate: (item: { [key: string]: T }) => React.ReactNode;

  /** Subitem template (nested, rendered per child) */
  subitemTemplate?: (subitem: any) => React.ReactNode;

  /** Footer JSX (can be static or data-bound) */
  footer?: React.ReactNode;

  /** Data source */
  data: T[];

  /** Key field for item identification (default: 'id') */
  keyField?: string;

  /** Grid ID (auto-generated if not provided) */
  gridId?: string;

  /** Enable row animations (default: true) */
  enableAnimations?: boolean;

  /** Custom CSS class for grid container */
  className?: string;

  /** Enable sorting (default: false) */
  sortable?: boolean;

  /** Enable filtering (default: false) */
  filterable?: boolean;

  /** Enable pagination (default: false) */
  pageable?: boolean;

  /** Items per page (if pageable) */
  pageSize?: number;
}
```

#### **DataGrid Instance**

```tsx
interface DataGrid<T> {
  /** Render the grid (returns VNode from server) */
  render: () => React.ReactNode;

  /** Current data */
  data: T[];

  /** Grid ID */
  gridId: string;

  /** Refresh entire grid from server */
  refresh: () => void;

  /** Update a single item */
  updateItem: (id: string | number, updates: Partial<T>) => void;

  /** Delete an item */
  deleteItem: (id: string | number) => void;

  /** Add a new item */
  addItem: (item: T) => void;

  /** Sort by field */
  sort: (field: keyof T, direction: 'asc' | 'desc') => void;

  /** Filter items (server-side predicate) */
  filter: (predicate: (item: T) => boolean) => void;

  /** Clear all filters */
  clearFilters: () => void;

  /** Go to page (if pageable) */
  goToPage: (page: number) => void;

  /** Get current page (if pageable) */
  currentPage: number;

  /** Get total pages (if pageable) */
  totalPages: number;
}
```

---

## **CRUD Operations**

### **Update Item**

```tsx
grid.updateItem(userId, { name: 'New Name', email: 'new@example.com' });
```

**What happens:**
1. Client sends update to server via SignalR
2. Server updates item in data
3. Server renders updated row with template
4. Server sends `updateRow` patch to client
5. GridPatcher replaces row HTML (with animation)

### **Delete Item**

```tsx
grid.deleteItem(userId);
```

**What happens:**
1. Client sends delete request
2. Server removes item from data
3. Server sends `deleteRow` patch with index
4. GridPatcher animates row deletion and removes from DOM

### **Add Item**

```tsx
grid.addItem({ id: 4, name: 'David', email: 'david@example.com', role: 'User', active: true });
```

**What happens:**
1. Client sends add request
2. Server adds item to data
3. Server renders new row with template
4. Server sends `insertRow` patch with HTML and index
5. GridPatcher inserts row at index (with animation)

---

## **Sorting**

```tsx
grid.sort('name', 'asc');  // Sort by name ascending
grid.sort('email', 'desc'); // Sort by email descending
```

**What happens:**
1. Server sorts data by field
2. Server re-renders all rows
3. Server sends `replaceGrid` patch
4. GridPatcher replaces grid body

---

## **Pagination**

```tsx
const grid = useDataGrid({
  data: users,
  pageable: true,
  pageSize: 10
});

// Navigate pages
grid.goToPage(0); // First page
grid.goToPage(grid.currentPage + 1); // Next page
```

**What happens:**
1. Server slices data for page
2. Server renders page rows
3. Server sends `replacePage` patch
4. GridPatcher animates page transition

---

## **Performance**

### **Traditional React Grid (Full Re-render)**

- 1000 rows
- Update 1 cell
- **Result:** Re-renders entire grid (1000 rows)
- **Time:** ~150ms

### **Minimact Grid (Surgical Patching)**

- 1000 rows
- Update 1 cell
- **Result:** Updates 1 cell only
- **Time:** ~1.5ms

**🚀 100x faster!**

---

## **Browser Support**

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires:
- `IntersectionObserver` (for lazy loading)
- `MutationObserver` (for dynamic updates)
- `ResizeObserver` (for responsive grids)

---

## **MES Certification**

**Gold Level** ✨

Meets all Minimact Extension Standards (MES):
- ✅ Component context integration
- ✅ Index tracking
- ✅ Cleanup on unmount
- ✅ HintQueue integration
- ✅ PlaygroundBridge visualization
- ✅ TypeScript declarations
- ✅ Build-time optimization
- ✅ Zero runtime overhead for template parsing

---

## **Examples**

See `/examples` folder for:
- **Basic Grid** - Simple user list
- **Nested Grid** - Orders with line items
- **Sortable Grid** - Click headers to sort
- **Paginated Grid** - Large datasets with pagination
- **Filtered Grid** - Search and filter
- **Editable Grid** - Inline editing
- **Custom Styles** - Tailwind CSS integration

---

## **License**

MIT

---

## **Contributing**

Issues and PRs welcome at [minimact/minimact](https://github.com/minimact/minimact)

---

**Built with 🌵 by the Minimact Team**
