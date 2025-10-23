import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { MetricsResponse } from '../types/playground';

interface MetricsDashboardProps {
  metrics: MetricsResponse | null;
  isLoading?: boolean;
}

export function MetricsDashboard({ metrics, isLoading = false }: MetricsDashboardProps) {
  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No data yet. Run interactions to see metrics.</p>
      </div>
    );
  }

  const hitRate = metrics.hitRate;
  const savings = metrics.avgComputedLatency - metrics.avgPredictedLatency;

  // Prepare chart data
  const latencyChartData = [
    {
      name: 'Cached',
      latency: metrics.avgPredictedLatency,
    },
    {
      name: 'Computed',
      latency: metrics.avgComputedLatency,
    },
  ];

  const recentData = metrics.recentInteractions.slice(-10).map((interaction, idx) => ({
    index: idx,
    type: interaction.eventType.charAt(0).toUpperCase(),
    latency: interaction.latencyMs,
    hit: interaction.cacheHit ? 1 : 0,
  }));

  return (
    <div className="flex flex-col h-full gap-4 p-4 bg-slate-900 rounded-lg overflow-auto">
      {/* Title */}
      <h2 className="text-xl font-bold text-slate-100">Prediction Metrics</h2>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Hit Rate */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-sm text-slate-400 mb-1">Cache Hit Rate</p>
          <p className="text-2xl font-bold text-slate-100">{hitRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.cacheHits}/{metrics.totalInteractions}
          </p>
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${hitRate}%` }}
            ></div>
          </div>
        </div>

        {/* Time Savings */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-sm text-slate-400 mb-1">Time Saved/Interaction</p>
          <p className="text-2xl font-bold text-slate-100">{savings.toFixed(1)}ms</p>
          <p className="text-xs text-slate-500 mt-1">
            {savings > 0 ? '↓ Faster' : '↑ Slower'}
          </p>
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${Math.min((savings / 15) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Avg Predicted Latency */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-sm text-slate-400 mb-1">Avg (Cached)</p>
          <p className="text-2xl font-bold text-green-400">{metrics.avgPredictedLatency.toFixed(1)}ms</p>
          <p className="text-xs text-slate-500 mt-1">Prediction hits</p>
        </div>

        {/* Avg Computed Latency */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-sm text-slate-400 mb-1">Avg (Computed)</p>
          <p className="text-2xl font-bold text-red-400">{metrics.avgComputedLatency.toFixed(1)}ms</p>
          <p className="text-xs text-slate-500 mt-1">Prediction misses</p>
        </div>
      </div>

      {/* Latency Comparison Chart */}
      {metrics.avgPredictedLatency > 0 || metrics.avgComputedLatency > 0 ? (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-sm font-semibold text-slate-200 mb-3">Latency Comparison</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={latencyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                  borderRadius: '6px',
                  color: '#f3f4f6',
                }}
                formatter={(value: any) => `${value.toFixed(1)}ms`}
              />
              <Bar dataKey="latency" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Recent Interactions */}
      {metrics.recentInteractions.length > 0 ? (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-sm font-semibold text-slate-200 mb-3">Recent Interactions</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {[...metrics.recentInteractions].reverse().map((interaction, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 bg-slate-700 rounded"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-lg">
                    {interaction.cacheHit ? '✅' : '❌'}
                  </span>
                  <span className="text-sm text-slate-300 capitalize font-medium">
                    {interaction.eventType}
                  </span>
                </div>
                <span
                  className={`text-sm font-mono font-bold ${
                    interaction.cacheHit ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {interaction.latencyMs}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Info */}
      {metrics.totalInteractions === 0 && (
        <div className="text-sm text-slate-400 text-center py-4">
          💡 Interact with the preview to see metrics
        </div>
      )}
    </div>
  );
}
