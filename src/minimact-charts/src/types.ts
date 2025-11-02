/**
 * Chart state types matching C# models
 */

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartState {
  width: number;
  height: number;
  margin: ChartMargin;
  backgroundFill?: string;
  title?: string;
  className?: string;
}

export interface DataPoint {
  category: string;
  value: number;
  label?: string;
  fill?: string;
  metadata?: Record<string, any>;
}

export interface XAxisConfig {
  dataKey?: string;
  label?: string;
  showLine?: boolean;
  showTicks?: boolean;
  showTickLabels?: boolean;
  tickLabelFontSize?: number;
  tickLabelColor?: string;
  lineColor?: string;
  lineWidth?: number;
}

export interface YAxisConfig {
  dataKey?: string;
  label?: string;
  domain?: [number, number];
  showLine?: boolean;
  showTicks?: boolean;
  showTickLabels?: boolean;
  tickCount?: number;
  useNiceTicks?: boolean;
  tickLabelFontSize?: number;
  tickLabelColor?: string;
  lineColor?: string;
  lineWidth?: number;
}

export interface TooltipConfig {
  enabled: boolean;
  formatter?: string;
}

export interface LegendConfig {
  enabled: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface BarChartState extends ChartState {
  data: DataPoint[];
  barFill?: string;
  barStroke?: string;
  barStrokeWidth?: number;
  barWidthRatio?: number;
  xAxis?: XAxisConfig;
  yAxis?: YAxisConfig;
  showGrid?: boolean;
  gridColor?: string;
  gridStrokeWidth?: number;
}

export interface LineChartState extends ChartState {
  data: DataPoint[];
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  fill?: string;
  smooth?: boolean;
  tension?: number;
  xAxis?: XAxisConfig;
  yAxis?: YAxisConfig;
  showGrid?: boolean;
  gridColor?: string;
  gridStrokeWidth?: number;
}

export interface PieChartState extends ChartState {
  data: DataPoint[];
  innerRadius?: number;
  outerRadius?: number;
  cx?: string | number;
  cy?: string | number;
  startAngle?: number;
  endAngle?: number;
  tooltip?: TooltipConfig;
  legend?: LegendConfig;
}

export interface AreaChartState extends ChartState {
  data: DataPoint[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  smooth?: boolean;
  tension?: number;
  xAxis?: XAxisConfig;
  yAxis?: YAxisConfig;
  showGrid?: boolean;
  gridColor?: string;
  gridStrokeWidth?: number;
}
