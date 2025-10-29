# Reactive DOM Highlighting - Implementation Plan

## Overview

Visualize cascading reactive dependencies in Minimact applications by highlighting DOM elements in **waves** based on their position in the reactive dependency chain.

## Problem Statement

When a state change occurs, it often triggers a **cascade of reactions**:

```typescript
// User clicks button
setIsOpen(true)  // ← PRIMARY change

// This triggers useEffect
useEffect(() => {
  if (isOpen) {
    setAnimating(true)  // ← SECONDARY change (dependency on isOpen)
  }
}, [isOpen])

// Which triggers another useEffect
useEffect(() => {
  if (animating) {
    setTransform('scale(1.1)')  // ← TERTIARY change (dependency on animating)
  }
}, [animating])

// Which triggers useComputed
const style = useComputed('style', () => {
  return { transform, opacity: animating ? 1 : 0 }  // ← QUATERNARY (depends on transform + animating)
}, [transform, animating])
```

**Result**: 4 "waves" of DOM changes cascading through the component tree!

## Goals

1. **Visualize dependency chains** - Show which state changes trigger other state changes
2. **Color-code by wave** - Different colors for 1st-order, 2nd-order, 3rd-order changes
3. **Animate the cascade** - Show changes propagating in sequence
4. **Interactive exploration** - Click on element to see what triggered it
5. **Performance insights** - Identify unnecessarily deep cascades

## Architecture

### Wave Detection Algorithm

```typescript
interface ReactiveWave {
  waveNumber: number;           // 0 = primary, 1 = secondary, 2 = tertiary, etc.
  triggeringState: string[];    // ["isOpen"]
  affectedState: string[];      // ["animating"]
  domElements: DOMPatchInfo[];  // Patches that will be applied
  timestamp: number;
}

interface DOMPatchInfo {
  type: 'setText' | 'setAttribute' | 'addClass' | 'insertElement' | 'removeElement';
  selector: string;             // CSS selector or XPath
  oldValue: any;
  newValue: any;
  order: number;                // Order within wave
}
```

### Server-Side: Cascade Prediction

**MinimactHub.cs - PreviewStateChangeCascade()**

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

    // Track which states have been modified (to detect cycles)
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
    while (hasMoreWaves && currentWaveNumber < MAX_WAVES)
    {
        currentWaveNumber++;

        // Check for effects/computed that depend on states modified in previous wave
        var triggeredStates = DetectTriggeredStates(
            component,
            primaryWave.affectedState
        );

        if (triggeredStates.Count == 0)
        {
            hasMoreWaves = false;
            break;
        }

        // Compute patches for each triggered state
        foreach (var triggeredState in triggeredStates)
        {
            if (modifiedStates.Contains(triggeredState))
            {
                // Cycle detected!
                waves.Add(new ReactiveWave
                {
                    waveNumber = currentWaveNumber,
                    isCycle = true,
                    cycleState = triggeredState
                });
                hasMoreWaves = false;
                break;
            }

            var wave = await ComputeWave(
                component,
                triggeredState,
                null,  // Value computed by effect/computed
                modifiedStates,
                currentWaveNumber
            );
            waves.Add(wave);
            modifiedStates.Add(triggeredState);
        }
    }

    return new PreviewCascadeResult
    {
        waves = waves,
        totalWaves = currentWaveNumber + 1,
        hasCycle = waves.Any(w => w.isCycle),
        totalAffectedElements = waves.Sum(w => w.domElements.Count)
    };
}

/// <summary>
/// Compute a single wave of changes
/// </summary>
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

    // Compute patches
    var patches = RustBridge.Reconcile(originalVNode, newVNode);

    // Restore original state
    foreach (var kvp in originalState)
    {
        component.State[kvp.Key] = kvp.Value;
    }

    // Detect which states were affected (read by useEffect/useComputed)
    var affectedStates = DetectAffectedStates(component, stateKey);

    return new ReactiveWave
    {
        waveNumber = waveNumber,
        triggeringState = new List<string> { stateKey },
        affectedState = affectedStates,
        domElements = patches.Select(p => new DOMPatchInfo
        {
            type = p.Type,
            selector = p.Selector,
            oldValue = p.OldValue,
            newValue = p.NewValue,
            order = p.Order
        }).ToList(),
        timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
    };
}

