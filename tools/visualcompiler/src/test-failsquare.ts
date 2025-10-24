#!/usr/bin/env node

import { VisualCompiler } from './core/visual-compiler.js';
import { ReactRenderer } from './utils/react-renderer.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface FailSquareComponent {
  name: string;
  storyPath?: string;
  htmlContent: string;
}

/**
 * Test script for analyzing FailSquare components with Visual Compiler
 */
class FailSquareAnalyzer {
  private compiler: VisualCompiler;
  private renderer: ReactRenderer;

  constructor() {
    this.compiler = new VisualCompiler({
      outputPath: './failsquare-analysis-reports'
    });
    this.renderer = new ReactRenderer('./temp-failsquare');
  }

  /**
   * Analyze all FailSquare components
   */
  async analyzeAllComponents() {
    console.log('🔍 Analyzing FailSquare Components with Visual Compiler...\n');

    const components = await this.createFailSquareComponentTests();

    for (const component of components) {
      console.log(`📊 Analyzing ${component.name}...`);

      try {
        const report = await this.compiler.analyzeContent(
          component.htmlContent,
          `failsquare-${component.name.toLowerCase()}.html`
        );

        // Log summary
        const { summary } = report;
        if (summary.errorCount > 0) {
          console.log(`   ❌ ${summary.errorCount} errors, ${summary.warningCount} warnings (Score: ${summary.overallScore}/100)`);
        } else if (summary.warningCount > 0) {
          console.log(`   ⚠️  ${summary.warningCount} warnings (Score: ${summary.overallScore}/100)`);
        } else {
          console.log(`   ✅ No issues found! (Score: ${summary.overallScore}/100)`);
        }

        // Show key issues
        for (const resReport of report.reports) {
          const criticalIssues = resReport.issues.filter(issue =>
            issue.type === 'error' && (issue.code.includes('E101') || issue.code.includes('E301'))
          );

          if (criticalIssues.length > 0) {
            console.log(`   🔴 ${resReport.resolution.name}: ${criticalIssues.length} critical issues`);
            criticalIssues.forEach(issue => {
              console.log(`      ${issue.code}: ${issue.message}`);
            });
          }
        }

      } catch (error) {
        console.log(`   ❌ Analysis failed: ${error}`);
      }

      console.log('');
    }

    console.log('📊 FailSquare Component Analysis Complete!');
    console.log('📁 Detailed reports saved in ./failsquare-analysis-reports/');
  }

  /**
   * Create test HTML for FailSquare components
   */
  private async createFailSquareComponentTests(): Promise<FailSquareComponent[]> {
    return [
      {
        name: 'FailSquareCard',
        htmlContent: this.createFailSquareCardHTML()
      },
      {
        name: 'FailSquareButton',
        htmlContent: this.createFailSquareButtonHTML()
      },
      {
        name: 'FailSquareAuthInput',
        htmlContent: this.createFailSquareInputHTML()
      },
      {
        name: 'DashboardLayout',
        htmlContent: this.createDashboardLayoutHTML()
      },
      {
        name: 'ProductCards',
        htmlContent: this.createProductCardsHTML()
      },
      {
        name: 'ResponsiveForm',
        htmlContent: this.createResponsiveFormHTML()
      }
    ];
  }

