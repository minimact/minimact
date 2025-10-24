# Pseudo-State Reactivity - Usage Guide

## Overview

Pseudo-State Reactivity makes CSS pseudo-selectors (`:hover`, `:active`, `:focus`, `:disabled`) into reactive JavaScript values. **No more manual event handlers for tracking hover/focus state!**

```tsx
// ❌ OLD WAY - Manual state tracking
const [isHovered, setIsHovered] = useState(false);

<button
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  {isHovered && <Tooltip />}
</button>

// ✅ NEW WAY - Automatic pseudo-state tracking
const btn = useDomElementState();

<button ref={el => btn.attachElement(el)}>
  {btn.state.hover && <Tooltip />}
</button>
```

---

## Available Pseudo-States

### 1. `hover` - Mouse Hover State

```tsx
const box = useDomElementState();

<div ref={el => box.attachElement(el)}>
  {box.state.hover && <HoverOverlay />}
</div>
```

**How it works:**
- Tracks `mouseenter` and `mouseleave` events
- Updates immediately when mouse enters/exits element
- Works with Web Worker predictions for instant tooltips

---

### 2. `active` - Mouse Press State

```tsx
const button = useDomElementState();

<button ref={el => button.attachElement(el)}>
  {button.state.active && <PressAnimation />}
  Click me
</button>
```

**How it works:**
- Tracks `mousedown` and `mouseup` events
- Automatically clears on `mouseleave` (if mouseup happens outside)
- Perfect for press-feedback animations

---

### 3. `focus` - Keyboard Focus State

```tsx
const input = useDomElementState();

<input ref={el => input.attachElement(el)} />
{input.state.focus && (
  <div className="help-text">
    Enter your email address
  </div>
)}
```

**How it works:**
- Tracks `focus` and `blur` events
- Works with Web Worker predictions for pre-fetched help text
- Useful for keyboard navigation UX

---

### 4. `disabled` - Disabled State

```tsx
const button = useDomElementState();

<button
  ref={el => button.attachElement(el)}
  disabled={isProcessing}
>
  Submit
</button>

{button.state.disabled && (
  <div className="notice">Button is disabled</div>
)}
```

**How it works:**
- Tracks `disabled` attribute via MutationObserver
- Also tracks `aria-disabled="true"`
- Updates automatically when attribute changes

---

### 5. `checked` - Checkbox/Radio State

```tsx
const checkbox = useDomElementState();

<input
  type="checkbox"
  ref={el => checkbox.attachElement(el)}
/>
{checkbox.state.checked && (
  <div className="success">✓ Agreed to terms</div>
)}
```

**How it works:**
- Tracks `.checked` property for `<input>` elements
- Also tracks `aria-checked="true"` for custom checkboxes
- Updates automatically when checkbox state changes

---

### 6. `invalid` - Form Validation State

```tsx
const email = useDomElementState();

<input
  type="email"
  required
  ref={el => email.attachElement(el)}
/>
{email.state.invalid && (
  <div className="error">Please enter a valid email</div>
)}
```

**How it works:**
- Tracks `validity.valid` for form elements
- Also tracks `aria-invalid="true"` for custom inputs
- Updates automatically when validation state changes

---

## Collection Queries

Query pseudo-state across **multiple elements**:

```tsx
const buttons = useDomElementState('button');

{/* Global hover indicator */}
{buttons.some(b => b.state.hover) && (
  <div className="global-tooltip">
    Hovering over a button
  </div>
)}

{/* All buttons enabled? */}
{buttons.every(b => !b.state.disabled) && (
  <div className="status">All actions available ✓</div>
)}

{/* Any button focused? */}
{buttons.some(b => b.state.focus) && (
  <KeyboardShortcutsHelp />
)}
```

---

## Integration with Web Worker

Pseudo-state works **seamlessly with the Confidence Worker** for predictive hints!

### Hover Predictions

```tsx
const card = useDomElementState();

<div ref={el => card.attachElement(el)}>
  {/* Web Worker flow:
      1. Mouse moves toward card (worker analyzes trajectory)
      2. 87% confident hover in 180ms (worker predicts)
      3. Server pre-computes tooltip patches (cached)
      4. User actually hovers (0ms - cache hit!)
  */}
  {card.state.hover && <Tooltip />}
</div>
```

### Focus Predictions

```tsx
const input = useDomElementState();

<input ref={el => input.attachElement(el)} />
{/* Web Worker flow:
    1. User presses Tab (worker detects)
    2. 95% confident this input will be focused (deterministic)
    3. Server pre-computes help text patches (cached)
    4. Input actually receives focus (0ms - cache hit!)
*/}
{input.state.focus && <HelpText />}
```

---

## Advanced Examples

### Hover-Driven Dropdown Menu

```tsx
const menu = useDomElementState();

<div ref={el => menu.attachElement(el)} className="menu">
  <button>Menu</button>

  {menu.state.hover && (
    <div className="dropdown">
      <MenuItem>Profile</MenuItem>
      <MenuItem>Settings</MenuItem>
      <MenuItem>Logout</MenuItem>
    </div>
  )}
</div>
```

### Focus-Driven Form Helper

```tsx
const fields = useDomElementState('.form-field input');

<form>
  {fields.map((field, i) => (
    <div key={i}>
      <input className="form-field" />

      {field.state.focus && (
        <div className="field-helper">
          {helperText[i]}
        </div>
      )}

      {field.state.invalid && (
        <div className="field-error">
          {errorText[i]}
        </div>
      )}
    </div>
  ))}
</form>
```

### Active State Animations

