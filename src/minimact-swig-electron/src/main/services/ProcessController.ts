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
    let fullOutput = '';

    try {
      // Stream build output to terminal
      this.notifyOutputListeners('\x1b[1;36m● Building project...\x1b[0m\n');

      const buildProcess = execa('dotnet', ['build'], {
        cwd: projectPath,
        all: true,
        buffer: false
      });

      // Stream stdout
      if (buildProcess.stdout) {
        buildProcess.stdout.on('data', (data) => {
          const text = data.toString();
          fullOutput += text;
          this.notifyOutputListeners(text);
        });
      }

      // Stream stderr
      if (buildProcess.stderr) {
        buildProcess.stderr.on('data', (data) => {
          const text = data.toString();
          fullOutput += text;
          this.notifyOutputListeners(text);
        });
      }

      // Wait for completion
      const result = await buildProcess;
      const duration = Date.now() - startTime;

      // Parse output for errors/warnings
      const errors = this.parseErrors(fullOutput);
      const warnings = this.parseWarnings(fullOutput);

      const success = result.exitCode === 0;
      this.notifyOutputListeners(
        success
          ? `\x1b[1;32m✓ Build succeeded in ${duration}ms\x1b[0m\n\n`
          : `\x1b[1;31m✗ Build failed in ${duration}ms\x1b[0m\n\n`
      );

      return {
        success,
        output: fullOutput,
        errors,
        warnings,
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const errorOutput = error.all || error.message || '';
      fullOutput += errorOutput;

      this.notifyOutputListeners(`\x1b[1;31m✗ Build failed: ${error.message}\x1b[0m\n\n`);

      return {
        success: false,
        output: fullOutput,
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

    // Notify terminal that app is starting
    this.notifyOutputListeners(`\x1b[1;36m● Starting app on port ${port}...\x1b[0m\n`);

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
      const exitMessage = code === 0
        ? `\x1b[1;32m✓ Process exited cleanly (code ${code})\x1b[0m\n\n`
        : `\x1b[1;31m✗ Process exited with code ${code}\x1b[0m\n\n`;
      this.notifyOutputListeners(exitMessage);
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
