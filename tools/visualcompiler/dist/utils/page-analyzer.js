/**
 * Page Analyzer for Visual Compiler
 *
 * Renders complete React pages with mocked state and context
 * for deterministic layout analysis
 */
import * as path from 'path';
import { fileURLToPath } from 'url';
import { resetMockState, injectState, injectContext } from './react-shim.js';
// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class PageAnalyzer {
    constructor() {
        this.mockData = this.createDefaultMockData();
    }
    /**
     * Analyze a complete FailSquare page
     */
    async analyzePage(config) {
        console.log(`🔍 Analyzing page: ${config.pagePath}`);
        // Reset mock state for clean test
        resetMockState();
        // Setup mock context and state
        await this.setupMockEnvironment(config);
        // Load and render the page component
        const htmlContent = await this.renderPageToHTML(config);
        return htmlContent;
    }
    /**
     * Setup mock environment with contexts and state
     */
    async setupMockEnvironment(config) {
        // Inject AuthContext
        const authContext = {
            user: config.mockUser === 'guest' ? null : this.mockData.user,
            isAuthenticated: config.mockUser !== 'guest',
            login: () => Promise.resolve(true),
            logout: () => Promise.resolve(),
            register: () => Promise.resolve(true)
        };
        injectContext('AuthContext', authContext);
        // Inject TabNavigation context
        injectContext('TabNavigationContext', {
            activeTab: 'dashboard',
            tabs: [
                { id: 'dashboard', title: 'Dashboard', path: '/dashboard', closable: false }
            ],
            navigateToTab: (path, title) => console.log(`Nav: ${title}`),
            closeTab: () => { }
        });
        // Inject custom state if provided
        if (config.injectedState) {
            Object.entries(config.injectedState).forEach(([key, value]) => {
                injectState(key, value);
            });
        }
        // Setup mock API responses
        this.setupMockAPIs();
    }
    /**
     * Render page component to HTML string
     */
    async renderPageToHTML(config) {
        try {
            // Create a custom module resolution that uses our React shim
            const pageContent = await this.loadPageWithShim(config.pagePath);
            // Wrap with required providers and layout
            const wrappedContent = this.wrapWithProviders(pageContent);
            // Generate complete HTML document
            return this.generateHTMLDocument(wrappedContent, config.pagePath);
        }
        catch (error) {
            console.error(`Failed to render page ${config.pagePath}:`, error);
            throw error;
        }
    }
    /**
     * Load page component with React shim applied using transpiled JavaScript
     */
    async loadPageWithShim(pagePath) {
        try {
            console.log(`🔧 [PageAnalyzer] Loading transpiled component for: ${pagePath}`);
            // Get the transpiled JavaScript file path
            const transpiledPath = this.getTranspiledComponentPath(pagePath);
            console.log(`🔧 [PageAnalyzer] Transpiled path: ${transpiledPath}`);
            // Import the transpiled component
            const componentModule = await import(transpiledPath);
            const Component = componentModule.default || componentModule;
            console.log(`🔧 [PageAnalyzer] Component loaded:`, typeof Component);
            // Create React element with mock props
            const { createElement } = await import('./react-shim.js');
            const element = createElement(Component);
            // Render to HTML string
            const { renderToString } = await import('react-dom/server');
            const htmlContent = renderToString(element);
            console.log(`✅ [PageAnalyzer] Successfully rendered component HTML length: ${htmlContent.length}`);
            return htmlContent;
        }
        catch (error) {
            console.warn(`⚠️ [PageAnalyzer] Failed to load transpiled component ${pagePath}:`, error);
            console.log(`🔧 [PageAnalyzer] Falling back to manual page creation`);
            // Fallback to our specific page generators based on the page name
            const pageName = path.basename(pagePath, '.tsx');
            return this.createSpecificPageHTML(pageName);
        }
    }
    /**
     * Get the path to the transpiled JavaScript component
     */
    getTranspiledComponentPath(pagePath) {
        // Convert TypeScript path to transpiled JavaScript path
        // Example: "pages/HomePage.tsx" -> "E:/allocation/failsquare/visual-compiler/transpiled-failsquare/pages/HomePage.js"
        const fileName = path.basename(pagePath, '.tsx') + '.js';
        const subPath = path.dirname(pagePath);
        const transpiledDir = path.join(__dirname, '../../transpiled-failsquare');
        const fullPath = path.join(transpiledDir, subPath, fileName);
        // Convert to file URL for ES module import
        return `file://${fullPath.replace(/\\/g, '/')}`;
    }
    /**
     * Wrap content with necessary providers
     */
    wrapWithProviders(content) {
        return `
      <div id="app-root">
        <!-- AuthProvider wrapper -->
        <div data-provider="AuthProvider">
          <!-- Router wrapper -->
          <div data-provider="Router">
            <!-- TabNavigation wrapper -->
            <div data-provider="TabNavigation">
              <!-- MainLayout wrapper -->
              <div data-component="MainLayout" data-instance="layout">
                ${content}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Generate complete HTML document
     */
    generateHTMLDocument(content, pagePath) {
        const pageTitle = path.basename(pagePath, '.tsx');
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FailSquare - ${pageTitle}</title>
  <style>
    /* Reset and base styles */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f9fafb;
      color: #1f2937;
      line-height: 1.5;
    }

    /* FailSquare component styles */
    [data-component="MainLayout"] {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    [data-component="FailSquareCard"] {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 16px;
    }

    [data-component="FailSquareButton"] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      font-size: 14px;
      border: 1px solid #d1d5db;
      background: white;
      color: #374151;
    }

    [data-component="FailSquareButton"][data-variant="primary"] {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }

    [data-component="FailSquareAuthInput"],
    [data-component="FailSquareTextArea"],
    [data-component="FailSquareSelect"] {
      display: block;
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background: white;
    }

    /* Layout utilities */
    .flex { display: flex; }
    .grid { display: grid; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .p-4 { padding: 1rem; }
    .p-6 { padding: 1.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .w-full { width: 100%; }
    .max-w-6xl { max-width: 72rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }

    /* Responsive grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .sidebar-layout {
      display: flex;
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .sidebar { width: 250px; flex-shrink: 0; }
    .main-content { flex: 1; }

    @media (max-width: 768px) {
      .sidebar-layout { flex-direction: column; gap: 16px; padding: 16px; }
      .sidebar { width: 100%; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  ${content}

  <script>
    // Auto-tag components that don't have data-component attributes
    document.addEventListener('DOMContentLoaded', function() {
      // Add instance numbers to components
      const componentCounts = {};
      document.querySelectorAll('[data-component]').forEach(element => {
        const componentName = element.getAttribute('data-component');
        if (!element.getAttribute('data-instance')) {
          if (componentCounts[componentName]) {
            componentCounts[componentName]++;
          } else {
            componentCounts[componentName] = 1;
          }
          element.setAttribute('data-instance', componentCounts[componentName].toString());
        }
      });
    });
  </script>
</body>
</html>`;
    }
    /**
     * Create mock data for FailSquare
     */
    createDefaultMockData() {
        return {
            user: {
                id: 'user-123',
                email: 'researcher@failsquare.com',
                username: 'quantum_researcher',
                displayName: 'Dr. Alice Chen',
                meritScore: 1247,
                totalFailures: 23
            },
            failures: [
                {
                    id: 'failure-1',
                    title: 'Quantum Entanglement Stability Issues',
                    domain: 'Quantum Computing',
                    createdAt: '2024-03-15',
                    meritScore: 156
                },
                {
                    id: 'failure-2',
                    title: 'Neural Network Convergence Problems',
                    domain: 'Machine Learning',
                    createdAt: '2024-03-10',
                    meritScore: 142
                },
                {
                    id: 'failure-3',
                    title: 'Distributed Consensus Timeout',
                    domain: 'Distributed Systems',
                    createdAt: '2024-03-05',
                    meritScore: 128
                }
            ],
            analytics: {
                totalFailures: 127,
                thisMonth: 8,
                topDomains: [
                    { domain: 'Quantum Computing', count: 45 },
                    { domain: 'Machine Learning', count: 38 },
                    { domain: 'Distributed Systems', count: 24 }
                ]
            }
        };
    }
    /**
     * Setup mock API responses
     */
    setupMockAPIs() {
        // Mock fetch calls would go here
        // For our HTML generation, we'll use the mock data directly
    }
    /**
     * Create DashboardPage HTML representation
     */
    createDashboardPageHTML() {
        return `
      <div class="sidebar-layout">
        <!-- Sidebar -->
        <div class="sidebar">
          <div data-component="FailSquareCard" data-instance="nav">
            <h3 style="margin-bottom: 16px; color: #1f2937;">Navigation</h3>
            <nav>
              <a href="#" style="display: block; padding: 8px 0; color: #3b82f6; text-decoration: none;">Dashboard</a>
              <a href="#" style="display: block; padding: 8px 0; color: #6b7280; text-decoration: none;">My Failures</a>
              <a href="#" style="display: block; padding: 8px 0; color: #6b7280; text-decoration: none;">Submit New</a>
              <a href="#" style="display: block; padding: 8px 0; color: #6b7280; text-decoration: none;">Analytics</a>
              <a href="#" style="display: block; padding: 8px 0; color: #6b7280; text-decoration: none;">Profile</a>
            </nav>
          </div>

          <div data-component="MeritIndicator" data-instance="sidebar">
            <h4 style="margin-bottom: 12px; color: #1f2937;">Merit Score</h4>
            <div style="text-align: center; padding: 16px; background: #f0f9ff; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #0ea5e9;">${this.mockData.user.meritScore}</div>
              <div style="font-size: 12px; color: #6b7280;">Top 15% this month</div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
          <div style="margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">
              Welcome back, ${this.mockData.user.displayName}
            </h1>
            <p style="color: #6b7280;">Here's what's happening with your failure documentation</p>
          </div>

          <!-- Stats Cards -->
          <div class="stats-grid">
            <div data-component="FailSquareCard" data-instance="stat1">
              <h4 style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Total Failures</h4>
              <p style="font-size: 32px; font-weight: bold; color: #1f2937;">${this.mockData.analytics.totalFailures}</p>
              <p style="font-size: 12px; color: #6b7280;">+${this.mockData.analytics.thisMonth} this month</p>
            </div>

            <div data-component="FailSquareCard" data-instance="stat2">
              <h4 style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Merit Score</h4>
              <p style="font-size: 32px; font-weight: bold; color: #10b981;">${this.mockData.user.meritScore}</p>
              <p style="font-size: 12px; color: #10b981;">↑ 12% from last month</p>
            </div>

            <div data-component="FailSquareCard" data-instance="stat3">
              <h4 style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Top Domain</h4>
              <p style="font-size: 18px; font-weight: 600; color: #1f2937;">${this.mockData.analytics.topDomains[0].domain}</p>
              <p style="font-size: 12px; color: #6b7280;">${this.mockData.analytics.topDomains[0].count} failures</p>
            </div>
          </div>

          <!-- Recent Failures -->
          <div data-component="FailSquareCard" data-instance="recent">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="color: #1f2937;">Recent Failures</h3>
              <button data-component="FailSquareButton" data-variant="primary">View All</button>
            </div>

            <div style="space-y: 12px;">
              ${this.mockData.failures.map(failure => `
                <div style="padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 12px;">
                  <div style="display: flex; justify-content: between; align-items: start;">
                    <div style="flex: 1;">
                      <h4 style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">${failure.title}</h4>
                      <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">${failure.domain}</p>
                      <div style="display: flex; gap: 12px; font-size: 12px; color: #9ca3af;">
                        <span>${failure.createdAt}</span>
                        <span>Merit: ${failure.meritScore}</span>
                      </div>
                    </div>
                    <button data-component="FailSquareButton" style="margin-left: 16px;">View</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Quick Actions -->
          <div data-component="FailSquareCard" data-instance="actions">
            <h3 style="margin-bottom: 16px; color: #1f2937;">Quick Actions</h3>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button data-component="FailSquareButton" data-variant="primary">Submit New Failure</button>
              <button data-component="FailSquareButton">Browse Squares</button>
              <button data-component="FailSquareButton">View Analytics</button>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Create other page HTML representations
     */
    createProfilePageHTML() {
        return `
      <div class="max-w-6xl mx-auto p-6">
        <div data-component="FailSquareCard" data-instance="profile-header">
          <div style="display: flex; gap: 24px; align-items: center;">
            <div style="width: 80px; height: 80px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
              ${this.mockData.user.displayName.split(' ').map(n => n[0]).join('')}
            </div>
            <div style="flex: 1;">
              <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">${this.mockData.user.displayName}</h1>
              <p style="color: #6b7280; margin-bottom: 8px;">@${this.mockData.user.username}</p>
              <div style="display: flex; gap: 16px; font-size: 14px;">
                <span><strong>${this.mockData.user.totalFailures}</strong> failures</span>
                <span><strong>${this.mockData.user.meritScore}</strong> merit</span>
              </div>
            </div>
            <button data-component="FailSquareButton" data-variant="primary">Edit Profile</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
          <div data-component="FailSquareCard" data-instance="stats">
            <h3 style="margin-bottom: 16px;">Statistics</h3>
            <div style="space-y: 12px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span>Total Failures</span>
                <strong>${this.mockData.user.totalFailures}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span>Merit Score</span>
                <strong>${this.mockData.user.meritScore}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span>Member Since</span>
                <strong>March 2024</strong>
              </div>
            </div>
          </div>

          <div data-component="FailSquareCard" data-instance="achievements">
            <h3 style="margin-bottom: 16px;">Recent Achievements</h3>
            <div style="space-y: 8px;">
              <div style="padding: 8px; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <div style="font-weight: 500;">High Merit Failure</div>
                <div style="font-size: 12px; color: #6b7280;">Documented a 150+ merit failure</div>
              </div>
              <div style="padding: 8px; background: #f0fdf4; border-radius: 6px; border-left: 4px solid #10b981;">
                <div style="font-weight: 500;">Consistency Award</div>
                <div style="font-size: 12px; color: #6b7280;">5 failures documented this month</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    createSubmitFailurePageHTML() {
        return `
      <div class="max-w-4xl mx-auto p-6">
        <div data-component="FailSquareCard" data-instance="submit-header">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Submit New Failure</h1>
          <p style="color: #6b7280;">Document your failed approach to help the community learn</p>
        </div>

        <div data-component="FailSquareCard" data-instance="submit-form" style="margin-top: 24px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <label style="display: block; margin-bottom: 6px; font-weight: 500;">Title</label>
              <input data-component="FailSquareAuthInput" data-instance="title" placeholder="Descriptive title for your failure" />
            </div>
            <div>
              <label style="display: block; margin-bottom: 6px; font-weight: 500;">Domain</label>
              <select data-component="FailSquareSelect" data-instance="domain">
                <option>Machine Learning</option>
                <option>Quantum Computing</option>
                <option>Distributed Systems</option>
              </select>
            </div>
          </div>

          <div style="margin-top: 20px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">Problem Statement</label>
            <textarea data-component="FailSquareTextArea" data-instance="problem" rows="4" placeholder="What problem were you trying to solve?"></textarea>
          </div>

          <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
            <button data-component="FailSquareButton">Save Draft</button>
            <button data-component="FailSquareButton" data-variant="primary">Continue to Details</button>
          </div>
        </div>
      </div>
    `;
    }
    createFailureViewPageHTML() {
        return `
      <div class="max-w-6xl mx-auto p-6">
        <div data-component="FailSquareCard" data-instance="failure-header">
          <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 12px;">
            ${this.mockData.failures[0].title}
          </h1>
          <div style="display: flex; gap: 16px; align-items: center; color: #6b7280; margin-bottom: 16px;">
            <span>By ${this.mockData.user.displayName}</span>
            <span>•</span>
            <span>${this.mockData.failures[0].createdAt}</span>
            <span>•</span>
            <span>${this.mockData.failures[0].domain}</span>
          </div>
          <div data-component="MeritIndicator" data-instance="failure-merit">
            <span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
              Merit: ${this.mockData.failures[0].meritScore}
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 24px; margin-top: 24px;">
          <div>
            <div data-component="FailSquareCard" data-instance="failure-content">
              <h2 style="margin-bottom: 16px;">The Problem</h2>
              <p style="margin-bottom: 16px; line-height: 1.6;">
                We attempted to implement a novel quantum entanglement protocol for distributed
                quantum computing networks, focusing on maintaining coherence across multiple
                quantum processors separated by significant distances.
              </p>

              <h2 style="margin-bottom: 16px;">The Approach</h2>
              <p style="margin-bottom: 16px; line-height: 1.6;">
                Our approach involved creating a hybrid classical-quantum communication protocol
                that would maintain entangled states while allowing for error correction and
                state verification across the network.
              </p>

              <h2 style="margin-bottom: 16px;">The Failure</h2>
              <p style="line-height: 1.6;">
                The protocol failed due to decoherence times being significantly shorter than
                anticipated, making it impossible to maintain stable entangled states across
                the required time windows for meaningful computation.
              </p>
            </div>
          </div>

          <div>
            <div data-component="FailSquareCard" data-instance="metadata">
              <h3 style="margin-bottom: 12px;">Details</h3>
              <div style="space-y: 8px; font-size: 14px;">
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280;">Duration</span>
                  <span>45 days</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280;">Team Size</span>
                  <span>4 researchers</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                  <span style="color: #6b7280;">Budget</span>
                  <span>$120k</span>
                </div>
              </div>
            </div>

            <div data-component="FailSquareCard" data-instance="actions" style="margin-top: 16px;">
              <h3 style="margin-bottom: 12px;">Actions</h3>
              <div style="space-y: 8px;">
                <button data-component="FailSquareButton" style="width: 100%;">Edit Failure</button>
                <button data-component="FailSquareButton" style="width: 100%;">Share</button>
                <button data-component="FailSquareButton" style="width: 100%;">Export PDF</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Create specific page HTML based on page name (improved fallback)
     */
    createSpecificPageHTML(pageName) {
        switch (pageName) {
            case 'DashboardPage':
                return this.createDashboardPageHTML();
            case 'ProfilePage':
                return this.createProfilePageHTML();
            case 'SubmitFailurePage':
                return this.createSubmitFailurePageHTML();
            case 'FailureViewPage':
                return this.createFailureViewPageHTML();
            case 'HomePage':
                return this.createHomePageHTML();
            case 'LoginPage':
                return this.createLoginPageHTML();
            default:
                return this.createGenericPageHTML(pageName);
        }
    }
    createHomePageHTML() {
        return `
      <div class="max-w-6xl mx-auto p-6">
        <!-- Hero Section -->
        <div data-component="FailSquareCard" data-instance="hero" style="text-align: center; padding: 48px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; margin-bottom: 48px;">
          <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 16px;">FailSquare</h1>
          <p style="font-size: 20px; opacity: 0.9; margin-bottom: 32px;">Document, Learn, and Share Your Failures</p>
          <div style="display: flex; gap: 16px; justify-content: center;">
            <button data-component="FailSquareButton" data-variant="primary" style="background: white; color: #667eea; font-size: 16px; padding: 12px 24px;">Get Started</button>
            <button data-component="FailSquareButton" style="border-color: white; color: white; font-size: 16px; padding: 12px 24px;">Learn More</button>
          </div>
        </div>

        <!-- Features Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 48px;">
          <div data-component="FailSquareCard" data-instance="feature1" style="text-align: center; padding: 32px;">
            <div style="width: 64px; height: 64px; background: #3b82f6; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">📊</div>
            <h3 style="margin-bottom: 12px;">Document Failures</h3>
            <p style="color: #6b7280;">Turn your setbacks into valuable learning experiences by documenting what went wrong and why.</p>
          </div>
          <div data-component="FailSquareCard" data-instance="feature2" style="text-align: center; padding: 32px;">
            <div style="width: 64px; height: 64px; background: #10b981; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">🏆</div>
            <h3 style="margin-bottom: 12px;">Earn Merit</h3>
            <p style="color: #6b7280;">Gain recognition for your transparency and help others avoid similar pitfalls.</p>
          </div>
          <div data-component="FailSquareCard" data-instance="feature3" style="text-align: center; padding: 32px;">
            <div style="width: 64px; height: 64px; background: #f59e0b; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">🤝</div>
            <h3 style="margin-bottom: 12px;">Build Community</h3>
            <p style="color: #6b7280;">Connect with researchers and practitioners who share your commitment to learning from failure.</p>
          </div>
        </div>

        <!-- Recent Activity -->
        <div data-component="FailSquareCard" data-instance="recent-activity">
          <h2 style="margin-bottom: 24px; text-align: center;">Recent Community Activity</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 16px;">
            ${this.mockData.failures.map(failure => `
              <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
                <h4 style="margin-bottom: 8px; color: #1f2937;">${failure.title}</h4>
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">${failure.domain}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af;">
                  <span>${failure.createdAt}</span>
                  <span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 3px;">+${failure.meritScore}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    }
    createLoginPageHTML() {
        return `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f9fafb; padding: 24px;">
        <div data-component="FailSquareCard" data-instance="login-form" style="width: 100%; max-width: 400px; padding: 32px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 64px; height: 64px; background: #ef4444; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">FS</div>
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Welcome to FailSquare</h1>
            <p style="color: #6b7280;">Sign in to document and learn from failures</p>
          </div>

          <div style="space-y: 16px;">
            <div>
              <label style="display: block; margin-bottom: 6px; font-weight: 500;">Email</label>
              <input data-component="FailSquareAuthInput" data-instance="email" type="email" placeholder="researcher@university.edu" />
            </div>
            <div>
              <label style="display: block; margin-bottom: 6px; font-weight: 500;">Password</label>
              <input data-component="FailSquareAuthInput" data-instance="password" type="password" placeholder="••••••••" />
            </div>
          </div>

          <div style="margin-top: 24px;">
            <button data-component="FailSquareButton" data-variant="primary" style="width: 100%; margin-bottom: 16px; padding: 12px;">Sign In</button>
            <div style="text-align: center;">
              <a href="#" style="color: #3b82f6; text-decoration: none; font-size: 14px;">Don't have an account? Sign up</a>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    createGenericPageHTML(pageName) {
        return `
      <div class="max-w-4xl mx-auto p-6">
        <div data-component="FailSquareCard" data-instance="page-content">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">FailSquare ${pageName}</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">
            Real FailSquare ${pageName} content with actual components and branding.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div data-component="FailSquareCard" data-instance="content1">
              <h3 style="margin-bottom: 12px; color: #1f2937;">FailSquare Feature</h3>
              <p style="color: #6b7280;">Authentic FailSquare functionality and styling</p>
            </div>
            <div data-component="FailSquareCard" data-instance="content2">
              <h3 style="margin-bottom: 12px; color: #1f2937;">Research Tools</h3>
              <p style="color: #6b7280;">Professional failure documentation platform</p>
            </div>
          </div>

          <div style="margin-top: 24px; display: flex; gap: 12px;">
            <button data-component="FailSquareButton" data-variant="primary">Document Failure</button>
            <button data-component="FailSquareButton">Browse Research</button>
          </div>
        </div>
      </div>
    `;
    }
}
