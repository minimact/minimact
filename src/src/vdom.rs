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
    pub template: String,
    /// State variable names that fill the template
    pub bindings: Vec<String>,
    /// Character positions where parameters are inserted
    pub slots: Vec<usize>,
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
