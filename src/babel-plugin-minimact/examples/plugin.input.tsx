/**
 * Example: plugin.cjs - Generates Plugin node C#
 */
import { useState } from '@minimact/core';
import { Plugin } from '@minimact/plugin';

export function PluginExample() {
  const [chartData, setChartData] = useState({
    labels: ['Jan', 'Feb', 'Mar'],
    values: [10, 20, 30]
  });

  const [tableConfig, setTableConfig] = useState({
    columns: ['Name', 'Age', 'City'],
    sortable: true,
    paginated: true
  });

  return (
    <div className="dashboard">
      <h1>Analytics</h1>

      {/* Basic plugin */}
      <Plugin name="bar-chart" state={chartData} />

      {/* Plugin with version */}
      <Plugin name="data-table" version="2.0" state={tableConfig} />

      {/* Plugin with config */}
      <Plugin
        name="pie-chart"
        state={chartData}
        config={{ showLegend: true, animate: true }}
      />
    </div>
  );
}
