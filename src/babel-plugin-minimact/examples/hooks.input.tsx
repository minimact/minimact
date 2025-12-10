/**
 * Example: hooks.cjs - Extracts all hook calls
 *
 * Supported hooks:
 * - useState, useClientState, useProtectedState, useStateX
 * - useEffect, useRef
 * - useMarkdown, useRazorMarkdown, useTemplate
 * - useValidation, useModal, useToggle, useDropdown
 * - usePub, useSub, useSignalR
 * - useMicroTask, useMacroTask
 * - usePredictHint
 * - useServerTask, usePaginatedServerTask
 * - useMvcState, useMvcViewModel
 * - Custom hooks (useCounter, etc.)
 */
import {
  useState, useClientState, useProtectedState, useStateX,
  useEffect, useRef,
  useMarkdown, useRazorMarkdown, useTemplate,
  useValidation, useModal, useToggle, useDropdown,
  usePub, useSub, useSignalR,
  useMicroTask, useMacroTask,
  usePredictHint,
  useServerTask, usePaginatedServerTask,
  useMvcState, useMvcViewModel
} from '@minimact/core';
import { useCounter } from './hooks/useCounter';

// ViewModel interface for useMvcState type inference
interface UserViewModel {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}

export function HooksExample() {
  // 1. useState - server state with [State] attribute
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [price, setPrice] = useState<decimal>(19.99); // explicit type

  // 2. useClientState - client-only state (no server roundtrip)
  const [theme, setTheme] = useClientState('light');

  // 3. useProtectedState - lifted state that parent cannot access
  const [secret, setSecret] = useProtectedState('hidden');

  // 4. useStateX - declarative state projections
  const [isActive] = useStateX(count, {
    selector: c => c > 0,
    applyAs: 'class',
    applyIf: true
  });

  // 5. useRef - DOM references with [Ref] attribute
  const inputRef = useRef(null);
  const formRef = useRef(null);

  // 6. useEffect - side effects
  useEffect(() => {
    console.log('Count changed:', count);
    return () => console.log('Cleanup');
  }, [count]);

  // 7. useMarkdown - markdown state → MarkdownHelper.ToHtml()
  const [markdown, setMarkdown] = useMarkdown('# Hello');

  // 8. useRazorMarkdown - markdown with Razor syntax
  const [razorContent, setRazorContent] = useRazorMarkdown(`
    # Welcome @title
    @foreach(var item in items) {
      - @item
    }
  `);

  // 9. useTemplate - layout inheritance
  useTemplate('_Layout', { title: 'My Page' });

  // 10. useValidation - field validation with rules
  const emailValidation = useValidation('email', {
    required: true,
    pattern: /^[^@]+@[^@]+$/,
    minLength: 5,
    maxLength: 100
  });

  // 11. useModal - modal dialog state
  const confirmModal = useModal();

  // 12. useToggle - boolean toggle with Toggle method
  const [isOpen, toggleOpen] = useToggle(false);

  // 13. useDropdown - dropdown with route data source
  const unitsDropdown = useDropdown(Routes.Api.Units.GetAll);

  // 14. usePub/useSub - pub/sub messaging
  const publish = usePub('notifications');
  const messages = useSub('notifications', (msg) => console.log(msg));

  // 15. useSignalR - real-time SignalR connection
  const chat = useSignalR('/hubs/chat', (message) => {
    console.log('Received:', message);
  });

  // 16. useMicroTask/useMacroTask - task scheduling
  useMicroTask(() => {
    console.log('Runs immediately after render');
  });

  useMacroTask(() => {
    console.log('Runs after 1 second');
  }, 1000);

  // 17. usePredictHint - predictive prefetching
  usePredictHint('next-page', { count: count + 1 });

  // 18. useServerTask - async server operations → [ServerTask] attribute
  const fetchData = useServerTask(async (id: number) => {
    const response = await fetch(`/api/data/${id}`);
    return await response.json();
  });

  // 19. useServerTask with streaming
  const streamData = useServerTask(async function* (query: string) {
    yield 'Starting...';
    yield 'Processing...';
    yield 'Done!';
  }, { stream: true, estimatedChunks: 3 });

  // 20. useServerTask with Rust runtime
  const computeHeavy = useServerTask(async (numbers: number[]) => {
    return numbers.reduce((a, b) => a + b, 0);
  }, { runtime: 'rust', parallel: true });

  // 21. usePaginatedServerTask - paginated data with fetch + count tasks
  const users = usePaginatedServerTask(
    async ({ page, pageSize, filters }) => {
      const response = await fetch(`/api/users?page=${page}&size=${pageSize}`);
      return await response.json();
    },
    {
      pageSize: 20,
      getTotalCount: async ({ filters }) => {
        const response = await fetch('/api/users/count');
        return await response.json();
      }
    }
  );

  // 22. useMvcState - access MVC ViewModel properties
  const [userName, setUserName] = useMvcState<string>('userName');
  const [userEmail] = useMvcState<string>('userEmail'); // read-only

  // 23. useMvcViewModel - access entire ViewModel
  const viewModel = useMvcViewModel<UserViewModel>();

  // 24. Custom hook - generates [Hook] class + VComponentWrapper
  const [counterValue, increment, decrement, reset, counterUI] = useCounter('myCounter', 0);

  return (
    <div>
      <input ref={inputRef} value={name} onInput={(e) => setName(e.target.value)} />
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={toggleOpen}>Toggle</button>
      {isOpen && <div>Open content</div>}
      {counterUI}
    </div>
  );
}
