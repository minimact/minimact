# Minimact SWIG - Template DevTools Specification

## Overview

This document specifies the **Template Inspector** features for Minimact SWIG Electron DevTools. These features enable developers to visualize, debug, and optimize the parameterized template patch system.

---

## 1. Template Inspector

### Purpose
Display all `[LoopTemplate]` and other template attributes for a selected component, showing the complete template structure in a navigable tree view.

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Component: TodoList                          [Refresh] [⚙]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Templates (3)                                                │
│  ├─ 📋 Loop Template: "todos"                                │
│  │   ├─ State Key: todos                                     │
│  │   ├─ Array Binding: todos                                 │
│  │   ├─ Item Variable: todo                                  │
│  │   ├─ Index Variable: index                                │
│  │   ├─ Key Binding: item.id                                 │
│  │   └─ Item Template                                        │
│  │       ├─ 🏷️ Element: li                                    │
│  │       │   ├─ Props                                        │
│  │       │   │   └─ className (conditional)                  │
│  │       │   │       ├─ Bindings: [item.done]               │
│  │       │   │       ├─ true → "done"                        │
│  │       │   │       └─ false → "pending"                    │
│  │       │   └─ Children                                     │
│  │       │       ├─ 🏷️ Element: span                          │
│  │       │       │   └─ 📝 Text: "{0}"                       │
│  │       │       │       └─ Bindings: [item.text]           │
│  │       │       └─ 🏷️ Element: button                        │
│  │       │           └─ 📝 Text: "{0}" (conditional)         │
│  │       │               ├─ Bindings: [item.done]           │
│  │       │               ├─ true → "✓"                       │
│  │       │               └─ false → "○"                      │
│  │                                                            │
│  ├─ 📝 Static Template: "[0].h1[0].text[0]"                  │
│  │   └─ Template: "Todo List"                                │
│  │                                                            │
│  └─ 🔄 Dynamic Template: "div[0].text[0]"                    │
│      ├─ Template: "{0}"                                      │
│      └─ Bindings: [__complex__]                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Features

#### 1.1 Tree View
- **Expandable/collapsible** nodes for deep template structures
- **Icon indicators** for template types:
  - 📋 Loop templates
  - 📝 Static templates
  - 🔄 Dynamic templates
  - 🔀 Conditional templates
  - 🏷️ Element templates
- **Syntax highlighting** for JSON template data
- **Copy button** to copy template JSON to clipboard

#### 1.2 Template Metadata
Display for each template:
- **State Key** - Which state variable the template tracks
- **Bindings** - Array of binding paths (e.g., `["item.done", "item.text"]`)
- **Type** - `static`, `dynamic`, `conditional`, `loop`
- **Path** - DOM path reference (e.g., `"[0].ul[0].li[*]"`)
- **Slots** - Slot indices used (e.g., `[0, 1, 2]`)
- **Generated At** - Timestamp of template generation

#### 1.3 Search & Filter
- **Search box** to find templates by state key, binding, or path
- **Filters**:
  - Show only loop templates
  - Show only conditional templates
  - Show only unused templates
  - Show templates with specific bindings

#### 1.4 Context Menu
Right-click on template node:
- **Copy Template JSON** - Copy to clipboard
- **Preview with Current State** - Open preview panel
- **Show Bindings** - Highlight in Bindings tab
- **Jump to Source** - Open TSX file in editor at line
- **Export Template** - Save as .json file

---

## 2. Template Bindings

