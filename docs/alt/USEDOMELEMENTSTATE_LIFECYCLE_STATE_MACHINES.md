# useDomElementState Implementation Plan - Part 4: Lifecycle State Machines

**The Theatrical Engine: Every Element Becomes a Self-Aware Actor**

---

## Overview

Part 4 introduces **Lifecycle State Machines** - a revolutionary feature that transforms every DOM element into a finite state machine with declarative styles, templates, and transitions. This is the culmination of the "All is State" philosophy: not just reading state, but turning elements into **actors with scripts, costumes, and stage directions**.

**Estimated Timeline:** 6-8 weeks
**Difficulty:** 7.5/10
**Dependencies:** Parts 1-3 (especially Part 3 for temporal integration)

---

## The Problem: Scattered Animation and State Logic

### Current React Approach (Fragile):

```typescript
// State scattered across multiple variables
const [isOpen, setIsOpen] = useState(false);
const [isAnimating, setIsAnimating] = useState(false);
const [animationPhase, setAnimationPhase] = useState('idle');

// Timing logic in useEffect
useEffect(() => {
  if (isOpen && !isAnimating) {
    setIsAnimating(true);
    setAnimationPhase('entering');
    setTimeout(() => {
      setAnimationPhase('entered');
      setIsAnimating(false);
    }, 300);
  }
}, [isOpen]);

// CSS in separate file
.modal-enter { opacity: 0; }
.modal-enter-active { opacity: 1; transition: all 0.3s; }

// JSX scattered with conditionals
{isOpen && (
  <Modal className={animationPhase === 'entering' ? 'modal-enter-active' : ''}>
    {animationPhase === 'entered' && <ModalContent />}
  </Modal>
)}
```

**Problems:**
- ❌ State spread across 3+ variables
- ❌ Timing logic in imperative useEffect
- ❌ CSS separated from behavior
- ❌ Fragile, error-prone transitions
- ❌ No compile-time validation
- ❌ No predictive capabilities

---

## The Solution: Lifecycle State Machines

### The Minimact Approach (Unified):

```typescript
const modal = useDomElementState('#modal', {
  // Define the state machine
  lifecycleStates: ['hidden', 'entering', 'visible', 'exiting'],
  defaultState: 'hidden',

  // Styles bound to each state
  styles: {
    hidden: {
      opacity: 0,
      transform: 'scale(0.95)',
      pointerEvents: 'none'
    },
    entering: {
      transition: 'all 0.3s ease-out',
      opacity: 1,
      transform: 'scale(1)'
    },
    visible: {
      opacity: 1,
      transform: 'scale(1)'
    },
    exiting: {
      transition: 'all 0.2s ease-in',
      opacity: 0,
      transform: 'scale(0.95)'
    }
  },

  // Templates bound to each state
  templates: {
    hidden: null,
    entering: <ModalShell />,
    visible: <ModalContent withActions />,
    exiting: <ModalShell />
  },

  // Valid transitions (FSM rules)
  transitions: {
    hidden: ['entering'],
    entering: ['visible', 'exiting'],
    visible: ['exiting'],
    exiting: ['hidden']
  },

  // Lifecycle hooks
  onEnter: (state) => logAnalytics('modal_enter', state),
  onExit: (state) => cleanupResources(state),
  onTransition: (from, to) => console.log(`${from} → ${to}`)
});

// JSX - clean and declarative
<div ref={modal} style={modal.style}>
  {modal.template}
</div>

// Transition states
modal.transitionTo('entering');
// → Automatically applies styles.entering
// → Automatically renders templates.entering
// → Triggers onEnter hook
// → Validates transition is legal
// → Predictive engine caches 'visible' patches
```

**Benefits:**
- ✅ One unified state machine
- ✅ Styles co-located with states
- ✅ Templates co-located with states
- ✅ Declarative transitions with validation
- ✅ Compile-time state graph analysis
- ✅ Predictive patch caching

---

## Phase 1: Core State Machine Implementation (Weeks 1-2)

### 1.1 TypeScript/JavaScript API (Client-Side)

**File:** `src/client-runtime/src/lifecycle-state-machine.ts`

