/**
 * Feature Test: Plugin Detection
 *
 * Tests detection and handling of <Plugin> elements with dynamic props.
 *
 * Pattern: <Plugin name="pluginName" prop1={value1} prop2={value2} />
 *
 * Note: This feature is specific to Minimact's plugin system for
 * integrating third-party JavaScript libraries (charts, maps, etc.)
 */

export function PluginDetectionTest() {
  const salesData = [
    { month: 'Jan', sales: 1000 },
    { month: 'Feb', sales: 1500 },
    { month: 'Mar', sales: 1200 }
  ];

  const revenueData = [
    { month: 'Jan', revenue: 50000 },
    { month: 'Feb', revenue: 75000 },
    { month: 'Mar', revenue: 60000 }
  ];

  const mapCenter = { lat: 37.7749, lng: -122.4194 };
  const markers = [
    { id: 1, position: { lat: 37.7749, lng: -122.4194 }, title: 'San Francisco' },
    { id: 2, position: { lat: 34.0522, lng: -118.2437 }, title: 'Los Angeles' }
  ];

  return (
    <div>
      {/* Chart plugin - bar chart */}
      <div>
        <h3>Sales Chart</h3>
        <Plugin
          name="chart"
          data={salesData}
          type="bar"
          width={600}
          height={400}
          options={{ responsive: true }}
        />
      </div>

      {/* Chart plugin - line chart */}
      <div>
        <h3>Revenue Chart</h3>
        <Plugin
          name="chart"
          data={revenueData}
          type="line"
          width={600}
          height={400}
        />
      </div>

      {/* Map plugin */}
      <div>
        <h3>Location Map</h3>
        <Plugin
          name="map"
          center={mapCenter}
          markers={markers}
          zoom={10}
          style={{ width: '100%', height: '400px' }}
        />
      </div>

      {/* Date picker plugin */}
      <div>
        <h3>Select Date</h3>
        <Plugin
          name="datepicker"
          format="MM/DD/YYYY"
          minDate="2024-01-01"
          maxDate="2024-12-31"
        />
      </div>

      {/* Rich text editor plugin */}
      <div>
        <h3>Editor</h3>
        <Plugin
          name="editor"
          placeholder="Enter text here..."
          toolbar={['bold', 'italic', 'underline', 'link']}
          height={300}
        />
      </div>

      {/* Code editor plugin with syntax highlighting */}
      <div>
        <h3>Code Editor</h3>
        <Plugin
          name="code-editor"
          language="javascript"
          theme="monokai"
          showLineNumbers={true}
          readOnly={false}
        />
      </div>
    </div>
  );
}
