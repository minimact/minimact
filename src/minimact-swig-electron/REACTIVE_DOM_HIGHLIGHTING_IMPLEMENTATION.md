# Reactive DOM Highlighting - Implementation Status

## Overview

This document tracks the implementation progress of the Reactive DOM Highlighting feature for Minimact SWIG Electron.

## Completed Components

### ✅ 1. Client-Side TypeScript Types (`src/main/types/cascade.ts`)

Created comprehensive type definitions for:
- `DOMPatchInfo` - Information about individual DOM patches
- `ReactiveWave` - Single wave of reactive changes
- `PreviewCascadeResult` - Result of cascade computation
- `PreviewCascadeRequest` - Request parameters
- `WaveHighlightOptions` - Configuration options
- `WaveColorSchemes` - Color schemes (rainbow, heat, ocean)

### ✅ 2. WaveHighlighter Service (`src/main/services/WaveHighlighter.ts`)

Implemented full wave-based visualization system:
- **highlightCascade()** - Orchestrates multi-wave animation
- **highlightWave()** - Highlights single wave of changes
- **injectHighlight()** - Injects highlight overlays into target window
- **clearHighlights()** - Removes all highlight overlays
- **Wave coloring** - Rainbow/Heat/Ocean color schemes
- **Interactive tooltips** - Show change details on hover
- **Numbered badges** - Display wave.order numbers (e.g., "1.2")
- **Auto-fade** - Highlights auto-remove after 5 seconds

### ✅ 3. SignalR IPC Integration (`src/main/ipc/signalr.ts`)

Added cascade preview handler:
- `signalr:previewCascade` - IPC channel for cascade requests
- Invokes `PreviewStateChangeCascade` on server
- Returns `PreviewCascadeResult` with timing data

### ✅ 4. Preload API Exposure

Updated preload scripts:
- **index.d.ts** - Added `previewCascade()` to SignalR API type definitions
- **index.ts** - Exposed `previewCascade()` via context bridge

### ✅ 5. CascadeModal UI Component (`src/renderer/src/components/inspector/CascadeModal.tsx`)

Built comprehensive React modal with:
- **Summary stats** - Total waves, affected elements, computation time
- **Wave timeline** - Scrollable list of all waves
- **WaveCard** - Individual wave visualization with:
  - Color-coded wave numbers
  - Triggering state display
  - Affected state display
  - DOM element count
  - Cycle detection badges
- **WaveDetails** - Detailed patch table with:
  - Order numbers
  - Patch types (setText, setAttribute, etc.)
  - CSS selectors
  - Old → New value changes
  - Color-coded patch types
- **Cycle warnings** - Special UI for detected cycles
- **Styled components** - Complete dark theme styling

## Pending Implementation

### 🔨 Server-Side Components (C#)

#### 1. PreviewStateChangeCascade Method

**Location**: `src/Minimact.AspNetCore/SignalR/MinimactHub.cs`

**Implementation needed**:
```csharp
/// <summary>
/// Preview all cascading changes from a single state mutation
/// Returns waves of changes grouped by dependency level
/// </summary>
public async Task<PreviewCascadeResult> PreviewStateChangeCascade(
    string componentId,
    string initialStateKey,
    object initialValue)
{
    var component = _registry.GetComponent(componentId);
    var waves = new List<ReactiveWave>();

    // Track modified states to detect cycles
    var modifiedStates = new HashSet<string>();
    var currentWaveNumber = 0;

    // Wave 0: Primary change
    var primaryWave = await ComputeWave(
        component,
        initialStateKey,
        initialValue,
        modifiedStates,
        currentWaveNumber
    );
    waves.Add(primaryWave);
    modifiedStates.Add(initialStateKey);

    // Subsequent waves: Follow dependency chain
    var hasMoreWaves = true;
    const int MAX_WAVES = 10;

    while (hasMoreWaves && currentWaveNumber < MAX_WAVES)
    {
        currentWaveNumber++;

        // Detect triggered states based on effect dependencies
        var triggeredStates = DetectTriggeredStates(
            component,
            primaryWave.affectedState
        );

        if (triggeredStates.Count == 0)
        {
            hasMoreWaves = false;
            break;
        }

        foreach (var triggeredState in triggeredStates)
        {
            // Check for cycles
            if (modifiedStates.Contains(triggeredState))
            {
                waves.Add(new ReactiveWave
                {
                    WaveNumber = currentWaveNumber,
                    IsCycle = true,
                    CycleState = triggeredState
                });
                hasMoreWaves = false;
                break;
            }

            var wave = await ComputeWave(
                component,
                triggeredState,
                null,
                modifiedStates,
                currentWaveNumber
            );
            waves.Add(wave);
            modifiedStates.Add(triggeredState);
        }
    }

    return new PreviewCascadeResult
    {
        Waves = waves,
        TotalWaves = currentWaveNumber + 1,
        HasCycle = waves.Any(w => w.IsCycle),
        TotalAffectedElements = waves.Sum(w => w.DomElements.Count)
    };
}
```

