# Babel Plugin to RustScript Conversion Guide

A comprehensive guide for converting Babel plugins to RustScript - the dual-target language that compiles to both Babel (JavaScript) and SWC (Rust) plugins.

::: tip Why RustScript?
Write your plugin once, run it on both Babel and SWC platforms. Get JavaScript compatibility AND native Rust performance.
:::

## Table of Contents

[[toc]]

---

## Basic Structure

### Module Exports/Imports

**Babel (JavaScript):**
```javascript
// helpers.cjs
function escapeCSharpString(str) {
  return str.replace(/\\/g, '\\\\');
}

function getComponentName(path) {
  return path.node.id ? path.node.id.name : null;
}

module.exports = {
  escapeCSharpString,
  getComponentName,
};
```

**RustScript:**
```rustscript
// helpers.rsc
pub fn escape_csharp_string(s: &Str) -> Str {
    s.replace("\\", "\\\\")
}

pub fn get_component_name(node: &FunctionDeclaration) -> Option<Str> {
    if let Some(ref id) = node.id {
        return Some(id.name.clone());
    }
    None
}
```

**Key Changes:**
- `function` → `pub fn` (for exports)
- `module.exports = {}` → just use `pub fn`
- camelCase → snake_case for function names
- `null` → `None` (use `Option<T>`)
- Add explicit types to parameters and return values

### Using Modules

**Babel (JavaScript):**
```javascript
const { getComponentName } = require('./utils/helpers.cjs');
const { tsTypeToCSharpType } = require('./types/typeConversion.cjs');

// Use them
const name = getComponentName(path);
const csharpType = tsTypeToCSharpType(typeAnnotation);
```

**RustScript:**
```rustscript
use "./utils/helpers.rsc" { get_component_name };
use "./types/conversion.rsc" { ts_type_to_csharp_type };

// Use them
let name = get_component_name(node);
let csharp_type = ts_type_to_csharp_type(type_annotation);
```

**Key Changes:**
- `require()` → `use` statement
- Destructuring imports work the same way
- Path must include `.rsc` extension

---

## Type Conversions

### JavaScript → RustScript Types

| JavaScript | RustScript | Notes |
|------------|------------|-------|
| `string` | `Str` | Platform-agnostic string type |
| `number` | `i32` or `f64` | Integers vs floats |
| `boolean` | `bool` | Same keyword |
| `null`, `undefined` | `None` | Use `Option<T>` for nullable values |
| `Array<T>` | `Vec<T>` | Dynamic array |
| `Object` or `Map` | `HashMap<K, V>` | Key-value pairs |
| `Set` | `HashSet<T>` | Unique values |
| `{ key: value }` | `struct` | Define custom structs |

### Variable Declarations

**Babel:**
```javascript
const name = "Component";           // Immutable
let count = 0;                      // Mutable
const result = computeValue();      // Can be null
if (result !== null) {
  console.log(result);
}
```

**RustScript:**
```rustscript
let name = "Component";             // Immutable
let mut count = 0;                  // Mutable
let result = compute_value();       // Option<T>
if let Some(value) = result {
    // use value
}
```

---

## Node Access Patterns

### Accessing Properties

**Babel:**
```javascript
const name = node.name;
const calleeName = node.callee.name;

// Optional chaining
const typeName = node.typeAnnotation?.typeAnnotation?.typeName?.name;
```

**RustScript:**
```rustscript
// Must clone owned values
let name = node.name.clone();

// Nested access with Option unwrapping
if let Some(ref type_ann) = node.type_annotation {
    if let Some(ref inner) = type_ann.type_annotation {
        if let Some(ref type_name) = inner.type_name {
            let name = type_name.name.clone();
        }
    }
}
```

::: warning Explicit Cloning Required
RustScript requires explicit `.clone()` to own values. Use `&` for borrowing when you only need temporary access.
:::

### Checking Node Types

**Babel:**
```javascript
const t = require('@babel/types');

if (t.isIdentifier(node)) {
  console.log(node.name);
}

if (t.isCallExpression(node.init)) {
  const callee = node.init.callee;
}
```

**RustScript:**
```rustscript
// Simple type check
if matches!(node, Identifier) {
    let name = node.name.clone();
}

// Check nested type
if let Some(ref init) = node.init {
    if matches!(init, CallExpression) {
        let callee = &init.callee;
    }
}
```

