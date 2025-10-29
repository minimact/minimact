import { execa, type ResultPromise } from 'execa';
import type { BuildResult } from '../types/project';

/**
 * ProcessController - Manages dotnet build/run processes
 *
 * Responsibilities:
 * - Build projects (dotnet build)
 * - Start projects (dotnet run)
 * - Stop running projects
 * - Capture and stream output
 */
export class ProcessController {
  private currentProcess: ResultPromise | null = null;
  private outputListeners: Array<(data: string) => void> = [];

  /**
   * Build a Minimact project
   */
  async build(projectPath: string): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      const result = await execa('dotnet', ['build'], {
        cwd: projectPath,
        all: true
      });

      const duration = Date.now() - startTime;

      // Parse output for errors/warnings
      const output = result.all || '';
      const errors = this.parseErrors(output);
      const warnings = this.parseWarnings(output);

      return {
        success: result.exitCode === 0,
        output,
        errors,
        warnings,
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        output: error.all || error.message || '',
        errors: [error.message || 'Build failed'],
        warnings: [],
        duration
      };
    }
  }

  /**
   * Start a Minimact app (dotnet run)
   */
  async start(projectPath: string, port: number): Promise<void> {
    if (this.currentProcess) {
      throw new Error('A process is already running. Stop it first.');
    }

    this.currentProcess = execa('dotnet', ['run', '--urls', `http://localhost:${port}`], {
      cwd: projectPath,
      all: true,
      buffer: false
    });

    // Stream output to listeners
    if (this.currentProcess.stdout) {
      this.currentProcess.stdout.on('data', (data) => {
        const text = data.toString();
        this.notifyOutputListeners(text);
      });
    }

    if (this.currentProcess.stderr) {
      this.currentProcess.stderr.on('data', (data) => {
        const text = data.toString();
        this.notifyOutputListeners(text);
      });
    }

    // Handle process exit
    this.currentProcess.on('exit', (code) => {
      this.notifyOutputListeners(`\nProcess exited with code ${code}\n`);
      this.currentProcess = null;
    });
  }

  /**
   * Stop the running process
   */
  stop(): void {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }
  }

  /**
   * Check if a process is running
   */
  isRunning(): boolean {
    return this.currentProcess !== null;
  }

  /**
   * Register output listener
   */
  onOutput(callback: (data: string) => void): () => void {
    this.outputListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.outputListeners.indexOf(callback);
      if (index > -1) {
        this.outputListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all output listeners
   */
  private notifyOutputListeners(data: string): void {
    for (const listener of this.outputListeners) {
      listener(data);
    }
  }

  /**
   * Parse errors from build output
   */
  private parseErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('error CS') || line.includes('error :')) {
        errors.push(line.trim());
      }
    }

    return errors;
  }

  /**
   * Parse warnings from build output
   */
  private parseWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('warning CS') || line.includes('warning :')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }
}