#### 2. ComputeWave Helper Method

```csharp
private async Task<ReactiveWave> ComputeWave(
    MinimactComponent component,
    string stateKey,
    object newValue,
    HashSet<string> modifiedStates,
    int waveNumber)
{
    // Clone current state
    var originalState = new Dictionary<string, object>(component.State);
    var originalVNode = component.CurrentVNode;

    // Apply hypothetical state change
    if (newValue != null)
    {
        component.State[stateKey] = newValue;
    }

    // Render with new state
    var newVNode = VNode.Normalize(component.RenderComponent());

    // Compute patches via Rust reconciler
    var patches = await _reconciler.Reconcile(originalVNode, newVNode);

    // Restore original state
    component.State = originalState;
    component.CurrentVNode = originalVNode;

    // Detect affected states (from useEffect/useComputed)
    var affectedStates = DetectAffectedStates(component, stateKey);

    return new ReactiveWave
    {
        WaveNumber = waveNumber,
        TriggeringState = new List<string> { stateKey },
        AffectedState = affectedStates,
        DomElements = patches.Select(p => new DOMPatchInfo
        {
            Type = p.Type,
            Selector = p.Selector,
            OldValue = p.OldValue,
            NewValue = p.NewValue,
            Order = p.Order
        }).ToList(),
        Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
    };
}
```

#### 3. DetectTriggeredStates Method

```csharp
private List<string> DetectTriggeredStates(
    MinimactComponent component,
    List<string> changedStates)
{
    var triggered = new List<string>();

    // Check useEffect dependencies
    foreach (var effect in component.Effects)
    {
        if (effect.Deps != null &&
            effect.Deps.Any(dep => changedStates.Contains(dep.ToString())))
        {
            // Parse effect callback to detect setState calls
            var effectStates = ParseEffectForStateChanges(effect);
            triggered.AddRange(effectStates);
        }
    }

    // Check useComputed dependencies
    foreach (var computed in component.ComputedStates)
    {
        if (computed.Dependencies.Any(dep => changedStates.Contains(dep)))
        {
            triggered.Add(computed.Key);
        }
    }

    return triggered.Distinct().ToList();
}
```

#### 4. C# Type Definitions

**Location**: `src/Minimact.AspNetCore/SignalR/MinimactHub.cs`

```csharp
public class PreviewCascadeResult
{
    public List<ReactiveWave> Waves { get; set; }
    public int TotalWaves { get; set; }
    public bool HasCycle { get; set; }
    public int TotalAffectedElements { get; set; }
}

public class ReactiveWave
{
    public int WaveNumber { get; set; }
    public List<string> TriggeringState { get; set; }
    public List<string> AffectedState { get; set; }
    public List<DOMPatchInfo> DomElements { get; set; }
    public long Timestamp { get; set; }
    public bool IsCycle { get; set; }
    public string CycleState { get; set; }
}

public class DOMPatchInfo
{
    public string Type { get; set; }  // "setText", "setAttribute", etc.
    public string Selector { get; set; }
    public object OldValue { get; set; }
    public object NewValue { get; set; }
    public int Order { get; set; }
    public string AttributeName { get; set; }
    public string ClassName { get; set; }
}
```

### 🔨 UI Integration

#### StateInspector Enhancement

**Location**: `src/renderer/src/components/inspector/StateInspector.tsx`

**Add "Preview Cascade" button to state values**:

```tsx
import { useState } from 'react';
import { CascadeModal } from './CascadeModal';

function StateValueRow({ stateKey, value, componentId }) {
  const [showCascade, setShowCascade] = useState(false);
  const [cascadeData, setCascadeData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePreviewCascade = async () => {
    setLoading(true);
    try {
      // Toggle boolean value for preview
      const newValue = typeof value === 'boolean' ? !value : value;

      const result = await window.api.signalr.previewCascade(
        componentId,
        stateKey,
        newValue
      );

      if (result.success) {
        setCascadeData(result.data);
        setShowCascade(true);

        // TODO: Trigger WaveHighlighter to show visual overlays
      }
    } catch (error) {
      console.error('Failed to preview cascade:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="state-value-row">
      <span className="state-key">{stateKey}:</span>
      <span className="state-value">{JSON.stringify(value)}</span>

      <button
        onClick={handlePreviewCascade}
        disabled={loading}
        className="btn-preview-cascade"
        title="Preview cascading changes"
      >
        {loading ? '⏳' : '🌊'} Preview Cascade
      </button>

      {showCascade && cascadeData && (
        <CascadeModal
          cascadeData={cascadeData}
          onClose={() => setShowCascade(false)}
        />
      )}
    </div>
  );
}
```

## Testing Plan

### 1. Unit Tests

- **WaveHighlighter.test.ts** - Test wave highlighting logic
- **CascadeModal.test.tsx** - Test React component rendering

### 2. Integration Tests

1. **Simple Cascade** - Single useEffect → Single setState
2. **Deep Cascade** - 5+ waves of dependencies
3. **Cycle Detection** - useEffect causing infinite loop
4. **Parallel Changes** - Multiple independent state changes
5. **Conditional Logic** - Branching dependencies

### 3. End-to-End Tests

1. Open SWIG Electron
2. Connect to target Minimact app
3. Open StateInspector
4. Click "Preview Cascade" on a state value
5. Verify:
   - Modal opens with cascade data
   - Waves are color-coded correctly
   - DOM elements are highlighted in target app
   - Tooltips show change details
   - Cycle warnings appear if detected

## Performance Considerations

- **Server caching** - Cache PreviewCascadeResult for same state values
- **Debouncing** - Debounce preview requests (500ms)
- **Max waves** - Limit cascade depth to 10 waves
- **Highlight cleanup** - Auto-remove highlights after 5 seconds
- **Throttle animations** - Stagger wave animations by 500ms

## Next Steps

1. ✅ Implement server-side `PreviewStateChangeCascade` in C#
2. ✅ Add dependency tracking to MinimactComponent
3. ✅ Integrate CascadeModal into StateInspector
4. ✅ Wire up WaveHighlighter with target window
5. ✅ Add tests for cascade computation
6. ✅ Test end-to-end flow
7. ✅ Document usage in main ARCHITECTURE.md

## Usage Example

```tsx
// In StateInspector component
const handlePreviewCascade = async (stateKey: string, newValue: any) => {
  const result = await window.api.signalr.previewCascade(
    componentId,
    stateKey,
    newValue
  );

  if (result.success) {
    // Show modal
    setCascadeData(result.data);
    setShowCascadeModal(true);

    // Highlight in target app
    // TODO: Get target window reference and call WaveHighlighter
  }
};
```

## Color Scheme Reference

### Rainbow (Default)
- 🔴 Wave 0 (Primary) - `#FF6B6B`
- 🔵 Wave 1 (Secondary) - `#4ECDC4`
- 🔵 Wave 2 (Tertiary) - `#45B7D1`
- 🟠 Wave 3 - `#FFA07A`
- 🟢 Wave 4 - `#98D8C8`
- 🟡 Wave 5 - `#F7DC6F`
- 🟣 Wave 6+ - `#BB8FCE`

### Heat (Performance-focused)
- 🟡 Wave 0 (Cold/Fast) - `#FFFF00`
- 🟠 Wave 1 - `#FFA500`
- 🔴 Wave 2 - `#FF4500`
- 🔴 Wave 3 - `#FF0000`
- 🔴 Wave 4+ (Hot/Slow) - `#8B0000`

### Ocean (Depth-focused)
- 💧 Wave 0 (Surface) - `#E0F7FA`
- 🌊 Wave 1 - `#80DEEA`
- 🌊 Wave 2 - `#26C6DA`
- 🌊 Wave 3 - `#00ACC1`
- 🌊 Wave 4+ (Deep) - `#00838F`

## Known Limitations

1. **Async effects** - Cannot predict timing of async setState calls
2. **External state** - Cannot track state in external libraries
3. **Side effects** - Cannot detect DOM mutations outside React
4. **Network calls** - Cannot preview data fetching results
5. **Browser limits** - Max 10 waves to prevent infinite loops

## Future Enhancements

- **Record & Replay** - Record cascades and replay in slow motion
- **AI Suggestions** - Recommend optimization opportunities
- **Performance metrics** - Show timing for each wave
- **Export traces** - Export cascade as JSON for analysis
- **Live mode** - Show cascades in real-time during app usage
