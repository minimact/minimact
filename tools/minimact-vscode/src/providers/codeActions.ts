import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Code action provider for Minimact
 * Provides quick fixes and refactorings
 */
export class MinimactCodeActionProvider implements vscode.CodeActionProvider {

  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor
  ];

  /**
   * Provide code actions
   */
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {

    const actions: vscode.CodeAction[] = [];

    // Only provide actions for TSX files
    if (document.languageId !== 'typescriptreact') {
      return actions;
    }

    const text = document.getText();

    // Action 1: Create codebehind file if it doesn't exist
    if (!this.hasCodebehind(document.fileName)) {
      actions.push(this.createCodebehindAction(document));
    }

    // Action 2: Add missing hook imports
    const missingImports = this.getMissingHookImports(text);
    if (missingImports.length > 0) {
      actions.push(this.createAddImportsAction(document, missingImports));
    }

    // Action 3: Add usePredictHint for state changes
    const lineText = document.lineAt(range.start.line).text;
    if (this.isSetStateCall(lineText) && !this.hasUsePredictHint(text)) {
      actions.push(this.createAddPredictHintAction(document, range));
    }

    // Action 4: Convert to Minimact component
    if (this.isReactComponent(text) && !this.isMinimactComponent(text)) {
      actions.push(this.createConvertToMinimactAction(document));
    }

    return actions;
  }

  /**
   * Check if codebehind file exists
   */
  private hasCodebehind(fileName: string): boolean {
    const codebehindPath = fileName.replace(/\.tsx$/, '.codebehind.cs');
    return fs.existsSync(codebehindPath);
  }

  /**
   * Create "Create codebehind file" action
   */
  private createCodebehindAction(document: vscode.TextDocument): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Create codebehind file',
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      title: 'Create codebehind file',
      command: 'minimact.goToCodebehind',
      arguments: [document.uri]
    };

    action.isPreferred = false;

    return action;
  }

  /**
   * Get missing hook imports
   */
  private getMissingHookImports(text: string): string[] {
    const missing: string[] = [];

    // Check for hook usage
    const hooks = ['useState', 'useEffect', 'useRef', 'usePredictHint', 'useDomElementState', 'useClientState', 'useTemplate'];

    for (const hook of hooks) {
      // Check if hook is used but not imported
      const hookRegex = new RegExp(`\\b${hook}\\s*\\(`, 'g');
      const isUsed = hookRegex.test(text);

      if (isUsed) {
        // Check if it's in the import statement
        const importRegex = new RegExp(`import\\s+{[^}]*${hook}[^}]*}\\s+from\\s+['"]minimact['"]`);
        const isImported = importRegex.test(text);

        if (!isImported) {
          missing.push(hook);
        }
      }
    }

    return missing;
  }

  /**
   * Create "Add missing imports" action
   */
  private createAddImportsAction(document: vscode.TextDocument, hooks: string[]): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Add missing imports: ${hooks.join(', ')}`,
      vscode.CodeActionKind.QuickFix
    );

    const text = document.getText();

    // Find existing minimact import or create new one
    const importRegex = /import\s+{([^}]*)}\s+from\s+['"]minimact['"]/;
    const match = importRegex.exec(text);

    let edit: vscode.WorkspaceEdit;

    if (match) {
      // Update existing import
      const existingImports = match[1].split(',').map(s => s.trim());
      const allImports = [...new Set([...existingImports, ...hooks])].sort();
      const newImport = `import { ${allImports.join(', ')} } from 'minimact'`;

      edit = new vscode.WorkspaceEdit();
      const importRange = new vscode.Range(
        document.positionAt(match.index),
        document.positionAt(match.index + match[0].length)
      );
      edit.replace(document.uri, importRange, newImport);
    } else {
      // Create new import at top
      edit = new vscode.WorkspaceEdit();
      const newImport = `import { ${hooks.join(', ')} } from 'minimact';\n`;
      edit.insert(document.uri, new vscode.Position(0, 0), newImport);
    }

    action.edit = edit;
    action.isPreferred = true; // Make this the default quick fix

    return action;
  }

  /**
   * Check if line is a setState call
   */
  private isSetStateCall(line: string): boolean {
    return /set[A-Z]\w*\s*\(/.test(line);
  }

  /**
   * Check if component uses usePredictHint
   */
  private hasUsePredictHint(text: string): boolean {
    return /usePredictHint\s*\(/.test(text);
  }

  /**
   * Create "Add usePredictHint" action
   */
  private createAddPredictHintAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Add usePredictHint for optimistic updates',
      vscode.CodeActionKind.Refactor
    );

    action.command = {
      title: 'Add usePredictHint',
      command: 'minimact.addPredictHint',
      arguments: [document.uri, range]
    };

    action.isPreferred = false;

    return action;
  }

  /**
   * Check if file is a React component
   */
  private isReactComponent(text: string): boolean {
    return /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*return\s*\([\s\S]*</.test(text) ||
           /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[\s\S]*return\s*\([\s\S]*</.test(text);
  }

  /**
   * Check if component uses Minimact imports
   */
  private isMinimactComponent(text: string): boolean {
    return /from\s+['"]minimact['"]/.test(text);
  }

  /**
   * Create "Convert to Minimact component" action
   */
  private createConvertToMinimactAction(document: vscode.TextDocument): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Convert to Minimact component',
      vscode.CodeActionKind.Refactor
    );

    const text = document.getText();
    const edit = new vscode.WorkspaceEdit();

    // Replace 'react' imports with 'minimact'
    const reactImportRegex = /from\s+['"]react['"]/g;
    let match;
    while ((match = reactImportRegex.exec(text)) !== null) {
      const range = new vscode.Range(
        document.positionAt(match.index),
        document.positionAt(match.index + match[0].length)
      );
      edit.replace(document.uri, range, `from 'minimact'`);
    }

    action.edit = edit;

    return action;
  }
}

/**
 * Register add predict hint command
 */
export function registerAddPredictHintCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('minimact.addPredictHint', async (uri: vscode.Uri, range: vscode.Range) => {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      // Get the setState call
      const line = document.lineAt(range.start.line);
      const setStateMatch = /set([A-Z]\w*)\s*\(([^)]+)\)/.exec(line.text);

      if (!setStateMatch) {
        vscode.window.showWarningMessage('Could not parse setState call');
        return;
      }

      const stateName = setStateMatch[1].charAt(0).toLowerCase() + setStateMatch[1].slice(1);
      const stateValue = setStateMatch[2];

      // Find the end of the function to insert usePredictHint
      const text = document.getText();
      const functionMatch = /function\s+\w+\s*\([^)]*\)\s*{/.exec(text);

      if (!functionMatch) {
        vscode.window.showWarningMessage('Could not find function declaration');
        return;
      }

      // Insert usePredictHint after existing hooks
      const hintCode = `\n  usePredictHint('update-${stateName}', {\n    ${stateName}: ${stateValue}\n  });\n`;

      // Find position after last hook call
      const lastHookRegex = /use\w+\s*\([^;]*;/g;
      let lastMatch;
      let lastIndex = functionMatch.index + functionMatch[0].length;

      while ((lastMatch = lastHookRegex.exec(text)) !== null) {
        if (lastMatch.index > functionMatch.index) {
          lastIndex = lastMatch.index + lastMatch[0].length;
        }
      }

      const insertPosition = document.positionAt(lastIndex);

      await editor.edit(editBuilder => {
        editBuilder.insert(insertPosition, hintCode);
      });

      // Also ensure import
      if (!/usePredictHint/.test(text)) {
        const importRegex = /import\s+{([^}]*)}\s+from\s+['"]minimact['"]/;
        const importMatch = importRegex.exec(text);

        if (importMatch) {
          const imports = importMatch[1].split(',').map(s => s.trim());
          imports.push('usePredictHint');
          const newImport = `import { ${imports.join(', ')} } from 'minimact'`;

          await editor.edit(editBuilder => {
            const importRange = new vscode.Range(
              document.positionAt(importMatch.index),
              document.positionAt(importMatch.index + importMatch[0].length)
            );
            editBuilder.replace(importRange, newImport);
          });
        }
      }

      vscode.window.showInformationMessage('Added usePredictHint for optimistic updates');
    })
  );
}
