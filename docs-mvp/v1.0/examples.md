# Examples

Real-world examples to help you get started with Minimact.

## Simple Counter

The classic counter example with predictive rendering.

```tsx
import { useState } from 'minimact';

export function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <h1>Count: {count}</h1>
            <button onClick={() => setCount(count + 1)}>+</button>
            <button onClick={() => setCount(count - 1)}>-</button>
            <button onClick={() => setCount(0)}>Reset</button>
        </div>
    );
}
```

**Prediction**: After 2-3 clicks, the next state is predicted with 98% confidence.

## Todo List

A todo list with server-side state persistence.

```tsx
import { useState, useEffect } from 'minimact';

interface Todo {
    id: number;
    text: string;
    done: boolean;
}

export function TodoList() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [input, setInput] = useState('');

    const addTodo = () => {
        if (!input.trim()) return;
        const newTodo = {
            id: Date.now(),
            text: input,
            done: false
        };
        setTodos([...todos, newTodo]);
        setInput('');
    };

    const toggleTodo = (id: number) => {
        setTodos(todos.map(t =>
            t.id === id ? { ...t, done: !t.done } : t
        ));
    };

    const deleteTodo = (id: number) => {
        setTodos(todos.filter(t => t.id !== id));
    };

    return (
        <div>
            <h1>Todos</h1>
            <div>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Add a todo..."
                />
                <button onClick={addTodo}>Add</button>
            </div>
            <ul>
                {todos.map(todo => (
                    <li key={todo.id}>
                        <input
                            type="checkbox"
                            checked={todo.done}
                            onChange={() => toggleTodo(todo.id)}
                        />
                        <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
                            {todo.text}
                        </span>
                        <button onClick={() => deleteTodo(todo.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

## Real-Time Chat

Chat with server-side state and SignalR broadcasting.

```tsx
import { useState, useEffect } from 'minimact';
import { useSignalR } from 'minimact/signalr';

export function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const { broadcast } = useSignalR();

    useEffect(() => {
        // Subscribe to messages from other users
        return broadcast.on('NewMessage', (message: Message) => {
            setMessages(prev => [...prev, message]);
        });
    }, []);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const message = {
            id: Date.now(),
            user: 'Current User',
            text: input,
            timestamp: new Date()
        };

        // Broadcast to all connected clients
        await broadcast.send('NewMessage', message);

        setInput('');
    };

    return (
        <div>
            <div className="messages">
                {messages.map(msg => (
                    <div key={msg.id}>
                        <strong>{msg.user}</strong>: {msg.text}
                        <small>{msg.timestamp.toLocaleTimeString()}</small>
                    </div>
                ))}
            </div>
            <div>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}
```

## Data Table with Filtering

Server-side filtering with Entity Framework.

```tsx
import { useState, useEffect } from 'minimact';
import { useDbContext } from 'minimact/ef-core';

export function UserTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const db = useDbContext<AppDbContext>();

    const loadUsers = async () => {
        setLoading(true);
        const query = db.Users
            .Where(u => u.Name.Contains(search) || u.Email.Contains(search))
            .OrderBy(u => u.Name)
            .Take(50);

        setUsers(await query.ToListAsync());
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
    }, [search]);

    return (
        <div>
            <input
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
            {loading ? (
                <p>Loading...</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.isActive ? '✅' : '❌'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
```

## File Upload with Progress

Long-running task with progress updates.

```tsx
import { useState } from 'minimact';
import { useServerTask } from 'minimact';

export function FileUploader() {
    const [file, setFile] = useState<File | null>(null);

    const [uploadTask, startUpload] = useServerTask(async (fileData: ArrayBuffer) => {
        const chunks = Math.ceil(fileData.byteLength / 1024);

        for (let i = 0; i < chunks; i++) {
            const chunk = fileData.slice(i * 1024, (i + 1) * 1024);
            await uploadChunk(chunk);

            const progress = Math.round((i + 1) / chunks * 100);
            updateProgress(progress);
        }

        return { success: true, url: '/uploads/file.pdf' };
    });

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        const arrayBuffer = await file.arrayBuffer();
        startUpload(arrayBuffer);
    };

    return (
        <div>
            <input type="file" onChange={handleFileChange} />
            <button
                onClick={handleUpload}
                disabled={!file || uploadTask.isRunning}
            >
                {uploadTask.isRunning ? 'Uploading...' : 'Upload'}
            </button>

            {uploadTask.isRunning && (
                <div>
                    <progress value={uploadTask.progress} max={100} />
                    <p>{uploadTask.progress}%</p>
                </div>
            )}

            {uploadTask.error && (
                <p style={{ color: 'red' }}>Error: {uploadTask.error}</p>
            )}

            {uploadTask.result && (
                <p style={{ color: 'green' }}>
                    Uploaded! <a href={uploadTask.result.url}>View file</a>
                </p>
            )}
        </div>
    );
}
```

## Next Steps

- Deep dive: [Predictive Rendering](/guide/predictive-rendering)
- Full API: [Hooks Reference](/api/hooks)
- Get started: [Installation Guide](/guide/getting-started)
