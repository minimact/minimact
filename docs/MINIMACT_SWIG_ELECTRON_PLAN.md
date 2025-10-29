# Minimact Swig - Electron Implementation Plan

**"The Desktop IDE for Minimact Development"**

Version: 1.0 Electron
Last Updated: October 28, 2025

---

## 🎯 Vision

Minimact Swig is a **native desktop application** built with Electron that provides a complete IDE experience for Minimact development. It combines project management, auto-transpilation, build/run controls, code editing, and live monitoring in a single, polished desktop app.

**Think:** Visual Studio Code + Chrome DevTools + Storybook, but specifically for Minimact.

**The 2-Minute Developer Experience:**
```
1. Launch Minimact Swig desktop app
2. Click "Create New Project" → Native file dialog → Select folder
3. App creates project structure, opens Dashboard
4. Edit TSX files directly in built-in Monaco Editor
5. Save → Auto-transpiles TSX → C# (instant)
6. Click "Build" → Terminal shows dotnet build output
7. Click "Run" → App starts on port 5000
8. Click "Open in Browser" → Chrome opens http://localhost:5000
9. Live Inspector shows components, state, performance in real-time
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│   Minimact Swig (Electron Desktop App)                  │
│                                                         │
│   Main Process (Node.js):                              │
│   ├── IPC Handlers (electron.ipcMain)                  │
│   ├── Project Manager                                   │
│   ├── Transpiler Service (babel-plugin-minimact)       │
│   ├── Process Controller (spawn dotnet)                │
│   ├── File Watcher (chokidar)                          │
│   ├── SignalR Client (@microsoft/signalr)              │
│   └── Native APIs                                       │
│       ├── File Dialogs (electron.dialog)               │
│       ├── Shell Operations (electron.shell)            │
│       └── Notifications (electron.Notification)        │
│                                                         │
│   Renderer Process (React + TypeScript):               │
│   ├── App Shell                                         │
│   ├── Pages                                             │
│   │   ├── Home (Recent projects)                       │
│   │   ├── CreateProject (Form + file picker)           │
│   │   ├── Dashboard (Main control panel)               │
│   │   └── Inspector (Live monitoring)                  │
│   ├── Components                                        │
│   │   ├── Monaco Editor (@monaco-editor/react)         │
│   │   ├── Terminal (xterm.js)                          │
│   │   ├── File Tree                                    │
│   │   ├── Build Controls (Build/Run/Stop buttons)      │
│   │   ├── State Inspector                              │
│   │   └── Performance Charts (recharts)                │
│   └── Hooks                                             │
│       ├── useProject                                    │
│       ├── useSignalR                                    │
│       ├── useProcessControl                             │
│       └── useFileWatcher                                │
└─────────────────────────────────────────────────────────┘
                         │
                         │ File Watcher (chokidar)
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│   User's Minimact Project (C:\Projects\MyApp)          │
│   - Edit in Monaco Editor (built-in) or VS Code        │
│   - Swig watches for changes                            │
│   - Auto-transpiles TSX → C#                            │
│   - Swig builds/runs via dotnet CLI                     │
└─────────────────────────────────────────────────────────┘
                         │
                         │ dotnet run (port 5000)
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│   Running App (localhost:5000)                          │
│   - SignalR connection to Swig                          │
│   - Real-time telemetry                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

### Core
- **Electron**: ^28.0.0 (Desktop app framework)
- **React**: ^18.2.0 (UI framework)
- **TypeScript**: ^5.3.0 (Type safety)
- **Vite**: ^5.0.0 (Fast build tool)
- **electron-vite**: ^2.0.0 (Electron + Vite integration)

### Main Process (Node.js)
- **@babel/core**: ^7.23.0 (Transpiler)
- **babel-plugin-minimact**: ^1.0.0 (TSX → C# transpilation)
- **chokidar**: ^3.5.0 (File watching)
- **@microsoft/signalr**: ^8.0.0 (SignalR client)
- **execa**: ^8.0.0 (Better child_process)

### Renderer Process (React)
- **@monaco-editor/react**: ^4.6.0 (Code editor)
- **xterm**: ^5.3.0 (Terminal emulator)
- **xterm-addon-fit**: ^0.8.0 (Terminal sizing)
- **recharts**: ^2.10.0 (Charts for performance)
- **lucide-react**: ^0.300.0 (Icons)
- **tailwindcss**: ^3.4.0 (Styling)
- **zustand**: ^4.4.0 (State management)

### Development
- **electron-builder**: ^24.9.0 (Build/package app)
- **@electron-toolkit/eslint-config**: ^1.0.0 (Linting)
- **@electron-toolkit/tsconfig**: ^1.0.0 (TS config)

---

## 📁 Project Structure

```
minimact-swig/
├── package.json
├── electron.vite.config.ts
├── electron-builder.yml           # Build configuration
├── README.md
├── LICENSE
│
├── resources/                     # App resources
│   ├── icon.png                   # App icon (1024x1024)
│   ├── icon.icns                  # macOS icon
│   ├── icon.ico                   # Windows icon
│   ├── swig-bg.png                # Splash screen
│   └── installerIcon.ico          # Windows installer icon
│
├── src/
│   ├── main/                      # Electron main process
│   │   ├── index.ts               # Entry point
│   │   ├── window.ts              # Window management
│   │   ├── ipc/                   # IPC handlers
│   │   │   ├── project.ts         # Project operations
│   │   │   ├── transpiler.ts      # Transpilation
│   │   │   ├── process.ts         # Build/run
│   │   │   ├── file.ts            # File operations
│   │   │   └── signalr.ts         # SignalR connection
│   │   ├── services/
│   │   │   ├── ProjectManager.ts
│   │   │   ├── TranspilerService.ts
│   │   │   ├── ProcessController.ts
│   │   │   ├── FileWatcher.ts
│   │   │   └── SignalRClient.ts
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── config.ts
│   │
│   ├── preload/                   # Preload script
│   │   └── index.ts               # Expose APIs to renderer
│   │
│   └── renderer/                  # React app
│       ├── index.html
│       ├── src/
│       │   ├── main.tsx           # React entry point
│       │   ├── App.tsx            # App shell
│       │   ├── styles/
│       │   │   ├── index.css
│       │   │   └── tailwind.css
│       │   ├── pages/
│       │   │   ├── Home.tsx
│       │   │   ├── CreateProject.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   └── Inspector.tsx
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── Header.tsx
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   └── StatusBar.tsx
│       │   │   ├── editor/
│       │   │   │   ├── CodeEditor.tsx
│       │   │   │   ├── FileTree.tsx
│       │   │   │   └── TabBar.tsx
│       │   │   ├── terminal/
│       │   │   │   └── Terminal.tsx
│       │   │   ├── controls/
│       │   │   │   ├── BuildButton.tsx
│       │   │   │   ├── RunButton.tsx
│       │   │   │   └── StopButton.tsx
│       │   │   ├── inspector/
│       │   │   │   ├── ComponentTree.tsx
│       │   │   │   ├── StateInspector.tsx
│       │   │   │   ├── PerformanceChart.tsx
│       │   │   │   └── SignalRMonitor.tsx
│       │   │   └── common/
│       │   │       ├── Button.tsx
│       │   │       ├── Card.tsx
│       │   │       └── Modal.tsx
│       │   ├── hooks/
│       │   │   ├── useProject.ts
│       │   │   ├── useSignalR.ts
│       │   │   ├── useProcessControl.ts
│       │   │   ├── useFileWatcher.ts
│       │   │   └── useIPC.ts
│       │   ├── store/
│       │   │   ├── projectStore.ts
│       │   │   ├── editorStore.ts
│       │   │   └── inspectorStore.ts
│       │   ├── types/
│       │   │   ├── project.ts
│       │   │   ├── process.ts
│       │   │   └── signalr.ts
│       │   └── utils/
│       │       ├── api.ts          # IPC wrappers
│       │       └── formatting.ts
│       │
│       └── assets/
│           ├── logo.png
│           └── fonts/
│
└── dist/                          # Build output
    ├── win-unpacked/              # Windows portable
    ├── mac/                       # macOS .app
    └── linux-unpacked/            # Linux AppImage
