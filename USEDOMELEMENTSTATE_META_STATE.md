# useDomElementState - Part 5: Meta State

## Overview
**Timeline:** 4-6 weeks
**Difficulty:** 6.5/10
**Extends:** Parts 1-4 with epistemic metadata

Meta State is the **10th dimension** - the epistemic dimension that describes **state about state itself**. Not "what is the element" but "what is the NATURE of this element's state."

This completes the perfect 10-dimensional ontology.

## The Problem

Current state management frameworks have no way to express:
- **Confidence** - How confident are we this state is correct?
- **Provenance** - Where did this state come from? What's its journey?
- **Authority** - Who owns this state? Client, server, or conflicted?
- **Quality** - Is this data stale, validated, encrypted, or sanitized?
- **Testing** - How do we make elements test-aware with functional metadata?

```typescript
// Currently: State without context
const [data, setData] = useState(null);

// Problem: We have data, but we don't know:
// - How fresh is it?
// - Can we trust it?
// - Where did it come from?
// - What's its security posture?
```

## The Solution

Meta State makes **state characteristics** first-class reactive values:

```typescript
const form = useDomElementState('#checkout-form', {
  meta: {
    // State Quality
    confidence: 0.85,           // How confident are we?
    staleness: 2.3,            // How old is this data?
    validation: 'pending',      // Validation status

    // State Provenance
    source: 'user-input',       // Where did it come from?
    provenance: ['init', 'user-edit', 'api-sync'], // State history chain

    // State Authority
    authority: 'client',        // Who owns this?

    // Data Characteristics
    dataType: 'user-profile',
    encrypted: true,
    cacheable: false,

    // Element Characteristics
    importance: 'critical',
    complexity: 'high',
    debugName: 'checkout-form'
  }
});

// React to metadata
{form.meta.confidence < 0.5 && <UncertainStateWarning />}
{form.meta.staleness > 5 && <RefreshPrompt />}
{form.meta.source === 'server' && <ServerSyncBadge />}
{form.meta.importance === 'critical' && <HighPriorityIndicator />}
```

---

## Phase 1: Core Meta State (Weeks 1-2)

### 1.1 TypeScript Meta Interface

```typescript
export interface MetaState {
  // Quality Metrics
  confidence?: number;              // 0-1, how confident we are in the state
  staleness?: number;               // Seconds since last update
  validation?: 'passed' | 'failed' | 'pending' | 'skipped';
  quality?: 'high' | 'medium' | 'low';

  // Provenance
  source?: 'user-input' | 'server' | 'api-sync' | 'cache' | 'optimistic' | 'migration' | string;
  authority?: 'client' | 'server' | 'shared' | 'conflicted';
  provenance?: string[];            // Chain of state origins

  // Data Characteristics
  dataType?: string;
  schema?: any;
  encrypted?: boolean;
  sanitized?: boolean;
  cacheable?: boolean;
  pii?: boolean;                    // Contains personally identifiable info

  // Element Characteristics
  debugName?: string;
  importance?: 'critical' | 'high' | 'medium' | 'low';
  complexity?: 'high' | 'medium' | 'low';
  testability?: number;             // 0-1

  // Behavior Flags
  memoized?: boolean;
  optimized?: boolean;
  instrumented?: boolean;
  debugMode?: boolean;
}

export interface DomElementState {
  // ... existing properties from Parts 1-4 ...

  meta: MetaState & {
    // Computed properties
    needsRefresh: boolean;
    isStale: boolean;
    isFresh: boolean;
    isValid: boolean;

    // Methods
    updateConfidence(delta: number): void;
    markStale(): void;
    markFresh(): void;
    addProvenance(source: string): void;
  };
}
```

### 1.2 C# Meta State Tracker

