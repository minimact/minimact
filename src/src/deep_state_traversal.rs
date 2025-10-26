/// Deep State Traversal (Phase 7)
///
/// Enables template extraction for nested object state like:
/// - user.address.city
/// - formData.personal.firstName
/// - todo.author.name
///
/// Problem:
/// Current extract_multi_variable_template() only searches top-level keys.
/// If state = { user: { address: { city: "NYC" } } }, searching for "NYC" fails.
///
/// Solution:
/// Recursively traverse state object to find ALL primitive values and their paths.

use serde_json::Value;
use std::collections::HashMap;

/// A match found in state with its full path
#[derive(Debug, Clone)]
pub struct StateValueMatch {
    /// Full dot-notation path (e.g., "user.address.city")
    pub path: String,
    /// String representation of the value
    pub value_str: String,
    /// Position in content where this value was found
    pub content_position: usize,
}

/// Recursively search for a value in nested state
///
/// Returns all paths where this value appears
///
/// Example:
/// ```
/// let state = json!({
///     "user": {
///         "name": "John",
///         "address": { "city": "NYC" }
///     },
///     "admin": { "name": "John" }
/// });
///
/// let matches = find_value_in_state(&state, "John", "");
/// // Returns: ["user.name", "admin.name"]
/// ```
pub fn find_value_in_state(
    state: &HashMap<String, Value>,
    search_value: &str,
    prefix: &str
) -> Vec<String> {
    let mut paths = Vec::new();

    for (key, value) in state {
        let current_path = if prefix.is_empty() {
            key.clone()
        } else {
            format!("{}.{}", prefix, key)
        };

        match value {
            // Primitive values - check if they match
            Value::String(s) if s == search_value => {
                paths.push(current_path);
            }
            Value::Number(n) if n.to_string() == search_value => {
                paths.push(current_path);
            }
            Value::Bool(b) if b.to_string() == search_value => {
                paths.push(current_path);
            }

            // Nested object - recurse
            Value::Object(obj) => {
                let nested_map: HashMap<String, Value> = obj.iter()
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect();
                let nested_matches = find_value_in_state(&nested_map, search_value, &current_path);
                paths.extend(nested_matches);
            }

            // Array - search each element with [index] notation
            Value::Array(arr) => {
                for (i, item) in arr.iter().enumerate() {
                    let indexed_path = format!("{}[{}]", current_path, i);

                    match item {
                        Value::String(s) if s == search_value => {
                            paths.push(indexed_path);
                        }
                        Value::Number(n) if n.to_string() == search_value => {
                            paths.push(indexed_path);
                        }
                        Value::Bool(b) if b.to_string() == search_value => {
                            paths.push(indexed_path);
                        }
                        Value::Object(obj) => {
                            let nested_map: HashMap<String, Value> = obj.iter()
                                .map(|(k, v)| (k.clone(), v.clone()))
                                .collect();
                            let nested_matches = find_value_in_state(&nested_map, search_value, &indexed_path);
                            paths.extend(nested_matches);
                        }
                        _ => {}
                    }
                }
            }

            _ => {}
        }
    }

    paths
}

/// Find all primitive values in state with their paths
///
/// Returns a map of value → paths where it appears
///
/// Example:
/// ```
/// let state = json!({
///     "user": { "name": "John", "age": 30 },
///     "admin": { "name": "Jane" }
/// });
///
/// let values = collect_all_primitive_values(&state);
/// // Returns: {
/// //   "John": ["user.name"],
/// //   "30": ["user.age"],
/// //   "Jane": ["admin.name"]
/// // }
/// ```
pub fn collect_all_primitive_values(
    state: &HashMap<String, Value>
) -> HashMap<String, Vec<String>> {
    let mut result: HashMap<String, Vec<String>> = HashMap::new();

    fn traverse(
        value: &Value,
        current_path: &str,
        result: &mut HashMap<String, Vec<String>>
    ) {
        match value {
            Value::String(s) if !s.is_empty() => {
                result.entry(s.clone()).or_insert_with(Vec::new).push(current_path.to_string());
            }
            Value::Number(n) => {
                let s = n.to_string();
                result.entry(s).or_insert_with(Vec::new).push(current_path.to_string());
            }
            Value::Bool(b) => {
                let s = b.to_string();
                result.entry(s).or_insert_with(Vec::new).push(current_path.to_string());
            }
            Value::Object(obj) => {
                for (key, val) in obj {
                    let next_path = if current_path.is_empty() {
                        key.clone()
                    } else {
                        format!("{}.{}", current_path, key)
                    };
                    traverse(val, &next_path, result);
                }
            }
            Value::Array(arr) => {
                for (i, item) in arr.iter().enumerate() {
                    let next_path = format!("{}[{}]", current_path, i);
                    traverse(item, &next_path, result);
                }
            }
            _ => {}
        }
    }

    for (key, value) in state {
        traverse(value, key, &mut result);
    }

    result
}

