/**
 * WaveHighlighter Service
 *
 * Handles visualization of cascading reactive changes in Minimact applications.
 * Shows DOM elements affected by state changes in colored "waves" based on
 * their position in the reactive dependency chain.
 */

import { ReactiveWave, WaveHighlightOptions, WaveColorSchemes, DOMPatchInfo } from '../types/cascade';

export class WaveHighlighter {
  // These fields are reserved for future overlay window implementation
  // @ts-expect-error - Reserved for future use
  private _overlayWindow: Electron.BrowserWindow | null = null;
  // @ts-expect-error - Reserved for future use
  private _highlightElements: HTMLElement[] = [];

  /**
   * Highlight cascading changes with wave animation
   */
  async highlightCascade(
    targetWindow: Electron.BrowserWindow,
    waves: ReactiveWave[],
    options: Partial<WaveHighlightOptions> = {}
  ): Promise<void> {
    const {
      animationDuration = 500,
      showLabels = true,
      colorScheme = 'rainbow'
    } = options;

    // Clear any existing highlights
    this.clearHighlights();

    // Animate each wave sequentially
    for (let i = 0; i < waves.length; i++) {
      const wave = waves[i];

      // Skip if cycle detected
      if (wave.isCycle) {
        console.warn(`[WaveHighlighter] Cycle detected at wave ${i}: ${wave.cycleState}`);
        break;
      }

      const color = this.getWaveColor(i, waves.length, colorScheme);

      // Highlight all elements in this wave
      await this.highlightWave(targetWindow, wave, color, showLabels);

      // Wait before next wave
      if (i < waves.length - 1) {
        await this.delay(animationDuration);
      }
    }
  }

  /**
   * Highlight a single wave of changes
   */
  private async highlightWave(
    targetWindow: Electron.BrowserWindow,
    wave: ReactiveWave,
    color: string,
    showLabels: boolean
  ): Promise<void> {
    for (const [index, patch] of wave.domElements.entries()) {
      try {
        // Inject highlight script into target window
        await this.injectHighlight(targetWindow, patch, {
          waveNumber: wave.waveNumber,
          orderNumber: index + 1,
          color,
          showLabels,
          patchType: patch.type,
          oldValue: patch.oldValue,
          newValue: patch.newValue
        });
      } catch (error) {
        console.error(`[WaveHighlighter] Failed to highlight element:`, error);
      }
    }
  }

