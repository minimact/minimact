import { BrowserRenderer } from './renderer.js';
import { AnalysisReport, Resolution, STANDARD_RESOLUTIONS, VisualCompilerConfig, LayoutIssue } from '../types/index.js';
import { IssueAnalyzer, GroupedIssue } from './issue-analyzer.js';
import { HTMLReportGenerator, HTMLReportOptions } from '../utils/html-report-generator.js';
import * as path from 'path';

export interface MultiResolutionReport {
  reports: AnalysisReport[];
  groupedIssues: GroupedIssue[]; // New: intelligent issue grouping
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    responsiveIssues: ResponsiveIssue[];
    overallScore: number;
    criticalIssues: number;
    majorIssues: number;
    minorIssues: number;
  };
  timestamp: number;
  totalRenderTime: number;
}

export interface ResponsiveIssue {
  type: 'layout-break' | 'overflow' | 'spacing-inconsistency';
  message: string;
  affectedResolutions: string[];
  component?: string;
  severity: 'high' | 'medium' | 'low';
}

export class MultiResolutionTester {
  private renderer: BrowserRenderer;
  private config: VisualCompilerConfig;
  private issueAnalyzer: IssueAnalyzer;

  constructor(config: Partial<VisualCompilerConfig> = {}) {
    this.renderer = new BrowserRenderer();
    this.issueAnalyzer = new IssueAnalyzer();
    this.config = {
      resolutions: config.resolutions || STANDARD_RESOLUTIONS,
      watchPaths: config.watchPaths || [],
      timeout: config.timeout || 5000,
      maxIterations: config.maxIterations || 10,
      errorCodes: config.errorCodes || {}
    };
  }

  /**
   * Test component across all configured resolutions with optional HTML report generation
   */
  async testAllResolutions(
    htmlContent: string,
    options?: {
      generateHTMLReport?: boolean;
      outputPath?: string;
      projectName?: string;
      captureScreenshots?: boolean;
    }
  ): Promise<MultiResolutionReport> {
    await this.renderer.initialize();

    try {
      const startTime = Date.now();
      const reports: AnalysisReport[] = [];
      const screenshotPaths: Record<string, string> = {};

      // Test each resolution
      for (const resolution of this.config.resolutions) {
        console.log(`Testing resolution: ${resolution.name} (${resolution.width}x${resolution.height})`);

        const report = await this.renderer.renderComponent(
          htmlContent,
          resolution,
          this.config.timeout
        );

        // Capture screenshot if requested
        if (options?.captureScreenshots && options?.outputPath) {
          const screenshotFileName = `screenshot-${resolution.name}-${Date.now()}.png`;
          const screenshotPath = path.join(options.outputPath, screenshotFileName);
          await this.renderer.takeScreenshot(screenshotPath);
          // Store relative path for HTML report
          screenshotPaths[resolution.name] = screenshotFileName;
        }

        // Filter issues for AI consumption
        report.issues = this.filterIssuesForAI(report.issues);
        reports.push(report);
      }

      const totalRenderTime = Date.now() - startTime;

      // Analyze responsive behavior
      const responsiveIssues = this.analyzeResponsiveIssues(reports);

      // Group and analyze issues for each resolution
      const groupedIssues: GroupedIssue[] = [];
      reports.forEach(report => {
        const resolutionGroups = this.issueAnalyzer.groupIssues(report.issues, report.resolution);
        groupedIssues.push(...resolutionGroups);
      });

      // Calculate enhanced summary
      const summary = this.calculateEnhancedSummary(reports, responsiveIssues, groupedIssues);

      const multiResolutionReport: MultiResolutionReport = {
        reports,
        groupedIssues,
        summary,
        timestamp: Date.now(),
        totalRenderTime
      };

      // Generate HTML report if requested
      if (options?.generateHTMLReport && options?.outputPath) {
        await this.generateHTMLReport(multiResolutionReport, {
          outputPath: options.outputPath,
          projectName: options.projectName,
          includeScreenshots: options.captureScreenshots,
          screenshotPaths: screenshotPaths
        });
      }

      return multiResolutionReport;

    } finally {
      await this.renderer.cleanup();
    }
  }

