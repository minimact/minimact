/**
 * HTML Report Generator for Visual Compiler
 *
 * Creates developer-friendly reports with screenshots and tabbed severity display
 */

import { MultiResolutionReport } from '../core/multi-resolution.js';
import { GroupedIssue } from '../core/issue-analyzer.js';
import { LayoutIssue, Resolution } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface HTMLReportOptions {
  outputPath: string;
  projectName?: string;
  includeScreenshots?: boolean;
  screenshotPaths?: Record<string, string>; // resolution name -> screenshot path
}

export class HTMLReportGenerator {

  async generateReport(
    report: MultiResolutionReport,
    options: HTMLReportOptions
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `visual-compiler-report-${timestamp}.html`;
    const reportPath = path.join(options.outputPath, reportFileName);

    const htmlContent = this.buildHTMLContent(report, options);

    await fs.writeFile(reportPath, htmlContent);
    return reportPath;
  }

  private buildHTMLContent(report: MultiResolutionReport, options: HTMLReportOptions): string {
    const projectName = options.projectName || 'Visual Compiler Report';
    const timestamp = new Date().toLocaleString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - Layout Analysis</title>
    <style>
        ${this.getCSS()}
    </style>
</head>
<body>
    <div class="report-container">
        ${this.buildHeader(report, projectName, timestamp)}
        ${this.buildScreenshotSection(options)}
        ${this.buildTabbedIssues(report)}
        ${this.buildDetailedBreakdown(report)}
        ${this.buildFooter()}
    </div>

    <script>
        ${this.getJavaScript()}
    </script>
</body>
</html>`;
  }

  private buildHeader(report: MultiResolutionReport, projectName: string, timestamp: string): string {
    const scoreColor = this.getScoreColor(report.summary.overallScore);

    return `
    <header class="report-header">
        <div class="header-content">
            <h1>🔍 ${projectName}</h1>
            <div class="header-stats">
                <div class="score-badge ${scoreColor}">
                    <span class="score-number">${report.summary.overallScore}</span>
                    <span class="score-label">/100</span>
                </div>
                <div class="stats-grid">
                    <div class="stat">
                        <span class="stat-value">${report.summary.totalIssues}</span>
                        <span class="stat-label">Total Issues</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${report.groupedIssues.length}</span>
                        <span class="stat-label">Issue Groups</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${report.totalRenderTime}ms</span>
                        <span class="stat-label">Analysis Time</span>
                    </div>
                </div>
            </div>
            <p class="timestamp">Generated: ${timestamp}</p>
        </div>
    </header>`;
  }

  private buildScreenshotSection(options: HTMLReportOptions): string {
    if (!options.includeScreenshots || !options.screenshotPaths) {
      return '';
    }

    const screenshots = Object.entries(options.screenshotPaths)
      .map(([resolution, path]) => `
        <div class="screenshot-item">
            <h3>${resolution.charAt(0).toUpperCase() + resolution.slice(1)}</h3>
            <img src="${path}" alt="${resolution} screenshot" loading="lazy" />
        </div>
      `).join('');

    return `
    <section class="screenshots-section">
        <h2>📱 Resolution Screenshots</h2>
        <div class="screenshots-grid">
            ${screenshots}
        </div>
    </section>`;
  }

  private buildTabbedIssues(report: MultiResolutionReport): string {
    const severityTabs = this.groupIssuesBySeverity(report.groupedIssues);

    const tabButtons = Object.keys(severityTabs)
      .map((severity, index) => `
        <button class="tab-button ${index === 0 ? 'active' : ''}"
                onclick="showTab('${severity}')"
                data-tab="${severity}">
            ${this.getSeverityIcon(severity)} ${severity.toUpperCase()}
            <span class="badge">${severityTabs[severity].length}</span>
        </button>
      `).join('');

    const tabContents = Object.entries(severityTabs)
      .map(([severity, issues], index) => `
        <div class="tab-content ${index === 0 ? 'active' : ''}" id="tab-${severity}">
            ${this.buildSeverityIssuesList(issues, severity)}
        </div>
      `).join('');

    return `
    <section class="issues-section">
        <h2>🎯 Issues by Severity</h2>
        <div class="tabs">
            <div class="tab-buttons">
                ${tabButtons}
            </div>
            <div class="tab-contents">
                ${tabContents}
            </div>
        </div>
    </section>`;
  }

  private buildSeverityIssuesList(issues: GroupedIssue[], severity: string): string {
    if (issues.length === 0) {
      return `<div class="empty-state">
        <p>🎉 No ${severity} issues found!</p>
      </div>`;
    }

    return issues.map(issue => this.buildIssueCard(issue)).join('');
  }

  private buildIssueCard(issue: GroupedIssue): string {
    const priorityClass = `priority-${issue.priority}`;
    const severityIcon = this.getSeverityIcon(issue.severity);

    return `
    <div class="issue-card ${issue.severity}">
        <div class="issue-header">
            <div class="issue-title">
                ${severityIcon}
                <span class="priority-badge ${priorityClass}">P${issue.priority}</span>
                <h3>${issue.title}</h3>
            </div>
            <div class="issue-meta">
                <span class="confidence">🎯 ${Math.round(issue.confidence * 100)}%</span>
                <span class="effort">⚡ ${issue.fixEffort}</span>
                <span class="users">👥 ${issue.usersAffected}</span>
            </div>
        </div>

        <div class="issue-body">
            <div class="issue-details">
                <p><strong>Root Cause:</strong> ${issue.rootCause}</p>
                <p><strong>Pattern:</strong> ${issue.pattern}</p>
                <p><strong>Impact:</strong> ${issue.impact}</p>
                <p><strong>Components:</strong> ${issue.affectedComponents.join(', ')}</p>
            </div>

            <div class="fix-suggestion">
                <h4>💡 Suggested Fix</h4>
                <p>${issue.suggestedFix.description}</p>
                <div class="code-block">
                    <div class="code-header">
                        <span>CSS</span>
                        <button onclick="copyCode(this)" class="copy-btn">📋 Copy</button>
                    </div>
                    <pre><code>${this.escapeHTML(issue.suggestedFix.implementation.suggestedCSS)}</code></pre>
                </div>
                <p class="explanation"><strong>Why this works:</strong> ${issue.suggestedFix.implementation.explanation}</p>

                ${issue.suggestedFix.alternativeFixes ? this.buildAlternativeFixes(issue.suggestedFix.alternativeFixes) : ''}
            </div>

            <details class="related-issues">
                <summary>Related Issues (${issue.relatedIssues.length})</summary>
                <div class="related-list">
                    ${issue.relatedIssues.map((related: LayoutIssue) => `
                        <div class="related-item">
                            <span class="related-code">${related.code}</span>
                            <span class="related-message">${related.message}</span>
                        </div>
                    `).join('')}
                </div>
            </details>
        </div>
    </div>`;
  }

  private buildAlternativeFixes(alternatives: any[]): string {
    return `
    <details class="alternatives">
        <summary>Alternative Solutions (${alternatives.length})</summary>
        ${alternatives.map(alt => `
            <div class="alternative">
                <h5>${alt.description}</h5>
                <div class="code-block small">
                    <pre><code>${this.escapeHTML(alt.css)}</code></pre>
                </div>
                <div class="pros-cons">
                    <div class="pros">
                        <strong>✅ Pros:</strong>
                        <ul>${alt.pros.map((pro: string) => `<li>${pro}</li>`).join('')}</ul>
                    </div>
                    <div class="cons">
                        <strong>❌ Cons:</strong>
                        <ul>${alt.cons.map((con: string) => `<li>${con}</li>`).join('')}</ul>
                    </div>
                </div>
            </div>
        `).join('')}
    </details>`;
  }

  private buildDetailedBreakdown(report: MultiResolutionReport): string {
    return `
    <section class="detailed-section">
        <h2>📊 Detailed Analysis by Resolution</h2>
        ${report.reports.map((resReport: any) => this.buildResolutionReport(resReport)).join('')}
    </section>`;
  }

  private buildResolutionReport(resReport: any): string {
    const { resolution, issues } = resReport;
    const errorCount = issues.filter((i: LayoutIssue) => i.type === 'error').length;
    const warningCount = issues.filter((i: LayoutIssue) => i.type === 'warning').length;
    const infoCount = issues.filter((i: LayoutIssue) => i.type === 'info').length;

    return `
    <div class="resolution-report">
        <h3>📱 ${resolution.name} (${resolution.width}×${resolution.height})</h3>
        <div class="resolution-stats">
            <span class="error-count">❌ ${errorCount} errors</span>
            <span class="warning-count">⚠️ ${warningCount} warnings</span>
            <span class="info-count">ℹ️ ${infoCount} info</span>
        </div>

        ${issues.length > 0 ? `
        <div class="raw-issues">
            ${issues.slice(0, 10).map((issue: LayoutIssue) => `
                <div class="raw-issue ${issue.type}">
                    <span class="issue-code">${issue.code}</span>
                    <span class="issue-message">${issue.message}</span>
                    ${issue.componentB ?
                        `<span class="components">${issue.componentA} ↔ ${issue.componentB}</span>` :
                        `<span class="component">${issue.componentA}</span>`
                    }
                </div>
            `).join('')}
            ${issues.length > 10 ? `<p class="more-issues">... and ${issues.length - 10} more issues</p>` : ''}
        </div>
        ` : '<p class="no-issues">✅ No issues found for this resolution</p>'}
    </div>`;
  }

  private buildFooter(): string {
    return `
    <footer class="report-footer">
        <p>Generated by <strong>Visual Compiler</strong> - AI-powered layout analysis</p>
        <p>🔧 Focus on high-priority issues first • 🎯 Use specific CSS fixes • 📱 Test across all resolutions</p>
    </footer>`;
  }

  private groupIssuesBySeverity(issues: GroupedIssue[]): Record<string, GroupedIssue[]> {
    const groups: Record<string, GroupedIssue[]> = {
      critical: [],
      major: [],
      minor: [],
      cosmetic: []
    };

    issues.forEach(issue => {
      groups[issue.severity].push(issue);
    });

    // Sort each group by priority
    Object.keys(groups).forEach(severity => {
      groups[severity].sort((a, b) => a.priority - b.priority);
    });

    return groups;
  }

  private getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      critical: '🔴',
      major: '🟠',
      minor: '🟡',
      cosmetic: '🔵'
    };
    return icons[severity] || '⚪';
  }

  private getScoreColor(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getCSS(): string {
    return `
        * { box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            background: #f8fafc;
            color: #1e293b;
        }

        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .header-content h1 {
            margin: 0 0 1rem 0;
            font-size: 2.5rem;
            font-weight: 700;
        }

        .header-stats {
            display: flex;
            align-items: center;
            gap: 2rem;
            margin-bottom: 1rem;
        }

        .score-badge {
            display: flex;
            align-items: baseline;
            gap: 0.25rem;
            padding: 1rem;
            border-radius: 8px;
            font-weight: bold;
            min-width: 120px;
        }

        .score-badge.excellent { background: #10b981; }
        .score-badge.good { background: #f59e0b; }
        .score-badge.fair { background: #ef4444; }
        .score-badge.poor { background: #dc2626; }

        .score-number { font-size: 3rem; }
        .score-label { font-size: 1.2rem; opacity: 0.8; }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
        }

        .stat {
            text-align: center;
        }

        .stat-value {
            display: block;
            font-size: 2rem;
            font-weight: 700;
            line-height: 1;
        }

        .stat-label {
            font-size: 0.875rem;
            opacity: 0.8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .timestamp {
            margin: 1rem 0 0 0;
            opacity: 0.8;
            font-size: 0.875rem;
        }

        .screenshots-section, .issues-section, .detailed-section {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .screenshots-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-top: 1rem;
        }

        .screenshot-item img {
            width: 100%;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .tabs {
            margin-top: 1rem;
        }

        .tab-buttons {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            border-bottom: 2px solid #e2e8f0;
        }

        .tab-button {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            border: none;
            background: transparent;
            cursor: pointer;
            font-weight: 500;
            border-radius: 8px 8px 0 0;
            transition: all 0.2s;
        }

        .tab-button:hover {
            background: #f1f5f9;
        }

        .tab-button.active {
            background: #3b82f6;
            color: white;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }

        .badge {
            background: rgba(255,255,255,0.2);
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .tab-button.active .badge {
            background: rgba(255,255,255,0.3);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .empty-state {
            text-align: center;
            padding: 3rem;
            color: #64748b;
            font-size: 1.125rem;
        }

        .issue-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .issue-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .issue-card.critical { border-left: 4px solid #dc2626; }
        .issue-card.major { border-left: 4px solid #f59e0b; }
        .issue-card.minor { border-left: 4px solid #eab308; }
        .issue-card.cosmetic { border-left: 4px solid #3b82f6; }

        .issue-header {
            background: #f8fafc;
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
        }

        .issue-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
        }

        .issue-title h3 {
            margin: 0;
            font-size: 1.25rem;
            flex: 1;
        }

        .priority-badge {
            padding: 0.25rem 0.5rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            color: white;
        }

        .priority-1 { background: #dc2626; }
        .priority-2 { background: #f59e0b; }
        .priority-3 { background: #eab308; }
        .priority-4 { background: #3b82f6; }
        .priority-5 { background: #64748b; }

        .issue-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.875rem;
            color: #64748b;
        }

        .issue-body {
            padding: 1.5rem;
        }

        .issue-details {
            margin-bottom: 1.5rem;
        }

        .issue-details p {
            margin: 0.5rem 0;
        }

        .fix-suggestion {
            background: #f0f9ff;
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid #0ea5e9;
        }

        .fix-suggestion h4 {
            margin: 0 0 1rem 0;
            color: #0c4a6e;
        }

        .code-block {
            margin: 1rem 0;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #d1d5db;
        }

        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #374151;
            color: white;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
        }

        .copy-btn {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.75rem;
        }

        .copy-btn:hover {
            background: rgba(255,255,255,0.1);
        }

        .code-block pre {
            margin: 0;
            padding: 1rem;
            background: #1f2937;
            color: #f9fafb;
            overflow-x: auto;
            font-size: 0.875rem;
            line-height: 1.5;
        }

        .code-block.small pre {
            padding: 0.75rem;
            font-size: 0.8125rem;
        }

        .explanation {
            font-style: italic;
            color: #0c4a6e;
            margin-top: 1rem;
        }

        .alternatives, .related-issues {
            margin-top: 1rem;
        }

        .alternatives summary, .related-issues summary {
            cursor: pointer;
            font-weight: 500;
            padding: 0.5rem 0;
            color: #374151;
        }

        .alternative {
            padding: 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin: 0.5rem 0;
        }

        .alternative h5 {
            margin: 0 0 0.75rem 0;
            color: #374151;
        }

        .pros-cons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 0.75rem;
            font-size: 0.875rem;
        }

        .pros ul, .cons ul {
            margin: 0.5rem 0;
            padding-left: 1.25rem;
        }

        .related-list {
            margin-top: 0.75rem;
        }

        .related-item {
            display: flex;
            gap: 0.75rem;
            padding: 0.5rem;
            border-radius: 4px;
            margin-bottom: 0.25rem;
            font-size: 0.875rem;
        }

        .related-item:nth-child(even) {
            background: #f8fafc;
        }

        .related-code {
            background: #e2e8f0;
            padding: 0.125rem 0.375rem;
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.75rem;
            min-width: 60px;
        }

        .resolution-report {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        }

        .resolution-stats {
            display: flex;
            gap: 1rem;
            margin: 0.75rem 0;
            font-size: 0.875rem;
        }

        .raw-issues {
            margin-top: 1rem;
        }

        .raw-issue {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 1rem;
            align-items: center;
            padding: 0.75rem;
            border-radius: 4px;
            margin-bottom: 0.25rem;
            font-size: 0.875rem;
        }

        .raw-issue.error { background: #fef2f2; border-left: 3px solid #dc2626; }
        .raw-issue.warning { background: #fffbeb; border-left: 3px solid #f59e0b; }
        .raw-issue.info { background: #f0f9ff; border-left: 3px solid #3b82f6; }

        .issue-code {
            font-family: monospace;
            background: rgba(0,0,0,0.1);
            padding: 0.125rem 0.375rem;
            border-radius: 3px;
            font-size: 0.75rem;
        }

        .more-issues {
            text-align: center;
            color: #64748b;
            font-style: italic;
            margin-top: 1rem;
        }

        .no-issues {
            text-align: center;
            color: #10b981;
            font-weight: 500;
            padding: 1rem;
        }

        .report-footer {
            text-align: center;
            padding: 2rem;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            margin-top: 2rem;
        }

        @media (max-width: 768px) {
            .header-stats { flex-direction: column; gap: 1rem; }
            .stats-grid { grid-template-columns: repeat(3, 1fr); }
            .tab-buttons { flex-wrap: wrap; }
            .pros-cons { grid-template-columns: 1fr; }
            .raw-issue { grid-template-columns: 1fr; gap: 0.5rem; }
        }
    `;
  }

  private getJavaScript(): string {
    return `
        function showTab(severity) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Remove active class from all buttons
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('active');
            });

            // Show selected tab content
            document.getElementById('tab-' + severity).classList.add('active');

            // Add active class to clicked button
            document.querySelector('[data-tab="' + severity + '"]').classList.add('active');
        }

        function copyCode(button) {
            const codeBlock = button.closest('.code-block').querySelector('code');
            const text = codeBlock.textContent;

            navigator.clipboard.writeText(text).then(() => {
                const originalText = button.textContent;
                button.textContent = '✅ Copied!';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                const originalText = button.textContent;
                button.textContent = '✅ Copied!';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            });
        }

        // Auto-focus on critical issues if they exist
        window.addEventListener('load', () => {
            const criticalTab = document.querySelector('[data-tab="critical"]');
            if (criticalTab && document.getElementById('tab-critical').children.length > 1) {
                // Only auto-switch to critical if there are actual issues (not just empty state)
                const criticalContent = document.getElementById('tab-critical');
                if (!criticalContent.querySelector('.empty-state')) {
                    showTab('critical');
                }
            }
        });
    `;
  }
}