```

---

## 🚀 Implementation Phases

### **Phase 1: Project Setup** (Week 1, Days 1-2)

#### 1.1 Initialize Electron Project
```bash
npm create @quick-start/electron@latest minimact-swig -- --template react-ts
cd minimact-swig
npm install
```

#### 1.2 Install Dependencies
```bash
# Main process
npm install @babel/core babel-plugin-minimact chokidar @microsoft/signalr execa

# Renderer process
npm install @monaco-editor/react xterm xterm-addon-fit recharts lucide-react zustand

# Styling
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Build
npm install -D electron-builder
```

#### 1.3 Configure Project
- Set up `electron.vite.config.ts`
- Configure `electron-builder.yml`
- Set up TypeScript paths
- Configure Tailwind CSS

**Deliverables:**
- ✅ Project structure created
- ✅ All dependencies installed
- ✅ Build system configured
- ✅ App launches (blank window)

---

### **Phase 2: Main Process Services** (Week 1, Days 3-5)

#### 2.1 Project Manager Service
```typescript
// src/main/services/ProjectManager.ts
export class ProjectManager {
  async createProject(path: string, template: string): Promise<Project>
  async loadProject(path: string): Promise<Project>
  async getRecentProjects(): Promise<RecentProject[]>
  async scanProjectFiles(path: string): Promise<ProjectFile[]>
  private detectPort(path: string): Promise<number>
  private addToRecentProjects(project: Project): Promise<void>
}
```

#### 2.2 Transpiler Service
```typescript
// src/main/services/TranspilerService.ts
import * as babel from '@babel/core';
import minimactPlugin from 'babel-plugin-minimact';

