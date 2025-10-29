/**
 * Minimact project structure
 */
export interface Project {
  name: string;
  path: string;
  port: number;
  template: string;
  createdAt: Date;
  lastOpened: Date;
}

/**
 * Recent project entry
 */
export interface RecentProject {
  name: string;
  path: string;
  lastOpened: Date;
}

/**
 * Project file entry
 */
export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
  type: 'tsx' | 'jsx' | 'ts' | 'js' | 'cs' | 'csproj' | 'json' | 'other';
  content?: string;
}

/**
 * Transpile result
 */
export interface TranspileResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration: number;
}

/**
 * Transpile project result
 */
export interface TranspileProjectResult {
  success: boolean;
  filesTranspiled: number;
  errors: Array<{ file: string; error: string }>;
  duration: number;
}

/**
 * Build result
 */
export interface BuildResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  duration: number;
}
