# Timeline Babel Integration - Implementation Plan

## Overview

This document describes how `babel-plugin-minimact` must be extended to detect, analyze, and transpile timeline definitions from TSX to C# with full template patch generation.

**Core Principle:** Developers write timelines in **TSX only**. Babel generates all C# code, attributes, and template metadata automatically.

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEVELOPER WRITES TSX                     │
└─────────────────────────────────────────────────────────────────┘

import { useState } from '@minimact/core';
import { useTimeline, useTimelineState } from '@minimact/timeline';

export function AnimatedCounter() {
  const [count, setCount] = useState(0);
  const [color, setColor] = useState('blue');

  const timeline = useTimeline({
    duration: 5000,
    repeat: true
  });

  useTimelineState(timeline, 'count', setCount, true); // interpolate
  useTimelineState(timeline, 'color', setColor);

  timeline.keyframes([
    { time: 0, state: { count: 0, color: 'blue' } },
    { time: 2500, state: { count: 50, color: 'red' } },
    { time: 5000, state: { count: 100, color: 'green' } }
  ]);

  timeline.play();

  return (
    <div>
      <h1 style={{ color }}>Count: {count}</h1>
      <button onClick={() => timeline.pause()}>Pause</button>
    </div>
  );
}

              ↓ BABEL ANALYSIS ↓

┌─────────────────────────────────────────────────────────────────┐
│                      BABEL PLUGIN DETECTS:                       │
└─────────────────────────────────────────────────────────────────┘

1. useState declarations:
   - count (number)
   - color (string)

2. useTimeline call:
   - duration: 5000
   - repeat: true
   - variable name: "timeline"

3. useTimelineState bindings:
   - timeline → 'count' (interpolate: true)
   - timeline → 'color' (interpolate: false)

4. timeline.keyframes() call:
   - Extract keyframe data
   - Parse state objects at each time
   - Determine which states change

              ↓ CODE GENERATION ↓

┌─────────────────────────────────────────────────────────────────┐
│                    BABEL GENERATES C# CODE                       │
└─────────────────────────────────────────────────────────────────┘

[Component]
[Timeline("AnimatedCounter_Timeline", 5000, Repeat = true)]
[TimelineKeyframe(0, "count", 0)]
[TimelineKeyframe(0, "color", "blue")]
[TimelineKeyframe(2500, "count", 50)]
[TimelineKeyframe(2500, "color", "red")]
[TimelineKeyframe(5000, "count", 100)]
[TimelineKeyframe(5000, "color", "green")]
[TimelineStateBinding("count", Interpolate = true)]
[TimelineStateBinding("color", Interpolate = false)]
public partial class AnimatedCounter : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string color = "blue";

    protected override VNode Render()
    {
        // ... component render logic
    }
}

              ↓ TEMPLATE GENERATION ↓

┌─────────────────────────────────────────────────────────────────┐
│              BABEL GENERATES TEMPLATE METADATA                   │
└─────────────────────────────────────────────────────────────────┘

AnimatedCounter.timeline-templates.json:
{
  "timelineId": "AnimatedCounter_Timeline",
  "duration": 5000,
  "repeat": true,
  "stateBindings": {
    "count": { "interpolate": true, "type": "number" },
    "color": { "interpolate": false, "type": "string" }
  },
  "keyframes": [
    {
      "time": 0,
      "state": { "count": 0, "color": "blue" },
      "templates": {
        "10000000.20000000": {
          "template": "Count: {0}",
          "bindings": ["count"],
          "slots": [7]
        },
        "10000000.20000000.style": {
          "template": "color: {0}",
          "bindings": ["color"],
          "slots": [7]
        }
      }
    },
    {
      "time": 2500,
      "state": { "count": 50, "color": "red" },
      "templates": {
        "10000000.20000000": {
          "template": "Count: {0}",
          "bindings": ["count"],
          "slots": [7]
        },
        "10000000.20000000.style": {
          "template": "color: {0}",
          "bindings": ["color"],
          "slots": [7]
        }
      }
    }
    // ... etc
  ]
}
```

---

## Babel Plugin Architecture Changes

### Current State Detection System

Babel already detects:
- `useState()` calls
- State variable names and types
- State mutations in event handlers

### New Timeline Detection System

Babel must now also detect:

#### 1. Timeline Creation

```typescript
// Detect useTimeline() calls
const timeline = useTimeline({
  duration: 5000,
  repeat: true,
  easing: 'ease-in-out'
});
```

**Detection:**
- Import from `@minimact/timeline`
- Variable name (`timeline`)
- Configuration object (duration, repeat, easing, etc.)

**AST Pattern:**
```javascript
VariableDeclarator {
  id: Identifier("timeline"),
  init: CallExpression {
    callee: Identifier("useTimeline"),
    arguments: [ObjectExpression]
  }
}
```

---

#### 2. State Bindings

```typescript
// Detect useTimelineState() calls
useTimelineState(timeline, 'count', setCount, true);
useTimelineState(timeline, 'color', setColor);
```

**Detection:**
- Import from `@minimact/timeline`
- Timeline reference (must match `useTimeline()` variable)
- State key (string literal)
- Setter function (must match `useState()` setter)
- Interpolation flag (boolean)

**AST Pattern:**
```javascript
CallExpression {
  callee: Identifier("useTimelineState"),
  arguments: [
    Identifier("timeline"),      // timeline ref
    StringLiteral("count"),      // state key
    Identifier("setCount"),      // setter (must resolve to useState)
    BooleanLiteral(true)         // interpolate flag
  ]
}
```

**Validation:**
- `timeline` must be a variable created by `useTimeline()`
- `'count'` must match a state variable from `useState()`
- `setCount` must be the setter from `const [count, setCount] = useState()`

---

#### 3. Keyframe Definitions

```typescript
// Detect timeline.keyframes() calls
timeline.keyframes([
  { time: 0, state: { count: 0, color: 'blue' } },
  { time: 2500, state: { count: 50, color: 'red' } },
  { time: 5000, state: { count: 100, color: 'green' } }
]);

