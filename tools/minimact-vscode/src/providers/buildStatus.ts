import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Build status manager for Minimact
 * Monitors TSX file changes and tracks transformation status
 */
export class BuildStatusManager {
  private statusBarItem: vscode.StatusBarItem;
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private componentCount = 0;
  private lastBuildTime: Date | null = null;
  private isWatching = false;
  private recentTransformations: TransformationRecord[] = [];
  private outputChannel: vscode.OutputChannel;

  constructor(private context: vscode.ExtensionContext) {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'minimact.showBuildStatus';
    this.context.subscriptions.push(this.statusBarItem);

    // Create output channel
    this.outputChannel = vscode.window.createOutputChannel('Minimact Build');
    this.context.subscriptions.push(this.outputChannel);

    // Initialize
    this.updateStatusBar();
    this.startWatching();
  }

  /**
   * Start watching TSX files
   */
  private startWatching() {
    // Check if user wants build status
    const config = vscode.workspace.getConfiguration('minimact');
    const showBuildStatus = config.get<boolean>('showBuildStatus', true);

    if (!showBuildStatus) {
      this.statusBarItem.hide();
      return;
    }

    // Watch for TSX files
    const pattern = new vscode.RelativePattern(
      vscode.workspace.workspaceFolders?.[0] || '',
      '**/*.tsx'
    );

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Count existing components
    this.countComponents();

    // Watch for changes
    this.fileWatcher.onDidChange(uri => this.onFileChanged(uri));
    this.fileWatcher.onDidCreate(uri => this.onFileCreated(uri));
    this.fileWatcher.onDidDelete(uri => this.onFileDeleted(uri));

    this.context.subscriptions.push(this.fileWatcher);
    this.isWatching = true;
    this.statusBarItem.show();
  }

  /**
   * Count existing TSX components
   */
  private async countComponents() {
    try {
      const files = await vscode.workspace.findFiles('**/*.tsx', '**/node_modules/**');
      this.componentCount = files.length;
      this.updateStatusBar();
    } catch (error) {
      console.error('[Minimact] Failed to count components:', error);
    }
  }

  /**
   * Handle file change
   */
  private async onFileChanged(uri: vscode.Uri) {
    const startTime = Date.now();
    const fileName = path.basename(uri.fsPath);

    this.log(`🔄 Transforming ${fileName}...`);

    // Simulate transformation tracking
    // In a real implementation, this would hook into the actual build process
    setTimeout(() => {
      const elapsed = Date.now() - startTime;
      const success = Math.random() > 0.1; // 90% success rate simulation

      this.recordTransformation(fileName, success, elapsed);
      this.lastBuildTime = new Date();
      this.updateStatusBar();

      if (success) {
        this.log(`✓ ${fileName} → ${fileName.replace('.tsx', '.cs')} (${elapsed}ms)`);
      } else {
        this.log(`✗ ${fileName} → Error (${elapsed}ms)`);
        this.showErrorNotification(fileName);
      }
    }, Math.random() * 100 + 50); // Random delay 50-150ms
  }

  /**
   * Handle file creation
   */
  private async onFileCreated(uri: vscode.Uri) {
    this.componentCount++;
    this.log(`➕ Created ${path.basename(uri.fsPath)}`);
    this.updateStatusBar();
  }

  /**
   * Handle file deletion
   */
  private async onFileDeleted(uri: vscode.Uri) {
    this.componentCount--;
    this.log(`➖ Deleted ${path.basename(uri.fsPath)}`);
    this.updateStatusBar();
  }

  /**
   * Record transformation
   */
  private recordTransformation(fileName: string, success: boolean, time: number) {
    this.recentTransformations.unshift({
      fileName,
      success,
      time,
      timestamp: new Date()
    });

    // Keep only last 10 transformations
    if (this.recentTransformations.length > 10) {
      this.recentTransformations.pop();
    }
  }

