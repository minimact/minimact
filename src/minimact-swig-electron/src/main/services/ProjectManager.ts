import * as fs from 'fs/promises';
import * as path from 'path';
import type { Project, RecentProject, ProjectFile } from '../types/project';

/**
 * ProjectManager - Manages Minimact project lifecycle
 *
 * Responsibilities:
 * - Create new projects from templates
 * - Load existing projects
 * - Scan project files
 * - Detect port configuration
 * - Track recent projects
 */
export class ProjectManager {
  private recentProjectsPath: string;

  constructor(userDataPath: string) {
    this.recentProjectsPath = path.join(userDataPath, 'recent-projects.json');
  }

  /**
   * Create a new Minimact project from template
   */
  async createProject(projectPath: string, template: string, options?: { createSolution?: boolean; enableTailwind?: boolean }): Promise<Project> {
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

    // Detect port from launchSettings.json
    const port = await this.detectPort(projectPath);

    const project: Project = {
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
  async loadProject(projectPath: string): Promise<Project> {
    const projectName = path.basename(projectPath);

    // Verify project exists
    const exists = await fs.access(projectPath).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error(`Project not found: ${projectPath}`);
    }

    // Detect port
    const port = await this.detectPort(projectPath);

    const project: Project = {
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
  async getRecentProjects(): Promise<RecentProject[]> {
    try {
      const data = await fs.readFile(this.recentProjectsPath, 'utf-8');
      return JSON.parse(stripBom(data));
    } catch {
      return [];
    }
  }

  /**
   * Scan project files (TSX, C#, etc.)
   */
  async scanProjectFiles(projectPath: string): Promise<ProjectFile[]> {
    async function scanDirectory(dir: string): Promise<ProjectFile[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const items: ProjectFile[] = [];

      // Separate directories and files for sorting
      const directories: typeof entries = [];
      const files: typeof entries = [];

      for (const entry of entries) {
        // Skip excluded directories
        if (entry.isDirectory()) {
          if (!['node_modules', 'bin', 'obj', '.git', 'dist', 'out', '.vs'].includes(entry.name)) {
            directories.push(entry);
          }
        } else {
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
  private async detectPort(projectPath: string): Promise<number> {
    try {
      const launchSettingsPath = path.join(
        projectPath,
        'Properties',
        'launchSettings.json'
      );

      const data = await fs.readFile(launchSettingsPath, 'utf-8');
      const launchSettings = JSON.parse(stripBom(data));

      // Extract port from applicationUrl
      const profile = Object.values(launchSettings.profiles)[0] as any;
      if (profile?.applicationUrl) {
        const match = profile.applicationUrl.match(/:(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    } catch {
      // Default to 5000 if not found
    }

    return 5000;
  }

  /**
   * Add project to recent projects list
   */
  private async addToRecentProjects(project: Project): Promise<void> {
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
    await fs.writeFile(
      this.recentProjectsPath,
      JSON.stringify(recentProjects, null, 2),
      'utf-8'
    );
  }

  /**
   * Create project structure based on template
   */
  private async createProjectStructure(
    projectPath: string,
    projectName: string,
    template: string,
    enableTailwind: boolean = false
  ): Promise<void> {
    const { execa } = await import('execa');

    // 1. Create ASP.NET Core web app using dotnet CLI
    await execa('dotnet', ['new', 'webapi', '-n', projectName, '-o', projectPath], {
      cwd: path.dirname(projectPath)
    });

    // 2. Add Minimact.AspNetCore package
    await execa('dotnet', ['add', 'package', 'Minimact.AspNetCore'], {
      cwd: projectPath
    });

    // 3. Create Minimact directories
    await fs.mkdir(path.join(projectPath, 'Pages'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'Components'), { recursive: true });

    // 4. Replace Program.cs with Minimact setup (template-specific)
    const programCs = template === 'MVC'
      ? this.getMvcProgramCs()
      : this.getStandardProgramCs();

    await fs.writeFile(path.join(projectPath, 'Program.cs'), programCs, 'utf-8');

    // 5. Update launchSettings.json to use port 5000 and configure browser launching
    const launchSettingsPath = path.join(projectPath, 'Properties', 'launchSettings.json');
    const launchSettings = JSON.parse(
      stripBom(await fs.readFile(launchSettingsPath, 'utf-8'))
    );

    // Update all profiles
    for (const profileName of Object.keys(launchSettings.profiles)) {
      const profile = launchSettings.profiles[profileName];

      // Enable browser launching
      profile.launchBrowser = true;

      // Set launch URL based on template
      if (template === 'MVC') {
        profile.launchUrl = 'Products/1';
        // Keep default ports for MVC (HTTPS: 7038, HTTP: 5035)
      } else {
        // Standard Minimact templates use port 5000
        profile.applicationUrl = 'http://localhost:5000';
      }
    }

    await fs.writeFile(launchSettingsPath, JSON.stringify(launchSettings, null, 2), 'utf-8');

    // 6. Create template-specific files
    if (template === 'Counter') {
      await this.createCounterTemplate(projectPath);
    } else if (template === 'MVC') {
      await this.createMvcTemplate(projectPath, enableTailwind);
    }
  }

  /**
   * Get standard Program.cs for non-MVC projects
   */
  private getStandardProgramCs(): string {
    return `using Minimact.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMinimact();

var app = builder.Build();

app.UseMinimact(); // Auto-discovers pages from ./Generated/routes.json

app.Run();
`;
  }

  /**
   * Get MVC-specific Program.cs
   */
  private getMvcProgramCs(): string {
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
   * Create Counter template files
   */
  private async createCounterTemplate(projectPath: string): Promise<void> {
    // Create Pages/Index.tsx
    const indexTsx = `import { useState } from 'minimact';

export function Index() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
`;

    await fs.writeFile(path.join(projectPath, 'Pages', 'Index.tsx'), indexTsx, 'utf-8');
  }

  /**
   * Create MVC Bridge template files
   */
  private async createMvcTemplate(projectPath: string, enableTailwind: boolean = false): Promise<void> {
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

    await fs.writeFile(
      path.join(projectPath, 'ViewModels', 'ProductViewModel.cs'),
      productViewModelCs,
      'utf-8'
    );

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

    await fs.writeFile(
      path.join(projectPath, 'Controllers', 'ProductsController.cs'),
      productsControllerCs,
      'utf-8'
    );

    // Create ProductDetailsPage.tsx (with Tailwind or inline styles)
    const productDetailsPageTsx = enableTailwind ? this.getProductDetailsPageTailwind() : this.getProductDetailsPageInline();

    await fs.writeFile(
      path.join(projectPath, 'Pages', 'ProductDetailsPage.tsx'),
      productDetailsPageTsx,
      'utf-8'
    );

    // Copy Minimact client runtime to wwwroot/js
    await this.copyClientRuntimeToProject(projectPath);
  }

  /**
   * Copy Minimact client runtime to project's wwwroot/js folder
   */
  private async copyClientRuntimeToProject(projectPath: string): Promise<void> {
    const jsDir = path.join(projectPath, 'wwwroot', 'js');
    await fs.mkdir(jsDir, { recursive: true });

    // Source: Electron app's resources folder (populated by npm run sync)
    const clientRuntimeSource = path.join(__dirname, '..', '..', 'resources', 'minimact.js');
    const clientRuntimeDest = path.join(jsDir, 'minimact.js');

    try {
      await fs.copyFile(clientRuntimeSource, clientRuntimeDest);
    } catch (error) {
      console.error('Failed to copy client runtime:', error);
      console.error('Make sure to run `npm run sync` in the monorepo root first');
      // Not fatal - user can copy manually
    }
  }

  /**
   * Create Visual Studio solution file (.sln)
   */
  private async createSolutionFile(projectPath: string, projectName: string): Promise<void> {
    const { execa } = await import('execa');

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
    } catch (error) {
      console.warn('[ProjectManager] Failed to create solution file:', error);
      // Don't throw - solution file is optional
    }
  }

  /**
   * Setup Tailwind CSS for the project
   */
  private async setupTailwindCss(projectPath: string, projectName: string): Promise<void> {
    const { execa } = await import('execa');

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
      await fs.mkdir(cssDir, { recursive: true});

      // 7. Generate initial CSS
      console.log('[ProjectManager] Generating initial Tailwind CSS...');
      await execa('npm', ['run', 'build:css'], {
        cwd: projectPath
      });

      console.log('[ProjectManager] ✓ Tailwind CSS setup complete');
    } catch (error) {
      console.warn('[ProjectManager] Failed to setup Tailwind CSS:', error);
      // Don't throw - Tailwind is optional
    }
  }

  /**
   * Get ProductDetailsPage with Tailwind CSS classes
   */
  private getProductDetailsPageTailwind(): string {
    return `import { useMvcState, useMvcViewModel, decimal, int } from '@minimact/mvc';
import { useState } from 'minimact';

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
  private getProductDetailsPageInline(): string {
    return `import { useMvcState, useMvcViewModel, decimal, int } from '@minimact/mvc';
import { useState } from 'minimact';

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
}

/**
 * Determine file type from extension
 */
function getFileKind(ext: string): NonNullable<ProjectFile['kind']> {
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
function stripBom(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}