// OR inline:
timeline.keyframe(0, { count: 0, color: 'blue' });
timeline.keyframe(2500, { count: 50, color: 'red' });
```

**Detection:**
- Member expression on timeline variable
- Method name: `keyframes` (array) or `keyframe` (single)
- Array of keyframe objects

**AST Pattern:**
```javascript
CallExpression {
  callee: MemberExpression {
    object: Identifier("timeline"),
    property: Identifier("keyframes")
  },
  arguments: [
    ArrayExpression {
      elements: [
        ObjectExpression {
          properties: [
            Property("time", NumericLiteral(0)),
            Property("state", ObjectExpression {
              properties: [
                Property("count", NumericLiteral(0)),
                Property("color", StringLiteral("blue"))
              ]
            })
          ]
        }
        // ... more keyframes
      ]
    }
  ]
}
```

**Extraction:**
- Parse each keyframe object
- Extract `time` value
- Extract `state` object with key-value pairs
- Validate state keys match `useTimelineState()` bindings

---

#### 4. Timeline Control Methods

```typescript
// Detect timeline control calls (optional, for hints)
timeline.play();
timeline.pause();
timeline.seek(1000);
timeline.stop();
```

**Detection:** (informational only, doesn't affect codegen)
- Helps understand timeline usage patterns
- Could generate hints for server-side prediction

---

## Code Generation

### 1. C# Attributes

Generate timeline attributes on component class:

```csharp
[Timeline("AnimatedCounter_Timeline", 5000, Repeat = true, Easing = "ease-in-out")]
```

**Attribute Definition (C#):**
```csharp
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public class TimelineAttribute : Attribute
{
    public string TimelineId { get; }
    public int Duration { get; }
    public bool Repeat { get; set; }
    public int RepeatCount { get; set; } = -1;
    public string Easing { get; set; } = "linear";

    public TimelineAttribute(string timelineId, int duration)
    {
        TimelineId = timelineId;
        Duration = duration;
    }
}
```

---

### 2. Keyframe Attributes

Generate one attribute per keyframe per state:

```csharp
[TimelineKeyframe(0, "count", 0)]
[TimelineKeyframe(0, "color", "blue")]
[TimelineKeyframe(2500, "count", 50)]
[TimelineKeyframe(2500, "color", "red")]
```

**Attribute Definition (C#):**
```csharp
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
public class TimelineKeyframeAttribute : Attribute
{
    public int Time { get; }
    public string StateKey { get; }
    public object Value { get; }
    public string? Label { get; set; }

    public TimelineKeyframeAttribute(int time, string stateKey, object value)
    {
        Time = time;
        StateKey = stateKey;
        Value = value;
    }
}
```

---

### 3. State Binding Attributes

Generate binding metadata:

```csharp
[TimelineStateBinding("count", Interpolate = true)]
[TimelineStateBinding("color", Interpolate = false)]
```

**Attribute Definition (C#):**
```csharp
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
public class TimelineStateBindingAttribute : Attribute
{
    public string StateKey { get; }
    public bool Interpolate { get; set; }

