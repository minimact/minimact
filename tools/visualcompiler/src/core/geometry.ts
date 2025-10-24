import { BoundingBox, ComponentBounds, Overlap, Gap, LayoutIssue, Resolution } from '../types/index.js';

export class GeometryEngine {

  /**
   * Calculate overlap between two bounding boxes
   */
  static calculateOverlap(a: BoundingBox, b: BoundingBox): Overlap {
    const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

    const overlapArea = overlapX * overlapY;
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;

    return {
      width: overlapX,
      height: overlapY,
      area: overlapArea,
      percentA: areaA > 0 ? (overlapArea / areaA) * 100 : 0,
      percentB: areaB > 0 ? (overlapArea / areaB) * 100 : 0
    };
  }

  /**
   * Calculate gap between two components
   */
  static calculateGap(a: BoundingBox, b: BoundingBox): Gap {
    // Calculate horizontal gap (assuming b is to the right of a)
    const horizontalGap = Math.max(0, b.x - (a.x + a.width));

    // Calculate vertical gap (assuming b is below a)
    const verticalGap = Math.max(0, b.y - (a.y + a.height));

    // Determine if they're horizontally or vertically adjacent
    const horizontallyAdjacent = Math.abs(a.y - b.y) < 10 ||
                                 (a.y < b.y + b.height && b.y < a.y + a.height);
    const verticallyAdjacent = Math.abs(a.x - b.x) < 10 ||
                               (a.x < b.x + b.width && b.x < a.x + a.width);

    return {
      x: horizontalGap,
      y: verticalGap,
      horizontal: horizontallyAdjacent && horizontalGap > 0,
      vertical: verticallyAdjacent && verticalGap > 0
    };
  }

  /**
   * Check if a component extends beyond the viewport
   */
  static checkViewportOverflow(component: BoundingBox, viewport: Resolution): {
    overflowX: number;
    overflowY: number;
    hasOverflow: boolean;
  } {
    const overflowX = Math.max(0, (component.x + component.width) - viewport.width);
    const overflowY = Math.max(0, (component.y + component.height) - viewport.height);

    return {
      overflowX,
      overflowY,
      hasOverflow: overflowX > 0 || overflowY > 0
    };
  }

  /**
   * Check if components are aligned
   */
  static checkAlignment(a: BoundingBox, b: BoundingBox, tolerance: number = 2): {
    leftAligned: boolean;
    rightAligned: boolean;
    topAligned: boolean;
    bottomAligned: boolean;
    centerAligned: boolean;
  } {
    return {
      leftAligned: Math.abs(a.x - b.x) <= tolerance,
      rightAligned: Math.abs((a.x + a.width) - (b.x + b.width)) <= tolerance,
      topAligned: Math.abs(a.y - b.y) <= tolerance,
      bottomAligned: Math.abs((a.y + a.height) - (b.y + b.height)) <= tolerance,
      centerAligned: Math.abs((a.x + a.width/2) - (b.x + b.width/2)) <= tolerance
    };
  }

  /**
   * Check if two components have a parent-child relationship
   */
  static isParentChildRelationship(a: ComponentBounds, b: ComponentBounds): boolean {
    // Get the unique identifiers for components (include instance if present)
    const getComponentId = (comp: ComponentBounds) => {
      return comp.instance ? `${comp.component}-${comp.instance}` : comp.component;
    };

    const aId = getComponentId(a);
    const bId = getComponentId(b);

    // Check if A is parent of B
    if (a.childComponents.includes(bId)) {
      return true;
    }

    // Check if B is parent of A
    if (b.childComponents.includes(aId)) {
      return true;
    }

    // Check if A's parent is B
    if (a.parentComponent === bId) {
      return true;
    }

    // Check if B's parent is A
    if (b.parentComponent === aId) {
      return true;
    }

    return false;
  }

