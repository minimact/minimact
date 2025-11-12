#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const install_1 = require("./commands/install");
const launch_1 = require("./commands/launch");
const new_1 = require("./commands/new");
const add_1 = require("./commands/add");
const remove_1 = require("./commands/remove");
const transpile_1 = require("./commands/transpile");
const run_1 = require("./commands/run");
const watch_1 = require("./commands/watch");
const import_1 = require("./commands/import");
const list_modules_1 = require("./commands/list-modules");
const init_modules_1 = require("./commands/init-modules");
const uninstall_1 = require("./commands/uninstall");
const update_modules_1 = require("./commands/update-modules");
const program = new commander_1.Command();
program
    .name('swig')
    .description('Minimact Swig CLI - Create, transpile, and run Minimact applications')
    .version('1.0.0');
// Install command - Download and install Swig GUI to AppData
program
    .command('install')
    .description('Install Minimact Swig GUI to AppData')
    .option('--force', 'Force reinstall even if already installed')
    .action(install_1.installCommand);
// Launch command - Launch the Swig GUI
program
    .command('launch')
    .description('Launch Minimact Swig GUI')
    .action(launch_1.launchCommand);
// New command - Create a new Minimact project
program
    .command('new [template] [name]')
    .description('Create a new Minimact project (interactive mode if template/name not provided)')
    .option('--tailwind', 'Enable Tailwind CSS')
    .option('--no-solution', 'Skip creating .sln file')
    .option('--hooks <hooks>', 'Comma-separated list of hook examples to include')
    .action(new_1.newCommand);
// Add command - Add a new page with controller
program
    .command('add [pageName] [routePath]')
    .description('Add a new page with controller (interactive mode if arguments not provided)')
    .option('--mvc', 'Use MVC Bridge pattern with ViewModel')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .action(add_1.addCommand);
// Remove command - Remove a page and its controller
program
    .command('remove [pageName]')
    .description('Remove a page and its controller (interactive mode if pageName not provided)')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .option('--force', 'Skip confirmation prompt')
    .action(remove_1.removeCommand);
// Transpile command - Transpile TSX files to C#
program
    .command('transpile [files...]')
    .description('Transpile TSX files to C#')
    .option('-w, --watch', 'Watch mode - auto-transpile on file changes')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .action(transpile_1.transpileCommand);
// Run command - Run the ASP.NET Core app
program
    .command('run')
    .description('Run the ASP.NET Core application')
    .option('-p, --port <port>', 'Port number', '5000')
    .option('--no-build', 'Skip dotnet build')
    .action(run_1.runCommand);
// Watch command - Watch for file changes and auto-transpile + hot reload
program
    .command('watch')
    .description('Watch for TSX changes and auto-transpile with hot reload')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .action(watch_1.watchCommand);
// Import command - Install modules from npm to mact_modules/
program
    .command('import <package>')
    .description('Install a module from npm to mact_modules/')
    .option('--force', 'Force reinstall even if already installed')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .action(import_1.importCommand);
// List modules command - List installed mact_modules
program
    .command('list')
    .description('List installed modules in mact_modules/')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .action(list_modules_1.listModulesCommand);
// Init command - Initialize mact_modules with interactive selection
program
    .command('init')
    .description('Initialize mact_modules/ with interactive module selection')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .action(init_modules_1.initModulesCommand);
// Uninstall command - Remove a module from mact_modules/
program
    .command('uninstall <package>')
    .description('Remove a module from mact_modules/')
    .option('--force', 'Skip confirmation prompt')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .action(uninstall_1.uninstallCommand);
// Update command - Update modules to latest versions
program
    .command('update [package]')
    .description('Update module(s) to latest versions')
    .option('--all', 'Update all installed modules')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .action(update_modules_1.updateModulesCommand);
program.parse(process.argv);
// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
