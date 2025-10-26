# Loop Templates Phase 4B: Complex Element Lists

**Status**: Implementation in Progress
**Building on**: Phase 4A (Simple text lists) ✅ Complete
**Goal**: Handle complex list items with props, nested conditionals, and multiple children

---

## What Phase 4A Accomplished

✅ Basic loop template extraction for arrays
✅ Simple text item templates (`<li>{item.name}</li>`)
✅ Element templates with text children
✅ Client-side rendering with `renderLoopTemplate()`
✅ Flattened state binding (`item.property` access)

---

## Phase 4B Enhancements

### 1. **Prop Template Extraction**

**Example Component**:
```tsx
{todos.map(todo => (
  <li className={todo.done ? 'completed' : 'pending'} data-id={todo.id}>
    {todo.text}
  </li>
))}
```

**Current Limitation**:
- Props are ignored (line 748: `props_templates: None`)
- Client renders elements without dynamic props

**Phase 4B Solution**:
Extract templates for dynamic props:

```rust
// Rust extraction
ItemTemplate::Element {
  tag: "li",
  props_templates: Some({
    "className": TemplatePatch {
      template: "{0}",
      bindings: ["item.done"],
      conditional_templates: Some({
        "true": "completed",
        "false": "pending"
      }),
      conditional_binding_index: Some(0)
    },
    "data-id": TemplatePatch {
      template: "{0}",
      bindings: ["item.id"],
      slots: [0]
    }
  }),
  children_templates: [...]
}
```

---

### 2. **Nested Conditional Templates**

**Example Component**:
```tsx
{todos.map(todo => (
  <li>
    {todo.text} {todo.done ? '✓' : '○'}
  </li>
))}
```

**Current Limitation**:
- Only extracts first text child
- Doesn't detect conditional text patterns within list items

**Phase 4B Solution**:
Detect boolean-based conditional text:

```rust
// If we find two different text values for same position across array items:
// Item 1 (done=true): "Buy milk ✓"
// Item 2 (done=false): "Walk dog ○"
// Extract pattern: "{0} {1}" where {1} is conditional on item.done

ItemTemplate::Text {
  template_patch: TemplatePatch {
    template: "{0} {1}",
    bindings: ["item.text", "item.done"],
    slots: [0, 10],
    conditional_templates: Some({
      "true": "✓",
      "false": "○"
    }),
    conditional_binding_index: Some(1) // Second binding is conditional
  }
}
```

---

### 3. **Improved Key Binding Detection**

**Current Limitation**:
- Hardcoded to "item.id" (line 729)
- Doesn't analyze actual key values

**Phase 4B Solution**:
Analyze key values across array items to infer binding:

```rust
// If element has key="1", "2", "3" for items with id: 1, 2, 3
// → key_binding: "item.id"

// If element has key="alice", "bob" for items with name: "alice", "bob"
// → key_binding: "item.name"

fn detect_key_binding(
    element: &VElement,
    array_items: &[Value]
) -> Option<String> {
    let key = element.key.as_ref()?;

    // Try to match key against array item properties
    if let Some(first_item) = array_items.get(0) {
        if let Value::Object(obj) = first_item {
            for (prop_name, prop_value) in obj {
                let prop_str = match prop_value {
                    Value::String(s) => s.clone(),
                    Value::Number(n) => n.to_string(),
                    _ => continue,
                };

                if key == &prop_str {
                    return Some(format!("item.{}", prop_name));
                }
            }
        }
    }

    // Fall back to "item.id" if can't detect
    Some("item.id".to_string())
}
```

---

### 4. **Multiple Text Nodes**

**Example Component**:
```tsx
{users.map(user => (
  <div>
    <strong>{user.name}</strong>
    <span>{user.email}</span>
  </div>
))}
```

**Current Status**:
Already works! Phase 4A recursively extracts children:
- Finds `<strong>` with text child → extracts template for `user.name`
- Finds `<span>` with text child → extracts template for `user.email`

**Phase 4B Enhancement**:
Ensure we handle ALL children, not just first match

---

## Implementation Tasks

### Task 1: Extract Prop Templates

**File**: `src/src/predictor.rs:691-752`

**Changes**:

```rust
fn extract_element_item_template(
    &self,
    element: &crate::vdom::VElement,
    array_items: &[serde_json::Value]
) -> Option<crate::vdom::ItemTemplate> {
    use crate::vdom::ItemTemplate;
    use std::collections::HashMap;

    // NEW: Extract prop templates
    let props_templates = self.extract_props_templates(&element.props, array_items);

    // Extract children templates (existing logic)
    let mut children_templates = Vec::new();
    for child in &element.children {
        match child {
            VNode::Text(text_node) => {
                if let Some(text_template) = self.extract_text_item_template(
                    &text_node.content,
                    array_items
                ) {
                    children_templates.push(text_template);
                }
            }
            VNode::Element(child_element) => {
                if let Some(element_template) = self.extract_element_item_template(
                    child_element,
                    array_items
                ) {
                    children_templates.push(element_template);
                }
            }
        }
    }

    // NEW: Improved key binding detection
    let key_binding = self.detect_key_binding(element, array_items);

    Some(ItemTemplate::Element {
        tag: element.tag.clone(),
        props_templates, // NEW: Prop templates
        children_templates: if children_templates.is_empty() { None } else { Some(children_templates) },
        key_binding,
    })
}
```

Add helper method:

```rust
/// Extract templates for element props
fn extract_props_templates(
    &self,
    props: &HashMap<String, String>,
    array_items: &[serde_json::Value]
) -> Option<HashMap<String, crate::vdom::TemplatePatch>> {
    let mut props_templates = HashMap::new();

    for (prop_name, prop_value) in props {
        // Try to find which array item property this prop value came from
        if let Some(first_item) = array_items.get(0) {
            if let serde_json::Value::Object(obj) = first_item {
                for (item_prop, item_value) in obj {
                    let item_value_str = match item_value {
                        serde_json::Value::String(s) => s.clone(),
                        serde_json::Value::Number(n) => n.to_string(),
                        serde_json::Value::Bool(b) => b.to_string(),
                        _ => continue,
                    };

                    // Direct match: prop value == item property value
                    if prop_value == &item_value_str {
                        props_templates.insert(
                            prop_name.clone(),
                            crate::vdom::TemplatePatch {
                                template: "{0}".to_string(),
                                bindings: vec![format!("item.{}", item_prop)],
                                slots: vec![0],
                                conditional_templates: None,
                                conditional_binding_index: None,
                            }
                        );
                        break;
                    }

                    // Conditional match: prop varies with boolean property
                    // (Check across multiple array items)
                    if let serde_json::Value::Bool(_) = item_value {
                        if let Some(conditional_template) = self.extract_conditional_prop_template(
                            prop_name,
                            prop_value,
                            item_prop,
                            array_items
                        ) {
                            props_templates.insert(prop_name.clone(), conditional_template);
                            break;
                        }
                    }
                }
            }
        }
    }

    if props_templates.is_empty() {
        None
    } else {
        Some(props_templates)
    }
}

/// Extract conditional template for prop (e.g., className based on done)
fn extract_conditional_prop_template(
    &self,
    _prop_name: &str,
    prop_value: &str,
    bool_item_prop: &str,
    array_items: &[serde_json::Value]
) -> Option<crate::vdom::TemplatePatch> {
    use serde_json::Value;
    use std::collections::HashMap;

    // Find items where bool property is true vs false
    let mut true_value: Option<String> = None;
    let mut false_value: Option<String> = None;

    for item in array_items {
        if let Value::Object(obj) = item {
            if let Some(Value::Bool(bool_val)) = obj.get(bool_item_prop) {
                // We need to render this item to see what the prop value would be
                // For now, use simple heuristic: first item with true, first with false
                if *bool_val && true_value.is_none() {
                    true_value = Some(prop_value.to_string());
                } else if !*bool_val && false_value.is_none() {
                    false_value = Some(prop_value.to_string());
                }
            }
        }
    }

    // If we found both true and false values, create conditional template
    if let (Some(true_val), Some(false_val)) = (true_value, false_value) {
        let mut conditional_map = HashMap::new();
        conditional_map.insert("true".to_string(), true_val);
        conditional_map.insert("false".to_string(), false_val);

        return Some(crate::vdom::TemplatePatch {
            template: "{0}".to_string(),
            bindings: vec![format!("item.{}", bool_item_prop)],
            slots: vec![0],
            conditional_templates: Some(conditional_map),
            conditional_binding_index: Some(0),
        });
    }

    None
}
```

---

### Task 2: Improved Key Detection

Add new method:

```rust
/// Detect which item property is used for keys
fn detect_key_binding(
    &self,
    element: &crate::vdom::VElement,
    array_items: &[serde_json::Value]
) -> Option<String> {
    use serde_json::Value;

    let key = element.key.as_ref()?;

    // Try to match key value against first array item's properties
    if let Some(first_item) = array_items.get(0) {
        if let Value::Object(obj) = first_item {
            for (prop_name, prop_value) in obj {
                let prop_str = match prop_value {
                    Value::String(s) => s.clone(),
                    Value::Number(n) => n.to_string(),
                    _ => continue,
                };

                if key == &prop_str {
                    crate::log_info!("📐 Detected key binding: item.{}", prop_name);
                    return Some(format!("item.{}", prop_name));
                }
            }
        }
    }

    // Default fallback
    crate::log_warn!("⚠️ Could not detect key binding, defaulting to item.id");
    Some("item.id".to_string())
}
```