  /**
   * Test component at a single resolution
   */
  async testSingleResolution(
    htmlContent: string,
    resolution: Resolution
  ): Promise<AnalysisReport> {
    await this.renderer.initialize();

    try {
      return await this.renderer.renderComponent(htmlContent, resolution, this.config.timeout);
    } finally {
      await this.renderer.cleanup();
    }
  }

  /**
   * Analyze responsive behavior across resolutions
   */
  private analyzeResponsiveIssues(reports: AnalysisReport[]): ResponsiveIssue[] {
    const issues: ResponsiveIssue[] = [];

    // Check for layout breaks across resolutions
    const componentsByResolution = new Map<string, Map<string, any>>();

    reports.forEach(report => {
      const componentMap = new Map();
      report.components.forEach(component => {
        componentMap.set(component.component, component);
      });
      componentsByResolution.set(report.resolution.name, componentMap);
    });

    // Detect components that appear/disappear across resolutions
    const allComponents = new Set<string>();
    reports.forEach(report => {
      report.components.forEach(component => {
        allComponents.add(component.component);
      });
    });

    allComponents.forEach(componentName => {
      const presentIn: string[] = [];
      const absentIn: string[] = [];

      this.config.resolutions.forEach(resolution => {
        const componentMap = componentsByResolution.get(resolution.name);
        if (componentMap?.has(componentName)) {
          presentIn.push(resolution.name);
        } else {
          absentIn.push(resolution.name);
        }
      });

      if (absentIn.length > 0 && presentIn.length > 0) {
        issues.push({
          type: 'layout-break',
          message: `${componentName} disappears on ${absentIn.join(', ')} but visible on ${presentIn.join(', ')}`,
          affectedResolutions: absentIn,
          component: componentName,
          severity: 'high'
        });
      }
    });

    // Check for overflow issues that appear only on certain resolutions
    const overflowComponents = new Map<string, string[]>();
    reports.forEach(report => {
      report.issues
        .filter(issue => issue.code.startsWith('E301'))
        .forEach(issue => {
          if (!overflowComponents.has(issue.componentA)) {
            overflowComponents.set(issue.componentA, []);
          }
          overflowComponents.get(issue.componentA)!.push(report.resolution.name);
        });
    });

    overflowComponents.forEach((resolutions, component) => {
      if (resolutions.length > 0 && resolutions.length < this.config.resolutions.length) {
        issues.push({
          type: 'overflow',
          message: `${component} overflows viewport on ${resolutions.join(', ')} but not on other resolutions`,
          affectedResolutions: resolutions,
          component,
          severity: 'medium'
        });
      }
    });

    // Check for spacing inconsistencies
    const spacingIssues = this.detectSpacingInconsistencies(reports);
    issues.push(...spacingIssues);

    return issues;
  }

  /**
   * Detect spacing inconsistencies across resolutions
   */
  private detectSpacingInconsistencies(reports: AnalysisReport[]): ResponsiveIssue[] {
    const issues: ResponsiveIssue[] = [];

    // Group components by name across resolutions
    const componentGroups = new Map<string, Map<string, any>>();

    reports.forEach(report => {
      report.components.forEach(component => {
        if (!componentGroups.has(component.component)) {
          componentGroups.set(component.component, new Map());
        }
        componentGroups.get(component.component)!.set(report.resolution.name, component);
      });
    });

    // Check for dramatic size changes that might indicate layout issues
    componentGroups.forEach((resolutionMap, componentName) => {
      const sizes = Array.from(resolutionMap.entries()).map(([resolution, component]) => ({
        resolution,
        width: component.width,
        height: component.height,
        area: component.width * component.height
      }));

      if (sizes.length >= 2) {
        const areas = sizes.map(s => s.area);
        const minArea = Math.min(...areas);
        const maxArea = Math.max(...areas);

        // If area changes by more than 300%, it might be a layout issue
        if (maxArea / minArea > 3) {
          const problematicResolutions = sizes
            .filter(s => s.area === maxArea || s.area === minArea)
            .map(s => s.resolution);

          issues.push({
            type: 'spacing-inconsistency',
            message: `${componentName} has dramatic size changes across resolutions`,
            affectedResolutions: problematicResolutions,
            component: componentName,
            severity: 'medium'
          });
        }
      }
    });

    return issues;
  }

