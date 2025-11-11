# Lifecycle State Machine - Quick Start Examples

## Example 1: Loading Button (Simple)

```typescript
import { DomElementState } from 'minimact-punch';

const submitButton = new DomElementState(document.querySelector('#submit'), {
  lifecycle: {
    states: ['idle', 'loading', 'success', 'error'],
    defaultState: 'idle',

    styles: {
      idle: {
        backgroundColor: '#3b82f6',
        color: 'white',
        cursor: 'pointer'
      },
      loading: {
        backgroundColor: '#9ca3af',
        cursor: 'wait'
      },
      success: {
        backgroundColor: '#10b981'
      },
      error: {
        backgroundColor: '#ef4444'
      }
    },

    templates: {
      idle: 'Submit',
      loading: '⏳ Submitting...',
      success: '✅ Success!',
      error: '❌ Try Again'
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
      console.log(`Button entered state: ${state}`);
    }
  }
});

// Usage
async function handleSubmit() {
  submitButton.lifecycle.transitionTo('loading');

  try {
    await api.submitForm();
    submitButton.lifecycle.transitionTo('success');
    // Automatically resets to 'idle' after 2s
  } catch (error) {
    submitButton.lifecycle.transitionTo('error');
    // Automatically resets to 'idle' after 3s
  }
}

// Apply current styles
Object.assign(submitButton.element.style, submitButton.lifecycle.style);

// Apply current template
submitButton.element.textContent = submitButton.lifecycle.template;
```

---

## Example 2: Toast Notification (Auto-Transitions)

```typescript
const toast = new DomElementState(document.querySelector('.toast'), {
  lifecycle: {
    states: ['hidden', 'sliding-in', 'visible', 'sliding-out'],
    defaultState: 'hidden',

    styles: {
      hidden: {
        transform: 'translateY(-100%)',
        opacity: '0',
        pointerEvents: 'none'
      },
      'sliding-in': {
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateY(0)',
        opacity: '1'
      },
      visible: {
        transform: 'translateY(0)',
        opacity: '1'
      },
      'sliding-out': {
        transition: 'all 0.2s cubic-bezier(0.4, 0, 1, 1)',
        transform: 'translateY(-100%)',
        opacity: '0'
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
    }
  }
});

// Show toast
function showToast(message) {
  toast.element.textContent = message;
  toast.lifecycle.transitionTo('sliding-in');
  // Auto-transitions: sliding-in (300ms) → visible (3000ms) → sliding-out → hidden

  // Apply styles
  Object.assign(toast.element.style, toast.lifecycle.style);
}
```

---

## Example 3: Multi-Step Wizard (Complex)

```typescript
const wizard = new DomElementState(document.querySelector('.wizard'), {
  lifecycle: {
    states: ['step1', 'step2', 'step3', 'submitting', 'complete'],
    defaultState: 'step1',

    transitions: {
      step1: ['step2'],
      step2: ['step1', 'step3'],
      step3: ['step2', 'submitting'],
      submitting: ['complete', 'step3'], // Can go back on error
      complete: ['step1'] // Start over
    },

    onTransition: (from, to) => {
      // Track analytics
      console.log(`Wizard: ${from} → ${to}`);

      // Scroll to top on step change
      if (to.startsWith('step')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }
});

// Navigation
function goToStep(step) {
  if (wizard.lifecycle.canTransitionTo(step)) {
    wizard.lifecycle.transitionTo(step);
  } else {
    console.warn(`Cannot transition to ${step} from ${wizard.lifecycle.lifecycleState}`);
  }
}

// Check what transitions are available
console.log('Available next steps:', wizard.lifecycle.nextStates);
// → ['step2'] if on step1

// Get current state
console.log('Current step:', wizard.lifecycle.lifecycleState);
// → 'step1'
```

---

## Example 4: Modal (with Predictive Hints)

```tsx
import { useDomElementState, usePredictHint } from '@minimact/core';

function Modal() {
  const modal = useDomElementState('#modal', {
    lifecycle: {
      states: ['hidden', 'entering', 'visible', 'exiting'],
      defaultState: 'hidden',

      styles: {
        hidden: {
          display: 'none',
          opacity: '0',
          transform: 'scale(0.95)'
        },
        entering: {
          display: 'flex',
          transition: 'all 0.3s ease-out',
          opacity: '1',
          transform: 'scale(1)'
        },
        visible: {
          display: 'flex',
          opacity: '1',
          transform: 'scale(1)'
        },
        exiting: {
          display: 'flex',
          transition: 'all 0.2s ease-in',
          opacity: '0',
          transform: 'scale(0.95)'
        }
      },

      transitions: {
        hidden: ['entering'],
        entering: ['visible', 'exiting'],
        visible: ['exiting'],
        exiting: ['hidden']
      },

      durations: {
        entering: 300,  // Auto-transition after animation
        exiting: 200    // Auto-transition after animation
      }
    }
  });

  // Predict modal will transition to 'visible' after entering
  usePredictHint('modal-visible', {
    trigger: modal.lifecycle.lifecycleState === 'entering',
    confidence: 0.95
  });

  return (
    <div
      ref={modal}
      style={modal.lifecycle.style}
      className="modal"
    >
      {modal.lifecycle.lifecycleState === 'visible' && (
        <ModalContent />
      )}
    </div>
  );
}
```

