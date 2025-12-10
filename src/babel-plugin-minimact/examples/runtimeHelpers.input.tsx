/**
 * Example: runtimeHelpers.cjs - Generates runtime helper calls for dynamic content
 *
 * Used when static JSX generation isn't possible:
 * - Spread props: {...props} → .MergeWith()
 * - Dynamic children arrays
 * - Conditional JSX inside runtime helpers
 * - Fragments in dynamic context
 *
 * Output: MinimactHelpers.createElement("tag", props, children)
 */
import { useState } from '@minimact/core';

export function RuntimeHelpersExample() {
  const [dynamicProps, setDynamicProps] = useState({ id: 'test', role: 'button' });
  const [extraProps, setExtraProps] = useState({ 'aria-label': 'Action' });
  const [className, setClassName] = useState('active');
  const [children, setChildren] = useState(['Item 1', 'Item 2']);
  const [style, setStyle] = useState({ color: 'red', fontSize: 16 });
  const [isVisible, setIsVisible] = useState(true);
  const [items, setItems] = useState(['a', 'b', 'c']);

  return (
    <div>
      {/* 1. Single spread props → ((object)new { }).MergeWith((object)dynamicProps) */}
      <button {...dynamicProps}>
        Click me
      </button>

      {/* 2. Spread props + regular props → merge both */}
      <button {...dynamicProps} className={className} disabled>
        Merged props
      </button>

      {/* 3. Multiple spread props → chain .MergeWith() */}
      <button {...dynamicProps} {...extraProps} className="btn">
        Multiple spreads
      </button>

      {/* 4. Dynamic children array → passed directly */}
      <ul>{children}</ul>

      {/* 5. Style object expression → convertStyleObjectToCss */}
      <div style={{ color: 'red', marginTop: 20, backgroundColor: 'blue' }}>
        Static style object
      </div>

      {/* 6. Dynamic style variable → passed as expression */}
      <div style={style}>Styled content</div>

      {/* 7. Conditional inside runtime helper → ternary with VNull */}
      <div {...dynamicProps}>
        {isVisible ? <span>Visible</span> : null}
      </div>

      {/* 8. Logical && inside runtime helper → condition ? element : VNull */}
      <section {...dynamicProps}>
        {isVisible && <p>Conditionally shown</p>}
      </section>

      {/* 9. .map() inside runtime helper → generateMapExpression */}
      <ul {...dynamicProps}>
        {items.map(item => <li key={item}>{item}</li>)}
      </ul>

      {/* 10. Fragment in dynamic context → MinimactHelpers.Fragment() */}
      <div {...dynamicProps}>
        <>
          <span>First</span>
          <span>Second</span>
        </>
      </div>

      {/* 11. Boolean attribute → "true" */}
      <input {...dynamicProps} disabled />

      {/* 12. Event handler as identifier → string handler name */}
      <button {...dynamicProps} onClick={handleClick}>
        With handler
      </button>

      {/* 13. Mixed static text and JSX children */}
      <div {...dynamicProps}>
        Static text
        <span>Element</span>
        More text
      </div>

      {/* 14. key attribute is skipped (hot reload only) */}
      <div {...dynamicProps} key="unique">
        Key is ignored in output
      </div>
    </div>
  );
}

function handleClick() {
  console.log('clicked');
}
