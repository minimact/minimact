import * as vscode from 'vscode';
import { registerNavigationCommands } from './commands/navigation';
import { previewGeneratedCSharp, compareWithGenerated } from './commands/preview';
import { createComponent } from './commands/scaffolding';
import { FileDecorationProvider } from './providers/fileDecoration';
import { BuildStatusManager } from './providers/buildStatus';
import { MinimactCodeActionProvider, registerAddPredictHintCommand } from './providers/codeActions';
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

    // Register preview commands
    context.subscriptions.push(
        vscode.commands.registerCommand('minimact.previewGenerated', previewGeneratedCSharp)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('minimact.compareWithGenerated', compareWithGenerated)
    );

    // Register scaffolding command
    context.subscriptions.push(
        vscode.commands.registerCommand('minimact.createComponent', createComponent)
    );

    // Initialize build status manager
    const buildStatusManager = new BuildStatusManager(context);
    context.subscriptions.push(buildStatusManager);

    // Register build status command
    context.subscriptions.push(
        vscode.commands.registerCommand('minimact.showBuildStatus', () => {
            buildStatusManager.showBuildStatusPanel();
        })
    );

    // Register code action provider
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { language: 'typescriptreact', scheme: 'file' },
            new MinimactCodeActionProvider(),
            {
                providedCodeActionKinds: MinimactCodeActionProvider.providedCodeActionKinds
            }
        )
    );

    // Register add predict hint command
    registerAddPredictHintCommand(context);

    // Setup generated file protection
    setupGeneratedFileProtection(context);
}

export function deactivate() {
    console.log('Minimact extension deactivated');
}
