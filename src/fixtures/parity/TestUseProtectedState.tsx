/**
 * Test fixture for useProtectedState hook
 * useProtectedState creates lifted state that parent components cannot access
 * Used for encapsulating internal component state
 */

import { useProtectedState, useState } from '@minimact/core';

export function TestUseProtectedState() {
  // Protected state - parent cannot access via state lifting
  const [internalCounter, setInternalCounter] = useProtectedState(0);
  const [secretValue, setSecretValue] = useProtectedState('hidden');

  // Regular state - can be lifted to parent
  const [publicCounter, setPublicCounter] = useState(0);

  const handleIncrementInternal = () => {
    setInternalCounter(internalCounter + 1);
  };

  const handleIncrementPublic = () => {
    setPublicCounter(publicCounter + 1);
  };

  const handleReveal = () => {
    setSecretValue('revealed!');
  };

  return (
    <div className="protected-state-test">
      <h2>Protected State Test</h2>

      <div className="protected-section">
        <h3>Protected (Internal Only)</h3>
        <p>Internal Counter: {internalCounter}</p>
        <p>Secret: {secretValue}</p>
        <button onClick={handleIncrementInternal}>Increment Internal</button>
        <button onClick={handleReveal}>Reveal Secret</button>
      </div>

      <div className="public-section">
        <h3>Public (Can Be Lifted)</h3>
        <p>Public Counter: {publicCounter}</p>
        <button onClick={handleIncrementPublic}>Increment Public</button>
      </div>
    </div>
  );
}
