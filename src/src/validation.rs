use crate::error::{MinimactError, Result};
use crate::vdom::{VNode, VElement, VText};

/// Configuration for input validation
#[derive(Debug, Clone)]
pub struct ValidationConfig {
    /// Maximum tree depth (default: 100)
    pub max_tree_depth: usize,

    /// Maximum total node count (default: 10,000)
    pub max_node_count: usize,

    /// Maximum children per node (default: 1,000)
    pub max_children_per_node: usize,

    /// Maximum property key length (default: 256)
    pub max_prop_key_length: usize,

    /// Maximum property value length (default: 4,096)
    pub max_prop_value_length: usize,

    /// Maximum text content length (default: 1MB)
    pub max_text_length: usize,

    /// Maximum JSON size for deserialization (default: 1MB)
    pub max_json_size: usize,
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            max_tree_depth: 100,
            max_node_count: 10_000,
            max_children_per_node: 1_000,
            max_prop_key_length: 256,
            max_prop_value_length: 4_096,
            max_text_length: 1024 * 1024, // 1MB
            max_json_size: 1024 * 1024,   // 1MB
        }
    }
}

impl VNode {
    /// Validate the entire tree against configuration
    pub fn validate(&self, config: &ValidationConfig) -> Result<()> {
        self.validate_depth(0, config)?;
        self.validate_node_count(config)?;
        self.validate_content_sizes(config)?;
        Ok(())
    }

    /// Validate tree depth doesn't exceed maximum
    fn validate_depth(&self, current_depth: usize, config: &ValidationConfig) -> Result<()> {
        if current_depth > config.max_tree_depth {
            return Err(MinimactError::TreeTooDeep {
                depth: current_depth,
                max: config.max_tree_depth,
            });
        }

        match self {
            VNode::Element(el) => {
                for opt_child in &el.children {
                    if let Some(child) = opt_child {
                        child.validate_depth(current_depth + 1, config)?;
                    }
                }
            }
            VNode::Text(_) => {}
            VNode::Null(_) => {}  // Null nodes have no depth
        }

        Ok(())
    }

    /// Validate total node count doesn't exceed maximum
    fn validate_node_count(&self, config: &ValidationConfig) -> Result<()> {
        let count = self.count_nodes();
        if count > config.max_node_count {
            return Err(MinimactError::TreeTooLarge {
                nodes: count,
                max: config.max_node_count,
            });
        }
        Ok(())
    }

    /// Count total nodes in tree (including nulls as placeholders)
    pub fn count_nodes(&self) -> usize {
        match self {
            VNode::Text(_) => 1,
            VNode::Element(el) => {
                1 + el.children.iter()
                    .map(|opt_c| opt_c.as_ref().map_or(0, |c| c.count_nodes()))
                    .sum::<usize>()
            }
            VNode::Null(_) => 1,  // Null nodes count as 1 (placeholder)
        }
    }

    /// Validate content sizes (text length, prop lengths, children count)
    fn validate_content_sizes(&self, config: &ValidationConfig) -> Result<()> {
        match self {
            VNode::Text(text) => {
                if text.content.len() > config.max_text_length {
                    return Err(MinimactError::TextTooLong {
                        length: text.content.len(),
                        max: config.max_text_length,
                    });
                }
            }
            VNode::Element(el) => {
                // Validate children count
                if el.children.len() > config.max_children_per_node {
                    return Err(MinimactError::TooManyChildren {
                        count: el.children.len(),
                        max: config.max_children_per_node,
                    });
                }

                // Validate property sizes
                for (key, value) in &el.props {
                    if key.len() > config.max_prop_key_length {
                        return Err(MinimactError::PropertyTooLong {
                            name: key.clone(),
                            length: key.len(),
                            max: config.max_prop_key_length,
                        });
                    }
                    if value.len() > config.max_prop_value_length {
                        return Err(MinimactError::PropertyTooLong {
                            name: format!("{} (value)", key),
                            length: value.len(),
                            max: config.max_prop_value_length,
                        });
                    }
                }

                // Recursively validate children (skip nulls)
                for opt_child in &el.children {
                    if let Some(child) = opt_child {
                        child.validate_content_sizes(config)?;
                    }
                }
            }
            VNode::Null(_) => {}  // Null nodes have no content to validate
        }

        Ok(())
    }