### Purpose
Show all state bindings used by templates in the selected component, enabling developers to understand data flow and dependencies.

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Bindings for: TodoList                       [Refresh] [⚙]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  State Bindings (5)                            Sort by: Usage│
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔗 todos                                    Used: 1x │    │
│  │    Type: array                                       │    │
│  │    Templates:                                        │    │
│  │    • Loop Template: "todos"                          │    │
│  │    Current Value: Array(3)                           │    │
│  │    [View Details] [Watch]                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔗 item.done                                Used: 2x │    │
│  │    Type: boolean                                     │    │
│  │    Templates:                                        │    │
│  │    • Loop Template: "todos" → className              │    │
│  │    • Loop Template: "todos" → button text            │    │
│  │    Sample Values: true, false                        │    │
│  │    [View Details] [Watch]                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔗 item.text                                Used: 1x │    │
│  │    Type: string                                      │    │
│  │    Templates:                                        │    │
│  │    • Loop Template: "todos" → span text              │    │
│  │    Sample Values: "Buy milk", "Walk dog"             │    │
│  │    [View Details] [Watch]                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔗 item.id                                  Used: 1x │    │
│  │    Type: number                                      │    │
│  │    Templates:                                        │    │
│  │    • Loop Template: "todos" → key binding            │    │
│  │    Sample Values: 1, 2, 3                            │    │
│  │    [View Details] [Watch]                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⚠️ __complex__                              Used: 1x │    │
│  │    Type: computed                                    │    │
│  │    Templates:                                        │    │
│  │    • Dynamic Template: "div[0].text[0]"              │    │
│  │    Warning: Requires server evaluation               │    │
│  │    [View Details]                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Features

#### 2.1 Binding List
For each binding, display:
- **Binding Path** - Full dotted path (e.g., `item.user.name`)
- **Type** - Inferred type (string, number, boolean, array, object, computed)
- **Usage Count** - How many templates use this binding
- **Templates List** - Which templates reference this binding
- **Current Value** - Live value from component state
- **Sample Values** - Historical values seen (for arrays/loops)

#### 2.2 Binding Details Panel
Click **[View Details]** to expand:
```
┌───────────────────────────────────────────────────────┐
│  Binding: item.done                                   │
├───────────────────────────────────────────────────────┤
│  Path: item.done                                      │
│  Type: boolean                                        │
│  Usage: 2 templates                                   │
│                                                        │
│  Current State:                                       │
│  todos[0].done = true                                 │
│  todos[1].done = false                                │
│  todos[2].done = false                                │
│                                                        │
│  Templates Using This Binding:                        │
│  1. Loop Template: "todos" → li.className             │
│     • Conditional: true="done", false="pending"       │
│  2. Loop Template: "todos" → button text              │
│     • Conditional: true="✓", false="○"                │
│                                                        │
│  Value History: (Last 10 changes)                     │
│  • 14:32:45 - todos[0].done changed: false → true     │
│  • 14:31:22 - todos[2] added with done=false          │
│  • 14:30:10 - todos[1].done changed: true → false     │
│                                                        │
│  [Copy Path] [Watch Changes] [Jump to State]          │
└───────────────────────────────────────────────────────┘
```

#### 2.3 Watch Mode
Click **[Watch]** to add binding to watch list:
- Real-time value updates
- Change notifications (toast/sound)
- Value change timeline
- Conditional evaluation results

#### 2.4 Dependency Graph
Visual graph showing:
- State variables (blue nodes)
- Templates (green nodes)
- Bindings (edges connecting state → templates)
- Click nodes to highlight related templates

---

## 3. Template Preview

### Purpose
Render templates with current or custom state values to preview output before applying changes.

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Template Preview: Loop Template "todos"      [Reset] [⚙]   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  State Editor                                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ {                                                    │    │
│  │   "todos": [                                         │    │
│  │     {                                                │    │
│  │       "id": 1,                                       │    │
│  │       "text": "Buy milk",                            │    │
│  │       "done": false                                  │    │
│  │     },                                               │    │
│  │     {                                                │    │
│  │       "id": 2,                                       │    │
│  │       "text": "Walk dog",                            │    │
│  │       "done": true                                   │    │
│  │     }                                                │    │
│  │   ]                                                  │    │
│  │ }                                                    │    │
│  │                                                      │    │
│  │ [Use Current State] [Load from File] [Examples ▾]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Preview Output                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ <ul>                                                 │    │
│  │   <li class="pending">                               │    │
│  │     <span>Buy milk</span>                            │    │
│  │     <button>○</button>                               │    │
│  │   </li>                                              │    │
│  │   <li class="done">                                  │    │
│  │     <span>Walk dog</span>                            │    │
│  │     <button>✓</button>                               │    │
│  │   </li>                                              │    │
│  │ </ul>                                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Live Preview (Rendered)                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  • Buy milk                                      ○   │    │
│  │  • Walk dog                                      ✓   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Bindings Resolved:                                           │
│  • item.id: [1, 2]                                            │
│  • item.text: ["Buy milk", "Walk dog"]                       │
│  • item.done: [false, true]                                  │
│                                                               │
│  Template Application Time: 1.23ms                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Features