---

## Visitor Methods

### Basic Visitor

**Babel:**
```javascript
module.exports = function(babel) {
  return {
    visitor: {
      FunctionDeclaration(path) {
        const name = path.node.id.name;
      },

      CallExpression(path) {
        if (t.isIdentifier(path.node.callee, { name: 'useState' })) {
          // Handle useState
        }
      }
    }
  };
};
```

**RustScript:**
```rustscript
plugin MinimactPlugin {
    fn visit_function_declaration(node: &mut FunctionDeclaration, ctx: &Context) {
        if let Some(ref id) = node.id {
            let name = id.name.clone();
        }
    }

    fn visit_call_expression(node: &mut CallExpression, ctx: &Context) {
        if let Expression::Identifier(ref callee) = node.callee {
            if callee.name == "useState" {
                // Handle useState
            }
        }
    }
}
```

**Key Changes:**
- `visitor: { ... }` → `plugin PluginName { ... }`
- `MethodName(path)` → `fn visit_method_name(node: &mut NodeType, ctx: &Context)`
- `path.node` → `node` (direct access)
- PascalCase → snake_case for method names

### Visitor with State

**Babel:**
```javascript
module.exports = function() {
  return {
    visitor: {
      Program(path, state) {
        state.components = [];
      },

      FunctionDeclaration(path, state) {
        const name = path.node.id.name;
        state.components.push({ name });
      }
    }
  };
};
```

**RustScript:**
```rustscript
plugin MinimactPlugin {
    struct State {
        components: Vec<ComponentInfo>,
    }

    struct ComponentInfo {
        name: Str,
    }

    fn visit_program_enter(node: &mut Program, ctx: &Context) {
        self.state.components = vec![];
    }

    fn visit_function_declaration(node: &mut FunctionDeclaration, ctx: &Context) {
        if let Some(ref id) = node.id {
            let name = id.name.clone();
            self.state.components.push(ComponentInfo { name });
        }
    }
}
```

---

## Pattern Matching

### Destructuring Arrays

**Babel:**
```javascript
// const [count, setCount] = useState(0);
if (t.isArrayPattern(decl.id)) {
  const [valueId, setterId] = decl.id.elements;
  const valueName = valueId.name;
  const setterName = setterId.name;
}
```

**RustScript:**
```rustscript
// const [count, setCount] = useState(0);
if let Pattern::ArrayPat(ref arr) = decl.id {
    if arr.elements.len() >= 2 {
        if let Some(Pattern::Ident(ref value_name)) = arr.elements[0] {
            // Got value name
        }

        if let Some(Pattern::Ident(ref setter_name)) = arr.elements[1] {
            // Got setter name
        }
    }
}
```

### Advanced Pattern Matching

**Babel:**
```javascript
if (t.isMemberExpression(node) &&
    t.isIdentifier(node.object, { name: "console" }) &&
    t.isIdentifier(node.property, { name: "log" })) {
  // Matched console.log
}
```

**RustScript:**
```rustscript
if let Expression::MemberExpression(ref member) = node {
    if let Expression::Identifier(ref obj) = member.object {
        if obj.name == "console" {
            if let Expression::Identifier(ref prop) = member.property {
                if prop.name == "log" {
                    // Matched console.log
                }
            }
        }
    }
}
```

---

## Collections & Iteration

### Arrays/Vectors

**Babel:**
```javascript
const items = [];
items.push("item1");
const count = items.length;

for (const item of items) {
  console.log(item);
}

const filtered = items.filter(item => item.startsWith("item"));
```

**RustScript:**
```rustscript
let mut items = vec![];
items.push("item1");
let count = items.len();

for item in &items {
    // use item
}

let filtered: Vec<Str> = items.iter()
    .filter(|item| item.starts_with("item"))
    .collect();
```

### HashMaps

**Babel:**
```javascript
const map = {};
map["key1"] = "value1";
const hasKey = "key1" in map;
const value = map["key1"];
```

**RustScript:**
```rustscript
let mut map = HashMap::new();
map.insert("key1", "value1");
let has_key = map.contains_key("key1");
let value = map.get("key1");  // Returns Option<&V>
```

---

## String Operations

### String Building

**Babel:**
```javascript
let code = "";
code += "public class ";
code += componentName;

// Template literals
const msg = `Hello, ${name}!`;
```

