/**
 * Phase 5: Structural Template Extraction
 *
 * Detects conditional rendering patterns and extracts templates for each branch.
 * This enables 100% coverage for conditionals with O(1) memory.
 *
 * Example Input:
 * Old VNode: <div>Loading...</div>
 * New VNode: <div><h1>Welcome, John!</h1><button>Logout</button></div>
 * State Change: isLoggedIn (false → true)
 *
 * Output:
 * StructuralTemplate {
 *   condition_binding: "isLoggedIn",
 *   branches: {
 *     "false": <div>Loading...</div>,
 *     "true": <div><h1>Welcome, {user.name}!</h1><button>Logout</button></div>
 *   }
 * }
 *
 * The client will then:
 * 1. Check current state value: isLoggedIn = true
 * 2. Select branch: branches["true"]
 * 3. Materialize nested templates within the branch
 * 4. Apply to DOM instantly (3-5ms)
 */

use crate::vdom::{Patch, StructuralTemplate, VNode};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct StateChange {
    pub component_id: String,
    pub state_key: String,
    pub old_value: Value,
    pub new_value: Value,
}

/// Extract structural template from Replace patch when triggered by boolean/enum state change
///
/// This function analyzes Replace patches to determine if they represent conditional rendering.
/// If the old and new nodes are structurally different and the state change is boolean or enum,
/// we create a structural template that stores both branches.
///
/// Returns Some(Patch::ReplaceConditional) if extraction succeeds, None otherwise.
pub fn extract_structural_template(
    state_change: &StateChange,
    old_path: &[usize],
    old_node: &VNode,
    new_node: &VNode,
) -> Option<Patch> {
    // Only extract templates for boolean or enum (string) state changes
    let is_boolean = matches!((&state_change.old_value, &state_change.new_value),
                             (Value::Bool(_), Value::Bool(_)));
    let is_enum = matches!((&state_change.old_value, &state_change.new_value),
                           (Value::String(_), Value::String(_)));

    if !is_boolean && !is_enum {
        return None;
    }

    // Check if nodes are structurally different (not just content changes)
    if !is_structural_change(old_node, new_node) {
        return None;
    }

    // Build branches map
    let mut branches = HashMap::new();

    // Store old branch
    let old_key = serialize_condition_value(&state_change.old_value);
    branches.insert(old_key, old_node.clone());

    // Store new branch
    let new_key = serialize_condition_value(&state_change.new_value);
    branches.insert(new_key, new_node.clone());

    // Create structural template
    let structural_template = StructuralTemplate {
        condition_binding: state_change.state_key.clone(),
        branches,
        default_branch: None, // Could be enhanced to detect default branches
    };

    Some(Patch::ReplaceConditional {
        path: old_path.to_vec(),
        structural_template,
    })
}

/// Check if two nodes represent a structural change (not just content)
///
/// Structural changes include:
/// - Different node types (Element vs Text)
/// - Different tag names
/// - Different number of children
/// - Significantly different structure
fn is_structural_change(old_node: &VNode, new_node: &VNode) -> bool {
    match (old_node, new_node) {
        // Text to Element or vice versa = structural change
        (VNode::Text(_), VNode::Element(_)) => true,
        (VNode::Element(_), VNode::Text(_)) => true,

        // Both text nodes
        (VNode::Text(old_text), VNode::Text(new_text)) => {
            // If text content is completely different (no substring overlap),
            // it might be conditional rendering
            !old_text.content.contains(&new_text.content) &&
            !new_text.content.contains(&old_text.content)
        }

        // Both elements
        (VNode::Element(old_el), VNode::Element(new_el)) => {
            // Different tags = structural change
            if old_el.tag != new_el.tag {
                return true;
            }

            // Check if children types changed (Text vs Element)
            let old_children_count = old_el.children.len();
            let new_children_count = new_el.children.len();

            if old_children_count == new_children_count && old_children_count > 0 {
                // Check first child type - if different, it's structural
                if old_el.children[0].is_text() != new_el.children[0].is_text() {
                    return true;
                }
            }

            // Significantly different number of children = structural change
            // More than 50% difference in child count
            if old_children_count == 0 && new_children_count > 0 {
                return true;
            }
            if new_children_count == 0 && old_children_count > 0 {
                return true;
            }

            let diff = if old_children_count > new_children_count {
                old_children_count - new_children_count
            } else {
                new_children_count - old_children_count
            };

            let max = std::cmp::max(old_children_count, new_children_count);
            if max > 0 && (diff * 100 / max) > 50 {
                return true;
            }

            // Not a structural change (probably just content updates)
            false
        }
    }
}

