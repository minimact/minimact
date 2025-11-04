use crate::vdom::{VNode, Patch};
use crate::error::{MinimactError, Result};

/// Configuration for patch validation
#[derive(Debug, Clone)]
pub struct PatchValidatorConfig {
    /// Maximum depth of path indices
    pub max_path_depth: usize,
    /// Maximum path index value
    pub max_path_index: usize,
    /// Validate that patches can be applied to the tree
    pub validate_applicability: bool,
}

impl Default for PatchValidatorConfig {
    fn default() -> Self {
        Self {
            max_path_depth: 100,
            max_path_index: 10_000,
            validate_applicability: true,
        }
    }
}

/// Validates a single patch against a VNode tree
pub fn validate_patch(patch: &Patch, tree: &VNode, config: &PatchValidatorConfig) -> Result<()> {
    match patch {
        Patch::UpdateText { path, content } => {
            validate_path(path, config)?;
            validate_text_content(content)?;

            if config.validate_applicability {
                let node = get_node_at_path(tree, path)?;
                if !node.is_text() {
                    return Err(MinimactError::PatchTypeMismatch {
                        expected: "Text",
                        found: node.node_type(),
                    });
                }
            }
        }

        Patch::UpdateProps { path, props } => {
            validate_path(path, config)?;
            validate_props(props)?;

            if config.validate_applicability {
                let node = get_node_at_path(tree, path)?;
                if !node.is_element() {
                    return Err(MinimactError::PatchTypeMismatch {
                        expected: "Element",
                        found: node.node_type(),
                    });
                }
            }
        }

        Patch::Replace { path, node } => {
            validate_path(path, config)?;

            // Validate the replacement node itself
            let validation_config = crate::validation::ValidationConfig::default();
            node.validate(&validation_config)?;

            if config.validate_applicability {
                // Just verify the path exists
                get_node_at_path(tree, path)?;
            }
        }

        Patch::Create { path, node } => {
            validate_path(path, config)?;

            // Validate the new node
            let validation_config = crate::validation::ValidationConfig::default();
            node.validate(&validation_config)?;

            if config.validate_applicability {
                // Verify parent exists and path is valid for insertion
                if path.is_empty() {
                    return Err(MinimactError::InvalidPatchPath { path: path.clone() });
                }

                let parent_path: Vec<usize> = path[..path.len() - 1].to_vec();
                let child_index = path[path.len() - 1];

                let parent = get_node_at_path(tree, &parent_path)?;
                if !parent.is_element() {
                    return Err(MinimactError::PatchTypeMismatch {
                        expected: "Element (to have children)",
                        found: parent.node_type(),
                    });
                }

                // Child index should be <= current children count (allows appending)
                if child_index > parent.children_count() {
                    return Err(MinimactError::InvalidPatchPath { path: path.clone() });
                }
            }
        }

        Patch::Remove { path } => {
            validate_path(path, config)?;

            if config.validate_applicability {
                // Verify the node exists
                get_node_at_path(tree, path)?;
            }
        }

        Patch::ReorderChildren { path, order } => {
            validate_path(path, config)?;

            if config.validate_applicability {
                let node = get_node_at_path(tree, path)?;
                if !node.is_element() {
                    return Err(MinimactError::PatchTypeMismatch {
                        expected: "Element (to have children)",
                        found: node.node_type(),
                    });
                }

                // Verify all keys in order exist in children
                let existing_keys: std::collections::HashSet<String> = node
                    .children()
                    .iter()
                    .filter_map(|c| c.key().map(String::from))
                    .collect();

                for key in order {
                    if !existing_keys.contains(key) {
                        return Err(MinimactError::KeyNotFound(key.clone()));
                    }
                }
            }
        }

        // Template patches (runtime prediction)
        Patch::UpdateTextTemplate { path, template_patch } => {
            validate_path(path, config)?;

            // Validate template string is not empty
            if template_patch.template.is_empty() {
                return Err(MinimactError::InvalidVNode(
                    "Template string cannot be empty".to_string()
                ));
            }

            if config.validate_applicability {
                let node = get_node_at_path(tree, path)?;
                if !node.is_text() {
                    return Err(MinimactError::PatchTypeMismatch {
                        expected: "Text",
                        found: node.node_type(),
                    });
                }
            }
        }

        Patch::UpdatePropsTemplate { path, prop_name: _, template_patch } => {
            validate_path(path, config)?;

            // Validate template string is not empty
            if template_patch.template.is_empty() {
                return Err(MinimactError::InvalidVNode(
                    "Template string cannot be empty".to_string()
                ));
            }

            if config.validate_applicability {
                let node = get_node_at_path(tree, path)?;
                if !node.is_element() {
                    return Err(MinimactError::PatchTypeMismatch {
                        expected: "Element",
                        found: node.node_type(),
                    });
                }
            }
        }

        Patch::UpdateListTemplate { path, loop_template } => {
            validate_path(path, config)?;

            // Validate array binding is not empty
            if loop_template.array_binding.is_empty() {
                return Err(MinimactError::InvalidVNode(
                    "Array binding cannot be empty".to_string()
                ));
            }

            // For Phase 4A, we just validate the path exists
            // More thorough validation can be added in future phases
            if config.validate_applicability {
                let _node = get_node_at_path(tree, path)?;
                // List templates can apply to any node (will replace children)
            }
        }

        // Phase 8: Reorder template patch
        Patch::ReorderTemplate { path, reorder_template } => {
            validate_path(path, config)?;

            // Validate array binding is not empty
            if reorder_template.array_binding.is_empty() {
                return Err(MinimactError::InvalidVNode(
                    "Array binding cannot be empty".to_string()
                ));
            }

            if config.validate_applicability {
                let node = get_node_at_path(tree, path)?;
                if !node.is_element() {
                    return Err(MinimactError::PatchTypeMismatch {
                        expected: "Element (to have children)",
                        found: node.node_type(),
                    });
                }
            }
        }

        // Phase 5: Replace conditional patch (structural templates)
        Patch::ReplaceConditional { path, structural_template } => {
            validate_path(path, config)?;

            // Validate condition binding is not empty
            if structural_template.condition_binding.is_empty() {
                return Err(MinimactError::InvalidVNode(
                    "Condition binding cannot be empty".to_string()
                ));
            }

            // Validate at least one branch exists
            if structural_template.branches.is_empty() {
                return Err(MinimactError::InvalidVNode(
                    "Structural template must have at least one branch".to_string()
                ));
            }

            // TODO: Validate all branch VNodes recursively
            // For now, just check they exist

            if config.validate_applicability {
                // Structural templates can apply to any node (they replace the entire node)
                get_node_at_path(tree, path)?;
            }
        }

        // Attribute template patches (hot reload + predictive rendering)
        Patch::UpdateAttributeStatic { path, attr_name, value: _ } => {
            validate_path(path, config)?;

            // Validate attribute name is not empty
            if attr_name.is_empty() {
                return Err(MinimactError::InvalidVNode(
                    "Attribute name cannot be empty".to_string()
                ));
            }

            // Value can be empty (e.g., className="")
            if config.validate_applicability {
                let node = get_node_at_path(tree, path)?;
                if !node.is_element() {
                    return Err(MinimactError::PatchTypeMismatch {
                        expected: "Element",
                        found: node.node_type(),
                    });
                }
            }
        }

        Patch::UpdateAttributeDynamic { path, attr_name, template_patch } => {
            validate_path(path, config)?;

            // Validate attribute name is not empty
            if attr_name.is_empty() {
                return Err(MinimactError::InvalidVNode(
                    "Attribute name cannot be empty".to_string()
                ));
            }

            // Validate template string is not empty
            if template_patch.template.is_empty() {
                return Err(MinimactError::InvalidVNode(
                    "Template string cannot be empty".to_string()
                ));
            }

            if config.validate_applicability {
                let node = get_node_at_path(tree, path)?;
                if !node.is_element() {
                    return Err(MinimactError::PatchTypeMismatch {
                        expected: "Element",
                        found: node.node_type(),
                    });
                }
            }
        }
    }

    Ok(())
}

