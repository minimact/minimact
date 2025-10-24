# Visual Compiler

🔍 **AI-powered layout analysis tool that provides precise geometric feedback for UI components**

Visual Compiler transforms layout debugging from subjective guesswork into objective mathematics. Instead of telling AI "the layout looks broken," it provides exact measurements like "Component A overlaps Component B by 120x200 pixels (40% area coverage)."

## ✨ What Makes This Revolutionary

**Before Visual Compiler:**
- ❌ "The components look overlapped"
- ❌ "Layout seems broken on mobile"
- ❌ Slow feedback loops with manual inspection
- ❌ Subjective, imprecise descriptions

**With Visual Compiler:**
- ✅ "E101: Card overlaps Card by 120x200 pixels (40% area)"
- ✅ "E301: Component extends 110px beyond mobile viewport"
- ✅ Sub-2-second analysis across mobile/tablet/desktop
- ✅ Precise geometric facts AI can reason about

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Initialize project
npm run init

# Create demo components
npm run demo

# Analyze a layout
npm run analyze test-components/bad-layout-overlap.html

# Watch for changes (live analysis)
npm run watch
```

## 📊 Example Output

```
VISUAL COMPILER REPORT
══════════════════════════════════════════════════
Overall Score: 55/100
Total Render Time: 1552ms
Issues Found: 5 (4 errors, 1 warnings, 0 info)

RESOLUTION: MOBILE (390x844)
──────────────────────────────
❌ E301RM: Card extends beyond viewport
   Component: Card
   Details: overflowX: 110px, viewport: 390x844

❌ E101RM: Card overlaps Card
   Components: Card ↔ Card
   Details: overlap: 120x200 pixels (40% area)

RESPONSIVE ISSUES
──────────────────────────────
🟡 OVERFLOW: Card overflows viewport on mobile but not other resolutions
   Affected: mobile
```

## 🏗️ Architecture

Visual Compiler uses a **headless browser** approach for deterministic, pixel-perfect analysis:

```
AI writes JSX → Visual Compiler → Precise layout report → AI fixes issues
     ↓              ↓                     ↓                    ↓
Component.tsx → Playwright → Geometry Engine → "E101: overlap 120px"
```

### Core Components

- **🎭 BrowserRenderer**: Headless Playwright browser with component auto-tagging
- **📐 GeometryEngine**: Pure computational geometry for overlap/gap/alignment detection
- **📱 MultiResolutionTester**: Tests across mobile (390px), tablet (768px), desktop (1920px)
- **📊 VisualCompiler**: Orchestrates analysis and provides CLI/programmatic interface

## 🎯 Error Codes

| Code | Type | Description | Example Fix |
|------|------|-------------|-------------|
| **E101** | Error | Component overlap detected | Add `display: flex; gap: 16px` |
| **E301** | Error | Viewport overflow | Add `max-width: 100%` or responsive design |
| **W201** | Warning | Unusual gap between components | Adjust spacing with `gap` or `margin` |
| **W202** | Warning | Components too close (< 4px) | Increase spacing |
| **I401** | Info | Components properly aligned | ✓ Good alignment detected |

## 🛠️ CLI Commands

```bash
# Initialize new project
visual-compiler init

# Analyze single file
visual-compiler analyze component.html

# Watch directory for changes
visual-compiler watch ./components/*.html

# Create demo components
visual-compiler demo

# Show help
visual-compiler help
```

## 💻 Programmatic Usage

```typescript
import { VisualCompiler } from 'visual-compiler';

const compiler = new VisualCompiler({
  resolutions: [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1920, height: 1080 }
  ],
  timeout: 5000
});

// Analyze HTML content
const report = await compiler.analyzeContent(`
  <div style="display: flex; gap: 20px;">
    <div class="card" data-component="Card">Card 1</div>
    <div class="card" data-component="Card">Card 2</div>
  </div>
`);

console.log(`Score: ${report.summary.overallScore}/100`);
console.log(`Issues: ${report.summary.totalIssues}`);
```

## 🎨 Component Tagging

Visual Compiler automatically detects components, but you can provide explicit tags:

```html
<!-- Automatic detection -->
<div class="card">Auto-tagged as "Card"</div>
<button class="button">Auto-tagged as "Button"</button>

<!-- Manual tagging (recommended) -->
<div data-component="ProductCard" data-instance="1">Product 1</div>
<div data-component="ProductCard" data-instance="2">Product 2</div>
```

## 🌐 Multi-Resolution Testing

Visual Compiler tests responsive behavior across standard breakpoints:

- **Mobile**: 390x844 (iPhone 12/13/14)
- **Tablet**: 768x1024 (iPad)
- **Desktop**: 1920x1080 (Standard desktop)

Issues are tagged with resolution suffixes:
- `E101RM` - Error on mobile
- `E101RT` - Error on tablet
- `E101` - Error on desktop

## ⚡ Performance

- **Target**: <5 seconds end-to-end per iteration
- **Actual**: ~1.5-2 seconds for 3 resolutions
- **Optimization**: Persistent browser instance, parallel resolution testing
- **Memory**: ~100MB per browser instance

## 🔧 Configuration

Create `visual-compiler.config.json`:

```json
{
  "resolutions": [
    { "name": "mobile", "width": 390, "height": 844 },
    { "name": "tablet", "width": 768, "height": 1024 },
    { "name": "desktop", "width": 1920, "height": 1080 }
  ],
  "watchPaths": ["./components/**/*.html"],
  "outputPath": "./reports",
  "timeout": 5000
}
```

## 🚀 AI Integration Workflow

**1. AI generates component:**
```html
<div class="flex">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
</div>
```

**2. Visual Compiler analyzes:**
```
E101: Card overlaps Card by 300x400 pixels (100% area)
```

**3. AI reasons from geometry:**
- "Complete overlap = no spacing between components"
- "Need gap or different layout approach"

**4. AI fixes layout:**
```html
<div class="flex gap-4">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
</div>
```

**5. Visual Compiler validates:**
```
✅ No issues found! Score: 100/100
```

## 🔬 Technical Details

### Geometry Engine Algorithms

```typescript
// Overlap detection
const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
const overlapArea = overlapX * overlapY;