    public TimelineStateBindingAttribute(string stateKey)
    {
        StateKey = stateKey;
    }
}
```

---

### 4. Template Metadata File

Generate `.timeline-templates.json` alongside `.templates.json`:

```json
{
  "component": "AnimatedCounter",
  "timelineId": "AnimatedCounter_Timeline",
  "duration": 5000,
  "repeat": true,
  "easing": "ease-in-out",
  "stateBindings": {
    "count": {
      "interpolate": true,
      "type": "number",
      "initialValue": 0
    },
    "color": {
      "interpolate": false,
      "type": "string",
      "initialValue": "blue"
    }
  },
  "keyframes": [
    {
      "time": 0,
      "label": null,
      "state": {
        "count": 0,
        "color": "blue"
      },
      "affectedPaths": [
        "10000000.20000000",           // h1 text node (count)
        "10000000.20000000.style.color" // h1 style attribute (color)
      ]
    },
    {
      "time": 2500,
      "state": {
        "count": 50,
        "color": "red"
      },
      "affectedPaths": [
        "10000000.20000000",
        "10000000.20000000.style.color"
      ]
    },
    {
      "time": 5000,
      "state": {
        "count": 100,
        "color": "green"
      },
      "affectedPaths": [
        "10000000.20000000",
        "10000000.20000000.style.color"
      ]
    }
  ],
  "generatedAt": 1736899200000
}
```

---

## Template Patch Generation

### Key Insight: Reuse Hint Queue Template System!

The hint queue already generates template patches for state changes. Timeline keyframes are just **scheduled state changes**!

**Current Hint Queue:**
```json
// .templates.json
{
  "10000000.20000000": {
    "template": "Count: {0}",
    "bindings": ["count"],
    "slots": [7],
    "type": "dynamic"
  }
}
```

**Timeline Extension:**
The SAME templates work for timelines! Just apply them at scheduled times.

### Timeline-Specific Template Metadata

Add timeline metadata to link templates to keyframes:

```json
// AnimatedCounter.timeline-templates.json
{
  "timelineId": "AnimatedCounter_Timeline",
  "keyframes": [
    {
      "time": 0,
      "state": { "count": 0, "color": "blue" },
      "templates": {
        "10000000.20000000": {
          "stateKey": "count",
          "value": 0
        },
        "10000000.20000000.style.color": {
          "stateKey": "color",
          "value": "blue"
        }
      }
    }
    // ... more keyframes
  ]
}
```

### Server-Side Timeline Builder

TimelinePredictor reads attributes and builds timeline:

```csharp
public MinimactTimeline<TState> BuildTimelineFromAttributes(Type componentType)
{
    var timelineAttr = componentType.GetCustomAttribute<TimelineAttribute>();
    var keyframeAttrs = componentType.GetCustomAttributes<TimelineKeyframeAttribute>();
    var bindingAttrs = componentType.GetCustomAttributes<TimelineStateBindingAttribute>();

    // Build timeline dynamically from attributes
    var timeline = new DynamicTimeline<TState>(
        timelineAttr.TimelineId,
        timelineAttr.Duration,
        timelineAttr.Repeat
    );

    // Group keyframes by time
    var keyframesByTime = keyframeAttrs
        .GroupBy(k => k.Time)
        .OrderBy(g => g.Key);

    foreach (var group in keyframesByTime)
    {
        var state = new TState();
        foreach (var kf in group)
        {
            // Set state property using reflection
            SetProperty(state, kf.StateKey, kf.Value);
        }
        timeline.Keyframe(group.Key, state);
    }

    return timeline;
}
```

---

## Babel Plugin Implementation

### File Structure Changes

```
src/babel-plugin-minimact/
├── src/
│   ├── analyzers/
│   │   ├── hookAnalyzer.ts           # Existing
│   │   ├── stateAnalyzer.ts          # Existing
│   │   └── timelineAnalyzer.ts       # NEW! Timeline detection
│   ├── generators/
│   │   ├── componentGenerator.ts     # Existing
│   │   ├── hookGenerator.ts          # Existing
│   │   ├── templateGenerator.ts      # Existing
│   │   └── timelineGenerator.ts      # NEW! Timeline code gen
│   ├── metadata/
│   │   ├── ComponentMetadata.ts      # Update with timeline fields
│   │   └── TimelineMetadata.ts       # NEW! Timeline metadata types
│   └── index.ts
```

---

### New Types (TimelineMetadata.ts)

```typescript
export interface TimelineMetadata {
  // Timeline configuration
  timelineId: string;
  variableName: string;         // e.g., "timeline"
  duration: number;
  repeat: boolean;
  repeatCount?: number;
  easing?: string;
  autoPlay?: boolean;

  // State bindings
  stateBindings: Map<string, TimelineStateBinding>;

  // Keyframes
  keyframes: TimelineKeyframe[];

  // Control methods (play, pause, etc.)
  controlMethods: TimelineControlMethod[];
}

