import * as vscode from 'vscode';
import { registerNavigationCommands } from './commands/navigation';
import { FileDecorationProvider } from './providers/fileDecoration';
import { setupGeneratedFileProtection } from './utils/generatedFileProtection';

export function activate(context: vscode.ExtensionContext) {
    console.log('Minimact extension is now active! 🌵');

    // Show welcome message for first-time users
    const hasSeenWelcome = context.globalState.get('minimact.hasSeenWelcome', false);
    if (!hasSeenWelcome) {
        vscode.window.showInformationMessage(
            '🌵 Minimact extension activated! Welcome to server-side React for ASP.NET Core.',
            'Learn More',
            'Dismiss'
        ).then(selection => {
            if (selection === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/minimact/minimact'));
            }
        });
        context.globalState.update('minimact.hasSeenWelcome', true);
    }

    // Register file decoration provider (file icons)
    const decorationProvider = new FileDecorationProvider();
    context.subscriptions.push(
        vscode.window.registerFileDecorationProvider(decorationProvider)
    );

    // Register navigation commands
    registerNavigationCommands(context);

    // Setup generated file protection
    setupGeneratedFileProtection(context);
}

export function deactivate() {
    console.log('Minimact extension deactivated');
}
