/**
 * Example: propTypeInference.cjs - Infers prop types from usage
 */

// No TypeScript types - types inferred from usage patterns
export function PropTypeInferenceExample({ title, count, items, user, onClick, config }) {
  return (
    <div>
      {/* String inference: .toUpperCase(), .toLowerCase(), .trim(), etc. */}
      <h1>{title.toUpperCase()}</h1>
      <h2>{title.substring(0, 10)}</h2>

      {/* Number inference: arithmetic operations, comparisons */}
      <p>Count: {count * 2}</p>
      <p>Doubled: {count + count}</p>
      {count > 0 && <span>Positive</span>}

      {/* Array inference: .map(), .filter(), .length, [] access */}
      <ul>
        {items.map(item => <li>{item}</li>)}
      </ul>
      <p>Total: {items.length}</p>
      <p>First: {items[0]}</p>

      {/* Object inference: property access */}
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>

      {/* Function inference: used as event handler */}
      <button onClick={onClick}>Click</button>
      <button onClick={() => onClick()}>Also click</button>

      {/* Optional/nullable inference: conditional access */}
      {config && <span>Has config</span>}
      <p>Theme: {config?.theme}</p>
    </div>
  );
}
