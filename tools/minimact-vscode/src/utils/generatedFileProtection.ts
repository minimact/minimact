import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Setup protection for auto-generated .cs files
 * Shows warning when user opens them
 */
export function setupGeneratedFileProtection(context: vscode.ExtensionContext) {
    // Track which files we've already warned about this session
    const warnedFiles = new Set<string>();

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (!editor) {
                return;
            }

            const document = editor.document;
            const filePath = document.uri.fsPath;
            const fileName = path.basename(filePath);

            // Check if this is a generated .cs file (not .codebehind.cs)
            if (!fileName.endsWith('.cs') || fileName.endsWith('.codebehind.cs')) {
                return;
            }

            // Check if in components directory
            const config = vscode.workspace.getConfiguration('minimact');
            const componentsDir = config.get<string>('componentsDirectory', 'src/components');
            if (!filePath.includes(componentsDir.replace(/\//g, path.sep))) {
                return;
            }

            // Check if warning is enabled
            const warnOnEdit = config.get<boolean>('warnOnGeneratedFileEdit', true);
            if (!warnOnEdit) {
                return;
            }

            // Don't warn twice for the same file
            if (warnedFiles.has(filePath)) {
                return;
            }
            warnedFiles.add(filePath);

            // Show warning with action buttons
            const baseName = fileName.replace('.cs', '');
            vscode.window.showWarningMessage(
                `⚠️ This file is auto-generated and should not be edited. Changes will be overwritten on next build.`,
                'Edit TSX Instead',
                'Open Codebehind',
                'Dismiss'
            ).then(async selection => {
                if (selection === 'Edit TSX Instead') {
                    await vscode.commands.executeCommand('minimact.goToTsx');
                } else if (selection === 'Open Codebehind') {
                    await vscode.commands.executeCommand('minimact.goToCodebehind');
                }
            });

            // Optionally make file read-only in editor
            const makeReadOnly = config.get<boolean>('makeGeneratedFilesReadOnly', false);
            if (makeReadOnly) {
                // Note: VS Code doesn't have a direct API to make files read-only in editor
                // This would require a custom decorator or text document provider
                // For now, we just show the warning
            }
        })
    );
}
