# Minimact Transpiler - Babel Plugin Architecture

**Status**: ✅ Phase 1 Modularization Complete

## Overview

This is a **modular, maintainable rewrite** of the Minimact Babel transpiler. The old monolithic plugin has been split into focused, testable modules.

### Design Goals

1. **Separation of Concerns** - Each module has ONE responsibility
2. **Reusability** - Functions can be used independently
3. **Testability** - Each module can be unit tested
4. **Maintainability** - Easy to locate and fix bugs
5. **Extensibility** - Easy to add new features

## Directory Structure

```
src/
├── index.js                      (Main Entry - 70 lines, was 477!)
│
├── core/
│   ├── hexPath.js               (Hex path generation)
│   ├── nodes.js                 (JSON node factories)
│   └── traverser.js             (JSX tree traversal orchestration)
│
├── processors/
│   ├── component.js             (Component function processing)
│   ├── jsx.js                   (JSX element processing)
│   ├── attributes.js            (Attribute processing)
│   ├── expressions.js           (Expression processing)
│   └── children.js              (Child node processing)
│
├── extractors/
│   ├── bindings.js              (Extract bindings from expressions)
│   ├── templates.js             (Extract template literals)
│   ├── conditionals.js          (Extract conditional expressions)
│   ├── loops.js                 (Extract array.map loops)
│   └── styles.js                (Extract style objects)
│
├── utils/
│   ├── ast.js                   (AST helper functions)
│   ├── validation.js            (Validation & error handling)
│   ├── logging.js               (Consistent logging)
│   └── fileSystem.js            (File I/O operations)
│
└── legacy/
    └── sharedLogic.js           (Reusable logic from babel-plugin-minimact)
```

## Module Responsibilities

### 🎯 Core Modules

#### `core/hexPath.js`
**Purpose**: Generate tag-agnostic hex paths for JSX nodes

**Key Feature**: 268M insertion slots between elements (0x10000000)

**Exports**:
- `HexPathGenerator` - Main class with next(), buildPath(), parsePath()

**Pattern**: Old path `div[0].span[1]` → New path `10000000.20000000`

---

#### `core/nodes.js`
**Purpose**: Factory functions for creating JSON AST nodes

**Exports**:
- `createComponent()` - Root component node
- `createRenderMethod()` - Render method container
- `createJSXElement()` - JSX element node
- `createStaticText()` - Static text node
- `createTextTemplate()` - Text template with bindings
- `createAttributeTemplate()` - Attribute template
- `createLoopTemplate()` - Array.map loop template
- `createConditionalTemplate()` - Ternary/logical template

---

#### `core/traverser.js`
**Purpose**: Orchestrate JSX tree traversal

**Exports**:
- `traverseJSX()` - Main traversal function
- `traverseFragment()` - Handle `<>...</>` fragments
- `traverseChildren()` - Process children array
- `traverseStructuralExpression()` - Handle conditionals/loops
- `createDefaultContext()` - Create context with processors

**Pattern**: Delegates to processors, doesn't process itself

---

### 🔧 Processors

#### `processors/component.js`
**Purpose**: Process component function declarations

**Exports**:
- `processComponent()` - Main entry point
- `findReturnStatement()` - Locate return in function body
- `extractComponentName()` - Get component name
- `generateComponentJSON()` - Build final JSON
- `writeComponentJSON()` - Write to file

**Flow**: Find JSX → Traverse → Build JSON → Write file

---

#### `processors/jsx.js`
**Purpose**: Process individual JSX elements

**Exports**:
- `processJSXElement()` - Main JSX processor
- `getTagName()` - Extract tag name
- `isStructuralElement()` - Check if fully static
- `shouldSkipElement()` - Filter logic

**Optimization**: Marks structural (no dynamic content) elements

---

#### `processors/attributes.js`
**Purpose**: Process all attribute types

**Exports**:
- `processAttributes()` - Main entry
- `processStaticAttribute()` - Static strings
- `processDynamicAttribute()` - Expressions
- `processBooleanAttribute()` - Boolean flags
- `processSpreadAttribute()` - Spread operators

