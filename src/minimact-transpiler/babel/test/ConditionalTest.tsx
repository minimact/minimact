import { useState } from 'react';

export function ConditionalTest() {
  const [isVisible, setIsVisible] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Conditional Test</h1>
      
      {/* Test 1: Literal false */}
      {false && <div>Never shown</div>}
      
      {/* Test 2: State variable */}
      {isVisible && <div>Conditionally visible</div>}
      
      {/* Test 3: After conditional - should have correct hex path */}
      <p>Always shown</p>
      
      {/* Test 4: Ternary */}
      {count > 5 ? <span>High</span> : <span>Low</span>}
      
      {/* Test 5: After ternary */}
      <button onClick={() => setIsVisible(!isVisible)}>Toggle</button>
    </div>
  );
}
