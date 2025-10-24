import * as fs from 'fs/promises';
import * as path from 'path';
export class ReactRenderer {
    constructor(tempDir = './temp-rendered') {
        this.tempDir = tempDir;
    }
    /**
     * Render a React component to HTML for Visual Compiler analysis
     */
    async renderComponentToHTML(componentInfo) {
        await fs.mkdir(this.tempDir, { recursive: true });
        // Create a temporary Next.js page that renders the component
        const pageContent = this.generateNextJSPage(componentInfo);
        const pagePath = path.join(this.tempDir, 'component-page.tsx');
        await fs.writeFile(pagePath, pageContent);
        // Create a minimal Next.js config
        await this.createNextJSConfig();
        // Build and export the component as static HTML
        const htmlContent = await this.buildAndExportHTML(componentInfo.componentName);
        return htmlContent;
    }
    /**
     * Generate a Next.js page that renders the component
     */
    generateNextJSPage(componentInfo) {
        const { componentPath, componentName, props = {}, wrapperProps = {} } = componentInfo;
        return `
import React from 'react';
import ${componentName} from '${componentPath}';

// Auto-tag components for Visual Compiler
const withDataComponent = (Component: any, name: string) => {
  return React.forwardRef((props: any, ref: any) => {
    const enhancedProps = {
      ...props,
      'data-component': name,
      'data-instance': props['data-instance'] || '1'
    };
    return React.createElement(Component, { ...enhancedProps, ref });
  });
};

// Enhanced component with auto-tagging
const Enhanced${componentName} = withDataComponent(${componentName}, '${componentName}');

export default function ComponentPage() {
  return (
    <div id="visual-compiler-root" style={{ margin: 0, padding: 0 }} {...${JSON.stringify(wrapperProps)}}>
      <Enhanced${componentName} {...${JSON.stringify(props)}} />
    </div>
  );
}
`;
    }
    /**
     * Create minimal Next.js configuration
     */
    async createNextJSConfig() {
        const nextConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  experimental: {
    forceSwcTransforms: true
  }
};

module.exports = nextConfig;
`;
        const packageJson = `
{
  "name": "visual-compiler-renderer",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "next build",
    "export": "next export"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
`;
        await fs.writeFile(path.join(this.tempDir, 'next.config.js'), nextConfig);
        await fs.writeFile(path.join(this.tempDir, 'package.json'), packageJson);
        // Create pages directory structure
        const pagesDir = path.join(this.tempDir, 'pages');
        await fs.mkdir(pagesDir, { recursive: true });
        // Move component page to pages directory
        const componentPagePath = path.join(this.tempDir, 'component-page.tsx');
        const targetPagePath = path.join(pagesDir, 'index.tsx');
        if (await this.fileExists(componentPagePath)) {
            const content = await fs.readFile(componentPagePath, 'utf-8');
            await fs.writeFile(targetPagePath, content);
            await fs.unlink(componentPagePath);
        }
    }
    /**
     * Build Next.js app and export to static HTML
     */
    async buildAndExportHTML(componentName) {
        return new Promise((resolve, reject) => {
            // For now, create a simplified HTML version
            // In production, this would run Next.js build process
            const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Compiler - ${componentName}</title>
  <style>
    /* Reset styles */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    /* FailSquare component styles */
    .failsquare-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .failsquare-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      background: #3b82f6;
      color: white;
      font-weight: 500;
      cursor: pointer;
    }

    .failsquare-input {
      display: block;
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }

    .failsquare-textarea {
      display: block;
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
    }

    .failsquare-select {
      display: block;
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background: white;
    }
  </style>
</head>
<body>
  <div id="visual-compiler-root">
    <!-- Component will be injected here -->
    <div class="failsquare-card" data-component="${componentName}" data-instance="1">
      <h2>Sample ${componentName}</h2>
      <p>This is a placeholder for the actual rendered component.</p>
      <div style="margin-top: 16px;">
        <button class="failsquare-button" data-component="Button" data-instance="1">Action Button</button>
      </div>
    </div>
  </div>
</body>
</html>`;
            resolve(htmlContent);
        });
    }
    /**
     * Create HTML from a FailSquare component story
     */
    async renderStoryToHTML(storyPath, storyName) {
        // Read the story file
        const storyContent = await fs.readFile(storyPath, 'utf-8');
        // Extract component information (simplified parser)
        const componentName = this.extractComponentNameFromStory(storyContent);
        const props = this.extractPropsFromStory(storyContent, storyName);
        // Create HTML representation
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Compiler - ${componentName} - ${storyName}</title>
  <style>
    /* Include Tailwind-like utilities */
    .flex { display: flex; }
    .grid { display: grid; }
    .gap-1 { gap: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .p-2 { padding: 0.5rem; }
    .p-4 { padding: 1rem; }
    .p-6 { padding: 1.5rem; }
    .m-4 { margin: 1rem; }
    .w-full { width: 100%; }
    .max-w-md { max-width: 28rem; }
    .max-w-lg { max-width: 32rem; }
    .max-w-xl { max-width: 36rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .border { border: 1px solid #e5e7eb; }
    .bg-white { background-color: white; }
    .text-center { text-align: center; }
    .shadow-lg { box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1); }
  </style>
</head>
<body class="bg-gray-50 p-4">
  <div id="visual-compiler-root">
    ${this.generateHTMLFromStory(componentName, storyName, props)}
  </div>
</body>
</html>`;
        return htmlContent;
    }
    extractComponentNameFromStory(content) {
        const match = content.match(/export\s+default\s+{[^}]*component:\s*(\w+)/);
        return match ? match[1] : 'UnknownComponent';
    }
    extractPropsFromStory(content, storyName) {
        // Simplified prop extraction - in practice would need a proper AST parser
        const storyMatch = content.match(new RegExp(`export\\s+const\\s+${storyName}[^}]*args:\\s*{([^}]*)}`));
        if (storyMatch) {
            try {
                return JSON.parse(`{${storyMatch[1]}}`);
            }
            catch {
                return {};
            }
        }
        return {};
    }
    generateHTMLFromStory(componentName, storyName, props) {
        // Generate HTML based on component type and props
        switch (componentName) {
            case 'FailSquareCard':
                return `
          <div class="max-w-md mx-auto">
            <div class="failsquare-card" data-component="FailSquareCard" data-instance="1">
              <h3>Card Title</h3>
              <p>Card content goes here.</p>
            </div>
          </div>`;
            case 'FailSquareButton':
                return `
          <div class="p-4">
            <button class="failsquare-button" data-component="FailSquareButton" data-instance="1">
              ${props.children || 'Button Text'}
            </button>
          </div>`;
            default:
                return `
          <div class="p-4">
            <div class="failsquare-card" data-component="${componentName}" data-instance="1">
              <h3>${componentName} - ${storyName}</h3>
              <p>Rendered component placeholder</p>
            </div>
          </div>`;
        }
    }
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Clean up temporary files
     */
    async cleanup() {
        try {
            await fs.rm(this.tempDir, { recursive: true, force: true });
        }
        catch (error) {
            console.warn(`Warning: Failed to clean up temp directory: ${error}`);
        }
    }
}