  /**
   * Inject highlight script into target window
   */
  private async injectHighlight(
    targetWindow: Electron.BrowserWindow,
    patch: DOMPatchInfo,
    options: {
      waveNumber: number;
      orderNumber: number;
      color: string;
      showLabels: boolean;
      patchType: string;
      oldValue: any;
      newValue: any;
    }
  ): Promise<void> {
    const script = `
      (function() {
        const selector = ${JSON.stringify(patch.selector)};
        const element = document.querySelector(selector);

        if (!element) {
          console.warn('[Minimact SWIG] Element not found:', selector);
          return;
        }

        const rect = element.getBoundingClientRect();
        const color = ${JSON.stringify(options.color)};
        const waveNumber = ${options.waveNumber};
        const orderNumber = ${options.orderNumber};
        const showLabels = ${options.showLabels};
        const patchType = ${JSON.stringify(options.patchType)};
        const oldValue = ${JSON.stringify(options.oldValue)};
        const newValue = ${JSON.stringify(options.newValue)};

        // Create highlight overlay
        const highlight = document.createElement('div');
        highlight.className = 'minimact-swig-highlight';
        highlight.style.cssText = \`
          position: fixed;
          left: \${rect.left}px;
          top: \${rect.top}px;
          width: \${rect.width}px;
          height: \${rect.height}px;
          border: 3px solid \${color};
          border-radius: 4px;
          pointer-events: all;
          cursor: pointer;
          opacity: 0;
          transform: scale(0.95);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 20px \${color}40, inset 0 0 20px \${color}20;
          z-index: 999999;
        \`;

        // Add wave badge
        if (showLabels) {
          const badge = document.createElement('div');
          badge.className = 'wave-badge';
          badge.textContent = \`\${waveNumber}.\${orderNumber}\`;
          badge.style.cssText = \`
            position: absolute;
            top: -12px;
            left: -12px;
            width: 24px;
            height: 24px;
            background: \${color};
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            font-family: monospace;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          \`;
          highlight.appendChild(badge);
        }

        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'minimact-swig-tooltip';
        tooltip.style.cssText = \`
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-family: 'Courier New', monospace;
          white-space: nowrap;
          display: none;
          z-index: 1000000;
          pointer-events: none;
          min-width: 200px;
        \`;

        tooltip.innerHTML = \`
          <div style="font-weight: bold; margin-bottom: 4px;">
            Wave \${waveNumber} - Order \${orderNumber}
          </div>
          <div style="opacity: 0.8;">
            \${patchType}
          </div>
          <div style="margin-top: 4px;">
            <span style="color: #ff6b6b;">\${JSON.stringify(oldValue)}</span>
            <span style="margin: 0 4px;">→</span>
            <span style="color: #51cf66;">\${JSON.stringify(newValue)}</span>
          </div>
        \`;

        highlight.appendChild(tooltip);

        // Show tooltip on hover
        highlight.addEventListener('mouseenter', () => {
          tooltip.style.display = 'block';
        });
        highlight.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });

        // Append to body
        document.body.appendChild(highlight);

        // Animate in
        requestAnimationFrame(() => {
          highlight.style.opacity = '1';
          highlight.style.transform = 'scale(1)';
        });

        // Store reference for cleanup
        if (!window.__MINIMACT_SWIG_HIGHLIGHTS__) {
          window.__MINIMACT_SWIG_HIGHLIGHTS__ = [];
        }
        window.__MINIMACT_SWIG_HIGHLIGHTS__.push(highlight);

        // Auto-remove after 5 seconds
        setTimeout(() => {
          highlight.style.opacity = '0';
          highlight.style.transform = 'scale(0.95)';
          setTimeout(() => {
            if (highlight.parentNode) {
              highlight.parentNode.removeChild(highlight);
            }
          }, 300);
        }, 5000);
      })();
    `;

    await targetWindow.webContents.executeJavaScript(script);
  }

  /**
   * Clear all highlights from target window
   */
  async clearHighlights(targetWindow?: Electron.BrowserWindow): Promise<void> {
    if (!targetWindow) {
      this._highlightElements = [];
      return;
    }

    const script = `
      (function() {
        if (window.__MINIMACT_SWIG_HIGHLIGHTS__) {
          window.__MINIMACT_SWIG_HIGHLIGHTS__.forEach(highlight => {
            if (highlight.parentNode) {
              highlight.parentNode.removeChild(highlight);
            }
          });
          window.__MINIMACT_SWIG_HIGHLIGHTS__ = [];
        }
      })();
    `;

    try {
      await targetWindow.webContents.executeJavaScript(script);
    } catch (error) {
      console.error('[WaveHighlighter] Failed to clear highlights:', error);
    }
  }

  /**
   * Get color for wave based on scheme
   */
  private getWaveColor(
    waveIndex: number,
    _totalWaves: number,
    scheme: 'rainbow' | 'heat' | 'ocean'
  ): string {
    const colors = WaveColorSchemes[scheme];
    return colors[Math.min(waveIndex, colors.length - 1)];
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get wave type name for display
   */
  static getWaveTypeName(waveNumber: number): string {
    switch (waveNumber) {
      case 0:
        return 'Primary';
      case 1:
        return 'Secondary';
      case 2:
        return 'Tertiary';
      default:
        return `${waveNumber}th Order`;
    }
  }
}