/// Find all primitive values in content and match to state paths
///
/// This is the main function used by extract_multi_variable_template
///
/// Example:
/// ```
/// let content = "User: John from NYC";
/// let state = json!({
///     "user": { "name": "John", "address": { "city": "NYC" } }
/// });
///
/// let matches = find_state_values_in_content(&state, content);
/// // Returns: [
/// //   StateValueMatch { path: "user.name", value_str: "John", content_position: 6 },
/// //   StateValueMatch { path: "user.address.city", value_str: "NYC", content_position: 16 }
/// // ]
/// ```
pub fn find_state_values_in_content(
    state: &HashMap<String, Value>,
    content: &str
) -> Vec<StateValueMatch> {
    let mut matches = Vec::new();

    // Get all primitive values and their paths
    let value_map = collect_all_primitive_values(state);

    // For each unique value, find it in content
    for (value_str, paths) in value_map {
        // Find all occurrences of this value in content
        let mut search_pos = 0;
        while let Some(pos) = content[search_pos..].find(&value_str) {
            let absolute_pos = search_pos + pos;

            // Use the first path for this value
            // TODO: Could be smarter about choosing which path if value appears multiple times in state
            if let Some(first_path) = paths.first() {
                matches.push(StateValueMatch {
                    path: first_path.clone(),
                    value_str: value_str.clone(),
                    content_position: absolute_pos,
                });
            }

            // Continue searching after this match
            search_pos = absolute_pos + value_str.len();
        }
    }

    // Sort by position in content (leftmost first)
    matches.sort_by_key(|m| m.content_position);

    // Remove overlapping matches (keep leftmost)
    let mut filtered = Vec::new();
    let mut last_end = 0;

    for m in matches {
        if m.content_position >= last_end {
            last_end = m.content_position + m.value_str.len();
            filtered.push(m);
        }
    }

    filtered
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_find_value_in_nested_state() {
        let state_json = json!({
            "user": {
                "name": "John",
                "address": {
                    "city": "NYC",
                    "zip": "10001"
                }
            }
        });

        let state: HashMap<String, Value> = serde_json::from_value(state_json).unwrap();

        let matches = find_value_in_state(&state, "NYC", "");
        assert_eq!(matches, vec!["user.address.city"]);

        let matches = find_value_in_state(&state, "John", "");
        assert_eq!(matches, vec!["user.name"]);
    }

    #[test]
    fn test_collect_all_primitive_values() {
        let state_json = json!({
            "user": {
                "name": "John",
                "age": 30
            },
            "admin": {
                "name": "Jane"
            }
        });

        let state: HashMap<String, Value> = serde_json::from_value(state_json).unwrap();
        let values = collect_all_primitive_values(&state);

        assert!(values.contains_key("John"));
        assert!(values.contains_key("30"));
        assert!(values.contains_key("Jane"));

        assert_eq!(values.get("John"), Some(&vec!["user.name".to_string()]));
        assert_eq!(values.get("Jane"), Some(&vec!["admin.name".to_string()]));
    }

    #[test]
    fn test_find_state_values_in_content() {
        let state_json = json!({
            "user": {
                "name": "John",
                "address": {
                    "city": "NYC"
                }
            }
        });

        let state: HashMap<String, Value> = serde_json::from_value(state_json).unwrap();
        let content = "User: John from NYC";

        let matches = find_state_values_in_content(&state, content);

        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].path, "user.name");
        assert_eq!(matches[0].value_str, "John");
        assert_eq!(matches[0].content_position, 6);

        assert_eq!(matches[1].path, "user.address.city");
        assert_eq!(matches[1].value_str, "NYC");
        assert_eq!(matches[1].content_position, 16);
    }
}