export interface TimelineStateBinding {
  stateKey: string;             // e.g., "count"
  setterName: string;           // e.g., "setCount"
  interpolate: boolean;
  stateType: string;            // 'number', 'string', etc.
}

export interface TimelineKeyframe {
  time: number;
  state: Record<string, any>;   // State snapshot
  label?: string;
  easing?: string;
}

export interface TimelineControlMethod {
  method: 'play' | 'pause' | 'stop' | 'seek' | 'reverse';
  arguments?: any[];
}

// Add to ComponentMetadata
export interface ComponentMetadata {
  // ... existing fields
  timeline?: TimelineMetadata;  // NEW!
}
```

---

### Timeline Analyzer (timelineAnalyzer.ts)

```typescript
import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';

export interface TimelineAnalysisResult {
  hasTimeline: boolean;
  timeline?: TimelineMetadata;
}

export function analyzeTimeline(
  path: NodePath<t.FunctionDeclaration | t.ArrowFunctionExpression>,
  componentName: string
): TimelineAnalysisResult {
  const timeline: Partial<TimelineMetadata> = {
    timelineId: `${componentName}_Timeline`,
    stateBindings: new Map(),
    keyframes: [],
    controlMethods: []
  };

  let hasTimeline = false;

  // 1. Find useTimeline() call
  path.traverse({
    VariableDeclarator(varPath) {
      const init = varPath.node.init;
      if (
        t.isCallExpression(init) &&
        t.isIdentifier(init.callee) &&
        init.callee.name === 'useTimeline'
      ) {
        hasTimeline = true;
        timeline.variableName = (varPath.node.id as t.Identifier).name;

        // Extract config object
        const config = init.arguments[0];
        if (t.isObjectExpression(config)) {
          extractTimelineConfig(config, timeline);
        }
      }
    }
  });

  if (!hasTimeline) {
    return { hasTimeline: false };
  }

  // 2. Find useTimelineState() calls
  path.traverse({
    CallExpression(callPath) {
      if (
        t.isIdentifier(callPath.node.callee) &&
        callPath.node.callee.name === 'useTimelineState'
      ) {
        extractStateBinding(callPath.node, timeline);
      }
    }
  });

  // 3. Find timeline.keyframes() or timeline.keyframe() calls
  path.traverse({
    CallExpression(callPath) {
      const callee = callPath.node.callee;
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object) &&
        callee.object.name === timeline.variableName &&
        t.isIdentifier(callee.property)
      ) {
        if (callee.property.name === 'keyframes') {
          extractKeyframesArray(callPath.node, timeline);
        } else if (callee.property.name === 'keyframe') {
          extractSingleKeyframe(callPath.node, timeline);
        } else if (['play', 'pause', 'stop', 'seek', 'reverse'].includes(callee.property.name)) {
          extractControlMethod(callPath.node, timeline, callee.property.name);
        }
      }
    }
  });

  return {
    hasTimeline: true,
    timeline: timeline as TimelineMetadata
  };
}

function extractTimelineConfig(
  config: t.ObjectExpression,
  timeline: Partial<TimelineMetadata>
): void {
  config.properties.forEach(prop => {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
      const key = prop.key.name;
      const value = prop.value;

      switch (key) {
        case 'duration':
          if (t.isNumericLiteral(value)) {
            timeline.duration = value.value;
          }
          break;
        case 'repeat':
          if (t.isBooleanLiteral(value)) {
            timeline.repeat = value.value;
          }
          break;
        case 'repeatCount':
          if (t.isNumericLiteral(value)) {
            timeline.repeatCount = value.value;
          }
          break;
        case 'easing':
          if (t.isStringLiteral(value)) {
            timeline.easing = value.value;
          }
          break;
        case 'autoPlay':
          if (t.isBooleanLiteral(value)) {
            timeline.autoPlay = value.value;
          }
          break;
      }
    }
  });
}

function extractStateBinding(
  callExpr: t.CallExpression,
  timeline: Partial<TimelineMetadata>
): void {
  const args = callExpr.arguments;

  // useTimelineState(timeline, 'stateKey', setter, interpolate)
  if (args.length >= 3) {
    const stateKeyArg = args[1];
    const setterArg = args[2];
    const interpolateArg = args[3];

    if (t.isStringLiteral(stateKeyArg) && t.isIdentifier(setterArg)) {
      const binding: TimelineStateBinding = {
        stateKey: stateKeyArg.value,
        setterName: setterArg.name,
        interpolate: false,
        stateType: 'unknown'
      };

      if (interpolateArg && t.isBooleanLiteral(interpolateArg)) {
        binding.interpolate = interpolateArg.value;
      }

      timeline.stateBindings!.set(binding.stateKey, binding);
    }
  }
}