**Handles**: `className="foo"`, `style={expr}`, `disabled`, `{...props}`

---

#### `processors/expressions.js`
**Purpose**: Process JSX expression containers

**Exports**:
- `processExpression()` - Main entry
- `getExpressionType()` - Type identification
- `getExpressionRaw()` - Raw string representation
- `isSimpleExpression()` - Check if simple binding
- `isComplexExpression()` - Check if needs C# evaluation

**Delegates to**: Extractors for specific expression types

---

#### `processors/children.js`
**Purpose**: Process children array - mixed content

**Exports**:
- `processChildren()` - Main entry
- `processTextChild()` - Static text
- `processExpressionChild()` - Dynamic expressions
- `processFragmentChild()` - Nested fragments
- `isStructuralExpression()` - Check if contains JSX
- `processStructuralExpression()` - Handle conditionals/loops

**Handles**: JSXElement, JSXText, JSXExpressionContainer, JSXFragment

---

### 📦 Extractors

#### `extractors/bindings.js`
**Purpose**: Extract state/prop bindings from expressions

**Exports**:
- `extractBindings()` - Main binding extractor
- `buildMemberPath()` - Build dotted path (user.name)
- `extractIdentifierBinding()` - Simple identifier
- `extractMemberBinding()` - Member expression
- `extractComplexBinding()` - Complex expressions

**Used by**: All other extractors

---

#### `extractors/templates.js`
**Purpose**: Extract template literals → slot format

**Exports**:
- `extractTemplateLiteral()` - Main template extractor
- `buildTemplateString()` - Build {0}, {1} template
- `extractTemplateBindings()` - Extract bindings from expressions

**Example**: `` `Count: ${count}` `` → `{ template: "Count: {0}", bindings: ["count"] }`

---

#### `extractors/conditionals.js`
**Purpose**: Extract ternary and logical expressions

**Exports**:
- `extractConditionalExpression()` - Ternary (? :)
- `extractLogicalExpression()` - Logical (&&, ||)
- `extractBinaryExpression()` - Binary comparisons (>, <, ===)
- `extractCondition()` - Condition string

**Example**: `{isAdmin ? <Admin /> : <User />}` → Conditional template node

---

#### `extractors/loops.js`
**Purpose**: Extract array.map() loops

**Exports**:
- `extractCallExpression()` - Main call handler
- `extractMapLoop()` - Specific to .map()
- `extractLoopParameters()` - Extract (item, i) params
- `extractLoopBody()` - Extract JSX body

**Example**: `{items.map(item => <li>{item}</li>)}` → Loop template node

---

#### `extractors/styles.js`
**Purpose**: Extract style={{...}} objects

**Exports**:
- `extractStyleObject()` - Main style extractor
- `extractStyleProperty()` - Individual property
- `extractConditionalValue()` - Conditional style values
- `convertCamelToKebab()` - CSS property conversion

**Example**: `style={{ fontSize: '32px' }}` → Style attribute template

---

### 🛠️ Utils

#### `utils/ast.js`
**Purpose**: Common AST operations and type checks

**Exports**:
- `isJSXElement()`, `isJSXFragment()`, `isJSXText()`, etc.
- `getNodeType()` - Get node type string
- `walkAST()` - Generic AST walker

**Benefit**: Abstracts Babel type checks

---

#### `utils/validation.js`
**Purpose**: Validation logic and error handling

**Exports**:
- `validatePath()` - Ensure path is valid hex format
- `validateBindings()` - Ensure bindings are valid
- `validateTemplate()` - Ensure template slots match bindings
- `createError()` - Structured error object
- `logWarning()` - Warning logger

**Benefit**: Centralized validation logic

---

#### `utils/logging.js`
**Purpose**: Consistent, structured logging

**Exports**:
- `logElement()`, `logText()`, `logExpression()`, `logAttribute()`
- `logStats()` - Log summary stats
- `setLogLevel()` - Control verbosity

