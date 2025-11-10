After reviewing both documents, here are some areas where I'd appreciate more clarity in the diagrams:

  1. Component Lifecycle & Initial Load

  - How does the initial page load work? Is it SSR → HTML → then SignalR connection upgrade?
  - What happens during the SignalR connection establishment? Is there a "rehydration" phase even though you avoid hydration?
  - How are components identified/tracked between server and client? (Component IDs, mounting, etc.)

  2. Prediction Engine Details

  - How does the prediction engine learn patterns? Is there a training phase?
  - What triggers predictions? State changes? User behavior patterns?
  - How are usePredictHint calls processed vs automatic predictions?
  - Where does prediction accuracy get measured and fed back?

  3. Error Handling & Edge Cases

  - What happens if SignalR disconnects mid-interaction?
  - How are conflicts resolved if client state diverges from server? (beyond just "corrections")
  - What's the fallback behavior when no JavaScript is available?
  - How are race conditions handled (e.g., rapid successive clicks)?

  4. Babel Plugin Transformation

  - What exactly does the TSX → C# transformation look like? A concrete example would help
  - How are TypeScript types mapped to C# types?
  - How are hooks detected and transformed?
  - What code-behind pattern is generated?

  5. Memory Management

  - How long do predictions stay in HintQueue before expiring?
  - How is the cache evicted/managed?
  - Server-side: How are component instances managed per-connection?
  - What's the cleanup flow when components unmount?

  6. Minimact Punch Observer Details

  - How do the three observers (Mutation, Intersection, Resize) coordinate?
  - When do snapshots get taken vs throttled?
  - How does the state sync timing work to avoid excessive updates?
  - What's the performance impact of having multiple useDomElementState hooks?

  7. Routing & Navigation

  - How does client-side navigation work in Minimact?
  - Are components preserved across route changes or recreated?
  - How does the SignalR connection persist across pages?

  8. Developer Experience

  - How does debugging work? What does the Playground Bridge actually show?
  - What does the DevTools browser extension (roadmap) visualize?
  - How are TypeScript errors surfaced during Babel transformation?

  9. Security Model

  - How are component methods authorized before invocation via SignalR?
  - What prevents malicious clients from calling arbitrary methods?
  - How is state validation handled (client sends count: 999999)?

  10. Multi-User Scenarios

  - How does state work with multiple users viewing the same component?
  - Is component state per-connection or shared?
  - How would you build something like a live dashboard with Minimact?

  Would adding diagrams for any of these areas be valuable? I think #1, #2, #4, and #9 would be particularly helpful for someone trying to understand the full system.
