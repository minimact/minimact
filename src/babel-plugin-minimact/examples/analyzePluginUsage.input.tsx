/**
 * Example: analyzePluginUsage.cjs - Detects <Plugin> component usage
 */
import { useState } from '@minimact/core';
import { Plugin } from '@minimact/plugin';

export function PluginUsageExample() {
  const [chartData, setChartData] = useState([1, 2, 3, 4, 5]);
  const [tableData, setTableData] = useState([{ id: 1, name: 'Test' }]);

  return (
    <div>
      <h1>Dashboard</h1>
      <Plugin name="chart" version="1.0" state={chartData} />
      <Plugin name="data-table" state={tableData} config={{ sortable: true }} />
    </div>
  );
}
