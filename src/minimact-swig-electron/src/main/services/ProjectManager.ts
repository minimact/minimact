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
    const files: ProjectFile[] = [];

    async function scanDirectory(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, bin, obj, .git
        if (entry.isDirectory()) {
          if (!['node_modules', 'bin', 'obj', '.git', 'dist', 'out'].includes(entry.name)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const kind = getFileKind(ext);
          const extension = ext.startsWith('.') ? ext.slice(1) : ext;

          if (kind !== 'other') {
            files.push({
              path: fullPath,
              name: entry.name,
              extension,
              type: 'file',
              kind
            });
          }
        }
      }
    }

    await scanDirectory(projectPath);
    return files;
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

    // 4. Replace Program.cs with Minimact setup
    const programCs = `using Minimact.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMinimact();

var app = builder.Build();

app.UseMinimact();

app.MapMinimactPage("/", () => new Pages.Index());

app.Run();
`;

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
    }
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
