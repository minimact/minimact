use crate::vdom::{VNode, VElement, Patch};
use crate::error::Result;
use crate::validation::ValidationConfig;
use std::collections::HashMap;

/// Reconcile two virtual DOM trees and produce a list of patches
/// Now returns Result to handle validation errors
pub fn reconcile(old: &VNode, new: &VNode) -> Result<Vec<Patch>> {
    let start = std::time::Instant::now();
    crate::log_debug!("Starting reconciliation");

    // Validate both trees first
    let config = ValidationConfig::default();
    if let Err(e) = old.validate(&config) {
        crate::metrics::METRICS.record_validation_failure();
        return Err(e);
    }
    if let Err(e) = new.validate(&config) {
        crate::metrics::METRICS.record_validation_failure();
        return Err(e);
    }

    let mut patches = Vec::new();
    let result = reconcile_node(old, new, &mut vec![], &mut patches);

    let duration = start.elapsed();
    match result {
        Ok(()) => {
            crate::log_info!("Reconciliation complete: {} patches generated", patches.len());
            crate::metrics::METRICS.record_reconcile(duration, patches.len(), false);
            Ok(patches)
        }
        Err(e) => {
            crate::metrics::METRICS.record_reconcile(duration, 0, true);
            Err(e)
        }
    }
}

/// Reconcile with custom validation config
pub fn reconcile_with_config(
    old: &VNode,
    new: &VNode,
    config: &ValidationConfig,
) -> Result<Vec<Patch>> {
    old.validate(config)?;
    new.validate(config)?;

    let mut patches = Vec::new();
    reconcile_node(old, new, &mut vec![], &mut patches)?;
    Ok(patches)
}

fn reconcile_node(old: &VNode, new: &VNode, path: &mut Vec<usize>, patches: &mut Vec<Patch>) -> Result<()> {
    match (old, new) {
        // Both are text nodes
        (VNode::Text(old_text), VNode::Text(new_text)) => {
            if old_text.content != new_text.content {
                patches.push(Patch::UpdateText {
                    path: path.clone(),
                    content: new_text.content.clone(),
                });
            }
        }

        // Both are elements with the same tag
        (VNode::Element(old_el), VNode::Element(new_el)) if old_el.tag == new_el.tag => {
            // Check if props changed
            if old_el.props != new_el.props {
                patches.push(Patch::UpdateProps {
                    path: path.clone(),
                    props: new_el.props.clone(),
                });
            }

            // Reconcile children
            reconcile_children(old_el, new_el, path, patches)?;
        }

        // Different node types or different tags - replace entire subtree
        _ => {
            patches.push(Patch::Replace {
                path: path.clone(),
                node: new.clone(),
            });
        }
    }
    Ok(())
}

fn reconcile_children(
    old_el: &VElement,
    new_el: &VElement,
    path: &mut Vec<usize>,
    patches: &mut Vec<Patch>,
) -> Result<()> {
    let old_children = &old_el.children;
    let new_children = &new_el.children;

    // Check if we can use keyed reconciliation
    // Skip null children when building keyed maps
    let old_keyed: HashMap<&str, (usize, &VNode)> = old_children
        .iter()
        .enumerate()
        .filter_map(|(i, opt_node)| {
            opt_node.as_ref().and_then(|node| node.key().map(|k| (k, (i, node))))
        })
        .collect();

    let new_keyed: HashMap<&str, (usize, &VNode)> = new_children
        .iter()
        .enumerate()
        .filter_map(|(i, opt_node)| {
            opt_node.as_ref().and_then(|node| node.key().map(|k| (k, (i, node))))
        })
        .collect();

    // If we have keys, use keyed reconciliation
    if !old_keyed.is_empty() || !new_keyed.is_empty() {
        reconcile_keyed_children(old_children, new_children, &old_keyed, &new_keyed, path, patches)?;
    } else {
        // Simple index-based reconciliation
        reconcile_indexed_children(old_children, new_children, path, patches)?;
    }
    Ok(())
}

fn reconcile_indexed_children(
    old_children: &[Option<VNode>],
    new_children: &[Option<VNode>],
    path: &mut Vec<usize>,
    patches: &mut Vec<Patch>,
) -> Result<()> {
    let old_len = old_children.len();
    let new_len = new_children.len();
    let min_len = old_len.min(new_len);

    // Reconcile common children (preserving VNode indices, including nulls)
    for i in 0..min_len {
        match (&old_children[i], &new_children[i]) {
            (Some(old_node), Some(new_node)) => {
                // Both exist - reconcile
                path.push(i);
                reconcile_node(old_node, new_node, path, patches)?;
                path.pop();
            }
            (None, Some(new_node)) => {
                // Old was null, new exists - create
                path.push(i);
                patches.push(Patch::Create {
                    path: path.clone(),
                    node: new_node.clone(),
                });
                path.pop();
            }
            (Some(_), None) => {
                // Old existed, new is null - remove
                path.push(i);
                patches.push(Patch::Remove {
                    path: path.clone(),
                });
                path.pop();
            }
            (None, None) => {
                // Both null - no change needed
            }
        }
    }

    // Handle additions (new children beyond old length)
    for i in min_len..new_len {
        if let Some(new_node) = &new_children[i] {
            path.push(i);
            patches.push(Patch::Create {
                path: path.clone(),
                node: new_node.clone(),
            });
            path.pop();
        }
    }

    // Handle removals (old children beyond new length, in reverse order)
    for i in (min_len..old_len).rev() {
        if old_children[i].is_some() {
            path.push(i);
            patches.push(Patch::Remove {
                path: path.clone(),
            });
            path.pop();
        }
    }
    Ok(())
}