export class TranspilerService {
  async transpileFile(tsxPath: string): Promise<TranspileResult>
  async transpileProject(projectPath: string): Promise<TranspileProjectResult>
  private getBabelConfig(): babel.TransformOptions
}
```

#### 2.3 Process Controller
```typescript
// src/main/services/ProcessController.ts
import { execa, type ExecaChildProcess } from 'execa';

export class ProcessController {
  private currentProcess: ExecaChildProcess | null = null;

  async build(projectPath: string): Promise<BuildResult>
  async start(projectPath: string, port: number): Promise<void>
  stop(): void
  isRunning(): boolean
  getOutputStream(): NodeJS.ReadableStream
}
```

#### 2.4 File Watcher
```typescript
// src/main/services/FileWatcher.ts
import chokidar from 'chokidar';

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;

  watch(projectPath: string, callback: (filePath: string) => void): void
  stop(): void
}
```

#### 2.5 SignalR Client
```typescript
// src/main/services/SignalRClient.ts
import * as signalR from '@microsoft/signalr';

export class SignalRClient {
  private connection: signalR.HubConnection | null = null;

  async connect(url: string): Promise<void>
  disconnect(): void
  on(event: string, callback: (...args: any[]) => void): void
  async invoke(method: string, ...args: any[]): Promise<any>
}
```

**Deliverables:**
- ✅ All main process services implemented
- ✅ Unit tests for services
- ✅ TypeScript types defined

---

### **Phase 3: IPC Layer** (Week 2, Days 1-2)

#### 3.1 Project IPC Handlers
```typescript
// src/main/ipc/project.ts
import { ipcMain } from 'electron';

ipcMain.handle('project:create', async (_, path, template) => {
  return await projectManager.createProject(path, template);
});

ipcMain.handle('project:load', async (_, path) => {
  return await projectManager.loadProject(path);
});

ipcMain.handle('project:getRecent', async () => {
  return await projectManager.getRecentProjects();
});
```

#### 3.2 Transpiler IPC Handlers
```typescript
// src/main/ipc/transpiler.ts
ipcMain.handle('transpiler:transpileFile', async (_, filePath) => {
  return await transpilerService.transpileFile(filePath);
});

ipcMain.handle('transpiler:transpileProject', async (_, projectPath) => {
  return await transpilerService.transpileProject(projectPath);
});
```

#### 3.3 Process IPC Handlers
```typescript
// src/main/ipc/process.ts
ipcMain.handle('process:build', async (_, projectPath) => {
  return await processController.build(projectPath);
});

ipcMain.handle('process:start', async (_, projectPath, port) => {
  await processController.start(projectPath, port);
  return { success: true, port };
});

ipcMain.handle('process:stop', () => {
  processController.stop();
  return { success: true };
});

ipcMain.handle('process:isRunning', () => {
  return processController.isRunning();
});
```

#### 3.4 File IPC Handlers
```typescript
// src/main/ipc/file.ts
import { dialog, shell } from 'electron';

ipcMain.handle('file:openDialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('file:openInEditor', async (_, filePath, editor = 'code') => {
  await shell.openPath(filePath);
});

