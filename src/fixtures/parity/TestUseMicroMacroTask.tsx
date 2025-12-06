/**
 * Test fixture for useMicroTask and useMacroTask hooks
 * useMicroTask schedules a callback as a microtask (after current task, before rendering)
 * useMacroTask schedules a callback as a macrotask with optional delay
 */

import { useMicroTask, useMacroTask, useState } from '@minimact/core';

export function TestUseMicroMacroTask() {
  const [log, setLog] = useState<string[]>([]);
  const [counter, setCounter] = useState(0);

  // Microtask - runs after current synchronous code, before next render
  // Useful for batching state updates or deferring computations
  const scheduleMicro = useMicroTask(() => {
    setLog(prev => [...prev, `Microtask executed at ${Date.now()}`]);
  });

  // Another microtask with data processing
  const processBatch = useMicroTask(() => {
    // This runs after the click handler completes but before paint
    const processed = counter * 2;
    setLog(prev => [...prev, `Processed value: ${processed}`]);
  });

  // Macrotask - runs in a future event loop iteration
  // Similar to setTimeout but managed by Minimact
  const scheduleMacro = useMacroTask(() => {
    setLog(prev => [...prev, `Macrotask (immediate) at ${Date.now()}`]);
  });

  // Macrotask with delay (like setTimeout)
  const scheduleDelayed = useMacroTask(() => {
    setLog(prev => [...prev, `Delayed macrotask (500ms) at ${Date.now()}`]);
  }, 500);

  // Macrotask for debounced operations
  const debouncedSave = useMacroTask(() => {
    setLog(prev => [...prev, `Debounced save triggered`]);
    // Save to server...
  }, 1000);

  // Macrotask for polling
  const pollStatus = useMacroTask(() => {
    setLog(prev => [...prev, `Polling status...`]);
    // Check status and maybe schedule again
  }, 2000);

  const handleClick = () => {
    setLog(prev => [...prev, `Click handler start`]);

    // This will run after the click handler but before render
    scheduleMicro();

    setCounter(c => c + 1);
    processBatch();

    // This will run in the next event loop iteration
    scheduleMacro();

    // This will run after 500ms
    scheduleDelayed();

    setLog(prev => [...prev, `Click handler end`]);
  };

  const handleDebounceTest = () => {
    setLog(prev => [...prev, `Triggering debounced save...`]);
    debouncedSave();
  };

  const handlePollTest = () => {
    setLog(prev => [...prev, `Starting poll...`]);
    pollStatus();
  };

  const clearLog = () => {
    setLog([]);
  };

  return (
    <div className="task-scheduling-test">
      <h2>Micro/Macro Task Test</h2>

      <div className="controls">
        <button onClick={handleClick}>
          Test Micro + Macro Tasks
        </button>
        <button onClick={handleDebounceTest}>
          Test Debounce (1s)
        </button>
        <button onClick={handlePollTest}>
          Test Poll (2s)
        </button>
        <button onClick={clearLog}>
          Clear Log
        </button>
      </div>

      <div className="counter">
        Counter: {counter}
      </div>

      <div className="log">
        <h3>Execution Log</h3>
        <ul>
          {log.map((entry, i) => (
            <li key={i}>{entry}</li>
          ))}
        </ul>
      </div>

      <div className="explanation">
        <h3>Expected Order:</h3>
        <ol>
          <li>Click handler start</li>
          <li>Click handler end</li>
          <li>Microtask executed (before render)</li>
          <li>Processed value (microtask)</li>
          <li>Macrotask immediate (next event loop)</li>
          <li>Delayed macrotask (after 500ms)</li>
        </ol>
      </div>
    </div>
  );
}
