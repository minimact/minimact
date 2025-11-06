use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::path::HexPath;

/// Represents a Virtual DOM node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum VNode {
    Element(VElement),
    Text(VText),
    Null(VNull),
}

/// Represents a Virtual DOM element
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VElement {
    pub tag: String,
    pub props: HashMap<String, String>,
    /// Children can be null (for conditional rendering with false conditions)
    /// This preserves VNode indices so paths match the original JSX structure
    /// Example: [<h1/>, null, <p/>] where null represents {false && <div>}
    pub children: Vec<Option<VNode>>,
    /// Optional key for reconciliation optimization
    pub key: Option<String>,
    /// Hex-based path from transpilation (e.g., "10000000.20000000")
    pub path: HexPath,
}

/// Represents a text node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VText {
    pub content: String,
    /// Hex-based path from transpilation (e.g., "10000000.20000000.30000000")
    pub path: HexPath,
}

/// Represents a null node (conditionally rendered element that evaluated to false)
/// Example: {isVisible && <Modal />} when isVisible is false
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VNull {
    /// Hex-based path from transpilation (e.g., "20000000")
    /// This is the path where the element WOULD be if the condition were true
    pub path: HexPath,
}

/// Binding with optional transform (Phase 6: Expression Templates)
/// Represents a state variable and how to transform it for display
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Binding {
    /// State variable name (e.g., "price", "count")
    pub state_key: String,
    /// Optional transform to apply before rendering
    /// Examples: "toFixed(2)", "* 100", "toUpperCase()", etc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transform: Option<String>,
}

/// Template patch data for parameterized updates
/// Enables 98% memory reduction by storing patterns instead of concrete values
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TemplatePatch {
    /// Template string with {0}, {1}, etc. placeholders
    /// For simple templates: "Count: {0}"
    /// For conditionals: see conditional_templates
    pub template: String,
    /// State variable names that fill the template (Phase 1-5: simple strings)
    /// Kept for backward compatibility
    pub bindings: Vec<String>,
    /// Phase 6: Rich bindings with transform support
    /// If present, overrides simple bindings field
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bindings_with_transforms: Option<Vec<Binding>>,
    /// Character positions where parameters are inserted
    pub slots: Vec<usize>,
    /// Optional: Conditional templates based on binding values
    /// Maps binding values to template strings
    /// Example: { "true": "Active", "false": "Inactive" }
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conditional_templates: Option<std::collections::HashMap<String, String>>,
    /// Optional: Index of the binding that determines which conditional template to use
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conditional_binding_index: Option<usize>,
}

/// Loop template for array rendering (.map patterns)
/// Phase 4: Stores ONE pattern that applies to ALL array items
/// Enables 100% coverage for lists with 97% memory reduction
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LoopTemplate {
    /// Array state binding (e.g., "todos", "items")
    pub array_binding: String,
    /// Template for each item in the array
    pub item_template: ItemTemplate,
    /// Optional: Index variable name (e.g., "index", "idx")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index_var: Option<String>,
    /// Optional: Separator between items (e.g., ", " for inline lists)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub separator: Option<String>,
}

/// Template for individual items in a loop
/// Represents the structure that gets repeated for each array item
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ItemTemplate {
    /// Simple text template (e.g., "{item.name}")
    Text {
        template_patch: TemplatePatch,
    },
    /// Element template (e.g., <li>{item.text}</li>)
    Element {
        tag: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        props_templates: Option<HashMap<String, TemplatePatch>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        children_templates: Option<Vec<ItemTemplate>>,
        /// Key binding for list reconciliation (e.g., "item.id")
        #[serde(skip_serializing_if = "Option::is_none")]
        key_binding: Option<String>,
    },
}

/// Structural template for conditional rendering (Phase 5)
/// Stores multiple VNode branches based on condition binding value
/// Enables 100% coverage for conditionals with O(1) memory
///
/// Example: {isLoggedIn ? <Welcome /> : <Login />}
/// Branches: { "true": <Welcome />, "false": <Login /> }
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StructuralTemplate {
    /// Binding that determines which branch to render (e.g., "isLoggedIn")
    pub condition_binding: String,
    /// Map from condition value to VNode template
    /// For boolean: { "true": VNode, "false": VNode }
    /// For enum/string: { "loading": VNode, "success": VNode, "error": VNode }
    pub branches: HashMap<String, VNode>,
    /// Optional: Default branch if condition value not in map
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_branch: Option<Box<VNode>>,
}