**RustScript:**
```rustscript
let mut code = String::new();
code.push_str("public class ");
code.push_str(&component_name);

// format! macro
let msg = format!("Hello, {}!", name);
```

### String Methods

| Babel | RustScript |
|-------|------------|
| `str.startsWith("x")` | `str.starts_with("x")` |
| `str.endsWith("x")` | `str.ends_with("x")` |
| `str.includes("x")` | `str.contains("x")` |
| `str.toUpperCase()` | `str.to_uppercase()` |
| `str.toLowerCase()` | `str.to_lowercase()` |
| `str.split("_")` | `str.split("_").collect()` |

---

## Error Handling

### Result Type

**Babel:**
```javascript
function validateComponent(node) {
  if (!node.id) {
    throw new Error("Component must have a name");
  }
  return true;
}

try {
  validateComponent(node);
} catch (error) {
  console.error(error.message);
}
```

**RustScript:**
```rustscript
fn validate_component(node: &FunctionDeclaration) -> Result<(), Str> {
    if node.id.is_none() {
        return Err("Component must have a name");
    }
    Ok(())
}

// Usage with ? operator
fn process(node: &FunctionDeclaration) -> Result<(), Str> {
    validate_component(node)?;  // Early return on error
    Ok(())
}

// Or handle explicitly
match validate_component(node) {
    Ok(_) => { /* success */ }
    Err(msg) => { /* handle error */ }
}
```

---

## Context API

The `Context` object provides cross-platform access to compiler features:

```rustscript
fn visit_identifier(node: &mut Identifier, ctx: &Context) {
    // Scope operations
    if ctx.scope.has_binding(&node.name) {
        // Variable is bound in current scope
    }

    // File information
    let filename = ctx.filename;

    // Generate unique identifiers
    let uid = ctx.generate_uid("temp");
}
```

::: warning Performance Note
In SWC, `ctx.scope` operations trigger O(n) pre-pass analysis. Consider tracking bindings manually for performance-critical code.
:::

---

## File I/O

### Writing Files

**Babel:**
```javascript
const fs = require('fs');
const path = require('path');

const csFilePath = path.join(outputDir, `${componentName}.cs`);
fs.writeFileSync(csFilePath, csharpCode);
```

**RustScript:**
```rustscript
use fs;

let cs_file_path = format!("{}/{}.cs", output_dir, component_name);
fs::write_file(&cs_file_path, &csharp_code)?;
```

### Reading Files

**Babel:**
```javascript
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf-8');
}
```

**RustScript:**
```rustscript
use fs;

if fs::file_exists(&file_path) {
    if let Ok(content) = fs::read_file(&file_path) {
        // use content
    }
}
```

---

## Performance Best Practices

### Minimize Cloning

::: danger Expensive Pattern
```rustscript
// ❌ Multiple clones
fn bad_pattern(node: &FunctionDeclaration) {
    let name1 = node.id.name.clone();
    let name2 = node.id.name.clone();  // Unnecessary!
}
```
:::

::: tip Efficient Pattern
```rustscript
// ✅ Clone once, borrow references
fn good_pattern(node: &FunctionDeclaration) {
    let name = node.id.name.clone();
    let name_ref = &name;  // Use reference
}
```
:::

### Avoid Scope Lookups in Loops

::: danger Expensive in SWC
```rustscript
// ❌ O(n) scope lookup per iteration
for param in &params {
    if ctx.scope.has_binding(&param.name) {
        // ...
    }
}
```
:::

::: tip Efficient Alternative
```rustscript
// ✅ Collect bindings once
let bindings: HashSet<_> = ctx.scope.get_all_bindings();
for param in &params {
    if bindings.contains(&param.name) {
        // ...
    }
}
```
:::

---

## Common Patterns

### Extract useState Hook

**Babel:**
```javascript
function extractUseState(path) {
  if (!t.isCallExpression(path.node.init)) return null;

  const callee = path.node.init.callee;
  if (!t.isIdentifier(callee, { name: 'useState' })) return null;

  const [valueId, setterId] = path.node.id.elements;

  return {
    varName: valueId.name,
    setterName: setterId.name,
  };
}
```