// Viewport overflow detection
const overflowX = Math.max(0, (component.x + component.width) - viewport.width);
const overflowY = Math.max(0, (component.y + component.height) - viewport.height);

// Alignment detection (within 2px tolerance)
const leftAligned = Math.abs(a.x - b.x) <= 2;
const centerAligned = Math.abs((a.x + a.width/2) - (b.x + b.width/2)) <= 2;
```

### Browser Rendering Pipeline

1. **Content Wrapping**: Inject component auto-tagging script and CSS reset
2. **Viewport Setting**: Configure browser to target resolution
3. **Rendering**: Wait for `networkidle` state to ensure complete paint
4. **Extraction**: Query DOM for `[data-component]` elements and get `getBoundingClientRect()`
5. **Analysis**: Run geometry algorithms on extracted bounding boxes

### Responsive Issue Detection

```typescript
// Detect components that disappear on certain resolutions
const responsiveIssues = reports.map(report => {
  const missingComponents = allComponents.filter(name =>
    !report.components.some(c => c.component === name)
  );
  return missingComponents.map(name => ({
    type: 'layout-break',
    component: name,
    resolution: report.resolution.name
  }));
});
```

## 🎯 Use Cases

### For AI Development
- **Precise feedback**: Replace vague descriptions with exact measurements
- **Fast iteration**: Sub-2-second feedback enables natural AI iteration
- **Deterministic results**: Same layout always produces same measurements
- **Multi-resolution**: Catch responsive issues automatically

### For Developers
- **Layout debugging**: Pinpoint exact overlap/spacing issues
- **Responsive testing**: Validate across mobile/tablet/desktop instantly
- **CI/CD integration**: Fail builds on layout regressions
- **Design system validation**: Ensure components follow spacing guidelines

### For Teams
- **Design QA**: Automated layout validation before design handoff
- **Frontend testing**: Complement visual regression testing with geometric analysis
- **Documentation**: Generate precise layout specifications automatically

## 🛡️ Limitations & Future Work

### Current Limitations
- **Static analysis only**: Doesn't test interactions or animations
- **HTML/CSS focus**: Doesn't understand React/Vue component semantics
- **Simple geometry**: Advanced layouts (CSS Grid, complex transforms) may need enhancement

### Planned Features
- **Screenshot diffing**: Visual confirmation alongside geometric analysis
- **Layout suggestions**: "Try `gap-4` for 16px spacing"
- **Component registry**: Know expected sizes for better validation
- **Animation testing**: Detect layout shifts during transitions
- **Performance monitoring**: Track layout analysis as component complexity grows

## 📈 Impact & Vision

Visual Compiler represents a **fundamental shift** in how AI interacts with visual layouts:

**Traditional Approach**:
```
AI → Generates layout → Human visual inspection → Subjective feedback → AI guesses fix
```

**Visual Compiler Approach**:
```
AI → Generates layout → Geometric analysis → Precise measurements → AI applies math-based fix
```

This transformation enables:
- **Autonomous AI layout iteration** without human visual QA
- **Precise layout debugging** with actionable error messages
- **Scalable responsive design** testing across all device sizes
- **Deterministic layout validation** for CI/CD pipelines

## 🤝 Contributing

```bash
# Development setup
git clone https://github.com/your-repo/visual-compiler
cd visual-compiler
npm install
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Playwright** for reliable headless browser automation
- **Chokidar** for efficient file watching
- **The community** for inspiring better AI-assisted development tools

---

**Visual Compiler**: Transforming layout analysis from art to science. 🎨➡️🔬