```csharp
// src/Minimact.Runtime/Meta/MetaStateTracker.cs
public class MetaStateTracker
{
    private readonly Dictionary<string, MetaState> _metaStates = new();
    private readonly ILogger<MetaStateTracker> _logger;

    public class MetaState
    {
        public double? Confidence { get; set; }
        public double? Staleness { get; set; }
        public string? Validation { get; set; }
        public string? Source { get; set; }
        public string? Authority { get; set; }
        public List<string> Provenance { get; set; } = new();
        public string? DataType { get; set; }
        public bool? Encrypted { get; set; }
        public bool? Sanitized { get; set; }
        public bool? PII { get; set; }
        public string? Importance { get; set; }
        public DateTime LastUpdated { get; set; }

        // Computed
        public bool NeedsRefresh => Staleness > 60;
        public bool IsStale => Staleness > 10;
        public bool IsFresh => Staleness < 1;
        public bool IsValid => Validation == "passed";
    }

    public MetaState GetMetaState(string elementId)
    {
        if (!_metaStates.TryGetValue(elementId, out var meta))
        {
            meta = new MetaState
            {
                Confidence = 1.0,
                Staleness = 0,
                Validation = "pending",
                Source = "init",
                Authority = "client",
                Provenance = new List<string> { "init" },
                LastUpdated = DateTime.UtcNow
            };
            _metaStates[elementId] = meta;
        }

        // Update staleness
        meta.Staleness = (DateTime.UtcNow - meta.LastUpdated).TotalSeconds;

        return meta;
    }

    public void UpdateMeta(string elementId, Action<MetaState> update)
    {
        var meta = GetMetaState(elementId);
        update(meta);
        meta.LastUpdated = DateTime.UtcNow;
        meta.Staleness = 0;
    }

    public void AddProvenance(string elementId, string source)
    {
        var meta = GetMetaState(elementId);
        meta.Provenance.Add(source);
        meta.Source = source;
        meta.LastUpdated = DateTime.UtcNow;
    }
}
```

### 1.3 Integration with useDomElementState

```typescript
// src/Minimact.ClientLib/hooks/useDomElementState.ts
export function useDomElementState(selector: string, config?: {
  meta?: Partial<MetaState>;
  // ... other config ...
}) {
  const [metaState, setMetaState] = useState<MetaState>(() => ({
    confidence: config?.meta?.confidence ?? 1.0,
    staleness: 0,
    validation: config?.meta?.validation ?? 'pending',
    source: config?.meta?.source ?? 'init',
    authority: config?.meta?.authority ?? 'client',
    provenance: config?.meta?.provenance ?? ['init'],
    ...config?.meta
  }));

  // Auto-update staleness
  useEffect(() => {
    const interval = setInterval(() => {
      setMetaState(prev => ({
        ...prev,
        staleness: (prev.staleness ?? 0) + 1,
        needsRefresh: (prev.staleness ?? 0) + 1 > 60,
        isStale: (prev.staleness ?? 0) + 1 > 10,
        isFresh: (prev.staleness ?? 0) + 1 < 1
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    // ... existing properties from Parts 1-4 ...

    meta: {
      ...metaState,

      updateConfidence: (delta: number) => {
        setMetaState(prev => ({
          ...prev,
          confidence: Math.max(0, Math.min(1, (prev.confidence ?? 0) + delta))
        }));
      },

      markStale: () => {
        setMetaState(prev => ({ ...prev, staleness: 999999 }));
      },

      markFresh: () => {
        setMetaState(prev => ({ ...prev, staleness: 0 }));
      },

      addProvenance: (source: string) => {
        setMetaState(prev => ({
          ...prev,
          source,
          provenance: [...(prev.provenance ?? []), source],
          staleness: 0
        }));
      }
    }
  };
}
```

---

## Phase 2: Functional Test Metadata (Weeks 3-4)

### 2.1 Test-Only Metadata

Elements can contain **functional metadata** - executable functions that only exist in test environments:

```typescript
export interface TestMetadata {
  testHelpers?: {
    // State Manipulation
    simulateValidation?: () => void;
    forceError?: () => void;
    mockApiResponse?: (data: any) => void;
    timeTravel?: (seconds: number) => void;

    // Lifecycle Control
    goToState?: (state: string) => void;
    walkAllStates?: () => Promise<Array<{ state: string; snapshot: any }>>;
    testTransition?: (from: string, to: string) => Promise<{ success: boolean; error?: string }>;

    // Inspection
    dumpState?: () => any;
    validateSelf?: () => { valid: boolean; errors?: string[] };

    // Data Generation
    generateTestData?: (count?: number) => void;
    stressTest?: (iterations?: number) => any;
  };

  fixtures?: Record<string, () => any>;
  mocks?: Record<string, any>;
}

// Extend MetaState
export interface MetaState {
  // ... existing fields ...

  [TEST_ENV]?: TestMetadata;
}
```

### 2.2 Test Helper Implementation

```typescript
const form = useDomElementState('#checkout-form', {
  meta: {
    importance: 'critical',
    encrypted: true,

    // TEST-ONLY METADATA (stripped in production)
    [TEST_ENV]: {
      testHelpers: {
        simulateValidation: () => {
          form.meta.validation = 'passed';
          form.meta.confidence = 0.95;
          form.meta.addProvenance('test-validation');
        },

        forceError: () => {
          form.lifecycleState = 'error';
          form.meta.validation = 'failed';
          form.meta.lastError = 'simulated-error';
        },

        timeTravel: (seconds: number) => {
          form.history.lastChanged -= seconds * 1000;
          form.meta.staleness = seconds;
        },

        dumpState: () => ({
          structure: form.toStructure(),
          meta: form.meta,
          history: form.history,
          lifecycle: form.lifecycleState
        }),

        validateSelf: () => {
          const errors = [];

          if (!form.attributes['aria-label']) {
            errors.push('Missing aria-label');
          }

          if (form.meta.importance === 'critical' && !form.meta.encrypted) {
            errors.push('Critical element not encrypted');
          }

          return errors.length === 0
            ? { valid: true }
            : { valid: false, errors };
        }
      },

      fixtures: {
        withValidState: () => ({
          lifecycleState: 'valid',
          meta: { validation: 'passed', confidence: 0.95 }
        }),

        withErrorState: () => ({
          lifecycleState: 'error',
          meta: { validation: 'failed', lastError: 'network' }
        })
      }
    }
  }
});
```

### 2.3 Test Assertion Utilities

```typescript
// src/Minimact.ClientLib/testing/assertState.ts
export function assertState(
  element: DomElementState,
  expected: Partial<DomElementState>
) {
  const errors: string[] = [];

  // Check structure
  if (expected.childrenCount !== undefined) {
    if (element.childrenCount !== expected.childrenCount) {
      errors.push(`Expected childrenCount ${expected.childrenCount}, got ${element.childrenCount}`);
    }
  }

  // Check meta
  if (expected.meta) {
    if (expected.meta.confidence !== undefined) {
      if (typeof expected.meta.confidence === 'object' && 'greaterThan' in expected.meta.confidence) {
        if (element.meta.confidence! <= expected.meta.confidence.greaterThan) {
          errors.push(`Expected confidence > ${expected.meta.confidence.greaterThan}, got ${element.meta.confidence}`);
        }
      } else if (element.meta.confidence !== expected.meta.confidence) {
        errors.push(`Expected confidence ${expected.meta.confidence}, got ${element.meta.confidence}`);
      }
    }

    if (expected.meta.validation !== undefined && element.meta.validation !== expected.meta.validation) {
      errors.push(`Expected validation ${expected.meta.validation}, got ${element.meta.validation}`);
    }
  }

  // Check lifecycle
  if (expected.lifecycleState !== undefined && element.lifecycleState !== expected.lifecycleState) {
    errors.push(`Expected lifecycleState ${expected.lifecycleState}, got ${element.lifecycleState}`);
  }

  if (errors.length > 0) {
    throw new Error(`State assertion failed:\n${errors.join('\n')}`);
  }
}

// Matchers
export const greaterThan = (n: number) => ({ greaterThan: n });
export const lessThan = (n: number) => ({ lessThan: n });
export const between = (min: number, max: number) => ({ between: [min, max] });
export const includes = (item: any) => ({ includes: item });
export const oneOf = (...items: any[]) => ({ oneOf: items });
```

