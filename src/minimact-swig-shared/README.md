# @minimact/swig-shared

Shared services for Minimact Swig (Electron GUI and CLI).

## Services

### ProjectManager
- Create new Minimact projects from templates
- Load existing projects
- Scan project files
- Detect port configuration
- Track recent projects
- Generate hook examples

### TranspilerService
- Transpile single TSX files to C#
- Transpile entire projects
- Generate Tailwind CSS
- Track transpilation errors and duration

### FileWatcher
- Watch project files for changes
- Trigger callbacks on TSX/JSX file changes
- Debounce rapid changes (200ms)

### HookExampleGenerator
- Generate example code for Minimact hooks
- Support for @minimact/core and @minimact/mvc hooks

## Usage

```typescript
import { ProjectManager, TranspilerService, FileWatcher } from '@minimact/swig-shared';

// Create a new project
const projectManager = new ProjectManager('/path/to/userdata');
const project = await projectManager.createProject('/path/to/project', 'Counter');

// Transpile TSX to C#
const transpiler = new TranspilerService();
const result = await transpiler.transpileFile('/path/to/Component.tsx');

// Watch for file changes
const watcher = new FileWatcher();
watcher.watch('/path/to/project', (filePath) => {
  console.log('File changed:', filePath);
  transpiler.transpileFile(filePath);
});
```

## Used By

- `minimact-swig-electron` - Electron GUI for Minimact development
- `@minimact/swig` - CLI tool for Minimact (`npx @minimact/swig`)
