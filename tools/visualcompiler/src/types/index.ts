// Core types for Visual Compiler
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComponentBounds extends BoundingBox {
  component: string;
  instance?: string;
  selector: string;
  parentComponent?: string | null;
  childComponents: string[];
}

export interface Resolution {
  name: string;
  width: number;
  height: number;
}

export interface Overlap {
  width: number;
  height: number;
  area: number;
  percentA: number; // Overlap as percentage of component A's area
  percentB: number; // Overlap as percentage of component B's area
}

export interface Gap {
  x: number;
  y: number;
  horizontal: boolean;
  vertical: boolean;
}

export interface LayoutIssue {
  code: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  componentA: string;
  componentB?: string;
  resolution: string;
  details: Record<string, any>;
}

export interface AnalysisReport {
  resolution: Resolution;
  components: ComponentBounds[];
  issues: LayoutIssue[];
  timestamp: number;
  renderTime: number;
}

export interface VisualCompilerConfig {
  resolutions: Resolution[];
  watchPaths: string[];
  outputPath?: string;
  timeout: number;
  maxIterations: number;
  errorCodes: Record<string, LayoutIssueDefinition>;
}

export interface LayoutIssueDefinition {
  type: 'error' | 'warning' | 'info';
  description: string;
  severity: number;
}

// Standard resolutions
export const STANDARD_RESOLUTIONS: Resolution[] = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

// Error code definitions
export const ERROR_CODES: Record<string, LayoutIssueDefinition> = {
  'E101': {
    type: 'error',
    description: 'Component overlap detected',
    severity: 10
  },
  'E301': {
    type: 'error',
    description: 'Component extends beyond viewport',
    severity: 8
  },
  'W201': {
    type: 'warning',
    description: 'Unusual gap between components',
    severity: 5
  },
  'W202': {
    type: 'warning',
    description: 'Components too close together',
    severity: 4
  },
  'I401': {
    type: 'info',
    description: 'Components properly aligned',
    severity: 1
  },
  'I402': {
    type: 'info',
    description: 'Responsive layout working correctly',
    severity: 1
  },
  'I403': {
    type: 'info',
    description: 'Component extends below viewport (normal scrollable content)',
    severity: 1
  }
};