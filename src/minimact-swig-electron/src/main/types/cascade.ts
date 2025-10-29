/**
 * Types for Reactive DOM Highlighting (Cascade Visualization)
 */

/**
 * Information about a single DOM patch
 */
export interface DOMPatchInfo {
  type: 'setText' | 'setAttribute' | 'addClass' | 'removeClass' | 'insertElement' | 'removeElement' | 'replaceElement';
  selector: string;           // CSS selector or XPath to target element
  oldValue: any;              // Previous value
  newValue: any;              // New value
  order: number;              // Order within wave (0-indexed)
  attributeName?: string;     // For setAttribute/removeAttribute
  className?: string;         // For addClass/removeClass
}

/**
 * A single wave of reactive changes
 */
export interface ReactiveWave {
  waveNumber: number;           // 0 = primary, 1 = secondary, 2 = tertiary, etc.
  triggeringState: string[];    // State keys that triggered this wave (e.g., ["isOpen"])
  affectedState: string[];      // State keys affected by this wave (e.g., ["animating"])
  domElements: DOMPatchInfo[];  // DOM patches that will be applied
  timestamp: number;            // When this wave was computed
  isCycle?: boolean;            // True if cycle detected
  cycleState?: string;          // State key that caused the cycle
}

/**
 * Result of cascade preview computation
 */
export interface PreviewCascadeResult {
  waves: ReactiveWave[];
  totalWaves: number;
  hasCycle: boolean;
  totalAffectedElements: number;
  computationTime: number;      // Time taken to compute cascade (ms)
}

/**
 * Request to preview state change cascade
 */
export interface PreviewCascadeRequest {
  componentId: string;
  stateKey: string;
  newValue: any;
}

/**
 * Options for wave highlighting
 */
export interface WaveHighlightOptions {
  animationDuration: number;    // ms between waves (default: 500)
  showLabels: boolean;          // Show "Wave 1", "Wave 2", etc. (default: true)
  colorScheme: 'rainbow' | 'heat' | 'ocean';  // Color scheme (default: 'rainbow')
}

/**
 * Color schemes for wave visualization
 */
export const WaveColorSchemes = {
  rainbow: [
    '#FF6B6B',  // Red (Wave 0 - Primary)
    '#4ECDC4',  // Cyan (Wave 1 - Secondary)
    '#45B7D1',  // Blue (Wave 2 - Tertiary)
    '#FFA07A',  // Orange (Wave 3)
    '#98D8C8',  // Mint (Wave 4)
    '#F7DC6F',  // Yellow (Wave 5)
    '#BB8FCE'   // Purple (Wave 6+)
  ],
  heat: [
    '#FFFF00',  // Yellow (Cold - Fast)
    '#FFA500',  // Orange
    '#FF4500',  // Red-Orange
    '#FF0000',  // Red
    '#8B0000'   // Dark Red (Hot - Slow)
  ],
  ocean: [
    '#E0F7FA',  // Light Cyan (Surface - Shallow)
    '#80DEEA',  // Cyan
    '#26C6DA',  // Dark Cyan
    '#00ACC1',  // Darker Cyan
    '#00838F'   // Deep Cyan (Depth - Deep)
  ]
};
