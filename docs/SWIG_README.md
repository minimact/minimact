# Minimact Swig

**Desktop IDE for Minimact development** with real-time TSX → C# transpilation, Monaco editor, and integrated terminal.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

---

## 🚀 Quick Start

```bash
git clone https://github.com/minimact/swig
cd swig
npm install
npm start
```

That's it! The IDE will launch and you're ready to build Minimact apps.

---

## ✨ Features

### 🎨 **Monaco Editor**
- Full TypeScript/TSX syntax highlighting
- IntelliSense and autocomplete
- Multi-file editing
- Bracket matching and auto-indentation

### ⚡ **Real-Time Transpilation**
- Instant TSX → C# conversion
- Powered by `@minimact/babel-plugin`
- See generated C# code immediately
- Auto-save on file changes

### 📊 **Live Preview**
- Component state monitoring
- SignalR connection status
- Real-time metrics and performance

### 🖥️ **Integrated Terminal**
- xterm.js powered terminal
- Run build commands
- Execute dotnet CLI
- View compilation output

### 🏗️ **Project Management**
- Create new Minimact projects
- Open existing projects
- File tree navigation
- One-click build & run

### 🔄 **Hot Reload**
- File watcher integration
- Auto-rebuild on save
- Live component updates

---

## 📋 System Requirements

- **Node.js** 18 or higher
- **npm** 9 or higher
- **Operating System:**
  - Windows 10/11
  - macOS 10.13+
  - Linux (Ubuntu, Fedora, etc.)

---

## 🎯 What's Minimact?

Minimact is a server-side React framework that brings React's developer experience to ASP.NET Core:

- Write **TSX components** with familiar React hooks
- Transpile to **C# classes** at build time
- Render on the **server** with blazing-fast Rust reconciliation
- **Zero JavaScript** in production (optional client runtime for interactivity)
- **Predictive rendering** for instant UI updates

**Swig** is the official IDE that makes Minimact development seamless.

---

## 🛠️ Usage

### Creating a New Project

1. Launch Swig
2. Click **"New Project"**
3. Choose a directory
4. Select template (empty, todo app, etc.)
5. Click **"Create"**

Swig will scaffold the project structure:
```
MyMinimactApp/
├── Pages/
│   └── Home.tsx
├── Components/
├── MyMinimactApp.csproj
└── Program.cs
```

### Opening an Existing Project

1. Click **"Open Project"**
2. Browse to your Minimact project folder
3. Swig will load all TSX files

### Editing Components

1. Select a file from the tree
2. Edit in Monaco editor (left pane)
3. See generated C# code (right pane)
4. Save with `Ctrl+S` (auto-transpiles)

### Building & Running

1. Click **"Build"** to compile the project
2. View output in the integrated terminal
3. Click **"Run"** to launch your app
4. Open in browser to test

---

## 📦 What's Included

This distribution includes:

- ✅ **Built Electron app** - No compilation needed
- ✅ **Minimact packages** - Pre-built `@minimact/babel-plugin`, `@minimact/core`, `@minimact/punch`
- ✅ **All dependencies** - Exact versions via `package-lock.json`
- ✅ **Zero config** - Works immediately after `npm install`

**No source code, no build step, just run it!**

---

## 🎓 Learn Minimact

- **Documentation:** [https://minimact.dev/docs](https://minimact.dev)
- **Examples:** Check the `examples/` folder in Minimact projects
- **Discord:** [https://discord.gg/minimact](https://discord.gg/minimact)
- **GitHub:** [https://github.com/minimact](https://github.com/minimact)

---

## 🔧 Configuration

Swig stores settings in:
- **Windows:** `%APPDATA%\minimact-swig\config.json`
- **macOS:** `~/Library/Application Support/minimact-swig/config.json`
- **Linux:** `~/.config/minimact-swig/config.json`

### Available Settings

```json
{
  "theme": "dark",
  "fontSize": 14,
  "autoSave": true,
  "autoTranspile": true,
  "terminalShell": "powershell"
}
```

---

## 🐛 Troubleshooting

### "npm install fails"

**Cause:** Node.js version too old.

**Fix:**
```bash
node --version  # Should be 18+
npm --version   # Should be 9+
```

Update Node.js from [nodejs.org](https://nodejs.org)

### "Transpilation fails"

**Cause:** Invalid TSX syntax or missing imports.

**Fix:** Check the error message in the output pane. Common issues:
- Missing `import { useState } from 'minimact'`
- Unclosed JSX tags
- TypeScript syntax errors

### "App won't start"

**Cause:** Port already in use or missing dependencies.

**Fix:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm start
```

### "Can't find babel plugin"

**Cause:** Corrupted `mact_modules/` directory.

**Fix:** This shouldn't happen in the distribution, but if it does:
```bash
# Re-clone the repository
cd ..
rm -rf swig
git clone https://github.com/minimact/swig
cd swig
npm install
npm start
```

---

## 🤝 Contributing

Swig is part of the Minimact project. Contributions are welcome!

**For Swig-specific issues:**
- Report bugs: [https://github.com/minimact/swig/issues](https://github.com/minimact/swig/issues)
- Feature requests: Use the "Feature Request" template
- Pull requests: Fork, branch, PR

**For Minimact framework issues:**
- Main repo: [https://github.com/minimact/minimact](https://github.com/minimact/minimact)

---

## 📄 License

MIT License

Copyright (c) 2025 Minimact Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🌟 Support

Love Swig? Show your support:

- ⭐ Star the repo on GitHub
- 📢 Share with other developers
- 💬 Join our Discord community
- 🐛 Report bugs and suggest features

---

## 🔗 Links

- **Website:** [https://minimact.dev](https://minimact.dev)
- **Docs:** [https://minimact.dev/docs](https://minimact.dev/docs)
- **GitHub:** [https://github.com/minimact](https://github.com/minimact)
- **Discord:** [https://discord.gg/minimact](https://discord.gg/minimact)
- **Twitter:** [@minimact](https://twitter.com/minimact)

---

**Built with ❤️ by the Minimact team**

*Swig - The cactus that makes development smooth* 🌵✨
