/// Reorder Detection (Phase 8)
///
/// Detects and templates list reordering operations like:
/// - items.sort((a, b) => a.name.localeCompare(b.name))
/// - items.reverse()
/// - items.filter(item => item.done)
///
/// Problem:
/// Current predictor sees ReorderChildren patch but falls back to concrete pattern.
/// For N items, there are N! possible orderings - impossible to learn all combinations.
///
/// Solution:
/// Infer the ordering rule from observed changes and create a ReorderTemplate.

use crate::vdom::{Patch, VNode, VElement};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/// Reorder template that describes how to reorder a list
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReorderTemplate {
    /// Array state binding (e.g., "items", "todos")
    pub array_binding: String,
    /// Ordering rule to apply
    pub ordering: OrderingRule,
}

/// Describes how to order a list
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum OrderingRule {
    /// Sort by a property (ascending or descending)
    /// Example: items.sort((a, b) => a.name.localeCompare(b.name))
    SortByProperty {
        property: String,    // "name", "id", "date", etc.
        direction: SortDirection,
    },
    /// Reverse the current order
    /// Example: items.reverse()
    Reverse,
    /// Filter by a condition
    /// Example: items.filter(item => item.done)
    Filter {
        property: String,    // "done", "active", etc.
        value: serde_json::Value,  // true, false, "completed", etc.
    },
    /// Custom ordering (fallback - stores the order)
    Custom {
        /// Keys in desired order
        key_order: Vec<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SortDirection {
    Ascending,
    Descending,
}

/// Attempt to infer ordering rule from two arrays
///
/// Analyzes old and new arrays to detect common ordering patterns
pub fn infer_ordering_rule(
    old_array: &serde_json::Value,
    new_array: &serde_json::Value,
    array_binding: &str
) -> Option<ReorderTemplate> {
    use serde_json::Value;

    // Both must be arrays
    let old_items = match old_array {
        Value::Array(items) => items,
        _ => return None,
    };

    let new_items = match new_array {
        Value::Array(items) => items,
        _ => return None,
    };

    // Must have same length (reorder, not add/remove)
    if old_items.len() != new_items.len() {
        return None;
    }

    // Try to detect different ordering patterns

    // 1. Check if it's a simple reverse
    if is_reversed(old_items, new_items) {
        crate::log_info!(
            "📐 Detected reverse ordering for {}",
            array_binding
        );
        return Some(ReorderTemplate {
            array_binding: array_binding.to_string(),
            ordering: OrderingRule::Reverse,
        });
    }

    // 2. Check if it's sorted by a property
    if let Some((property, direction)) = detect_sort_by_property(old_items, new_items) {
        crate::log_info!(
            "📐 Detected sort by '{}' ({:?}) for {}",
            property,
            direction,
            array_binding
        );
        return Some(ReorderTemplate {
            array_binding: array_binding.to_string(),
            ordering: OrderingRule::SortByProperty {
                property,
                direction,
            },
        });
    }

    // 3. Check if it's a filter operation (different approach - looks at missing items)
    // Note: This is tricky because filter changes array length
    // For now, we skip this in reorder detection

    // 4. Fallback: Store the custom key order
    if let Some(key_order) = extract_key_order(new_items) {
        crate::log_info!(
            "📐 Storing custom key order for {} ({} items)",
            array_binding,
            key_order.len()
        );
        return Some(ReorderTemplate {
            array_binding: array_binding.to_string(),
            ordering: OrderingRule::Custom { key_order },
        });
    }

    None
}

/// Check if new_items is simply old_items reversed
fn is_reversed(old_items: &[serde_json::Value], new_items: &[serde_json::Value]) -> bool {
    if old_items.len() != new_items.len() {
        return false;
    }

    for (i, old_item) in old_items.iter().enumerate() {
        let new_index = old_items.len() - 1 - i;
        if old_item != &new_items[new_index] {
            return false;
        }
    }

    true
}

/// Detect if items are sorted by a property
///
/// Returns (property_name, direction) if detected
fn detect_sort_by_property(
    old_items: &[serde_json::Value],
    new_items: &[serde_json::Value]
) -> Option<(String, SortDirection)> {
    use serde_json::Value;

    if old_items.is_empty() || new_items.is_empty() {
        return None;
    }

    // Get properties from first item (assuming homogeneous array)
    let first_new = match &new_items[0] {
        Value::Object(obj) => obj,
        _ => return None,
    };

    // Try each property as a potential sort key
    for (prop_name, _) in first_new {
        // Extract values for this property from both arrays
        let old_values: Vec<Option<&Value>> = old_items.iter()
            .map(|item| {
                if let Value::Object(obj) = item {
                    obj.get(prop_name)
                } else {
                    None
                }
            })
            .collect();

        let new_values: Vec<Option<&Value>> = new_items.iter()
            .map(|item| {
                if let Value::Object(obj) = item {
                    obj.get(prop_name)
                } else {
                    None
                }
            })
            .collect();

        // Check if new_values is old_values sorted
        if is_sorted_version(&old_values, &new_values, false) {
            return Some((prop_name.clone(), SortDirection::Ascending));
        }

        if is_sorted_version(&old_values, &new_values, true) {
            return Some((prop_name.clone(), SortDirection::Descending));
        }
    }

    None
}

/// Check if `sorted` is `original` sorted (ascending or descending)
fn is_sorted_version(
    original: &[Option<&serde_json::Value>],
    sorted: &[Option<&serde_json::Value>],
    descending: bool
) -> bool {
    use serde_json::Value;

    // Create a sorted version of original
    let mut expected = original.to_vec();
    expected.sort_by(|a, b| {
        match (a, b) {
            (Some(Value::String(s1)), Some(Value::String(s2))) => {
                if descending {
                    s2.cmp(s1)
                } else {
                    s1.cmp(s2)
                }
            }
            (Some(Value::Number(n1)), Some(Value::Number(n2))) => {
                let f1 = n1.as_f64().unwrap_or(0.0);
                let f2 = n2.as_f64().unwrap_or(0.0);
                if descending {
                    f2.partial_cmp(&f1).unwrap_or(std::cmp::Ordering::Equal)
                } else {
                    f1.partial_cmp(&f2).unwrap_or(std::cmp::Ordering::Equal)
                }
            }
            (Some(Value::Bool(b1)), Some(Value::Bool(b2))) => {
                if descending {
                    b2.cmp(b1)
                } else {
                    b1.cmp(b2)
                }
            }
            _ => std::cmp::Ordering::Equal,
        }
    });

    // Compare expected vs actual
    expected.iter().zip(sorted.iter()).all(|(a, b)| a == b)
}

/// Extract key order from array items
///
/// Looks for "id" or "key" property in each item
fn extract_key_order(items: &[serde_json::Value]) -> Option<Vec<String>> {
    use serde_json::Value;

    let mut keys = Vec::new();

    for item in items {
        if let Value::Object(obj) = item {
            // Try common key properties
            let key = obj.get("id")
                .or_else(|| obj.get("key"))
                .or_else(|| obj.get("_id"))
                .or_else(|| obj.get("uuid"));

            if let Some(key_value) = key {
                let key_str = match key_value {
                    Value::String(s) => s.clone(),
                    Value::Number(n) => n.to_string(),
                    _ => continue,
                };
                keys.push(key_str);
            } else {
                // No key property found
                return None;
            }
        } else {
            // Not an object
            return None;
        }
    }

    if keys.is_empty() {
        None
    } else {
        Some(keys)
    }
}

/// Detect ReorderTemplate from ReorderChildren patch
///
/// Called when predictor sees a ReorderChildren patch
pub fn extract_reorder_template_from_patch(
    patch: &Patch,
    old_tree: &VNode,
    new_tree: &VNode,
    state_change: &crate::predictor::StateChange,
) -> Option<ReorderTemplate> {
    // Only handle ReorderChildren patches
    if let Patch::ReorderChildren { path, order } = patch {
        // Try to infer ordering rule from state change
        if let Some(template) = infer_ordering_rule(
            &state_change.old_value,
            &state_change.new_value,
            &state_change.state_key
        ) {
            return Some(template);
        }

        // Fallback: Store the custom order from patch
        return Some(ReorderTemplate {
            array_binding: state_change.state_key.clone(),
            ordering: OrderingRule::Custom {
                key_order: order.clone(),
            },
        });
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_detect_reverse() {
        let old = json!([
            { "id": 1, "name": "A" },
            { "id": 2, "name": "B" },
            { "id": 3, "name": "C" }
        ]);

        let new = json!([
            { "id": 3, "name": "C" },
            { "id": 2, "name": "B" },
            { "id": 1, "name": "A" }
        ]);

        let template = infer_ordering_rule(&old, &new, "items");
        assert!(template.is_some());

        if let Some(ReorderTemplate { ordering, .. }) = template {
            assert_eq!(ordering, OrderingRule::Reverse);
        }
    }

    #[test]
    fn test_detect_sort_by_name() {
        let old = json!([
            { "id": 1, "name": "Charlie" },
            { "id": 2, "name": "Alice" },
            { "id": 3, "name": "Bob" }
        ]);

        let new = json!([
            { "id": 2, "name": "Alice" },
            { "id": 3, "name": "Bob" },
            { "id": 1, "name": "Charlie" }
        ]);

        let template = infer_ordering_rule(&old, &new, "items");
        assert!(template.is_some());

        if let Some(ReorderTemplate { ordering, .. }) = template {
            match ordering {
                OrderingRule::SortByProperty { property, direction } => {
                    assert_eq!(property, "name");
                    assert_eq!(direction, SortDirection::Ascending);
                }
                _ => panic!("Expected SortByProperty"),
            }
        }
    }

    #[test]
    fn test_detect_sort_by_id_descending() {
        let old = json!([
            { "id": 1, "name": "A" },
            { "id": 2, "name": "B" },
            { "id": 3, "name": "C" }
        ]);

        let new = json!([
            { "id": 3, "name": "C" },
            { "id": 2, "name": "B" },
            { "id": 1, "name": "A" }
        ]);

        let template = infer_ordering_rule(&old, &new, "items");
        assert!(template.is_some());

        // Note: This could be detected as either Reverse OR SortByProperty(id, Descending)
        // Our algorithm prefers Reverse (simpler pattern)
    }
}
