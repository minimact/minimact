import * as vscode from 'vscode';
import { transformTsxToCSharp, isBabelPluginAvailable } from '../utils/babelTransform';

/**
 * Preview Generated C# command
 * Shows a side-by-side diff of TSX source and generated C# code
 */
export async function previewGeneratedCSharp() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const document = editor.document;

  // Check if it's a TSX file
  if (document.languageId !== 'typescriptreact') {
    vscode.window.showErrorMessage('This command only works with .tsx files');
    return;
  }

  // Check if Babel plugin is available
  const pluginAvailable = await isBabelPluginAvailable();
  if (!pluginAvailable) {
    vscode.window.showWarningMessage(
      'Minimact Babel plugin not found. Make sure you\'re in a Minimact project.',
      'Learn More'
    ).then(selection => {
      if (selection === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/minimact/minimact'));
      }
    });
    return;
  }

  // Show progress indicator
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Generating C# preview...',
    cancellable: false
  }, async (progress) => {
    try {
      // Get the TSX code
      const tsxCode = document.getText();
      const filename = document.fileName;

      // Transform to C#
      progress.report({ message: 'Transforming TSX to C#...' });
      const csharpCode = await transformTsxToCSharp(tsxCode, filename);

      if (!csharpCode) {
        vscode.window.showWarningMessage(
          'No C# code generated. Make sure your component is a valid Minimact component.'
        );
        return;
      }

      // Create a temporary file to show the C# code
      progress.report({ message: 'Opening preview...' });
      await showDiff(document, csharpCode);

    } catch (error) {
      console.error('[Minimact] Preview failed:', error);
      vscode.window.showErrorMessage(
        `Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });
}

/**
 * Show side-by-side diff of TSX and generated C#
 */
async function showDiff(tsxDocument: vscode.TextDocument, csharpCode: string) {
  // Create a URI for the virtual C# document
  const csharpUri = vscode.Uri.parse(`minimact-preview:${tsxDocument.fileName.replace(/\.tsx$/, '.cs')}`);

  // Register a text document content provider for the preview
  const provider = new class implements vscode.TextDocumentContentProvider {
    provideTextDocumentContent(uri: vscode.Uri): string {
      return csharpCode;
    }
  }();

  const registration = vscode.workspace.registerTextDocumentContentProvider('minimact-preview', provider);

  try {
    // Open the diff view
    await vscode.commands.executeCommand(
      'vscode.diff',
      tsxDocument.uri,
      csharpUri,
      `${getBaseName(tsxDocument.fileName)}.tsx ↔ ${getBaseName(tsxDocument.fileName)}.cs (Preview)`,
      {
        preview: true,
        preserveFocus: false
      }
    );
  } finally {
    // Clean up the provider after a delay (the diff view has been opened)
    setTimeout(() => registration.dispose(), 1000);
  }
}

/**
 * Compare with actual generated file
 * Shows TSX on left, actual generated .cs on right
 */
export async function compareWithGenerated() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const document = editor.document;

  // Check if it's a TSX file
  if (document.languageId !== 'typescriptreact') {
    vscode.window.showErrorMessage('This command only works with .tsx files');
    return;
  }

  // Find the generated .cs file
  const csPath = document.fileName.replace(/\.tsx$/, '.cs');
  const csUri = vscode.Uri.file(csPath);

  try {
    // Check if the file exists
    await vscode.workspace.fs.stat(csUri);

    // Open the diff view
    await vscode.commands.executeCommand(
      'vscode.diff',
      document.uri,
      csUri,
      `${getBaseName(document.fileName)}.tsx ↔ ${getBaseName(document.fileName)}.cs`,
      {
        preview: false,
        preserveFocus: false
      }
    );
  } catch {
    vscode.window.showWarningMessage(
      'Generated .cs file not found. Run the build first.',
      'Build Now'
    ).then(selection => {
      if (selection === 'Build Now') {
        // Trigger a build (this assumes a task is configured)
        vscode.commands.executeCommand('workbench.action.tasks.build');
      }
    });
  }
}

/**
 * Extract base name from file path
 */
function getBaseName(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  const filename = parts[parts.length - 1];
  return filename.replace(/\.(tsx|cs)$/, '');
}
