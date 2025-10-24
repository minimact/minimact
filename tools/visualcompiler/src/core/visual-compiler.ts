import * as chokidar from 'chokidar';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MultiResolutionTester, MultiResolutionReport } from './multi-resolution.js';
import { VisualCompilerConfig, STANDARD_RESOLUTIONS } from '../types/index.js';

export class VisualCompiler {
  private tester: MultiResolutionTester;
  private config: VisualCompilerConfig;
  private watcher: chokidar.FSWatcher | null = null;
  private isRunning = false;
  private onReportCallback?: (report: MultiResolutionReport) => void;

  constructor(config: Partial<VisualCompilerConfig> = {}) {
    this.config = {
      resolutions: config.resolutions || STANDARD_RESOLUTIONS,
      watchPaths: config.watchPaths || ['./components/**/*.html', './test-components/**/*.html'],
      outputPath: config.outputPath || './visual-compiler-reports',
      timeout: config.timeout || 5000,
      maxIterations: config.maxIterations || 10,
      errorCodes: config.errorCodes || {}
    };

    this.tester = new MultiResolutionTester(this.config);
  }

  /**
   * Start watching for file changes
   */
  async startWatching(onReport?: (report: MultiResolutionReport) => void): Promise<void> {
    if (this.isRunning) {
      console.log('Visual Compiler is already running');
      return;
    }

    this.onReportCallback = onReport;
    this.isRunning = true;

    // Ensure output directory exists
    if (this.config.outputPath) {
      await fs.mkdir(this.config.outputPath, { recursive: true });
    }

    console.log('🔍 Visual Compiler starting...');
    console.log(`📁 Watching paths: ${this.config.watchPaths.join(', ')}`);
    console.log(`📱 Testing resolutions: ${this.config.resolutions.map(r => `${r.name} (${r.width}x${r.height})`).join(', ')}`);

    this.watcher = chokidar.watch(this.config.watchPaths, {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: false
    });

    this.watcher
      .on('add', filePath => this.handleFileChange('added', filePath))
      .on('change', filePath => this.handleFileChange('changed', filePath))
      .on('unlink', filePath => console.log(`🗑️  File removed: ${filePath}`))
      .on('error', error => console.error(`❌ Watcher error: ${error}`));

    console.log('✅ Visual Compiler is now watching for changes...');
  }

  /**
   * Stop watching for file changes
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.isRunning = false;
    console.log('⏹️  Visual Compiler stopped');
  }

  /**
   * Analyze a single HTML file
   */
  async analyzeFile(filePath: string): Promise<MultiResolutionReport> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return await this.analyzeContent(content, filePath);
    } catch (error) {
      throw new Error(`Failed to analyze file ${filePath}: ${error}`);
    }
  }

  /**
   * Analyze HTML content directly
   */
  async analyzeContent(
    htmlContent: string,
    sourcePath?: string,
    options?: {
      generateHTMLReport?: boolean;
      captureScreenshots?: boolean;
      projectName?: string;
    }
  ): Promise<MultiResolutionReport> {
    console.log(`🔬 Analyzing content${sourcePath ? ` from ${sourcePath}` : ''}...`);

    const startTime = Date.now();
    const report = await this.tester.testAllResolutions(htmlContent, {
      generateHTMLReport: options?.generateHTMLReport,
      outputPath: this.config.outputPath,
      projectName: options?.projectName || (sourcePath ? path.basename(sourcePath) : 'Visual Compiler Analysis'),
      captureScreenshots: options?.captureScreenshots
    });
    const analysisTime = Date.now() - startTime;

    console.log(`⏱️  Analysis completed in ${analysisTime}ms`);

    // Save report if output path is configured
    if (this.config.outputPath && sourcePath) {
      await this.saveReport(report, sourcePath);
    }

    // Call callback if provided
    if (this.onReportCallback) {
      this.onReportCallback(report);
    }

    return report;
  }

  /**
   * Handle file change events
   */
  private async handleFileChange(event: string, filePath: string): Promise<void> {
    console.log(`📝 File ${event}: ${filePath}`);

    try {
      // Only process HTML files
      if (!filePath.endsWith('.html') && !filePath.endsWith('.htm')) {
        console.log(`⏭️  Skipping non-HTML file: ${filePath}`);
        return;
      }

      const report = await this.analyzeFile(filePath);

      // Log summary
      const { summary } = report;
      if (summary.errorCount > 0) {
        console.log(`❌ Found ${summary.errorCount} errors, ${summary.warningCount} warnings`);
      } else if (summary.warningCount > 0) {
        console.log(`⚠️  Found ${summary.warningCount} warnings`);
      } else {
        console.log(`✅ No issues found! Score: ${summary.overallScore}/100`);
      }

    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}: ${error}`);
    }
  }

  /**
   * Save report to file
   */
  private async saveReport(report: MultiResolutionReport, sourcePath: string): Promise<void> {
    if (!this.config.outputPath) return;

    const fileName = path.basename(sourcePath, path.extname(sourcePath));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save detailed JSON report
    const jsonPath = path.join(this.config.outputPath, `${fileName}_${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Save human-readable report
    const textPath = path.join(this.config.outputPath, `${fileName}_${timestamp}.txt`);
    const formattedReport = MultiResolutionTester.formatReport(report);
    await fs.writeFile(textPath, formattedReport);

    console.log(`💾 Reports saved: ${jsonPath}, ${textPath}`);
  }

  /**
   * Create a test HTML file for quick testing
   */
  static createTestFile(content: string, fileName: string = 'test-component.html'): Promise<void> {
    return fs.writeFile(fileName, content);
  }

  /**
   * Get current configuration
   */
  getConfig(): VisualCompilerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VisualCompilerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.tester = new MultiResolutionTester(this.config);
  }
}