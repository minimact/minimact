/**
 * Example: styleConverter.cjs - Converts JS style objects to CSS strings
 *
 * Functions:
 * - convertStyleObjectToCss(objectExpr) → CSS string
 * - camelToKebab(str) → kebab-case string
 *
 * Conversions:
 * - StringLiteral → value directly
 * - NumericLiteral → value + "px" suffix
 * - Identifier → variable name
 * - camelCase keys → kebab-case (marginTop → margin-top)
 * - Vendor prefixes preserved (WebkitTransform → -webkit-transform)
 *
 * Output format: "prop1: value1; prop2: value2"
 */
import { useState } from '@minimact/core';

export function StyleConverterExample() {
  const [isActive, setIsActive] = useState(true);
  const [size, setSize] = useState(16);
  const dynamicColor = 'purple';

  return (
    <div>
      {/* 1. String literal values → used directly */}
      {/* { color: 'red', fontSize: '14px' } → "color: red; font-size: 14px" */}
      <div style={{ color: 'red', fontSize: '14px' }}>
        Static styles
      </div>

      {/* 2. Numeric values → "px" suffix added */}
      {/* { marginTop: 20 } → "margin-top: 20px" */}
      <div style={{ marginTop: 20, padding: 10, borderRadius: 5 }}>
        Numeric values
      </div>

      {/* 3. camelCase → kebab-case conversion */}
      {/* backgroundColor → background-color, borderBottomWidth → border-bottom-width */}
      <div style={{
        backgroundColor: 'blue',
        borderBottomWidth: 2,
        lineHeight: 1.5
      }}>
        CamelCase conversion
      </div>

      {/* 4. Vendor prefixes → preserved with dash prefix */}
      {/* WebkitTransform → -webkit-transform, MozTransform → -moz-transform */}
      <div style={{
        WebkitTransform: 'rotate(45deg)',
        MozTransform: 'rotate(45deg)',
        msTransform: 'rotate(45deg)',
        zIndex: 100
      }}>
        Vendor prefixes
      </div>

      {/* 5. Identifier values → variable name preserved */}
      {/* { color: dynamicColor } → "color: dynamicColor" (runtime interpolation) */}
      <div style={{ color: dynamicColor, fontSize: size }}>
        Identifier values
      </div>

      {/* 6. Mixed value types in single object */}
      <div style={{
        color: isActive ? 'green' : 'gray',
        fontSize: size,
        opacity: isActive ? 1 : 0.5,
        margin: '0 auto',
        display: 'flex'
      }}>
        Mixed static and dynamic
      </div>

      {/* 7. Unitless CSS properties (font-weight, opacity, zIndex, etc.) */}
      {/* Note: Current implementation adds px to ALL numeric values */}
      <div style={{
        fontWeight: 700,
        opacity: 0.8,
        flex: 1
      }}>
        Unitless properties (get px suffix)
      </div>
    </div>
  );
}
