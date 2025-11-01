// TodoListPage.tsx - Demonstrates MVC Bridge with complex mutable state
import { useMvcState, useMvcViewModel } from '@minimact/mvc';
import { useState } from '@minimact/core';

interface TodoItemViewModel {
    id: number;
    text: string;
    done: boolean;
    category: string;
    createdAt: string;
}

interface TodoListViewModel {
    userName: string;
    isAdminRole: boolean;
    maxTodosAllowed: number;
    categories: string[];
    initialTodos: TodoItemViewModel[];
    initialNewTodoText: string;
    initialFilterCategory: string;
    initialShowCompleted: boolean;
    pageTitle: string;
    description: string;
}

export function TodoListPage() {
    // ❌ IMMUTABLE - Server authority
    const [userName] = useMvcState<string>('userName');
    const [isAdmin] = useMvcState<boolean>('isAdminRole');
    const [maxTodos] = useMvcState<number>('maxTodosAllowed');

    // ✅ MUTABLE - Client can modify (syncs to server)
    const [todos, setTodos] = useMvcState<TodoItemViewModel[]>('initialTodos', {
        sync: 'immediate'
    });

    const [newTodoText, setNewTodoText] = useMvcState<string>('initialNewTodoText', {
        sync: 'debounced',
        syncDelay: 500
    });

    const [filterCategory, setFilterCategory] = useMvcState<string>('initialFilterCategory');
    const [showCompleted, setShowCompleted] = useMvcState<boolean>('initialShowCompleted');

    // Access full ViewModel
    const viewModel = useMvcViewModel<TodoListViewModel>();

    // Local state
    const [selectedCategory, setSelectedCategory] = useState<string>('Personal');

    if (!viewModel) {
        return <div>Loading...</div>;
    }

    // Handlers
    const handleAddTodo = () => {
        if (!newTodoText.trim()) return;
        if (todos.length >= maxTodos) {
            alert(`Maximum ${maxTodos} todos allowed!`);
            return;
        }

        const newTodo: TodoItemViewModel = {
            id: Math.max(0, ...todos.map(t => t.id)) + 1,
            text: newTodoText,
            done: false,
            category: selectedCategory,
            createdAt: new Date().toISOString()
        };

        setTodos([...todos, newTodo]);
        setNewTodoText('');
    };

    const handleToggleTodo = (id: number) => {
        setTodos(
            todos.map(todo =>
                todo.id === id ? { ...todo, done: !todo.done } : todo
            )
        );
    };

    const handleDeleteTodo = (id: number) => {
        if (!isAdmin) {
            alert('Only admins can delete todos');
            return;
        }
        setTodos(todos.filter(todo => todo.id !== id));
    };

    const handleClearCompleted = () => {
        setTodos(todos.filter(todo => !todo.done));
    };

    // Computed values
    const filteredTodos = todos.filter(todo => {
        const matchesCategory = filterCategory === 'All' || todo.category === filterCategory;
        const matchesCompleted = showCompleted || !todo.done;
        return matchesCategory && matchesCompleted;
    });

    const stats = {
        total: todos.length,
        completed: todos.filter(t => t.done).length,
        active: todos.filter(t => !t.done).length,
        byCategory: viewModel.categories
            .filter(cat => cat !== 'All')
            .map(cat => ({
                category: cat,
                count: todos.filter(t => t.category === cat).length
            }))
    };

    return (
        <div className="page-container">
            {/* Header */}
            <header className="page-header">
                <h1>✅ {viewModel.pageTitle}</h1>
                <p className="description">{viewModel.description}</p>
                <div className="user-info">
                    <span className="user-badge">👤 {userName}</span>
                    {isAdmin && <span className="admin-badge">🔑 Admin</span>}
                    <span className="quota-badge">
                        {todos.length} / {maxTodos} todos
                    </span>
                </div>
            </header>

            {/* Stats */}
            <div className="stats-panel">
                <div className="stat-item">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.active}</div>
                    <div className="stat-label">Active</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.completed}</div>
                    <div className="stat-label">Completed</div>
                </div>
            </div>

            {/* Add Todo Form */}
            <div className="add-todo-form">
                <input
                    type="text"
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
                    placeholder="What needs to be done?"
                    className="todo-input"
                />
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="category-select"
                >
                    {viewModel.categories.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <button onClick={handleAddTodo} className="btn btn-add">
                    Add
                </button>
            </div>

            {/* Filters */}
            <div className="filters">
                <div className="filter-group">
                    <label>Category:</label>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="filter-select"
                    >
                        {viewModel.categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={(e) => setShowCompleted(e.target.checked)}
                        />
                        <span>Show Completed</span>
                    </label>
                </div>

                {stats.completed > 0 && (
                    <button
                        onClick={handleClearCompleted}
                        className="btn btn-secondary"
                    >
                        Clear Completed ({stats.completed})
                    </button>
                )}
            </div>

            {/* Todo List */}
            <div className="todo-list">
                {filteredTodos.length === 0 ? (
                    <div className="empty-state">
                        <p>No todos to show!</p>
                        <p className="hint">Try adding a new todo or changing the filter.</p>
                    </div>
                ) : (
                    <ul className="todos">
                        {filteredTodos.map(todo => (
                            <li key={todo.id} className={`todo-item ${todo.done ? 'done' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={todo.done}
                                    onChange={() => handleToggleTodo(todo.id)}
                                    className="todo-checkbox"
                                />
                                <span className="todo-text">{todo.text}</span>
                                <span className="todo-category">{todo.category}</span>
                                <span className="todo-date">
                                    {new Date(todo.createdAt).toLocaleDateString()}
                                </span>
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDeleteTodo(todo.id)}
                                        className="btn-delete"
                                        title="Delete (Admin only)"
                                    >
                                        ✕
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Category Breakdown */}
            <div className="category-breakdown">
                <h3>📊 By Category</h3>
                <div className="category-stats">
                    {stats.byCategory.map(({ category, count }) => (
                        <div key={category} className="category-stat">
                            <span className="category-name">{category}</span>
                            <span className="category-count">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info Panel */}
            <div className="info-panel">
                <h3>ℹ️ How This Works</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <h4>❌ Immutable (Server Authority)</h4>
                        <ul>
                            <li><code>userName</code> - User identity</li>
                            <li><code>isAdminRole</code> - Permission level</li>
                            <li><code>maxTodosAllowed</code> - Business rule</li>
                            <li><code>categories</code> - Available categories</li>
                        </ul>
                    </div>

                    <div className="info-item">
                        <h4>✅ Mutable (Client Control)</h4>
                        <ul>
                            <li><code>[Mutable] initialTodos</code> - Todo array</li>
                            <li><code>[Mutable] initialNewTodoText</code> - Input text</li>
                            <li><code>[Mutable] initialFilterCategory</code> - Filter</li>
                            <li><code>[Mutable] initialShowCompleted</code> - Toggle</li>
                        </ul>
                    </div>
                </div>

                <div className="sync-info">
                    <h4>🔄 Complex State Sync</h4>
                    <p>
                        This example demonstrates syncing <strong>arrays of objects</strong> to the server.
                        Every add, toggle, or delete operation updates the entire todos array and syncs
                        it back to the server via SignalR.
                    </p>
                    <p>
                        The <code>newTodoText</code> uses debounced sync (500ms) to avoid excessive
                        network traffic while typing.
                    </p>
                </div>
            </div>

            {/* Debug Info */}
            <details className="debug-panel">
                <summary>🔍 Debug: View ViewModel JSON</summary>
                <pre>{JSON.stringify(viewModel, null, 2)}</pre>
                <h4 style={{ marginTop: '1rem' }}>Mutability Metadata:</h4>
                <pre>{JSON.stringify((window as any).__MINIMACT_VIEWMODEL__?._mutability, null, 2)}</pre>
            </details>
        </div>
    );
}
