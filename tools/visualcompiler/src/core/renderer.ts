import { chromium, Browser, Page } from 'playwright';
import { ComponentBounds, Resolution, AnalysisReport } from '../types/index.js';
import { GeometryEngine } from './geometry.js';

export class BrowserRenderer {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Initialize the browser instance
   */
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    this.page = await this.browser.newPage();

    // Set reasonable defaults for consistent rendering
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });
  }

  /**
   * Cleanup browser resources
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Render a component at a specific resolution and extract layout data
   */
  async renderComponent(
    htmlContent: string,
    resolution: Resolution,
    timeout: number = 5000
  ): Promise<AnalysisReport> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      // Set viewport size
      await this.page.setViewportSize({
        width: resolution.width,
        height: resolution.height
      });

      // Set content with component auto-tagging script
      const wrappedContent = this.wrapContentWithTagging(htmlContent);
      await this.page.setContent(wrappedContent);

      // Wait for rendering to complete
      await this.page.waitForLoadState('networkidle', { timeout });

      // Extract component bounds
      const components = await this.extractComponentBounds();

      // Analyze layout
      const issues = GeometryEngine.analyzeLayout(components, resolution);

      const renderTime = Date.now() - startTime;

      return {
        resolution,
        components,
        issues,
        timestamp: Date.now(),
        renderTime
      };

    } catch (error) {
      throw new Error(`Failed to render component: ${error}`);
    }
  }

  /**
   * Extract bounding boxes for all tagged components
   */
  private async extractComponentBounds(): Promise<ComponentBounds[]> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    return await this.page.evaluate(() => {
      const components: ComponentBounds[] = [];
      const elements = document.querySelectorAll('[data-component]');

      // Create a map for quick element lookup
      const elementMap = new Map();
      elements.forEach((element, index) => {
        const componentName = element.getAttribute('data-component') || `Unknown-${index}`;
        const instance = element.getAttribute('data-instance') || undefined;
        const key = instance ? `${componentName}-${instance}` : componentName;
        elementMap.set(key, element);
      });

      elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const componentName = element.getAttribute('data-component') || `Unknown-${index}`;
        const instance = element.getAttribute('data-instance') || undefined;

        // Find parent component (if any)
        let parentComponent = null;
        let parentElement = element.parentElement;
        while (parentElement && parentElement !== document.body) {
          const parentComponentName = parentElement.getAttribute('data-component');
          if (parentComponentName) {
            const parentInstance = parentElement.getAttribute('data-instance');
            parentComponent = parentInstance ? `${parentComponentName}-${parentInstance}` : parentComponentName;
            break;
          }
          parentElement = parentElement.parentElement;
        }

        // Find child components
        const childComponents: string[] = [];
        const childElements = element.querySelectorAll('[data-component]');
        childElements.forEach(child => {
          // Skip if child is the element itself
          if (child === element) return;

          const childComponentName = child.getAttribute('data-component');
          const childInstance = child.getAttribute('data-instance');
          if (childComponentName) {
            const childKey = childInstance ? `${childComponentName}-${childInstance}` : childComponentName;
            childComponents.push(childKey);
          }
        });

        components.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          component: componentName,
          instance,
          selector: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '') +
                   (element.className ? `.${element.className.split(' ').join('.')}` : ''),
          parentComponent,
          childComponents
        });
      });

      return components;
    });
  }

  /**
   * Wrap HTML content with component auto-tagging and styling
   */
  private wrapContentWithTagging(htmlContent: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Compiler Preview</title>
  <style>
    /* Reset styles for consistent rendering */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      color: #333;
      background: #fff;
    }

    /* Common component styles */
    .card, [data-component*="Card"] {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .button, [data-component*="Button"] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      background: white;
      cursor: pointer;
      font-weight: 500;
    }

    .input, [data-component*="Input"] {
      display: block;
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }

    /* Layout utilities */
    .flex { display: flex; }
    .grid { display: grid; }
    .block { display: block; }
    .inline { display: inline; }
    .inline-block { display: inline-block; }

    /* Spacing utilities */
    .gap-1 { gap: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .gap-8 { gap: 2rem; }

    .p-2 { padding: 0.5rem; }
    .p-4 { padding: 1rem; }
    .p-6 { padding: 1.5rem; }
    .p-8 { padding: 2rem; }

    .m-2 { margin: 0.5rem; }
    .m-4 { margin: 1rem; }
    .m-6 { margin: 1.5rem; }
    .m-8 { margin: 2rem; }

    /* Width utilities */
    .w-full { width: 100%; }
    .w-1\\/2 { width: 50%; }
    .w-1\\/3 { width: 33.333333%; }
    .w-2\\/3 { width: 66.666667%; }
    .w-1\\/4 { width: 25%; }
    .w-3\\/4 { width: 75%; }

    /* Visual debugging - highlight components */
    [data-component] {
      position: relative;
    }

    [data-component]::before {
      content: attr(data-component);
      position: absolute;
      top: -20px;
      left: 0;
      font-size: 10px;
      color: #666;
      background: #f9f9f9;
      padding: 2px 4px;
      border-radius: 2px;
      border: 1px solid #e0e0e0;
      z-index: 1000;
      pointer-events: none;
      opacity: 0; /* Hidden by default, can be toggled for debugging */
    }
  </style>
</head>
<body>
  <div id="root">
    ${htmlContent}
  </div>

  <script>
    // Auto-tag components that don't already have data-component attributes
    document.addEventListener('DOMContentLoaded', function() {
      const autoTagSelectors = [
        'button:not([data-component])',
        'input:not([data-component])',
        '.card:not([data-component])',
        '.button:not([data-component])',
        '.input:not([data-component])',
        '[class*="Card"]:not([data-component])',
        '[class*="Button"]:not([data-component])',
        '[class*="Input"]:not([data-component])'
      ];

      autoTagSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          if (!element.getAttribute('data-component')) {
            const tagName = element.tagName.toLowerCase();
            const className = element.className;

            let componentName = tagName;
            if (className.includes('Card')) componentName = 'Card';
            else if (className.includes('Button')) componentName = 'Button';
            else if (className.includes('Input')) componentName = 'Input';

            element.setAttribute('data-component', componentName + '-' + index);
          }
        });
      });

      // Add instance numbers to components with the same name
      const componentCounts = {};
      document.querySelectorAll('[data-component]').forEach(element => {
        const componentName = element.getAttribute('data-component');
        if (componentCounts[componentName]) {
          componentCounts[componentName]++;
          element.setAttribute('data-instance', componentCounts[componentName].toString());
        } else {
          componentCounts[componentName] = 1;
          element.setAttribute('data-instance', '1');
        }
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Take a screenshot for visual debugging (optional)
   */
  async takeScreenshot(filePath: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    await this.page.screenshot({
      path: filePath,
      fullPage: true
    });
  }
}