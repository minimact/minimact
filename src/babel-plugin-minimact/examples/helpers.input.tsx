/**
 * Example: helpers.cjs - String escaping, component name extraction
 */
import { useState } from '@minimact/core';

// Various component declaration styles that getComponentName() handles
function FunctionDeclaration() {
  return <div>Function declaration</div>;
}

const ArrowFunction = () => {
  return <div>Arrow function</div>;
};

const FunctionExpression = function() {
  return <div>Function expression</div>;
};

export function ExportedFunction() {
  return <div>Exported function</div>;
}

export const ExportedArrow = () => {
  return <div>Exported arrow</div>;
};

// String escaping examples
export function HelpersExample() {
  const [text, setText] = useState('Hello "World"');
  const [path, setPath] = useState('C:\\Users\\Name');
  const [special, setSpecial] = useState('Line1\nLine2\tTabbed');

  return (
    <div>
      <p title="Quote: \"escaped\"">{text}</p>
      <p data-path="C:\\path\\to\\file">{path}</p>
      <code>{special}</code>
    </div>
  );
}
