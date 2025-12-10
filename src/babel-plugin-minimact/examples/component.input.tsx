/**
 * Example: component.cjs - Generates C# class with all attributes and methods
 *
 * Generated structure:
 * - [Component] class attribute
 * - [Prop] public properties from function params
 * - [State] private fields from useState
 * - [Ref] private fields from useRef
 * - [Markdown] fields from useMarkdown
 * - [RazorMarkdown] fields from useRazorMarkdown (OnInitialized)
 * - [Validation] fields from useValidation
 * - [ServerTask] methods from useServerTask
 * - [OnStateChanged] / [OnMounted] from useEffect
 * - [LoopTemplate] from .map() calls
 * - [StateXTransform] from useStateX
 * - [Timeline] / [Keyframe] from useTimeline
 * - Private event handler methods
 * - Toggle methods from useToggle
 * - Pub/Sub from usePub/useSub
 * - SignalR methods
 * - Helper functions
 * - GetClientHandlers() for client-side JS handlers
 * - GetClientEffects() for client-side effects
 * - Local variables (some promoted to computed properties if used in handlers)
 * - Top-level constants
 */
import {
  useState, useEffect, useRef, useServerTask,
  useMarkdown, useRazorMarkdown, useTemplate,
  useValidation, useModal, useToggle, useDropdown,
  usePub, useSub, useSignalR,
  useStateX, useTimeline
} from '@minimact/core';

// Top-level constant → private static readonly field
const DEFAULT_PAGE_SIZE = 20;

// Top-level helper function → private static method
function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

interface CardProps {
  title: string;
  initialCount: number;
  onCountChange?: (count: number) => void;
}

export function ComponentExample({ title, initialCount, onCountChange }: CardProps) {
  // --- [State] fields ---
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- [Ref] fields ---
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // --- [Markdown] field ---
  const [content, setContent] = useMarkdown('# Hello');

  // --- [RazorMarkdown] field (initialized in OnInitialized) ---
  const [razorContent, setRazorContent] = useRazorMarkdown(`
    # Items: @items.Count
    @foreach(var item in items) {
      - @item
    }
  `);

  // --- useTemplate → extends base class ---
  useTemplate('_CardLayout', { title: 'Card' });

  // --- [Validation] field ---
  const emailField = useValidation('email', {
    required: true,
    pattern: /^[^@]+@[^@]+$/,
    minLength: 5
  });

  // --- Modal state ---
  const confirmModal = useModal();

  // --- Toggle state → generates Toggle method ---
  const [isOpen, toggleOpen] = useToggle(false);

  // --- Dropdown state ---
  const itemsDropdown = useDropdown(Routes.Api.Items.GetAll);

  // --- Pub/Sub ---
  const publish = usePub('notifications');
  const messages = useSub('notifications', msg => console.log(msg));

  // --- SignalR ---
  const hub = useSignalR('/hubs/updates', msg => {
    console.log('Received:', msg);
  });

  // --- [StateXTransform] attributes ---
  const [isActive] = useStateX(count, {
    selector: '#status',
    transform: c => c > 0,
    applyAs: 'class',
    applyIf: true
  });

  // --- [Timeline] / [Keyframe] attributes ---
  const animation = useTimeline({
    duration: 1000,
    keyframes: [
      { at: 0, opacity: 0 },
      { at: 100, opacity: 1 }
    ]
  });

  // --- [ServerTask] method ---
  const fetchItems = useServerTask(async () => {
    setIsLoading(true);
    const response = await fetch('/api/items');
    const data = await response.json();
    setIsLoading(false);
    return data;
  });

  // --- [OnStateChanged("count")] effect ---
  useEffect(() => {
    if (onCountChange) {
      onCountChange(count);
    }
  }, [count]);

  // --- [OnMounted] effect (empty deps) ---
  useEffect(() => {
    console.log('Mounted');
  }, []);

  // --- Local variables ---
  // Some become Render() locals, some become computed properties
  const doubleCount = count * 2; // Used in JSX only → Render() local
  const canSubmit = count > 0 && items.length > 0; // Used in handler → computed property

  // --- Event handlers → private methods ---
  const handleIncrement = () => {
    setCount(count + 1);
  };

  const handleReset = () => {
    setCount(initialCount);
    setItems([]);
  };

  // Handler using local var → local var promoted to computed property
  const handleSubmit = () => {
    if (canSubmit) {
      publish({ action: 'submit', count });
    }
  };

  // Async handler → async Task return type
  const handleAsyncAction = async () => {
    const response = await fetch('/api/action');
    console.log(response);
  };

  // --- Helper function in component ---
  function calculateTotal(price: number): number {
    return price * count;
  }

  return (
    <div ref={containerRef} className="card">
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <p>Double: {doubleCount}</p>
      <input ref={inputRef} />
      <button onClick={handleIncrement}>+</button>
      <button onClick={handleReset}>Reset</button>
      <button onClick={handleSubmit}>Submit</button>
      <button onClick={() => fetchItems()}>Load</button>
      <button onClick={toggleOpen}>Toggle</button>
      {isLoading && <span>Loading...</span>}
      {isOpen && <div>Open content</div>}
      <ul>
        {items.map((item, index) => (
          <li key={item}>
            {item} - {formatDate(new Date())}
            <button onClick={() => setItems(items.filter((_, i) => i !== index))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