#### 3.1 State Editor
- **JSON editor** with syntax highlighting
- **Monaco editor** integration for intellisense
- **Validation** against TypeScript types
- **Quick actions**:
  - Use Current State (from live app)
  - Load from File (.json)
  - Examples dropdown (common test cases)
  - Reset to default

#### 3.2 Preview Modes
Toggle between views:
1. **HTML Output** - Formatted HTML string
2. **Rendered Preview** - Live DOM render
3. **Side-by-Side** - Both views
4. **Diff Mode** - Compare before/after state changes

#### 3.3 Binding Resolution Panel
Show how each binding was resolved:
```
item.done (array[0]) → false
  ↓ Conditional Template
  ↓ Branch: false
  ↓ Output: "pending"

item.text (array[0]) → "Buy milk"
  ↓ Slot Template: "{0}"
  ↓ Slot [0] = "Buy milk"
  ↓ Output: "Buy milk"
```

#### 3.4 Interactive State Editing
- **Click binding** to edit value inline
- **Toggle booleans** with checkbox
- **Drag slider** for numbers
- **Text input** for strings
- **Add/Remove** array items
- **See preview update** in real-time

#### 3.5 Test Cases
Save/load test scenarios:
```
Test Cases (3)
├─ ✅ All todos completed
│   └─ todos = [{ done: true }, { done: true }]
├─ ⚠️ Empty todo list
│   └─ todos = []
└─ ✅ Mixed states
    └─ todos = [{ done: true }, { done: false }]

[New Test Case] [Run All] [Export]
```

---

## 4. Template Coverage

### Purpose
Track which templates have been used during runtime and compare template application vs full server renders.

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Template Coverage: TodoList              Time: Last 5 min   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Summary                                                      │
│  ┌──────────────────────────────────────────┐               │
│  │  Template Applications:  47              │               │
│  │  Full Renders:           3               │               │
│  │  Coverage:               94%             │               │
│  │  Savings:                ~280ms          │               │
│  └──────────────────────────────────────────┘               │
│                                                               │
│  Template Usage                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📋 Loop Template: "todos"                           │    │
│  │    ████████████████████░░ 89% (42/47 renders)       │    │
│  │    Last Used: 2s ago                                │    │
│  │    Avg Application Time: 1.8ms                      │    │
│  │    [Details] [Performance]                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📝 Static Template: "[0].h1[0].text[0]"             │    │
│  │    ████████████████████░░ 100% (3/3 renders)        │    │
│  │    Last Used: 45s ago                               │    │
│  │    Avg Application Time: 0.2ms                      │    │
│  │    [Details] [Performance]                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔄 Dynamic Template: "div[0].text[0]"               │    │
│  │    ░░░░░░░░░░░░░░░░░░░░░ 0% (0/47 renders)          │    │
│  │    Never Used                                       │    │
│  │    Warning: Template never applied                  │    │
│  │    [Investigate] [Remove?]                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Render Timeline (Last 50 renders)                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  14:35 │█│                          Template         │    │
│  │  14:34 │█│█│█│█│                  Templates (4x)    │    │
│  │  14:33 │▓│                          Full Render      │    │
│  │  14:32 │█│█│█│                     Templates (3x)    │    │
│  │  14:31 │█│█│█│█│█│█│               Templates (6x)    │    │
│  │  14:30 │▓│                          Full Render      │    │
│  │         └──────────────────────────────────────────┘│    │
│  │         Legend: █ Template  ▓ Full Render           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Export Report] [Clear Stats] [Filter by Template]          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Features

#### 4.1 Coverage Metrics
- **Template Application Count** - How many times templates were used
- **Full Render Count** - How many times full server render was required
- **Coverage Percentage** - `(templates / total) * 100`
- **Time Savings** - Estimated time saved vs full renders