/// <summary>
/// Detect which states will be triggered by changes to the given state
/// Uses component metadata (useEffect deps, useComputed deps)
/// </summary>
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
            // This effect will run, which might call setState
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
            // This computed will re-run
            triggered.Add(computed.Key);
        }
    }

    // Check useDomElementState (if DOM changes trigger observers)
    // Check useQuery (if data changes trigger refetch)

    return triggered.Distinct().ToList();
}
```

### Client-Side: Wave-Based Highlighting

**SWIG Electron - WaveHighlighter.ts**

```typescript
interface WaveHighlightOptions {
  animationDuration: number;    // ms between waves (default: 500)
  showLabels: boolean;          // Show "Wave 1", "Wave 2", etc.
  colorScheme: 'rainbow' | 'heat' | 'ocean';
}

class WaveHighlighter {
  private overlayIframe: HTMLIFrameElement | null = null;
  private targetWindow: Window | null = null;

  /**
   * Highlight cascading changes with wave animation
   */
  async highlightCascade(
    targetAppUrl: string,
    waves: ReactiveWave[],
    options: WaveHighlightOptions = {}
  ): Promise<void> {
    const {
      animationDuration = 500,
      showLabels = true,
      colorScheme = 'rainbow'
    } = options;

    // Inject overlay script into target app
    await this.injectOverlay(targetAppUrl);

    // Animate each wave sequentially
    for (let i = 0; i < waves.length; i++) {
      const wave = waves[i];
      const color = this.getWaveColor(i, waves.length, colorScheme);

      // Highlight all elements in this wave
      await this.highlightWave(wave, color, showLabels);

      // Wait before next wave
      if (i < waves.length - 1) {
        await this.delay(animationDuration);
      }
    }
  }

  /**
   * Highlight a single wave of changes
   */
  private async highlightWave(
    wave: ReactiveWave,
    color: string,
    showLabels: boolean
  ): Promise<void> {
    if (!this.targetWindow) return;

    for (const [index, patch] of wave.domElements.entries()) {
      const element = this.targetWindow.document.querySelector(patch.selector);
      if (!element) continue;

      // Create highlight overlay
      const rect = element.getBoundingClientRect();
      const highlight = this.createHighlight(rect, color, {
        waveNumber: wave.waveNumber,
        orderNumber: index + 1,
        showLabels,
        patchType: patch.type,
        oldValue: patch.oldValue,
        newValue: patch.newValue
      });

      // Append to overlay
      this.overlayIframe?.contentDocument?.body.appendChild(highlight);

      // Animate in
      requestAnimationFrame(() => {
        highlight.style.opacity = '1';
        highlight.style.transform = 'scale(1)';
      });
    }
  }

