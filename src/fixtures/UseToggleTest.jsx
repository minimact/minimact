import { useToggle } from '@minimact/core';

function ToggleExample() {
  const [isOpen, toggle] = useToggle(false);

  return (
    <div className="toggle-example">
      <button onClick={toggle}>
        {isOpen ? 'Hide' : 'Show'} Panel
      </button>

      {isOpen && (
        <div className="panel">
          <p>This panel can be toggled on and off.</p>
          <p>Current state: {isOpen ? 'Open' : 'Closed'}</p>
        </div>
      )}
    </div>
  );
}
