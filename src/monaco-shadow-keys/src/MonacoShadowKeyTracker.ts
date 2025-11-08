/**
 * Monaco Shadow Key Tracker
 *
 * Integrates ShadowKeyMap with Monaco Editor
 * - Tracks document changes in real-time
 * - Updates shadow key map on every edit
 * - Provides save handler for .keys.json export
 */

import * as monaco from 'monaco-editor';
import { ShadowKeyMap } from './core/ShadowKeyMap';
import { JSXParser } from './core/JSXParser';
import { ShadowKeyMapData } from './core/types';

export class MonacoShadowKeyTracker {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private shadowKeyMap: ShadowKeyMap;
  private sourceFile: string;
  private updateTimeoutId: number | null = null;
  private updateDelay: number = 500; // ms delay before re-parsing
  private onUpdateCallback?: (keyMapData: ShadowKeyMapData) => void;

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    sourceFile: string,
    existingKeyMap?: ShadowKeyMapData,
    onUpdate?: (keyMapData: ShadowKeyMapData) => void
  ) {
    this.editor = editor;
    this.sourceFile = sourceFile;
    this.shadowKeyMap = new ShadowKeyMap(sourceFile, existingKeyMap);
    this.onUpdateCallback = onUpdate;

    this.setupEventListeners();
    this.initialParse();
  }

  /**
   * Set up Monaco event listeners
   */
  private setupEventListeners(): void {
    // Listen to content changes
    this.editor.onDidChangeModelContent(() => {
      this.scheduleUpdate();
    });

    // Listen to save events (Ctrl+S)
    this.editor.addAction({
      id: 'minimact-save',
      label: 'Save with Shadow Keys',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        this.handleSave();
      }
    });
  }

  /**
   * Schedule a shadow key map update (debounced)
   */
  private scheduleUpdate(): void {
    if (this.updateTimeoutId !== null) {
      clearTimeout(this.updateTimeoutId);
    }

    this.updateTimeoutId = window.setTimeout(() => {
      this.updateShadowKeyMap();
    }, this.updateDelay);
  }

  /**
   * Update shadow key map by re-parsing the document
   */
  private async updateShadowKeyMap(): Promise<void> {
    const model = this.editor.getModel();
    if (!model) return;

    const sourceCode = model.getValue();

    try {
      console.log('[Monaco Shadow Keys] Parsing JSX...');
      const tags = await JSXParser.parseJSX(sourceCode, this.sourceFile);

      console.log(`[Monaco Shadow Keys] Found ${tags.length} JSX tags`);
      this.shadowKeyMap.updateFromTags(tags);

      // Log key map for debugging
      const allKeys = this.shadowKeyMap.getAllKeys();
      console.log('[Monaco Shadow Keys] Updated key map:', allKeys);

      // Show notification (optional)
      this.showNotification(`Updated ${allKeys.length} JSX keys`, 'info');

      // Notify callback (for live preview)
      if (this.onUpdateCallback) {
        const keyMapData = this.shadowKeyMap.serialize();
        this.onUpdateCallback(keyMapData);
      }
    } catch (error) {
      console.error('[Monaco Shadow Keys] Failed to update key map:', error);
      this.showNotification('Failed to parse JSX', 'error');
    }
  }

  /**
   * Initial parse on load
   */
  private async initialParse(): Promise<void> {
    await this.updateShadowKeyMap();
  }

  /**
   * Handle save (Ctrl+S)
   */
  private async handleSave(): Promise<void> {
    const model = this.editor.getModel();
    if (!model) return;

    try {
      // Update key map one final time before saving
      await this.updateShadowKeyMap();

      // Serialize shadow key map
      const keyMapData = this.shadowKeyMap.serialize();
      const keyMapJSON = JSON.stringify(keyMapData, null, 2);

      // Download .keys.json file
      this.downloadFile(`${this.sourceFile}.keys.json`, keyMapJSON);

      // Also save the source file
      const sourceCode = model.getValue();
      this.downloadFile(this.sourceFile, sourceCode);

      this.showNotification('Saved source + shadow keys', 'success');

      console.log('[Monaco Shadow Keys] Saved:', keyMapData);
    } catch (error) {
      console.error('[Monaco Shadow Keys] Failed to save:', error);
      this.showNotification('Failed to save', 'error');
    }
  }

  /**
   * Download file (browser download)
   */
  private downloadFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Show notification in Monaco editor
   */
  private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
    // Monaco doesn't have built-in notifications, so we'll use console for now
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [Monaco Shadow Keys] ${message}`);

    // TODO: Add visual notification overlay
  }

  /**
   * Get current shadow key map data
   */
  getShadowKeyMapData(): ShadowKeyMapData {
    return this.shadowKeyMap.serialize();
  }

  /**
   * Get key at cursor position
   */
  getKeyAtCursor(): string | null {
    const position = this.editor.getPosition();
    if (!position) return null;

    const keyEntry = this.shadowKeyMap.getKeyAt(position.lineNumber, position.column);
    return keyEntry ? keyEntry.hexPath : null;
  }

  /**
   * Dispose of tracker
   */
  dispose(): void {
    if (this.updateTimeoutId !== null) {
      clearTimeout(this.updateTimeoutId);
    }
  }
}
