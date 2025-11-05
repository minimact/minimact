/**
 * Feature Test: Style Objects
 *
 * Tests inline style object conversion from JSX to C# style strings.
 *
 * Key patterns:
 * - camelCase → kebab-case (fontSize → font-size)
 * - Numeric values with units (20 → "20px")
 * - Color values (#2563eb, rgb(), etc.)
 */

export function StyleObjectsTest() {
  return (
    <div>
      {/* Simple style object */}
      <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
        Simple Styles
      </div>

      {/* Numeric values (should add 'px' unit) */}
      <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2563eb' }}>
        Numeric Values
      </div>

      {/* Multiple style properties */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px'
      }}>
        Complex Styles
      </div>

      {/* Nested styles with transform */}
      <button style={{
        padding: '10px 20px',
        border: 'none',
        borderRadius: '5px',
        backgroundColor: '#3b82f6',
        color: 'white',
        cursor: 'pointer',
        transform: 'scale(1.05)'
      }}>
        Styled Button
      </button>
    </div>
  );
}
