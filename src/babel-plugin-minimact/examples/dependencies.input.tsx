/**
 * Example: dependencies.cjs - Tracks state dependencies per node
 *
 * Walks AST to find state variable references in JSX expressions.
 * Uses component.stateTypes Map to determine if identifier is state.
 *
 * AST node types handled:
 * - Identifier → direct state reference
 * - ConditionalExpression → test, consequent, alternate
 * - LogicalExpression → left, right
 * - MemberExpression → object, property
 * - CallExpression → callee, arguments
 * - BinaryExpression → left, right
 * - UnaryExpression → argument
 * - ArrowFunctionExpression/FunctionExpression → body
 *
 * Returns: Set<{ name, type }> where type is 'client' or 'server'
 */
import { useState, useClientState } from '@minimact/core';

export function DependenciesExample() {
  // Server state
  const [count, setCount] = useState(0);
  const [name, setName] = useState('User');
  const [items, setItems] = useState<string[]>([]);
  const [config, setConfig] = useState({ theme: 'dark', showBadge: true });

  // Client state
  const [isHovered, setIsHovered] = useClientState(false);

  return (
    <div>
      {/* 1. Identifier - direct state reference */}
      <span>{count}</span>
      {/* deps: [{ name: 'count', type: 'server' }] */}

      {/* 2. MemberExpression - object.property */}
      <span>Theme: {config.theme}</span>
      {/* deps: [{ name: 'config', type: 'server' }] */}

      {/* 3. CallExpression - method call with state */}
      <span>Total: {items.length}</span>
      {/* deps: [{ name: 'items', type: 'server' }] */}

      {/* 4. BinaryExpression - left + right */}
      <span>{count * 2}</span>
      {/* deps: [{ name: 'count', type: 'server' }] */}

      {/* 5. ConditionalExpression - ternary test ? consequent : alternate */}
      <span>{count > 0 ? name : 'Anonymous'}</span>
      {/* deps: [{ name: 'count', type: 'server' }, { name: 'name', type: 'server' }] */}

      {/* 6. LogicalExpression - left && right */}
      {config.showBadge && <span className="badge">{count}</span>}
      {/* deps: [{ name: 'config', type: 'server' }, { name: 'count', type: 'server' }] */}

      {/* 7. UnaryExpression - !argument */}
      {!isHovered && <span>Not hovered</span>}
      {/* deps: [{ name: 'isHovered', type: 'client' }] */}

      {/* 8. ArrowFunctionExpression in .map() - body references state */}
      <ul>
        {items.map(item => (
          <li>{item} - {name}</li>
        ))}
      </ul>
      {/* deps: [{ name: 'items', type: 'server' }, { name: 'name', type: 'server' }] */}

      {/* 9. Multiple states in single expression */}
      <span>{name} has {count} {items.length > 0 ? 'items' : 'nothing'}</span>
      {/* deps: [{ name: 'name', type: 'server' }, { name: 'count', type: 'server' }, { name: 'items', type: 'server' }] */}

      {/* 10. Mixed client/server state */}
      <div className={isHovered ? 'hovered' : ''}>
        <span>{count}</span>
      </div>
      {/* deps: [{ name: 'isHovered', type: 'client' }, { name: 'count', type: 'server' }] */}
    </div>
  );
}
