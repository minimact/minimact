/**
 * Example: loopTemplates.cjs - Extracts .map() patterns for predictive rendering
 *
 * Extracted metadata structure:
 * {
 *   stateKey: "todos",           // State variable for [LoopTemplate] attribute
 *   arrayBinding: "todos",       // Array to iterate at runtime
 *   itemVar: "todo",             // Variable name for each item
 *   indexVar: "index",           // Variable name for index (optional)
 *   keyBinding: "item.id",       // React key expression
 *   itemTemplate: {              // Template for each list item
 *     type: "Element",
 *     tag: "li",
 *     propsTemplates: { className: { template: "{0}", bindings: ["item.done"], conditionalTemplates: {...} } },
 *     childrenTemplates: [ { type: "Text", template: "{0}", bindings: ["item.text"] } ]
 *   }
 * }
 *
 * Features covered:
 * - Simple .map() with arrow function
 * - .map() with index parameter
 * - Chained operations: .filter(...).map(...)
 * - Key binding extraction
 * - Static vs dynamic props
 * - Conditional prop templates (ternary)
 * - Template literal props
 * - Nested element templates
 * - Text templates with bindings
 * - Method call bindings: item.text.toUpperCase()
 * - Binary expression bindings: item.priority + 1
 * - Logical expression bindings: item.date || 'N/A'
 * - Block body with return statement
 */
import { useState } from '@minimact/core';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  priority: number;
  dueDate?: string;
  author: { name: string };
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
}

export function LoopTemplatesExample() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  return (
    <div>
      {/* 1. Simple .map() with arrow function */}
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>

      {/* 2. .map() with index parameter */}
      <ol>
        {todos.map((todo, index) => (
          <li key={todo.id}>
            {index + 1}. {todo.text}
          </li>
        ))}
      </ol>

      {/* 3. Conditional className (ternary → conditionalTemplates) */}
      <ul>
        {todos.map(todo => (
          <li key={todo.id} className={todo.completed ? 'done' : 'pending'}>
            {todo.text}
          </li>
        ))}
      </ul>

      {/* 4. Template literal className */}
      <ul>
        {todos.map(todo => (
          <li key={todo.id} className={`priority-${todo.priority}`}>
            {todo.text}
          </li>
        ))}
      </ul>

      {/* 5. Nested member expression binding */}
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            {todo.text} by {todo.author.name}
          </li>
        ))}
      </ul>

      {/* 6. Method call binding → __expr__:item.text */}
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text.toUpperCase()}</li>
        ))}
      </ul>

      {/* 7. Binary expression binding → __expr__:item.priority */}
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>Priority: {todo.priority + 1}</li>
        ))}
      </ul>

      {/* 8. Logical expression binding (fallback) → __expr__:item.dueDate */}
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>Due: {todo.dueDate || 'No due date'}</li>
        ))}
      </ul>

      {/* 9. Chained operations: .filter().map() */}
      <ul>
        {todos.filter(t => !t.completed).map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>

      {/* 10. Nested element template */}
      <ul>
        {users.map(user => (
          <li key={user.id}>
            <span className="name">{user.firstName} {user.lastName}</span>
            <span className="email">{user.email}</span>
          </li>
        ))}
      </ul>

      {/* 11. Block body with return statement */}
      <ul>
        {todos.map(todo => {
          const label = `[${todo.priority}] ${todo.text}`;
          return <li key={todo.id}>{label}</li>;
        })}
      </ul>

      {/* 12. Template literal in text child */}
      <ul>
        {users.map(user => (
          <li key={user.id}>{`${user.firstName} ${user.lastName}`}</li>
        ))}
      </ul>

      {/* 13. Conditional text template */}
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.completed ? '✓' : '○'} {todo.text}</li>
        ))}
      </ul>

      {/* 14. Static props alongside dynamic props */}
      <ul>
        {todos.map(todo => (
          <li key={todo.id} className="todo-item" data-id={todo.id}>
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