/// Represents a change operation for the DOM
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Patch {
    /// Create a new node at the given path
    Create {
        path: HexPath,
        node: VNode,
    },
    /// Remove a node at the given path
    Remove {
        path: HexPath,
    },
    /// Replace a node at the given path
    Replace {
        path: HexPath,
        node: VNode,
    },
    /// Update text content
    UpdateText {
        path: HexPath,
        content: String,
    },
    /// Update element properties
    UpdateProps {
        path: HexPath,
        props: HashMap<String, String>,
    },
    /// Reorder children (using keys)
    ReorderChildren {
        path: HexPath,
        order: Vec<String>, // keys in new order
    },
    /// Update text using template (runtime prediction)
    /// Enables 100% coverage with minimal memory (2KB vs 100KB per component)
    UpdateTextTemplate {
        path: HexPath,
        #[serde(rename = "templatePatch")]
        template_patch: TemplatePatch,
    },
    /// Update props using template (runtime prediction)
    UpdatePropsTemplate {
        path: HexPath,
        #[serde(rename = "propName")]
        prop_name: String,
        #[serde(rename = "templatePatch")]
        template_patch: TemplatePatch,
    },
    /// Update list using loop template (Phase 4)
    /// Enables 100% coverage for .map() patterns with 97% memory reduction
    UpdateListTemplate {
        path: HexPath,
        #[serde(rename = "loopTemplate")]
        loop_template: LoopTemplate,
    },
    /// Reorder list using template (Phase 8)
    /// Enables reordering patterns like sort/reverse/filter with O(1) memory
    ReorderTemplate {
        path: HexPath,
        #[serde(rename = "reorderTemplate")]
        reorder_template: crate::reorder_detection::ReorderTemplate,
    },
    /// Replace node using structural template (Phase 5)
    /// Enables 100% coverage for conditional rendering with multiple branches
    ReplaceConditional {
        path: HexPath,
        #[serde(rename = "structuralTemplate")]
        structural_template: StructuralTemplate,
    },
    /// Update attribute with static value (extracted from className="static", style={...}, etc.)
    /// Enables hot reload for static attributes without re-compilation
    UpdateAttributeStatic {
        path: HexPath,
        #[serde(rename = "attrName")]
        attr_name: String,
        value: String,
    },
    /// Update attribute using template (extracted from className={var}, className={`text-${size}`}, etc.)
    /// Enables predictive rendering for dynamic attributes with 100% coverage
    UpdateAttributeDynamic {
        path: HexPath,
        #[serde(rename = "attrName")]
        attr_name: String,
        #[serde(rename = "templatePatch")]
        template_patch: TemplatePatch,
    },
}

impl VNode {
    /// Create a new element node
    pub fn element(tag: impl Into<String>, props: HashMap<String, String>, children: Vec<Option<VNode>>) -> Self {
        VNode::Element(VElement {
            tag: tag.into(),
            props,
            children,
            key: None,
        })
    }

    /// Create a new element node with a key
    pub fn keyed_element(
        tag: impl Into<String>,
        key: impl Into<String>,
        props: HashMap<String, String>,
        children: Vec<Option<VNode>>,
    ) -> Self {
        VNode::Element(VElement {
            tag: tag.into(),
            props,
            children,
            key: Some(key.into()),
        })
    }

    /// Create a new text node
    pub fn text(content: impl Into<String>) -> Self {
        VNode::Text(VText {
            content: content.into(),
        })
    }

    /// Get the key of this node if it's an element
    pub fn key(&self) -> Option<&str> {
        match self {
            VNode::Element(el) => el.key.as_deref(),
            VNode::Text(_) => None,
        }
    }

    /// Check if this node is a text node
    pub fn is_text(&self) -> bool {
        matches!(self, VNode::Text(_))
    }

    /// Check if this node is an element node
    pub fn is_element(&self) -> bool {
        matches!(self, VNode::Element(_))
    }