  private createFailSquareCardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FailSquare Card Component</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 20px; }

    .failsquare-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s;
    }

    .failsquare-card:hover {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
  </style>
</head>
<body>
  <div class="max-w-md mx-auto">
    <div class="failsquare-card" data-component="FailSquareCard" data-instance="1">
      <h3 style="margin-bottom: 12px; color: #1f2937; font-size: 18px; font-weight: 600;">FailSquare Card</h3>
      <p style="color: #6b7280; line-height: 1.5;">This is a FailSquare card component with proper styling and spacing for consistent UI design.</p>
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button class="failsquare-button" data-component="FailSquareButton" data-instance="1" style="
          background: #3b82f6; color: white; border: none; padding: 8px 16px;
          border-radius: 6px; font-weight: 500; cursor: pointer;
        ">Primary</button>
        <button class="failsquare-button" data-component="FailSquareButton" data-instance="2" style="
          background: white; color: #374151; border: 1px solid #d1d5db; padding: 8px 16px;
          border-radius: 6px; font-weight: 500; cursor: pointer;
        ">Secondary</button>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private createFailSquareButtonHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FailSquare Button Components</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 20px; }

    .button-group { display: flex; gap: 12px; flex-wrap: wrap; }
    .failsquare-button {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 10px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;
      transition: all 0.2s; text-decoration: none; font-size: 14px;
    }
    .btn-primary { background: #3b82f6; color: white; border: none; }
    .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; }
    .btn-danger { background: #ef4444; color: white; border: none; }
    .btn-large { padding: 12px 24px; font-size: 16px; }
    .btn-small { padding: 6px 12px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="max-w-2xl mx-auto">
    <h2 style="margin-bottom: 24px; color: #1f2937;">FailSquare Button Variants</h2>

    <div class="button-group" style="margin-bottom: 24px;">
      <button class="failsquare-button btn-primary" data-component="FailSquareButton" data-instance="1">Primary Button</button>
      <button class="failsquare-button btn-secondary" data-component="FailSquareButton" data-instance="2">Secondary Button</button>
      <button class="failsquare-button btn-danger" data-component="FailSquareButton" data-instance="3">Danger Button</button>
    </div>

    <div class="button-group" style="margin-bottom: 24px;">
      <button class="failsquare-button btn-primary btn-large" data-component="FailSquareButton" data-instance="4">Large Button</button>
      <button class="failsquare-button btn-secondary btn-small" data-component="FailSquareButton" data-instance="5">Small Button</button>
    </div>
  </div>
</body>
</html>`;
  }

  private createFailSquareInputHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FailSquare Input Components</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 20px; }

    .form-group { margin-bottom: 20px; }
    .form-label { display: block; margin-bottom: 6px; font-weight: 500; color: #374151; }
    .failsquare-input {
      display: block; width: 100%; padding: 10px 12px; border: 1px solid #d1d5db;
      border-radius: 6px; font-size: 14px; transition: border-color 0.2s;
    }
    .failsquare-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
  </style>
</head>
<body>
  <div class="max-w-md mx-auto">
    <div class="failsquare-card" data-component="FailSquareCard" data-instance="1" style="
      background: white; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 24px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    ">
      <h3 style="margin-bottom: 20px; color: #1f2937;">Contact Form</h3>

      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" class="failsquare-input" data-component="FailSquareAuthInput" data-instance="1"
               placeholder="your.email@example.com" />
      </div>

      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" class="failsquare-input" data-component="FailSquareAuthInput" data-instance="2"
               placeholder="Enter your full name" />
      </div>

      <div class="form-group">
        <label class="form-label">Message</label>
        <textarea class="failsquare-input" data-component="FailSquareTextArea" data-instance="1"
                  rows="4" placeholder="Enter your message..."></textarea>
      </div>

      <button class="failsquare-button" data-component="FailSquareButton" data-instance="1" style="
        background: #3b82f6; color: white; border: none; padding: 10px 20px;
        border-radius: 6px; font-weight: 500; width: 100%;
      ">Send Message</button>
    </div>
  </div>
</body>
</html>`;
  }

  private createDashboardLayoutHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FailSquare Dashboard Layout</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; }

    .dashboard-container { display: flex; gap: 24px; padding: 24px; max-width: 1200px; margin: 0 auto; }
    .sidebar { width: 250px; flex-shrink: 0; }
    .main-content { flex: 1; }
    .stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }

    .failsquare-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 768px) {
      .dashboard-container { flex-direction: column; gap: 16px; padding: 16px; }
      .sidebar { width: 100%; }
      .stat-cards { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="dashboard-container">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="failsquare-card" data-component="FailSquareCard" data-instance="sidebar">
        <h3 style="margin-bottom: 16px; color: #1f2937;">Navigation</h3>
        <nav>
          <a href="#" style="display: block; padding: 8px 0; color: #3b82f6; text-decoration: none;">Dashboard</a>
          <a href="#" style="display: block; padding: 8px 0; color: #6b7280; text-decoration: none;">Failures</a>
          <a href="#" style="display: block; padding: 8px 0; color: #6b7280; text-decoration: none;">Analytics</a>
          <a href="#" style="display: block; padding: 8px 0; color: #6b7280; text-decoration: none;">Profile</a>
        </nav>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Stats Cards -->
      <div class="stat-cards">
        <div class="failsquare-card" data-component="FailSquareCard" data-instance="stat1">
          <h4 style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Total Failures</h4>
          <p style="font-size: 24px; font-weight: 600; color: #1f2937;">127</p>
        </div>
        <div class="failsquare-card" data-component="FailSquareCard" data-instance="stat2">
          <h4 style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">This Month</h4>
          <p style="font-size: 24px; font-weight: 600; color: #1f2937;">23</p>
        </div>
        <div class="failsquare-card" data-component="FailSquareCard" data-instance="stat3">
          <h4 style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Merit Score</h4>
          <p style="font-size: 24px; font-weight: 600; color: #10b981;">85%</p>
        </div>
      </div>

      <!-- Recent Failures -->
      <div class="failsquare-card" data-component="FailSquareCard" data-instance="recent">
        <h3 style="margin-bottom: 16px; color: #1f2937;">Recent Failures</h3>
        <div style="space-y: 12px;">
          <div style="padding: 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 8px;">
            <h4 style="font-size: 14px; margin-bottom: 4px;">Neural Network Convergence Issue</h4>
            <p style="font-size: 12px; color: #6b7280;">Failed to converge after 1000 epochs...</p>
          </div>
          <div style="padding: 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 8px;">
            <h4 style="font-size: 14px; margin-bottom: 4px;">Quantum Entanglement Setup</h4>
            <p style="font-size: 12px; color: #6b7280;">Decoherence too high for stable operation...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private createProductCardsHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FailSquare Product Cards</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 20px; }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .failsquare-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .failsquare-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .product-image {
      width: 100%; height: 160px; background: #e5e7eb;
      border-radius: 6px; margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="product-grid">
    <div class="failsquare-card" data-component="ProductCard" data-instance="1">
      <div class="product-image"></div>
      <h3 style="margin-bottom: 8px; color: #1f2937;">Neural Network Framework</h3>
      <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">Advanced deep learning framework with automatic differentiation and GPU acceleration.</p>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 18px; font-weight: 600; color: #1f2937;">$299</span>
        <button class="failsquare-button" data-component="FailSquareButton" data-instance="1" style="
          background: #3b82f6; color: white; border: none; padding: 8px 16px;
          border-radius: 6px; font-weight: 500;
        ">Learn More</button>
      </div>
    </div>

    <div class="failsquare-card" data-component="ProductCard" data-instance="2">
      <div class="product-image"></div>
      <h3 style="margin-bottom: 8px; color: #1f2937;">Quantum Computing SDK</h3>
      <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">Complete software development kit for quantum computing applications and simulations.</p>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 18px; font-weight: 600; color: #1f2937;">$499</span>
        <button class="failsquare-button" data-component="FailSquareButton" data-instance="2" style="
          background: #3b82f6; color: white; border: none; padding: 8px 16px;
          border-radius: 6px; font-weight: 500;
        ">Learn More</button>
      </div>
    </div>

    <div class="failsquare-card" data-component="ProductCard" data-instance="3">
      <div class="product-image"></div>
      <h3 style="margin-bottom: 8px; color: #1f2937;">Distributed Systems Toolkit</h3>
      <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">Tools and libraries for building scalable distributed systems with fault tolerance.</p>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 18px; font-weight: 600; color: #1f2937;">$399</span>
        <button class="failsquare-button" data-component="FailSquareButton" data-instance="3" style="
          background: #3b82f6; color: white; border: none; padding: 8px 16px;
          border-radius: 6px; font-weight: 500;
        ">Learn More</button>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private createResponsiveFormHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FailSquare Responsive Form</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 20px; }

    .form-container { max-width: 800px; margin: 0 auto; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .form-group { margin-bottom: 20px; }
    .form-group.full-width { grid-column: 1 / -1; }

    .form-label { display: block; margin-bottom: 6px; font-weight: 500; color: #374151; }
    .failsquare-input {
      display: block; width: 100%; padding: 10px 12px; border: 1px solid #d1d5db;
      border-radius: 6px; font-size: 14px;
    }

    .failsquare-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; gap: 16px; }
      .form-group.full-width { grid-column: 1; }
      .failsquare-card { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="form-container">
    <div class="failsquare-card" data-component="FailSquareCard" data-instance="form">
      <h2 style="margin-bottom: 24px; color: #1f2937; text-align: center;">Failure Documentation Form</h2>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Project Name</label>
          <input type="text" class="failsquare-input" data-component="FailSquareAuthInput" data-instance="1"
                 placeholder="Enter project name" />
        </div>

        <div class="form-group">
          <label class="form-label">Domain</label>
          <select class="failsquare-input" data-component="FailSquareSelect" data-instance="1">
            <option>Machine Learning</option>
            <option>Quantum Computing</option>
            <option>Distributed Systems</option>
          </select>
        </div>

        <div class="form-group full-width">
          <label class="form-label">Problem Statement</label>
          <textarea class="failsquare-input" data-component="FailSquareTextArea" data-instance="1"
                    rows="4" placeholder="Describe the problem you were trying to solve..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Failure Mode</label>
          <select class="failsquare-input" data-component="FailSquareSelect" data-instance="2">
            <option>Computational Complexity</option>
            <option>Memory Constraints</option>
            <option>Hardware Limitations</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Duration (days)</label>
          <input type="number" class="failsquare-input" data-component="FailSquareAuthInput" data-instance="2"
                 placeholder="45" />
        </div>

        <div class="form-group full-width">
          <label class="form-label">Detailed Description</label>
          <textarea class="failsquare-input" data-component="FailSquareTextArea" data-instance="2"
                    rows="6" placeholder="Provide a detailed description of what went wrong..."></textarea>
        </div>

        <div class="form-group full-width" style="display: flex; gap: 12px; justify-content: center;">
          <button class="failsquare-button" data-component="FailSquareButton" data-instance="1" style="
            background: white; color: #374151; border: 1px solid #d1d5db; padding: 10px 20px;
            border-radius: 6px; font-weight: 500;
          ">Save Draft</button>
          <button class="failsquare-button" data-component="FailSquareButton" data-instance="2" style="
            background: #3b82f6; color: white; border: none; padding: 10px 20px;
            border-radius: 6px; font-weight: 500;
          ">Submit Failure</button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Clean up temporary files
   */
  async cleanup() {
    await this.renderer.cleanup();
  }
}

// Run analysis if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('test-failsquare.ts')) {
  const analyzer = new FailSquareAnalyzer();

  analyzer.analyzeAllComponents()
    .then(() => {
      console.log('🎉 Analysis complete!');
      return analyzer.cleanup();
    })
    .catch(error => {
      console.error(`❌ Analysis failed: ${error}`);
      analyzer.cleanup();
      process.exit(1);
    });
}