#### 4.2 Per-Template Stats
For each template, track:
- **Usage Count** - Times applied
- **Usage Percentage** - % of total renders
- **Last Used** - Timestamp of last application
- **Average Application Time** - Performance metric
- **Min/Max Times** - Performance range
- **State Coverage** - Which state values have been seen

#### 4.3 Unused Template Detection
Highlight templates that:
- **Never used** - 0% coverage
- **Rarely used** - <5% coverage
- **Outdated** - Not used in last N minutes
- Suggest removal or investigation

#### 4.4 Render Timeline
Visualize render history:
- **Bar chart** of templates vs full renders over time
- **Hover** to see render details
- **Click** to jump to specific render
- **Filter** by template type
- **Zoom** to time range

#### 4.5 Coverage Report Export
Generate markdown/PDF report:
```markdown
# Template Coverage Report
Component: TodoList
Generated: 2025-10-28 14:35:00
Duration: Last 5 minutes

## Summary
- Template Applications: 47
- Full Renders: 3
- Coverage: 94%
- Time Savings: ~280ms

## Template Usage
| Template | Usage | Avg Time |
|----------|-------|----------|
| Loop: "todos" | 89% (42x) | 1.8ms |
| Static: h1 | 100% (3x) | 0.2ms |
| Dynamic: div | 0% (0x) | - |

## Recommendations
⚠️ Template "div[0].text[0]" never used - consider removal
✅ High coverage achieved (94%)
```

---

## 5. Template Performance

### Purpose
Measure and compare template application performance against full server renders to quantify optimization benefits.

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Template Performance: TodoList           [Record] [Export]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Performance Summary                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Template Avg:       1.8ms    ████░░░░░░░░░░░░       │   │
│  │  Full Render Avg:   52.3ms    ████████████████████   │   │
│  │  Speedup:           29.1x     🚀                      │   │
│  │  Total Savings:     ~2.4s     (Last 5 minutes)       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Template Breakdown                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📋 Loop Template: "todos"                           │    │
│  │    Avg: 1.8ms  |  Min: 0.9ms  |  Max: 3.2ms         │    │
│  │    p50: 1.7ms  |  p95: 2.4ms  |  p99: 2.8ms         │    │
│  │    Applications: 42                                  │    │
│  │                                                      │    │
│  │    Performance Breakdown:                            │    │
│  │    • Binding Resolution:   0.4ms (22%)              │    │
│  │    • Slot Filling:         0.2ms (11%)              │    │
│  │    • DOM Updates:          1.2ms (67%)              │    │
│  │                                                      │    │
│  │    Flamegraph: [View] | Timeline: [View]            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📝 Static Template: "[0].h1[0].text[0]"             │    │
│  │    Avg: 0.2ms  |  Min: 0.1ms  |  Max: 0.3ms         │    │
│  │    p50: 0.2ms  |  p95: 0.3ms  |  p99: 0.3ms         │    │
│  │    Applications: 3                                   │    │
│  │                                                      │    │
│  │    Performance Breakdown:                            │    │
│  │    • Binding Resolution:   0.0ms (0%)               │    │
│  │    • Slot Filling:         0.0ms (0%)               │    │
│  │    • DOM Updates:          0.2ms (100%)             │    │
│  │                                                      │    │
│  │    Flamegraph: [View] | Timeline: [View]            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Comparison Chart                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        Template  ██ 1.8ms                            │    │
│  │                  ↕ 29.1x faster                      │    │
│  │     Full Render  ████████████████████████ 52.3ms    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Performance Timeline (Last 50 renders)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  60ms│                        ▓                      │    │
│  │  50ms│           ▓                    ▓              │    │
│  │  40ms│                                               │    │
│  │  30ms│                                               │    │
│  │  20ms│                                               │    │
│  │  10ms│                                               │    │
│  │   0ms│ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █   │    │
│  │      └──────────────────────────────────────────────│    │
│  │      14:30    14:31    14:32    14:33    14:34      │    │
│  │      Legend: █ Template  ▓ Full Render              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Start Profiling] [Stop] [Clear] [Export Flamegraph]        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Features

