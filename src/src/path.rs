/// Hex-based DOM path system for Minimact
///
/// This module implements a tag-agnostic path system using hexadecimal offsets.
/// Instead of tag-based paths like "div[0].span[1].p[0]", we use hex codes like
/// "10000000.20000000.30000000". This provides 268M slots between elements,
/// allowing insertions without renumbering existing paths.
///
/// Benefits:
/// - Insert new elements anywhere without affecting existing paths
/// - No cascading path changes when JSX structure is modified
/// - Cached predictions remain valid across code changes
/// - Better performance for large component trees

use serde::{Deserialize, Serialize};
use std::fmt;

/// Hex-based DOM path
/// Format: "10000000.20000000.30000000"
/// Each segment is a u32 hex value with 0x10000000 (268,435,456) gaps between elements
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct HexPath(pub String);

/// The gap between consecutive elements (268M slots)
/// This allows inserting 268M new elements between any two existing elements
pub const HEX_GAP: u32 = 0x10000000;

impl HexPath {
    /// Create a new empty path (root)
    pub fn root() -> Self {
        HexPath(String::new())
    }

    /// Create a path from a string
    pub fn from_string(s: String) -> Self {
        HexPath(s)
    }

    /// Create a path from individual hex segments
    pub fn from_segments(segments: &[u32]) -> Self {
        if segments.is_empty() {
            return HexPath::root();
        }
        let path = segments
            .iter()
            .map(|seg| format!("{:08x}", seg))
            .collect::<Vec<_>>()
            .join(".");
        HexPath(path)
    }

    /// Append a child index to this path
    /// Creates path like "10000000" or "10000000.20000000"
    pub fn child(&self, index: usize) -> Self {
        let hex_value = (index as u32 + 1) * HEX_GAP;
        if self.0.is_empty() {
            HexPath(format!("{:08x}", hex_value))
        } else {
            HexPath(format!("{}.{:08x}", self.0, hex_value))
        }
    }

    /// Get the parent path (remove last segment)
    /// Returns None if this is the root path
    pub fn parent(&self) -> Option<Self> {
        if self.0.is_empty() {
            return None;
        }
        if let Some(last_dot) = self.0.rfind('.') {
            Some(HexPath(self.0[..last_dot].to_string()))
        } else {
            Some(HexPath::root())
        }
    }

    /// Get the depth of this path (number of segments)
    pub fn depth(&self) -> usize {
        if self.0.is_empty() {
            0
        } else {
            self.0.chars().filter(|&c| c == '.').count() + 1
        }
    }

    /// Check if this path is empty (root)
    pub fn is_root(&self) -> bool {
        self.0.is_empty()
    }

    /// Check if this path is empty (alias for is_root for consistency)
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// Get the underlying string
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Get the length of the path string
    pub fn len(&self) -> usize {
        self.0.len()
    }

    /// Parse hex segments from the path
    pub fn segments(&self) -> Result<Vec<u32>, std::num::ParseIntError> {
        if self.0.is_empty() {
            return Ok(Vec::new());
        }
        self.0
            .split('.')
            .map(|seg| u32::from_str_radix(seg, 16))
            .collect()
    }

    /// Convert to index-based path (for backward compatibility)
    /// Converts "10000000.20000000" to vec![0, 1]
    pub fn to_index_path(&self) -> Result<Vec<usize>, String> {
        if self.0.is_empty() {
            return Ok(Vec::new());
        }

        let segments = self.segments()
            .map_err(|e| format!("Invalid hex path: {}", e))?;

        segments
            .iter()
            .map(|&seg| {
                if seg % HEX_GAP != 0 {
                    Err(format!("Path segment {:08x} is not aligned to HEX_GAP", seg))
                } else {
                    Ok((seg / HEX_GAP - 1) as usize)
                }
            })
            .collect()
    }
}

impl fmt::Display for HexPath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<String> for HexPath {
    fn from(s: String) -> Self {
        HexPath(s)
    }
}

impl From<&str> for HexPath {
    fn from(s: &str) -> Self {
        HexPath(s.to_string())
    }
}

/// Convert legacy index-based path to hex path
/// vec![0, 1, 2] -> "10000000.20000000.30000000"
pub fn index_path_to_hex(indices: &[usize]) -> HexPath {
    HexPath::from_segments(
        &indices
            .iter()
            .map(|&i| (i as u32 + 1) * HEX_GAP)
            .collect::<Vec<_>>()
    )
}

/// Convert hex path to legacy index-based path
/// "10000000.20000000.30000000" -> vec![0, 1, 2]
pub fn hex_to_index_path(path: &HexPath) -> Result<Vec<usize>, String> {
    path.to_index_path()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_root_path() {
        let root = HexPath::root();
        assert!(root.is_root());
        assert_eq!(root.depth(), 0);
        assert_eq!(root.as_str(), "");
    }

    #[test]
    fn test_child_path() {
        let root = HexPath::root();
        let child0 = root.child(0);
        assert_eq!(child0.as_str(), "10000000");

        let child1 = root.child(1);
        assert_eq!(child1.as_str(), "20000000");

        let grandchild = child0.child(0);
        assert_eq!(grandchild.as_str(), "10000000.10000000");
    }

    #[test]
    fn test_parent_path() {
        let path = HexPath::from("10000000.20000000.30000000");
        let parent = path.parent().unwrap();
        assert_eq!(parent.as_str(), "10000000.20000000");

        let grandparent = parent.parent().unwrap();
        assert_eq!(grandparent.as_str(), "10000000");

        let root = grandparent.parent().unwrap();
        assert!(root.is_root());

        assert!(root.parent().is_none());
    }

    #[test]
    fn test_depth() {
        assert_eq!(HexPath::root().depth(), 0);
        assert_eq!(HexPath::from("10000000").depth(), 1);
        assert_eq!(HexPath::from("10000000.20000000").depth(), 2);
        assert_eq!(HexPath::from("10000000.20000000.30000000").depth(), 3);
    }

    #[test]
    fn test_index_conversion() {
        let indices = vec![0, 1, 2];
        let hex_path = index_path_to_hex(&indices);
        assert_eq!(hex_path.as_str(), "10000000.20000000.30000000");

        let back_to_indices = hex_to_index_path(&hex_path).unwrap();
        assert_eq!(back_to_indices, indices);
    }

    #[test]
    fn test_from_segments() {
        let segments = vec![0x10000000, 0x20000000, 0x30000000];
        let path = HexPath::from_segments(&segments);
        assert_eq!(path.as_str(), "10000000.20000000.30000000");
    }

    #[test]
    fn test_segments() {
        let path = HexPath::from("10000000.20000000.30000000");
        let segments = path.segments().unwrap();
        assert_eq!(segments, vec![0x10000000, 0x20000000, 0x30000000]);
    }

    #[test]
    fn test_gap_insertion() {
        // Show that we can insert between existing paths
        let child0 = HexPath::from("10000000");
        let child1 = HexPath::from("20000000");

        // Insert a new element between child0 and child1
        let inserted = HexPath::from("18000000"); // Halfway between

        // All three paths remain unique and sorted
        assert!(child0.as_str() < inserted.as_str());
        assert!(inserted.as_str() < child1.as_str());
    }
}