function extractKeyframesArray(
  callExpr: t.CallExpression,
  timeline: Partial<TimelineMetadata>
): void {
  const arg = callExpr.arguments[0];

  if (t.isArrayExpression(arg)) {
    arg.elements.forEach(elem => {
      if (t.isObjectExpression(elem)) {
        const keyframe = parseKeyframeObject(elem);
        if (keyframe) {
          timeline.keyframes!.push(keyframe);
        }
      }
    });
  }
}

function extractSingleKeyframe(
  callExpr: t.CallExpression,
  timeline: Partial<TimelineMetadata>
): void {
  // timeline.keyframe(time, stateObject)
  const args = callExpr.arguments;

  if (args.length >= 2) {
    const timeArg = args[0];
    const stateArg = args[1];

    if (t.isNumericLiteral(timeArg) && t.isObjectExpression(stateArg)) {
      const keyframe = parseKeyframeObject(stateArg);
      if (keyframe) {
        keyframe.time = timeArg.value;
        timeline.keyframes!.push(keyframe);
      }
    }
  }
}

function parseKeyframeObject(obj: t.ObjectExpression): TimelineKeyframe | null {
  const keyframe: Partial<TimelineKeyframe> = {
    state: {}
  };

  obj.properties.forEach(prop => {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
      const key = prop.key.name;
      const value = prop.value;

      switch (key) {
        case 'time':
          if (t.isNumericLiteral(value)) {
            keyframe.time = value.value;
          }
          break;
        case 'state':
          if (t.isObjectExpression(value)) {
            keyframe.state = parseStateObject(value);
          }
          break;
        case 'label':
          if (t.isStringLiteral(value)) {
            keyframe.label = value.value;
          }
          break;
        case 'easing':
          if (t.isStringLiteral(value)) {
            keyframe.easing = value.value;
          }
          break;
      }
    }
  });

  return keyframe.time !== undefined ? keyframe as TimelineKeyframe : null;
}

function parseStateObject(obj: t.ObjectExpression): Record<string, any> {
  const state: Record<string, any> = {};

  obj.properties.forEach(prop => {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
      const key = prop.key.name;
      const value = prop.value;

      // Extract literal values
      if (t.isNumericLiteral(value)) {
        state[key] = value.value;
      } else if (t.isStringLiteral(value)) {
        state[key] = value.value;
      } else if (t.isBooleanLiteral(value)) {
        state[key] = value.value;
      } else if (t.isNullLiteral(value)) {
        state[key] = null;
      }
    }
  });

  return state;
}

function extractControlMethod(
  callExpr: t.CallExpression,
  timeline: Partial<TimelineMetadata>,
  method: string
): void {
  timeline.controlMethods!.push({
    method: method as any,
    arguments: callExpr.arguments.map(arg => {
      if (t.isNumericLiteral(arg)) return arg.value;
      if (t.isStringLiteral(arg)) return arg.value;
      if (t.isBooleanLiteral(arg)) return arg.value;
      return undefined;
    })
  });
}
```

---

### Timeline Code Generator (timelineGenerator.ts)

```typescript
import { TimelineMetadata } from '../metadata/TimelineMetadata';

export function generateTimelineAttributes(
  timeline: TimelineMetadata
): string[] {
  const attributes: string[] = [];

  // 1. Timeline attribute
  const timelineAttr = [
    `[Timeline("${timeline.timelineId}", ${timeline.duration}`,
    timeline.repeat ? ', Repeat = true' : '',
    timeline.repeatCount ? `, RepeatCount = ${timeline.repeatCount}` : '',
    timeline.easing ? `, Easing = "${timeline.easing}"` : '',
    ')]'
  ].join('');

  attributes.push(timelineAttr);

  // 2. Keyframe attributes
  timeline.keyframes.forEach(kf => {
    Object.entries(kf.state).forEach(([stateKey, value]) => {
      const valueStr = formatValue(value);
      const keyframeAttr = `[TimelineKeyframe(${kf.time}, "${stateKey}", ${valueStr})]`;
      attributes.push(keyframeAttr);
    });
  });

  // 3. State binding attributes
  timeline.stateBindings.forEach((binding, stateKey) => {
    const bindingAttr = [
      `[TimelineStateBinding("${stateKey}"`,
      binding.interpolate ? ', Interpolate = true' : '',
      ')]'
    ].join('');

    attributes.push(bindingAttr);
  });

  return attributes;
}

function formatValue(value: any): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  } else if (typeof value === 'number') {
    return value.toString();
  } else if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  } else if (value === null) {
    return 'null';
  }
  return 'null';
}