**Benefit**: Uniform logging format

---

#### `utils/fileSystem.js`
**Purpose**: File system operations

**Exports**:
- `ensureDir()` - Create directory if not exists
- `writeJSON()` - Write formatted JSON
- `readJSON()` - Read and parse JSON
- `getOutputPath()` - Build output file path

**Benefit**: Centralized file I/O

---

### 🏛️ Legacy

#### `legacy/sharedLogic.js`
**Purpose**: Port critical functions from babel-plugin-minimact

**Exports**:
- `buildMemberPathShared()` - **CRITICAL** - Member path builder
- `extractTemplateLiteralShared()` - Template extractor
- `extractIdentifiersShared()` - Recursive identifier extraction
- `extractMethodCallBindingShared()` - Transform methods (toFixed, etc.)
- `isEventHandler()` - Check if attribute is event handler
- `sanitizeIdentifier()` - Clean identifier names
- `getSourceLocation()` - Get source location for errors
- `escapeCSharpString()` - Escape string for C# generation

**Important**: Battle-tested code, reused as-is for consistency

---

## Data Flow

```
index.js (Orchestration)
  ↓
processors/component.js
  ↓
core/traverser.js
  ├─→ processors/jsx.js
  │     ├─→ processors/attributes.js
  │     │     └─→ extractors/bindings.js
  │     │           └─→ legacy/sharedLogic.js
  │     └─→ processors/children.js
  │           └─→ processors/expressions.js
  │                 ├─→ extractors/templates.js
  │                 ├─→ extractors/conditionals.js
  │                 ├─→ extractors/loops.js
  │                 └─→ extractors/styles.js
  └─→ core/nodes.js (Factory functions)
        ↓
      JSON output written by utils/fileSystem.js
```

## Key Improvements

### Before (Old Plugin)
- ❌ 477 lines in index.js
- ❌ Monolithic functions
- ❌ Difficult to test
- ❌ Hard to extend
- ❌ Mixed concerns

### After (New Plugin)
- ✅ 70 lines in index.js (85% reduction!)
- ✅ 16 focused modules
- ✅ Each module <300 lines
- ✅ Easily testable
- ✅ Clear responsibilities
- ✅ Reusable functions

## Testing Strategy

Each module can be tested independently:

```javascript
// Example: Test bindings extractor
const { extractBindings } = require('./extractors/bindings');
const expr = /* Babel AST node */;
const bindings = extractBindings(expr, t);
assert.equal(bindings[0].path, 'user.name');
```

## Migration from Old Plugin

The modular architecture reuses **battle-tested logic** from the old plugin:

| Old Plugin File | New Module | Status |
|----------------|------------|--------|
| `src/extractors/templates.cjs` (lines 34-50) | `legacy/sharedLogic.js` | ✅ Ported |
| `src/extractors/templates.cjs` (lines 223-271) | `legacy/sharedLogic.js` | ✅ Ported |
| `src/extractors/templates.cjs` (lines 298-434) | `core/traverser.js` | ✅ Adapted |
| `src/utils/helpers.cjs` | `legacy/sharedLogic.js` | ✅ Ported |

## Next Steps

1. ✅ Core traversal working
2. ✅ All processors implemented
3. ✅ All extractors implemented
4. ✅ Legacy code ported
5. ⏳ Integration testing
6. ⏳ Update examples to use new plugin
7. ⏳ Performance benchmarking
8. ⏳ Documentation

## Performance Considerations

- **Lazy Loading**: Modules loaded on-demand
- **Single Pass**: Tree traversed once
- **Minimal Allocations**: Reuse path generator instance
- **Early Exits**: Skip processing where possible

## Contributing

When adding new features:

1. **Identify the right module** - Where does this logic belong?
2. **Keep functions pure** - No side effects
3. **Add exports** - Make functions reusable
4. **Document thoroughly** - JSDoc comments
5. **Test independently** - Unit tests per module

---

**Built with ❤️ for Minimact**
