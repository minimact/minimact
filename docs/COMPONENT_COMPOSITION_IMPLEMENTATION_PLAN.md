# Component Composition Implementation Plan

> **Goal:** Enable full component composition in Minimact with predictive rendering, hot reload, and type-safe props/events across component boundaries.

---

## Table of Contents

1. [Overview](#overview)
2. [Current Limitations](#current-limitations)
3. [Proposed Architecture](#proposed-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Technical Specifications](#technical-specifications)
6. [Testing Strategy](#testing-strategy)
7. [Migration Path](#migration-path)
8. [Future Enhancements](#future-enhancements)

---

## Overview

### What We're Building

Full support for importing and composing components in Minimact, enabling:

```tsx
// Parent.tsx
import { Button } from './Button.tsx';
import { Card } from './Card.tsx';

export function Dashboard() {
  const [count, setCount] = useState(0);

  return (
    <Card title="Dashboard">
      <h1>Count: {count}</h1>
      <Button
        variant="primary"
        onClick={() => setCount(count + 1)}
      >
        Increment
      </Button>
    </Card>
  );
}
```

### Key Features

- ✅ **Component Imports** - Import components from TSX files
- ✅ **Props & Children** - Pass data down, events up
- ✅ **Predictive Rendering** - Hints flow across component boundaries
- ✅ **Hot Reload** - Update child components without parent re-render
- ✅ **Type Safety** - Full TypeScript → C# type preservation
- ✅ **Context System** - Avoid prop drilling for deep trees
- ✅ **Hierarchical Paths** - Namespaced hex paths for child components

---

## Current Limitations

### What Doesn't Work Today

1. **Component imports are skipped** (processComponent.cjs:68)
   ```javascript
   if (source.startsWith('.') || source.startsWith('/')) {
     return; // ❌ SKIPS relative imports
   }
   ```

2. **JSX tags treated as HTML** (jsx.cjs:40)
   ```javascript
   const tagName = node.openingElement.name.name;
   // Generates: new VElement("Button", ...) ❌ Invalid HTML
   ```

3. **No VComponent type** in C# VNode system

4. **Templates don't support component boundaries**

5. **Prediction doesn't cascade to child components**

6. **Hot reload replaces entire page, not individual components**

---

## Proposed Architecture

### 1. VComponent - New VNode Type

```csharp
/// <summary>
/// VNode representing a child component instance
/// Enables component composition with props, children, and lifecycle
/// </summary>
public class VComponent : VNode
{
    /// <summary>
    /// Component type (e.g., "Button", "Card")
    /// </summary>
    public string ComponentType { get; set; }

    /// <summary>
    /// Component instance ID for tracking
    /// </summary>
    public string ComponentId { get; set; }

    /// <summary>
    /// Props passed from parent
    /// </summary>
    public Dictionary<string, object> Props { get; set; }

    /// <summary>
    /// Children VNodes (slot pattern)
    /// </summary>
    public List<VNode> Children { get; set; }

    /// <summary>
    /// Parent hex path (for namespacing child paths)
    /// </summary>
    public string ParentPath { get; set; }

    /// <summary>
    /// Lazy-loaded component instance
    /// </summary>
    private MinimactComponent? _instance;

    /// <summary>
    /// Render the component and return its VNode tree
    /// </summary>
    public VNode Render()
    {
        if (_instance == null)
        {
            // Create instance via reflection
            var componentType = ResolveComponentType(ComponentType);
            _instance = Activator.CreateInstance(componentType) as MinimactComponent;

            if (_instance == null)
            {
                throw new InvalidOperationException($"Failed to create instance of {ComponentType}");
            }

            _instance.ComponentId = ComponentId;
            _instance.ParentPath = ParentPath;

            // Set props
            foreach (var prop in Props)
            {
                _instance.SetProp(prop.Key, prop.Value);
            }

            // Inject children as special prop
            if (Children?.Count > 0)
            {
                _instance.SetProp("children", Children);
            }
        }

        // Render child component
        var childVNode = _instance.Render();

        // Prefix all child paths with parent path (namespace isolation)
        HexPathManager.PrefixChildPaths(childVNode, ParentPath);

        return childVNode;
    }

    private Type ResolveComponentType(string typeName)
    {
        // Look up component type from registry
        return ComponentTypeRegistry.GetType(typeName);
    }
}
```

### 2. Hierarchical Path System

**Path Format:** `<parent-path>:<child-local-path>`

```
Parent Component (Dashboard)
├─ 1                     (root div)
├─ 1.1                   (h1)
└─ 1.2                   (VComponent<Button>)
    └─ 1.2:1             (Button's root)
        ├─ 1.2:1.1       (Button's text)
        └─ 1.2:1.2       (Button's icon)
```

**Benefits:**
- Child paths are independent of parent structure
- Hot reload can target specific component instances
- Prediction scopes are clearly defined
- Path collisions impossible

### 3. Component Template System

**Parent Template (Dashboard.templates.json):**
```json
{
  "1.2": {
    "type": "component",
    "componentType": "Button",
    "props": {
      "variant": {
        "binding": "theme",
        "type": "reactive"
      },
      "onClick": {
        "binding": "Handle_1_2_onClick",
        "type": "event"
      }
    },
    "children": [
      {
        "template": "Increment",
        "type": "static"
      }
    ],
    "path": ["1", "2"],
    "predictable": true
  }
}
```

**Child Template (Button.templates.json):**
```json
{
  "1": {
    "type": "element",
    "tag": "button",
    "attributes": {
      "class": {
        "template": "btn btn-{variant}",
        "bindings": ["variant"],
        "type": "dynamic"
      }
    },
    "children": [
      {
        "template": "{children}",
        "binding": "children",
        "type": "slot"
      }
    ],
    "path": ["1"]
  }
}
```

### 4. EventCallback Pattern

**Props Down (Immutable Data):**
```csharp
[Prop] public string variant { get; set; } = "default";
[Prop] public bool disabled { get; set; }
```

**Events Up (Callbacks):**
```csharp
public class EventCallback
{
    private readonly Action _handler;
    public EventCallback(Action handler) => _handler = handler;
    public void Invoke() => _handler();
}

public class EventCallback<T>
{
    private readonly Action<T> _handler;
    public EventCallback(Action<T> handler) => _handler = handler;
    public void Invoke(T arg) => _handler(arg);
}
```

**Usage in Components:**
```csharp
public class Button : MinimactComponent
{
    [Prop] public EventCallback? onClick { get; set; }

    private void HandleClick()
    {
        onClick?.Invoke(); // ← Calls parent's handler
    }
}
```

### 5. Cascading Prediction System

**Rust Predictor Enhancement:**
```rust
pub struct ComponentGraph {
    pub components: HashMap<String, ComponentMetadata>,
    pub parent_child: HashMap<String, Vec<String>>,
    pub prop_bindings: HashMap<String, PropBinding>
}

pub struct PropBinding {
    pub parent_component: String,
    pub parent_state_key: String,
    pub child_component: String,
    pub child_prop_key: String
}

/// Predict patches across component boundaries
pub fn predict_cascading_updates(
    root_component: &str,
    state_changes: HashMap<String, Value>,
    component_graph: &ComponentGraph,
    predictor_registry: &PredictorRegistry
) -> Vec<Patch> {
    let mut all_patches = Vec::new();

    // 1. Predict root component patches
    let root_predictor = predictor_registry.get(root_component)?;
    let root_patches = root_predictor.predict_patches(&state_changes)?;
    all_patches.extend(root_patches);

    // 2. Find children affected by state changes
    let children = component_graph.parent_child.get(root_component)?;

    for child_id in children {
        // 3. Resolve prop bindings (state → props)
        let child_prop_changes = resolve_prop_bindings(
            root_component,
            child_id,
            &state_changes,
            &component_graph.prop_bindings
        );

        if !child_prop_changes.is_empty() {
            // 4. Recursively predict child patches
            let child_patches = predict_cascading_updates(
                child_id,
                child_prop_changes,
                component_graph,
                predictor_registry
            );

            all_patches.extend(child_patches);
        }
    }

    all_patches
}

fn resolve_prop_bindings(
    parent_id: &str,
    child_id: &str,
    parent_state: &HashMap<String, Value>,
    bindings: &HashMap<String, PropBinding>
) -> HashMap<String, Value> {
    let mut child_props = HashMap::new();

    for binding in bindings.values() {
        if binding.parent_component == parent_id
           && binding.child_component == child_id
        {
            if let Some(value) = parent_state.get(&binding.parent_state_key) {
                child_props.insert(
                    binding.child_prop_key.clone(),
                    value.clone()
                );
            }
        }
    }

    child_props
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic component import and VComponent rendering

**Tasks:**

1. **Babel Plugin - Track Component Imports**
   - File: `src/babel-plugin-minimact/src/processComponent.cjs`
   - Modify lines 62-90 to track `.tsx`/`.jsx` imports
   - Store in `component.componentImports` Map

   ```javascript
   // Add to component object (line 59)
   componentImports: new Map(), // name → source path

   // Modify ImportDeclaration handler (line 62-90)
   ImportDeclaration(importPath) {
     const source = importPath.node.source.value;

     // Track relative TSX/JSX imports
     if ((source.startsWith('.') || source.startsWith('/')) &&
         (source.endsWith('.tsx') || source.endsWith('.jsx'))) {
       importPath.node.specifiers.forEach(spec => {
         if (t.isImportDefaultSpecifier(spec) || t.isImportSpecifier(spec)) {
           component.componentImports.set(spec.local.name, source);
         }
       });
     }

     // ... existing external library tracking ...
   }
   ```

2. **Babel Plugin - Detect Component Usage**
   - File: `src/babel-plugin-minimact/src/generators/jsx.cjs`
   - Add detection logic in `generateJSXElement` (after line 40)

   ```javascript
   const tagName = node.openingElement.name.name;

   // Check if this is an imported component
   const isImportedComponent = component.componentImports?.has(tagName);
   const isComponentTag = tagName[0] === tagName[0].toUpperCase();

   // Handle imported components
   if (isImportedComponent || (isComponentTag && tagName !== 'Plugin')) {
     const { generateComponentInstance } = require('./component.cjs');
     return generateComponentInstance(tagName, node, component, indent);
   }
   ```

3. **Babel Plugin - Generate VComponent Code**
   - Create new file: `src/babel-plugin-minimact/src/generators/component.cjs`

   ```javascript
   function generateComponentInstance(componentName, node, parentComponent, indent) {
     const hexPath = node.__minimactPath || '';
     const attributes = node.openingElement.attributes;
     const children = node.children;

     // Generate unique component ID
     const componentId = `${parentComponent.name}_${componentName}_${hexPath}`;

     // Generate props object
     const propsCode = generatePropsObject(attributes, parentComponent);

     // Generate children array
     const childrenCode = generateChildren(children, parentComponent, indent + 1);

     return `new VComponent {
       ComponentType = "${componentName}",
       ComponentId = "${componentId}",
       ParentPath = "${hexPath}",
       Props = ${propsCode},
       Children = ${childrenCode}
     }`;
   }
   ```

4. **C# - Implement VComponent Class**
   - File: `src/Minimact.AspNetCore/Core/VNode.cs`
   - Add VComponent class (see architecture section above)

5. **C# - Component Type Registry**
   - Create file: `src/Minimact.AspNetCore/Core/ComponentTypeRegistry.cs`

   ```csharp
   public static class ComponentTypeRegistry
   {
       private static Dictionary<string, Type> _types = new();

       public static void RegisterComponent<T>() where T : MinimactComponent
       {
           var name = typeof(T).Name;
           _types[name] = typeof(T);
       }

       public static Type GetType(string name)
       {
           if (_types.TryGetValue(name, out var type))
           {
               return type;
           }

           // Fallback: scan assemblies
           var foundType = AppDomain.CurrentDomain.GetAssemblies()
               .SelectMany(a => a.GetTypes())
               .FirstOrDefault(t => t.Name == name &&
                                    typeof(MinimactComponent).IsAssignableFrom(t));

           if (foundType != null)
           {
               _types[name] = foundType;
               return foundType;
           }

           throw new InvalidOperationException($"Component type '{name}' not found");
       }
   }
   ```

6. **C# - SetProp Method**
   - File: `src/Minimact.AspNetCore/Core/MinimactComponent.cs`
   - Add prop setter method

   ```csharp
   public void SetProp(string propName, object value)
   {
       var prop = this.GetType().GetProperty(propName,
           BindingFlags.Public | BindingFlags.Instance);

       if (prop == null)
       {
           throw new InvalidOperationException(
               $"Property '{propName}' not found on {GetType().Name}"
           );
       }

       // Check [Prop] attribute
       var propAttr = prop.GetCustomAttribute<PropAttribute>();
       if (propAttr == null)
       {
           throw new InvalidOperationException(
               $"Property '{propName}' on {GetType().Name} is not marked with [Prop]"
           );
       }

       // Type conversion
       var convertedValue = ConvertPropValue(value, prop.PropertyType);
       prop.SetValue(this, convertedValue);
   }

   private object? ConvertPropValue(object value, Type targetType)
   {
       if (value == null) return null;
       if (targetType.IsAssignableFrom(value.GetType())) return value;

       // Handle EventCallback conversion
       if (targetType == typeof(EventCallback) && value is Action action)
       {
           return new EventCallback(action);
       }

       // Handle generic EventCallback<T>
       if (targetType.IsGenericType &&
           targetType.GetGenericTypeDefinition() == typeof(EventCallback<>))
       {
           var argType = targetType.GetGenericArguments()[0];
           var delegateType = typeof(Action<>).MakeGenericType(argType);

           if (delegateType.IsAssignableFrom(value.GetType()))
           {
               return Activator.CreateInstance(targetType, value);
           }
       }

       // Standard type conversion
       return Convert.ChangeType(value, targetType);
   }
   ```

**Deliverables:**
- ✅ Component imports tracked in Babel
- ✅ VComponent generated for imported components
- ✅ VComponent class renders child components
- ✅ Props passed and set correctly
- ✅ Basic parent-child rendering works

**Test:**
```tsx
// Button.tsx
export function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>;
}

// Parent.tsx
import { Button } from './Button.tsx';

export function Parent() {
  const handleClick = () => console.log('Clicked!');
  return <Button onClick={handleClick}>Click me</Button>;
}
```

---

### Phase 2: Hierarchical Paths (Week 3)

**Goal:** Implement namespaced hex path system

**Tasks:**

1. **C# - HexPathManager**
   - Create file: `src/Minimact.AspNetCore/Core/HexPathManager.cs`

   ```csharp
   public static class HexPathManager
   {
       /// <summary>
       /// Combine parent and child paths with namespace separator
       /// Format: <parent>:<child>
       /// </summary>
       public static string CombinePaths(string parentPath, string childPath)
       {
           if (string.IsNullOrEmpty(parentPath))
               return childPath;
           if (string.IsNullOrEmpty(childPath))
               return parentPath;

           return $"{parentPath}:{childPath}";
       }

       /// <summary>
       /// Recursively prefix all paths in VNode tree
       /// </summary>
       public static void PrefixChildPaths(VNode node, string prefix)
       {
           if (node == null) return;

           // Prefix current node
           if (!string.IsNullOrEmpty(node.HexPath))
           {
               node.HexPath = CombinePaths(prefix, node.HexPath);
           }

           // Recursively prefix children
           if (node is VElement element)
           {
               foreach (var child in element.Children)
               {
                   PrefixChildPaths(child, prefix);
               }
           }
           else if (node is VComponent component)
           {
               var childVNode = component.Render();
               PrefixChildPaths(childVNode, prefix);
           }
       }

       /// <summary>
       /// Extract parent path from namespaced path
       /// "1.2:3.4" → "1.2"
       /// </summary>
       public static string GetParentPath(string namespacedPath)
       {
           var colonIndex = namespacedPath.IndexOf(':');
           if (colonIndex == -1) return "";
           return namespacedPath.Substring(0, colonIndex);
       }

       /// <summary>
       /// Extract local path from namespaced path
       /// "1.2:3.4" → "3.4"
       /// </summary>
       public static string GetLocalPath(string namespacedPath)
       {
           var colonIndex = namespacedPath.IndexOf(':');
           if (colonIndex == -1) return namespacedPath;
           return namespacedPath.Substring(colonIndex + 1);
       }
   }
   ```

2. **C# - Update PathConverter**
   - File: `src/Minimact.AspNetCore/Core/PathConverter.cs`
   - Add support for namespaced paths

   ```csharp
   public List<int> HexPathToDomPath(string hexPath)
   {
       // Handle namespaced paths (e.g., "1.2:3.4")
       var segments = hexPath.Split(':');
       var result = new List<int>();

       foreach (var segment in segments)
       {
           var localPath = ConvertSinglePath(segment);
           result.AddRange(localPath);
       }

       return result;
   }

   private List<int> ConvertSinglePath(string hexPath)
   {
       // Existing logic for converting single path
       // ...
   }
   ```

3. **Rust - Update Reconciler**
   - File: `src/minimact-rust-reconciler/src/reconciler.rs`
   - Handle namespaced paths in patch generation

   ```rust
   impl VNode {
       pub fn get_hex_path(&self) -> Option<&str> {
           match self {
               VNode::Element(e) => Some(&e.path),
               VNode::Text(t) => Some(&t.path),
               VNode::Null(n) => Some(&n.path),
               VNode::Component(c) => Some(&c.parent_path), // Component boundary
           }
       }
   }

   // Handle component boundaries in diffing
   fn diff_component(old: &VComponent, new: &VComponent) -> Vec<Patch> {
       if old.component_type != new.component_type {
           // Component type changed - full replacement
           return vec![Patch::ReplaceNode {
               path: old.parent_path.clone(),
               new_node: VNode::Component(new.clone())
           }];
       }

       // Diff props
       let prop_patches = diff_props(&old.props, &new.props, &old.parent_path);

       // Recursively diff rendered children
       // (This happens in VComponent.Render() on C# side)

       prop_patches
   }
   ```

4. **Client - Path Navigation**
   - File: `src/client-runtime/src/dom-patcher.ts`
   - Handle namespaced paths when applying patches

   ```typescript
   private navigateToPath(path: number[]): HTMLElement | null {
     let current: HTMLElement | ChildNode | null = this.rootElement;

     for (const index of path) {
       if (!current || !('childNodes' in current)) {
         console.error('[DOMPatcher] Invalid path navigation', { path, current });
         return null;
       }

       current = current.childNodes[index];
     }

     return current as HTMLElement;
   }
   ```

**Deliverables:**
- ✅ Namespaced paths generated correctly
- ✅ PathConverter handles component boundaries
- ✅ Rust reconciler diffs across components
- ✅ Client navigates namespaced paths
- ✅ Hot reload targets specific component instances

**Test:**
```tsx
<Parent>           // Path: 1
  <Button>         // Path: 1.2 (VComponent)
    <button>       // Path: 1.2:1 (Button's internal)
      Click        // Path: 1.2:1.1
    </button>
  </Button>
</Parent>
```

---

### Phase 3: Component Templates (Week 4-5)

**Goal:** Template extraction with component boundaries

**Tasks:**

1. **Babel Plugin - Detect Component Templates**
   - File: `src/babel-plugin-minimact/src/extractors/templates.cjs`
   - Add component template extraction

   ```javascript
   function extractComponentTemplates(node, component) {
     const templates = {};

     traverse(node, {
       JSXElement(path) {
         const tagName = path.node.openingElement.name.name;

         if (component.componentImports?.has(tagName)) {
           const hexPath = path.node.__minimactPath;

           templates[hexPath] = {
             type: 'component',
             componentType: tagName,
             props: extractComponentProps(path.node.openingElement.attributes, component),
             children: extractComponentChildren(path.node.children, component),
             path: hexPath.split('.'),
             predictable: true
           };
         }
       }
     });

     return templates;
   }

   function extractComponentProps(attributes, parentComponent) {
     const props = {};

     for (const attr of attributes) {
       if (t.isJSXAttribute(attr)) {
         const propName = attr.name.name;
         const value = attr.value;

         if (t.isJSXExpressionContainer(value)) {
           const expr = value.expression;

           // Detect prop type
           if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
             props[propName] = { type: 'event', binding: 'Handle_...' };
           } else if (t.isIdentifier(expr)) {
             // Reactive binding (state variable)
             props[propName] = {
               type: 'reactive',
               binding: expr.name
             };
           } else {
             // Computed expression
             props[propName] = {
               type: 'computed',
               expression: generate(expr).code
             };
           }
         } else if (t.isStringLiteral(value)) {
           props[propName] = { type: 'static', value: value.value };
         }
       }
     }

     return props;
   }
   ```

2. **Generate Component Template Files**
   - Modify: `src/babel-plugin-minimact/src/generators/outputs.cjs`
   - Include component templates in `.templates.json`

   ```javascript
   function generateTemplateFile(component, outputPath) {
     const templates = {
       component: component.name,
       version: '1.0',
       generatedAt: Date.now(),
       templates: {
         ...component.textTemplates,
         ...component.attributeTemplates,
         ...component.componentTemplates  // ← ADD THIS
       }
     };

     fs.writeFileSync(
       outputPath.replace('.cs', '.templates.json'),
       JSON.stringify(templates, null, 2)
     );
   }
   ```

3. **Rust - Component Template Predictor**
   - File: `src/minimact-rust-reconciler/src/predictor.rs`
   - Add component template prediction

   ```rust
   pub struct ComponentTemplate {
       pub component_type: String,
       pub props: HashMap<String, PropTemplate>,
       pub children: Vec<TemplateNode>,
       pub predictable: bool
   }

   pub enum PropTemplate {
       Static { value: String },
       Reactive { binding: String },
       Computed { expression: String },
       Event { handler: String }
   }

   impl Predictor {
       pub fn predict_component_patches(
           &self,
           parent_state: &HashMap<String, Value>,
           component_template: &ComponentTemplate,
           predictor_registry: &PredictorRegistry
       ) -> Result<Vec<Patch>, PredictorError> {
           // Get child component predictor
           let child_predictor = predictor_registry
               .get(&component_template.component_type)?;

           // Resolve prop bindings (parent state → child props)
           let child_props = self.resolve_prop_bindings(
               parent_state,
               &component_template.props
           );

           // Predict child patches
           let child_patches = child_predictor.predict_patches(&child_props)?;

           // Prefix paths with parent component path
           let prefixed_patches = child_patches.iter()
               .map(|patch| patch.with_prefix(&component_template.path))
               .collect();

           Ok(prefixed_patches)
       }

       fn resolve_prop_bindings(
           &self,
           parent_state: &HashMap<String, Value>,
           prop_templates: &HashMap<String, PropTemplate>
       ) -> HashMap<String, Value> {
           let mut child_props = HashMap::new();

           for (prop_name, prop_template) in prop_templates {
               match prop_template {
                   PropTemplate::Static { value } => {
                       child_props.insert(prop_name.clone(), Value::String(value.clone()));
                   }
                   PropTemplate::Reactive { binding } => {
                       if let Some(value) = parent_state.get(binding) {
                           child_props.insert(prop_name.clone(), value.clone());
                       }
                   }
                   PropTemplate::Computed { expression } => {
                       // Evaluate expression with parent state
                       let value = self.evaluate_expression(expression, parent_state)?;
                       child_props.insert(prop_name.clone(), value);
                   }
                   PropTemplate::Event { .. } => {
                       // Events don't affect rendering
                   }
               }
           }

           child_props
       }
   }
   ```

4. **C# - Load Component Templates**
   - File: `src/Minimact.AspNetCore/Prediction/TemplatePredictionEngine.cs`
   - Load and cache component templates

   ```csharp
   public class ComponentTemplateCache
   {
       private Dictionary<string, ComponentTemplate> _templates = new();

       public ComponentTemplate GetTemplate(string componentType)
       {
           if (_templates.TryGetValue(componentType, out var template))
           {
               return template;
           }

           // Load from disk
           var templatePath = Path.Combine(
               AppContext.BaseDirectory,
               "Components",
               $"{componentType}.templates.json"
           );

           if (!File.Exists(templatePath))
           {
               throw new FileNotFoundException($"Template not found: {templateType}");
           }

           var json = File.ReadAllText(templatePath);
           template = JsonSerializer.Deserialize<ComponentTemplate>(json);

           _templates[componentType] = template;
           return template;
       }
   }
   ```

**Deliverables:**
- ✅ Component templates extracted by Babel
- ✅ Prop bindings (static, reactive, computed, event) detected
- ✅ Rust predictor resolves prop bindings
- ✅ Templates loaded and cached on server
- ✅ Predictions flow across component boundaries

**Test:**
```tsx
// Parent state: { theme: "dark", count: 5 }
<Button
  variant={theme}           // Reactive binding
  disabled={count >= 10}    // Computed expression
  label="Click"             // Static value
  onClick={handleClick}     // Event callback
/>

// Prediction:
// theme changes → Button's variant prop changes → Button re-renders
```

---

### Phase 4: EventCallback & Props (Week 6)

**Goal:** Full props-down, events-up pattern

**Tasks:**

1. **C# - EventCallback Classes**
   - Create file: `src/Minimact.AspNetCore/Core/EventCallback.cs`

   ```csharp
   /// <summary>
   /// Callback with no parameters
   /// </summary>
   public class EventCallback
   {
       private readonly Action _handler;

       public EventCallback(Action handler)
       {
           _handler = handler ?? throw new ArgumentNullException(nameof(handler));
       }

       public void Invoke()
       {
           _handler();
       }
   }

   /// <summary>
   /// Callback with single parameter
   /// </summary>
   public class EventCallback<T>
   {
       private readonly Action<T> _handler;

       public EventCallback(Action<T> handler)
       {
           _handler = handler ?? throw new ArgumentNullException(nameof(handler));
       }

       public void Invoke(T arg)
       {
           _handler(arg);
       }
   }

   /// <summary>
   /// Callback with two parameters
   /// </summary>
   public class EventCallback<T1, T2>
   {
       private readonly Action<T1, T2> _handler;

       public EventCallback(Action<T1, T2> handler)
       {
           _handler = handler ?? throw new ArgumentNullException(nameof(handler));
       }

       public void Invoke(T1 arg1, T2 arg2)
       {
           _handler(arg1, arg2);
       }
   }
   ```

2. **C# - [Prop] Attribute**
   - Create file: `src/Minimact.AspNetCore/Attributes/PropAttribute.cs`

   ```csharp
   [AttributeUsage(AttributeTargets.Property, AllowMultiple = false)]
   public class PropAttribute : Attribute
   {
       /// <summary>
       /// Whether this prop is required
       /// </summary>
       public bool Required { get; set; }

       /// <summary>
       /// Default value if not provided
       /// </summary>
       public object? DefaultValue { get; set; }
   }
   ```

3. **Babel Plugin - Generate Event Handlers**
   - File: `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`
   - Handle component event props

   ```javascript
   function extractComponentEventHandler(attr, component, componentName, hexPath) {
     const propName = attr.name.name;
     const value = attr.value;

     if (t.isJSXExpressionContainer(value)) {
       const expr = value.expression;

       if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
         // Inline arrow function: onClick={() => setCount(count + 1)}
         const handlerName = `Handle_${hexPath.replace(/\./g, '_')}_${propName}`;

         component.eventHandlers.push({
           name: handlerName,
           body: expr.body,
           params: expr.params,
           componentProp: true,
           targetComponent: componentName,
           propName: propName
         });

         return handlerName;
       } else if (t.isIdentifier(expr)) {
         // Reference to existing function: onClick={handleClick}
         return expr.name;
       }
     }

     return null;
   }
   ```

4. **Babel Plugin - Generate EventCallback Wrapper**
   - File: `src/babel-plugin-minimact/src/generators/component.cjs`
   - Wrap event handlers in EventCallback

   ```javascript
   function generatePropsObject(attributes, parentComponent) {
     const props = [];

     for (const attr of attributes) {
       if (t.isJSXAttribute(attr)) {
         const propName = attr.name.name;
         const value = attr.value;

         if (isEventProp(propName)) {
           // Event prop (onClick, onSubmit, etc.)
           const handlerName = extractComponentEventHandler(attr, parentComponent);
           props.push(`["${propName}"] = new EventCallback(${handlerName})`);
         } else if (t.isJSXExpressionContainer(value)) {
           // Reactive or computed prop
           const expr = value.expression;
           const code = generate(expr).code;
           props.push(`["${propName}"] = ${code}`);
         } else if (t.isStringLiteral(value)) {
           // Static string prop
           props.push(`["${propName}"] = "${value.value}"`);
         }
       }
     }

     return `new Dictionary<string, object> { ${props.join(', ')} }`;
   }

   function isEventProp(propName) {
     return propName.startsWith('on') && propName[2] === propName[2].toUpperCase();
   }
   ```

5. **C# - Validate Props**
   - File: `src/Minimact.AspNetCore/Core/MinimactComponent.cs`
   - Add prop validation

   ```csharp
   public void ValidateProps()
   {
       var props = this.GetType().GetProperties()
           .Where(p => p.GetCustomAttribute<PropAttribute>() != null);

       foreach (var prop in props)
       {
           var attr = prop.GetCustomAttribute<PropAttribute>();
           var value = prop.GetValue(this);

           if (attr.Required && value == null)
           {
               throw new InvalidOperationException(
                   $"Required prop '{prop.Name}' not provided on {GetType().Name}"
               );
           }
       }
   }
   ```

**Deliverables:**
- ✅ EventCallback classes implemented
- ✅ [Prop] attribute for prop metadata
- ✅ Event handlers wrapped in EventCallback
- ✅ Props validated at render time
- ✅ Type-safe event callbacks

**Test:**
```tsx
// Child component
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button className={`btn-${variant}`} onClick={onClick}>
      {label}
    </button>
  );
}

// Generated C#
public class Button : MinimactComponent
{
    [Prop(Required = true)]
    public string label { get; set; } = "";

    [Prop(Required = true)]
    public EventCallback onClick { get; set; }

    [Prop(DefaultValue = "primary")]
    public string variant { get; set; } = "primary";

    protected override VNode Render()
    {
        ValidateProps(); // Throws if required props missing

        return new VElement("button", "1", new {
            ["class"] = $"btn-{variant}",
            ["onclick"] = nameof(HandleClick)
        }, new VText(label, "1.1"));
    }

    private void HandleClick()
    {
        onClick.Invoke(); // ← Calls parent's handler
    }
}
```

---

### Phase 5: Hot Reload (Week 7-8)

**Goal:** Granular hot reload for child components

**Tasks:**

1. **C# - Component Instance Tracking**
   - File: `src/Minimact.AspNetCore/Core/ComponentRegistry.cs`
   - Track instances by type

   ```csharp
   public class ComponentRegistry
   {
       private Dictionary<string, MinimactComponent> _components = new();
       private Dictionary<Type, List<string>> _instancesByType = new();
       private Dictionary<string, string> _parentChildMap = new(); // child → parent

       public void RegisterComponent(string id, MinimactComponent component)
       {
           _components[id] = component;

           var type = component.GetType();
           if (!_instancesByType.ContainsKey(type))
           {
               _instancesByType[type] = new List<string>();
           }
           _instancesByType[type].Add(id);
       }

       public void RegisterParentChild(string parentId, string childId)
       {
           _parentChildMap[childId] = parentId;
       }

       public List<string> GetInstancesByType<T>() where T : MinimactComponent
       {
           if (_instancesByType.TryGetValue(typeof(T), out var instances))
           {
               return instances;
           }
           return new List<string>();
       }

       public MinimactComponent? GetParent(string childId)
       {
           if (_parentChildMap.TryGetValue(childId, out var parentId))
           {
               return _components.GetValueOrDefault(parentId);
           }
           return null;
       }
   }
   ```

2. **C# - Hot Reload Manager**
   - Create file: `src/Minimact.AspNetCore/HotReload/ComponentHotReloadManager.cs`

   ```csharp
   public class ComponentHotReloadManager
   {
       private readonly ComponentRegistry _registry;
       private readonly IHubContext<MinimactHub> _hubContext;

       public async Task HotReloadComponent<T>() where T : MinimactComponent
       {
           var componentType = typeof(T);
           var instanceIds = _registry.GetInstancesByType<T>();

           Console.WriteLine($"[Hot Reload] Reloading {instanceIds.Count} instance(s) of {componentType.Name}");

           foreach (var instanceId in instanceIds)
           {
               await HotReloadSingleInstance<T>(instanceId);
           }
       }

       private async Task HotReloadSingleInstance<T>(string instanceId) where T : MinimactComponent
       {
           var oldInstance = _registry.GetComponent(instanceId);
           if (oldInstance == null) return;

           // Create new instance
           var newInstance = Activator.CreateInstance<T>();
           newInstance.ComponentId = instanceId;
           newInstance.ParentPath = oldInstance.ParentPath;

           // Try to preserve state
           TryPreserveState(oldInstance, newInstance);

           // Copy props from old instance
           CopyProps(oldInstance, newInstance);

           // Replace in registry
           _registry.ReplaceComponent(instanceId, newInstance);

           // Render new instance
           var oldVNode = oldInstance.CurrentVNode;
           var newVNode = newInstance.Render();

           // Compute patches (only within component scope)
           var patches = RustBridge.Reconcile(oldVNode, newVNode);

           // Convert hex paths → DOM indices
           var pathConverter = new PathConverter(newVNode);
           foreach (var patch in patches)
           {
               patch.DomPath = pathConverter.HexPathToDomPath(patch.HexPath);
           }

           // Send patches to client (scoped to this component)
           await _hubContext.Clients.All.SendAsync("HotReload:ComponentPatches", new {
               componentId = instanceId,
               componentType = typeof(T).Name,
               patches = patches
           });

           Console.WriteLine($"[Hot Reload] ✅ Reloaded {typeof(T).Name} instance {instanceId} ({patches.Count} patches)");
       }

       private void TryPreserveState(MinimactComponent old, MinimactComponent @new)
       {
           // Copy state fields marked with [State]
           var stateFields = old.GetType().GetFields(BindingFlags.NonPublic | BindingFlags.Instance)
               .Where(f => f.GetCustomAttribute<StateAttribute>() != null);

           foreach (var field in stateFields)
           {
               var value = field.GetValue(old);
               field.SetValue(@new, value);
           }
       }

       private void CopyProps(MinimactComponent old, MinimactComponent @new)
       {
           // Copy props
           var props = old.GetType().GetProperties()
               .Where(p => p.GetCustomAttribute<PropAttribute>() != null);

           foreach (var prop in props)
           {
               var value = prop.GetValue(old);
               prop.SetValue(@new, value);
           }
       }
   }
   ```

3. **Client - Scoped Patch Application**
   - File: `src/client-runtime/src/minimact.ts`
   - Add handler for component-scoped hot reload

   ```typescript
   this.signalR.on('HotReload:ComponentPatches', (data) => {
     console.log(`[Hot Reload] 🔥 Component ${data.componentType} updated`, data);

     // Find component root element by ID
     const componentRoot = document.querySelector(`[data-component-id="${data.componentId}"]`);

     if (!componentRoot) {
       console.warn(`[Hot Reload] Component root not found: ${data.componentId}`);
       return;
     }

     // Apply patches within component scope
     for (const patch of data.patches) {
       this.domPatcher.applyPatch(componentRoot, patch);
     }

     console.log(`[Hot Reload] ✅ Applied ${data.patches.length} patches to ${data.componentType}`);
   });
   ```

4. **File Watcher - Component Detection**
   - File: `src/Minimact.AspNetCore/HotReload/FileWatcher.cs`
   - Detect which component changed

   ```csharp
   private async Task OnComponentFileChanged(string filePath)
   {
       // Extract component name from file path
       // e.g., "Components/Button.cs" → "Button"
       var fileName = Path.GetFileNameWithoutExtension(filePath);

       // Find component type
       var componentType = ComponentTypeRegistry.GetType(fileName);

       if (componentType == null)
       {
           Console.WriteLine($"[Hot Reload] Component type not found: {fileName}");
           return;
       }

       // Reload all instances of this component
       await _hotReloadManager.HotReloadComponent(componentType);
   }
   ```

**Deliverables:**
- ✅ Component instances tracked by type
- ✅ Hot reload targets specific component type
- ✅ State preserved across hot reload
- ✅ Props copied to new instance
- ✅ Patches scoped to component boundary
- ✅ Client applies patches to component only

**Test:**
```tsx
// Button.tsx
export function Button({ label }) {
  return <button className="btn">{label}</button>;
}

// Page with 3 Button instances
<div>
  <Button label="One" />
  <Button label="Two" />
  <Button label="Three" />
</div>

// Edit Button.tsx: change className="btn" to className="btn-new"
// Result: All 3 buttons update instantly, page doesn't re-render
```

---

### Phase 6: Context System (Week 9)

**Goal:** Avoid prop drilling with context

**Tasks:**

1. **Babel Plugin - Detect Context**
   - File: `src/babel-plugin-minimact/src/extractors/hooks.cjs`
   - Add useContext detection

   ```javascript
   if (hookName === 'useContext') {
     const contextType = getContextType(node.arguments[0]);

     component.useContext = component.useContext || [];
     component.useContext.push({
       index: component.useContext.length,
       contextType: contextType
     });
   }

   function getContextType(arg) {
     if (t.isMemberExpression(arg)) {
       // ThemeContext.Consumer
       return arg.object.name;
     } else if (t.isIdentifier(arg)) {
       // ThemeContext
       return arg.name;
     }
     return 'UnknownContext';
   }
   ```

2. **C# - Context Infrastructure**
   - Create file: `src/Minimact.AspNetCore/Core/MinimactContext.cs`

   ```csharp
   public class MinimactContext<T> where T : class
   {
       private static AsyncLocal<T?> _value = new();
       private static string _contextId = Guid.NewGuid().ToString();

       public static string ContextId => _contextId;

       public static T? Value
       {
           get => _value.Value;
           set => _value.Value = value;
       }

       public static void SetValue(T value)
       {
           _value.Value = value;
       }

       public static T GetValue()
       {
           var value = _value.Value;
           if (value == null)
           {
               throw new InvalidOperationException(
                   $"Context {typeof(T).Name} not provided. " +
                   $"Make sure you have a <Context.Provider> in your component tree."
               );
           }
           return value;
       }
   }
   ```

3. **Babel Plugin - Generate Context Provider**
   - File: `src/babel-plugin-minimact/src/generators/jsx.cjs`
   - Detect `<Context.Provider>`

   ```javascript
   if (t.isJSXMemberExpression(node.openingElement.name)) {
     const object = node.openingElement.name.object.name; // ThemeContext
     const property = node.openingElement.name.property.name; // Provider

     if (property === 'Provider') {
       return generateContextProvider(object, node, component, indent);
     }
   }

   function generateContextProvider(contextName, node, component, indent) {
     const valueAttr = node.openingElement.attributes.find(
       attr => attr.name?.name === 'value'
     );

     const valueExpr = valueAttr?.value?.expression;
     const valueCode = generate(valueExpr).code;

     const children = generateChildren(node.children, component, indent + 1);

     return `
   MinimactContext<${contextName}>.SetValue(${valueCode});
   try {
       ${children.map(c => c.code).join(',\n')}
   } finally {
       MinimactContext<${contextName}>.SetValue(null);
   }
     `.trim();
   }
   ```

4. **Babel Plugin - Generate useContext Call**
   - File: `src/babel-plugin-minimact/src/generators/renderBody.cjs`
   - Generate context access

   ```csharp
   // In component Render() method, before JSX rendering
   // Generate: var theme = MinimactContext<ThemeContext>.GetValue();

   for (const ctx of component.useContext || []) {
     contextAccessCode += `var ${ctx.varName} = MinimactContext<${ctx.contextType}>.GetValue();\n`;
   }
   ```

5. **Example Usage**

   ```tsx
   // ThemeContext.tsx
   export interface ThemeContextValue {
     theme: 'light' | 'dark';
     setTheme: (theme: 'light' | 'dark') => void;
   }

   export const ThemeContext = createContext<ThemeContextValue>();

   // App.tsx
   import { ThemeContext } from './ThemeContext';

   export function App() {
     const [theme, setTheme] = useState<'light' | 'dark'>('light');

     return (
       <ThemeContext.Provider value={{ theme, setTheme }}>
         <Layout>
           <Dashboard />
         </Layout>
       </ThemeContext.Provider>
     );
   }

   // Dashboard.tsx (deep child)
   import { useContext } from '@minimact/core';
   import { ThemeContext } from './ThemeContext';

   export function Dashboard() {
     const { theme, setTheme } = useContext(ThemeContext);

     return (
       <div className={`dashboard theme-${theme}`}>
         <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
           Toggle Theme
         </button>
       </div>
     );
   }
   ```

**Deliverables:**
- ✅ Context infrastructure with AsyncLocal<T>
- ✅ <Context.Provider> generates try/finally wrapper
- ✅ useContext generates GetValue() call
- ✅ Type-safe context values
- ✅ No prop drilling required

---

### Phase 7: Cascading Prediction (Week 10-11)

**Goal:** Predictions flow across component boundaries

**Tasks:**

1. **C# - Component Graph Builder**
   - Create file: `src/Minimact.AspNetCore/Prediction/ComponentGraph.cs`

   ```csharp
   public class ComponentGraph
   {
       public Dictionary<string, ComponentNode> Nodes { get; set; } = new();
       public Dictionary<string, List<string>> ParentToChildren { get; set; } = new();
       public List<PropBinding> PropBindings { get; set; } = new();

       public void AddComponent(string id, string type, string? parentId = null)
       {
           Nodes[id] = new ComponentNode { Id = id, Type = type, ParentId = parentId };

           if (parentId != null)
           {
               if (!ParentToChildren.ContainsKey(parentId))
               {
                   ParentToChildren[parentId] = new List<string>();
               }
               ParentToChildren[parentId].Add(id);
           }
       }

       public void AddPropBinding(string parentId, string parentStateKey, string childId, string childPropKey)
       {
           PropBindings.Add(new PropBinding
           {
               ParentId = parentId,
               ParentStateKey = parentStateKey,
               ChildId = childId,
               ChildPropKey = childPropKey
           });
       }

       public List<PropBinding> GetAffectedBindings(string parentId, HashSet<string> changedStateKeys)
       {
           return PropBindings
               .Where(b => b.ParentId == parentId && changedStateKeys.Contains(b.ParentStateKey))
               .ToList();
       }
   }

   public class ComponentNode
   {
       public string Id { get; set; }
       public string Type { get; set; }
       public string? ParentId { get; set; }
   }

   public class PropBinding
   {
       public string ParentId { get; set; }
       public string ParentStateKey { get; set; }
       public string ChildId { get; set; }
       public string ChildPropKey { get; set; }
   }
   ```

2. **Rust - Cascading Predictor**
   - File: `src/minimact-rust-reconciler/src/cascading_predictor.rs`

   ```rust
   use std::collections::HashMap;
   use serde::{Deserialize, Serialize};

   #[derive(Debug, Clone, Serialize, Deserialize)]
   pub struct ComponentGraph {
       pub nodes: HashMap<String, ComponentNode>,
       pub parent_to_children: HashMap<String, Vec<String>>,
       pub prop_bindings: Vec<PropBinding>
   }

   #[derive(Debug, Clone, Serialize, Deserialize)]
   pub struct ComponentNode {
       pub id: String,
       pub component_type: String,
       pub parent_id: Option<String>
   }

   #[derive(Debug, Clone, Serialize, Deserialize)]
   pub struct PropBinding {
       pub parent_id: String,
       pub parent_state_key: String,
       pub child_id: String,
       pub child_prop_key: String
   }

   pub fn predict_cascading_updates(
       root_component_id: &str,
       state_changes: HashMap<String, serde_json::Value>,
       component_graph: &ComponentGraph,
       predictor_registry: &HashMap<String, Predictor>
   ) -> Result<Vec<Patch>, PredictorError> {
       let mut all_patches = Vec::new();

       // Get root component type
       let root_node = component_graph.nodes.get(root_component_id)
           .ok_or_else(|| PredictorError::ComponentNotFound(root_component_id.to_string()))?;

       // 1. Predict root component patches
       let root_predictor = predictor_registry.get(&root_node.component_type)
           .ok_or_else(|| PredictorError::PredictorNotFound(root_node.component_type.clone()))?;

       let root_patches = root_predictor.predict_patches(&state_changes)?;
       all_patches.extend(root_patches);

       // 2. Find affected prop bindings
       let changed_keys: HashSet<String> = state_changes.keys().cloned().collect();
       let affected_bindings: Vec<&PropBinding> = component_graph.prop_bindings.iter()
           .filter(|b| b.parent_id == root_component_id && changed_keys.contains(&b.parent_state_key))
           .collect();

       // 3. Group bindings by child component
       let mut child_changes: HashMap<String, HashMap<String, serde_json::Value>> = HashMap::new();

       for binding in affected_bindings {
           let child_props = child_changes.entry(binding.child_id.clone())
               .or_insert_with(HashMap::new);

           if let Some(value) = state_changes.get(&binding.parent_state_key) {
               child_props.insert(binding.child_prop_key.clone(), value.clone());
           }
       }

       // 4. Recursively predict child patches
       for (child_id, child_prop_changes) in child_changes {
           let child_patches = predict_cascading_updates(
               &child_id,
               child_prop_changes,
               component_graph,
               predictor_registry
           )?;

           all_patches.extend(child_patches);
       }

       Ok(all_patches)
   }
   ```

3. **C# - Build Graph at Runtime**
   - File: `src/Minimact.AspNetCore/Prediction/GraphBuilder.cs`

   ```csharp
   public class ComponentGraphBuilder
   {
       public ComponentGraph BuildGraph(MinimactComponent rootComponent)
       {
           var graph = new ComponentGraph();
           TraverseComponent(rootComponent, null, graph);
           return graph;
       }

       private void TraverseComponent(MinimactComponent component, string? parentId, ComponentGraph graph)
       {
           var componentId = component.ComponentId;
           var componentType = component.GetType().Name;

           graph.AddComponent(componentId, componentType, parentId);

           // Render to get VNode tree
           var vnode = component.Render();

           // Find VComponent children
           TraverseVNode(vnode, componentId, graph);
       }

       private void TraverseVNode(VNode node, string parentId, ComponentGraph graph)
       {
           if (node is VComponent vcomponent)
           {
               var childId = vcomponent.ComponentId;
               var childType = vcomponent.ComponentType;

               graph.AddComponent(childId, childType, parentId);

               // Analyze prop bindings
               foreach (var prop in vcomponent.Props)
               {
                   if (IsReactiveProp(prop.Value))
                   {
                       var stateKey = ExtractStateKey(prop.Value);
                       graph.AddPropBinding(parentId, stateKey, childId, prop.Key);
                   }
               }

               // Recursively traverse child
               var childVNode = vcomponent.Render();
               TraverseVNode(childVNode, childId, graph);
           }
           else if (node is VElement element)
           {
               foreach (var child in element.Children)
               {
                   TraverseVNode(child, parentId, graph);
               }
           }
       }
   }
   ```

4. **Client - Apply Cascaded Patches**
   - File: `src/client-runtime/src/minimact.ts`
   - Handle multi-component patch batches

   ```typescript
   private async applyPredictedPatches(patches: Patch[]) {
     // Group patches by component
     const patchesByComponent = new Map<string, Patch[]>();

     for (const patch of patches) {
       const componentId = this.extractComponentId(patch.path);

       if (!patchesByComponent.has(componentId)) {
         patchesByComponent.set(componentId, []);
       }
       patchesByComponent.get(componentId)!.push(patch);
     }

     // Apply patches per component
     for (const [componentId, componentPatches] of patchesByComponent) {
       const componentRoot = this.getComponentRoot(componentId);

       for (const patch of componentPatches) {
         this.domPatcher.applyPatch(componentRoot, patch);
       }

       console.log(`[Prediction] Applied ${componentPatches.length} patches to ${componentId}`);
     }
   }

   private extractComponentId(path: string): string {
     // Extract component ID from namespaced path
     // "1.2:3.4" → "1.2"
     const colonIndex = path.indexOf(':');
     if (colonIndex === -1) return 'root';
     return path.substring(0, colonIndex);
   }
   ```

**Deliverables:**
- ✅ Component graph built at runtime
- ✅ Prop bindings tracked
- ✅ Rust cascading predictor
- ✅ Predictions flow parent → children
- ✅ Client applies patches across components
- ✅ Instant UI updates across component boundaries

**Test:**
```tsx
<Parent count={5}>
  <Button onClick={() => setCount(count + 1)} />
  <Counter value={count} />
</Parent>

// User clicks button:
// 1. Parent: count++ predicted (6)
// 2. Counter: value=6 predicted
// 3. Both patches applied instantly (< 5ms)
// 4. Server confirms
```

---

## Testing Strategy

### Unit Tests

1. **Babel Plugin Tests**
   - Component import detection
   - VComponent code generation
   - Prop binding extraction
   - Event handler generation

   ```javascript
   // test/component-imports.test.js
   describe('Component Imports', () => {
     it('should track component imports', () => {
       const input = `
         import { Button } from './Button.tsx';
         export function App() {
           return <Button />;
         }
       `;

       const result = transform(input);
       expect(result.metadata.componentImports.has('Button')).toBe(true);
     });
   });
   ```

2. **C# Tests**
   - VComponent rendering
   - Prop setting
   - EventCallback invocation
   - Context scoping

   ```csharp
   [Fact]
   public void VComponent_ShouldRenderChildComponent()
   {
       var vcomponent = new VComponent
       {
           ComponentType = "Button",
           ComponentId = "btn1",
           Props = new() { ["label"] = "Click" }
       };

       var result = vcomponent.Render();

       Assert.IsType<VElement>(result);
       Assert.Equal("button", ((VElement)result).Tag);
   }
   ```

3. **Rust Tests**
   - Cascading prediction
   - Prop binding resolution
   - Path prefixing

   ```rust
   #[test]
   fn test_cascading_prediction() {
       let graph = build_test_graph();
       let state_changes = hashmap!{
           "count".to_string() => json!(6)
       };

       let patches = predict_cascading_updates(
           "parent",
           state_changes,
           &graph,
           &test_predictor_registry()
       ).unwrap();

       assert_eq!(patches.len(), 2); // Parent + child
   }
   ```

### Integration Tests

1. **Parent-Child Rendering**
   - Create parent with child components
   - Verify VNode tree structure
   - Check namespaced paths

2. **Prop Reactivity**
   - Change parent state
   - Verify child re-renders
   - Check prediction accuracy

3. **Event Bubbling**
   - Click child button
   - Verify parent handler called
   - Check state updates

4. **Hot Reload**
   - Edit child component
   - Verify only child instances reload
   - Check state preservation

### End-to-End Tests

```tsx
// e2e/component-composition.test.tsx
describe('Component Composition', () => {
  it('should render nested components', async () => {
    await page.goto('http://localhost:5000');

    // Check parent rendered
    expect(await page.$('.parent')).toBeTruthy();

    // Check child rendered
    expect(await page.$('.button')).toBeTruthy();
  });

  it('should handle prop changes', async () => {
    await page.click('.toggle-theme');

    // Wait for prediction
    await page.waitForTimeout(10);

    // Verify child updated
    const className = await page.$eval('.button', el => el.className);
    expect(className).toContain('dark');
  });

  it('should handle events', async () => {
    const countBefore = await page.textContent('.count');

    await page.click('.button');

    const countAfter = await page.textContent('.count');
    expect(parseInt(countAfter)).toBe(parseInt(countBefore) + 1);
  });
});
```

---

## Migration Path

### For Existing Minimact Projects

**Step 1: Upgrade Framework**
```bash
cd src/Minimact.AspNetCore
dotnet build

cd ../babel-plugin-minimact
npm install
npm run build
```

**Step 2: Update Components (No Breaking Changes)**

Existing components continue to work:
```tsx
// Old style (still works)
export function Page() {
  return (
    <div>
      <h1>Hello</h1>
      <button>Click</button>
    </div>
  );
}
```

**Step 3: Opt-In to Composition**

Extract reusable parts:
```tsx
// Button.tsx (new file)
export function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>;
}