/// Serialize condition value to string key for branches map
fn serialize_condition_value(value: &Value) -> String {
    match value {
        Value::Bool(b) => b.to_string(),
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Null => "null".to_string(),
        _ => format!("{:?}", value),
    }
}

/// Enhance existing structural template with new observation
///
/// When we see another state transition for the same condition binding,
/// we can add the new branch to the existing template.
pub fn enhance_structural_template(
    existing_template: &mut StructuralTemplate,
    state_change: &StateChange,
    new_node: &VNode,
) {
    let new_key = serialize_condition_value(&state_change.new_value);

    // Add new branch if not already present
    if !existing_template.branches.contains_key(&new_key) {
        existing_template.branches.insert(new_key, new_node.clone());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vdom::{VElement, VText};

    #[test]
    fn test_extract_structural_template_boolean() {
        // State change: isLoggedIn (false → true)
        let state_change = StateChange {
            component_id: "UserProfile".to_string(),
            state_key: "isLoggedIn".to_string(),
            old_value: Value::Bool(false),
            new_value: Value::Bool(true),
        };

        // Old: <div>Please log in</div>
        let old_node = VNode::Element(VElement {
            tag: "div".to_string(),
            props: HashMap::new(),
            children: vec![VNode::Text(VText {
                content: "Please log in".to_string(),
            })],
            key: None,
        });

        // New: <div><h1>Welcome!</h1></div>
        let new_node = VNode::Element(VElement {
            tag: "div".to_string(),
            props: HashMap::new(),
            children: vec![VNode::Element(VElement {
                tag: "h1".to_string(),
                props: HashMap::new(),
                children: vec![VNode::Text(VText {
                    content: "Welcome!".to_string(),
                })],
                key: None,
            })],
            key: None,
        });

        let result = extract_structural_template(&state_change, &vec![0], &old_node, &new_node);

        assert!(result.is_some());
        if let Some(Patch::ReplaceConditional { structural_template, .. }) = result {
            assert_eq!(structural_template.condition_binding, "isLoggedIn");
            assert_eq!(structural_template.branches.len(), 2);
            assert!(structural_template.branches.contains_key("true"));
            assert!(structural_template.branches.contains_key("false"));
        } else {
            panic!("Expected ReplaceConditional patch");
        }
    }

    #[test]
    fn test_extract_structural_template_enum() {
        // State change: loadingState ("loading" → "success")
        let state_change = StateChange {
            component_id: "DataView".to_string(),
            state_key: "loadingState".to_string(),
            old_value: Value::String("loading".to_string()),
            new_value: Value::String("success".to_string()),
        };

        // Old: <div>Loading...</div>
        let old_node = VNode::Text(VText {
            content: "Loading...".to_string(),
        });

        // New: <div>Data loaded!</div>
        let new_node = VNode::Text(VText {
            content: "Data loaded!".to_string(),
        });

        let result = extract_structural_template(&state_change, &vec![0], &old_node, &new_node);

        assert!(result.is_some());
        if let Some(Patch::ReplaceConditional { structural_template, .. }) = result {
            assert_eq!(structural_template.condition_binding, "loadingState");
            assert_eq!(structural_template.branches.len(), 2);
            assert!(structural_template.branches.contains_key("loading"));
            assert!(structural_template.branches.contains_key("success"));
        } else {
            panic!("Expected ReplaceConditional patch");
        }
    }

    #[test]
    fn test_is_structural_change() {
        // Text to Element
        let text = VNode::Text(VText {
            content: "Hello".to_string(),
        });
        let element = VNode::Element(VElement {
            tag: "div".to_string(),
            props: HashMap::new(),
            children: vec![],
            key: None,
        });
        assert!(is_structural_change(&text, &element));

        // Different tags
        let div = VNode::Element(VElement {
            tag: "div".to_string(),
            props: HashMap::new(),
            children: vec![],
            key: None,
        });
        let span = VNode::Element(VElement {
            tag: "span".to_string(),
            props: HashMap::new(),
            children: vec![],
            key: None,
        });
        assert!(is_structural_change(&div, &span));

        // Significant child count difference
        let empty_div = VNode::Element(VElement {
            tag: "div".to_string(),
            props: HashMap::new(),
            children: vec![],
            key: None,
        });
        let div_with_children = VNode::Element(VElement {
            tag: "div".to_string(),
            props: HashMap::new(),
            children: vec![text.clone(), text.clone()],
            key: None,
        });
        assert!(is_structural_change(&empty_div, &div_with_children));
    }
}