  /**
   * Analyze spatial relationships between all components
   */
  static analyzeLayout(components: ComponentBounds[], resolution: Resolution): LayoutIssue[] {
    const issues: LayoutIssue[] = [];

    // Check viewport overflow for each component
    for (const component of components) {
      const overflow = this.checkViewportOverflow(component, resolution);

      // Handle horizontal overflow (problematic - causes horizontal scrolling)
      if (overflow.overflowX > 0) {
        issues.push({
          code: `E301${resolution.name === 'mobile' ? 'RM' : resolution.name === 'tablet' ? 'RT' : ''}`,
          type: 'error',
          message: `${component.component} extends beyond viewport horizontally`,
          componentA: component.component,
          resolution: resolution.name,
          details: {
            overflowX: overflow.overflowX,
            overflowY: 0, // Only report horizontal overflow as error
            componentBounds: component,
            viewport: resolution
          }
        });
      }

      // Handle vertical overflow (informational - normal for scrollable content)
      if (overflow.overflowY > 0 && overflow.overflowX === 0) {
        issues.push({
          code: `I403${resolution.name === 'mobile' ? 'RM' : resolution.name === 'tablet' ? 'RT' : ''}`,
          type: 'info',
          message: `${component.component} extends below viewport (scrollable content)`,
          componentA: component.component,
          resolution: resolution.name,
          details: {
            overflowX: 0,
            overflowY: overflow.overflowY,
            componentBounds: component,
            viewport: resolution
          }
        });
      }
    }

    // Check relationships between component pairs
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const a = components[i];
        const b = components[j];

        // Check overlap - but skip if they have parent-child relationship
        const overlap = this.calculateOverlap(a, b);
        if (overlap.area > 0) {
          // Skip overlap detection for parent-child relationships (containment is expected)
          if (!this.isParentChildRelationship(a, b)) {
            issues.push({
              code: `E101${resolution.name === 'mobile' ? 'RM' : resolution.name === 'tablet' ? 'RT' : ''}`,
              type: 'error',
              message: `${a.component} overlaps ${b.component}`,
              componentA: a.component,
              componentB: b.component,
              resolution: resolution.name,
              details: {
                overlap: `${overlap.width}x${overlap.height} pixels`,
                percentageA: overlap.percentA.toFixed(1),
                percentageB: overlap.percentB.toFixed(1),
                area: overlap.area
              }
            });
          }
        }

        // Check gaps
        const gap = this.calculateGap(a, b);
        if (gap.horizontal || gap.vertical) {
          // Flag unusually large gaps
          const isLargeGap = gap.x > 100 || gap.y > 100;
          if (isLargeGap) {
            issues.push({
              code: `W201${resolution.name === 'mobile' ? 'RM' : resolution.name === 'tablet' ? 'RT' : ''}`,
              type: 'warning',
              message: `Large gap between ${a.component} and ${b.component}`,
              componentA: a.component,
              componentB: b.component,
              resolution: resolution.name,
              details: {
                xGap: `${gap.x}px`,
                yGap: `${gap.y}px`,
                horizontal: gap.horizontal,
                vertical: gap.vertical
              }
            });
          }

          // Flag components that are too close
          const isTooClose = (gap.x > 0 && gap.x < 4) || (gap.y > 0 && gap.y < 4);
          if (isTooClose) {
            issues.push({
              code: `W202${resolution.name === 'mobile' ? 'RM' : resolution.name === 'tablet' ? 'RT' : ''}`,
              type: 'warning',
              message: `${a.component} and ${b.component} too close together`,
              componentA: a.component,
              componentB: b.component,
              resolution: resolution.name,
              details: {
                xGap: `${gap.x}px`,
                yGap: `${gap.y}px`
              }
            });
          }
        }

        // Check alignment
        const alignment = this.checkAlignment(a, b);
        if (alignment.leftAligned || alignment.rightAligned || alignment.centerAligned) {
          issues.push({
            code: `I401${resolution.name === 'mobile' ? 'RM' : resolution.name === 'tablet' ? 'RT' : ''}`,
            type: 'info',
            message: `${a.component} and ${b.component} properly aligned`,
            componentA: a.component,
            componentB: b.component,
            resolution: resolution.name,
            details: {
              leftAligned: alignment.leftAligned,
              rightAligned: alignment.rightAligned,
              centerAligned: alignment.centerAligned,
              topAligned: alignment.topAligned,
              bottomAligned: alignment.bottomAligned
            }
          });
        }
      }
    }

    return issues;
  }
}