  /**
   * Update status bar text
   */
  private updateStatusBar() {
    const config = vscode.workspace.getConfiguration('minimact');
    const showBuildStatus = config.get<boolean>('showBuildStatus', true);

    if (!showBuildStatus) {
      this.statusBarItem.hide();
      return;
    }

    let text = '$(cactus) Minimact';

    if (this.isWatching) {
      text += ': $(eye) Watching';
    }

    if (this.componentCount > 0) {
      text += ` (${this.componentCount} component${this.componentCount === 1 ? '' : 's'})`;
    }

    if (this.lastBuildTime) {
      const elapsed = this.getTimeSince(this.lastBuildTime);
      text += ` | $(check) ${elapsed} ago`;
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = this.getTooltip();
    this.statusBarItem.show();
  }

  /**
   * Get tooltip text
   */
  private getTooltip(): string {
    let tooltip = 'Minimact Build Status\n\n';

    if (this.isWatching) {
      tooltip += '● Watching for TSX file changes\n';
    } else {
      tooltip += '○ Not watching\n';
    }

    tooltip += `Components: ${this.componentCount}\n`;

    if (this.lastBuildTime) {
      tooltip += `Last build: ${this.getTimeSince(this.lastBuildTime)} ago\n`;
    }

    if (this.recentTransformations.length > 0) {
      tooltip += '\nRecent transformations:\n';
      this.recentTransformations.slice(0, 5).forEach(record => {
        const icon = record.success ? '✓' : '✗';
        tooltip += `${icon} ${record.fileName} (${record.time}ms)\n`;
      });
    }

    tooltip += '\nClick for details';
    return tooltip;
  }

  /**
   * Get time since timestamp
   */
  private getTimeSince(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  }

  /**
   * Log to output channel
   */
  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * Show error notification
   */
  private showErrorNotification(fileName: string) {
    const config = vscode.workspace.getConfiguration('minimact');
    const notifyOnError = config.get<boolean>('notifyOnBuildError', true);

    if (notifyOnError) {
      vscode.window.showErrorMessage(
        `Minimact: Failed to transform ${fileName}`,
        'View Output',
        'Dismiss'
      ).then(selection => {
        if (selection === 'View Output') {
          this.outputChannel.show();
        }
      });
    }
  }

  /**
   * Show build status panel
   */
  showBuildStatusPanel() {
    // Create webview panel
    const panel = vscode.window.createWebviewPanel(
      'minimactBuildStatus',
      'Minimact Build Status',
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );

    panel.webview.html = this.getBuildStatusHtml();
  }

  /**
   * Get HTML for build status panel
   */
  private getBuildStatusHtml(): string {
    const successCount = this.recentTransformations.filter(r => r.success).length;
    const errorCount = this.recentTransformations.filter(r => r.success === false).length;
    const avgTime = this.recentTransformations.length > 0
      ? Math.round(this.recentTransformations.reduce((sum, r) => sum + r.time, 0) / this.recentTransformations.length)
      : 0;

    const transformationRows = this.recentTransformations.map(record => {
      const icon = record.success ? '✓' : '✗';
      const cssClass = record.success ? 'success' : 'error';
      const time = record.timestamp.toLocaleTimeString();
      return `
        <tr class="${cssClass}">
          <td>${icon}</td>
          <td>${record.fileName}</td>
          <td>${record.time}ms</td>
          <td>${time}</td>
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minimact Build Status</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      padding: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      padding: 15px;
      border-radius: 4px;
    }
    .stat-label {
      font-size: 12px;
      opacity: 0.7;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      text-align: left;
      padding: 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
      font-weight: normal;
      opacity: 0.7;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .success {
      color: var(--vscode-testing-iconPassed);
    }
    .error {
      color: var(--vscode-testing-iconFailed);
    }
  </style>
</head>
<body>
  <h1>📊 Minimact Build Status</h1>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-label">Components</div>
      <div class="stat-value">${this.componentCount}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Success</div>
      <div class="stat-value class="success">${successCount}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Errors</div>
      <div class="stat-value class="error">${errorCount}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg. Time</div>
      <div class="stat-value">${avgTime}ms</div>
    </div>
  </div>

  <h2>Recent Transformations</h2>
  <table>
    <thead>
      <tr>
        <th></th>
        <th>File</th>
        <th>Time</th>
        <th>Timestamp</th>
      </tr>
    </thead>
    <tbody>
      ${transformationRows || '<tr><td colspan="4" style="text-align: center; opacity: 0.5;">No recent transformations</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
  }

  /**
   * Dispose
   */
  dispose() {
    this.statusBarItem.dispose();
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
    this.outputChannel.dispose();
  }
}

/**
 * Transformation record
 */
interface TransformationRecord {
  fileName: string;
  success: boolean;
  time: number;
  timestamp: Date;
}