```typescript
export interface LifecycleStateConfig<TStates extends string> {
  // State machine definition
  lifecycleStates: TStates[];
  defaultState: TStates;

  // Styles per state (CSS-in-JS)
  styles?: Partial<Record<TStates, CSSProperties>>;

  // Templates per state (JSX elements)
  templates?: Partial<Record<TStates, ReactNode>>;

  // Transition rules (state machine graph)
  transitions?: Partial<Record<TStates, TStates[]>>;

  // Lifecycle hooks
  onEnter?: (state: TStates, previousState?: TStates) => void;
  onExit?: (state: TStates, nextState?: TStates) => void;
  onTransition?: (from: TStates, to: TStates) => void;

  // Timing configuration
  durations?: Partial<Record<TStates, number>>;  // Auto-transition after duration

  // Animation configuration
  easings?: Partial<Record<TStates, string>>;
}

export class LifecycleStateMachine<TStates extends string> {
  private currentState: TStates;
  private previousState?: TStates;
  private config: LifecycleStateConfig<TStates>;
  private stateStartTime: number;
  private transitionHistory: Array<{ from: TStates, to: TStates, timestamp: number }>;

  constructor(config: LifecycleStateConfig<TStates>) {
    this.config = config;
    this.currentState = config.defaultState;
    this.stateStartTime = Date.now();
    this.transitionHistory = [];

    this.validateConfig();
  }

  // Transition to new state
  transitionTo(newState: TStates): boolean {
    // Validate transition is allowed
    if (!this.canTransitionTo(newState)) {
      console.warn(`Invalid transition: ${this.currentState} → ${newState}`);
      return false;
    }

    const oldState = this.currentState;

    // Call onExit hook
    this.config.onExit?.(oldState, newState);

    // Update state
    this.previousState = oldState;
    this.currentState = newState;
    this.stateStartTime = Date.now();

    // Record history
    this.transitionHistory.push({
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });

    // Call onEnter hook
    this.config.onEnter?.(newState, oldState);

    // Call onTransition hook
    this.config.onTransition?.(oldState, newState);

    // Set up auto-transition if configured
    if (this.config.durations?.[newState]) {
      setTimeout(() => {
        const nextStates = this.config.transitions?.[newState];
        if (nextStates && nextStates.length === 1) {
          this.transitionTo(nextStates[0]);
        }
      }, this.config.durations[newState]);
    }

    return true;
  }

  // Check if transition is valid
  canTransitionTo(newState: TStates): boolean {
    // No transition rules = all transitions allowed
    if (!this.config.transitions) return true;

    const allowedStates = this.config.transitions[this.currentState];
    if (!allowedStates) return false;

    return allowedStates.includes(newState);
  }

  // Get current style for this state
  get style(): CSSProperties {
    return this.config.styles?.[this.currentState] || {};
  }

  // Get current template for this state
  get template(): ReactNode {
    return this.config.templates?.[this.currentState] || null;
  }

  // Get current state
  get lifecycleState(): TStates {
    return this.currentState;
  }

  // Get time in current state (milliseconds)
  get timeInState(): number {
    return Date.now() - this.stateStartTime;
  }

  // Get transition history
  get history(): Array<{ from: TStates, to: TStates, timestamp: number }> {
    return [...this.transitionHistory];
  }

  // Validate configuration
  private validateConfig(): void {
    // Ensure defaultState is in lifecycleStates
    if (!this.config.lifecycleStates.includes(this.config.defaultState)) {
      throw new Error(`defaultState "${this.config.defaultState}" not in lifecycleStates`);
    }

    // Warn about unreachable states
    if (this.config.transitions) {
      const reachableStates = this.findReachableStates();
      const unreachableStates = this.config.lifecycleStates.filter(
        state => !reachableStates.has(state)
      );

      if (unreachableStates.length > 0) {
        console.warn(`Unreachable states detected: ${unreachableStates.join(', ')}`);
      }
    }
  }

  // Find all reachable states from defaultState
  private findReachableStates(): Set<TStates> {
    if (!this.config.transitions) return new Set(this.config.lifecycleStates);

    const reachable = new Set<TStates>();
    const queue: TStates[] = [this.config.defaultState];

    while (queue.length > 0) {
      const state = queue.shift()!;
      if (reachable.has(state)) continue;

      reachable.add(state);

      const nextStates = this.config.transitions[state] || [];
      queue.push(...nextStates);
    }

    return reachable;
  }
}
```

