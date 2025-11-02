/**
 * @minimact/charts - Client-side types for Minimact Charts
 *
 * This package provides TypeScript types for the Minimact Charts library.
 * All rendering happens server-side in C#. This package only provides
 * type definitions for IntelliSense and type safety.
 */

export * from './types';

// Re-export for convenience
export type {
  ChartState,
  ChartMargin,
  DataPoint,
  BarChartState,
  LineChartState,
  PieChartState,
  AreaChartState,
  XAxisConfig,
  YAxisConfig,
  TooltipConfig,
  LegendConfig
} from './types';