  /**
   * Calculate enhanced summary statistics with grouping
   */
  private calculateEnhancedSummary(reports: AnalysisReport[], responsiveIssues: ResponsiveIssue[], groupedIssues: GroupedIssue[]) {
    // Count grouped issues by severity
    let criticalIssues = 0;
    let majorIssues = 0;
    let minorIssues = 0;

    groupedIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          criticalIssues++;
          break;
        case 'major':
          majorIssues++;
          break;
        case 'minor':
          minorIssues++;
          break;
      }
    });

    // Original counts for backward compatibility
    const originalSummary = this.calculateSummary(reports, responsiveIssues);

    return {
      ...originalSummary,
      criticalIssues,
      majorIssues,
      minorIssues
    };
  }

  /**
   * Generate HTML report for developers
   */
  async generateHTMLReport(
    report: MultiResolutionReport,
    options: HTMLReportOptions
  ): Promise<string> {
    const htmlGenerator = new HTMLReportGenerator();
    const reportPath = await htmlGenerator.generateReport(report, options);

    console.log(`📄 HTML report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * Filter issues for AI consumption - removes noise and redundancy
   */
  private filterIssuesForAI(issues: LayoutIssue[]): LayoutIssue[] {
    const filtered: LayoutIssue[] = [];
    const seenPatterns = new Set<string>();

    // Priority order: Errors first, then warnings, skip most info
    const priorityOrder = ['error', 'warning', 'info'];
    const sortedIssues = issues.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.type);
      const bPriority = priorityOrder.indexOf(b.type);
      return aPriority - bPriority;
    });

    for (const issue of sortedIssues) {
      // Skip info-level alignment confirmations (I401) - noise for AI
      if (issue.code === 'I401') continue;

      // Skip minor spacing warnings for same component pairs
      if (issue.code === 'W201') {
        const spacingPattern = `${issue.componentA}-${issue.componentB}-spacing`;
        if (seenPatterns.has(spacingPattern)) continue;
        seenPatterns.add(spacingPattern);
      }

      // Keep only one overlap per component pair
      if (issue.code === 'E101') {
        const overlapPattern = `${issue.componentA}-${issue.componentB}-overlap`;
        const reversePattern = `${issue.componentB}-${issue.componentA}-overlap`;
        if (seenPatterns.has(overlapPattern) || seenPatterns.has(reversePattern)) continue;
        seenPatterns.add(overlapPattern);
      }

      // Keep only one overflow per component
      if (issue.code === 'E301') {
        const overflowPattern = `${issue.componentA}-overflow`;
        if (seenPatterns.has(overflowPattern)) continue;
        seenPatterns.add(overflowPattern);
      }

      filtered.push(issue);

      // Cap at 50 issues max for AI processing
      if (filtered.length >= 50) break;
    }

    return filtered;
  }

  /**
   * Calculate summary statistics (legacy method)
   */
  private calculateSummary(reports: AnalysisReport[], responsiveIssues: ResponsiveIssue[]) {
    let totalIssues = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    reports.forEach(report => {
      totalIssues += report.issues.length;
      report.issues.forEach(issue => {
        switch (issue.type) {
          case 'error':
            errorCount++;
            break;
          case 'warning':
            warningCount++;
            break;
          case 'info':
            infoCount++;
            break;
        }
      });
    });

    // Add responsive issues to totals
    totalIssues += responsiveIssues.length;
    responsiveIssues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          errorCount++;
          break;
        case 'medium':
          warningCount++;
          break;
        case 'low':
          infoCount++;
          break;
      }
    });

    // Calculate overall score (0-100)
    // Start with 100, subtract points for issues
    let score = 100;
    score -= errorCount * 10; // -10 points per error
    score -= warningCount * 5; // -5 points per warning
    score -= infoCount * 1; // -1 point per info

    score = Math.max(0, score); // Ensure score doesn't go below 0

    return {
      totalIssues,
      errorCount,
      warningCount,
      infoCount,
      responsiveIssues,
      overallScore: score
    };
  }

  /**
   * Generate a human-readable report
   */
  static formatReport(report: MultiResolutionReport): string {
    const lines: string[] = [];

    lines.push('VISUAL COMPILER REPORT');
    lines.push('═'.repeat(50));
    lines.push(`Overall Score: ${report.summary.overallScore}/100`);
    lines.push(`Total Render Time: ${report.totalRenderTime}ms`);
    lines.push(`Issues Found: ${report.summary.totalIssues} (${report.summary.errorCount} errors, ${report.summary.warningCount} warnings, ${report.summary.infoCount} info)`);

    // Show grouped issue summary
    if (report.groupedIssues && report.groupedIssues.length > 0) {
      lines.push(`Grouped Issues: ${report.groupedIssues.length} (${report.summary.criticalIssues} critical, ${report.summary.majorIssues} major, ${report.summary.minorIssues} minor)`);
    }
    lines.push('');

    // Show prioritized grouped issues first
    if (report.groupedIssues && report.groupedIssues.length > 0) {
      lines.push('🎯 PRIORITIZED ISSUES & FIXES');
      lines.push('═'.repeat(50));

      report.groupedIssues.forEach((issue, index) => {
        const severityIcon = {
          critical: '🔴',
          major: '🟠',
          minor: '🟡',
          cosmetic: '🔵'
        }[issue.severity];

        const priorityBadge = `P${issue.priority}`;
        const confidenceBadge = `${Math.round(issue.confidence * 100)}%`;

        lines.push(`${severityIcon} ${priorityBadge} [${issue.severity.toUpperCase()}] ${issue.title}`);
        lines.push(`   Impact: ${issue.impact} | Users: ${issue.usersAffected} | Fix Effort: ${issue.fixEffort} | Confidence: ${confidenceBadge}`);
        lines.push(`   Root Cause: ${issue.rootCause}`);
        lines.push(`   Affected Components: ${issue.affectedComponents.join(', ')}`);

        // Show specific fix suggestion
        if (issue.suggestedFix) {
          lines.push(`   💡 SUGGESTED FIX:`);
          lines.push(`      ${issue.suggestedFix.description}`);
          lines.push(`      CSS: ${issue.suggestedFix.implementation.selector}`);
          lines.push(`      ${issue.suggestedFix.implementation.suggestedCSS.replace(/\n/g, '\n      ')}`);
          lines.push(`      Explanation: ${issue.suggestedFix.implementation.explanation}`);

          // Show alternative fixes if available
          if (issue.suggestedFix.alternativeFixes && issue.suggestedFix.alternativeFixes.length > 0) {
            lines.push(`      Alternative fixes:`);
            issue.suggestedFix.alternativeFixes.forEach(alt => {
              lines.push(`        • ${alt.description}: ${alt.css}`);
            });
          }
        }

        lines.push(`   Related issues: ${issue.relatedIssues.length} detailed issues grouped`);
        lines.push('');
      });
    }

    // Resolution-specific reports
    report.reports.forEach(resReport => {
      lines.push(`RESOLUTION: ${resReport.resolution.name.toUpperCase()} (${resReport.resolution.width}x${resReport.resolution.height})`);
      lines.push('─'.repeat(30));

      if (resReport.issues.length === 0) {
        lines.push('✓ No issues found');
      } else {
        resReport.issues.forEach(issue => {
          const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
          lines.push(`${icon} ${issue.code}: ${issue.message}`);
          if (issue.componentB) {
            lines.push(`   Components: ${issue.componentA} ↔ ${issue.componentB}`);
          } else {
            lines.push(`   Component: ${issue.componentA}`);
          }
          if (Object.keys(issue.details).length > 0) {
            lines.push(`   Details: ${JSON.stringify(issue.details, null, 2).replace(/\n/g, '\n   ')}`);
          }
        });
      }
      lines.push('');
    });

    // Responsive issues
    if (report.summary.responsiveIssues.length > 0) {
      lines.push('RESPONSIVE ISSUES');
      lines.push('─'.repeat(30));
      report.summary.responsiveIssues.forEach(issue => {
        const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🔵';
        lines.push(`${icon} ${issue.type.toUpperCase()}: ${issue.message}`);
        lines.push(`   Affected: ${issue.affectedResolutions.join(', ')}`);
      });
    }

    return lines.join('\n');
  }
}