/**
 * Feature Test: Ternary in Text
 *
 * Tests ternary operator (? :) inside text content.
 *
 * Pattern: {condition ? 'value1' : 'value2'}
 */

export function TernaryInTextTest() {
  const isExpanded = false;
  const isOnline = true;
  const count = 5;
  const hasErrors = false;

  return (
    <div>
      {/* Simple ternary in text */}
      <button>
        {isExpanded ? 'Hide' : 'Show'} Details
      </button>

      {/* Ternary for status */}
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>

      {/* Ternary with expressions */}
      <p>Items: {count > 0 ? `${count} items` : 'No items'}</p>

      {/* Multiple ternaries */}
      <div>
        <span>{hasErrors ? '❌' : '✓'}</span>
        <span>{hasErrors ? 'Failed' : 'Success'}</span>
      </div>

      {/* Nested ternaries */}
      <p>
        {count === 0
          ? 'Empty'
          : count === 1
            ? 'One item'
            : `${count} items`}
      </p>

      {/* Ternary in attribute and text */}
      <div className={isExpanded ? 'expanded' : 'collapsed'}>
        Content is {isExpanded ? 'visible' : 'hidden'}
      </div>
    </div>
  );
}
