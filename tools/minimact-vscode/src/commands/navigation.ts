import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Register all navigation commands for switching between related files
 */
export function registerNavigationCommands(context: vscode.ExtensionContext) {
    // Go to TSX source
    context.subscriptions.push(
        vscode.commands.registerCommand('minimact.goToTsx', async () => {
            const tsxPath = await findRelatedFile('tsx');
            if (tsxPath) {
                await openFile(tsxPath);
            } else {
                vscode.window.showErrorMessage('Could not find related .tsx file');
            }
        })
    );

    // Go to generated C# file
    context.subscriptions.push(
        vscode.commands.registerCommand('minimact.goToGenerated', async () => {
            const csPath = await findRelatedFile('cs');
            if (csPath) {
                await openFile(csPath);
            } else {
                vscode.window.showWarningMessage('Generated .cs file not found. Run build first.');
            }
        })
    );

    // Go to codebehind file
    context.subscriptions.push(
        vscode.commands.registerCommand('minimact.goToCodebehind', async () => {
            const codebehindPath = await findRelatedFile('codebehind');
            if (codebehindPath) {
                await openFile(codebehindPath);
            } else {
                const answer = await vscode.window.showInformationMessage(
                    'Codebehind file does not exist. Create it?',
                    'Create',
                    'Cancel'
                );
                if (answer === 'Create') {
                    await vscode.commands.executeCommand('minimact.createCodebehind');
                }
            }
        })
    );

    // Switch between related files (cycles through TSX → CS → Codebehind)
    context.subscriptions.push(
        vscode.commands.registerCommand('minimact.switchFiles', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const currentPath = editor.document.uri.fsPath;
            const ext = path.extname(currentPath);

            if (currentPath.endsWith('.tsx')) {
                // TSX → Generated CS
                const csPath = await findRelatedFile('cs');
                if (csPath) {
                    await openFile(csPath);
                }
            } else if (currentPath.endsWith('.codebehind.cs')) {
                // Codebehind → TSX
                const tsxPath = await findRelatedFile('tsx');
                if (tsxPath) {
                    await openFile(tsxPath);
                }
            } else if (currentPath.endsWith('.cs')) {
                // Generated CS → Codebehind (or TSX if no codebehind)
                const codebehindPath = await findRelatedFile('codebehind');
                if (codebehindPath) {
                    await openFile(codebehindPath);
                } else {
                    const tsxPath = await findRelatedFile('tsx');
                    if (tsxPath) {
                        await openFile(tsxPath);
                    }
                }
            }
        })
    );

    // Create codebehind file
    context.subscriptions.push(
        vscode.commands.registerCommand('minimact.createCodebehind', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            const currentPath = editor.document.uri.fsPath;
            const baseName = getBaseName(currentPath);
            const dirName = path.dirname(currentPath);
            const codebehindPath = path.join(dirName, `${baseName}.codebehind.cs`);

            if (fs.existsSync(codebehindPath)) {
                vscode.window.showWarningMessage('Codebehind file already exists');
                await openFile(codebehindPath);
                return;
            }

            // Create template codebehind file
            const template = generateCodebehindTemplate(baseName);
            fs.writeFileSync(codebehindPath, template);

            vscode.window.showInformationMessage(`Created ${baseName}.codebehind.cs`);
            await openFile(codebehindPath);
        })
    );
}

/**
 * Find related file based on current file
 */
async function findRelatedFile(targetType: 'tsx' | 'cs' | 'codebehind'): Promise<string | undefined> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return undefined;
    }

    const currentPath = editor.document.uri.fsPath;
    const baseName = getBaseName(currentPath);
    const dirName = path.dirname(currentPath);

    let targetPath: string;
    if (targetType === 'tsx') {
        targetPath = path.join(dirName, `${baseName}.tsx`);
    } else if (targetType === 'cs') {
        targetPath = path.join(dirName, `${baseName}.cs`);
    } else {
        targetPath = path.join(dirName, `${baseName}.codebehind.cs`);
    }

    return fs.existsSync(targetPath) ? targetPath : undefined;
}

/**
 * Get base name without extension(s)
 */
function getBaseName(filePath: string): string {
    const fileName = path.basename(filePath);

    // Remove .codebehind.cs
    if (fileName.endsWith('.codebehind.cs')) {
        return fileName.replace('.codebehind.cs', '');
    }

    // Remove .tsx or .cs
    return fileName.replace(/\.(tsx|cs)$/, '');
}

/**
 * Open file in editor
 */
async function openFile(filePath: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
}

/**
 * Generate codebehind template
 */
function generateCodebehindTemplate(componentName: string): string {
    return `using Microsoft.EntityFrameworkCore;

namespace MyApp.Components
{
    public partial class ${componentName}
    {
        // Inject dependencies via constructor
        // private readonly AppDbContext _db;

        // public ${componentName}(AppDbContext db)
        // {
        //     _db = db;
        // }

        // Add business logic methods here
        // Example:
        // private async Task<List<Todo>> LoadTodos()
        // {
        //     return await _db.Todos
        //         .Where(t => t.UserId == UserId)
        //         .ToListAsync();
        // }
    }
}
`;
}
