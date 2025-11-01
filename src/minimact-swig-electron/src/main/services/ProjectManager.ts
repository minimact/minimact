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
  async createProject(projectPath: string, template: string): Promise<Project> {
    const projectName = path.basename(projectPath);

    // Ensure directory exists
    await fs.mkdir(projectPath, { recursive: true });

    // Create project structure based on template
    await this.createProjectStructure(projectPath, projectName, template);

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
    template: string
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

    // 5. Update launchSettings.json to use port 5000
    const launchSettingsPath = path.join(projectPath, 'Properties', 'launchSettings.json');
    const launchSettings = JSON.parse(
      stripBom(await fs.readFile(launchSettingsPath, 'utf-8'))
    );

    // Update first profile
    const profileName = Object.keys(launchSettings.profiles)[0];
    launchSettings.profiles[profileName].applicationUrl = 'http://localhost:5000';

    await fs.writeFile(launchSettingsPath, JSON.stringify(launchSettings, null, 2), 'utf-8');

    // 6. Create template-specific files
    if (template === 'Counter') {
      await this.createCounterTemplate(projectPath);
    } else if (template === 'MVC') {
      await this.createMvcTemplate(projectPath);
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

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();

app.UseEndpoints(endpoints =>
{
    // MVC routes
    endpoints.MapControllers();

    // SignalR hub for Minimact
    endpoints.MapHub<Minimact.AspNetCore.SignalR.MinimactHub>("/minimact");
});

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
  private async createMvcTemplate(projectPath: string): Promise<void> {
    // Create directory structure
    await fs.mkdir(path.join(projectPath, 'Controllers'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'ViewModels'), { recursive: true });

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

        // 3. Render Minimact component with ViewModel
        return await _renderer.RenderPage<Pages.ProductDetailsPage>(
            viewModel: viewModel,
            pageTitle: $"{product.Name} - Product Details"
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

    // Create ProductDetailsPage.tsx
    const productDetailsPageTsx = `import { useMvcState, useMvcViewModel } from '@minimact/mvc';
import { useState } from 'minimact';

// TypeScript interface matching C# ViewModel
interface ProductViewModel {
  productName: string;
  price: number;
  isAdminRole: boolean;
  userEmail: string;
  initialQuantity: number;
  initialSelectedColor: string;
  initialIsExpanded: boolean;
}

export function ProductDetailsPage() {
  // ❌ IMMUTABLE - Returns [value] only (no setter)
  const [productName] = useMvcState<string>('productName');
  const [price] = useMvcState<number>('price');
  const [isAdmin] = useMvcState<boolean>('isAdminRole');

  // ✅ MUTABLE - Returns [value, setter]
  const [quantity, setQuantity] = useMvcState<number>('initialQuantity', {
    sync: 'immediate' // Sync to server immediately
  });

  const [color, setColor] = useMvcState<string>('initialSelectedColor');
  const [isExpanded, setIsExpanded] = useMvcState<boolean>('initialIsExpanded');

  // Access entire ViewModel (read-only)
  const viewModel = useMvcViewModel<ProductViewModel>();

  // Mix with regular Minimact state
  const [cartTotal, setCartTotal] = useState(0);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta);
    setQuantity(newQuantity);
    setCartTotal(price * newQuantity);
  };

  const handleAddToCart = () => {
    alert(\`Added \${quantity} x \${productName} to cart! Total: $\${cartTotal.toFixed(2)}\`);
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
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Quantity:
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => handleQuantityChange(-1)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            -
          </button>
          <span style={{ fontSize: '20px', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>
            {quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Color Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Color:
        </label>
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="Black">Black</option>
          <option value="White">White</option>
          <option value="Red">Red</option>
          <option value="Blue">Blue</option>
        </select>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>Admin Controls</h3>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '8px'
          }}>
            Edit Product
          </button>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Delete Product
          </button>
        </div>
      )}

      {/* Expandable Details */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isExpanded ? 'Hide' : 'Show'} Details
        </button>

        {isExpanded && (
          <div style={{
            marginTop: '12px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            <h3>Product Specifications</h3>
            <p>This is where detailed product information would go.</p>
          </div>
        )}
      </div>

      {/* Cart Total */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <strong style={{ fontSize: '18px' }}>Total: \${cartTotal.toFixed(2)}</strong>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        style={{
          padding: '12px 24px',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}
`;

    await fs.writeFile(
      path.join(projectPath, 'Pages', 'ProductDetailsPage.tsx'),
      productDetailsPageTsx,
      'utf-8'
    );
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