// Page.tsx (update existing)
import { Button } from './Button.tsx';

export function Page() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <Button
        label="Increment"
        onClick={() => setCount(count + 1)}
      />
    </div>
  );
}
```

**Step 4: Re-transpile**
```bash
npx babel Components --out-dir Generated --config-file babel.config.json
```

**Step 5: Test**
```bash
dotnet run
# Navigate to http://localhost:5000
```

### Breaking Changes

**None!** This is a purely additive feature. Existing single-component pages continue to work exactly as before.

---

## Future Enhancements

### Phase 8+: Advanced Features

1. **Async Components**
   - Suspend rendering until data loaded
   - Show loading states
   - Error boundaries

   ```tsx
   export async function UserProfile({ userId }) {
     const user = await fetchUser(userId);

     return (
       <div>
         <h1>{user.name}</h1>
         <p>{user.email}</p>
       </div>
     );
   }
   ```

2. **Component Slots**
   - Named slots (like Vue)
   - Default slot content
   - Slot fallbacks

   ```tsx
   export function Card({ header, footer, children }) {
     return (
       <div className="card">
         <div className="card-header">{header}</div>
         <div className="card-body">{children}</div>
         <div className="card-footer">{footer}</div>
       </div>
     );
   }

   <Card
     header={<h1>Title</h1>}
     footer={<Button>OK</Button>}
   >
     <p>Body content</p>
   </Card>
   ```

3. **Component Libraries**
   - Publish npm packages
   - Import from external libraries
   - Version management

   ```tsx
   import { Button, Card, Modal } from '@minimact/ui';
   ```

4. **Render Props Pattern**
   - Pass render functions as props
   - Flexible composition

   ```tsx
   <DataTable
     data={users}
     renderRow={(user) => (
       <tr>
         <td>{user.name}</td>
         <td>{user.email}</td>
       </tr>
     )}
   />
   ```

5. **Higher-Order Components**
   - Wrap components with additional logic
   - Authentication wrappers
   - Layout providers

   ```tsx
   export function withAuth<T>(Component: Component<T>) {
     return function AuthenticatedComponent(props: T) {
       const { user } = useAuth();

       if (!user) {
         return <Redirect to="/login" />;
       }

       return <Component {...props} />;
     };
   }
   ```

6. **Error Boundaries**
   - Catch errors in child components
   - Show fallback UI
   - Log errors to server

   ```tsx
   export function ErrorBoundary({ children, fallback }) {
     return (
       <ErrorBoundaryComponent fallback={fallback}>
         {children}
       </ErrorBoundaryComponent>
     );
   }

   <ErrorBoundary fallback={<ErrorPage />}>
     <Dashboard />
   </ErrorBoundary>
   ```

---

## Success Criteria

### Definition of Done

- ✅ Component imports work from TSX files
- ✅ VComponent renders child components correctly
- ✅ Props (data) flow down to children
- ✅ Events (callbacks) flow up to parents
- ✅ Context system avoids prop drilling
- ✅ Predictions cascade across boundaries
- ✅ Hot reload targets specific components
- ✅ Hierarchical paths prevent collisions
- ✅ All tests pass
- ✅ Documentation complete
- ✅ Example applications work
- ✅ Zero breaking changes

### Performance Targets

- **Component Rendering:** < 2ms per component
- **Cascading Prediction:** < 10ms for 5-level hierarchy
- **Hot Reload:** < 50ms for single component
- **Prop Update:** < 5ms from parent state change to child render

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Foundation | Week 1-2 | VComponent, basic rendering, prop setting |
| Phase 2: Hierarchical Paths | Week 3 | Namespaced paths, path conversion |
| Phase 3: Component Templates | Week 4-5 | Template extraction, prop bindings |
| Phase 4: EventCallback & Props | Week 6 | Event system, prop validation |
| Phase 5: Hot Reload | Week 7-8 | Granular component reload |
| Phase 6: Context System | Week 9 | Context API, provider/consumer |
| Phase 7: Cascading Prediction | Week 10-11 | Cross-component prediction |
| **Total** | **11 weeks** | **Full component composition** |

---

## Conclusion

This implementation plan provides a **systematic, phase-by-phase approach** to adding full component composition to Minimact while:

- ✅ Maintaining 100% backward compatibility
- ✅ Preserving predictive rendering performance
- ✅ Enabling hot reload at component granularity
- ✅ Supporting type-safe props and events
- ✅ Allowing context for deep trees
- ✅ Cascading predictions across boundaries

The result will be a **world-class component framework** that combines React's developer experience with server-side rendering performance and sub-5ms predictive updates.

**Ready to start Phase 1?** 🚀
