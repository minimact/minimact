import type { Project, RecentProject, ProjectFile } from './types';
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
export declare class ProjectManager {
    private recentProjectsPath;
    private hookExampleGenerator;
    constructor(userDataPath: string);
    /**
     * Create a new Minimact project from template
     */
    createProject(projectPath: string, template: string, options?: {
        createSolution?: boolean;
        enableTailwind?: boolean;
        selectedHooks?: string[];
    }): Promise<Project>;
    /**
     * Load an existing Minimact project
     */
    loadProject(projectPath: string): Promise<Project>;
    /**
     * Get list of recent projects
     */
    getRecentProjects(): Promise<RecentProject[]>;
    /**
     * Scan project files (TSX, C#, etc.)
     */
    scanProjectFiles(projectPath: string): Promise<ProjectFile[]>;
    /**
     * Detect port from launchSettings.json
     */
    private detectPort;
    /**
     * Add project to recent projects list
     */
    private addToRecentProjects;
    /**
     * Create project structure based on template
     */
    private createProjectStructure;
    /**
     * Get MVC-based Program.cs (now used for all templates)
     */
    private getMvcProgramCs;
    /**
     * Create Counter template files (MVC-based)
     */
    private createCounterTemplate;
    /**
     * Create TodoList template files (MVC-based)
     */
    private createTodoListTemplate;
    /**
     * Create Dashboard template files (MVC-based)
     */
    private createDashboardTemplate;
    /**
     * Create MVC Dashboard template files (combines MVC Bridge + Charts)
     */
    private createMvcDashboardTemplate;
    /**
     * Create MVC Bridge template files
     */
    private createMvcTemplate;
    /**
     * Copy Minimact client runtime to project's wwwroot/js folder
     */
    private copyClientRuntimeToProject;
    /**
     * Copy @minimact/charts package to project's wwwroot/js folder
     */
    private copyChartPackagesToProject;
    /**
     * Copy @minimact/powered package to project's wwwroot/js folder
     */
    private copyPoweredPackageToProject;
    /**
     * Create Visual Studio solution file (.sln)
     */
    private createSolutionFile;
    /**
     * Setup Tailwind CSS for the project
     */
    private setupTailwindCss;
    /**
     * Get ProductDetailsPage with Tailwind CSS classes
     */
    private getProductDetailsPageTailwind;
    /**
     * Get ProductDetailsPage with inline styles
     */
    private getProductDetailsPageInline;
    /**
     * Create SPA (Single Page Application) template
     * Full SPA with shells, pages, instant navigation, and shell persistence
     */
    private createSpaTemplate;
    /**
     * Get SPA-enabled Program.cs
     */
    private getSpaProgramCs;
    /**
     * Create SPA ViewModels
     */
    private createSpaViewModels;
    /**
     * Create SPA Controllers
     */
    private createSpaControllers;
    /**
     * Create SPA Shells
     */
    private createSpaShells;
    /**
     * Create SPA Pages
     */
    private createSpaPages;
    /**
     * Initialize mact_modules and install @minimact/spa package from global cache
     */
    private initializeMactModulesForSpa;
    /**
     * Create Electron File Manager template from modular template files
     * Desktop file manager application using Electron + Minimact
     */
    private createElectronFileManagerTemplate;
}