**RustScript:**
```rustscript
pub struct UseStateInfo {
    pub var_name: Str,
    pub setter_name: Str,
}

pub fn extract_use_state(decl: &VariableDeclarator) -> Option<UseStateInfo> {
    let init = decl.init.as_ref()?;

    if let Expression::CallExpression(ref call) = init {
        if let Expression::Identifier(ref id) = call.callee {
            if id.name != "useState" {
                return None;
            }
        } else {
            return None;
        }

        if let Pattern::ArrayPat(ref arr) = decl.id {
            if arr.elements.len() < 2 {
                return None;
            }

            let var_name = match &arr.elements[0] {
                Some(Pattern::Ident(name)) => name.clone(),
                _ => return None,
            };

            let setter_name = match &arr.elements[1] {
                Some(Pattern::Ident(name)) => name.clone(),
                _ => return None,
            };

            return Some(UseStateInfo { var_name, setter_name });
        }
    }

    None
}
```

### Type Conversion Map

**Babel:**
```javascript
function tsTypeToCSharpType(tsType) {
  const typeMap = {
    'string': 'string',
    'number': 'double',
    'boolean': 'bool',
  };

  if (tsType.type === 'TSStringKeyword') return typeMap['string'];
  if (tsType.type === 'TSNumberKeyword') return typeMap['number'];

  return 'dynamic';
}
```

**RustScript:**
```rustscript
pub fn ts_type_to_csharp_type(ts_type: &TSType) -> Str {
    match ts_type {
        TSType::TSStringKeyword => "string",
        TSType::TSNumberKeyword => "double",
        TSType::TSBooleanKeyword => "bool",
        TSType::TSArrayType(ref arr) => {
            let elem_type = ts_type_to_csharp_type(&arr.element_type);
            format!("List<{}>", elem_type)
        }
        _ => "dynamic",
    }
}
```

---

## Project Structure

Organize your RustScript project with a clear module hierarchy:

```
minimact-transform/
├── main.rsc              // Plugin entry point
├── extractors/
│   ├── components.rsc    // Component extraction
│   ├── hooks.rsc         // Hook extraction
│   └── props.rsc         // Props extraction
├── generators/
│   ├── csharp.rsc        // C# code generation
│   └── templates.rsc     // Template extraction
└── utils/
    ├── validation.rsc    // Validation helpers
    └── ast_helpers.rsc   // AST utilities
```

---

## Target-Specific Code

Sometimes you need platform-specific behavior:

```rustscript
// Different implementations per target
#[cfg(target = "babel")]
fn emit_import(module: &str) -> String {
    format!("require('{}')", module)
}

#[cfg(target = "swc")]
fn emit_import(module: &str) -> String {
    format!("use {};", module)
}
```

::: warning Use Sparingly
Target-specific code breaks the "write once" guarantee. Use only when absolutely necessary.
:::

---

## Quick Reference

| Babel | RustScript |
|-------|------------|
| `const x = ...` | `let x = ...` |
| `let x = ...` | `let mut x = ...` |
| `if (x != null)` | `if let Some(x) = ...` |
| `arr.length` | `arr.len()` |
| `"key" in obj` | `map.contains_key("key")` |
| `for (const x of arr)` | `for x in &arr` |
| `\`Hello ${x}\`` | `format!("Hello {}", x)` |
| `t.isIdentifier(n)` | `matches!(n, Identifier)` |
| `path.node.name` | `node.name.clone()` |
| `return null` | `return None` |
| `throw new Error()` | `return Err(...)` |

---

## Conversion Workflow

1. **Start with helpers** - Convert utility functions first
2. **Define structs** - Create data structures for your domain
3. **Convert extractors** - Port extraction logic
4. **Convert generators** - Port code generation
5. **Wire plugin** - Create main plugin orchestration
6. **Test incrementally** - Compile and test each module

---

## Tips & Best Practices

- **Use the RustScript spec** - Refer to the specification for details
- **Pattern match liberally** - Use `if let` and `match` for unwrapping
- **Clone when needed** - Don't fight ownership, just `.clone()`
- **Test as you go** - Compile after each function
- **Keep it simple** - Straightforward code is best
- **Check examples** - Look at existing RustScript code for patterns

---

## Resources

- [RustScript Specification](/rustscript-specification.md)
- [RustScript Examples](https://github.com/minimact/rustscript/tree/main/tests)
- [Babel Plugin Handbook](https://github.com/jamiebuilds/babel-handbook)

---

::: tip Need Help?
The conversion process can be challenging. Don't hesitate to refer to existing RustScript examples and the specification when you get stuck!
:::