---

## Phase 3: Visual Compiler Integration (Week 5)

### 3.1 Meta State Validation

```csharp
// src/Minimact.VisualCompiler/Validators/MetaStateValidator.cs
public class MetaStateValidator
{
    public List<ValidationMessage> ValidateMetaState(ComponentMetadata component)
    {
        var warnings = new List<ValidationMessage>();

        // Check critical elements have security meta
        if (component.Meta?.Importance == "critical")
        {
            if (component.Meta.Encrypted != true)
            {
                warnings.Add(new ValidationMessage
                {
                    Level = "warning",
                    Message = $"Critical element '{component.DebugName}' should have meta.encrypted=true",
                    Location = component.SourceLocation
                });
            }

            if (component.Meta.Validation != "passed")
            {
                warnings.Add(new ValidationMessage
                {
                    Level = "info",
                    Message = $"Critical element '{component.DebugName}' has validation={component.Meta.Validation}",
                    Location = component.SourceLocation
                });
            }
        }

        // Check PII elements are encrypted
        if (component.Meta?.PII == true && component.Meta.Encrypted != true)
        {
            warnings.Add(new ValidationMessage
            {
                Level = "error",
                Message = $"PII element '{component.DebugName}' must have meta.encrypted=true",
                Location = component.SourceLocation
            });
        }

        // Check provenance chain length
        if (component.Meta?.Provenance?.Count > 20)
        {
            warnings.Add(new ValidationMessage
            {
                Level = "warning",
                Message = $"Element '{component.DebugName}' has long provenance chain ({component.Meta.Provenance.Count} steps)",
                Location = component.SourceLocation
            });
        }

        // Check confidence levels
        if (component.Meta?.Confidence < 0.5)
        {
            warnings.Add(new ValidationMessage
            {
                Level = "info",
                Message = $"Element '{component.DebugName}' has low confidence ({component.Meta.Confidence})",
                Location = component.SourceLocation
            });
        }

        return warnings;
    }
}
```

### 3.2 Test Coverage Analysis

```csharp
public class TestCoverageAnalyzer
{
    public TestCoverageReport AnalyzeTestCoverage(
        List<ComponentMetadata> components,
        List<TestMetadata> tests
    )
    {
        var report = new TestCoverageReport();

        foreach (var component in components)
        {
            // Check if component has test helpers
            if (component.Meta?.TestMetadata?.TestHelpers != null)
            {
                var helpers = component.Meta.TestMetadata.TestHelpers;
                var usedHelpers = tests
                    .SelectMany(t => t.UsedTestHelpers)
                    .Where(h => h.ComponentId == component.Id)
                    .ToList();

                foreach (var helper in helpers)
                {
                    if (!usedHelpers.Any(h => h.HelperName == helper.Name))
                    {
                        report.UnusedTestHelpers.Add(new UnusedHelper
                        {
                            Component = component.DebugName,
                            Helper = helper.Name,
                            Message = $"Test helper '{helper.Name}' not used in any tests"
                        });
                    }
                }
            }

            // Check if all lifecycle states are tested
            if (component.LifecycleStates != null)
            {
                var testedStates = tests
                    .SelectMany(t => t.TestedLifecycleStates)
                    .Where(s => s.ComponentId == component.Id)
                    .Select(s => s.State)
                    .Distinct()
                    .ToList();

                var untestedStates = component.LifecycleStates
                    .Except(testedStates)
                    .ToList();

                if (untestedStates.Any())
                {
                    report.UntestedStates.Add(new UntestedState
                    {
                        Component = component.DebugName,
                        States = untestedStates,
                        Message = $"Lifecycle states not tested: {string.Join(", ", untestedStates)}"
                    });
                }
            }
        }

        return report;
    }
}
```

---

## Phase 4: Predictive Integration (Week 6)

### 4.1 Meta-Aware Predictions

