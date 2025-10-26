import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Provides file decorations (icons, badges, colors) for Minimact files
 */
export class FileDecorationProvider implements vscode.FileDecorationProvider {
    private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
    readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
        const fileName = path.basename(uri.fsPath);
        const dirName = path.basename(path.dirname(uri.fsPath));

        // Only decorate files in components directory
        const config = vscode.workspace.getConfiguration('minimact');
        const componentsDir = config.get<string>('componentsDirectory', 'src/components');

        if (!uri.fsPath.includes(componentsDir.replace(/\//g, path.sep))) {
            return undefined;
        }

        // Detect generated .cs files (not .codebehind.cs)
        if (fileName.endsWith('.cs') && !fileName.endsWith('.codebehind.cs')) {
            return {
                badge: '🔒',
                color: new vscode.ThemeColor('disabledForeground'),
                tooltip: 'Auto-generated - Do not edit'
            };
        }

        // Detect .codebehind.cs files
        if (fileName.endsWith('.codebehind.cs')) {
            return {
                badge: '⚙️',
                color: new vscode.ThemeColor('terminal.ansiGreen'),
                tooltip: 'Codebehind - Business logic'
            };
        }

        // Detect .tsx files
        if (fileName.endsWith('.tsx')) {
            return {
                badge: '📘',
                color: new vscode.ThemeColor('terminal.ansiBlue'),
                tooltip: 'Minimact component'
            };
        }

        return undefined;
    }
}