#### 5.1 Performance Metrics
Track for each template:
- **Average Time** - Mean application time
- **Min/Max Time** - Performance range
- **Percentiles** - p50, p95, p99
- **Application Count** - Number of applications
- **Total Time** - Cumulative time spent

#### 5.2 Performance Breakdown
Detailed timing for template application phases:
1. **Binding Resolution** - Time to resolve state paths
2. **Slot Filling** - Time to fill template slots
3. **Conditional Evaluation** - Time to evaluate branches
4. **DOM Updates** - Time to apply changes to DOM

#### 5.3 Comparison View
Side-by-side comparison:
```
┌──────────────────────────────────────────────┐
│  Metric          Template    Full Render     │
├──────────────────────────────────────────────┤
│  Average Time    1.8ms       52.3ms          │
│  Min Time        0.9ms       45.1ms          │
│  Max Time        3.2ms       68.5ms          │
│  p95 Time        2.4ms       59.2ms          │
│  Speedup         29.1x       1.0x            │
│  CPU Usage       2%          18%             │
│  Memory          +0.1KB      +2.3KB          │
└──────────────────────────────────────────────┘
```

#### 5.4 Flamegraph
Interactive flamegraph showing:
- Call stack of template application
- Time spent in each function
- Hotspots (slow operations)
- Hover for timing details
- Click to zoom into stack frame

Example:
```
applyTemplate (1.8ms)
├─ resolveBindings (0.4ms)
│  ├─ resolvePath (0.2ms)
│  └─ evaluateConditional (0.2ms)
├─ fillSlots (0.2ms)
└─ updateDOM (1.2ms)
   ├─ updateTextContent (0.6ms)
   ├─ updateAttribute (0.4ms)
   └─ updateChildren (0.2ms)
```

#### 5.5 Timeline View
Render-by-render timeline:
- **X-axis**: Time
- **Y-axis**: Render duration
- **Color**: Template (green) vs Full Render (red)
- **Hover**: Show render details
- **Click**: Jump to render in inspector

#### 5.6 Performance Alerts
Automatic alerts for:
- **Slow Template** - Application time > threshold (e.g., 10ms)
- **Performance Regression** - Template slower than previous average
- **Memory Leak** - Template memory usage growing
- **Excessive Re-renders** - Same template applied multiple times rapidly

Example alert:
```
⚠️ Performance Warning
Template: Loop "todos"
Issue: Application time increased from 1.8ms → 8.4ms
Possible Cause: Array size grew from 10 → 150 items
Recommendation: Consider pagination or virtualization
```

#### 5.7 Profiling Controls
- **Start/Stop Profiling** - Toggle performance tracking
- **Clear Stats** - Reset counters
- **Export Report** - Save as JSON/CSV
- **Record Flamegraph** - Capture detailed call stack
- **Compare Sessions** - Compare before/after optimization

#### 5.8 Optimization Recommendations
AI-powered suggestions:
```
💡 Optimization Opportunities

1. Template "todos" binding resolution taking 22% of time
   → Consider memoizing computed bindings
   → Estimated savings: ~0.4ms per render

2. Loop template has 150 items
   → Consider virtual scrolling
   → Estimated savings: ~6.2ms per render

3. Conditional templates evaluated 42 times
   → Consider caching conditional results
   → Estimated savings: ~0.1ms per render

Total Potential Savings: ~6.7ms per render (79% improvement)
```

---

## Implementation Plan

### Phase 1: Template Inspector
- [ ] Build tree view component
- [ ] Integrate with C# reflection API
- [ ] Add search and filter functionality
- [ ] Implement context menu actions

### Phase 2: Template Bindings
- [ ] Create binding list UI
- [ ] Build dependency graph visualizer
- [ ] Implement watch mode
- [ ] Add binding details panel

### Phase 3: Template Preview
- [ ] Integrate Monaco editor for state editing
- [ ] Build preview renderer
- [ ] Implement binding resolution viewer
- [ ] Add test case management

### Phase 4: Template Coverage
- [ ] Implement usage tracking in client runtime
- [ ] Build coverage dashboard
- [ ] Create render timeline visualization
- [ ] Add coverage report export