The prediction engine can now predict based on **state quality**, not just state values:

```typescript
usePredictHint('refresh-data', {
  trigger: data.meta.staleness > 10 &&
           data.meta.confidence < 0.5 &&
           data.meta.importance === 'critical'
});

// "Data is stale, low confidence, and critical → predict refresh"
```

### 4.2 Rust Meta State Predictor

```rust
// src/prediction_engine/meta_predictor.rs
pub struct MetaStatePredictor {
    staleness_threshold: f64,
    confidence_threshold: f64,
}

impl MetaStatePredictor {
    pub fn should_refresh(&self, meta: &MetaState) -> bool {
        meta.staleness > self.staleness_threshold &&
        meta.confidence < self.confidence_threshold
    }

    pub fn predict_validation_failure(&self, meta: &MetaState) -> f64 {
        // Predict likelihood of validation failure based on meta
        let mut score = 0.0;

        if meta.confidence < 0.5 {
            score += 0.3;
        }

        if meta.staleness > 60.0 {
            score += 0.2;
        }

        if meta.source == "cache" || meta.source == "optimistic" {
            score += 0.1;
        }

        if meta.provenance.len() > 10 {
            score += 0.1;
        }

        score.min(1.0)
    }
}
```

---

## Real-World Examples

### Example 1: Form Validation with Meta

```typescript
const emailInput = useDomElementState('#email', {
  meta: {
    importance: 'critical',
    dataType: 'email',
    validation: 'pending'
  }
});

const submitButton = useDomElementState('#submit', {
  meta: {
    dependencies: ['#email'],
    blockedBy: []
  }
});

// Email validation
emailInput.addEventListener('blur', () => {
  if (isValidEmail(emailInput.value)) {
    emailInput.meta.validation = 'passed';
    emailInput.meta.confidence = 1.0;
  } else {
    emailInput.meta.validation = 'failed';
    emailInput.meta.confidence = 0.0;
    submitButton.meta.blockedBy = ['#email'];
  }
});

// Render based on meta
return (
  <>
    {emailInput.meta.validation === 'failed' && <ErrorMessage />}
    {submitButton.meta.blockedBy.length > 0 && (
      <DisabledReason>
        Blocked by: {submitButton.meta.blockedBy.join(', ')}
      </DisabledReason>
    )}
  </>
);
```

### Example 2: API Data Freshness

```typescript
const apiData = useDomElementState('.api-data', {
  meta: {
    source: 'api-sync',
    cacheable: true,
    staleness: 0
  }
});

// Fetch data
async function fetchData() {
  apiData.meta.source = 'loading';
  apiData.meta.confidence = 0.5;

  const response = await fetch('/api/data');
  const data = await response.json();

  apiData.setState(data);
  apiData.meta.source = 'api-sync';
  apiData.meta.confidence = 1.0;
  apiData.meta.staleness = 0;
  apiData.meta.addProvenance('api-fetch');
}

// Auto-refresh when stale
return (
  <>
    {apiData.meta.staleness > 60 && (
      <RefreshPrompt onClick={fetchData} />
    )}
    {apiData.meta.confidence < 0.7 && <LowConfidenceWarning />}
  </>
);
```

### Example 3: Testing with Functional Metadata

```typescript
describe('Checkout Form', () => {
  it('validates critical form state', () => {
    const form = useDomElementState('#checkout-form');

    // Use element's test helpers
    form.meta[TEST_ENV].testHelpers.simulateValidation();

    assertState(form, {
      meta: {
        importance: 'critical',
        encrypted: true,
        validation: 'passed',
        confidence: greaterThan(0.8)
      }
    });
  });

  it('self-validates', () => {
    const form = useDomElementState('#checkout-form');

    const result = form.meta[TEST_ENV].testHelpers.validateSelf();
    expect(result.valid).toBe(true);
  });
});
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('MetaState', () => {
  it('tracks staleness automatically', async () => {
    const element = useDomElementState('.test');

    expect(element.meta.staleness).toBe(0);

    await wait(2000);

    expect(element.meta.staleness).toBeGreaterThan(1);
  });

  it('maintains provenance chain', () => {
    const element = useDomElementState('.test');

    element.meta.addProvenance('user-edit');
    element.meta.addProvenance('validation');

    expect(element.meta.provenance).toEqual(['init', 'user-edit', 'validation']);
    expect(element.meta.source).toBe('validation');
  });
});
```

