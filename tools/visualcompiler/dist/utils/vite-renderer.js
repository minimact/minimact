/**
 * Vite-based Component Renderer for Visual Compiler
 *
 * Uses Vite's dev server to compile and render FailSquare components
 * with proper dependency resolution and React shim integration
 */
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class ViteRenderer {
    constructor() {
        this.viteServer = null;
    }
    async initialize() {
        // Create Vite dev server
        this.viteServer = await createServer({
            configFile: path.resolve(__dirname, '../../vite.config.ts'),
            server: { middlewareMode: true },
            appType: 'custom'
        });
    }
    async renderComponent(componentPath) {
        if (!this.viteServer) {
            await this.initialize();
        }
        try {
            // Use Vite to load and transform the component
            const module = await this.viteServer.ssrLoadModule(componentPath);
            const Component = module.default || module;
            // Create React element and render to string
            const element = createElement(Component);
            const html = renderToString(element);
            return html;
        }
        catch (error) {
            console.error(`Failed to render component ${componentPath}:`, error);
            throw error;
        }
    }
    async close() {
        if (this.viteServer) {
            await this.viteServer.close();
        }
    }
}
export const viteRenderer = new ViteRenderer();
