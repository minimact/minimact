# 🌵 Cactus Browser - Complete Implementation Plan

**The World's First TSX-Native, GitHub-Native, Posthydrationist Web Browser**

<p align="center">
  <strong>From zero to interactive gh:// web</strong>
</p>

---

## Table of Contents

1. [Vision & Architecture](#vision--architecture)
2. [Technology Stack](#technology-stack)
3. [Phase 1: Boot the Runtime](#phase-1-boot-the-runtime-local-tsx-viewer)
4. [Phase 2: GitHub Repo Loader](#phase-2-github-repo-loader)
5. [Phase 3: Compile + Predict + Render](#phase-3-compile--predict--render)
6. [Phase 4: Routing Engine](#phase-4-routing-engine)
7. [Phase 5: UI Shell](#phase-5-ui-shell)
8. [Phase 6: Caching, Offline, Patching](#phase-6-caching-offline-patching)
9. [Phase 7: PostWeb Index Integration](#phase-7-postweb-index-integration)
10. [Phase 8+: Advanced Features](#phase-8-advanced-features)
11. [Directory Structure](#directory-structure)
12. [Getting Started](#getting-started)
13. [Testing Strategy](#testing-strategy)
14. [Deployment & Distribution](#deployment--distribution)

---

## Vision & Architecture

### What Is Cactus Browser?

**A native desktop application that:**
- Treats **GitHub repositories** as websites
- Renders **TSX files** as web pages (not HTML)
- Uses **Minimact** for zero-hydration, predictive rendering
- Provides **instant interactions** (2-5ms latency)
- Requires **zero deployment** (just `git push`)

### Core Principles

1. **Components Are Native** - TSX is not a compile target. It is the source language.
2. **Git Is the Protocol** - Publishing is pushing. Versioning is branching. Rollback is checkout.
3. **Prediction Over Reconciliation** - The client knows what will happen before it happens.
4. **Data Over Code** - Ship templates (data), not components (code).
5. **Zero Hydration** - If you're hydrating, you've already lost.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CACTUS BROWSER                        │
│                  (Tauri Native Shell)                    │
└──────────────────┬──────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│   gh://      │      │  UI Components   │
│   Protocol   │      │  (Address Bar,   │
│   Handler    │      │   Navigator)     │
└──────┬───────┘      └──────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         GitHub API Client                │
│  (Fetch .tsx, cache, handle auth)        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Babel + Minimact Compiler           │
│  TSX → C# + Templates + Predictions      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│       Minimact Runtime Engine            │
│  C# Component Execution + Rust Patches   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Client Renderer                  │
│  Template Application + DOM Patching     │
└─────────────────────────────────────────┘
```

---

## Technology Stack

### Core Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Shell** | Tauri 2.0 | Native desktop framework (Rust + WebView) |
| **UI** | React + TypeScript | Browser UI components |
| **Protocol** | Custom gh:// handler | Parse and fetch from GitHub |
| **Compilation** | Babel + babel-plugin-minimact | TSX → C# + template extraction |
| **Runtime** | .NET 8.0 (embedded) | C# component execution |
| **Reconciliation** | Rust engine (minimact-rust) | VNode diffing + patch generation |
| **Client** | Minimact client runtime | Template application + DOM patching |
| **Storage** | Tauri Store + IndexedDB | Local caching + persistence |
| **Networking** | Octokit (GitHub API) | Repository access + authentication |

### Bundle Targets

- **Windows**: `.exe` (WebView2)
- **macOS**: `.app` (WKWebView)
- **Linux**: `.AppImage` / `.deb` (WebKitGTK)

---

## Phase 1: Boot the Runtime (Local TSX Viewer)

### 🎯 Goal

Load a local `.tsx` file, compile it to C#, render it via Minimact in a Tauri shell.

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js 18+
nvm install 18
nvm use 18

# Install Tauri CLI
cargo install tauri-cli

# Install pnpm (optional but recommended)
npm install -g pnpm
```

### Tasks

#### 1.1 Initialize Tauri Project

```bash
# Create project
npm create tauri-app cactus-browser

# Options:
#   Package manager: pnpm
#   UI template: React + TypeScript
#   Styling: None (manual CSS)
```

**Expected structure:**
```
cactus-browser/
├── src/              # React UI
├── src-tauri/        # Rust backend
├── package.json
└── tauri.conf.json
```

#### 1.2 Install Minimact Dependencies

```bash
cd cactus-browser

# Install Minimact runtime
pnpm add @minimact/core
pnpm add @minimact/babel-plugin-tsx

# Install Babel
pnpm add -D @babel/core @babel/preset-typescript @babel/preset-react

# Install dev dependencies
pnpm add -D typescript @types/react @types/react-dom
```

#### 1.3 Create Test Component

**test-pages/index.tsx:**
```typescript
import { useState } from '@minimact/core';

export function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <h1>Welcome to Cactus Browser! 🌵</h1>
      <p>This is a TSX-native component.</p>
      <button onClick={() => setCount(count + 1)}>
        Clicked {count} times
      </button>
    </div>
  );
}
```

#### 1.4 Implement Local TSX Loader

**src/core/local-loader.ts:**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { transformSync } from '@babel/core';
import minimactPlugin from '@minimact/babel-plugin-tsx';

export interface CompilationResult {
  csharp: string;              // Generated C# code
  templates: TemplateMetadata; // Prediction templates
  keys: Record<string, string>; // Hex keys
}

export async function compileLocalTsx(filePath: string): Promise<CompilationResult> {
  // 1. Read TSX file
  const source = await fs.promises.readFile(filePath, 'utf-8');

  // 2. Transpile via Babel
  const result = transformSync(source, {
    filename: filePath,
    presets: ['@babel/preset-typescript', '@babel/preset-react'],
    plugins: [
      [minimactPlugin, {
        generateKeys: true,
        extractTemplates: true,
        outputPath: path.dirname(filePath)
      }]
    ]
  });

  // 3. Load generated artifacts
  const basePath = filePath.replace('.tsx', '');
  const csharp = await fs.promises.readFile(`${basePath}.cs`, 'utf-8');
  const templates = JSON.parse(await fs.promises.readFile(`${basePath}.templates.json`, 'utf-8'));
  const keys = JSON.parse(await fs.promises.readFile(`${basePath}.tsx.keys`, 'utf-8'));

  return { csharp, templates, keys };
}
```

#### 1.5 Embed Minimact Runtime

**src/core/minimact-runtime.ts:**
```typescript
import { Minimact } from '@minimact/core';

export interface MinimactRuntime {
  renderComponent(csharp: string, templates: any): Promise<string>;
  applyPatch(patch: Patch[]): void;
}

export async function createRuntime(): Promise<MinimactRuntime> {
  // Initialize Minimact client runtime
  const minimact = new Minimact({
    signalR: null, // Local mode, no server
    domPatcher: document.getElementById('root')!,
  });

  return {
    async renderComponent(csharp: string, templates: any) {
      // Execute C# component via embedded .NET runtime
      // (Phase 3 will implement this fully)

      // For now, return static HTML
      return '<div>Rendered from C#</div>';
    },

    applyPatch(patches: Patch[]) {
      minimact.domPatcher.applyPatches(patches);
    }
  };
}
```

#### 1.6 Render in Tauri Window

**src/App.tsx:**
```typescript
import { useEffect, useState } from 'react';
import { compileLocalTsx } from './core/local-loader';
import { createRuntime } from './core/minimact-runtime';

export default function App() {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLocalComponent() {
      try {
        // Compile test component
        const result = await compileLocalTsx('./test-pages/index.tsx');

        // Create runtime
        const runtime = await createRuntime();

        // Render
        const output = await runtime.renderComponent(result.csharp, result.templates);

        setHtml(output);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load component:', err);
        setLoading(false);
      }
    }

    loadLocalComponent();
  }, []);

  if (loading) {
    return <div>Loading component...</div>;
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### Success Criteria

- ✅ Tauri window opens
- ✅ Local `.tsx` file is compiled to C#
- ✅ Templates are extracted
- ✅ Component renders in window (static HTML for now)
- ✅ No errors in console

---

## Phase 2: GitHub Repo Loader

### 🎯 Goal

Load `.tsx` files from a GitHub repo using `gh://user/repo/path.tsx` URIs.

### Tasks

#### 2.1 Implement gh:// URI Parser

**src/core/gh-protocol.ts:**
```typescript
export interface GhUrl {
  user: string;
  repo: string;
  ref: string;        // branch, tag, or commit SHA
  path: string;
  fragment?: string;  // #component-name
}

export function parseGhUrl(url: string): GhUrl | null {
  // Format: gh://user/repo@ref/path#fragment
  const pattern = /^gh:\/\/([^\/]+)\/([^@\/]+)(?:@([^\/]+))?(\/[^#]*)?(?:#(.+))?$/;
  const match = url.match(pattern);

  if (!match) return null;

  return {
    user: match[1],
    repo: match[2],
    ref: match[3] || 'main',
    path: match[4] || '/pages/index.tsx',
    fragment: match[5]
  };
}

export function buildGhUrl(parts: GhUrl): string {
  let url = `gh://${parts.user}/${parts.repo}`;
  if (parts.ref !== 'main') url += `@${parts.ref}`;
  url += parts.path;
  if (parts.fragment) url += `#${parts.fragment}`;
  return url;
}
```

**Tests:**
```typescript
expect(parseGhUrl('gh://minimact/docs')).toEqual({
  user: 'minimact',
  repo: 'docs',
  ref: 'main',
  path: '/pages/index.tsx',
  fragment: undefined
});

expect(parseGhUrl('gh://you/blog@dev/posts/hello.tsx#intro')).toEqual({
  user: 'you',
  repo: 'blog',
  ref: 'dev',
  path: '/posts/hello.tsx',
  fragment: 'intro'
});
```

#### 2.2 GitHub API Client

**src/core/github-client.ts:**
```typescript
import { Octokit } from '@octokit/rest';

export interface GitHubFile {
  content: string;     // Decoded content
  sha: string;         // File SHA
  encoding: string;    // base64
  size: number;
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token,
      userAgent: 'Cactus-Browser/1.0.0'
    });
  }

  async fetchFile(user: string, repo: string, path: string, ref: string = 'main'): Promise<GitHubFile> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: user,
        repo,
        path,
        ref
      });

      if (Array.isArray(response.data)) {
        throw new Error(`Path is a directory: ${path}`);
      }

      const file = response.data as any;

      // Decode base64 content
      const content = Buffer.from(file.content, 'base64').toString('utf-8');

      return {
        content,
        sha: file.sha,
        encoding: file.encoding,
        size: file.size
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`File not found: ${user}/${repo}/${path}`);
      }
      if (error.status === 403) {
        throw new Error('Rate limit exceeded. Please authenticate with GitHub token.');
      }
      throw error;
    }
  }

  async fetchMultiple(user: string, repo: string, paths: string[], ref: string = 'main'): Promise<Map<string, GitHubFile>> {
    const results = new Map<string, GitHubFile>();

    // Batch requests to avoid rate limits
    for (const path of paths) {
      try {
        const file = await this.fetchFile(user, repo, path, ref);
        results.set(path, file);
      } catch (err) {
        console.warn(`Failed to fetch ${path}:`, err);
      }
    }

    return results;
  }

  async listDirectory(user: string, repo: string, path: string, ref: string = 'main'): Promise<string[]> {
    const response = await this.octokit.repos.getContent({
      owner: user,
      repo,
      path,
      ref
    });

    if (!Array.isArray(response.data)) {
      throw new Error(`Path is not a directory: ${path}`);
    }

    return response.data.map(item => item.path);
  }
}
```

#### 2.3 Import Resolver

**src/core/import-resolver.ts:**
```typescript
export interface ResolvedImport {
  path: string;
  content: string;
  dependencies: string[];
}

export async function resolveImports(
  entryPath: string,
  github: GitHubClient,
  user: string,
  repo: string,
  ref: string
): Promise<Map<string, ResolvedImport>> {
  const resolved = new Map<string, ResolvedImport>();
  const queue = [entryPath];

  while (queue.length > 0) {
    const currentPath = queue.shift()!;

    if (resolved.has(currentPath)) continue;

    // Fetch file
    const file = await github.fetchFile(user, repo, currentPath, ref);

    // Extract imports from source
    const imports = extractImports(file.content);

    // Resolve relative imports
    const dependencies = imports
      .filter(imp => imp.startsWith('./') || imp.startsWith('../'))
      .map(imp => resolvePath(currentPath, imp));

    resolved.set(currentPath, {
      path: currentPath,
      content: file.content,
      dependencies
    });

    // Add dependencies to queue
    queue.push(...dependencies);
  }

  return resolved;
}

function extractImports(source: string): string[] {
  // Match: import { ... } from 'path'
  const importPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match;

  while ((match = importPattern.exec(source)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function resolvePath(from: string, to: string): string {
  const fromDir = from.substring(0, from.lastIndexOf('/'));
  return `${fromDir}/${to}`.replace(/\/\.\//g, '/').replace(/[^/]+\/\.\.\//g, '');
}
```

#### 2.4 Local File Cache

**src/core/file-cache.ts:**
```typescript
import { invoke } from '@tauri-apps/api/tauri';

export interface CachedFile {
  content: string;
  sha: string;
  cachedAt: number;
  url: string;
}

export class FileCache {
  private cacheDir: string;

  constructor() {
    this.cacheDir = 'cactus-cache'; // Tauri app data directory
  }

  async get(url: string): Promise<CachedFile | null> {
    try {
      const key = this.hashUrl(url);
      const cached = await invoke<string>('read_cache', { key });

      if (!cached) return null;

      const parsed = JSON.parse(cached);

      // Cache expired? (24 hours)
      if (Date.now() - parsed.cachedAt > 86400000) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  async set(url: string, file: Omit<CachedFile, 'cachedAt' | 'url'>): Promise<void> {
    const key = this.hashUrl(url);
    const cached: CachedFile = {
      ...file,
      cachedAt: Date.now(),
      url
    };

    await invoke('write_cache', {
      key,
      value: JSON.stringify(cached)
    });
  }

  async clear(): Promise<void> {
    await invoke('clear_cache');
  }

  private hashUrl(url: string): string {
    // Simple hash for cache key
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }
}
```

**src-tauri/src/main.rs (add cache commands):**
```rust
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

#[tauri::command]
fn read_cache(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let cache_path = app.path_resolver()
        .app_data_dir()
        .ok_or("Failed to get app data dir")?
        .join("cactus-cache")
        .join(format!("{}.json", key));

    if !cache_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(cache_path)
        .map_err(|e| e.to_string())?;

    Ok(Some(content))
}

#[tauri::command]
fn write_cache(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let cache_dir = app.path_resolver()
        .app_data_dir()
        .ok_or("Failed to get app data dir")?
        .join("cactus-cache");

    fs::create_dir_all(&cache_dir)
        .map_err(|e| e.to_string())?;

    let cache_path = cache_dir.join(format!("{}.json", key));

    fs::write(cache_path, value)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn clear_cache(app: AppHandle) -> Result<(), String> {
    let cache_dir = app.path_resolver()
        .app_data_dir()
        .ok_or("Failed to get app data dir")?
        .join("cactus-cache");

    if cache_dir.exists() {
        fs::remove_dir_all(cache_dir)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
```

#### 2.5 Integrate GitHub Loader

**src/core/github-loader.ts:**
```typescript
import { parseGhUrl } from './gh-protocol';
import { GitHubClient } from './github-client';
import { FileCache } from './file-cache';
import { resolveImports } from './import-resolver';

export async function loadFromGitHub(url: string): Promise<Map<string, string>> {
  // Parse URL
  const parsed = parseGhUrl(url);
  if (!parsed) {
    throw new Error(`Invalid gh:// URL: ${url}`);
  }

  // Create clients
  const github = new GitHubClient(localStorage.getItem('github_token') || undefined);
  const cache = new FileCache();

  // Check cache
  const cached = await cache.get(url);
  if (cached) {
    console.log('Cache hit:', url);
    return new Map([[parsed.path, cached.content]]);
  }

  // Fetch from GitHub
  console.log('Fetching from GitHub:', url);
  const files = await resolveImports(parsed.path, github, parsed.user, parsed.repo, parsed.ref);

  // Cache all files
  for (const [path, file] of files) {
    const fileUrl = buildGhUrl({ ...parsed, path });
    await cache.set(fileUrl, {
      content: file.content,
      sha: 'unknown' // TODO: Get SHA from file
    });
  }

  // Return as Map<path, content>
  return new Map(
    Array.from(files.entries()).map(([path, file]) => [path, file.content])
  );
}
```

### Success Criteria

- ✅ Parse `gh://user/repo@branch/path.tsx` URLs correctly
- ✅ Fetch `.tsx` files from GitHub API
- ✅ Resolve and fetch import dependencies
- ✅ Cache files locally to avoid redundant fetches
- ✅ Handle rate limits and authentication
- ✅ Support public and private repos (with token)

---

## Phase 3: Compile + Predict + Render

### 🎯 Goal

Run full TSX → C# → Predicted template rendering cycle.

### Tasks

#### 3.1 Embed .NET Runtime

**Options:**

1. **NativeAOT** - Compile C# to native executable, invoke via Tauri command
2. **dotnet CLI** - Shell out to `dotnet run` (slower but simpler)
3. **CoreCLR Hosting** - Embed .NET runtime in Rust (complex but powerful)

**Recommended: NativeAOT for production, dotnet CLI for MVP**

**src-tauri/Cargo.toml:**
```toml
[dependencies]
tauri = "2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

**src-tauri/src/dotnet.rs:**
```rust
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct RenderRequest {
    pub csharp: String,
    pub templates: serde_json::Value,
    pub initial_state: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
pub struct RenderResponse {
    pub html: String,
    pub patches: Vec<serde_json::Value>,
    pub predictions: serde_json::Value,
}

pub fn render_component(request: RenderRequest) -> Result<RenderResponse, String> {
    // Write request to temp file
    let temp_path = std::env::temp_dir().join("cactus-render.json");
    std::fs::write(&temp_path, serde_json::to_string(&request).unwrap())
        .map_err(|e| e.to_string())?;

    // Execute dotnet CLI
    let output = Command::new("dotnet")
        .args(&[
            "run",
            "--project", "./minimact-runtime",
            "--", &temp_path.to_string_lossy()
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(format!("dotnet execution failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    // Parse response
    let response: RenderResponse = serde_json::from_slice(&output.stdout)
        .map_err(|e| e.to_string())?;

    Ok(response)
}
```

#### 3.2 Create Minimact Runtime Project

**minimact-runtime/Program.cs:**
```csharp
using System;
using System.IO;
using System.Text.Json;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Reconciler;

namespace CactusBrowser.Runtime;

public class Program
{
    public static void Main(string[] args)
    {
        // Read request from temp file
        var requestPath = args[0];
        var requestJson = File.ReadAllText(requestPath);
        var request = JsonSerializer.Deserialize<RenderRequest>(requestJson);

        // Compile C# dynamically
        var component = CompileCSharp(request.CSharp);

        // Execute Render()
        var vnode = component.Render();

        // Convert to HTML (initial render)
        var html = VNodeToHtml(vnode);

        // Generate predictions via Rust engine
        var predictions = GeneratePredictions(vnode, request.Templates);

        // Return response
        var response = new RenderResponse
        {
            Html = html,
            Patches = new List<object>(),
            Predictions = predictions
        };

        Console.WriteLine(JsonSerializer.Serialize(response));
    }

    private static MinimactComponent CompileCSharp(string source)
    {
        // Use Roslyn to compile C# source at runtime
        // (Implementation details in separate file)
        throw new NotImplementedException();
    }

    private static string VNodeToHtml(VNode vnode)
    {
        // Serialize VNode to HTML
        throw new NotImplementedException();
    }

    private static object GeneratePredictions(VNode vnode, object templates)
    {
        // Call Rust prediction engine via FFI
        throw new NotImplementedException();
    }
}
```

#### 3.3 Implement C# Dynamic Compilation

**minimact-runtime/DynamicCompiler.cs:**
```csharp
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using System.Reflection;
using System.Runtime.Loader;

public static class DynamicCompiler
{
    public static Assembly CompileCSharp(string source)
    {
        var syntaxTree = CSharpSyntaxTree.ParseText(source);

        var references = new[]
        {
            MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(MinimactComponent).Assembly.Location),
            // Add more references as needed
        };

        var compilation = CSharpCompilation.Create(
            assemblyName: "DynamicComponent",
            syntaxTrees: new[] { syntaxTree },
            references: references,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

        using var ms = new MemoryStream();
        var result = compilation.Emit(ms);

        if (!result.Success)
        {
            var errors = string.Join("\n", result.Diagnostics
                .Where(d => d.Severity == DiagnosticSeverity.Error)
                .Select(d => d.GetMessage()));

            throw new Exception($"Compilation failed:\n{errors}");
        }

        ms.Seek(0, SeekOrigin.Begin);
        return AssemblyLoadContext.Default.LoadFromStream(ms);
    }

    public static MinimactComponent CreateInstance(Assembly assembly)
    {
        var componentType = assembly.GetTypes()
            .FirstOrDefault(t => t.IsSubclassOf(typeof(MinimactComponent)));

        if (componentType == null)
        {
            throw new Exception("No MinimactComponent found in assembly");
        }

        return (MinimactComponent)Activator.CreateInstance(componentType)!;
    }
}
```

#### 3.4 Integrate Rust Prediction Engine

**src-tauri/src/predictor.rs:**
```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
pub struct TemplateMetadata {
    pub templates: HashMap<String, Template>,
    pub path_variants: HashMap<String, Vec<usize>>,
}

#[derive(Serialize, Deserialize)]
pub struct Template {
    pub template: String,
    pub bindings: Vec<String>,
    pub slots: Option<Vec<usize>>,
    pub conditional_templates: Option<HashMap<String, String>>,
}

pub fn generate_predictions(
    vnode: serde_json::Value,
    templates: TemplateMetadata
) -> HashMap<String, Vec<serde_json::Value>> {
    // Call minimact-rust-reconciler prediction engine
    // (This integrates with existing Rust reconciler)

    let mut predictions = HashMap::new();

    // For each template, generate predicted patches
    for (key, template) in templates.templates {
        let patches = predict_patches_for_template(&template, &vnode);
        predictions.insert(key, patches);
    }

    predictions
}

fn predict_patches_for_template(
    template: &Template,
    vnode: &serde_json::Value
) -> Vec<serde_json::Value> {
    // Implementation delegated to minimact-rust-reconciler
    vec![]
}
```

#### 3.5 Wire Up Full Pipeline

**src/core/render-pipeline.ts:**
```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { loadFromGitHub } from './github-loader';
import { compileLocalTsx } from './local-loader';

export interface RenderResult {
  html: string;
  predictions: any;
  templates: any;
}

export async function renderGhUrl(url: string): Promise<RenderResult> {
  // 1. Load from GitHub
  const files = await loadFromGitHub(url);

  // 2. Compile all TSX files
  const compiled = new Map<string, any>();
  for (const [path, content] of files) {
    const result = await compileTsxSource(content, path);
    compiled.set(path, result);
  }

  // 3. Get entry component
  const entryPath = extractEntryPath(url);
  const entry = compiled.get(entryPath);

  if (!entry) {
    throw new Error(`Entry component not found: ${entryPath}`);
  }

  // 4. Render via .NET runtime
  const rendered = await invoke<RenderResult>('render_component', {
    request: {
      csharp: entry.csharp,
      templates: entry.templates,
      initialState: {}
    }
  });

  return rendered;
}

async function compileTsxSource(source: string, filename: string): Promise<any> {
  // Use Babel to compile (similar to Phase 1)
  const result = transformSync(source, {
    filename,
    presets: ['@babel/preset-typescript', '@babel/preset-react'],
    plugins: [[minimactPlugin, { generateKeys: true, extractTemplates: true }]]
  });

  return {
    csharp: result.metadata.csharp,
    templates: result.metadata.templates,
    keys: result.metadata.keys
  };
}
```

### Success Criteria

- ✅ TSX files are compiled to C# via Babel
- ✅ C# is compiled dynamically via Roslyn
- ✅ Component is executed and VNode tree generated
- ✅ Templates are extracted and predictions generated
- ✅ HTML is rendered and returned to client
- ✅ Predictions are cached for instant interactions

---

## Phase 4: Routing Engine

### 🎯 Goal

Support folder-based routing with clean URLs (`gh://user/repo@main/about`).

### Tasks

#### 4.1 Route Mapping

**src/core/router.ts:**
```typescript
export interface Route {
  pattern: string;
  filePath: string;
  exact?: boolean;
}

export class Router {
  private routes: Route[] = [];

  addRoute(pattern: string, filePath: string, exact = false) {
    this.routes.push({ pattern, filePath, exact });
  }

  match(pathname: string): string | null {
    for (const route of this.routes) {
      if (route.exact && route.pattern === pathname) {
        return route.filePath;
      }

      if (pathname.startsWith(route.pattern)) {
        return route.filePath;
      }
    }

    return null;
  }

  static fromMinimactConfig(config: any): Router {
    const router = new Router();

    // Default convention: /about → pages/about.tsx
    router.addRoute('/', 'pages/index.tsx', true);
    router.addRoute('/about', 'pages/about.tsx', true);
    router.addRoute('/blog', 'pages/blog/index.tsx', true);

    // Dynamic routes from config
    if (config.routes) {
      for (const [pattern, file] of Object.entries(config.routes)) {
        router.addRoute(pattern, file as string);
      }
    }

    return router;
  }
}
```

#### 4.2 Browser History Integration

**src/components/Navigator.tsx:**
```typescript
import { useEffect, useState } from 'react';
import { renderGhUrl } from '../core/render-pipeline';

export function Navigator() {
  const [currentUrl, setCurrentUrl] = useState('gh://minimact/docs');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigate(currentUrl);
  }, [currentUrl]);

  async function navigate(url: string) {
    setLoading(true);

    try {
      const result = await renderGhUrl(url);
      setHtml(result.html);

      // Update browser history
      window.history.pushState({ url }, '', `#${url}`);
    } catch (err) {
      console.error('Navigation failed:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle back/forward
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.url) {
        setCurrentUrl(e.state.url);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div>
      <AddressBar value={currentUrl} onChange={setCurrentUrl} />
      {loading ? <LoadingSpinner /> : <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
```

#### 4.3 Link Interception

**src/core/link-interceptor.ts:**
```typescript
export function interceptLinks(container: HTMLElement, onNavigate: (url: string) => void) {
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Find closest <a> tag
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Internal link?
    if (href.startsWith('/')) {
      e.preventDefault();

      // Get current gh:// base
      const currentUrl = getCurrentGhUrl();
      const newUrl = buildAbsoluteUrl(currentUrl, href);

      onNavigate(newUrl);
    }

    // External gh:// link?
    if (href.startsWith('gh://')) {
      e.preventDefault();
      onNavigate(href);
    }
  });
}

function buildAbsoluteUrl(base: string, relative: string): string {
  const parsed = parseGhUrl(base);
  if (!parsed) return relative;

  return buildGhUrl({
    ...parsed,
    path: relative
  });
}
```

### Success Criteria

- ✅ `/about` → `pages/about.tsx`
- ✅ `/blog` → `pages/blog/index.tsx`
- ✅ Internal links (`<a href="/about">`) are intercepted
- ✅ Browser back/forward buttons work
- ✅ URL updates in address bar

---

## Phase 5: UI Shell

### 🎯 Goal

Wrap Cactus in a native browser UX.

### Tasks

#### 5.1 Browser Chrome

**src/components/BrowserChrome.tsx:**
```typescript
export function BrowserChrome() {
  const [url, setUrl] = useState('gh://minimact/docs');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  return (
    <div className="browser-chrome">
      <div className="navigation-bar">
        <button onClick={goBack} disabled={!canGoBack}>←</button>
        <button onClick={goForward} disabled={!canGoForward}>→</button>
        <button onClick={reload}>⟳</button>
      </div>

      <div className="address-bar">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && navigate(url)}
          placeholder="gh://user/repo/path"
        />
        <button onClick={() => navigate(url)}>Go</button>
      </div>

      <div className="site-viewer">
        <Navigator url={url} />
      </div>
    </div>
  );
}
```

#### 5.2 Error Overlay

**src/components/ErrorOverlay.tsx:**
```typescript
export function ErrorOverlay({ error }: { error: Error }) {
  return (
    <div className="error-overlay">
      <h1>🌵 Oops! Something went wrong</h1>
      <h2>{error.message}</h2>
      <pre>{error.stack}</pre>

      <div className="error-actions">
        <button onClick={() => window.location.reload()}>Reload Page</button>
        <button onClick={() => navigator.clipboard.writeText(error.stack || '')}>
          Copy Error
        </button>
      </div>
    </div>
  );
}
```

#### 5.3 Loading States

**src/components/LoadingSpinner.tsx:**
```typescript
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="loading-spinner">
      <div className="spinner-icon">🌵</div>
      <p>{message}</p>
    </div>
  );
}
```

### Success Criteria

- ✅ Address bar accepts `gh://` URLs
- ✅ Back/Forward/Reload buttons work
- ✅ Loading spinner shows during fetch/compile
- ✅ Error overlay shows on failures
- ✅ Professional browser-like UX

---

## Phase 6: Caching, Offline, Patching

### 🎯 Goal

Make sites **offline-capable** and blazingly fast.

### Tasks

#### 6.1 Compilation Cache

**src/core/compilation-cache.ts:**
```typescript
export interface CachedCompilation {
  csharp: string;
  templates: any;
  keys: any;
  sha: string;          // Git SHA for invalidation
  compiledAt: number;
}

export class CompilationCache {
  async get(url: string, sha: string): Promise<CachedCompilation | null> {
    const key = `compilation:${url}`;
    const cached = localStorage.getItem(key);

    if (!cached) return null;

    const parsed = JSON.parse(cached);

    // Invalidate if SHA changed
    if (parsed.sha !== sha) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed;
  }

  async set(url: string, compilation: CachedCompilation): Promise<void> {
    const key = `compilation:${url}`;
    localStorage.setItem(key, JSON.stringify(compilation));
  }
}
```

#### 6.2 Prediction Cache

**src/core/prediction-cache.ts:**
```typescript
export interface CachedPrediction {
  predictions: any;
  templates: any;
  sha: string;
}

export class PredictionCache {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('cactus-predictions', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        db.createObjectStore('predictions', { keyPath: 'url' });
      };
    });
  }

  async get(url: string): Promise<CachedPrediction | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('predictions', 'readonly');
      const store = tx.objectStore('predictions');
      const request = store.get(url);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async set(url: string, prediction: CachedPrediction): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('predictions', 'readwrite');
      const store = tx.objectStore('predictions');
      const request = store.put({ url, ...prediction });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
```

#### 6.3 Offline Detection

**src/core/offline-handler.ts:**
```typescript
export class OfflineHandler {
  private isOnline = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌵 Back online!');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.warn('🌵 Offline mode activated');
    });
  }

  canFetchRemote(): boolean {
    return this.isOnline;
  }

  async fetchWithFallback<T>(
    fetcher: () => Promise<T>,
    fallback: () => Promise<T | null>
  ): Promise<T> {
    if (!this.isOnline) {
      const cached = await fallback();
      if (cached) return cached;
      throw new Error('No cached data available offline');
    }

    try {
      return await fetcher();
    } catch (err) {
      console.warn('Fetch failed, trying cache:', err);
      const cached = await fallback();
      if (cached) return cached;
      throw err;
    }
  }
}
```

### Success Criteria

- ✅ Compiled components cached locally
- ✅ Predictions cached in IndexedDB
- ✅ Sites work offline after first visit
- ✅ Cache invalidation on SHA change
- ✅ Graceful fallback to cache when offline

---

## Phase 7: PostWeb Index Integration

### 🎯 Goal

Load site registry from `gh://postweb/index`.

### Tasks

#### 7.1 Index Page

**src/pages/IndexPage.tsx:**
```typescript
import { useEffect, useState } from 'react';
import { loadFromGitHub } from '../core/github-loader';

export function IndexPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIndex();
  }, []);

  async function loadIndex() {
    try {
      // Load sites.json from postweb/index
      const files = await loadFromGitHub('gh://postweb/index/sites.json');
      const sitesJson = files.get('/sites.json');

      if (sitesJson) {
        const parsed = JSON.parse(sitesJson);
        setSites(parsed);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load index:', err);
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading PostWeb Index..." />;
  }

  return (
    <div className="index-page">
      <h1>🌵 PostWeb Index</h1>
      <p>Discover {sites.length} TSX-native websites</p>

      <div className="site-grid">
        {sites.map(site => (
          <SiteCard key={site.repo} site={site} />
        ))}
      </div>
    </div>
  );
}

function SiteCard({ site }: { site: any }) {
  return (
    <div className="site-card">
      <h3>{site.name}</h3>
      <p>{site.description}</p>
      <div className="site-meta">
        <span>⭐ {site.stars}</span>
        <span>By @{site.author}</span>
      </div>
      <div className="site-actions">
        <a href={site.repo}>Visit Site</a>
        <button onClick={() => forkSite(site.repo)}>Fork</button>
      </div>
    </div>
  );
}
```

#### 7.2 Tag Filtering

**src/pages/TagPage.tsx:**
```typescript
export function TagPage({ tag }: { tag: string }) {
  const [sites, setSites] = useState<any[]>([]);

  useEffect(() => {
    loadSitesByTag(tag);
  }, [tag]);

  async function loadSitesByTag(tag: string) {
    // Load from gh://postweb/index/tags/{tag}.json
    const files = await loadFromGitHub(`gh://postweb/index/tags/${tag}.json`);
    const tagJson = files.get(`/tags/${tag}.json`);

    if (tagJson) {
      setSites(JSON.parse(tagJson));
    }
  }

  return (
    <div>
      <h1>Sites tagged: {tag}</h1>
      <div className="site-grid">
        {sites.map(site => <SiteCard key={site.repo} site={site} />)}
      </div>
    </div>
  );
}
```

### Success Criteria

- ✅ `gh://index` loads PostWeb Index
- ✅ Shows all registered sites
- ✅ Tag filtering works
- ✅ "Visit Site" opens site in browser
- ✅ Search/filter functionality

---

## Phase 8+: Advanced Features

### Roadmap

**Phase 8: Developer Tools**
- Component inspector (see VNode tree)
- Template debugger (cache hit/miss rates)
- Performance profiler (render timing)
- Network inspector (GitHub API calls)

**Phase 9: Monaco Editor Integration**
- Built-in TSX editor
- Live preview as you type
- Commit to GitHub from browser
- Fork & edit workflow

**Phase 10: GitHub Authentication**
- OAuth flow for private repos
- Personal Access Token support
- Rate limit monitoring
- Organization repo access

**Phase 11: Real-Time Updates**
- WebSocket connection to GitHub
- Live updates when repo changes
- Collaborative editing
- Presence indicators

**Phase 12: Component Marketplace**
- Browse component libraries
- One-click install (add as git submodule)
- Version management
- Dependency resolution

---

## Directory Structure

```
cactus-browser/
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component
│   │
│   ├── components/               # UI components
│   │   ├── BrowserChrome.tsx
│   │   ├── AddressBar.tsx
│   │   ├── Navigator.tsx
│   │   ├── SiteViewer.tsx
│   │   ├── Explorer.tsx
│   │   ├── ErrorOverlay.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   ├── pages/                    # Built-in pages
│   │   ├── IndexPage.tsx         # gh://index
│   │   ├── TagPage.tsx           # gh://index/tag/blog
│   │   └── SettingsPage.tsx
│   │
│   ├── core/                     # Core logic
│   │   ├── gh-protocol.ts        # gh:// parser
│   │   ├── github-client.ts      # GitHub API
│   │   ├── github-loader.ts      # Fetch from GitHub
│   │   ├── local-loader.ts       # Load local .tsx
│   │   ├── import-resolver.ts    # Resolve imports
│   │   ├── file-cache.ts         # File caching
│   │   ├── compilation-cache.ts  # Compilation cache
│   │   ├── prediction-cache.ts   # Prediction cache
│   │   ├── render-pipeline.ts    # Full render flow
│   │   ├── router.ts             # Route mapping
│   │   ├── link-interceptor.ts   # Link handling
│   │   ├── offline-handler.ts    # Offline mode
│   │   └── minimact-runtime.ts   # Minimact glue
│   │
│   └── styles/                   # CSS
│       └── app.css
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri entry
│   │   ├── commands.rs           # Tauri commands
│   │   ├── dotnet.rs             # .NET integration
│   │   ├── predictor.rs          # Rust prediction engine
│   │   └── cache.rs              # File system cache
│   │
│   ├── Cargo.toml
│   └── tauri.conf.json           # Tauri config
│
├── minimact-runtime/             # .NET runtime
│   ├── Program.cs
│   ├── DynamicCompiler.cs
│   ├── VNodeSerializer.cs
│   ├── PredictionEngine.cs
│   └── minimact-runtime.csproj
│
├── test-pages/                   # Test TSX files
│   ├── index.tsx
│   ├── about.tsx
│   └── components/
│       └── Button.tsx
│
├── public/                       # Static assets
│   └── index.html
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Getting Started

### Prerequisites

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js 18+
nvm install 18 && nvm use 18

# .NET 8.0
# Download from: https://dotnet.microsoft.com/download

# pnpm (optional but recommended)
npm install -g pnpm
```

### Initialize Project

```bash
# Create Tauri app
npm create tauri-app cactus-browser
cd cactus-browser

# Install dependencies
pnpm install

# Add Minimact
pnpm add @minimact/core @minimact/babel-plugin-tsx

# Add development dependencies
pnpm add -D @babel/core @babel/preset-typescript @babel/preset-react
pnpm add -D typescript @types/react @types/react-dom
pnpm add -D @octokit/rest

# Initialize .NET runtime project
cd minimact-runtime
dotnet new console
dotnet add package Microsoft.CodeAnalysis.CSharp
dotnet add package Minimact.AspNetCore
cd ..
```

### Run Development Server

```bash
# Terminal 1: Start Tauri
pnpm tauri dev

# Terminal 2: Build .NET runtime
cd minimact-runtime
dotnet build --watch
```

### Build for Production

```bash
# Build all
pnpm tauri build

# Output:
#   Windows: target/release/cactus-browser.exe
#   macOS:   target/release/bundle/macos/Cactus Browser.app
#   Linux:   target/release/cactus-browser
```

---

## Testing Strategy

### Unit Tests

**src/core/gh-protocol.test.ts:**
```typescript
import { parseGhUrl, buildGhUrl } from './gh-protocol';

describe('gh:// protocol', () => {
  test('parses simple URL', () => {
    expect(parseGhUrl('gh://minimact/docs')).toEqual({
      user: 'minimact',
      repo: 'docs',
      ref: 'main',
      path: '/pages/index.tsx',
      fragment: undefined
    });
  });

  test('parses URL with branch', () => {
    expect(parseGhUrl('gh://you/blog@dev')).toEqual({
      user: 'you',
      repo: 'blog',
      ref: 'dev',
      path: '/pages/index.tsx',
      fragment: undefined
    });
  });

  test('parses URL with path', () => {
    expect(parseGhUrl('gh://you/site/about.tsx')).toEqual({
      user: 'you',
      repo: 'site',
      ref: 'main',
      path: '/about.tsx',
      fragment: undefined
    });
  });
});
```

### Integration Tests

**tests/github-loader.test.ts:**
```typescript
import { loadFromGitHub } from '../src/core/github-loader';

describe('GitHub loader', () => {
  test('loads real repo', async () => {
    const files = await loadFromGitHub('gh://minimact/docs/pages/index.tsx');

    expect(files.size).toBeGreaterThan(0);
    expect(files.has('/pages/index.tsx')).toBe(true);
  });

  test('handles 404', async () => {
    await expect(
      loadFromGitHub('gh://nonexistent/repo')
    ).rejects.toThrow('not found');
  });
});
```

### E2E Tests

**e2e/navigation.spec.ts (Playwright):**
```typescript
import { test, expect } from '@playwright/test';

test('navigate to site', async ({ page }) => {
  await page.goto('http://localhost:1420');

  // Enter gh:// URL
  await page.fill('input[placeholder*="gh://"]', 'gh://minimact/docs');
  await page.press('input[placeholder*="gh://"]', 'Enter');

  // Wait for render
  await page.waitForSelector('h1');

  // Verify content
  expect(await page.textContent('h1')).toContain('Minimact');
});
```

---

## Deployment & Distribution

### GitHub Releases

**.github/workflows/release.yml:**
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    strategy:
      matrix:
        platform: [windows-latest, macos-latest, ubuntu-latest]

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm tauri build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: cactus-browser-${{ matrix.platform }}
          path: src-tauri/target/release/bundle/
```

### Auto-Update

**src-tauri/tauri.conf.json:**
```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/minimact/cactus-browser/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

### Distribution Channels

1. **GitHub Releases** - Primary distribution
2. **Homebrew** (macOS) - `brew install cactus-browser`
3. **Chocolatey** (Windows) - `choco install cactus-browser`
4. **Snap** (Linux) - `snap install cactus-browser`
5. **AUR** (Arch Linux) - `yay -S cactus-browser`

---

## Success Metrics

### MVP (Phase 1-3)

- ✅ Load local `.tsx` file
- ✅ Compile to C# and render
- ✅ Display in Tauri window
- ✅ No crashes

### Alpha (Phase 4-5)

- ✅ Load from GitHub (`gh://` URLs)
- ✅ Routing works
- ✅ Browser UI functional
- ✅ Can navigate between pages

### Beta (Phase 6-7)

- ✅ Offline mode works
- ✅ Predictions cached
- ✅ PostWeb Index accessible
- ✅ Performance: <100ms TTI

### v1.0 (Phase 8+)

- ✅ Developer tools included
- ✅ Monaco editor integrated
- ✅ GitHub auth works
- ✅ 1000+ sites in index
- ✅ Community adoption

---

## Next Steps

### Immediate (Week 1)

```bash
# 1. Initialize project
npm create tauri-app cactus-browser

# 2. Set up dependencies
cd cactus-browser
pnpm add @minimact/core

# 3. Create test component
mkdir test-pages
vim test-pages/index.tsx

# 4. Implement local loader
vim src/core/local-loader.ts

# 5. Run it!
pnpm tauri dev
```

### Short-term (Month 1)

- Complete Phase 1-3
- Load from GitHub
- Basic rendering works
- Share demo video

### Mid-term (Quarter 1)

- Complete Phase 4-7
- PostWeb Index integration
- Offline mode
- Beta release

### Long-term (Year 1)

- Complete Phase 8+
- Developer tools
- Component marketplace
- v1.0 release
- 10,000+ users

---

## Resources

### Documentation

- [Minimact Docs](../MINIMACT_COMPLETE_ARCHITECTURE.md)
- [PostWeb Index](../cactus/POSTWEB_INDEX_README.md)
- [Tauri Docs](https://tauri.app/v1/guides/)
- [Octokit Docs](https://octokit.github.io/rest.js/)

### Reference Implementations

- `minimact-swig` - Electron IDE (similar architecture)
- `babel-plugin-minimact` - TSX → C# compiler
- `minimact-rust-reconciler` - Prediction engine

### Community

- **Discord**: [discord.gg/posthydration](https://discord.gg/posthydration)
- **GitHub**: [github.com/minimact/cactus-browser](https://github.com/minimact/cactus-browser)
- **Twitter**: [@CactusBrowser](https://twitter.com/CactusBrowser)

---

<p align="center">
  <strong>Let's build the Posthydrationist Web! 🌵</strong>
</p>

<p align="center">
  The cactus doesn't hydrate — it stores.
</p>

<p align="center">
  🚀 Ready to launch? Run <code>npm create tauri-app</code> and let's go!
</p>
