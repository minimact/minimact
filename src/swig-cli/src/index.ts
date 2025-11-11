#!/usr/bin/env node

import { Command } from 'commander';
import { installCommand } from './commands/install';
import { launchCommand } from './commands/launch';
import { newCommand } from './commands/new';
import { addCommand } from './commands/add';
import { removeCommand } from './commands/remove';
import { transpileCommand } from './commands/transpile';
import { runCommand } from './commands/run';
import { watchCommand } from './commands/watch';

const program = new Command();

program
  .name('swig')
  .description('Minimact Swig CLI - Create, transpile, and run Minimact applications')
  .version('1.0.0');

// Install command - Download and install Swig GUI to AppData
program
  .command('install')
  .description('Install Minimact Swig GUI to AppData')
  .option('--force', 'Force reinstall even if already installed')
  .action(installCommand);

// Launch command - Launch the Swig GUI
program
  .command('launch')
  .description('Launch Minimact Swig GUI')
  .action(launchCommand);

// New command - Create a new Minimact project
program
  .command('new [template] [name]')
  .description('Create a new Minimact project (interactive mode if template/name not provided)')
  .option('--tailwind', 'Enable Tailwind CSS')
  .option('--no-solution', 'Skip creating .sln file')
  .option('--hooks <hooks>', 'Comma-separated list of hook examples to include')
  .action(newCommand);

// Add command - Add a new page with controller
program
  .command('add [pageName] [routePath]')
  .description('Add a new page with controller (interactive mode if arguments not provided)')
  .option('--mvc', 'Use MVC Bridge pattern with ViewModel')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .action(addCommand);

// Remove command - Remove a page and its controller
program
  .command('remove [pageName]')
  .description('Remove a page and its controller (interactive mode if pageName not provided)')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .option('--force', 'Skip confirmation prompt')
  .action(removeCommand);

// Transpile command - Transpile TSX files to C#
program
  .command('transpile [files...]')
  .description('Transpile TSX files to C#')
  .option('-w, --watch', 'Watch mode - auto-transpile on file changes')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .action(transpileCommand);

// Run command - Run the ASP.NET Core app
program
  .command('run')
  .description('Run the ASP.NET Core application')
  .option('-p, --port <port>', 'Port number', '5000')
  .option('--no-build', 'Skip dotnet build')
  .action(runCommand);

// Watch command - Watch for file changes and auto-transpile + hot reload
program
  .command('watch')
  .description('Watch for TSX changes and auto-transpile with hot reload')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .action(watchCommand);

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
