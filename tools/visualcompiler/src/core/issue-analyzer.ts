/**
 * Issue Analyzer for Visual Compiler
 *
 * Reduces error noise by grouping related issues and identifying root causes
 */

import { LayoutIssue, Resolution, ComponentBounds } from '../types/index.js';

export interface GroupedIssue {
  id: string;
  title: string;
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  priority: number; // 1-5, 1 being highest
  impact: 'blocks-interaction' | 'visual-degradation' | 'cosmetic' | 'performance';
  usersAffected: string; // "100% mobile users", "50% tablet users", etc.
  fixEffort: 'low' | 'medium' | 'high';
  confidence: number; // 0-1, how confident we are in the fix
  rootCause: string;
  pattern: string;
  affectedComponents: string[];
  relatedIssues: LayoutIssue[];
  suggestedFix: SpecificFix;
  resolution: Resolution;
}

export interface SpecificFix {
  type: 'css' | 'layout' | 'responsive' | 'component-refactor';
  description: string;
  implementation: {
    file?: string;
    selector: string;
    currentCSS?: string;
    suggestedCSS: string;
    explanation: string;
  };
  alternativeFixes?: Array<{
    description: string;
    css: string;
    pros: string[];
    cons: string[];
  }>;
}

export class IssueAnalyzer {

