/**
 * Edge Case Test: Event Handler Patterns
 *
 * Tests various event handler patterns including async, destructuring, and complex scenarios
 * Key Issues:
 * - Async handlers may not be marked as async
 * - Destructuring params may not be handled
 * - Complex event handler bodies
 */

import { useState } from 'minimact';

interface Task {
  id: number;
  title: string;
  completed: boolean;
}

export function EventHandlerEdgeCases() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: 'Task 1', completed: false },
    { id: 2, title: 'Task 2', completed: true }
  ]);
  const [loading, setLoading] = useState(false);

  // Named handler functions
  function handleSimpleClick() {
    setCount(count + 1);
  }

  async function handleAsyncClick() {
    setLoading(true);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCount(count + 1);
    setLoading(false);
  }

  function handleComplexLogic(taskId: number) {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
  }

  return (
    <div>
      <h1>Event Handler Edge Cases</h1>

      {/* Test Case 1: Simple Inline Arrow Function */}
      <div className="test-case">
        <h3>Test 1: Simple Inline Arrow Function</h3>
        <button onClick={() => setCount(count + 1)}>
          Increment (Current: {count})
        </button>
      </div>

      {/* Test Case 2: Named Function Reference */}
      <div className="test-case">
        <h3>Test 2: Named Function Reference</h3>
        <button onClick={handleSimpleClick}>
          Named Handler (Count: {count})
        </button>
      </div>

      {/* Test Case 3: Async Inline Handler */}
      <div className="test-case">
        <h3>Test 3: Async Inline Handler</h3>
        <button onClick={async () => {
          setLoading(true);
          await new Promise(resolve => setTimeout(resolve, 500));
          setCount(count + 1);
          setLoading(false);
        }}>
          Async Increment {loading && '(Loading...)'}
        </button>
        <p className="warning">⚠️ May not mark handler as async</p>
      </div>

      {/* Test Case 4: Async Named Handler */}
      <div className="test-case">
        <h3>Test 4: Async Named Handler</h3>
        <button onClick={handleAsyncClick}>
          Async Named Handler {loading && '(Loading...)'}
        </button>
      </div>

      {/* Test Case 5: Event Object Destructuring */}
      <div className="test-case">
        <h3>Test 5: Event Object Destructuring</h3>
        <input
          type="text"
          value={text}
          onChange={({ target: { value } }) => setText(value)}
          placeholder="Type here..."
        />
        <p>Text: {text}</p>
        <p className="warning">⚠️ Destructuring may not be handled</p>
      </div>

      {/* Test Case 6: e.target.value Pattern (Should Work) */}
      <div className="test-case">
        <h3>Test 6: Standard e.target.value Pattern</h3>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Standard pattern"
        />
        <p className="success">✅ This pattern is optimized to: Handle0(value)</p>
      </div>

      {/* Test Case 7: Multiple Parameters */}
      <div className="test-case">
        <h3>Test 7: Handler with Multiple Parameters</h3>
        {tasks.map((task, index) => (
          <div key={task.id}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => handleComplexLogic(task.id)}
            />
            {task.title} (Index: {index})
          </div>
        ))}
      </div>

      {/* Test Case 8: Event Handler in Nested .map() */}
      <div className="test-case">
        <h3>Test 8: Handler with Captured Variables from .map()</h3>
        {tasks.map((task, taskIndex) => (
          <button key={task.id} onClick={() => alert(`Task ${taskIndex + 1}: ${task.title}`)}>
            Alert: {task.title}
          </button>
        ))}
        <p className="success">✅ Should capture task and taskIndex in event handler closure</p>
      </div>

      {/* Test Case 9: preventDefault/stopPropagation */}
      <div className="test-case">
        <h3>Test 9: Event Methods (preventDefault/stopPropagation)</h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          alert('Form submitted!');
        }}>
          <input type="text" placeholder="Name" />
          <button type="submit">Submit</button>
        </form>
      </div>

      {/* Test Case 10: Multiple Statements in Handler */}
      <div className="test-case">
        <h3>Test 10: Complex Handler Body</h3>
        <button onClick={() => {
          const newCount = count + 1;
          console.log('New count:', newCount);
          setCount(newCount);
          setText(`Count is now ${newCount}`);
        }}>
          Complex Handler
        </button>
      </div>

      {/* Test Case 11: Conditional Logic in Handler */}
      <div className="test-case">
        <h3>Test 11: Conditional in Handler</h3>
        <button onClick={() => {
          if (count % 2 === 0) {
            setCount(count + 1);
          } else {
            setCount(count + 2);
          }
        }}>
          Conditional Increment (Count: {count})
        </button>
      </div>

      {/* Test Case 12: Handler Calling Other Functions */}
      <div className="test-case">
        <h3>Test 12: Handler Calling Multiple Functions</h3>
        <button onClick={() => {
          handleSimpleClick();
          setText('Button clicked!');
        }}>
          Call Multiple Functions
        </button>
      </div>

      {/* Test Case 13: Event Handler with Return Value */}
      <div className="test-case">
        <h3>Test 13: Handler with Return Statement</h3>
        <button onClick={() => {
          if (count >= 10) {
            alert('Count limit reached!');
            return;
          }
          setCount(count + 1);
        }}>
          Increment with Limit (Max 10)
        </button>
      </div>

      {/* Test Case 14: Spread Operator in Handler */}
      <div className="test-case">
        <h3>Test 14: Spread Operator</h3>
        <button onClick={() => {
          const newTask: Task = {
            id: tasks.length + 1,
            title: `Task ${tasks.length + 1}`,
            completed: false
          };
          setTasks([...tasks, newTask]);
        }}>
          Add Task
        </button>
        <p>Total Tasks: {tasks.length}</p>
      </div>

      {/* Test Case 15: Handler with Optional Chaining */}
      <div className="test-case">
        <h3>Test 15: Optional Chaining in Handler</h3>
        <button onClick={(e) => {
          const value = (e.target as any).value?.toString() || 'No value';
          setText(value);
        }}>
          Optional Chaining Test
        </button>
      </div>

      {/* Test Case 16: Double vs Single Arrow Function */}
      <div className="test-case">
        <h3>Test 16: Curried Handler (Double Arrow)</h3>
        {tasks.map(task => (
          <button key={task.id} onClick={(e) => (id: number) => handleComplexLogic(id)}>
            {task.title}
          </button>
        ))}
        <p className="warning">⚠️ Curried functions may not transpile correctly</p>
      </div>
    </div>
  );
}