    /// Estimate size in bytes for memory tracking
    pub fn estimate_size(&self) -> usize {
        match self {
            VNode::Text(text) => {
                std::mem::size_of::<VText>() + text.content.capacity()
            }
            VNode::Element(el) => {
                let base = std::mem::size_of::<VElement>();
                let tag = el.tag.capacity();
                let key = el.key.as_ref().map(|k| k.capacity()).unwrap_or(0);
                let props: usize = el.props.iter()
                    .map(|(k, v)| k.capacity() + v.capacity())
                    .sum();
                let children: usize = el.children.iter()
                    .map(|opt_c| opt_c.as_ref().map_or(0, |c| c.estimate_size()))
                    .sum();

                base + tag + key + props + children
            }
            VNode::Null(_) => std::mem::size_of::<crate::vdom::VNull>(),  // Just the struct size
        }
    }
}

/// Deserialize VNode with validation
pub fn deserialize_vnode_safe(json: &str, config: &ValidationConfig) -> Result<VNode> {
    // Check JSON size first
    if json.len() > config.max_json_size {
        return Err(MinimactError::JsonTooLarge {
            size: json.len(),
            max: config.max_json_size,
        });
    }

    // Deserialize
    let node: VNode = serde_json::from_str(json)?;

    // Validate structure
    node.validate(config)?;

    Ok(node)
}

/// Serialize VNode with safety checks
pub fn serialize_vnode_safe(node: &VNode) -> Result<String> {
    // Estimate size before serializing
    let estimated_size = node.estimate_size();

    // Warn if very large (10MB+)
    if estimated_size > 10 * 1024 * 1024 {
        eprintln!("Warning: Serializing very large VNode: {} bytes", estimated_size);
    }

    // Serialize
    let json = serde_json::to_string(node)?;

    Ok(json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_depth_pass() {
        let node = VNode::Element(VElement {
            tag: "div".to_string(),
            props: Default::default(),
            children: vec![
                VNode::Element(VElement {
                    tag: "p".to_string(),
                    props: Default::default(),
                    children: vec![VNode::Text(VText {
                        content: "Hello".to_string(),
                    })],
                    key: None,
                })
            ],
            key: None,
        });

        let config = ValidationConfig::default();
        assert!(node.validate(&config).is_ok());
    }

    #[test]
    fn test_validate_depth_fail() {
        let mut config = ValidationConfig::default();
        config.max_tree_depth = 1;

        let node = VNode::Element(VElement {
            tag: "div".to_string(),
            props: Default::default(),
            children: vec![
                VNode::Element(VElement {
                    tag: "p".to_string(),
                    props: Default::default(),
                    children: vec![VNode::Text(VText {
                        content: "Too deep".to_string(),
                    })],
                    key: None,
                })
            ],
            key: None,
        });

        assert!(matches!(
            node.validate(&config),
            Err(MinimactError::TreeTooDeep { .. })
        ));
    }

    #[test]
    fn test_validate_text_length() {
        let mut config = ValidationConfig::default();
        config.max_text_length = 10;

        let node = VNode::Text(VText {
            content: "This text is way too long".to_string(),
        });

        assert!(matches!(
            node.validate(&config),
            Err(MinimactError::TextTooLong { .. })
        ));
    }

    #[test]
    fn test_count_nodes() {
        let node = VNode::Element(VElement {
            tag: "div".to_string(),
            props: Default::default(),
            children: vec![
                VNode::Text(VText { content: "1".to_string() }),
                VNode::Element(VElement {
                    tag: "p".to_string(),
                    props: Default::default(),
                    children: vec![VNode::Text(VText { content: "2".to_string() })],
                    key: None,
                }),
            ],
            key: None,
        });

        // 1 (div) + 1 (text) + 1 (p) + 1 (text) = 4
        assert_eq!(node.count_nodes(), 4);
    }

    #[test]
    fn test_validate_children_count() {
        let mut config = ValidationConfig::default();
        config.max_children_per_node = 2;

        let node = VNode::Element(VElement {
            tag: "div".to_string(),
            props: Default::default(),
            children: vec![
                VNode::Text(VText { content: "1".to_string() }),
                VNode::Text(VText { content: "2".to_string() }),
                VNode::Text(VText { content: "3".to_string() }),
            ],
            key: None,
        });

        assert!(matches!(
            node.validate(&config),
            Err(MinimactError::TooManyChildren { .. })
        ));
    }
}