    /// Get the node type as a string (for error messages)
    pub fn node_type(&self) -> &'static str {
        match self {
            VNode::Element(_) => "Element",
            VNode::Text(_) => "Text",
        }
    }

    /// Get the children of this node (empty vec for text nodes)
    pub fn children(&self) -> &[Option<VNode>] {
        match self {
            VNode::Element(el) => &el.children,
            VNode::Text(_) => &[],
        }
    }

    /// Get the number of children (including nulls)
    pub fn children_count(&self) -> usize {
        match self {
            VNode::Element(el) => el.children.len(),
            VNode::Text(_) => 0,
        }
    }

    /// Get the number of non-null children (for DOM node count)
    pub fn non_null_children_count(&self) -> usize {
        match self {
            VNode::Element(el) => el.children.iter().filter(|c| c.is_some()).count(),
            VNode::Text(_) => 0,
        }
    }
}

/// StateX projection from useStateX hook
/// Represents declarative state-to-DOM mapping ("CSS for State Logic")
/// Generated by Babel plugin from useStateX() calls
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateXProjection {
    /// State key that this projection applies to (e.g., "stateX_0")
    pub state_key: String,
    /// CSS selector for target element (e.g., ".price-display")
    pub selector: String,
    /// C# transform expression (if inline transform)
    pub transform: Option<String>,
    /// Transform ID from registry (alternative to inline transform)
    pub transform_id: Option<String>,
    /// How to apply the transformed value
    /// Options: "textContent", "innerHTML", "attribute", "class", "style"
    pub apply_as: String,
    /// Property name for attribute/class/style application
    pub property: Option<String>,
    /// C# conditional expression for applyIf
    pub apply_if: Option<String>,
    /// Template hint ID for parameterized patch matching
    pub template: Option<String>,
    /// Sync strategy: "immediate", "debounced", "manual"
    pub sync: String,
}

impl StateXProjection {
    /// Check if this projection should be applied based on context
    /// Returns true if no condition, or if condition can be evaluated
    pub fn should_apply(&self, _context: &serde_json::Value) -> bool {
        // For now, always apply if no condition
        // Future: Evaluate apply_if expression
        self.apply_if.is_none()
    }

    /// Get the transform to apply (either inline or from registry)
    pub fn get_transform(&self) -> Option<&str> {
        self.transform.as_deref().or(self.transform_id.as_deref())
    }
}

/// Template metadata extracted by Babel plugin
/// Describes a single template (text, attribute, etc.) for hot reload and prediction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateInfo {
    /// Template string with {0}, {1} placeholders
    pub template: String,
    /// State bindings (e.g., ["count", "isActive"])
    pub bindings: Vec<String>,
    /// Slot positions in template string
    pub slots: Vec<usize>,
    /// Path to the node in the VNode tree (hex-based)
    pub path: HexPath,
    /// Template type: "static", "dynamic", "conditional", "attribute-static", "attribute-dynamic", etc.
    #[serde(rename = "type")]
    pub template_type: String,
    /// For attribute templates: the attribute name (e.g., "className", "style")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attribute: Option<String>,
    /// For conditional templates: map of condition values to template strings
    #[serde(rename = "conditionalTemplates", skip_serializing_if = "Option::is_none")]
    pub conditional_templates: Option<HashMap<String, String>>,
    /// For transform templates: transform metadata
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transform: Option<TransformInfo>,
    /// For nullable templates: whether the binding can be null/undefined
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nullable: Option<bool>,
}

/// Transform metadata for templates with method calls (e.g., toFixed(2))
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformInfo {
    /// Transform method name (e.g., "toFixed")
    pub method: String,
    /// Transform arguments (e.g., [2] for toFixed(2))
    #[serde(default)]
    pub args: Vec<serde_json::Value>,
}

impl TemplateInfo {
    /// Check if this is an attribute template
    pub fn is_attribute_template(&self) -> bool {
        self.template_type == "attribute-static" || self.template_type == "attribute-dynamic"
    }

    /// Check if this is a text template
    pub fn is_text_template(&self) -> bool {
        matches!(self.template_type.as_str(), "static" | "dynamic" | "conditional" | "transform" | "nullable")
    }

    /// Get the attribute name if this is an attribute template
    /// Returns None if this is not an attribute template
    pub fn get_attribute_name(&self) -> Option<&str> {
        self.attribute.as_deref()
    }