export function generateTimelineMetadataFile(
  componentName: string,
  timeline: TimelineMetadata,
  templates: any // Reuse existing template metadata
): object {
  return {
    component: componentName,
    timelineId: timeline.timelineId,
    duration: timeline.duration,
    repeat: timeline.repeat || false,
    repeatCount: timeline.repeatCount || -1,
    easing: timeline.easing || 'linear',
    stateBindings: Object.fromEntries(
      Array.from(timeline.stateBindings.entries()).map(([key, binding]) => [
        key,
        {
          interpolate: binding.interpolate,
          type: binding.stateType,
          setterName: binding.setterName
        }
      ])
    ),
    keyframes: timeline.keyframes.map(kf => ({
      time: kf.time,
      label: kf.label,
      state: kf.state,
      easing: kf.easing,
      affectedPaths: extractAffectedPaths(kf.state, templates)
    })),
    generatedAt: Date.now()
  };
}

function extractAffectedPaths(
  state: Record<string, any>,
  templates: any
): string[] {
  const paths: string[] = [];

  // Find templates that reference these state keys
  Object.entries(templates).forEach(([path, template]: [string, any]) => {
    if (template.bindings) {
      template.bindings.forEach((binding: string) => {
        if (binding in state) {
          paths.push(path);
        }
      });
    }
  });

  return paths;
}
```

---

## Integration with Existing Systems

### 1. Component Metadata Extension

Update `ComponentMetadata` type:

```typescript
export interface ComponentMetadata {
  // ... existing fields
  hooks: HookMetadata[];
  state: StateMetadata[];
  templates: Record<string, TemplateMetadata>;

  // NEW: Timeline metadata
  timeline?: TimelineMetadata;
}
```

### 2. Main Plugin Flow Update

```typescript
// In index.ts (main plugin file)

export default function minimactBabelPlugin(): PluginObj {
  return {
    visitor: {
      Program(path, state) {
        // ... existing analysis

        // NEW: Analyze timelines
        componentMetadata.components.forEach(component => {
          const timelineResult = analyzeTimeline(
            component.path,
            component.name
          );

          if (timelineResult.hasTimeline) {
            component.timeline = timelineResult.timeline;
          }
        });
      },

      // ... existing visitors
    },

    post(state) {
      // ... existing codegen

      // NEW: Generate timeline code
      componentMetadata.components.forEach(component => {
        if (component.timeline) {
          // Generate C# attributes
          const attributes = generateTimelineAttributes(component.timeline);

          // Add to component class
          component.attributes.push(...attributes);

          // Generate timeline metadata file
          const timelineMetadata = generateTimelineMetadataFile(
            component.name,
            component.timeline,
            component.templates
          );

          // Write .timeline-templates.json
          writeTimelineMetadata(
            component.name,
            timelineMetadata
          );
        }
      });
    }
  };
}
```

---

## Server-Side Integration

### Timeline Builder from Attributes

```csharp
using System;
using System.Linq;
using System.Reflection;
using Minimact.AspNetCore.Timeline;

public class TimelineBuilder
{
    public static MinimactTimeline<object>? BuildFromAttributes(Type componentType)
    {
        var timelineAttr = componentType.GetCustomAttribute<TimelineAttribute>();
        if (timelineAttr == null) return null;

        var keyframeAttrs = componentType
            .GetCustomAttributes<TimelineKeyframeAttribute>()
            .ToList();

        var bindingAttrs = componentType
            .GetCustomAttributes<TimelineStateBindingAttribute>()
            .ToList();

        // Create dynamic timeline
        var timeline = new DynamicTimeline(
            timelineAttr.TimelineId,
            timelineAttr.Duration,
            timelineAttr.Repeat
        )
        {
            RepeatCount = timelineAttr.RepeatCount,
            Easing = timelineAttr.Easing
        };

        // Group keyframes by time
        var keyframesByTime = keyframeAttrs
            .GroupBy(k => k.Time)
            .OrderBy(g => g.Key);

        foreach (var group in keyframesByTime)
        {
            var state = new Dictionary<string, object>();
            foreach (var kf in group)
            {
                state[kf.StateKey] = kf.Value;
            }
            timeline.AddKeyframe(group.Key, state);
        }

        return timeline;
    }
}

// Dynamic timeline class
public class DynamicTimeline : MinimactTimeline<object>
{
    private List<(int time, Dictionary<string, object> state)> _keyframes = new();

    public DynamicTimeline(string timelineId, int duration, bool repeat)
        : base(timelineId, duration, repeat)
    {
    }

    protected override void DefineKeyframes()
    {
        foreach (var (time, state) in _keyframes)
        {
            Keyframe(time, state);
        }
    }