  /**
   * Create highlight element with tooltip
   */
  private createHighlight(
    rect: DOMRect,
    color: string,
    info: {
      waveNumber: number;
      orderNumber: number;
      showLabels: boolean;
      patchType: string;
      oldValue: any;
      newValue: any;
    }
  ): HTMLElement {
    const highlight = document.createElement('div');
    highlight.className = 'minimact-swig-highlight';
    highlight.style.cssText = `
      position: absolute;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 3px solid ${color};
      border-radius: 4px;
      pointer-events: all;
      cursor: pointer;
      opacity: 0;
      transform: scale(0.95);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 0 20px ${color}40, inset 0 0 20px ${color}20;
      z-index: 999999;
    `;

    // Add wave badge
    if (info.showLabels) {
      const badge = document.createElement('div');
      badge.className = 'wave-badge';
      badge.textContent = `${info.waveNumber}.${info.orderNumber}`;
      badge.style.cssText = `
        position: absolute;
        top: -12px;
        left: -12px;
        width: 24px;
        height: 24px;
        background: ${color};
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        font-family: monospace;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      highlight.appendChild(badge);
    }

    // Add tooltip
    const tooltip = this.createTooltip(info);
    highlight.appendChild(tooltip);

    // Show tooltip on hover
    highlight.addEventListener('mouseenter', () => {
      tooltip.style.display = 'block';
    });
    highlight.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

    return highlight;
  }

  /**
   * Create tooltip with change details
   */
  private createTooltip(info: {
    waveNumber: number;
    orderNumber: number;
    patchType: string;
    oldValue: any;
    newValue: any;
  }): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'minimact-swig-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-family: 'Courier New', monospace;
      white-space: nowrap;
      display: none;
      z-index: 1000000;
      pointer-events: none;
    `;

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        Wave ${info.waveNumber} - Order ${info.orderNumber}
      </div>
      <div style="opacity: 0.8;">
        ${info.patchType}
      </div>
      <div style="margin-top: 4px;">
        <span style="color: #ff6b6b;">${JSON.stringify(info.oldValue)}</span>
        <span style="margin: 0 4px;">→</span>
        <span style="color: #51cf66;">${JSON.stringify(info.newValue)}</span>
      </div>
    `;

    return tooltip;
  }

  /**
   * Get color for wave based on scheme
   */
  private getWaveColor(
    waveIndex: number,
    totalWaves: number,
    scheme: 'rainbow' | 'heat' | 'ocean'
  ): string {
    const colors = {
      rainbow: [
        '#FF6B6B',  // Red (Wave 0 - Primary)
        '#4ECDC4',  // Cyan (Wave 1 - Secondary)
        '#45B7D1',  // Blue (Wave 2 - Tertiary)
        '#FFA07A',  // Orange (Wave 3)
        '#98D8C8',  // Mint (Wave 4)
        '#F7DC6F',  // Yellow (Wave 5)
        '#BB8FCE'   // Purple (Wave 6+)
      ],
      heat: [
        '#FFFF00',  // Yellow (Cold)
        '#FFA500',  // Orange
        '#FF4500',  // Red-Orange
        '#FF0000',  // Red
        '#8B0000'   // Dark Red (Hot)
      ],
      ocean: [
        '#E0F7FA',  // Light Cyan (Surface)
        '#80DEEA',  // Cyan
        '#26C6DA',  // Dark Cyan
        '#00ACC1',  // Darker Cyan
        '#00838F'   // Deep Cyan (Depth)
      ]
    };

    const schemeColors = colors[scheme];
    return schemeColors[Math.min(waveIndex, schemeColors.length - 1)];
  }

  /**
   * Inject overlay iframe into target app
   */
  private async injectOverlay(targetAppUrl: string): Promise<void> {
    // Create invisible iframe that sits on top of target app
    this.overlayIframe = document.createElement('iframe');
    this.overlayIframe.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
      pointer-events: none;
      z-index: 999998;
      background: transparent;
    `;

    // Allow pointer events on highlights
    this.overlayIframe.style.pointerEvents = 'none';

    document.body.appendChild(this.overlayIframe);

    // Get target window reference
    // (In production, use Electron's webContents.executeJavaScript)
    this.targetWindow = window.open(targetAppUrl, '_blank');
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    if (this.overlayIframe) {
      this.overlayIframe.remove();
      this.overlayIframe = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### UI Components

**StateInspector.tsx - Preview Button**

```tsx
function StateValueRow({ stateKey, value, componentId }: StateValueRowProps) {
  const [showingCascade, setShowingCascade] = useState(false);
  const [cascadeData, setCascadeData] = useState<PreviewCascadeResult | null>(null);

  const handlePreviewCascade = async () => {
    // Request cascade preview from server
    const result = await window.api.signalr.previewStateChangeCascade(
      componentId,
      stateKey,
      !value  // Toggle boolean, or use modal for complex values
    );

    if (result.success) {
      setCascadeData(result.data);
      setShowingCascade(true);

      // Highlight in target app
      const highlighter = new WaveHighlighter();
      await highlighter.highlightCascade(
        'http://localhost:5000',  // Target app URL
        result.data.waves,
        {
          animationDuration: 600,
          showLabels: true,
          colorScheme: 'rainbow'
        }
      );
    }
  };

  return (
    <div className="state-value-row">
      <span className="state-key">{stateKey}:</span>
      <span className="state-value">{JSON.stringify(value)}</span>

      <button
        onClick={handlePreviewCascade}
        className="btn-preview-cascade"
        title="Preview cascading changes"
      >
        <WavesIcon /> Preview Cascade
      </button>

      {showingCascade && (
        <CascadeModal
          cascadeData={cascadeData}
          onClose={() => setShowingCascade(false)}
        />
      )}
    </div>
  );
}
```

**CascadeModal.tsx - Wave Visualization**

```tsx
function CascadeModal({ cascadeData, onClose }: CascadeModalProps) {
  const [selectedWave, setSelectedWave] = useState<number | null>(null);

  return (
    <div className="cascade-modal-overlay">
      <div className="cascade-modal">
        <header>
          <h2>Reactive Cascade Preview</h2>
          <button onClick={onClose}>×</button>
        </header>

        <div className="cascade-stats">
          <div className="stat">
            <label>Total Waves:</label>
            <value>{cascadeData.totalWaves}</value>
          </div>
          <div className="stat">
            <label>Affected Elements:</label>
            <value>{cascadeData.totalAffectedElements}</value>
          </div>
          {cascadeData.hasCycle && (
            <div className="stat warning">
              <label>⚠️ Cycle Detected:</label>
              <value>Infinite loop possible!</value>
            </div>
          )}
        </div>

        <div className="cascade-timeline">
          {cascadeData.waves.map((wave, index) => (
            <WaveCard
              key={index}
              wave={wave}
              isSelected={selectedWave === index}
              onClick={() => setSelectedWave(index)}
            />
          ))}
        </div>

        {selectedWave !== null && (
          <WaveDetails wave={cascadeData.waves[selectedWave]} />
        )}
      </div>
    </div>
  );
}

function WaveCard({ wave, isSelected, onClick }: WaveCardProps) {
  const color = getWaveColor(wave.waveNumber);

  return (
    <div
      className={`wave-card ${isSelected ? 'selected' : ''}`}
      style={{ borderLeftColor: color }}
      onClick={onClick}
    >
      <div className="wave-header">
        <span className="wave-number" style={{ backgroundColor: color }}>
          Wave {wave.waveNumber}
        </span>
        <span className="wave-type">
          {wave.waveNumber === 0 ? 'Primary' :
           wave.waveNumber === 1 ? 'Secondary' :
           wave.waveNumber === 2 ? 'Tertiary' :
           `${wave.waveNumber}th Order`}
        </span>
      </div>

      <div className="wave-body">
        <div className="wave-trigger">
          <label>Triggered by:</label>
          <code>{wave.triggeringState.join(', ')}</code>
        </div>

        {wave.affectedState.length > 0 && (
          <div className="wave-affects">
            <label>Affects:</label>
            <code>{wave.affectedState.join(', ')}</code>
          </div>
        )}

        <div className="wave-elements">
          <label>DOM Changes:</label>
          <value>{wave.domElements.length} elements</value>
        </div>
      </div>
    </div>
  );
}

function WaveDetails({ wave }: WaveDetailsProps) {
  return (
    <div className="wave-details">
      <h3>Wave {wave.waveNumber} - Detailed Changes</h3>

      <table className="patches-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Type</th>
            <th>Selector</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {wave.domElements.map((patch, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>
                <span className={`patch-type ${patch.type}`}>
                  {patch.type}
                </span>
              </td>
              <td>
                <code>{patch.selector}</code>
              </td>
              <td>
                <span className="old-value">{JSON.stringify(patch.oldValue)}</span>
                <span className="arrow">→</span>
                <span className="new-value">{JSON.stringify(patch.newValue)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Color Schemes

### Rainbow (Default)
- **Wave 0 (Primary)**: 🔴 Red - The initial change
- **Wave 1 (Secondary)**: 🔵 Cyan - Direct dependencies
- **Wave 2 (Tertiary)**: 🔵 Blue - Second-order dependencies
- **Wave 3+**: 🟠 Orange, 🟢 Mint, 🟡 Yellow, 🟣 Purple

### Heat (Performance)
- **Wave 0**: 🟡 Yellow (Cold) - Fast
- **Wave 1**: 🟠 Orange - Moderate
- **Wave 2**: 🔴 Red - Slow
- **Wave 3+**: 🔴 Dark Red (Hot) - Performance concern!

### Ocean (Depth)
- **Wave 0**: 💧 Light Cyan (Surface) - Shallow
- **Wave 1**: 🌊 Cyan - Moderate depth
- **Wave 2**: 🌊 Dark Cyan - Deep
- **Wave 3+**: 🌊 Deep Cyan - Very deep cascade

## Performance Considerations

### 1. **Cycle Detection**
- Track visited states to prevent infinite loops
- Max wave depth: 10 (configurable)
- Warn user if cycle detected

### 2. **Lazy Computation**
- Only compute waves on demand (when user clicks "Preview")
- Cache results for same state value
- Invalidate cache on component re-render

### 3. **Selective Highlighting**
- Allow user to hide/show specific waves
- Toggle specific patch types (e.g., hide text changes, show only structure)
- Fade out lower-priority waves

### 4. **Debouncing**
- Debounce preview requests (500ms)
- Cancel in-flight requests on new preview
- Clear highlights on component unmount

## Example Use Cases

### Use Case 1: Debugging Unexpected Re-renders

```typescript
// Component with hidden dependency
function UserProfile() {
  const [userId, setUserId] = useState(1);
  const [loading, setLoading] = useState(false);

  // Wave 1: userId changes → triggers useEffect
  useEffect(() => {
    setLoading(true);  // Wave 1.1
    fetchUser(userId).then(() => {
      setLoading(false);  // Wave 1.2 (but async!)
    });
  }, [userId]);

  // Wave 2: loading changes → triggers useComputed
  const statusText = useComputed('status', () => {
    return loading ? 'Loading...' : 'Ready';  // Wave 2
  }, [loading]);

  return <div>{statusText}</div>;
}
```

**SWIG shows:**
- 🔴 **Wave 0**: `setUserId(2)` → `<input value>` changes
- 🔵 **Wave 1**: `userId` dependency triggers useEffect → `loading = true` → `<div.spinner>` appears
- 🔵 **Wave 2**: `loading` dependency triggers useComputed → `statusText = "Loading..."` → `<div>` text changes

### Use Case 2: Performance Optimization

User sees **Wave 5** highlighted in 🔴 Dark Red (heat scheme) and realizes the cascade is too deep!

```typescript
// BAD: 5 waves of cascading changes
setStep(1)           // Wave 0
→ setProgress(25%)   // Wave 1 (effect)
  → setColor('#f00') // Wave 2 (effect)
    → setIcon('✓')   // Wave 3 (computed)
      → setLabel()   // Wave 4 (effect)
        → render     // Wave 5 (SLOW!)

// GOOD: Batched updates
setStepData({        // Wave 0
  step: 1,
  progress: 25%,
  color: '#f00',
  icon: '✓',
  label: 'Complete'
})
→ render             // Wave 1 (FAST!)
```

## Implementation Phases

### Phase 1: Basic Wave Detection (Week 1)
- [ ] Server-side cascade prediction
- [ ] Detect useEffect/useComputed dependencies
- [ ] Return waves with DOM patches
- [ ] Basic cycle detection

### Phase 2: Client-Side Highlighting (Week 2)
- [ ] Inject overlay into target app
- [ ] Wave-based highlighting with colors
- [ ] Numbered badges (1.1, 1.2, etc.)
- [ ] Animated cascade (stagger each wave)

### Phase 3: UI Components (Week 3)
- [ ] "Preview Cascade" button in StateInspector
- [ ] CascadeModal with timeline view
- [ ] WaveCard for each wave
- [ ] WaveDetails table with patches
- [ ] Color scheme selector

### Phase 4: Advanced Features (Week 4)
- [ ] Interactive wave selection (click to isolate wave)
- [ ] Dependency graph visualization
- [ ] Performance warnings for deep cascades
- [ ] Export cascade as JSON for debugging
- [ ] Diff view (before/after for each wave)

## Testing Strategy

1. **Simple Cascade** - Single useEffect → Single setState
2. **Deep Cascade** - 5+ waves of dependencies
3. **Cycle Detection** - useEffect that causes infinite loop
4. **Parallel Changes** - Multiple independent state changes in same wave
5. **Async Effects** - useEffect with setTimeout/fetch
6. **Computed Dependencies** - useComputed depending on multiple states

## Success Metrics

- ✅ Visualize cascades up to 10 waves deep
- ✅ Detect cycles within 100ms
- ✅ Highlight DOM elements with <50ms latency per wave
- ✅ Support 100+ affected elements without lag
- ✅ User can understand cascade within 5 seconds of viewing

## Future Enhancements

- **Record & Replay** - Record cascade, replay in slow motion
- **Diff Mode** - Show before/after snapshots for each wave
- **AI Suggestions** - "This cascade is deep, consider batching these updates"
- **Trace Export** - Export cascade as flamegraph/trace for analysis
- **Live Mode** - Show cascades in real-time as user interacts with app
