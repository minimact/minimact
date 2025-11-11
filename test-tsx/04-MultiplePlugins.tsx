/**
 * Edge Case Test: Multiple Plugin Elements
 *
 * Tests multiple <Plugin> elements in the same component
 * Key Issue: jsx.cjs:44 uses "return true" (first match wins) for plugin matching
 * Risk: Plugins might be mismatched if multiple exist
 */

import { useState } from '@minimact/core';

interface DataPoint {
  category: string;
  value: number;
}

interface TimeSeriesPoint {
  date: string;
  value: number;
}

export function MultiplePlugins() {
  const [salesData] = useState<DataPoint[]>([
    { category: 'Jan', value: 4500 },
    { category: 'Feb', value: 6200 },
    { category: 'Mar', value: 5800 },
    { category: 'Apr', value: 7100 }
  ]);

  const [revenueData] = useState<DataPoint[]>([
    { category: 'Q1', value: 125000 },
    { category: 'Q2', value: 150000 },
    { category: 'Q3', value: 180000 },
    { category: 'Q4', value: 200000 }
  ]);

  const [productMix] = useState<DataPoint[]>([
    { category: 'Widget A', value: 35 },
    { category: 'Widget B', value: 28 },
    { category: 'Widget C', value: 22 },
    { category: 'Widget D', value: 15 }
  ]);

  const [timeSeriesData] = useState<TimeSeriesPoint[]>([
    { date: '2024-01', value: 100 },
    { date: '2024-02', value: 120 },
    { date: '2024-03', value: 115 },
    { date: '2024-04', value: 140 }
  ]);

  return (
    <div>
      <h1>Multiple Plugin Test Cases</h1>
      <p className="warning">
        ⚠️ Plugin matching uses "first match wins" logic - verify each plugin renders correctly!
      </p>

      {/* Test Case 1: Two Different Chart Types */}
      <div className="test-case">
        <h3>Test 1: BarChart + LineChart</h3>
        <div className="charts-row">
          <div className="chart">
            <h4>Sales (Bar Chart)</h4>
            <Plugin name="BarChart" state={{
              data: salesData,
              width: 400,
              height: 300
            }} />
          </div>

          <div className="chart">
            <h4>Revenue Trend (Line Chart)</h4>
            <Plugin name="LineChart" state={{
              data: timeSeriesData,
              width: 400,
              height: 300
            }} />
          </div>
        </div>
      </div>

      {/* Test Case 2: Multiple Same Type Plugins */}
      <div className="test-case">
        <h3>Test 2: Three BarCharts</h3>
        <div className="charts-grid">
          <div className="chart">
            <h4>Sales</h4>
            <Plugin name="BarChart" state={{
              data: salesData,
              width: 300,
              height: 250
            }} />
          </div>

          <div className="chart">
            <h4>Revenue</h4>
            <Plugin name="BarChart" state={{
              data: revenueData,
              width: 300,
              height: 250
            }} />
          </div>

          <div className="chart">
            <h4>Product Mix</h4>
            <Plugin name="BarChart" state={{
              data: productMix,
              width: 300,
              height: 250
            }} />
          </div>
        </div>
        <p className="expected">
          Expected: Each chart should show DIFFERENT data. If they all show the same data, plugin matching failed!
        </p>
      </div>

      {/* Test Case 3: Mixed Plugin Types */}
      <div className="test-case">
        <h3>Test 3: Four Different Chart Types</h3>
        <div className="charts-grid-4">
          <Plugin name="BarChart" state={{
            data: salesData,
            width: 350,
            height: 250
          }} />

          <Plugin name="LineChart" state={{
            data: timeSeriesData,
            width: 350,
            height: 250
          }} />

          <Plugin name="PieChart" state={{
            data: productMix,
            width: 350,
            height: 250
          }} />

          <Plugin name="AreaChart" state={{
            data: salesData,
            width: 350,
            height: 250
          }} />
        </div>
      </div>

      {/* Test Case 4: Conditionally Rendered Plugins */}
      <div className="test-case">
        <h3>Test 4: Conditional Plugin Rendering</h3>
        {salesData.length > 0 && (
          <Plugin name="BarChart" state={{
            data: salesData,
            width: 500,
            height: 300
          }} />
        )}

        {timeSeriesData.length > 0 && (
          <Plugin name="LineChart" state={{
            data: timeSeriesData,
            width: 500,
            height: 300
          }} />
        )}
      </div>

      {/* Test Case 5: Multiple Plugins with Static Names (not dynamic) */}
      <div className="test-case">
        <h3>Test 5: Multiple Same-Type Plugins with Different Data</h3>
        <p className="note">
          ℹ️ Note: Plugin names must be static string literals. Dynamic names like name={"{config.type}"} are not supported.
        </p>
        <div className="charts-row">
          <div className="chart">
            <h4>Sales</h4>
            <Plugin name="BarChart" state={{
              data: salesData,
              width: 400,
              height: 250
            }} />
          </div>
          <div className="chart">
            <h4>Revenue</h4>
            <Plugin name="BarChart" state={{
              data: revenueData,
              width: 400,
              height: 250
            }} />
          </div>
          <div className="chart">
            <h4>Products</h4>
            <Plugin name="BarChart" state={{
              data: productMix,
              width: 400,
              height: 250
            }} />
          </div>
        </div>
        <p className="expected">
          Expected: Each chart shows different data (Sales, Revenue, Products)
        </p>
      </div>

      {/* Test Case 6: Nested Plugin Rendering */}
      <div className="test-case">
        <h3>Test 6: Plugins in Nested Structures</h3>
        <div className="dashboard">
          <div className="row">
            <div className="col">
              <Plugin name="BarChart" state={{ data: salesData, width: 300, height: 200 }} />
            </div>
            <div className="col">
              <div className="nested">
                <Plugin name="LineChart" state={{ data: timeSeriesData, width: 300, height: 200 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Case 7: Plugin with Version */}
      <div className="test-case">
        <h3>Test 7: Plugin with Version Specifier</h3>
        <Plugin
          name="BarChart"
          version="1.0.0"
          state={{
            data: salesData,
            width: 500,
            height: 300
          }}
        />
      </div>
    </div>
  );
}