---

### Task 3: Enhanced Text Template Extraction

Current `extract_text_item_template()` handles simple cases. Enhance to detect **multiple variables in one text node**:

```rust
fn extract_text_item_template(
    &self,
    content: &str,
    array_items: &[serde_json::Value]
) -> Option<crate::vdom::ItemTemplate> {
    use serde_json::Value;

    if let Some(first_item) = array_items.get(0) {
        if let Value::Object(obj) = first_item {
            // Try single-variable template first (existing logic)
            for (key, value) in obj {
                let value_str = match value {
                    Value::String(s) => s.clone(),
                    Value::Number(n) => n.to_string(),
                    Value::Bool(b) => b.to_string(),
                    _ => continue,
                };

                if content.contains(&value_str) {
                    let template = content.replace(&value_str, "{0}");
                    let binding = format!("item.{}", key);

                    // Check if there are other variables too
                    // (Multi-variable detection - Phase 3 logic adapted for items)
                    return Some(crate::vdom::ItemTemplate::Text {
                        template_patch: crate::vdom::TemplatePatch {
                            template,
                            bindings: vec![binding],
                            slots: vec![content.find(&value_str)?],
                            conditional_templates: None,
                            conditional_binding_index: None,
                        }
                    });
                }
            }

            // NEW: Try conditional template (e.g., "✓" vs "○" based on done)
            if let Some(conditional) = self.extract_conditional_text_template(content, obj) {
                return Some(crate::vdom::ItemTemplate::Text {
                    template_patch: conditional
                });
            }
        }
    }

    None
}

/// Extract conditional text template
/// Example: "✓" when done=true, "○" when done=false
fn extract_conditional_text_template(
    &self,
    content: &str,
    item: &serde_json::Map<String, serde_json::Value>
) -> Option<crate::vdom::TemplatePatch> {
    use serde_json::Value;
    use std::collections::HashMap;

    // Look for boolean properties that might control this text
    for (prop_name, prop_value) in item {
        if let Value::Bool(bool_val) = prop_value {
            // Simple heuristic: if content is short (1-2 chars), might be conditional
            if content.len() <= 2 {
                let mut conditional_map = HashMap::new();
                // We'd need to check other items to know false value
                // For now, this is a placeholder
                conditional_map.insert(bool_val.to_string(), content.to_string());

                // TODO: Check other array items to find alternate value
                // This requires passing all items, not just first

                return Some(crate::vdom::TemplatePatch {
                    template: "{0}".to_string(),
                    bindings: vec![format!("item.{}", prop_name)],
                    slots: vec![0],
                    conditional_templates: Some(conditional_map),
                    conditional_binding_index: Some(0),
                });
            }
        }
    }

    None
}
```

---

## Testing Strategy

### Test Case 1: Props with Conditionals

```rust
#[test]
fn test_loop_template_with_conditional_props() {
    let todos = vec![
        json!({ "id": 1, "text": "Buy milk", "done": false }),
        json!({ "id": 2, "text": "Walk dog", "done": true }),
    ];

    // Render: <li className={done ? 'done' : 'pending'}>{text}</li>
    let template = extract_loop_template(...);

    assert!(template.item_template.props_templates.is_some());
    let props = template.item_template.props_templates.unwrap();
    assert!(props.contains_key("className"));

    let class_template = &props["className"];
    assert!(class_template.conditional_templates.is_some());
}
```

### Test Case 2: Key Detection

```rust
#[test]
fn test_key_binding_detection() {
    let items = vec![
        json!({ "id": 1, "name": "Alice" }),
        json!({ "id": 2, "name": "Bob" }),
    ];

    // Element has key="1"
    let element = VElement { key: Some("1".to_string()), ... };

    let key_binding = detect_key_binding(&element, &items);
    assert_eq!(key_binding, Some("item.id".to_string()));
}
```

---

## Success Criteria

✅ Extract prop templates for dynamic attributes
✅ Detect conditional props (className based on boolean)
✅ Infer key bindings from array item properties
✅ Handle multiple children with mixed text/elements
✅ Support nested conditional text within list items

---

## Next Steps After 4B

**Phase 4C** will add:
- Incremental diffing (don't replace entire list)
- Index variable support (`{index}` bindings)
- Separator support (for inline lists)
- Nested array handling (lists within lists)
