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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const HookExampleGenerator_1 = require("./HookExampleGenerator");
/**
 * ProjectManager - Manages Minimact project lifecycle
 *
 * Responsibilities:
 * - Create new projects from templates
 * - Load existing projects
 * - Scan project files
 * - Detect port configuration
 * - Track recent projects
 * - Generate hook examples
 */
class ProjectManager {
    constructor(userDataPath) {
        this.recentProjectsPath = path.join(userDataPath, 'recent-projects.json');
        this.hookExampleGenerator = new HookExampleGenerator_1.HookExampleGenerator();
    }
    /**
     * Create a new Minimact project from template
     */
    async createProject(projectPath, template, options) {
        const projectName = path.basename(projectPath);
        // Ensure directory exists
        await fs.mkdir(projectPath, { recursive: true });
        // Create project structure based on template
        await this.createProjectStructure(projectPath, projectName, template, options?.enableTailwind || false);
        // Create Visual Studio solution file if requested (default: true)
        if (options?.createSolution !== false) {
            await this.createSolutionFile(projectPath, projectName);
        }
        // Setup Tailwind CSS if requested
        if (options?.enableTailwind) {
            await this.setupTailwindCss(projectPath, projectName);
        }
        // Generate hook examples if hooks selected
        if (options?.selectedHooks && options.selectedHooks.length > 0) {
            await this.hookExampleGenerator.generateHookExamples(projectPath, options.selectedHooks);
        }
        // Detect port from launchSettings.json
        const port = await this.detectPort(projectPath);
        const project = {
            name: projectName,
            path: projectPath,
            port,
            template,
            createdAt: new Date(),
            lastOpened: new Date()
        };
        // Add to recent projects
        await this.addToRecentProjects(project);
        return project;
    }
    /**
     * Load an existing Minimact project
     */
    async loadProject(projectPath) {
        const projectName = path.basename(projectPath);
        // Verify project exists
        const exists = await fs.access(projectPath).then(() => true).catch(() => false);
        if (!exists) {
            throw new Error(`Project not found: ${projectPath}`);
        }
        // Detect port
        const port = await this.detectPort(projectPath);
        const project = {
            name: projectName,
            path: projectPath,
            port,
            template: 'Unknown',
            createdAt: new Date(),
            lastOpened: new Date()
        };
        // Update recent projects
        await this.addToRecentProjects(project);
        return project;
    }
    /**
     * Get list of recent projects
     */
    async getRecentProjects() {
        try {
            const data = await fs.readFile(this.recentProjectsPath, 'utf-8');
            return JSON.parse(stripBom(data));
        }
        catch {
            return [];
        }
    }
    /**
     * Scan project files (TSX, C#, etc.)
     */
    async scanProjectFiles(projectPath) {
        async function scanDirectory(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const items = [];
            // Separate directories and files for sorting
            const directories = [];
            const files = [];
            for (const entry of entries) {
                // Skip excluded directories
                if (entry.isDirectory()) {
                    if (!['node_modules', 'bin', 'obj', '.git', 'dist', 'out', '.vs'].includes(entry.name)) {
                        directories.push(entry);
                    }
                }
                else {
                    files.push(entry);
                }
            }
            // Sort alphabetically
            directories.sort((a, b) => a.name.localeCompare(b.name));
            files.sort((a, b) => a.name.localeCompare(b.name));
            // Process directories first (recursive)
            for (const entry of directories) {
                const fullPath = path.join(dir, entry.name);
                const children = await scanDirectory(fullPath);
                // Only include directories that have children
                if (children.length > 0) {
                    items.push({
                        path: fullPath,
                        name: entry.name,
                        type: 'directory',
                        children
                    });
                }
            }
            // Process files
            for (const entry of files) {
                const fullPath = path.join(dir, entry.name);
                const ext = path.extname(entry.name).toLowerCase();
                const kind = getFileKind(ext);
                const extension = ext.startsWith('.') ? ext.slice(1) : ext;
                // Include all files (not just specific kinds) for better visibility
                items.push({
                    path: fullPath,
                    name: entry.name,
                    extension,
                    type: 'file',
                    kind
                });
            }
            return items;
        }
        return await scanDirectory(projectPath);
    }
    /**
     * Detect port from launchSettings.json
     */
    async detectPort(projectPath) {
        try {
            const launchSettingsPath = path.join(projectPath, 'Properties', 'launchSettings.json');
            const data = await fs.readFile(launchSettingsPath, 'utf-8');
            const launchSettings = JSON.parse(stripBom(data));
            // Extract port from applicationUrl
            const profile = Object.values(launchSettings.profiles)[0];
            if (profile?.applicationUrl) {
                const match = profile.applicationUrl.match(/:(\d+)/);
                if (match) {
                    return parseInt(match[1], 10);
                }
            }
        }
        catch {
            // Default to 5000 if not found
        }
        return 5000;
    }
    /**
     * Add project to recent projects list
     */
    async addToRecentProjects(project) {
        let recentProjects = await this.getRecentProjects();
        // Remove existing entry if present
        recentProjects = recentProjects.filter(p => p.path !== project.path);
        // Add to front
        recentProjects.unshift({
            name: project.name,
            path: project.path,
            lastOpened: project.lastOpened
        });
        // Keep only last 10
        recentProjects = recentProjects.slice(0, 10);
        // Save
        await fs.writeFile(this.recentProjectsPath, JSON.stringify(recentProjects, null, 2), 'utf-8');
    }
    /**
     * Create project structure based on template
     */
    async createProjectStructure(projectPath, projectName, template, enableTailwind = false) {
        const { execa } = await Promise.resolve().then(() => __importStar(require('execa')));
        // 1. Create ASP.NET Core web app using dotnet CLI
        await execa('dotnet', ['new', 'webapi', '-n', projectName, '-o', projectPath], {
            cwd: path.dirname(projectPath)
        });
        // 2. Add Minimact.AspNetCore package
        await execa('dotnet', ['add', 'package', 'Minimact.AspNetCore'], {
            cwd: projectPath
        });
        // 2b. Add chart and powered packages for Dashboard templates
        if (template === 'Dashboard' || template === 'MVC-Dashboard') {
            await execa('dotnet', ['add', 'package', 'Minimact.Charts'], {
                cwd: projectPath
            });
            await execa('dotnet', ['add', 'package', 'Minimact.Powered'], {
                cwd: projectPath
            });
            console.log('[ProjectManager] Added Minimact.Charts and Minimact.Powered packages');
        }
        // 2c. Add charts package for Electron File Manager
        if (template === 'Electron-FileManager') {
            await execa('dotnet', ['add', 'package', 'Minimact.Charts'], {
                cwd: projectPath
            });
            console.log('[ProjectManager] Added Minimact.Charts package for Electron File Manager');
        }
        // 3. Create Minimact directories
        await fs.mkdir(path.join(projectPath, 'Pages'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'Components'), { recursive: true });
        // 4. Replace Program.cs with Minimact setup (all templates now use MVC routing)
        const programCs = this.getMvcProgramCs();
        await fs.writeFile(path.join(projectPath, 'Program.cs'), programCs, 'utf-8');
        // 5. Update launchSettings.json to use port 5000 and configure browser launching
        const launchSettingsPath = path.join(projectPath, 'Properties', 'launchSettings.json');
        const launchSettings = JSON.parse(stripBom(await fs.readFile(launchSettingsPath, 'utf-8')));
        // Update all profiles
        for (const profileName of Object.keys(launchSettings.profiles)) {
            const profile = launchSettings.profiles[profileName];
            // Enable browser launching
            profile.launchBrowser = true;
            // Set launch URL based on template (all templates now use MVC routing)
            if (template === 'MVC') {
                profile.launchUrl = 'Products/1';
                // Keep default ports for MVC (HTTPS: 7038, HTTP: 5035)
            }
            else if (template === 'MVC-Dashboard') {
                profile.launchUrl = 'Dashboard';
                // Keep default ports for MVC (HTTPS: 7038, HTTP: 5035)
            }
            else if (template === 'Counter' || template === 'TodoList' || template === 'Dashboard') {
                // Simple templates use port 5000 and root URL
                profile.applicationUrl = 'http://localhost:5000';
                profile.launchUrl = '';
            }
            else if (template === 'Electron-FileManager') {
                profile.applicationUrl = 'http://localhost:5000';
            }
        }
        await fs.writeFile(launchSettingsPath, JSON.stringify(launchSettings, null, 2), 'utf-8');
        // 6. Create template-specific files
        if (template === 'Counter') {
            await this.createCounterTemplate(projectPath);
        }
        else if (template === 'TodoList') {
            await this.createTodoListTemplate(projectPath);
        }
        else if (template === 'Dashboard') {
            await this.createDashboardTemplate(projectPath);
        }
        else if (template === 'MVC') {
            await this.createMvcTemplate(projectPath, enableTailwind);
        }
        else if (template === 'MVC-Dashboard') {
            await this.createMvcDashboardTemplate(projectPath);
        }
        else if (template === 'Electron-FileManager') {
            await this.createElectronFileManagerTemplate(projectPath, projectName);
        }
    }
    /**
     * Get MVC-based Program.cs (now used for all templates)
     */
    getMvcProgramCs() {
        return `using Minimact.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge(); // Enable MVC Bridge

// Add MVC services
builder.Services.AddControllersWithViews();

// Add SignalR (required for Minimact real-time communication)
builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();

app.MapControllers();
app.MapHub<Minimact.AspNetCore.SignalR.MinimactHub>("/minimact");

app.Run();
`;
    }
    /**
     * Create Counter template files (MVC-based)
     */
    async createCounterTemplate(projectPath) {
        // Create directory structure
        await fs.mkdir(path.join(projectPath, 'Controllers'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'wwwroot'), { recursive: true });
        // Create HomeController.cs
        const homeControllerCs = `using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

namespace ${path.basename(projectPath)}.Controllers;

[ApiController]
[Route("")]
public class HomeController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public HomeController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        return await _renderer.RenderPage<Minimact.Components.CounterPage>(
            pageTitle: "Counter - Minimact"
        );
    }
}
`;
        await fs.writeFile(path.join(projectPath, 'Controllers', 'HomeController.cs'), homeControllerCs, 'utf-8');
        // Create Pages/CounterPage.tsx
        const counterPageTsx = `import { useState } from '@minimact/core';

export function CounterPage() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
        Increment
      </button>
    </div>
  );
}
`;
        await fs.writeFile(path.join(projectPath, 'Pages', 'CounterPage.tsx'), counterPageTsx, 'utf-8');
        // Copy Minimact client runtime to wwwroot/js
        await this.copyClientRuntimeToProject(projectPath);
    }
    /**
     * Create TodoList template files (MVC-based)
     */
    async createTodoListTemplate(projectPath) {
        // Create directory structure
        await fs.mkdir(path.join(projectPath, 'Controllers'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'wwwroot'), { recursive: true });
        // Create HomeController.cs
        const homeControllerCs = `using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

namespace ${path.basename(projectPath)}.Controllers;

[ApiController]
[Route("")]
public class HomeController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public HomeController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        return await _renderer.RenderPage<Minimact.Components.TodoListPage>(
            pageTitle: "Todo List - Minimact"
        );
    }
}
`;
        await fs.writeFile(path.join(projectPath, 'Controllers', 'HomeController.cs'), homeControllerCs, 'utf-8');
        // Create Pages/TodoListPage.tsx
        const todoListPageTsx = `import { useState } from '@minimact/core';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export function TodoListPage() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn Minimact', done: false },
    { id: 2, text: 'Build an app', done: false }
  ]);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, { id: Date.now(), text: newTodo, done: false }]);
      setNewTodo('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Todo List</h1>

      {/* Add Todo Form */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="What needs to be done?"
          style={{ flex: 1, padding: '8px', fontSize: '16px' }}
        />
        <button onClick={addTodo} style={{ padding: '8px 16px' }}>
          Add
        </button>
      </div>

      {/* Todo List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {todos.map(todo => (
          <div
            key={todo.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: todo.done ? '#f0f0f0' : 'white'
            }}
          >
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
            />
            <span
              style={{
                flex: 1,
                textDecoration: todo.done ? 'line-through' : 'none',
                color: todo.done ? '#999' : '#000'
              }}
            >
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              style={{ padding: '4px 8px', fontSize: '12px' }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
        {todos.filter(t => !t.done).length} of {todos.length} tasks remaining
      </div>
    </div>
  );
}
`;
        await fs.writeFile(path.join(projectPath, 'Pages', 'TodoListPage.tsx'), todoListPageTsx, 'utf-8');
        // Copy Minimact client runtime to wwwroot/js
        await this.copyClientRuntimeToProject(projectPath);
    }
    /**
     * Create Dashboard template files (MVC-based)
     */
    async createDashboardTemplate(projectPath) {
        // Create directory structure
        await fs.mkdir(path.join(projectPath, 'Controllers'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'wwwroot'), { recursive: true });
        // Create HomeController.cs
        const homeControllerCs = `using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

namespace ${path.basename(projectPath)}.Controllers;

[ApiController]
[Route("")]
public class HomeController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public HomeController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        return await _renderer.RenderPage<Minimact.Components.DashboardPage>(
            pageTitle: "Dashboard - Minimact"
        );
    }
}
`;
        await fs.writeFile(path.join(projectPath, 'Controllers', 'HomeController.cs'), homeControllerCs, 'utf-8');
        // Create Pages/DashboardPage.tsx with enhanced charts
        const dashboardPageTsx = `import { useState } from '@minimact/core';
import type { DataPoint } from '@minimact/charts';

interface MetricData {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

export function DashboardPage() {
  // Time range selector
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Sales data for bar chart (changes based on time range)
  const [salesData] = useState<DataPoint[]>([
    { category: 'Jan', value: 4500 },
    { category: 'Feb', value: 6200 },
    { category: 'Mar', value: 5800 },
    { category: 'Apr', value: 7100 },
    { category: 'May', value: 8900 },
    { category: 'Jun', value: 9400 }
  ]);

  // Revenue trend data (for line chart)
  const [revenueData] = useState<DataPoint[]>([
    { category: 'Week 1', value: 12500 },
    { category: 'Week 2', value: 15200 },
    { category: 'Week 3', value: 14800 },
    { category: 'Week 4', value: 18300 }
  ]);

  // Product mix data (for pie chart)
  const [productMixData] = useState<DataPoint[]>([
    { category: 'Electronics', value: 45, fill: '#4CAF50' },
    { category: 'Clothing', value: 25, fill: '#2196F3' },
    { category: 'Food', value: 20, fill: '#FF9800' },
    { category: 'Other', value: 10, fill: '#9C27B0' }
  ]);

  // Quarterly growth data (for area chart)
  const [growthData] = useState<DataPoint[]>([
    { category: 'Q1', value: 45000 },
    { category: 'Q2', value: 52000 },
    { category: 'Q3', value: 48000 },
    { category: 'Q4', value: 61000 }
  ]);

  // Metrics cards
  const [metrics] = useState<MetricData[]>([
    { label: 'Total Sales', value: '$124,532', change: '+12.5%', positive: true },
    { label: 'Active Users', value: '8,429', change: '+8.2%', positive: true },
    { label: 'Conversion Rate', value: '3.24%', change: '-0.5%', positive: false },
    { label: 'Avg. Order Value', value: '$89.50', change: '+5.1%', positive: true }
  ]);

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header with Time Range Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ fontSize: '32px', margin: 0 }}>📊 Sales Dashboard</h1>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setTimeRange('week')}
            style={{
              padding: '8px 16px',
              border: timeRange === 'week' ? '2px solid #4CAF50' : '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontWeight: timeRange === 'week' ? '600' : '400'
            }}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            style={{
              padding: '8px 16px',
              border: timeRange === 'month' ? '2px solid #4CAF50' : '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontWeight: timeRange === 'month' ? '600' : '400'
            }}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            style={{
              padding: '8px 16px',
              border: timeRange === 'year' ? '2px solid #4CAF50' : '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontWeight: timeRange === 'year' ? '600' : '400'
            }}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {metrics.map(metric => (
          <div
            key={metric.label}
            style={{
              padding: '24px',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              {metric.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
              {metric.value}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: metric.positive ? '#4CAF50' : '#F44336'
            }}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart - Monthly Sales */}
      <div style={{
        padding: '24px',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        backgroundColor: 'white',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
          📈 Monthly Sales Trend
        </h2>

        <Plugin name="BarChart" state={{
          data: salesData,
          width: 800,
          height: 400,
          margin: { top: 20, right: 30, bottom: 50, left: 60 },
          barFill: '#4CAF50',
          showGrid: true,
          xAxis: { dataKey: 'category', label: 'Month' },
          yAxis: { label: 'Sales ($K)', tickCount: 5 }
        }} />
      </div>

      {/* Two Column Layout: Line Chart + Pie Chart */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '30px',
        marginBottom: '30px'
      }}>
        {/* Line Chart - Revenue Trend */}
        <div style={{
          padding: '24px',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
            📊 Weekly Revenue
          </h2>

          <Plugin name="LineChart" state={{
            data: revenueData,
            width: 450,
            height: 300,
            margin: { top: 20, right: 30, bottom: 50, left: 60 },
            strokeColor: '#2196F3',
            strokeWidth: 3,
            showGrid: true,
            xAxis: { dataKey: 'category' },
            yAxis: { label: 'Revenue ($)', tickCount: 5 }
          }} />
        </div>

        {/* Pie Chart - Product Mix */}
        <div style={{
          padding: '24px',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
            💰 Sales by Category
          </h2>

          <Plugin name="PieChart" state={{
            data: productMixData,
            width: 450,
            height: 300,
            innerRadius: 0,
            outerRadius: 100,
            cx: '50%',
            cy: '50%'
          }} />
        </div>
      </div>

      {/* Area Chart - Quarterly Growth */}
      <div style={{
        padding: '24px',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        backgroundColor: 'white',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
          📈 Quarterly Growth Trend
        </h2>

        <Plugin name="AreaChart" state={{
          data: growthData,
          width: 800,
          height: 300,
          margin: { top: 20, right: 30, bottom: 50, left: 60 },
          fill: 'rgba(76, 175, 80, 0.3)',
          stroke: '#4CAF50',
          strokeWidth: 2,
          showGrid: true,
          xAxis: { dataKey: 'category', label: 'Quarter' },
          yAxis: { label: 'Revenue ($)', tickCount: 5 }
        }} />
      </div>

      {/* Powered Badge */}
      <Plugin name="PoweredBadge" state={{
        position: 'bottom-right',
        expanded: false,
        theme: 'dark',
        linkUrl: 'https://minimact.dev',
        openInNewTab: true
      }} />
    </div>
  );
}
`;
        await fs.writeFile(path.join(projectPath, 'Pages', 'DashboardPage.tsx'), dashboardPageTsx, 'utf-8');
        // Copy Minimact client runtime and plugin packages to wwwroot/js
        await this.copyClientRuntimeToProject(projectPath);
        await this.copyChartPackagesToProject(projectPath);
        await this.copyPoweredPackageToProject(projectPath);
    }
    /**
     * Create MVC Dashboard template files (combines MVC Bridge + Charts)
     */
    async createMvcDashboardTemplate(projectPath) {
        // Create directory structure
        await fs.mkdir(path.join(projectPath, 'Controllers'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'ViewModels'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'wwwroot'), { recursive: true });
        // Create DashboardViewModel.cs with [Mutable] filters
        const dashboardViewModelCs = `using Minimact.AspNetCore.Attributes;

namespace ${path.basename(projectPath)}.ViewModels;

public class DashboardViewModel
{
    // ✅ MUTABLE - User can change filters (instant updates via template patches!)
    [Mutable]
    public string TimeRange { get; set; } = "month"; // "week", "month", "year"

    [Mutable]
    public string Region { get; set; } = "all"; // "all", "north", "south", "east", "west"

    // ❌ IMMUTABLE - Server authority (fetched from database)
    public List<DataPoint> SalesData { get; set; } = new();
    public List<DataPoint> RevenueData { get; set; } = new();
    public List<DataPoint> ProductMixData { get; set; } = new();
    public List<DataPoint> GrowthData { get; set; } = new();
    public MetricData[] Metrics { get; set; } = Array.Empty<MetricData>();
}

public class DataPoint
{
    public string Category { get; set; } = string.Empty;
    public double Value { get; set; }
    public string? Fill { get; set; }
}

public class MetricData
{
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Change { get; set; } = string.Empty;
    public bool Positive { get; set; }
}
`;
        await fs.writeFile(path.join(projectPath, 'ViewModels', 'DashboardViewModel.cs'), dashboardViewModelCs, 'utf-8');
        // Create DashboardController.cs
        const dashboardControllerCs = `using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;
using ${path.basename(projectPath)}.ViewModels;

namespace ${path.basename(projectPath)}.Controllers;

[ApiController]
[Route("[controller]")]
public class DashboardController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public DashboardController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        // 1. Fetch data from database/service (simulated)
        var viewModel = GetDashboardData("month", "all");

        // 2. Render Minimact component with ViewModel
        return await _renderer.RenderPage<Minimact.Components.DashboardPage>(
            viewModel: viewModel,
            pageTitle: "Sales Dashboard",
            options: new MinimactPageRenderOptions
            {
                IncludeMvcExtension = true  // Enable @minimact/mvc
            }
        );
    }

    // Simulated data service - replace with Entity Framework
    private DashboardViewModel GetDashboardData(string timeRange, string region)
    {
        return new DashboardViewModel
        {
            TimeRange = timeRange,
            Region = region,
            SalesData = new List<DataPoint>
            {
                new() { Category = "Jan", Value = 4500 },
                new() { Category = "Feb", Value = 6200 },
                new() { Category = "Mar", Value = 5800 },
                new() { Category = "Apr", Value = 7100 },
                new() { Category = "May", Value = 8900 },
                new() { Category = "Jun", Value = 9400 }
            },
            RevenueData = new List<DataPoint>
            {
                new() { Category = "Week 1", Value = 12500 },
                new() { Category = "Week 2", Value = 15200 },
                new() { Category = "Week 3", Value = 14800 },
                new() { Category = "Week 4", Value = 18300 }
            },
            ProductMixData = new List<DataPoint>
            {
                new() { Category = "Electronics", Value = 45, Fill = "#4CAF50" },
                new() { Category = "Clothing", Value = 25, Fill = "#2196F3" },
                new() { Category = "Food", Value = 20, Fill = "#FF9800" },
                new() { Category = "Other", Value = 10, Fill = "#9C27B0" }
            },
            GrowthData = new List<DataPoint>
            {
                new() { Category = "Q1", Value = 45000 },
                new() { Category = "Q2", Value = 52000 },
                new() { Category = "Q3", Value = 48000 },
                new() { Category = "Q4", Value = 61000 }
            },
            Metrics = new[]
            {
                new MetricData { Label = "Total Sales", Value = "$124,532", Change = "+12.5%", Positive = true },
                new MetricData { Label = "Active Users", Value = "8,429", Change = "+8.2%", Positive = true },
                new MetricData { Label = "Conversion Rate", Value = "3.24%", Change = "-0.5%", Positive = false },
                new MetricData { Label = "Avg. Order Value", Value = "$89.50", Change = "+5.1%", Positive = true }
            }
        };
    }
}
`;
        await fs.writeFile(path.join(projectPath, 'Controllers', 'DashboardController.cs'), dashboardControllerCs, 'utf-8');
        // Create DashboardPage.tsx with useMvcState
        const dashboardPageTsx = `import { useMvcState, useMvcViewModel } from '@minimact/mvc';
import type { DataPoint } from '@minimact/charts';

interface MetricData {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

interface DashboardViewModel {
  timeRange: string;
  region: string;
  salesData: DataPoint[];
  revenueData: DataPoint[];
  productMixData: DataPoint[];
  growthData: DataPoint[];
  metrics: MetricData[];
}

export function DashboardPage() {
  // Get full ViewModel (immutable data from server)
  const viewModel = useMvcViewModel<DashboardViewModel>();

  // Get mutable filters (user can change, syncs to server instantly!)
  const [timeRange, setTimeRange] = useMvcState<string>('timeRange', { sync: 'immediate' });
  const [region, setRegion] = useMvcState<string>('region', { sync: 'immediate' });

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header with Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ fontSize: '32px', margin: 0 }}>📊 Sales Dashboard</h1>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {/* Time Range Filter */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setTimeRange('week')}
              style={{
                padding: '8px 16px',
                border: timeRange === 'week' ? '2px solid #4CAF50' : '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontWeight: timeRange === 'week' ? '600' : '400'
              }}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              style={{
                padding: '8px 16px',
                border: timeRange === 'month' ? '2px solid #4CAF50' : '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontWeight: timeRange === 'month' ? '600' : '400'
              }}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeRange('year')}
              style={{
                padding: '8px 16px',
                border: timeRange === 'year' ? '2px solid #4CAF50' : '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontWeight: timeRange === 'year' ? '600' : '400'
              }}
            >
              This Year
            </button>
          </div>

          {/* Region Filter */}
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <option value="all">All Regions</option>
            <option value="north">North</option>
            <option value="south">South</option>
            <option value="east">East</option>
            <option value="west">West</option>
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {viewModel.metrics.map(metric => (
          <div
            key={metric.label}
            style={{
              padding: '24px',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              {metric.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
              {metric.value}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: metric.positive ? '#4CAF50' : '#F44336'
            }}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart - Monthly Sales */}
      <div style={{
        padding: '24px',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        backgroundColor: 'white',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
          📈 Monthly Sales Trend
        </h2>

        <Plugin name="BarChart" state={{
          data: viewModel.salesData,
          width: 800,
          height: 400,
          margin: { top: 20, right: 30, bottom: 50, left: 60 },
          barFill: '#4CAF50',
          showGrid: true,
          xAxis: { dataKey: 'category', label: 'Month' },
          yAxis: { label: 'Sales ($K)', tickCount: 5 }
        }} />
      </div>

      {/* Two Column Layout: Line Chart + Pie Chart */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '30px',
        marginBottom: '30px'
      }}>
        {/* Line Chart - Revenue Trend */}
        <div style={{
          padding: '24px',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
            📊 Weekly Revenue
          </h2>

          <Plugin name="LineChart" state={{
            data: viewModel.revenueData,
            width: 450,
            height: 300,
            margin: { top: 20, right: 30, bottom: 50, left: 60 },
            strokeColor: '#2196F3',
            strokeWidth: 3,
            showGrid: true,
            xAxis: { dataKey: 'category' },
            yAxis: { label: 'Revenue ($)', tickCount: 5 }
          }} />
        </div>

        {/* Pie Chart - Product Mix */}
        <div style={{
          padding: '24px',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
            💰 Sales by Category
          </h2>

          <Plugin name="PieChart" state={{
            data: viewModel.productMixData,
            width: 450,
            height: 300,
            innerRadius: 0,
            outerRadius: 100,
            cx: '50%',
            cy: '50%'
          }} />
        </div>
      </div>

      {/* Area Chart - Quarterly Growth */}
      <div style={{
        padding: '24px',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        backgroundColor: 'white',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
          📈 Quarterly Growth Trend
        </h2>

        <Plugin name="AreaChart" state={{
          data: viewModel.growthData,
          width: 800,
          height: 300,
          margin: { top: 20, right: 30, bottom: 50, left: 60 },
          fill: 'rgba(76, 175, 80, 0.3)',
          stroke: '#4CAF50',
          strokeWidth: 2,
          showGrid: true,
          xAxis: { dataKey: 'category', label: 'Quarter' },
          yAxis: { label: 'Revenue ($)', tickCount: 5 }
        }} />
      </div>

      {/* Powered Badge */}
      <Plugin name="PoweredBadge" state={{
        position: 'bottom-right',
        expanded: false,
        theme: 'dark',
        linkUrl: 'https://minimact.dev',
        openInNewTab: true
      }} />
    </div>
  );
}
`;
        await fs.writeFile(path.join(projectPath, 'Pages', 'DashboardPage.tsx'), dashboardPageTsx, 'utf-8');
        // Copy Minimact client runtime and all plugin packages
        await this.copyClientRuntimeToProject(projectPath);
        await this.copyChartPackagesToProject(projectPath);
        await this.copyPoweredPackageToProject(projectPath);
        // Note: MVC package is already copied by HookExampleGenerator if @minimact/mvc hooks are selected
    }
    /**
     * Create MVC Bridge template files
     */
    async createMvcTemplate(projectPath, enableTailwind = false) {
        // Create directory structure
        await fs.mkdir(path.join(projectPath, 'Controllers'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'ViewModels'), { recursive: true });
        await fs.mkdir(path.join(projectPath, 'wwwroot'), { recursive: true });
        // Create ProductViewModel.cs
        const productViewModelCs = `using Minimact.AspNetCore.Attributes;

namespace ${path.basename(projectPath)}.ViewModels;

public class ProductViewModel
{
    // ❌ IMMUTABLE - Server authority (security, business logic)
    public string ProductName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsAdminRole { get; set; }
    public string UserEmail { get; set; } = string.Empty;

    // ✅ MUTABLE - Client can modify (UI state, form inputs)
    [Mutable]
    public int InitialQuantity { get; set; }

    [Mutable]
    public string InitialSelectedColor { get; set; } = "Black";

    [Mutable]
    public bool InitialIsExpanded { get; set; }
}
`;
        await fs.writeFile(path.join(projectPath, 'ViewModels', 'ProductViewModel.cs'), productViewModelCs, 'utf-8');
        // Create ProductsController.cs
        const tailwindOptions = enableTailwind ? `,
            options: new MinimactPageRenderOptions
            {
                AdditionalHeadContent = "<link href=\\"/css/tailwind.css\\" rel=\\"stylesheet\\">"
            }` : '';
        const productsControllerCs = `using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;
using ${path.basename(projectPath)}.ViewModels;

namespace ${path.basename(projectPath)}.Controllers;

[ApiController]
[Route("[controller]")]
public class ProductsController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public ProductsController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Details(int id)
    {
        // 1. Fetch data (simulated - replace with database call)
        var product = GetProductById(id);

        if (product == null)
        {
            return NotFound();
        }

        // 2. Prepare ViewModel (traditional MVC pattern)
        var viewModel = new ProductViewModel
        {
            // Server-authoritative data
            ProductName = product.Name,
            Price = product.Price,
            IsAdminRole = User.IsInRole("Admin"),
            UserEmail = User.Identity?.Name ?? "Guest",

            // Client-mutable UI state
            InitialQuantity = 1,
            InitialSelectedColor = "Black",
            InitialIsExpanded = false
        };

        // 3. Render Minimact component with ViewModel${enableTailwind ? ' and Tailwind CSS' : ''}
        return await _renderer.RenderPage<Minimact.Components.ProductDetailsPage>(
            viewModel: viewModel,
            pageTitle: $"{product.Name} - Product Details"${tailwindOptions}
        );
    }

    // Simulated database - replace with Entity Framework
    private ProductData? GetProductById(int id)
    {
        var products = new[]
        {
            new ProductData { Id = 1, Name = "Widget", Price = 99.99m },
            new ProductData { Id = 2, Name = "Gadget", Price = 149.99m },
            new ProductData { Id = 3, Name = "Doohickey", Price = 79.99m }
        };

        return products.FirstOrDefault(p => p.Id == id);
    }
}

// Simple data model - replace with Entity Framework entity
public class ProductData
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
}
`;
        await fs.writeFile(path.join(projectPath, 'Controllers', 'ProductsController.cs'), productsControllerCs, 'utf-8');
        // Create ProductDetailsPage.tsx (with Tailwind or inline styles)
        const productDetailsPageTsx = enableTailwind ? this.getProductDetailsPageTailwind() : this.getProductDetailsPageInline();
        await fs.writeFile(path.join(projectPath, 'Pages', 'ProductDetailsPage.tsx'), productDetailsPageTsx, 'utf-8');
        // Copy Minimact client runtime to wwwroot/js
        await this.copyClientRuntimeToProject(projectPath);
    }
    /**
     * Copy Minimact client runtime to project's wwwroot/js folder
     */
    async copyClientRuntimeToProject(projectPath) {
        const jsDir = path.join(projectPath, 'wwwroot', 'js');
        await fs.mkdir(jsDir, { recursive: true });
        // Source: ../resources/minimact.js relative to compiled dist
        // For published package: node_modules/@minimact/swig-shared/resources/minimact.js
        const clientRuntimeSource = path.join(__dirname, '..', 'resources', 'minimact.js');
        const clientRuntimeDest = path.join(jsDir, 'minimact.js');
        try {
            await fs.copyFile(clientRuntimeSource, clientRuntimeDest);
        }
        catch (error) {
            console.error('Failed to copy client runtime:', error);
            console.error('Source path:', clientRuntimeSource);
            // Not fatal - user can copy manually
        }
    }
    /**
     * Copy @minimact/charts package to project's wwwroot/js folder
     */
    async copyChartPackagesToProject(projectPath) {
        const jsDir = path.join(projectPath, 'wwwroot', 'js');
        await fs.mkdir(jsDir, { recursive: true });
        // Source: Electron app's mact_modules folder
        const chartsSource = path.join(__dirname, '..', '..', 'mact_modules', '@minimact', 'charts', 'dist', 'charts.js');
        const chartsDest = path.join(jsDir, 'minimact-charts.min.js');
        try {
            await fs.copyFile(chartsSource, chartsDest);
            console.log('[ProjectManager] Copied @minimact/charts to project');
        }
        catch (error) {
            console.error('Failed to copy @minimact/charts:', error);
            console.error('Make sure @minimact/charts is built and synced');
            // Not fatal - user can copy manually
        }
    }
    /**
     * Copy @minimact/powered package to project's wwwroot/js folder
     */
    async copyPoweredPackageToProject(projectPath) {
        const jsDir = path.join(projectPath, 'wwwroot', 'js');
        await fs.mkdir(jsDir, { recursive: true });
        // Source: Electron app's mact_modules folder
        const poweredSource = path.join(__dirname, '..', '..', 'mact_modules', '@minimact', 'powered', 'dist', 'powered.js');
        const poweredDest = path.join(jsDir, 'minimact-powered.min.js');
        try {
            await fs.copyFile(poweredSource, poweredDest);
            console.log('[ProjectManager] Copied @minimact/powered to project');
        }
        catch (error) {
            console.error('Failed to copy @minimact/powered:', error);
            console.error('Make sure @minimact/powered is built and synced');
            // Not fatal - user can copy manually
        }
    }
    /**
     * Create Visual Studio solution file (.sln)
     */
    async createSolutionFile(projectPath, projectName) {
        const { execa } = await Promise.resolve().then(() => __importStar(require('execa')));
        try {
            // Use dotnet CLI to create solution file
            await execa('dotnet', ['new', 'sln', '-n', projectName], {
                cwd: projectPath
            });
            // Add the project to the solution
            const csprojFile = `${projectName}.csproj`;
            await execa('dotnet', ['sln', 'add', csprojFile], {
                cwd: projectPath
            });
            console.log(`[ProjectManager] Created solution file: ${projectName}.sln`);
        }
        catch (error) {
            console.warn('[ProjectManager] Failed to create solution file:', error);
            // Don't throw - solution file is optional
        }
    }
    /**
     * Setup Tailwind CSS for the project
     */
    async setupTailwindCss(projectPath, projectName) {
        const { execa } = await Promise.resolve().then(() => __importStar(require('execa')));
        try {
            console.log('[ProjectManager] Setting up Tailwind CSS...');
            // 1. Create package.json if it doesn't exist
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJsonExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);
            if (!packageJsonExists) {
                const packageJson = {
                    name: projectName.toLowerCase(),
                    version: '1.0.0',
                    private: true,
                    scripts: {
                        'build:css': 'tailwindcss -i ./src/styles/tailwind.css -o ./wwwroot/css/tailwind.css --minify'
                    },
                    devDependencies: {
                        tailwindcss: '^3.4.0',
                        autoprefixer: '^10.4.0',
                        postcss: '^8.4.0'
                    }
                };
                await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
                console.log('[ProjectManager] Created package.json');
            }
            // 2. Install Tailwind dependencies
            console.log('[ProjectManager] Installing Tailwind dependencies...');
            await execa('npm', ['install'], {
                cwd: projectPath
            });
            // 3. Create tailwind.config.js
            const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // User TSX components
    './Pages/**/*.tsx',
    './Components/**/*.tsx',
    './Views/**/*.tsx',

    // Plugin C# source files (for plugin Tailwind classes)
    './Plugins/**/*.cs',
    '../packages/**/*.cs', // External plugin packages
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
            await fs.writeFile(path.join(projectPath, 'tailwind.config.js'), tailwindConfig, 'utf-8');
            console.log('[ProjectManager] Created tailwind.config.js');
            // 4. Create src/styles directory
            const stylesDir = path.join(projectPath, 'src', 'styles');
            await fs.mkdir(stylesDir, { recursive: true });
            // 5. Create tailwind.css source file
            const tailwindCss = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
            await fs.writeFile(path.join(stylesDir, 'tailwind.css'), tailwindCss, 'utf-8');
            console.log('[ProjectManager] Created src/styles/tailwind.css');
            // 6. Ensure wwwroot/css directory exists
            const cssDir = path.join(projectPath, 'wwwroot', 'css');
            await fs.mkdir(cssDir, { recursive: true });
            // 7. Generate initial CSS
            console.log('[ProjectManager] Generating initial Tailwind CSS...');
            await execa('npm', ['run', 'build:css'], {
                cwd: projectPath
            });
            console.log('[ProjectManager] ✓ Tailwind CSS setup complete');
        }
        catch (error) {
            console.warn('[ProjectManager] Failed to setup Tailwind CSS:', error);
            // Don't throw - Tailwind is optional
        }
    }
    /**
     * Get ProductDetailsPage with Tailwind CSS classes
     */
    getProductDetailsPageTailwind() {
        return `import { useMvcState, useMvcViewModel, decimal, int } from '@minimact/mvc';
import { useState } from '@minimact/core';

// TypeScript interface matching C# ViewModel
interface ProductViewModel {
  productName: string;
  price: decimal;
  isAdminRole: boolean;
  userEmail: string;
  initialQuantity: int;
  initialSelectedColor: string;
  initialIsExpanded: boolean;
}

export function ProductDetailsPage() {
  const [productName] = useMvcState<string>('productName');
  const [price] = useMvcState<number>('price');
  const [isAdmin] = useMvcState<boolean>('isAdminRole');
  const [quantity, setQuantity] = useMvcState<number>('initialQuantity', { sync: 'immediate' });
  const [color, setColor] = useMvcState<string>('initialSelectedColor');
  const [isExpanded, setIsExpanded] = useMvcState<boolean>('initialIsExpanded');
  const viewModel = useMvcViewModel<ProductViewModel>();
  const [cartTotal, setCartTotal] = useState(0);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta);
    setQuantity(newQuantity);
    setCartTotal(price * newQuantity);
  };

  return (
    <div className="p-5 font-sans max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-5">{productName}</h1>

      <div className="mb-5">
        <div className="text-4xl font-bold text-blue-600">
          \${price.toFixed(2)}
        </div>
        <div className="text-gray-500 text-sm">
          Logged in as: {viewModel?.userEmail}
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="mb-5">
        <label className="block mb-2 font-medium">Quantity:</label>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => handleQuantityChange(-1)}
            className="px-4 py-2 bg-gray-200 rounded cursor-pointer hover:bg-gray-300"
          >
            -
          </button>
          <span className="text-xl font-bold min-w-[40px] text-center">
            {quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            className="px-4 py-2 bg-gray-200 rounded cursor-pointer hover:bg-gray-300"
          >
            +
          </button>
        </div>
      </div>

      {/* Color Selector */}
      <div className="mb-5">
        <label className="block mb-2 font-medium">Color:</label>
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        >
          <option value="Black">Black</option>
          <option value="White">White</option>
          <option value="Red">Red</option>
          <option value="Blue">Blue</option>
        </select>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div className="p-4 bg-amber-100 border border-amber-400 rounded-lg mb-5">
          <h3 className="mt-0 mb-3 font-semibold">Admin Controls</h3>
          <button className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 mr-2">
            Edit Product
          </button>
          <button className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer hover:bg-red-600">
            Delete Product
          </button>
        </div>
      )}

      {/* Expandable Details */}
      <div className="mb-5">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200"
        >
          {isExpanded ? 'Hide' : 'Show'} Details
        </button>

        {isExpanded && (
          <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Product Specifications</h3>
            <p>This is where detailed product information would go.</p>
          </div>
        )}
      </div>

      {/* Cart Total */}
      <div className="p-4 bg-green-50 border border-green-300 rounded-lg mb-5">
        <strong className="text-lg">Total: \${cartTotal.toFixed(2)}</strong>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={() => alert(\`Added \${quantity} x \${productName} to cart! Total: $\${cartTotal.toFixed(2)}\`)}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg text-base font-semibold cursor-pointer hover:bg-green-700"
      >
        Add to Cart
      </button>
    </div>
  );
}
`;
    }
    /**
     * Get ProductDetailsPage with inline styles
     */
    getProductDetailsPageInline() {
        return `import { useMvcState, useMvcViewModel, decimal, int } from '@minimact/mvc';
import { useState } from '@minimact/core';

// TypeScript interface matching C# ViewModel
interface ProductViewModel {
  productName: string;
  price: decimal;
  isAdminRole: boolean;
  userEmail: string;
  initialQuantity: int;
  initialSelectedColor: string;
  initialIsExpanded: boolean;
}

export function ProductDetailsPage() {
  const [productName] = useMvcState<string>('productName');
  const [price] = useMvcState<number>('price');
  const [isAdmin] = useMvcState<boolean>('isAdminRole');
  const [quantity, setQuantity] = useMvcState<number>('initialQuantity', { sync: 'immediate' });
  const [color, setColor] = useMvcState<string>('initialSelectedColor');
  const [isExpanded, setIsExpanded] = useMvcState<boolean>('initialIsExpanded');
  const viewModel = useMvcViewModel<ProductViewModel>();
  const [cartTotal, setCartTotal] = useState(0);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta);
    setQuantity(newQuantity);
    setCartTotal(price * newQuantity);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{productName}</h1>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>
          \${price.toFixed(2)}
        </div>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>
          Logged in as: {viewModel?.userEmail}
        </div>
      </div>

      {/* Quantity Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Quantity:</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => handleQuantityChange(-1)}
            style={{ padding: '8px 16px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            -
          </button>
          <span style={{ fontSize: '20px', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>
            {quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            style={{ padding: '8px 16px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Color Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Color:</label>
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
        >
          <option value="Black">Black</option>
          <option value="White">White</option>
          <option value="Red">Red</option>
          <option value="Blue">Blue</option>
        </select>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div style={{ padding: '16px', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Admin Controls</h3>
          <button style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>
            Edit Product
          </button>
          <button style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Delete Product
          </button>
        </div>
      )}

      {/* Expandable Details */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ padding: '8px 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isExpanded ? 'Hide' : 'Show'} Details
        </button>

        {isExpanded && (
          <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <h3>Product Specifications</h3>
            <p>This is where detailed product information would go.</p>
          </div>
        )}
      </div>

      {/* Cart Total */}
      <div style={{ padding: '16px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', marginBottom: '20px' }}>
        <strong style={{ fontSize: '18px' }}>Total: \${cartTotal.toFixed(2)}</strong>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={() => alert(\`Added \${quantity} x \${productName} to cart! Total: $\${cartTotal.toFixed(2)}\`)}
        style={{ padding: '12px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', width: '100%' }}
      >
        Add to Cart
      </button>
    </div>
  );
}
`;
    }
    /**
     * Create Electron File Manager template from modular template files
     * Desktop file manager application using Electron + Minimact
     */
    async createElectronFileManagerTemplate(projectPath, projectName) {
        const { execa } = await Promise.resolve().then(() => __importStar(require('execa')));
        // Load template metadata
        const templateDir = path.join(__dirname, '..', 'templates', 'electron-filemanager');
        const templateMetadata = JSON.parse(await fs.readFile(path.join(templateDir, 'template.json'), 'utf-8'));
        console.log(`[ProjectManager] Creating ${templateMetadata.name} template...`);
        // Process each file from template
        for (const fileConfig of templateMetadata.files) {
            const sourcePath = path.join(templateDir, fileConfig.source);
            const destPath = path.join(projectPath, fileConfig.destination);
            // Ensure destination directory exists
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            // Read file content
            let content = await fs.readFile(sourcePath, 'utf-8');
            // Apply replacements
            if (fileConfig.replacements) {
                for (const [find, replaceTemplate] of Object.entries(fileConfig.replacements)) {
                    const replaceValue = replaceTemplate.replace('{{ProjectName}}', projectName);
                    content = content.replace(new RegExp(find, 'g'), replaceValue);
                }
            }
            // Write file
            await fs.writeFile(destPath, content, 'utf-8');
            console.log(`[ProjectManager]   ✓ Created ${fileConfig.destination}`);
        }
        // Run post-install commands
        if (templateMetadata.postInstall) {
            for (const command of templateMetadata.postInstall) {
                console.log(`[ProjectManager] ${command.description}...`);
                await execa(command.command, command.args, {
                    cwd: path.join(projectPath, command.cwd || '.')
                });
            }
        }
        // Create root package.json with scripts
        if (templateMetadata.scripts) {
            const rootPackageJson = {
                "name": projectName.toLowerCase(),
                "version": "1.0.0",
                "scripts": templateMetadata.scripts
            };
            await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(rootPackageJson, null, 2), 'utf-8');
            console.log('[ProjectManager]   ✓ Created package.json with scripts');
        }
        console.log('[ProjectManager] ✅ Electron File Manager template created successfully!');
        console.log('[ProjectManager] Next steps:');
        console.log('[ProjectManager]   1. Run "dotnet build"');
        console.log('[ProjectManager]   2. Run "npm start" in the electron folder');
    }
}
exports.ProjectManager = ProjectManager;
/**
 * Determine file type from extension
 */
function getFileKind(ext) {
    switch (ext) {
        case '.tsx':
            return 'tsx';
        case '.jsx':
            return 'jsx';
        case '.ts':
            return 'ts';
        case '.js':
            return 'js';
        case '.cs':
            return 'cs';
        case '.csproj':
            return 'csproj';
        case '.json':
            return 'json';
        default:
            return 'other';
    }
}
/**
 * Remove UTF-8 BOM so JSON.parse succeeds with dotnet-generated files
 */
function stripBom(content) {
    return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}
