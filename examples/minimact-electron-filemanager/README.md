# Minimact Electron File Manager

A **desktop file manager** built with **Minimact** and **Electron** that demonstrates the power of server-side React in a desktop application.

## ✨ Features

- 📁 **File System Browser** - Navigate your file system with a beautiful UI
- 📊 **Real-Time Charts** - File type distribution using `Minimact.Charts`
- ⚡ **Instant Updates** - Server-side rendering with zero client bundle
- 🎨 **Modern UI** - Dark theme with smooth animations
- 🔒 **Type-Safe** - Full C# backend with TypeScript-style TSX frontend

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Electron (Desktop Shell)               │
│  - Window management                    │
│  - File dialogs (via IPC)               │
│  - System integration                   │
└─────────────────────────────────────────┘
                  │
                  ↓ spawns
┌─────────────────────────────────────────┐
│  ASP.NET Core (Kestrel on :5000)       │
│  - Minimact server-side rendering       │
│  - File system API (C# controllers)     │
│  - SignalR for real-time updates        │
└─────────────────────────────────────────┘
                  │
                  ↓ HTTP + SignalR
┌─────────────────────────────────────────┐
│  BrowserWindow (Renderer)               │
│  - Displays Minimact UI                 │
│  - Applies template patches              │
│  - Connects via SignalR                 │
└─────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **.NET 8 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Node.js 18+** - [Download](https://nodejs.org)
- **babel-plugin-minimact** - For TSX → C# transpilation

### 1. Install Electron Dependencies

```bash
cd electron
npm install
```

### 2. Build the .NET Backend

```bash
cd src
dotnet build
```

### 3. Transpile TSX to C#

You need to transpile `FileManagerPage.tsx` to C#. If you have Minimact Swig installed:

**Option A: Use Swig (Recommended)**
1. Open Minimact Swig
2. File → Open Project → Select this folder
3. Swig will auto-transpile TSX files

**Option B: Manual Transpilation**
```bash
cd src
npx babel Pages --out-dir Pages --extensions ".tsx" --plugins babel-plugin-minimact
```

### 4. Run the App

```bash
# From the root directory
cd electron
npm run dev
```

This will:
1. Start the .NET Kestrel server on `http://localhost:5000`
2. Launch Electron window
3. Load the Minimact File Manager UI

## 📦 Project Structure

```
minimact-electron-filemanager/
├── electron/                        # Electron wrapper
│   ├── main.js                     # Main process (spawns .NET server)
│   ├── preload.js                  # IPC bridge
│   └── package.json
├── src/                            # .NET Minimact app
│   ├── Program.cs                  # Kestrel server entry point
│   ├── Controllers/
│   │   └── DesktopController.cs   # Desktop API (file system)
│   ├── Pages/
│   │   ├── FileManagerPage.tsx    # Main UI component
│   │   └── FileManagerPage.cs     # Transpiled C# (generated)
│   └── MinimactElectronFileManager.csproj
└── README.md
```

## 🎯 Key Technologies

### Backend (C#)
- **Minimact.AspNetCore** (0.1.3) - Server-side React framework
- **Minimact.Charts** (0.1.0) - Charting library (Recharts-inspired)
- **ASP.NET Core** - Kestrel web server

### Frontend (TSX)
- **Server-rendered React** - No client-side React bundle
- **Template Patch System** - Instant UI updates
- **SignalR** - Real-time communication

### Desktop (Electron)
- **Electron 28** - Desktop shell
- **IPC Bridge** - C# ↔ Electron communication

## 🔧 Development Workflow

### Hot Reload

When you save a TSX file:
1. Swig auto-transpiles it to C#
2. .NET detects the change and recompiles
3. Kestrel restarts automatically
4. Electron reloads the window
5. **Result: ~3 second feedback loop**

### Adding Features

**Want to add a chart?**
```tsx
<Plugin name="PieChart" state={{
  data: myData,
  width: 300,
  height: 300
}} />
```

**Want to call desktop APIs?**
```tsx
async function openFile() {
  const response = await fetch('/api/desktop/read-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath })
  });
  const { content } = await response.json();
  setFileContent(content);
}
```

**Want to add a new API endpoint?**
```csharp
[HttpGet("my-endpoint")]
public IActionResult MyEndpoint()
{
    return Ok(new { data = "..." });
}
```

## 📊 Example Features

### File System Browser
- Navigate directories
- View file details (size, date, type)
- Parent directory navigation

### Charts
- **Bar Chart**: File type distribution
- Shows top 10 file extensions
- Real-time updates when changing directories

### System Info
- Drive information
- System statistics
- User profile access

## 🏗️ Building for Production

### Build .NET App

```bash
cd src
dotnet publish -c Release -r win-x64 --self-contained
```

### Build Electron App

```bash
cd electron
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

This creates a standalone executable in `electron/dist/`.

### Distribution

The packaged app includes:
- Electron shell (~150MB)
- .NET runtime (~50MB)
- Your Minimact app (~5MB)

**Total size: ~200MB** (one-time download)

## 🎓 Learning Points

This example demonstrates:

1. **Desktop + Web Parity** - Same Minimact code works on web and desktop
2. **C# for Desktop Apps** - No JavaScript in the main process
3. **Plugin System** - Extensible UI with `<Plugin>` components
4. **Zero Client Bundle** - All rendering happens server-side
5. **Type Safety** - C# backend + TypeScript-style TSX

## 🤔 Why This Approach?

### Traditional Electron + React

```
50+ npm packages
5GB node_modules
30-minute builds
Webpack configuration hell
```

### Minimact Electron

```
5 dependencies
50MB total
5-second builds
Zero configuration
```

## 📚 Next Steps

- **Extend the API**: Add file operations (copy, move, delete)
- **Add More Charts**: Use Pie, Line, Area charts
- **Build Your Own**: Use this as a template for your desktop apps

## 🐛 Troubleshooting

### .NET app not found
```bash
cd src
dotnet build
```

### Electron won't start
```bash
cd electron
npm install
```

### TSX not transpiling
Use Minimact Swig or run Babel manually.

## 📄 License

MIT © 2025 Minimact Contributors

---

**Built with ❤️ using Minimact** - The server-side React framework