```tsx
const buttons = useDomElementState('button');

<div className="button-grid">
  {buttons.map((btn, i) => (
    <button
      key={i}
      className={btn.state.active ? 'pressing' : ''}
    >
      Button {i + 1}
    </button>
  ))}
</div>
```

### Disabled State Feedback

```tsx
const actions = useDomElementState('.action-button');

<div className="toolbar">
  {actions.some(a => a.state.disabled) && (
    <div className="notice">
      Some actions are unavailable
    </div>
  )}

  {actions.every(a => a.state.disabled) && (
    <div className="warning">
      All actions are disabled
    </div>
  )}
</div>
```

---

## Multi-Dimensional Queries

Combine pseudo-state with other DOM dimensions:

```tsx
const products = useDomElementState('.product');

{/* Hover + Intersection + Statistics */}
{products.state.hover &&                      // User hovering
 products.isIntersecting &&                   // In viewport
 products.vals.avg() > 100 &&                 // Expensive items
 <PremiumUpsellModal />}

{/* Focus + Invalid + Count */}
{products.some(p => p.state.focus) &&         // A field is focused
 products.some(p => p.state.invalid) &&       // Some are invalid
 products.count > 5 &&                        // More than 5 items
 <ValidationSummary />}
```

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| **CPU Overhead (idle)** | <0.5% |
| **Memory per element** | ~1KB |
| **Event latency** | <1ms |
| **Creation time** | Lazy (on first `.state` access) |
| **Cleanup** | Automatic (on destroy) |

### Lazy Initialization

Pseudo-state tracker is **only created when accessed**:

```tsx
const box = useDomElementState();

// No pseudo-state tracker yet (not accessed)
console.log(box.childrenCount); // 3

// Tracker created on first access
console.log(box.state.hover); // false (tracker now exists)
```

This means **zero overhead** if you never access `.state`!

---

## Integration with Existing Code

### Standalone Mode

Works without Minimact:

```typescript
import { DomElementState } from 'minimact-punch';

const element = document.querySelector('.my-element');
const state = new DomElementState(element);

// Access pseudo-states
console.log(state.state.hover); // true/false

// React to changes
state.setOnChange(() => {
  console.log('Pseudo-state changed:', state.state.getAll());
});

// Cleanup when done
state.destroy();
```

### Integrated Mode

With Minimact components:

```tsx
import { useDomElementState } from 'minimact-punch';

export function MyComponent() {
  const box = useDomElementState();

  return (
    <div ref={el => box.attachElement(el)}>
      {box.state.hover && <Tooltip />}
    </div>
  );
}
```

---

## Debugging

### Enable Debug Logging

```typescript
const box = useDomElementState();

// Log all state changes
box.setOnChange(() => {
  console.log('Pseudo-state:', box.state.getAll());
});
```

**Output:**
```
Pseudo-state: { hover: true, active: false, focus: false, disabled: false, checked: false, invalid: false }
```

### Inspect State

```typescript
// Get all states as object
const allStates = box.state.getAll();
console.log(allStates);

// Or access individually
console.log({
  hover: box.state.hover,
  active: box.state.active,
  focus: box.state.focus,
  disabled: box.state.disabled,
  checked: box.state.checked,
  invalid: box.state.invalid,
});
```

---

## Best Practices

### 1. Use for Interactive Elements

```tsx
// ✅ GOOD: Track hover on interactive elements
const button = useDomElementState();
<button ref={button}>
  {button.state.hover && <Tooltip />}
</button>

// ❌ AVOID: Tracking hover on static text
const text = useDomElementState();
<p ref={text}>
  {text.state.hover && <Something />}  // Probably unnecessary
</p>
```

### 2. Combine with Predictions

```tsx
// ✅ GOOD: Let worker predict hover
const card = useDomElementState();
{card.state.hover && <Tooltip />}  // Worker pre-fetches!

// ❌ AVOID: Manual predictions for pseudo-state
usePredictHint('hover', { hover: true });  // Worker does this automatically
```

### 3. Use Collection Queries for Global State

```tsx
// ✅ GOOD: Query across all buttons
const buttons = useDomElementState('button');
{buttons.some(b => b.state.hover) && <GlobalTooltip />}

// ❌ AVOID: Tracking each button individually
const btn1 = useDomElementState();
const btn2 = useDomElementState();
// ... (too verbose)
```

---

## Migration Guide

### From Manual Hover Tracking

**Before:**
```tsx
const [isHovered, setIsHovered] = useState(false);

<div
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  {isHovered && <Content />}
</div>
```

**After:**
```tsx
const div = useDomElementState();

<div ref={el => div.attachElement(el)}>
  {div.state.hover && <Content />}
</div>
```

**Benefits:**
- 5 fewer lines of code
- No manual event handlers
- Works with Web Worker predictions
- Automatic cleanup

---

## Summary

**Pseudo-State Reactivity transforms imperative event tracking into declarative reactive queries.**

### What You Get:
- ✅ 6 reactive pseudo-states (hover, active, focus, disabled, checked, invalid)
- ✅ Zero overhead until first `.state` access
- ✅ Automatic cleanup on destroy
- ✅ Works with Web Worker predictions
- ✅ Collection queries (`.some()`, `.every()`)
- ✅ Multi-dimensional queries (combine with other features)

### The Philosophy:

> **"CSS pseudo-selectors are invisible to JavaScript. Make them visible. Make them reactive. Make them first-class."**

The cactus doesn't just react to the environment. **The cactus IS the environment.** 🌵

---

**Part of the minimact-punch Reality Engine.**
