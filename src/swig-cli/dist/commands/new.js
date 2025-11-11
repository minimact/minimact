"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newCommand = newCommand;
const path = __importStar(require("path"));
const swig_shared_1 = require("@minimact/swig-shared");
const os = __importStar(require("os"));
const prompts_1 = __importDefault(require("prompts"));
const chalk_1 = __importDefault(require("chalk"));
const TEMPLATES = [
    {
        value: 'Counter',
        title: 'Counter',
        description: 'Simple counter app with useState'
    },
    {
        value: 'TodoList',
        title: 'Todo List',
        description: 'Todo list app with add/delete/toggle'
    },
    {
        value: 'Dashboard',
        title: 'Dashboard',
        description: 'Dashboard with charts (BarChart, LineChart, PieChart, AreaChart)'
    },
    {
        value: 'MVC',
        title: 'MVC Bridge',
        description: 'MVC Bridge pattern with ViewModels (useMvcState, useMvcViewModel)'
    },
    {
        value: 'MVC-Dashboard',
        title: 'MVC Dashboard',
        description: 'MVC Bridge + Dashboard with charts'
    },
    {
        value: 'Electron-FileManager',
        title: 'Electron File Manager',
        description: 'Desktop file manager with Electron + Minimact'
    }
];
/**
 * New command - Create a new Minimact project
 */
async function newCommand(template, name, options = {}) {
    // Interactive mode if template or name not provided
    if (!template || !name) {
        console.log(chalk_1.default.bold.cyan('✨ Create a new Minimact project\n'));
        const answers = await (0, prompts_1.default)([
            {
                type: !name ? 'text' : null,
                name: 'projectName',
                message: 'Project name (use PascalCase or underscores, no dashes):',
                initial: 'MyMinimactApp',
                validate: (value) => {
                    if (value.length === 0)
                        return 'Project name is required';
                    if (/[^a-zA-Z0-9_]/.test(value)) {
                        return 'Project name can only contain letters, numbers, and underscores (no dashes or spaces)';
                    }
                    if (/^\d/.test(value)) {
                        return 'Project name cannot start with a number';
                    }
                    return true;
                }
            },
            {
                type: !template ? 'select' : null,
                name: 'projectTemplate',
                message: 'Select a template:',
                choices: TEMPLATES,
                initial: 0
            },
            {
                type: 'confirm',
                name: 'enableTailwind',
                message: 'Enable Tailwind CSS?',
                initial: options.tailwind || false
            },
            {
                type: 'confirm',
                name: 'createSolution',
                message: 'Create Visual Studio solution file (.sln)?',
                initial: options.solution !== false
            },
            {
                type: 'multiselect',
                name: 'selectedHooks',
                message: 'Select hook examples to include (optional):',
                choices: [
                    { title: 'useState', value: 'useState' },
                    { title: 'useEffect', value: 'useEffect' },
                    { title: 'useRef', value: 'useRef' },
                    { title: 'useMvcState', value: 'useMvcState' },
                    { title: 'useMvcViewModel', value: 'useMvcViewModel' }
                ],
                hint: '- Space to select. Return to submit'
            }
        ]);
        // User cancelled
        if (!answers.projectName && !name) {
            console.log(chalk_1.default.yellow('\n❌ Cancelled'));
            process.exit(0);
        }
        // Use answers or fallback to provided arguments
        name = name || answers.projectName;
        template = template || answers.projectTemplate;
        options.tailwind = answers.enableTailwind;
        options.solution = answers.createSolution;
        if (answers.selectedHooks && answers.selectedHooks.length > 0) {
            options.hooks = answers.selectedHooks.join(',');
        }
        console.log('');
    }
    // Validate project name for C# compatibility
    if (/[^a-zA-Z0-9_]/.test(name)) {
        console.error(chalk_1.default.red('❌ Invalid project name!'));
        console.error(chalk_1.default.yellow(`   Project name "${name}" contains invalid characters.`));
        console.error(chalk_1.default.gray('   Use PascalCase or underscores (e.g., MyApp, My_App)'));
        console.error(chalk_1.default.gray('   Avoid dashes, spaces, or special characters'));
        process.exit(1);
    }
    if (/^\d/.test(name)) {
        console.error(chalk_1.default.red('❌ Invalid project name!'));
        console.error(chalk_1.default.yellow(`   Project name "${name}" cannot start with a number.`));
        console.error(chalk_1.default.gray('   Use a name like "MyApp123" instead of "123MyApp"'));
        process.exit(1);
    }
    console.log(chalk_1.default.bold(`📦 Creating new Minimact project: ${chalk_1.default.cyan(name)}`));
    console.log(`   Template: ${chalk_1.default.green(template)}`);
    const projectPath = path.join(process.cwd(), name);
    // Parse hooks option
    const selectedHooks = options.hooks ? options.hooks.split(',').map((h) => h.trim()) : [];
    try {
        // Create ProjectManager instance (use temp directory for user data)
        const projectManager = new swig_shared_1.ProjectManager(os.tmpdir());
        // Create project
        const project = await projectManager.createProject(projectPath, template, {
            createSolution: options.solution !== false,
            enableTailwind: options.tailwind || false,
            selectedHooks
        });
        console.log(chalk_1.default.green.bold('\n✅ Project created successfully!'));
        console.log(`   ${chalk_1.default.gray('Path:')} ${chalk_1.default.cyan(project.path)}`);
        console.log(`   ${chalk_1.default.gray('Port:')} ${chalk_1.default.cyan(project.port)}`);
        console.log('');
        console.log(chalk_1.default.bold('Next steps:'));
        console.log(`   ${chalk_1.default.cyan(`cd ${name}`)}`);
        console.log(`   ${chalk_1.default.cyan('swig watch')}     ${chalk_1.default.gray('# Watch for TSX changes and auto-transpile')}`);
        console.log(`   ${chalk_1.default.cyan('swig run')}       ${chalk_1.default.gray('# Run the application')}`);
        console.log('');
        console.log(chalk_1.default.bold('Or use the Swig GUI:'));
        console.log(`   ${chalk_1.default.cyan('swig launch')}`);
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Failed to create project:'), error);
        throw error;
    }
}