    public void AddKeyframe(int time, Dictionary<string, object> state)
    {
        _keyframes.Add((time, state));
    }
}
```

### Automatic Registration

```csharp
// In Startup.cs / Program.cs
public static void RegisterTimelinesFromComponents(
    this TimelineRegistry registry,
    Assembly assembly
)
{
    var componentTypes = assembly.GetTypes()
        .Where(t => t.GetCustomAttribute<ComponentAttribute>() != null)
        .Where(t => t.GetCustomAttribute<TimelineAttribute>() != null);

    foreach (var type in componentTypes)
    {
        var timeline = TimelineBuilder.BuildFromAttributes(type);
        if (timeline != null)
        {
            var component = (MinimactComponent)Activator.CreateInstance(type);
            registry.RegisterTimeline(timeline, component);
        }
    }
}
```

---

## Validation Rules

### 1. State Key Validation

```typescript
// In timelineAnalyzer.ts
function validateStateBindings(
  timeline: TimelineMetadata,
  componentState: Map<string, StateMetadata>
): ValidationResult {
  const errors: string[] = [];

  timeline.stateBindings.forEach((binding, stateKey) => {
    // Check if state variable exists
    if (!componentState.has(stateKey)) {
      errors.push(
        `useTimelineState references unknown state: '${stateKey}'. ` +
        `Did you forget to call useState('${stateKey}')?`
      );
    }
  });

  return { valid: errors.length === 0, errors };
}
```

### 2. Keyframe State Validation

```typescript
function validateKeyframes(
  timeline: TimelineMetadata
): ValidationResult {
  const errors: string[] = [];

  timeline.keyframes.forEach((kf, index) => {
    // Check all state keys are bound
    Object.keys(kf.state).forEach(stateKey => {
      if (!timeline.stateBindings.has(stateKey)) {
        errors.push(
          `Keyframe at ${kf.time}ms references unbound state '${stateKey}'. ` +
          `Add useTimelineState(timeline, '${stateKey}', ...).`
        );
      }
    });

    // Check time ordering
    if (index > 0) {
      const prevTime = timeline.keyframes[index - 1].time;
      if (kf.time <= prevTime) {
        errors.push(
          `Keyframe times must be ascending. ` +
          `Keyframe at index ${index} (${kf.time}ms) is not after previous (${prevTime}ms).`
        );
      }
    }

    // Check time within duration
    if (kf.time > timeline.duration!) {
      errors.push(
        `Keyframe at ${kf.time}ms exceeds timeline duration (${timeline.duration}ms).`
      );
    }
  });

  return { valid: errors.length === 0, errors };
}
```

---

## Example End-to-End Flow

### 1. Developer Writes TSX

```tsx
import { useState } from '@minimact/core';
import { useTimeline, useTimelineState } from '@minimact/timeline';