---

### 1.2 Integration with useDomElementState

**File:** `src/client-runtime/src/use-dom-element-state.ts`

```typescript
export interface DomElementStateOptions {
  // ... existing options ...

  // Lifecycle state machine configuration
  lifecycle?: LifecycleStateConfig<any>;
}

export function useDomElementState(
  selector: string,
  options?: DomElementStateOptions
): DomElementState {
  // ... existing implementation ...

  // Create lifecycle state machine if configured
  const lifecycleMachine = options?.lifecycle
    ? new LifecycleStateMachine(options.lifecycle)
    : null;

  // Merge lifecycle machine into element state
  return {
    // ... existing properties ...

    // Lifecycle state machine
    lifecycleState: lifecycleMachine?.lifecycleState,
    transitionTo: (state) => {
      const success = lifecycleMachine?.transitionTo(state);
      if (success) {
        // Trigger re-render
        context.triggerRender();
      }
      return success;
    },
    style: lifecycleMachine?.style || {},
    template: lifecycleMachine?.template,
    timeInState: lifecycleMachine?.timeInState || 0,
    canTransitionTo: lifecycleMachine?.canTransitionTo.bind(lifecycleMachine)
  };
}
```

---

### 1.3 C# Server-Side Types

**File:** `src/Minimact.Core/Dom/LifecycleStateMachine.cs`

```csharp
public class LifecycleStateConfig<TState> where TState : struct, Enum
{
    public TState DefaultState { get; set; }
    public Dictionary<TState, CssProperties>? Styles { get; set; }
    public Dictionary<TState, List<TState>>? Transitions { get; set; }
    public Dictionary<TState, int>? Durations { get; set; }
}

public class LifecycleStateMachine<TState> where TState : struct, Enum
{
    private TState _currentState;
    private TState? _previousState;
    private readonly LifecycleStateConfig<TState> _config;
    private DateTime _stateStartTime;

    public LifecycleStateMachine(LifecycleStateConfig<TState> config)
    {
        _config = config;
        _currentState = config.DefaultState;
        _stateStartTime = DateTime.UtcNow;
    }

    public bool TransitionTo(TState newState)
    {
        if (!CanTransitionTo(newState))
        {
            return false;
        }

        _previousState = _currentState;
        _currentState = newState;
        _stateStartTime = DateTime.UtcNow;

        return true;
    }

    public bool CanTransitionTo(TState newState)
    {
        if (_config.Transitions == null) return true;

        if (!_config.Transitions.TryGetValue(_currentState, out var allowedStates))
        {
            return false;
        }

        return allowedStates.Contains(newState);
    }

    public TState LifecycleState => _currentState;
    public CssProperties? Style => _config.Styles?.GetValueOrDefault(_currentState);
    public TimeSpan TimeInState => DateTime.UtcNow - _stateStartTime;
}
```

---

## Phase 2: Visual Compiler Integration (Weeks 3-4)

### 2.1 State Machine Validation

**File:** `tools/visualcompiler/src/lifecycle-validator.ts`

