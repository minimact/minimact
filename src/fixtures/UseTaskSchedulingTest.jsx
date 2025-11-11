import { useState, useMicroTask, useMacroTask } from '@minimact/core';

function UseTaskSchedulingTest() {
  const [measurements, setMeasurements] = useState([]);
  const [logs, setLogs] = useState([]);

  const handleMeasure = () => {
    useMicroTask(() => {
      const height = document.body.getBoundingClientRect().height;
      setMeasurements([...measurements, { height, time: Date.now() }]);
    });

    useMacroTask(() => {
      setLogs([...logs, 'Deferred task executed']);
    }, 100);
  };

  return (
    <div>
      <h1>Task Scheduling Test</h1>
      <button onClick={handleMeasure}>Run Tasks</button>
      <div>Measurements: {measurements.length}</div>
      <div>Logs: {logs.length}</div>
    </div>
  );
}

export default UseTaskSchedulingTest;