### Phase 5: Template Performance
- [ ] Integrate performance.mark/measure API
- [ ] Build flamegraph component
- [ ] Create performance timeline
- [ ] Implement performance alerts
- [ ] Add optimization recommendations

---

## Data Flow

### Client → SWIG
```javascript
// Client sends telemetry via SignalR
hub.send('TemplateApplied', {
  componentId: 'TodoList_123',
  templateKey: 'todos',
  startTime: 1634567890123,
  duration: 1.8,
  bindings: { 'item.done': [false, true], 'item.text': ['Buy milk', 'Walk dog'] },
  success: true
});
```

### SWIG → Client
```javascript
// SWIG queries template metadata
const metadata = await hub.invoke('GetComponentMetadata', 'TodoList_123');
// Returns: { component, templates, bindings, state }

// SWIG previews template with custom state
const preview = await hub.invoke('PreviewTemplate', {
  componentId: 'TodoList_123',
  templateKey: 'todos',
  state: { todos: [...] }
});
// Returns: { html, performance, bindings }
```

---

## UI Components

### Reusable Components
1. **TemplateTreeView** - Expandable tree for template structure
2. **BindingCard** - Card showing binding details
3. **PerformanceChart** - Recharts-based performance visualization
4. **FlamegraphViewer** - Interactive flamegraph component
5. **TimelineView** - Render timeline with zoom/pan
6. **MonacoEditor** - Embedded editor for state/JSON editing
7. **CoverageBar** - Progress bar with percentage

### Component Library
Use **Lucide React** icons:
- 📋 `FileText` - Loop template
- 📝 `Type` - Static template
- 🔄 `RefreshCw` - Dynamic template
- 🔀 `GitBranch` - Conditional template
- 🏷️ `Tag` - Element template
- 🔗 `Link` - Binding
- ⚡ `Zap` - Performance
- 📊 `BarChart3` - Coverage
- 🔍 `Search` - Inspect

---

## Technical Requirements

### Client Runtime Modifications
Add telemetry to template application:
```typescript
// In template-patcher.ts
function applyTemplate(element, template, state) {
  const startTime = performance.now();

  try {
    // ... existing logic ...

    const duration = performance.now() - startTime;

    if (window.__MINIMACT_SWIG__) {
      window.__MINIMACT_SWIG__.reportTemplateApplied({
        componentId,
        templateKey,
        duration,
        bindings: resolvedBindings,
        success: true
      });
    }
  } catch (error) {
    const duration = performance.now() - startTime;

    if (window.__MINIMACT_SWIG__) {
      window.__MINIMACT_SWIG__.reportTemplateApplied({
        componentId,
        templateKey,
        duration,
        error: error.message,
        success: false
      });
    }
  }
}
```

### Server-Side API
Add SignalR methods to MinimactHub:
```csharp
public class MinimactHub : Hub
{
    // Get component metadata including templates
    public async Task<ComponentMetadata> GetComponentMetadata(string componentId)
    {
        var component = _registry.GetComponent(componentId);
        var templates = GetLoopTemplates(component.GetType());
        return new ComponentMetadata
        {
            ComponentId = componentId,
            Templates = templates,
            State = component.State,
            Bindings = ExtractBindings(templates)
        };
    }

    // Preview template with custom state
    public async Task<TemplatePreview> PreviewTemplate(PreviewRequest request)
    {
        var startTime = DateTime.UtcNow;
        var html = ApplyTemplateWithState(request.TemplateKey, request.State);
        var duration = (DateTime.UtcNow - startTime).TotalMilliseconds;

        return new TemplatePreview
        {
            Html = html,
            Performance = duration,
            Bindings = ExtractBindingValues(request.State)
        };
    }
}
```

---

## Summary

The **Template DevTools** provide comprehensive visibility into Minimact's template patch system, enabling developers to:

✅ **Inspect** all templates in a component
✅ **Understand** state bindings and dependencies
✅ **Preview** templates with custom state
✅ **Track** template usage and coverage
✅ **Optimize** performance with detailed profiling

This tooling makes the template patch system transparent, debuggable, and optimizable - essential for production-grade Minimact applications.