export function AnimatedCounter() {
  const [count, setCount] = useState(0);
  const [color, setColor] = useState('blue');

  const timeline = useTimeline({
    duration: 5000,
    repeat: true
  });

  useTimelineState(timeline, 'count', setCount, true);
  useTimelineState(timeline, 'color', setColor);

  timeline.keyframes([
    { time: 0, state: { count: 0, color: 'blue' } },
    { time: 2500, state: { count: 50, color: 'red' } },
    { time: 5000, state: { count: 100, color: 'green' } }
  ]);

  timeline.play();

  return (
    <div>
      <h1 style={{ color }}>Count: {count}</h1>
      <button onClick={() => timeline.pause()}>Pause</button>
    </div>
  );
}
```

### 2. Babel Generates C#

```csharp
[Component]
[Timeline("AnimatedCounter_Timeline", 5000, Repeat = true)]
[TimelineKeyframe(0, "count", 0)]
[TimelineKeyframe(0, "color", "blue")]
[TimelineKeyframe(2500, "count", 50)]
[TimelineKeyframe(2500, "color", "red")]
[TimelineKeyframe(5000, "count", 100)]
[TimelineKeyframe(5000, "color", "green")]
[TimelineStateBinding("count", Interpolate = true)]
[TimelineStateBinding("color", Interpolate = false)]
public partial class AnimatedCounter : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string color = "blue";

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);
        return new VElement("div", "10000000", new Dictionary<string, string>(),
            new VElement("h1", "10000000.20000000", new Dictionary<string, string>
            {
                ["style"] = $"color: {color}"
            }, $"Count: {count}"),
            new VElement("button", "10000000.30000000", new Dictionary<string, string>
            {
                ["onclick"] = "Handle0"
            }, "Pause")
        );
    }

    public void Handle0()
    {
        // timeline.pause() - handled client-side
    }
}
```

### 3. Babel Generates Timeline Metadata

```json
// AnimatedCounter.timeline-templates.json
{
  "component": "AnimatedCounter",
  "timelineId": "AnimatedCounter_Timeline",
  "duration": 5000,
  "repeat": true,
  "stateBindings": {
    "count": { "interpolate": true, "type": "number" },
    "color": { "interpolate": false, "type": "string" }
  },
  "keyframes": [
    {
      "time": 0,
      "state": { "count": 0, "color": "blue" },
      "affectedPaths": [
        "10000000.20000000",
        "10000000.20000000.style"
      ]
    },
    {
      "time": 2500,
      "state": { "count": 50, "color": "red" },
      "affectedPaths": [
        "10000000.20000000",
        "10000000.20000000.style"
      ]
    },
    {
      "time": 5000,
      "state": { "count": 100, "color": "green" },
      "affectedPaths": [
        "10000000.20000000",
        "10000000.20000000.style"
      ]
    }
  ]
}
```

### 4. Server Auto-Registers Timeline

```csharp
// In Program.cs
var registry = app.Services.GetRequiredService<TimelineRegistry>();
registry.RegisterTimelinesFromComponents(typeof(Program).Assembly);
```

### 5. Client Loads and Plays

```typescript
// Auto-injected by Minimact runtime
const connection = await connectToSignalR();
const sync = new SignalRTimelineSync(timeline, connection, domPatcher, root);
await sync.loadFromServer('AnimatedCounter_Timeline');
timeline.play();
```

---

## Benefits of Babel Integration

1. ✅ **Single Source of Truth** - Developer writes TSX only
2. ✅ **Zero Manual C#** - All timeline code auto-generated
3. ✅ **Type Safety** - Babel validates state bindings at build time
4. ✅ **Template Reuse** - Leverages existing hint queue template system
5. ✅ **Automatic Registration** - Server discovers timelines via reflection
6. ✅ **Build-Time Errors** - Catches timeline issues before runtime
7. ✅ **Perfect DX** - Familiar React-like API

---

## Implementation Checklist

### Phase 1: Detection
- [ ] Create `timelineAnalyzer.ts`
- [ ] Detect `useTimeline()` calls
- [ ] Detect `useTimelineState()` calls
- [ ] Detect `timeline.keyframes()` calls
- [ ] Detect `timeline.keyframe()` calls
- [ ] Extract timeline configuration
- [ ] Extract state bindings
- [ ] Extract keyframe data

### Phase 2: Validation
- [ ] Validate state key existence
- [ ] Validate keyframe time ordering
- [ ] Validate keyframes within duration
- [ ] Validate all keyframe states are bound
- [ ] Generate helpful error messages

### Phase 3: Code Generation
- [ ] Generate `[Timeline]` attribute
- [ ] Generate `[TimelineKeyframe]` attributes
- [ ] Generate `[TimelineStateBinding]` attributes
- [ ] Update C# class generation
- [ ] Generate `.timeline-templates.json`

### Phase 4: Integration
- [ ] Update `ComponentMetadata` type
- [ ] Integrate analyzer into main plugin flow
- [ ] Integrate generator into code emission
- [ ] Write metadata files alongside templates
- [ ] Update C# attribute definitions

### Phase 5: Server-Side
- [ ] Create timeline attribute classes
- [ ] Implement `TimelineBuilder` from attributes
- [ ] Implement automatic registration
- [ ] Test with TimelineRegistry/TimelineHub

### Phase 6: Testing
- [ ] Unit tests for timeline analyzer
- [ ] Unit tests for validation
- [ ] Unit tests for code generation
- [ ] Integration tests (TSX → C# → Timeline)
- [ ] E2E tests with server

---

## Success Criteria

Babel integration is successful when:

1. ✅ Developer can write timelines in TSX with `useTimeline()`
2. ✅ Babel auto-generates all C# code and attributes
3. ✅ Babel validates timeline definitions at build time
4. ✅ Server auto-discovers and registers timelines
5. ✅ Client can load and play timelines with zero manual setup
6. ✅ Timeline state changes apply template patches
7. ✅ Build errors are clear and actionable
8. ✅ Timeline system integrates seamlessly with existing hint queue

---

## Future Enhancements

### Timeline Composition
```tsx
const intro = useTimeline({ duration: 2000 });
const main = useTimeline({ duration: 5000 });
const outro = useTimeline({ duration: 1000 });

const master = composeTimelines([intro, main, outro]);
```

### Timeline Branching
```tsx
timeline.branch(
  condition: () => userChoice === 'A',
  ifTrue: branchATimeline,
  ifFalse: branchBTimeline
);
```

### Timeline Recording
```tsx
const recorded = recordTimeline(() => {
  // User interactions captured as keyframes
});
```

---

**Status:** Specification Complete - Ready for Implementation
**Date:** 2025-01-14
**Next:** Implement timeline analyzer in babel-plugin-minimact