```typescript
export class LifecycleValidator {
  validateStateMachine(config: LifecycleStateConfig<any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check defaultState is valid
    if (!config.lifecycleStates.includes(config.defaultState)) {
      errors.push(`defaultState "${config.defaultState}" not in lifecycleStates`);
    }

    // 2. Check for unreachable states
    const reachableStates = this.findReachableStates(config);
    const unreachableStates = config.lifecycleStates.filter(
      state => !reachableStates.has(state)
    );

    if (unreachableStates.length > 0) {
      warnings.push(`Unreachable states: ${unreachableStates.join(', ')}`);
    }

    // 3. Check for transition loops
    const loops = this.findTransitionLoops(config);
    if (loops.length > 0) {
      warnings.push(`Transition loops detected: ${loops.join(', ')}`);
    }

    // 4. Check all states have styles (if any styles defined)
    if (config.styles) {
      const statesWithoutStyles = config.lifecycleStates.filter(
        state => !config.styles![state]
      );

      if (statesWithoutStyles.length > 0) {
        warnings.push(`Missing styles for: ${statesWithoutStyles.join(', ')}`);
      }
    }

    // 5. Check all states have templates (if any templates defined)
    if (config.templates) {
      const statesWithoutTemplates = config.lifecycleStates.filter(
        state => !config.templates![state] && config.templates![state] !== null
      );

      if (statesWithoutTemplates.length > 0) {
        warnings.push(`Missing templates for: ${statesWithoutTemplates.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private findReachableStates(config: LifecycleStateConfig<any>): Set<string> {
    if (!config.transitions) return new Set(config.lifecycleStates);

    const reachable = new Set<string>();
    const queue = [config.defaultState];

    while (queue.length > 0) {
      const state = queue.shift()!;
      if (reachable.has(state)) continue;

      reachable.add(state);

      const nextStates = config.transitions[state] || [];
      queue.push(...nextStates);
    }

    return reachable;
  }

  private findTransitionLoops(config: LifecycleStateConfig<any>): string[] {
    if (!config.transitions) return [];

    const loops: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (state: string, path: string[]): void => {
      visited.add(state);
      recursionStack.add(state);
      path.push(state);

      const nextStates = config.transitions![state] || [];

      for (const nextState of nextStates) {
        if (!visited.has(nextState)) {
          dfs(nextState, [...path]);
        } else if (recursionStack.has(nextState)) {
          const loopStart = path.indexOf(nextState);
          const loop = [...path.slice(loopStart), nextState].join(' → ');
          loops.push(loop);
        }
      }

      recursionStack.delete(state);
    };

    for (const state of config.lifecycleStates) {
      if (!visited.has(state)) {
        dfs(state, []);
      }
    }

    return loops;
  }

  // Generate state graph visualization
  generateStateGraph(config: LifecycleStateConfig<any>): string {
    let graph = 'State Graph:\n';

    if (!config.transitions) {
      graph += '(All transitions allowed)\n';
      return graph;
    }

    const visited = new Set<string>();
    const queue = [config.defaultState];

    while (queue.length > 0) {
      const state = queue.shift()!;
      if (visited.has(state)) continue;
      visited.add(state);

      const nextStates = config.transitions[state] || [];

      if (nextStates.length > 0) {
        graph += `[${state}] → ${nextStates.map(s => `[${s}]`).join(', ')}\n`;
        queue.push(...nextStates);
      } else {
        graph += `[${state}] (terminal)\n`;
      }
    }

    return graph;
  }
}
```

---

### 2.2 Compile-Time Validation Output

**Example Output:**

```
LIFECYCLE STATE MACHINE VALIDATION
══════════════════════════════════════════

Component: Modal
State Machine: #modal

✅ Valid state machine configuration

WARNINGS:
⚠️  Unreachable states: error
⚠️  Missing styles for: hidden
⚠️  Transition loop detected: visible → exiting → visible

STATE GRAPH:
[hidden] → [entering]
[entering] → [visible], [exiting]
[visible] → [exiting]
[exiting] → [hidden]