/// Validates a list of patches
pub fn validate_patches(patches: &[Patch], tree: &VNode, config: &PatchValidatorConfig) -> Result<()> {
    // For now, validate each patch independently against the original tree
    // A more sophisticated approach would simulate applying patches and validate against the evolving tree
    for patch in patches {
        validate_patch(patch, tree, config)?;
    }
    Ok(())
}

/// Validates a patch path
fn validate_path(path: &[usize], config: &PatchValidatorConfig) -> Result<()> {
    if path.len() > config.max_path_depth {
        return Err(MinimactError::InvalidPatchPath { path: path.to_vec() });
    }

    for &index in path {
        if index > config.max_path_index {
            return Err(MinimactError::InvalidPatchPath { path: path.to_vec() });
        }
    }

    Ok(())
}

/// Validates text content
fn validate_text_content(content: &str) -> Result<()> {
    let config = crate::validation::ValidationConfig::default();
    if content.len() > config.max_text_length {
        return Err(MinimactError::TextTooLong {
            length: content.len(),
            max: config.max_text_length,
        });
    }
    Ok(())
}

/// Validates element properties
fn validate_props(props: &std::collections::HashMap<String, String>) -> Result<()> {
    let config = crate::validation::ValidationConfig::default();

    for (key, value) in props {
        if key.len() > config.max_prop_key_length {
            return Err(MinimactError::PropertyTooLong {
                name: key.clone(),
                length: key.len(),
                max: config.max_prop_key_length,
            });
        }

        if value.len() > config.max_prop_value_length {
            return Err(MinimactError::PropertyTooLong {
                name: key.clone(),
                length: value.len(),
                max: config.max_prop_value_length,
            });
        }
    }

    Ok(())
}

