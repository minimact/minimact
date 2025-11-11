import { useState, usePredictHint } from '@minimact/core';

function UsePredictHintTest() {
  const [count, setCount] = useState(0);
  const [todos, setTodos] = useState([]);

  // Hint: when count increments, predict the new value
  usePredictHint('increment', { count: count + 1 });

  // Hint: when adding a todo, predict the new array
  usePredictHint('addTodo', {
    todos: [...todos, { id: todos.length + 1, text: 'New Todo' }]
  });

  const handleIncrement = () => {
    // Client will instantly apply the hinted patch (0ms latency!)
    setCount(count + 1);
  };

  const handleAddTodo = () => {
    // Client will instantly apply the hinted patch
    setTodos([...todos, { id: todos.length + 1, text: 'New Todo' }]);
  };

  return (
    <div>
      <h1>Predict Hint Test</h1>
      <div>
        <h2>Counter (with hint)</h2>
        <button onClick={handleIncrement}>Increment</button>
        <div>Count: {count}</div>
      </div>
      <div>
        <h2>Todos (with hint)</h2>
        <button onClick={handleAddTodo}>Add Todo</button>
        <div>Todo count: {todos.length}</div>
        <ul>
          {todos.map(todo => (
            <li key={todo.id}>{todo.text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default UsePredictHintTest;