REACHABLE STATES: hidden, entering, visible, exiting
UNREACHABLE STATES: error
```

---

## Phase 3: Predictive Integration (Weeks 5-6)

### 3.1 State Machine Prediction

**File:** `src/predictor/src/lifecycle-predictor.ts`

```typescript
export class LifecyclePredictor {
  // Predict next state based on current state and history
  predictNextState(
    machine: LifecycleStateMachine<any>,
    context: PredictionContext
  ): StatePrediction[] {
    const currentState = machine.lifecycleState;
    const transitions = machine.config.transitions?.[currentState] || [];

    if (transitions.length === 0) {
      return [];
    }

    // If only one possible transition, high confidence
    if (transitions.length === 1) {
      return [{
        state: transitions[0],
        confidence: 0.95,
        reason: 'deterministic-transition'
      }];
    }

    // Multiple transitions - analyze history
    const history = machine.transitionHistory;
    const predictions: StatePrediction[] = [];

    for (const nextState of transitions) {
      const confidence = this.calculateTransitionProbability(
        currentState,
        nextState,
        history
      );

      predictions.push({
        state: nextState,
        confidence,
        reason: 'historical-pattern'
      });
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  // Calculate probability of transition based on history
  private calculateTransitionProbability(
    from: string,
    to: string,
    history: TransitionHistory[]
  ): number {
    // Count how many times we've gone from -> to
    const relevantTransitions = history.filter(t => t.from === from);

    if (relevantTransitions.length === 0) {
      return 0.5; // No history, equal probability
    }

    const successfulTransitions = relevantTransitions.filter(t => t.to === to);

    return successfulTransitions.length / relevantTransitions.length;
  }

  // Predict based on time in state
  predictTimeBasedTransition(
    machine: LifecycleStateMachine<any>
  ): StatePrediction | null {
    const currentState = machine.lifecycleState;
    const duration = machine.config.durations?.[currentState];

    if (!duration) return null;

    const timeInState = machine.timeInState;
    const progress = timeInState / duration;

    // If close to auto-transition time, predict it
    if (progress > 0.8) {
      const transitions = machine.config.transitions?.[currentState];

      if (transitions && transitions.length === 1) {
        return {
          state: transitions[0],
          confidence: 0.9 + (progress - 0.8) * 0.5, // 0.9 to 1.0
          reason: 'time-based-auto-transition'
        };
      }
    }

    return null;
  }
}
```

---

### 3.2 Integration with usePredictHint

```typescript
// Predict modal will transition to 'visible'
usePredictHint('modal-visible', {
  trigger: modal.lifecycleState === 'entering',
  confidence: 0.95
});

// Predict toast will auto-dismiss
usePredictHint('toast-dismiss', {
  trigger: toast.lifecycleState === 'visible' &&
           toast.timeInState > 2500,
  predictedState: 'sliding-out',
  confidence: 0.9
});

// Predict based on historical patterns
usePredictHint('button-success', {
  trigger: button.lifecycleState === 'loading',
  // Predictor analyzes history: loading → success 90% of the time
  confidence: 'auto' // Let predictor calculate based on history
});
```

---

## Phase 4: Playground Visualization (Weeks 7-8)

### 4.1 State Machine Visualizer Component

**File:** `playground/frontend/src/components/LifecycleStateVisualizer.tsx`

```typescript
export function LifecycleStateVisualizer({
  machine
}: {
  machine: LifecycleStateMachine<any>
}) {
  return (
    <div className="lifecycle-visualizer">
      <div className="header">
        <h3>Lifecycle State Machine</h3>
        <div className="current-state">
          Current: <span className="badge">{machine.lifecycleState}</span>
        </div>
      </div>

      <div className="state-graph">
        <StateGraph
          states={machine.config.lifecycleStates}
          transitions={machine.config.transitions}
          currentState={machine.lifecycleState}
          previousState={machine.previousState}
        />
      </div>

      <div className="state-info">
        <div>Previous State: {machine.previousState || 'none'}</div>
        <div>Time in State: {machine.timeInState}ms</div>
      </div>

      <div className="predictions">
        <h4>Predicted Next States:</h4>
        <PredictionList predictions={machine.predictions} />
      </div>

      <div className="applied-styles">
        <h4>Applied Styles:</h4>
        <StyleInspector styles={machine.style} />
      </div>

      <div className="transition-history">
        <h4>Transition History:</h4>
        <TransitionTimeline history={machine.history} />
      </div>
    </div>
  );
}
```

---

### 4.2 Interactive State Graph

```typescript
function StateGraph({ states, transitions, currentState, previousState }) {
  return (
    <svg className="state-graph-svg">
      {/* Render nodes */}
      {states.map((state, i) => (
        <g key={state}>
          <circle
            cx={x}
            cy={y}
            r={30}
            className={classNames({
              'state-node': true,
              'current': state === currentState,
              'previous': state === previousState
            })}
          />
          <text x={x} y={y}>{state}</text>
        </g>
      ))}

      {/* Render edges */}
      {Object.entries(transitions).map(([from, toStates]) =>
        toStates.map(to => (
          <line
            key={`${from}-${to}`}
            className="transition-edge"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            markerEnd="url(#arrowhead)"
          />
        ))
      )}
    </svg>
  );
}
```

---

## Real-World Examples

### Example 1: Loading Button

```typescript
const submitButton = useDomElementState('#submit', {
  lifecycle: {
    lifecycleStates: ['idle', 'loading', 'success', 'error'],
    defaultState: 'idle',

    styles: {
      idle: {
        backgroundColor: '#3b82f6',
        cursor: 'pointer'
      },
      loading: {
        backgroundColor: '#9ca3af',
        cursor: 'wait'
      },
      success: {
        backgroundColor: '#10b981',
        cursor: 'default'
      },
      error: {
        backgroundColor: '#ef4444',
        cursor: 'pointer'
      }
    },

    templates: {
      idle: 'Submit',
      loading: <><Spinner /> Submitting...</>,
      success: <><CheckIcon /> Success!</>,
      error: <><XIcon /> Try Again</>
    },

    transitions: {
      idle: ['loading'],
      loading: ['success', 'error'],
      success: ['idle'],
      error: ['idle', 'loading']
    },

    durations: {
      success: 2000,  // Auto-reset to idle after 2s
      error: 3000     // Auto-reset to idle after 3s
    },

    onEnter: (state) => {
      if (state === 'success') {
        showSuccessToast();
      } else if (state === 'error') {
        showErrorToast();
      }
    }
  }
});

// Usage in component
async function handleSubmit() {
  submitButton.transitionTo('loading');

  try {
    await api.submitForm();
    submitButton.transitionTo('success');
    // Auto-resets to 'idle' after 2s
  } catch (error) {
    submitButton.transitionTo('error');
    // Auto-resets to 'idle' after 3s
  }
}

// JSX
<button ref={submitButton} style={submitButton.style}>
  {submitButton.template}
</button>
```

---

### Example 2: Toast Notification

```typescript
const toast = useDomElementState('.toast', {
  lifecycle: {
    lifecycleStates: ['hidden', 'sliding-in', 'visible', 'sliding-out'],
    defaultState: 'hidden',

    styles: {
      hidden: {
        transform: 'translateY(-100%)',
        opacity: 0,
        pointerEvents: 'none'
      },
      'sliding-in': {
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateY(0)',
        opacity: 1
      },
      visible: {
        transform: 'translateY(0)',
        opacity: 1
      },
      'sliding-out': {
        transition: 'all 0.2s cubic-bezier(0.4, 0, 1, 1)',
        transform: 'translateY(-100%)',
        opacity: 0
      }
    },

    transitions: {
      hidden: ['sliding-in'],
      'sliding-in': ['visible'],
      visible: ['sliding-out'],
      'sliding-out': ['hidden']
    },

    durations: {
      'sliding-in': 300,  // Auto-transition after animation
      visible: 3000       // Auto-dismiss after 3s
    },

    onEnter: (state, prevState) => {
      console.log(`Toast: ${prevState} → ${state}`);
    }
  }
});

// Show toast
function showToast(message: string) {
  toast.message = message;
  toast.transitionTo('sliding-in');
  // Auto-transitions: sliding-in (300ms) → visible (3000ms) → sliding-out → hidden
}
```

---

### Example 3: Multi-Step Form

```typescript
const formWizard = useDomElementState('.wizard', {
  lifecycle: {
    lifecycleStates: ['step1', 'step2', 'step3', 'submitting', 'complete'],
    defaultState: 'step1',

    templates: {
      step1: <PersonalInfoForm />,
      step2: <AddressForm />,
      step3: <ReviewForm />,
      submitting: <SubmittingSpinner />,
      complete: <SuccessMessage />
    },

    transitions: {
      step1: ['step2'],
      step2: ['step1', 'step3'],
      step3: ['step2', 'submitting'],
      submitting: ['complete', 'step3'], // Can go back on error
      complete: ['step1'] // Start over
    },

    onTransition: (from, to) => {
      // Track analytics
      trackWizardProgress(from, to);

      // Scroll to top on step change
      if (to.startsWith('step')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }
});

// Navigation
<div className="wizard-container">
  <StepIndicator currentStep={formWizard.lifecycleState} />

  <div className="wizard-content">
    {formWizard.template}
  </div>

  <div className="wizard-actions">
    {formWizard.canTransitionTo('step1') && (
      <button onClick={() => formWizard.transitionTo('step1')}>
        Back
      </button>
    )}

    {formWizard.canTransitionTo('step2') && (
      <button onClick={() => formWizard.transitionTo('step2')}>
        Next
      </button>
    )}

    {formWizard.lifecycleState === 'step3' && (
      <button onClick={() => formWizard.transitionTo('submitting')}>
        Submit
      </button>
    )}
  </div>
</div>
```

---

## Integration with Other Parts

### With Part 3 (Temporal Features):

```typescript
// Combine lifecycle state with history tracking
const modal = useDomElementState('#modal', {
  lifecycle: { /* ... */ }
});

// Track how long in each state
{modal.history.stateChanges.map(change => (
  <div>
    State: {change.state}, Duration: {change.duration}ms
  </div>
))}

// Detect oscillation between states
{modal.history.isOscillating &&
 modal.lifecycleState === 'exiting' &&
  <Warning>Modal opening/closing rapidly</Warning>}
```

### With Predictive Engine:

```typescript
// Rust predictor learns patterns
usePredictHint('auto-close', {
  trigger: modal.lifecycleState === 'visible' &&
           modal.history.avgTimeInState('visible') < 2000,
  // "User typically closes modal quickly → predict early close"
});
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('LifecycleStateMachine', () => {
  it('should transition to valid state', () => {
    const machine = new LifecycleStateMachine({
      lifecycleStates: ['a', 'b'],
      defaultState: 'a',
      transitions: { a: ['b'], b: ['a'] }
    });

    expect(machine.transitionTo('b')).toBe(true);
    expect(machine.lifecycleState).toBe('b');
  });

  it('should reject invalid transition', () => {
    const machine = new LifecycleStateMachine({
      lifecycleStates: ['a', 'b', 'c'],
      defaultState: 'a',
      transitions: { a: ['b'] } // Can't go a → c
    });

    expect(machine.transitionTo('c')).toBe(false);
    expect(machine.lifecycleState).toBe('a'); // Unchanged
  });

  it('should call lifecycle hooks', () => {
    const onEnter = jest.fn();
    const onExit = jest.fn();

    const machine = new LifecycleStateMachine({
      lifecycleStates: ['a', 'b'],
      defaultState: 'a',
      onEnter,
      onExit
    });

    machine.transitionTo('b');

    expect(onExit).toHaveBeenCalledWith('a', 'b');
    expect(onEnter).toHaveBeenCalledWith('b', 'a');
  });
});
```

---

## Performance Considerations

### Memory Management

- ✅ Limit transition history (circular buffer, max 100 entries)
- ✅ Clean up auto-transition timers on state change
- ✅ Use WeakMap for element → machine associations

### Optimization

- ✅ Batch style updates (apply all style changes in one DOM update)
- ✅ Memoize template renders (only re-render on state change)
- ✅ Skip validation in production builds

---

## Documentation Requirements

### 1. API Documentation
- Complete TypeScript definitions
- JSDoc comments on all public APIs
- Examples for each lifecycle hook

### 2. Tutorial Content
- "Getting Started with Lifecycle State Machines"
- "Common Patterns" guide
- Migration guide from manual state management

### 3. Visual Documentation
- State diagram examples
- Interactive playground demos
- Video tutorials

---

## Success Metrics

### Developer Experience
- ✅ 80% reduction in animation-related code
- ✅ Zero runtime state machine errors (all caught at compile-time)
- ✅ <5 minutes to implement complex multi-state UIs

### Performance
- ✅ <1ms transition overhead
- ✅ Zero memory leaks (automated leak detection in tests)
- ✅ Smooth 60fps animations

### Adoption
- ✅ Used in 50%+ of components in sample apps
- ✅ Positive community feedback
- ✅ Ecosystem integrations (animation libraries, etc.)

---

## Timeline Summary

| Week | Focus | Deliverables |
|------|-------|-------------|
| 1-2 | Core implementation | TypeScript/C# state machine classes |
| 3-4 | Visual Compiler integration | Validation, state graph generation |
| 5-6 | Predictive integration | Pattern learning, auto-prediction |
| 7-8 | Playground visualization | Interactive state graph, timeline |

**Total: 6-8 weeks**

---

## The Philosophical Completion

With Part 4, useDomElementState achieves its final form:

**Elements are no longer passive markup.**

They are **actors on a stage** with:
- 📜 Scripts (lifecycle states)
- 👔 Costumes (styles per state)
- 🎭 Roles (templates per state)
- 🎬 Stage directions (transitions)
- 📚 Performance history (temporal tracking)
- 🔮 Rehearsals (predictive caching)

**This is the Theatrical Engine.**

Every element can be a state machine. 🎭✨

---

**All is State. All is Performance. All is Predicted.**

🌵🏴‍☠️🤖🎭🌀⚡