### Integration Tests
```typescript
it('validates form coordination with meta', () => {
  const emailInput = useDomElementState('#email');
  const submitButton = useDomElementState('#submit');

  // Invalid email
  emailInput.setValue('invalid@');

  assertState(emailInput, {
    meta: { validation: 'failed' }
  });

  assertState(submitButton, {
    disabled: true,
    meta: {
      blockedBy: includes('#email')
    }
  });

  // Fix email
  emailInput.setValue('valid@example.com');

  assertState(emailInput, {
    meta: { validation: 'passed' }
  });

  assertState(submitButton, {
    disabled: false,
    meta: { blockedBy: [] }
  });
});
```

---

## Performance Considerations

1. **Staleness Auto-Update**
   - Use single interval for all elements
   - Batch staleness updates
   - Optimize re-renders

2. **Provenance Chain**
   - Limit chain length (configurable max)
   - Compress old provenance entries
   - Only track in dev/test mode if needed

3. **Production Stripping**
   - Remove test helpers in production builds
   - Tree-shake test metadata
   - Minimize meta footprint

---

## Success Metrics

- ✅ All 10 dimensions fully documented
- ✅ Meta state tracked for all elements
- ✅ Functional test metadata working
- ✅ Visual Compiler validates meta
- ✅ Prediction engine uses meta
- ✅ Test helpers enable declarative testing
- ✅ Production builds strip test code

---

## The Complete 10 Dimensions

```typescript
const element = useDomElementState('.element');

// 1. STRUCTURE - What it IS
element.childrenCount
element.parent
element.classList

// 2. STATISTICS - What it MEASURES
element.children.vals.avg()
element.children.vals.sum()

// 3. PSEUDO-STATE - How it APPEARS
element.state.hover
element.state.focus
element.state.active

// 4. THEME - How it ADAPTS
element.theme.isDark
element.breakpoint.md

// 5. SPATIAL - Where it IS
element.isIntersecting
element.lookahead(2)
element.gaps

// 6. GRAPHICS - What it CONTAINS
element.canvas.ctx.dominantColor
element.svg.shapes.circles

// 7. TEMPORAL - When it CHANGED
element.history.changeCount
element.history.timeSinceLastChange
element.history.trend

// 8. PREDICTIONS - What it WILL BE
element.prediction.nextState
element.prediction.confidence

// 9. LIFECYCLE - What PHASE it's IN
element.lifecycleState
element.transitionTo('next')

// 10. META - What it KNOWS ABOUT ITSELF
element.meta.confidence
element.meta.source
element.meta.provenance
element.meta.importance
```

---

## The Philosophy

**The other 9 dimensions describe WHAT the element is.**

**META describes HOW WELL we know what the element is.**

- **Structure:** "I have 3 children"
  **Meta:** "I'm 85% confident I have 3 children, from server source, validated 2s ago"

- **Temporal:** "I changed 5 times"
  **Meta:** "Those changes came from user input, are cached, and have high importance"

- **Predictions:** "I'll probably change to state X"
  **Meta:** "That prediction has 0.9 confidence, is based on 100 samples, and is optimized"

**META is the OBSERVER of the other 9 dimensions.**

---

## Next Steps

After completing Part 5:

1. **Integrate all 10 dimensions** - Ensure they work together harmoniously
2. **Build real-world demos** - Showcase the complete ontology
3. **Document testing patterns** - Make testing first-class
4. **Optimize production builds** - Strip test metadata, minimize footprint
5. **Create comprehensive docs** - Full API reference for all 10 dimensions

**The Perfect 10. The Complete Ontology. All Can Be State.** 🌵⚡🎭