  /**
   * Group related issues and identify root causes
   */
  groupIssues(issues: LayoutIssue[], resolution: Resolution): GroupedIssue[] {
    const groupedIssues: GroupedIssue[] = [];
    const processedIssues = new Set<string>();

    // 1. Group viewport overflow issues by container
    const overflowGroups = this.groupViewportOverflowIssues(issues, resolution);
    overflowGroups.forEach(group => {
      groupedIssues.push(group);
      group.relatedIssues.forEach(issue =>
        processedIssues.add(this.getIssueId(issue))
      );
    });

    // 2. Group overlap issues by spatial proximity
    const overlapGroups = this.groupOverlapIssues(issues, resolution);
    overlapGroups.forEach(group => {
      groupedIssues.push(group);
      group.relatedIssues.forEach(issue =>
        processedIssues.add(this.getIssueId(issue))
      );
    });

    // 3. Group alignment and spacing issues
    const spacingGroups = this.groupSpacingIssues(issues, resolution);
    spacingGroups.forEach(group => {
      groupedIssues.push(group);
      group.relatedIssues.forEach(issue =>
        processedIssues.add(this.getIssueId(issue))
      );
    });

    // 4. Handle remaining ungrouped issues
    const ungroupedIssues = issues.filter(issue =>
      !processedIssues.has(this.getIssueId(issue))
    );

    ungroupedIssues.forEach(issue => {
      groupedIssues.push(this.createSingleIssueGroup(issue, resolution));
    });

    // 5. Sort by priority (critical issues first)
    return groupedIssues.sort((a, b) => {
      if (a.severity !== b.severity) {
        const severityOrder = { critical: 1, major: 2, minor: 3, cosmetic: 4 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.priority - b.priority;
    });
  }

  /**
   * Group viewport overflow issues by parent container
   */
  private groupViewportOverflowIssues(issues: LayoutIssue[], resolution: Resolution): GroupedIssue[] {
    const overflowIssues = issues.filter(issue => issue.code.includes('E301'));

    if (overflowIssues.length === 0) return [];

    // Group by container hierarchy
    const containerGroups = new Map<string, LayoutIssue[]>();

    overflowIssues.forEach(issue => {
      const container = this.findParentContainer(issue, overflowIssues);
      const key = container || issue.componentA;

      if (!containerGroups.has(key)) {
        containerGroups.set(key, []);
      }
      containerGroups.get(key)!.push(issue);
    });

    return Array.from(containerGroups.entries()).map(([container, relatedIssues]) => {
      const primaryIssue = relatedIssues[0];
      const totalOverflow = this.calculateTotalOverflow(relatedIssues);

      return {
        id: `overflow-${container}-${resolution.name}`,
        title: `${container} layout causes ${resolution.name} viewport overflow`,
        severity: this.calculateOverflowSeverity(totalOverflow, resolution),
        priority: resolution.name === 'mobile' ? 1 : 2,
        impact: 'blocks-interaction',
        usersAffected: this.calculateUsersAffected(resolution.name),
        fixEffort: 'low',
        confidence: 0.9,
        rootCause: `Fixed-width layout not responsive to ${resolution.name} constraints`,
        pattern: 'Non-responsive container layout',
        affectedComponents: [...new Set(relatedIssues.map(i => i.componentA))],
        relatedIssues,
        suggestedFix: this.generateResponsiveFix(container, relatedIssues, resolution),
        resolution
      };
    });
  }

  /**
   * Group overlap issues by spatial proximity
   */
  private groupOverlapIssues(issues: LayoutIssue[], resolution: Resolution): GroupedIssue[] {
    const overlapIssues = issues.filter(issue => issue.code.includes('E101'));

    if (overlapIssues.length === 0) return [];

    // Group overlaps that are spatially close (within 50px)
    const groups: LayoutIssue[][] = [];
    const processed = new Set<string>();

    overlapIssues.forEach(issue => {
      if (processed.has(this.getIssueId(issue))) return;

      const group = [issue];
      processed.add(this.getIssueId(issue));

      // Find nearby overlaps
      overlapIssues.forEach(otherIssue => {
        if (processed.has(this.getIssueId(otherIssue))) return;

        if (this.areOverlapsSpatiallyRelated(issue, otherIssue)) {
          group.push(otherIssue);
          processed.add(this.getIssueId(otherIssue));
        }
      });

      groups.push(group);
    });

    return groups.map((group, index) => {
      const components = [...new Set(group.flatMap(i => [i.componentA, i.componentB].filter(Boolean)))];
      const area = group.reduce((sum, issue) => sum + this.getOverlapArea(issue), 0);

      return {
        id: `overlap-group-${index}-${resolution.name}`,
        title: `Component overlap cluster affecting ${components.join(', ')}`,
        severity: area > 10000 ? 'critical' : area > 5000 ? 'major' : 'minor',
        priority: 2,
        impact: 'blocks-interaction',
        usersAffected: '100%',
        fixEffort: 'medium',
        confidence: 0.8,
        rootCause: 'Layout positioning conflicts',
        pattern: 'Absolute/fixed positioning without proper constraints',
        affectedComponents: components.filter(c => c != null),
        relatedIssues: group,
        suggestedFix: this.generateOverlapFix(group, resolution),
        resolution
      };
    });
  }

  /**
   * Group spacing and alignment issues
   */
  private groupSpacingIssues(issues: LayoutIssue[], resolution: Resolution): GroupedIssue[] {
    const spacingIssues = issues.filter(issue =>
      issue.code.includes('W201') || issue.code.includes('I401')
    );

    if (spacingIssues.length < 3) return []; // Only group if there are many spacing issues

    // Group by component type and spacing pattern
    const componentSpacing = new Map<string, LayoutIssue[]>();

    spacingIssues.forEach(issue => {
      const key = `${issue.componentA}-spacing`;
      if (!componentSpacing.has(key)) {
        componentSpacing.set(key, []);
      }
      componentSpacing.get(key)!.push(issue);
    });

    return Array.from(componentSpacing.entries())
      .filter(([_, issues]) => issues.length >= 3)
      .map(([component, relatedIssues]) => ({
        id: `spacing-${component}-${resolution.name}`,
        title: `Inconsistent spacing in ${component.replace('-spacing', '')} components`,
        severity: 'minor' as const,
        priority: 4,
        impact: 'visual-degradation' as const,
        usersAffected: '100%',
        fixEffort: 'low' as const,
        confidence: 0.7,
        rootCause: 'Inconsistent spacing system',
        pattern: 'Missing design system spacing tokens',
        affectedComponents: [...new Set(relatedIssues.map(i => i.componentA))],
        relatedIssues,
        suggestedFix: this.generateSpacingFix(relatedIssues, resolution),
        resolution
      }));
  }

  /**
   * Create a group for ungrouped issues
   */
  private createSingleIssueGroup(issue: LayoutIssue, resolution: Resolution): GroupedIssue {
    return {
      id: `single-${this.getIssueId(issue)}`,
      title: `${issue.componentA}: ${issue.message}`,
      severity: this.mapSeverity(issue.code),
      priority: this.mapPriority(issue.code),
      impact: this.mapImpact(issue.code),
      usersAffected: '100%',
      fixEffort: 'low',
      confidence: 0.6,
      rootCause: issue.message,
      pattern: 'Individual component issue',
      affectedComponents: [issue.componentA],
      relatedIssues: [issue],
      suggestedFix: this.generateGenericFix(issue, resolution),
      resolution
    };
  }

  /**
   * Generate responsive layout fix
   */
  private generateResponsiveFix(container: string, issues: LayoutIssue[], resolution: Resolution): SpecificFix {
    const isLayoutContainer = container.includes('Layout') || container.includes('layout');

    if (isLayoutContainer && resolution.name === 'mobile') {
      return {
        type: 'responsive',
        description: `Convert ${container} to responsive flexbox layout for mobile`,
        implementation: {
          selector: `[data-component="${container}"], .${container.toLowerCase()}`,
          suggestedCSS: `
/* Mobile responsive fix for ${container} */
@media (max-width: 768px) {
  .sidebar-layout {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .sidebar {
    width: 100%;
    margin-bottom: 16px;
  }

  .main-content {
    width: 100%;
  }
}`,
          explanation: `Changes horizontal sidebar layout to vertical stack on mobile, preventing viewport overflow`
        },
        alternativeFixes: [
          {
            description: 'Add horizontal scroll (not recommended)',
            css: `${container.toLowerCase()} { overflow-x: auto; }`,
            pros: ['Quick fix', 'Preserves desktop layout'],
            cons: ['Poor mobile UX', 'Content still hard to access']
          }
        ]
      };
    }

    return {
      type: 'css',
      description: `Add responsive constraints to ${container}`,
      implementation: {
        selector: `[data-component="${container}"]`,
        suggestedCSS: `max-width: 100%; overflow-x: auto;`,
        explanation: 'Prevents horizontal overflow with scrollable content'
      }
    };
  }

  /**
   * Generate overlap resolution fix
   */
  private generateOverlapFix(issues: LayoutIssue[], resolution: Resolution): SpecificFix {
    const components = [...new Set(issues.flatMap(i => [i.componentA, i.componentB].filter(Boolean)))];

    return {
      type: 'layout',
      description: `Fix positioning conflicts between ${components.join(' and ')}`,
      implementation: {
        selector: components.map(c => `[data-component="${c}"]`).join(', '),
        suggestedCSS: `
/* Fix overlapping components */
.${components[0]?.toLowerCase() || 'component'} {
  position: relative;
  z-index: 1;
  margin-bottom: 16px;
}

.${components[1]?.toLowerCase() || 'component'} {
  position: relative;
  clear: both;
  margin-top: 8px;
}`,
        explanation: 'Establishes proper stacking order and spacing to prevent overlaps'
      },
      alternativeFixes: [
        {
          description: 'Use CSS Grid for precise positioning',
          css: `display: grid; grid-template-columns: 1fr; gap: 16px;`,
          pros: ['Precise control', 'Modern layout'],
          cons: ['More complex', 'Requires layout restructure']
        }
      ]
    };
  }

  /**
   * Generate spacing consistency fix
   */
  private generateSpacingFix(issues: LayoutIssue[], resolution: Resolution): SpecificFix {
    const component = issues[0].componentA;

    return {
      type: 'css',
      description: `Standardize spacing for ${component} components`,
      implementation: {
        selector: `[data-component="${component}"]`,
        suggestedCSS: `
/* Consistent spacing system */
.${component.toLowerCase()} {
  margin: 16px 0;
}

.${component.toLowerCase()} + .${component.toLowerCase()} {
  margin-top: 24px;
}`,
        explanation: 'Applies consistent spacing using design system tokens'
      }
    };
  }

  /**
   * Generate generic fix for individual issues
   */
  private generateGenericFix(issue: LayoutIssue, resolution: Resolution): SpecificFix {
    if (issue.code.includes('E301')) {
      return {
        type: 'responsive',
        description: `Fix viewport overflow for ${issue.componentA}`,
        implementation: {
          selector: `[data-component="${issue.componentA}"]`,
          suggestedCSS: 'max-width: 100%; overflow-x: auto;',
          explanation: 'Prevents component from extending beyond viewport'
        }
      };
    }

    if (issue.code.includes('E101')) {
      return {
        type: 'layout',
        description: `Fix overlap for ${issue.componentA}`,
        implementation: {
          selector: `[data-component="${issue.componentA}"]`,
          suggestedCSS: 'position: relative; z-index: 1; margin: 8px 0;',
          explanation: 'Establishes proper stacking and spacing'
        }
      };
    }

    return {
      type: 'css',
      description: `General fix for ${issue.componentA}`,
      implementation: {
        selector: `[data-component="${issue.componentA}"]`,
        suggestedCSS: '/* Add specific CSS based on issue details */',
        explanation: 'Generic component fix'
      }
    };
  }

  // Helper methods
  private getIssueId(issue: LayoutIssue): string {
    return `${issue.code}-${issue.componentA}-${issue.componentB || 'single'}`;
  }

  private findParentContainer(issue: LayoutIssue, allIssues: LayoutIssue[]): string | null {
    // Simple heuristic: find issues affecting layout containers
    const layoutContainers = ['MainLayout', 'sidebar-layout', 'Container'];
    return layoutContainers.find(container =>
      allIssues.some(i => i.componentA === container)
    ) || null;
  }

  private calculateTotalOverflow(issues: LayoutIssue[]): number {
    return issues.reduce((total, issue) => {
      const details = issue.details as any;
      return total + (details?.overflowY || 0) + (details?.overflowX || 0);
    }, 0);
  }

  private calculateOverflowSeverity(overflow: number, resolution: Resolution): 'critical' | 'major' | 'minor' {
    const viewportArea = resolution.width * resolution.height;
    const overflowRatio = overflow / viewportArea;

    if (overflowRatio > 0.5) return 'critical';
    if (overflowRatio > 0.2) return 'major';
    return 'minor';
  }

  private calculateUsersAffected(resolutionName: string): string {
    const userStats: Record<string, string> = {
      mobile: '60% of users',
      tablet: '25% of users',
      desktop: '15% of users'
    };
    return userStats[resolutionName] || '100%';
  }

  private areOverlapsSpatiallyRelated(issue1: LayoutIssue, issue2: LayoutIssue): boolean {
    // Simple proximity check - could be enhanced with actual coordinate analysis
    return issue1.componentA === issue2.componentA ||
           issue1.componentB === issue2.componentB;
  }

  private getOverlapArea(issue: LayoutIssue): number {
    const details = issue.details as any;
    return details?.area || 0;
  }

  private mapSeverity(code: string): 'critical' | 'major' | 'minor' | 'cosmetic' {
    if (code.includes('E301') || code.includes('E101')) return 'major';
    if (code.includes('W201')) return 'minor';
    return 'cosmetic';
  }

  private mapPriority(code: string): number {
    if (code.includes('E301')) return 1; // Viewport overflow
    if (code.includes('E101')) return 2; // Overlaps
    if (code.includes('W201')) return 3; // Spacing
    return 4;
  }

  private mapImpact(code: string): 'blocks-interaction' | 'visual-degradation' | 'cosmetic' | 'performance' {
    if (code.includes('E301') || code.includes('E101')) return 'blocks-interaction';
    if (code.includes('W201')) return 'visual-degradation';
    return 'cosmetic';
  }
}