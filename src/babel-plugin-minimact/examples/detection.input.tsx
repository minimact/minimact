/**
 * Example: detection.cjs - Detects spread props, dynamic children, complex props
 *
 * Functions:
 * - hasSpreadProps(attributes) → boolean - JSXSpreadAttribute detected
 * - hasDynamicChildren(children) → boolean - .map(), .Select(), conditionals with JSX
 * - hasComplexProps(attributes) → boolean - conditional expressions in props
 *
 * When any of these return true, runtime helpers are needed:
 * - RuntimeHelpers.CreateElement (spread props)
 * - RuntimeHelpers.ToVNodes (dynamic children)
 * - RuntimeHelpers.MergeProps (conditional spreads)
 */
import { useState } from '@minimact/core';

export function DetectionExample() {
  const [className, setClassName] = useState('active');
  const [items, setItems] = useState(['a', 'b', 'c']);
  const [props, setProps] = useState({ id: 'test', role: 'button' });
  const [showExtra, setShowExtra] = useState(false);
  const [isActive, setIsActive] = useState(true);

  return (
    <div>
      {/* ===== NO RUNTIME HELPERS NEEDED ===== */}

      {/* Static content - compile-time VNode */}
      <span className="static">Hello</span>

      {/* Simple dynamic className - compile-time VNode with binding */}
      <span className={className}>Dynamic class</span>

      {/* ===== hasSpreadProps → true ===== */}

      {/* 1. JSXSpreadAttribute detected */}
      <div {...props}>Spread props</div>

      {/* 2. Multiple spreads */}
      <button {...props} {...{ disabled: false }}>Multi-spread</button>

      {/* ===== hasDynamicChildren → true ===== */}

      {/* 3. .map() call in children */}
      <ul>
        {items.map(item => <li key={item}>{item}</li>)}
      </ul>

      {/* 4. .Select() (LINQ-style) in children */}
      <ul>
        {items.Select(item => <li>{item}</li>)}
      </ul>

      {/* 5. Conditional with JSX (ternary): {condition ? <A/> : <B/>} */}
      <div>
        {isActive ? <span>Active</span> : <span>Inactive</span>}
      </div>

      {/* 6. Conditional with JSX in alternate */}
      <div>
        {isActive ? 'text' : <span>Element</span>}
      </div>

      {/* 7. Logical expression with JSX: {condition && <Element/>} */}
      <div>
        {showExtra && <span>Extra content</span>}
      </div>

      {/* 8. Fragment in conditional */}
      <div>
        {isActive ? <>Multiple</> : <>Items</>}
      </div>

      {/* ===== hasComplexProps → true ===== */}

      {/* 9. Conditional expression in prop value */}
      <div className={isActive ? 'active' : 'inactive'}>Conditional class</div>

      {/* 10. Logical expression in prop value */}
      <div className={isActive && 'active'}>Logical class</div>

      {/* 11. Complex nested conditional in prop */}
      <div
        data-state={isActive ? (showExtra ? 'both' : 'active') : 'inactive'}
      >
        Nested conditional prop
      </div>
    </div>
  );
}