    /// Create a TemplatePatch from this TemplateInfo
    pub fn to_template_patch(&self) -> TemplatePatch {
        TemplatePatch {
            template: self.template.clone(),
            bindings: self.bindings.clone(),
            bindings_with_transforms: None, // TODO: Map transform to Binding struct
            slots: self.slots.clone(),
            conditional_templates: self.conditional_templates.clone(),
            conditional_binding_index: None, // TODO: Detect from bindings
        }
    }
}

/// Component metadata from Babel plugin
/// Contains compile-time generated loop templates for predictive rendering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentMetadata {
    /// Component identifier (e.g., "TodoList_abc123")
    pub component_id: String,
    /// Component name (e.g., "TodoList")
    pub component_name: String,
    /// Loop templates keyed by state variable name
    /// Maps state key (e.g., "todos") to Babel-generated loop template JSON
    pub loop_templates: HashMap<String, String>,
    /// StateX projections (from useStateX) for declarative state-to-DOM mappings
    /// Enables "CSS for State Logic" with 100% template coverage
    #[serde(default)]
    pub state_x_projections: Vec<StateXProjection>,
    /// All templates (text, attribute, etc.) keyed by path
    /// Maps path string (e.g., "[0].h1[0].text[0]", "[0].button[0].@style") to template info
    #[serde(default)]
    pub templates: HashMap<String, TemplateInfo>,
}

impl ComponentMetadata {
    /// Create new component metadata
    pub fn new(component_id: impl Into<String>, component_name: impl Into<String>) -> Self {
        Self {
            component_id: component_id.into(),
            component_name: component_name.into(),
            loop_templates: HashMap::new(),
            state_x_projections: Vec::new(),
            templates: HashMap::new(),
        }
    }

    /// Add a loop template for a state key
    pub fn add_loop_template(&mut self, state_key: impl Into<String>, template_json: impl Into<String>) {
        self.loop_templates.insert(state_key.into(), template_json.into());
    }

    /// Get loop template for a state key
    pub fn get_loop_template(&self, state_key: &str) -> Option<&String> {
        self.loop_templates.get(state_key)
    }

    /// Parse loop template JSON into LoopTemplate struct
    pub fn parse_loop_template(&self, state_key: &str) -> Option<LoopTemplate> {
        self.get_loop_template(state_key)
            .and_then(|json| serde_json::from_str(json).ok())
    }

    /// Add a StateX projection
    pub fn add_state_x_projection(&mut self, projection: StateXProjection) {
        self.state_x_projections.push(projection);
    }

    /// Get all StateX projections for a specific state key
    pub fn get_state_x_projections(&self, state_key: &str) -> Vec<&StateXProjection> {
        self.state_x_projections
            .iter()
            .filter(|p| p.state_key == state_key)
            .collect()
    }

    /// Check if there are any StateX projections for a state key
    pub fn has_state_x_projections(&self, state_key: &str) -> bool {
        self.state_x_projections.iter().any(|p| p.state_key == state_key)
    }

    /// Find all templates that reference a specific state key
    pub fn get_templates_for_state(&self, state_key: &str) -> Vec<(&String, &TemplateInfo)> {
        self.templates
            .iter()
            .filter(|(_, template)| template.bindings.contains(&state_key.to_string()))
            .collect()
    }

    /// Add a template
    pub fn add_template(&mut self, path_key: impl Into<String>, template: TemplateInfo) {
        self.templates.insert(path_key.into(), template);
    }

    /// Get a template by path key
    pub fn get_template(&self, path_key: &str) -> Option<&TemplateInfo> {
        self.templates.get(path_key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_element() {
        let mut props = HashMap::new();
        props.insert("class".to_string(), "container".to_string());

        let node = VNode::element("div", props, vec![
            Some(VNode::text("Hello, world!"))
        ]);

        match node {
            VNode::Element(el) => {
                assert_eq!(el.tag, "div");
                assert_eq!(el.props.get("class"), Some(&"container".to_string()));
                assert_eq!(el.children.len(), 1);
            }
            _ => panic!("Expected element node"),
        }
    }

    #[test]
    fn test_serialization() {
        let node = VNode::text("Hello");
        let json = serde_json::to_string(&node).unwrap();
        let deserialized: VNode = serde_json::from_str(&json).unwrap();
        assert_eq!(node, deserialized);
    }
}