fn reconcile_keyed_children(
    old_children: &[Option<VNode>],
    new_children: &[Option<VNode>],
    old_keyed: &HashMap<&str, (usize, &VNode)>,
    new_keyed: &HashMap<&str, (usize, &VNode)>,
    path: &mut Vec<usize>,
    patches: &mut Vec<Patch>,
) -> Result<()> {
    let mut old_idx = 0;
    let mut new_idx = 0;

    // Build a map of new keys for quick lookup
    let new_keys_set: std::collections::HashSet<&str> = new_keyed.keys().copied().collect();

    // Process all new children (preserving VNode indices including nulls)
    while new_idx < new_children.len() {
        if let Some(new_child) = &new_children[new_idx] {
            if let Some(new_key) = new_child.key() {
                // This child has a key
                if let Some(&(_old_pos, old_node)) = old_keyed.get(new_key) {
                    // Key exists in old children - reconcile
                    path.push(new_idx);
                    reconcile_node(old_node, new_child, path, patches)?;
                    path.pop();
                } else {
                    // New key - create node
                    path.push(new_idx);
                    patches.push(Patch::Create {
                        path: path.clone(),
                        node: new_child.clone(),
                    });
                    path.pop();
                }
            } else {
                // No key - try to match with old non-keyed children
                while old_idx < old_children.len() && old_children[old_idx].is_none() {
                    old_idx += 1; // Skip nulls in old children
                }

                if old_idx < old_children.len() {
                    if let Some(old_child) = &old_children[old_idx] {
                        if old_child.key().is_none() {
                            path.push(new_idx);
                            reconcile_node(old_child, new_child, path, patches)?;
                            path.pop();
                            old_idx += 1;
                        } else {
                            // Create new child
                            path.push(new_idx);
                            patches.push(Patch::Create {
                                path: path.clone(),
                                node: new_child.clone(),
                            });
                            path.pop();
                        }
                    }
                } else {
                    // Create new child
                    path.push(new_idx);
                    patches.push(Patch::Create {
                        path: path.clone(),
                        node: new_child.clone(),
                    });
                    path.pop();
                }
            }
        }
        // If new_child is None, skip it (null in new VNode)

        new_idx += 1;
    }

    // Remove old children that don't exist in new children
    for (old_key, &(old_pos, _)) in old_keyed.iter() {
        if !new_keys_set.contains(old_key) {
            path.push(old_pos);
            patches.push(Patch::Remove {
                path: path.clone(),
            });
            path.pop();
        }
    }

    // Check if we need to reorder (only for non-null keyed children)
    let new_key_order: Vec<String> = new_children
        .iter()
        .filter_map(|opt_n| opt_n.as_ref().and_then(|n| n.key().map(String::from)))
        .collect();

    if !new_key_order.is_empty() {
        patches.push(Patch::ReorderChildren {
            path: path.clone(),
            order: new_key_order,
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_text_update() {
        let old = VNode::text("Hello");
        let new = VNode::text("World");
        let patches = reconcile(&old, &new).unwrap();

        assert_eq!(patches.len(), 1);
        match &patches[0] {
            Patch::UpdateText { path, content } => {
                assert_eq!(path, &Vec::<usize>::new());
                assert_eq!(content, "World");
            }
            _ => panic!("Expected UpdateText patch"),
        }
    }

    #[test]
    fn test_replace_node() {
        let old = VNode::text("Hello");
        let new = VNode::element("div", HashMap::new(), vec![]);
        let patches = reconcile(&old, &new).unwrap();

        assert_eq!(patches.len(), 1);
        match &patches[0] {
            Patch::Replace { path, .. } => {
                assert_eq!(path, &Vec::<usize>::new());
            }
            _ => panic!("Expected Replace patch"),
        }
    }

    #[test]
    fn test_props_update() {
        let mut old_props = HashMap::new();
        old_props.insert("class".to_string(), "old".to_string());

        let mut new_props = HashMap::new();
        new_props.insert("class".to_string(), "new".to_string());

        let old = VNode::element("div", old_props, vec![]);
        let new = VNode::element("div", new_props, vec![]);
        let patches = reconcile(&old, &new).unwrap();

        assert_eq!(patches.len(), 1);
        match &patches[0] {
            Patch::UpdateProps { path, props } => {
                assert_eq!(path, &Vec::<usize>::new());
                assert_eq!(props.get("class"), Some(&"new".to_string()));
            }
            _ => panic!("Expected UpdateProps patch"),
        }
    }

    #[test]
    fn test_children_additions() {
        let old = VNode::element("div", HashMap::new(), vec![
            VNode::text("A"),
        ]);
        let new = VNode::element("div", HashMap::new(), vec![
            VNode::text("A"),
            VNode::text("B"),
        ]);
        let patches = reconcile(&old, &new).unwrap();

        // Should have a Create patch for the new child
        assert!(patches.iter().any(|p| matches!(p, Patch::Create { .. })));
    }

    #[test]
    fn test_children_removals() {
        let old = VNode::element("div", HashMap::new(), vec![
            VNode::text("A"),
            VNode::text("B"),
        ]);
        let new = VNode::element("div", HashMap::new(), vec![
            VNode::text("A"),
        ]);
        let patches = reconcile(&old, &new).unwrap();

        // Should have a Remove patch
        assert!(patches.iter().any(|p| matches!(p, Patch::Remove { .. })));
    }
}