ipcMain.handle('file:readFile', async (_, filePath) => {
  return await fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('file:writeFile', async (_, filePath, content) => {
  await fs.writeFile(filePath, content, 'utf-8');
});
```

#### 3.5 Preload Script
```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  project: {
    create: (path: string, template: string) =>
      ipcRenderer.invoke('project:create', path, template),
    load: (path: string) =>
      ipcRenderer.invoke('project:load', path),
    getRecent: () =>
      ipcRenderer.invoke('project:getRecent'),
  },
  transpiler: {
    transpileFile: (filePath: string) =>
      ipcRenderer.invoke('transpiler:transpileFile', filePath),
    transpileProject: (projectPath: string) =>
      ipcRenderer.invoke('transpiler:transpileProject', projectPath),
  },
  process: {
    build: (projectPath: string) =>
      ipcRenderer.invoke('process:build', projectPath),
    start: (projectPath: string, port: number) =>
      ipcRenderer.invoke('process:start', projectPath, port),
    stop: () =>
      ipcRenderer.invoke('process:stop'),
    isRunning: () =>
      ipcRenderer.invoke('process:isRunning'),
  },
  file: {
    openDialog: () =>
      ipcRenderer.invoke('file:openDialog'),
    openInEditor: (filePath: string, editor?: string) =>
      ipcRenderer.invoke('file:openInEditor', filePath, editor),
    readFile: (filePath: string) =>
      ipcRenderer.invoke('file:readFile', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('file:writeFile', filePath, content),
  },
};

contextBridge.exposeInMainWorld('api', api);
```

**Deliverables:**
- ✅ All IPC handlers implemented
- ✅ Preload script exposes type-safe API
- ✅ Renderer can communicate with main process

---

### **Phase 4: UI Components** (Week 2, Days 3-5 + Week 3, Days 1-3)

#### 4.1 Layout Components

**Header.tsx:**
```tsx
export function Header() {
  return (
    <header className="h-14 bg-gray-900 border-b border-gray-700 flex items-center px-4">
      <img src={logo} alt="Minimact Swig" className="h-8" />
      <nav className="ml-8 flex gap-4">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/inspector">Inspector</NavLink>
      </nav>
      <div className="ml-auto flex items-center gap-4">
        <ConnectionStatus />
        <AppStatus />
      </div>
    </header>
  );
}
```

**StatusBar.tsx:**
```tsx
export function StatusBar() {
  const { project } = useProject();
  const { isRunning } = useProcessControl();

  return (
    <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs">
      <span>{project?.name}</span>
      <span className="ml-4">
        {isRunning ? '🟢 Running' : '⚫ Stopped'}
      </span>
    </div>
  );
}
```

#### 4.2 Code Editor

**CodeEditor.tsx:**
```tsx
import Editor from '@monaco-editor/react';

export function CodeEditor({ file, onChange }: CodeEditorProps) {
  return (
    <Editor
      height="100%"
      language={getLanguage(file.extension)}
      path={file.path}
      value={file.content}
      theme="vs-dark"
      onChange={onChange}
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        fontFamily: 'Fira Code, monospace',
        fontLigatures: true,
      }}
    />
  );
}
```

**FileTree.tsx:**
```tsx
export function FileTree({ files, onFileClick }: FileTreeProps) {
  return (
    <div className="file-tree">
      {files.map(file => (
        <FileTreeItem
          key={file.path}
          file={file}
          onClick={() => onFileClick(file)}
        />
      ))}
    </div>
  );
}
```

#### 4.3 Terminal

**Terminal.tsx:**
```tsx
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm>();

  useEffect(() => {
    const xterm = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current!);
    fitAddon.fit();

    xtermRef.current = xterm;

    return () => xterm.dispose();
  }, []);

  useEffect(() => {
    // Listen for process output
    const unsubscribe = window.api.process.onOutput((data: string) => {
      xtermRef.current?.write(data);
    });

    return unsubscribe;
  }, []);

  return <div ref={terminalRef} className="terminal" />;
}
```

#### 4.4 Build Controls

**BuildButton.tsx:**
```tsx
export function BuildButton() {
  const { project } = useProject();
  const [isBuilding, setIsBuilding] = useState(false);

  const handleBuild = async () => {
    if (!project) return;

    setIsBuilding(true);
    try {
      const result = await window.api.process.build(project.path);
      if (result.success) {
        toast.success('Build succeeded!');
      } else {
        toast.error('Build failed!');
      }
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <button
      onClick={handleBuild}
      disabled={isBuilding || !project}
      className="btn btn-primary"
    >
      {isBuilding ? 'Building...' : 'Build'}
    </button>
  );
}
```

**RunButton.tsx:**
```tsx
export function RunButton() {
  const { project } = useProject();
  const { isRunning, start } = useProcessControl();

  return (
    <button
      onClick={() => start(project!.path, project!.port)}
      disabled={isRunning || !project}
      className="btn btn-success"
    >
      Run
    </button>
  );
}
```

**StopButton.tsx:**
```tsx
export function StopButton() {
  const { isRunning, stop } = useProcessControl();

  return (
    <button
      onClick={stop}
      disabled={!isRunning}
      className="btn btn-danger"
    >
      Stop
    </button>
  );
}
```

#### 4.5 Inspector Components

**ComponentTree.tsx:**
```tsx
export function ComponentTree() {
  const { components } = useSignalR();

  return (
    <div className="component-tree">
      {components.map(component => (
        <ComponentTreeNode key={component.id} component={component} />
      ))}
    </div>
  );
}
```

**StateInspector.tsx:**
```tsx
export function StateInspector({ componentId }: StateInspectorProps) {
  const { state } = useSignalR();

  return (
    <div className="state-inspector">
      <h3>State</h3>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(state).map(([key, value]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{JSON.stringify(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**PerformanceChart.tsx:**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function PerformanceChart() {
  const { metrics } = useSignalR();

  return (
    <LineChart width={600} height={300} data={metrics}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="renderTime" stroke="#8884d8" />
    </LineChart>
  );
}
```

**Deliverables:**
- ✅ All UI components implemented
- ✅ Components styled with Tailwind
- ✅ Components are responsive

---

### **Phase 5: Pages** (Week 3, Days 4-5)

#### 5.1 Home Page
```tsx
// src/renderer/src/pages/Home.tsx
export function Home() {
  const navigate = useNavigate();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    window.api.project.getRecent().then(setRecentProjects);
  }, []);

  return (
    <div className="home-page">
      <div className="hero">
        <img src={logo} alt="Minimact Swig" />
        <h1>Minimact Swig</h1>
        <p>The Desktop IDE for Minimact Development</p>
      </div>

      <div className="actions">
        <button onClick={() => navigate('/create-project')}>
          Create New Project
        </button>
        <button onClick={handleOpenProject}>
          Open Existing Project
        </button>
      </div>

      {recentProjects.length > 0 && (
        <div className="recent-projects">
          <h2>Recent Projects</h2>
          {recentProjects.map(project => (
            <ProjectCard
              key={project.path}
              project={project}
              onClick={() => loadProject(project.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 5.2 Create Project Page
```tsx
export function CreateProject() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [targetDir, setTargetDir] = useState('');
  const [template, setTemplate] = useState('Counter');

  const handleSelectDirectory = async () => {
    const dir = await window.api.file.openDialog();
    if (dir) setTargetDir(dir);
  };

  const handleCreate = async () => {
    const fullPath = path.join(targetDir, projectName);
    const project = await window.api.project.create(fullPath, template);
    navigate(`/dashboard?path=${project.path}`);
  };

  return (
    <div className="create-project-page">
      <h1>Create New Project</h1>

      <form onSubmit={handleCreate}>
        <label>
          Project Name:
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />
        </label>

        <label>
          Target Directory:
          <div className="input-group">
            <input value={targetDir} readOnly />
            <button type="button" onClick={handleSelectDirectory}>
              Browse...
            </button>
          </div>
        </label>

        <label>
          Template:
          <select value={template} onChange={(e) => setTemplate(e.target.value)}>
            <option value="Counter">Counter (Basic)</option>
            <option value="TodoList">Todo List (CRUD)</option>
            <option value="Dashboard">Dashboard (Charts)</option>
          </select>
        </label>

        <button type="submit">Create Project</button>
      </form>
    </div>
  );
}
```

#### 5.3 Dashboard Page
```tsx
export function Dashboard() {
  const { project, files } = useProject();
  const { isRunning } = useProcessControl();
  const [openFiles, setOpenFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);

  return (
    <div className="dashboard-page">
      <div className="sidebar">
        <FileTree
          files={files}
          onFileClick={(file) => openFile(file)}
        />
      </div>

      <div className="main-content">
        <div className="editor-area">
          {openFiles.length > 0 ? (
            <>
              <TabBar
                files={openFiles}
                activeFile={activeFile}
                onTabClick={setActiveFile}
                onTabClose={closeFile}
              />
              <CodeEditor
                file={activeFile!}
                onChange={(content) => updateFile(activeFile!, content)}
              />
            </>
          ) : (
            <div className="empty-state">
              <p>No files open. Select a file from the tree to edit.</p>
            </div>
          )}
        </div>

        <div className="terminal-area">
          <Terminal />
        </div>
      </div>

      <div className="control-panel">
        <BuildButton />
        <RunButton />
        <StopButton />
        <button
          onClick={() => window.api.shell.openExternal(`http://localhost:${project.port}`)}
          disabled={!isRunning}
        >
          Open in Browser
        </button>
      </div>
    </div>
  );
}
```

#### 5.4 Inspector Page
```tsx
export function Inspector() {
  const { connected, components, metrics } = useSignalR();

  if (!connected) {
    return (
      <div className="inspector-page">
        <div className="empty-state">
          <p>No app connected. Start your app to see live data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-page">
      <div className="sidebar">
        <ComponentTree />
      </div>

      <div className="main-content">
        <Tabs>
          <TabPanel label="State">
            <StateInspector />
          </TabPanel>
          <TabPanel label="Performance">
            <PerformanceChart />
          </TabPanel>
          <TabPanel label="SignalR Messages">
            <SignalRMonitor />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
```

**Deliverables:**
- ✅ All pages implemented
- ✅ Navigation works
- ✅ Pages are styled

---

### **Phase 6: State Management & Hooks** (Week 4, Days 1-2)

#### 6.1 Project Store
```typescript
// src/renderer/src/store/projectStore.ts
import { create } from 'zustand';

interface ProjectStore {
  project: Project | null;
  files: ProjectFile[];
  openFiles: ProjectFile[];
  activeFile: ProjectFile | null;

  loadProject: (path: string) => Promise<void>;
  openFile: (file: ProjectFile) => void;
  closeFile: (file: ProjectFile) => void;
  setActiveFile: (file: ProjectFile) => void;
  updateFileContent: (file: ProjectFile, content: string) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  files: [],
  openFiles: [],
  activeFile: null,

  loadProject: async (path: string) => {
    const project = await window.api.project.load(path);
    const files = await window.api.project.scanFiles(path);
    set({ project, files });
  },

  openFile: (file) => {
    const { openFiles } = get();
    if (!openFiles.find(f => f.path === file.path)) {
      set({ openFiles: [...openFiles, file], activeFile: file });
    } else {
      set({ activeFile: file });
    }
  },

  closeFile: (file) => {
    const { openFiles, activeFile } = get();
    const newOpenFiles = openFiles.filter(f => f.path !== file.path);
    const newActiveFile = activeFile?.path === file.path
      ? newOpenFiles[0] || null
      : activeFile;
    set({ openFiles: newOpenFiles, activeFile: newActiveFile });
  },

  setActiveFile: (file) => {
    set({ activeFile: file });
  },

  updateFileContent: async (file, content) => {
    await window.api.file.writeFile(file.path, content);
    // Update local state
    set((state) => ({
      openFiles: state.openFiles.map(f =>
        f.path === file.path ? { ...f, content } : f
      ),
    }));
  },
}));
```

#### 6.2 Process Control Hook
```typescript
// src/renderer/src/hooks/useProcessControl.ts
export function useProcessControl() {
  const [isRunning, setIsRunning] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    const checkRunning = async () => {
      const running = await window.api.process.isRunning();
      setIsRunning(running);
    };

    checkRunning();
    const interval = setInterval(checkRunning, 1000);

    return () => clearInterval(interval);
  }, []);

  const build = async (projectPath: string) => {
    setIsBuilding(true);
    try {
      const result = await window.api.process.build(projectPath);
      return result;
    } finally {
      setIsBuilding(false);
    }
  };

  const start = async (projectPath: string, port: number) => {
    await window.api.process.start(projectPath, port);
    setIsRunning(true);
  };

  const stop = async () => {
    await window.api.process.stop();
    setIsRunning(false);
  };

  return { isRunning, isBuilding, build, start, stop };
}
```

#### 6.3 SignalR Hook
```typescript
// src/renderer/src/hooks/useSignalR.ts
import { useEffect, useState } from 'react';

export function useSignalR() {
  const [connected, setConnected] = useState(false);
  const [components, setComponents] = useState<ComponentTreeNode[]>([]);
  const [state, setState] = useState<Record<string, any>>({});
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);

  useEffect(() => {
    const connect = async () => {
      await window.api.signalr.connect('http://localhost:5000/hubs/minimact');
      setConnected(true);
    };

    connect();

    // Listen for events
    window.api.signalr.on('ComponentRendered', (data) => {
      // Update components
    });

    window.api.signalr.on('StateChanged', (data) => {
      setState((prev) => ({ ...prev, [data.key]: data.value }));
    });

    window.api.signalr.on('PerformanceMetric', (data) => {
      setMetrics((prev) => [...prev, data]);
    });

    return () => {
      window.api.signalr.disconnect();
    };
  }, []);

  return { connected, components, state, metrics };
}
```

**Deliverables:**
- ✅ State management implemented
- ✅ Custom hooks created
- ✅ App state is reactive

---

### **Phase 7: Polish & Testing** (Week 4, Days 3-5)

#### 7.1 Styling & Theming
- Apply Tailwind CSS classes consistently
- Implement dark theme (primary)
- Add light theme option
- Polish animations and transitions
- Ensure responsive design

#### 7.2 Error Handling
- Add error boundaries
- Display user-friendly error messages
- Log errors to file
- Add retry mechanisms

#### 7.3 Loading States
- Add loading spinners
- Add skeleton screens
- Add progress indicators

#### 7.4 Native Features
- Add native menus (File, Edit, View, Help)
- Add keyboard shortcuts
- Add system tray integration
- Add native notifications

#### 7.5 Testing
- Unit tests for services
- Integration tests for IPC
- E2E tests with Playwright
- Test on Windows, macOS, Linux

**Deliverables:**
- ✅ App is polished and professional
- ✅ All features tested
- ✅ No critical bugs

---

### **Phase 8: Build & Distribution** (Week 5)

#### 8.1 Configure electron-builder
```yaml
# electron-builder.yml
appId: com.minimact.swig
productName: Minimact Swig
copyright: Copyright © 2025 Minimact

directories:
  output: dist
  buildResources: resources

files:
  - '!**/.vscode/*'
  - '!src/*'
  - '!electron.vite.config.ts'

win:
  target:
    - nsis
    - portable
  icon: resources/icon.ico

mac:
  target:
    - dmg
    - zip
  icon: resources/icon.icns
  category: public.app-category.developer-tools

linux:
  target:
    - AppImage
    - deb
  icon: resources/icon.png
  category: Development
```

#### 8.2 Build for All Platforms
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

#### 8.3 Code Signing (Optional)
- Windows: Sign with Authenticode
- macOS: Sign with Apple Developer certificate
- Linux: No signing required

#### 8.4 Auto-Update (Optional)
- Set up update server
- Implement auto-update check
- Download and install updates

**Deliverables:**
- ✅ Windows installer (.exe)
- ✅ Windows portable (.exe)
- ✅ macOS app (.dmg)
- ✅ Linux AppImage (.AppImage)
- ✅ Linux DEB package (.deb)

---

## 📊 Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| **Phase 1** | Project Setup | Week 1, Days 1-2 | 🔜 NEXT |
| **Phase 2** | Main Process Services | Week 1, Days 3-5 | ⏳ Pending |
| **Phase 3** | IPC Layer | Week 2, Days 1-2 | ⏳ Pending |
| **Phase 4** | UI Components | Week 2-3 | ⏳ Pending |
| **Phase 5** | Pages | Week 3, Days 4-5 | ⏳ Pending |
| **Phase 6** | State & Hooks | Week 4, Days 1-2 | ⏳ Pending |
| **Phase 7** | Polish & Testing | Week 4, Days 3-5 | ⏳ Pending |
| **Phase 8** | Build & Distribution | Week 5 | ⏳ Pending |
| **MVP COMPLETE** | | **End of Week 5** | 🎯 TARGET |

**Total Time to MVP:** 5 weeks (with focused effort)

---

## 🎨 UI/UX Design Principles

### Color Scheme
- **Primary**: `#7ED321` (Minimact Green)
- **Secondary**: `#00D9FF` (Cyan Blue)
- **Accent**: `#FF8C00` (Orange)
- **Background**: `#1E1E1E` (Dark Gray)
- **Surface**: `#252526` (Darker Gray)
- **Text**: `#D4D4D4` (Light Gray)

### Typography
- **Headings**: Inter, 600 weight
- **Body**: Inter, 400 weight
- **Code**: Fira Code, 400 weight (with ligatures)

### Layout
- **Sidebar**: 250px width
- **Header**: 56px height
- **Status Bar**: 24px height
- **Terminal**: 200px height (resizable)

### Interactions
- **Hover**: Lighten background by 5%
- **Active**: Lighten background by 10%
- **Focus**: 2px outline in primary color
- **Transition**: 150ms ease-in-out

---

## 🔐 Security Considerations

### Context Isolation
- Preload script uses `contextBridge`
- Renderer process cannot access Node APIs directly
- All IPC calls go through exposed API

### Content Security Policy
```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
/>
```

### Node Integration
- Disabled in renderer process
- Enabled only in main process

---

## 🚀 Distribution Strategy

### Release Channels
- **Stable**: Production-ready releases
- **Beta**: Feature-complete, testing phase
- **Alpha**: Early previews, may be unstable

### Versioning
- Follow Semantic Versioning (semver)
- Format: `MAJOR.MINOR.PATCH`
- Example: `1.0.0`, `1.1.0`, `1.1.1`

### Release Notes
- Changelog generated from commit history
- Categorize changes (Features, Fixes, Breaking Changes)
- Include screenshots for visual changes

### Download Locations
- GitHub Releases (primary)
- Official website (minimact.dev/swig)
- Package managers (future: Homebrew, Chocolatey)

---

## 📝 Documentation Plan

### User Documentation
- **Getting Started Guide**: Quick start for new users
- **User Manual**: Comprehensive feature documentation
- **Keyboard Shortcuts**: List of all shortcuts
- **FAQ**: Common questions and answers

### Developer Documentation
- **Architecture Overview**: High-level architecture
- **Contributing Guide**: How to contribute
- **API Reference**: IPC API documentation
- **Build Guide**: How to build from source

---

## 🎯 Success Metrics

**MVP is successful when:**
1. ✅ User can create a new Minimact project in < 30 seconds
2. ✅ User can edit TSX files in built-in editor
3. ✅ Auto-transpilation works on file save
4. ✅ User can build and run project with one click
5. ✅ User can view live component state
6. ✅ App feels responsive (< 100ms interactions)
7. ✅ App is stable (no crashes during normal use)
8. ✅ App looks professional (polished UI)

**Time to First Working App:** < 5 minutes (from install to running app)

---

## 🌟 Competitive Advantages

**Why Minimact Swig (Electron) is Better:**

| Feature | Other IDEs | Minimact Swig |
|---------|------------|---------------|
| **Setup Time** | 30+ minutes | < 5 minutes ✅ |
| **Code Editor** | External (VS Code) | Built-in Monaco ✅ |
| **Terminal** | Separate window | Integrated ✅ |
| **Live State** | Chrome DevTools | Native Inspector ✅ |
| **Transpilation** | Manual | Automatic ✅ |
| **Project Setup** | Complex | One-click ✅ |
| **Cross-Platform** | Varies | Win/Mac/Linux ✅ |
| **Desktop App** | No | Yes ✅ |

---

## 🔮 Future Enhancements (Post-MVP)

### Phase 9: Advanced Features
1. **Git Integration**: Commit, push, pull from UI
2. **Component Marketplace**: Browse and install components
3. **Visual Component Builder**: Drag-and-drop UI
4. **Deployment Tools**: Deploy to Azure/AWS with one click
5. **Collaboration**: Share projects, pair programming
6. **Plugin System**: Extend Swig with custom plugins
7. **AI Assistant**: Code completion, bug detection
8. **Performance Profiler**: Flamegraphs, memory analysis

### Phase 10: Community Features
1. **Project Templates Marketplace**: Share templates
2. **Theme Marketplace**: Custom color schemes
3. **Extension Marketplace**: Community plugins
4. **Forum Integration**: Ask questions, share projects

---

## 📚 Resources

### Documentation
- Electron: https://electronjs.org/docs
- electron-vite: https://electron-vite.org/
- Monaco Editor: https://microsoft.github.io/monaco-editor/
- xterm.js: https://xtermjs.org/
- SignalR: https://docs.microsoft.com/en-us/aspnet/core/signalr/

### Examples
- electron-vite examples: https://github.com/alex8088/electron-vite/tree/master/examples
- VS Code source: https://github.com/microsoft/vscode
- Electron apps showcase: https://www.electronjs.org/apps

---

**Status:** Ready to start Phase 1

**ETA to MVP:** End of Week 5

**Confidence Level:** 🟢 High (proven technologies, clear architecture)

**Philosophy:** Build a desktop app that feels native, looks beautiful, and makes Minimact development a joy.

Let's build this! 🚀✨
