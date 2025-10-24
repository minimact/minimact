#!/usr/bin/env node
import { VisualCompiler } from './core/visual-compiler.js';
import { MultiResolutionTester } from './core/multi-resolution.js';
import { PageAnalyzer } from './utils/page-analyzer.js';
import { STANDARD_RESOLUTIONS } from './types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
// Export main classes for programmatic use
export { VisualCompiler } from './core/visual-compiler.js';
export { MultiResolutionTester } from './core/multi-resolution.js';
export { BrowserRenderer } from './core/renderer.js';
export { GeometryEngine } from './core/geometry.js';
export * from './types/index.js';
/**
 * CLI interface for Visual Compiler
 */
class VisualCompilerCLI {
    static async main() {
        const args = process.argv.slice(2);
        const command = args[0];
        switch (command) {
            case 'watch':
                await this.watchCommand(args.slice(1));
                break;
            case 'analyze':
                await this.analyzeCommand(args.slice(1));
                break;
            case 'analyze-page':
                await this.analyzePageCommand(args.slice(1));
                break;
            case 'demo':
                await this.demoCommand();
                break;
            case 'init':
                await this.initCommand();
                break;
            case 'help':
            case '--help':
            case '-h':
            default:
                this.showHelp();
                break;
        }
    }
    static async watchCommand(args) {
        const watchPaths = args.length > 0 ? args : ['./test-components/**/*.html'];
        console.log('🚀 Starting Visual Compiler in watch mode...');
        const compiler = new VisualCompiler({
            watchPaths,
            outputPath: './visual-compiler-reports'
        });
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down Visual Compiler...');
            await compiler.stopWatching();
            process.exit(0);
        });
        await compiler.startWatching((report) => {
            // Real-time report callback
            const { summary } = report;
            if (summary.errorCount > 0) {
                console.log(`\n🔴 ISSUES DETECTED - Score: ${summary.overallScore}/100`);
                console.log(`   Errors: ${summary.errorCount}, Warnings: ${summary.warningCount}`);
            }
            else {
                console.log(`\n✅ NO ISSUES - Score: ${summary.overallScore}/100`);
            }
        });
        // Keep the process alive
        await new Promise(() => { });
    }
    static async analyzeCommand(args) {
        if (args.length === 0) {
            console.error('❌ Error: Please provide a file path to analyze');
            console.log('Usage: visual-compiler analyze <file.html>');
            process.exit(1);
        }
        const filePath = args[0];
        console.log(`🔬 Analyzing ${filePath}...`);
        try {
            const compiler = new VisualCompiler();
            const report = await compiler.analyzeFile(filePath);
            // Display formatted report
            const formattedReport = MultiResolutionTester.formatReport(report);
            console.log('\n' + formattedReport);
            // Exit with error code if issues found
            if (report.summary.errorCount > 0) {
                process.exit(1);
            }
        }
        catch (error) {
            console.error(`❌ Error: ${error}`);
            process.exit(1);
        }
    }
    static async analyzePageCommand(args) {
        if (args.length === 0) {
            console.error('❌ Error: Please provide a page path to analyze');
            console.log('Usage: visual-compiler analyze-page <PageComponent.tsx> [options]');
            console.log('Examples:');
            console.log('  visual-compiler analyze-page src/pages/DashboardPage.tsx');
            console.log('  visual-compiler analyze-page src/pages/ProfilePage.tsx --mock-user=admin');
            console.log('  visual-compiler analyze-page src/pages/HomePage.tsx --html-report --screenshots');
            console.log('Options:');
            console.log('  --mock-user=TYPE     Mock user type (user, admin, guest)');
            console.log('  --html-report        Generate interactive HTML report');
            console.log('  --screenshots        Capture screenshots of each resolution');
            process.exit(1);
        }
        const pagePath = args[0];
        const mockUser = args.find(arg => arg.startsWith('--mock-user='))?.split('=')[1] || 'user';
        const generateHTMLReport = args.includes('--html-report');
        const captureScreenshots = args.includes('--screenshots');
        console.log(`📄 Analyzing FailSquare page: ${pagePath}`);
        console.log(`👤 Mock user type: ${mockUser}`);
        if (generateHTMLReport)
            console.log('🌐 HTML report will be generated');
        if (captureScreenshots)
            console.log('📷 Screenshots will be captured');
        try {
            console.log('🔧 [DEBUG] Creating PageAnalyzer...');
            const pageAnalyzer = new PageAnalyzer();
            console.log('🔧 [DEBUG] Starting page analysis...');
            const htmlContent = await pageAnalyzer.analyzePage({
                pagePath,
                mockUser: mockUser,
                mockData: {},
                injectedState: {}
            });
            console.log('✅ Page rendered successfully with React hook shim');
            console.log('🔧 [DEBUG] HTML content length:', htmlContent.length);
            console.log('🔧 [DEBUG] Creating VisualCompiler...');
            const compiler = new VisualCompiler({
                outputPath: './page-analysis-reports'
            });
            console.log('🔧 [DEBUG] Starting layout analysis...');
            const report = await compiler.analyzeContent(htmlContent, `page-${path.basename(pagePath, '.tsx').toLowerCase()}.html`, {
                generateHTMLReport,
                captureScreenshots,
                projectName: `FailSquare ${path.basename(pagePath, '.tsx')} Analysis`
            });
            // Display formatted report
            const formattedReport = MultiResolutionTester.formatReport(report);
            console.log('\n' + formattedReport);
            // Page-specific insights
            console.log('\n🧠 PAGE ANALYSIS INSIGHTS');
            console.log('─'.repeat(40));
            if (report.summary.errorCount === 0) {
                console.log('✅ Page layout is clean and responsive!');
            }
            else {
                console.log('🔧 SUGGESTED FIXES:');
                report.reports.forEach(resReport => {
                    const overlapIssues = resReport.issues.filter(i => i.code.includes('E101'));
                    const overflowIssues = resReport.issues.filter(i => i.code.includes('E301'));
                    if (overlapIssues.length > 0) {
                        console.log(`  • ${resReport.resolution.name}: Add layout containers (flex/grid) to prevent overlaps`);
                    }
                    if (overflowIssues.length > 0) {
                        console.log(`  • ${resReport.resolution.name}: Add responsive width constraints (max-width: 100%)`);
                    }
                });
            }
            console.log(`\n📊 Page Score: ${report.summary.overallScore}/100`);
            console.log(`📁 Detailed report saved in ./page-analysis-reports/`);
            // Exit with error code if critical issues found
            if (report.summary.errorCount > 0) {
                process.exit(1);
            }
        }
        catch (error) {
            console.error(`❌ Error analyzing page: ${error}`);
            process.exit(1);
        }
    }
    static async demoCommand() {
        console.log('🎭 Creating demo components...');
        await this.createDemoComponents();
        console.log('✅ Demo components created in ./test-components/');
        console.log('Run "visual-compiler watch" to see the Visual Compiler in action!');
    }
    static async initCommand() {
        console.log('🔧 Initializing Visual Compiler project...');
        // Create directory structure
        await fs.mkdir('./test-components', { recursive: true });
        await fs.mkdir('./visual-compiler-reports', { recursive: true });
        // Create basic configuration
        const config = {
            resolutions: STANDARD_RESOLUTIONS,
            watchPaths: ['./test-components/**/*.html'],
            outputPath: './visual-compiler-reports',
            timeout: 5000
        };
        await fs.writeFile('./visual-compiler.config.json', JSON.stringify(config, null, 2));
        // Create a sample component
        await this.createSampleComponent();
        console.log('✅ Visual Compiler project initialized!');
        console.log('📁 Created directories: ./test-components, ./visual-compiler-reports');
        console.log('⚙️  Created config: ./visual-compiler.config.json');
        console.log('📄 Created sample: ./test-components/sample.html');
        console.log('\nNext steps:');
        console.log('  1. Edit test-components/sample.html');
        console.log('  2. Run: visual-compiler watch');
    }
    static async createSampleComponent() {
        const sampleHTML = `
<!-- Sample component for Visual Compiler testing -->
<div class="container" style="padding: 20px; max-width: 1200px; margin: 0 auto;">

  <div class="card" data-component="HeaderCard" style="
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  ">
    <h1 style="margin: 0 0 8px 0; color: #1f2937;">Welcome to Visual Compiler</h1>
    <p style="margin: 0; color: #6b7280;">This is a sample component to test layout analysis</p>
  </div>

  <div style="display: flex; gap: 16px; flex-wrap: wrap;">

    <div class="card" data-component="ProductCard" data-instance="1" style="
      flex: 1;
      min-width: 300px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    ">
      <h3 style="margin: 0 0 12px 0; color: #1f2937;">Product 1</h3>
      <p style="margin: 0 0 16px 0; color: #6b7280;">Description of the first product</p>
      <button class="button" data-component="Button" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
      ">Learn More</button>
    </div>

    <div class="card" data-component="ProductCard" data-instance="2" style="
      flex: 1;
      min-width: 300px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    ">
      <h3 style="margin: 0 0 12px 0; color: #1f2937;">Product 2</h3>
      <p style="margin: 0 0 16px 0; color: #6b7280;">Description of the second product</p>
      <button class="button" data-component="Button" style="
        background: #10b981;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
      ">Buy Now</button>
    </div>

  </div>

</div>`;
        await fs.writeFile('./test-components/sample.html', sampleHTML.trim());
    }
    static async createDemoComponents() {
        await fs.mkdir('./test-components', { recursive: true });
        // Good layout example
        const goodLayout = `
<!-- GOOD LAYOUT: Proper spacing and responsive design -->
<div class="container" style="padding: 20px; max-width: 1200px; margin: 0 auto;">
  <div style="display: flex; gap: 20px; flex-wrap: wrap;">
    <div class="card" data-component="Card" data-instance="1" style="
      flex: 1; min-width: 250px; background: white; border: 1px solid #e5e7eb;
      border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    ">
      <h3>Good Card 1</h3>
      <p>This card has proper spacing and responsive behavior.</p>
    </div>
    <div class="card" data-component="Card" data-instance="2" style="
      flex: 1; min-width: 250px; background: white; border: 1px solid #e5e7eb;
      border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    ">
      <h3>Good Card 2</h3>
      <p>Cards maintain proper gaps and align correctly.</p>
    </div>
  </div>
</div>`;
        // Bad layout example (overlapping)
        const badLayoutOverlap = `
<!-- BAD LAYOUT: Overlapping components -->
<div class="container" style="padding: 20px; position: relative;">
  <div class="card" data-component="Card" data-instance="1" style="
    position: absolute; top: 20px; left: 20px; width: 300px; height: 200px;
    background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;
  ">
    <h3>Overlapping Card 1</h3>
    <p>This card overlaps with the next one.</p>
  </div>
  <div class="card" data-component="Card" data-instance="2" style="
    position: absolute; top: 20px; left: 200px; width: 300px; height: 200px;
    background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;
  ">
    <h3>Overlapping Card 2</h3>
    <p>This creates a layout issue that Visual Compiler will detect.</p>
  </div>
</div>`;
        // Bad layout example (viewport overflow)
        const badLayoutOverflow = `
<!-- BAD LAYOUT: Viewport overflow on mobile -->
<div class="container" style="padding: 20px;">
  <div class="card" data-component="Card" data-instance="1" style="
    width: 800px; background: white; border: 1px solid #e5e7eb;
    border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  ">
    <h3>Too Wide Card</h3>
    <p>This card is 800px wide and will overflow on mobile devices (390px).</p>
    <p>Visual Compiler will detect this as a responsive layout issue.</p>
  </div>
</div>`;
        await fs.writeFile('./test-components/good-layout.html', goodLayout.trim());
        await fs.writeFile('./test-components/bad-layout-overlap.html', badLayoutOverlap.trim());
        await fs.writeFile('./test-components/bad-layout-overflow.html', badLayoutOverflow.trim());
    }
    static showHelp() {
        console.log(`
🔍 Visual Compiler - AI Layout Analysis Tool

USAGE:
  visual-compiler <command> [options]

COMMANDS:
  init                    Initialize a new Visual Compiler project
  watch [paths...]        Watch files for changes and analyze layouts
  analyze <file>          Analyze a single HTML file
  analyze-page <page>     Analyze a React page component with mock state
  demo                    Create demo components to test
  help                    Show this help message

EXAMPLES:
  visual-compiler init                          # Set up project
  visual-compiler watch                         # Watch ./test-components
  visual-compiler watch "./components/*.html"   # Watch custom path
  visual-compiler analyze component.html        # Analyze single file
  visual-compiler analyze-page src/pages/DashboardPage.tsx  # Analyze React page
  visual-compiler analyze-page src/pages/ProfilePage.tsx --mock-user=admin
  visual-compiler analyze-page src/pages/HomePage.tsx --html-report --screenshots
  visual-compiler demo                          # Create test components

WHAT IT DOES:
  ✅ Detects component overlaps with precise measurements
  ✅ Identifies viewport overflow across resolutions
  ✅ Analyzes spacing and alignment issues
  ✅ Tests responsive behavior (mobile, tablet, desktop)
  ✅ Provides actionable feedback with error codes

ERROR CODES:
  E101 - Component overlap detected
  E301 - Component extends beyond viewport
  W201 - Unusual gap between components
  I401 - Components properly aligned

For more info: https://github.com/your-repo/visual-compiler
`);
    }
}
// Run CLI if this file is executed directly
if (process.argv[1] && process.argv[1].includes('index.js')) {
    VisualCompilerCLI.main().catch(error => {
        console.error(`❌ Fatal error: ${error}`);
        process.exit(1);
    });
}
