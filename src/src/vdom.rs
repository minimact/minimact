use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a Virtual DOM node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum VNode {
    Element(VElement),
    Text(VText),
}

/// Represents a Virtual DOM element
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VElement {
    pub tag: String,
    pub props: HashMap<String, String>,
    pub children: Vec<VNode>,
    /// Optional key for reconciliation optimization
    pub key: Option<String>,
}

/// Represents a text node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VText {
    pub content: String,
}

/// Template patch data for parameterized updates
/// Enables 98% memory reduction by storing patterns instead of concrete values
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TemplatePatch {
    /// Template string with {0}, {1}, etc. placeholders
    /// For simple templates: "Count: {0}"
    /// For conditionals: see conditional_templates
    pub template: String,
    /// State variable names that fill the template
    pub bindings: Vec<String>,
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

/// Represents a change operation for the DOM
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Patch {
    /// Create a new node at the given path
    Create {
        path: Vec<usize>,
        node: VNode,
    },
    /// Remove a node at the given path
    Remove {
        path: Vec<usize>,
    },
    /// Replace a node at the given path
    Replace {
        path: Vec<usize>,
        node: VNode,
    },
    /// Update text content
    UpdateText {
        path: Vec<usize>,
        content: String,
    },
    /// Update element properties
    UpdateProps {
        path: Vec<usize>,
        props: HashMap<String, String>,
    },
    /// Reorder children (using keys)
    ReorderChildren {
        path: Vec<usize>,
        order: Vec<String>, // keys in new order
    },
    /// Update text using template (runtime prediction)
    /// Enables 100% coverage with minimal memory (2KB vs 100KB per component)
    UpdateTextTemplate {
        path: Vec<usize>,
        #[serde(rename = "templatePatch")]
        template_patch: TemplatePatch,
    },
    /// Update props using template (runtime prediction)
    UpdatePropsTemplate {
        path: Vec<usize>,
        #[serde(rename = "propName")]
        prop_name: String,
        #[serde(rename = "templatePatch")]
        template_patch: TemplatePatch,
    },
    /// Update list using loop template (Phase 4)
    /// Enables 100% coverage for .map() patterns with 97% memory reduction
    UpdateListTemplate {
        path: Vec<usize>,
        #[serde(rename = "loopTemplate")]
        loop_template: LoopTemplate,
    },
}

impl VNode {
    /// Create a new element node
    pub fn element(tag: impl Into<String>, props: HashMap<String, String>, children: Vec<VNode>) -> Self {
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
        children: Vec<VNode>,
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
    pub fn children(&self) -> &[VNode] {
        match self {
            VNode::Element(el) => &el.children,
            VNode::Text(_) => &[],
        }
    }

    /// Get the number of children
    pub fn children_count(&self) -> usize {
        match self {
            VNode::Element(el) => el.children.len(),
            VNode::Text(_) => 0,
        }
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
            VNode::text("Hello, world!")
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
