/**
 * @minimact/swig-shared
 *
 * Shared services for Minimact Swig (Electron GUI and CLI)
 */

export { ProjectManager } from './ProjectManager';
export { TranspilerService } from './TranspilerService';
export { FileWatcher } from './FileWatcher';
export { HookExampleGenerator } from './HookExampleGenerator';

export type {
  Project,
  RecentProject,
  ProjectFile,
  TranspileResult,
  TranspileProjectResult
} from './types';