---

## API Reference

### LifecycleStateTracker Properties

```typescript
// State access
modal.lifecycle.lifecycleState          // Current state: 'visible'
modal.lifecycle.prevLifecycleState      // Previous state: 'entering'
modal.lifecycle.availableStates         // All states: ['hidden', 'entering', ...]
modal.lifecycle.nextStates              // Valid transitions: ['exiting']

// Style & Template access
modal.lifecycle.style                   // Current state's styles
modal.lifecycle.template                // Current state's template
modal.lifecycle.getStyleFor('hidden')   // Get style for specific state
modal.lifecycle.getTemplateFor('visible') // Get template for specific state

// Timing
modal.lifecycle.timeInState             // Milliseconds in current state
modal.lifecycle.stateDuration           // Configured duration (if any)
modal.lifecycle.stateProgress           // Progress 0-1 (if duration set)

// History
modal.lifecycle.history                 // Full transition history
modal.lifecycle.getRecentHistory(5)     // Last 5 transitions
modal.lifecycle.hasTransitioned('a', 'b') // Has this transition occurred?
modal.lifecycle.countTransitions('a', 'b') // How many times?
modal.lifecycle.getAverageTimeInState('visible') // Average time in state

// Predictions
modal.lifecycle.predictNextState()      // { state: 'exiting', confidence: 0.85 }
```

### LifecycleStateTracker Methods

```typescript
// Transitions
modal.lifecycle.transitionTo('visible') // Transition to state (returns boolean)
modal.lifecycle.canTransitionTo('hidden') // Check if valid (returns boolean)

// Validation
modal.lifecycle.hasTransitionLoops()    // Check for loops in state graph

// Cleanup
modal.lifecycle.destroy()               // Clear timers, reset state
```

---

## Best Practices

### 1. Use Descriptive State Names
```typescript
// ✅ Good
states: ['idle', 'loading', 'success', 'error']

// ❌ Avoid
states: ['state1', 'state2', 'state3']
```

### 2. Define Explicit Transitions
```typescript
// ✅ Good - explicit and safe
transitions: {
  idle: ['loading'],
  loading: ['success', 'error']
}

// ⚠️ Caution - allows any transition
transitions: undefined
```

### 3. Use Auto-Transitions for Animations
```typescript
// ✅ Good - auto-transition after animation
durations: {
  'sliding-in': 300  // Matches CSS transition duration
}
```

### 4. Add Lifecycle Hooks for Side Effects
```typescript
onEnter: (state) => {
  if (state === 'success') {
    showToast('Form submitted successfully!');
  }
},

onTransition: (from, to) => {
  analytics.track('state_transition', { from, to });
}
```

---

## Common Patterns

### Pattern 1: Loading States
```typescript
states: ['idle', 'loading', 'success', 'error']
transitions: {
  idle: ['loading'],
  loading: ['success', 'error'],
  success: ['idle'],
  error: ['idle', 'loading']
}
```

### Pattern 2: Modal/Dialog States
```typescript
states: ['hidden', 'entering', 'visible', 'exiting']
transitions: {
  hidden: ['entering'],
  entering: ['visible'],
  visible: ['exiting'],
  exiting: ['hidden']
}
```

### Pattern 3: Multi-Step Process
```typescript
states: ['step1', 'step2', 'step3', 'complete']
transitions: {
  step1: ['step2'],
  step2: ['step1', 'step3'],
  step3: ['step2', 'complete'],
  complete: ['step1']
}
```

### Pattern 4: Toggle States
```typescript
states: ['off', 'on']
transitions: {
  off: ['on'],
  on: ['off']
}
```

---

## Performance Tips

1. **Limit History Size**: The tracker keeps last 100 transitions by default
2. **Use Auto-Transitions**: Let the tracker handle timing instead of manual setTimeout
3. **Leverage Predictions**: Use `predictNextState()` for pre-caching patches
4. **Cleanup**: Always call `destroy()` when unmounting components

---

🎭 **The Theatrical Engine** - Every element is an actor with scripts, costumes, and stage directions.