/// Gets a node at a specific path in the tree
fn get_node_at_path<'a>(tree: &'a VNode, path: &[usize]) -> Result<&'a VNode> {
    let mut current = tree;

    for (depth, &index) in path.iter().enumerate() {
        match current {
            VNode::Element(element) => {
                if index >= element.children.len() {
                    return Err(MinimactError::InvalidPatchPath {
                        path: path[..=depth].to_vec(),
                    });
                }
                current = &element.children[index];
            }
            VNode::Text(_) => {
                return Err(MinimactError::InvalidPatchPath {
                    path: path[..=depth].to_vec(),
                });
            }
        }
    }

    Ok(current)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_validate_update_text_patch() {
        let tree = VNode::element("div", HashMap::new(), vec![
            VNode::text("Hello"),
        ]);

        let patch = Patch::UpdateText {
            path: vec![0],
            content: "World".to_string(),
        };

        let config = PatchValidatorConfig::default();
        assert!(validate_patch(&patch, &tree, &config).is_ok());
    }

    #[test]
    fn test_validate_update_text_on_element_fails() {
        let tree = VNode::element("div", HashMap::new(), vec![
            VNode::element("span", HashMap::new(), vec![]),
        ]);

        let patch = Patch::UpdateText {
            path: vec![0],
            content: "World".to_string(),
        };

        let config = PatchValidatorConfig::default();
        let result = validate_patch(&patch, &tree, &config);
        assert!(result.is_err());

        if let Err(MinimactError::PatchTypeMismatch { expected, found }) = result {
            assert_eq!(expected, "Text");
            assert_eq!(found, "Element");
        } else {
            panic!("Expected PatchTypeMismatch error");
        }
    }

    #[test]
    fn test_validate_invalid_path() {
        let tree = VNode::element("div", HashMap::new(), vec![]);

        let patch = Patch::UpdateText {
            path: vec![99],
            content: "Test".to_string(),
        };

        let config = PatchValidatorConfig::default();
        assert!(validate_patch(&patch, &tree, &config).is_err());
    }

    #[test]
    fn test_validate_path_too_deep() {
        let tree = VNode::text("test");
        let deep_path: Vec<usize> = (0..150).collect();

        let patch = Patch::UpdateText {
            path: deep_path,
            content: "Test".to_string(),
        };

        let config = PatchValidatorConfig::default();
        assert!(validate_patch(&patch, &tree, &config).is_err());
    }

    #[test]
    fn test_validate_create_patch() {
        let tree = VNode::element("div", HashMap::new(), vec![
            VNode::text("Child 1"),
        ]);

        let patch = Patch::Create {
            path: vec![1],
            node: VNode::text("Child 2"),
        };

        let config = PatchValidatorConfig::default();
        assert!(validate_patch(&patch, &tree, &config).is_ok());
    }

    #[test]
    fn test_validate_create_at_invalid_index() {
        let tree = VNode::element("div", HashMap::new(), vec![
            VNode::text("Child 1"),
        ]);

        let patch = Patch::Create {
            path: vec![99],  // Way beyond current children
            node: VNode::text("Child 2"),
        };

        let config = PatchValidatorConfig::default();
        assert!(validate_patch(&patch, &tree, &config).is_err());
    }
}
