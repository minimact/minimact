import { spawn } from 'child_process';

/**
 * Run command - Run the ASP.NET Core application
 */
export async function runCommand(options: {
  port?: string;
  build?: boolean;
}): Promise<void> {
  const projectPath = process.cwd();

  console.log('🚀 Running Minimact application...');
  console.log(`   Project: ${projectPath}`);
  console.log(`   Port: ${options.port || '5000'}`);

  try {
    // Build the project first if --no-build was not specified
    if (options.build !== false) {
      console.log('🔨 Building project...');

      const buildProcess = spawn('dotnet', ['build'], {
        cwd: projectPath,
        stdio: 'inherit',
        shell: true
      });

      await new Promise<void>((resolve, reject) => {
        buildProcess.on('error', reject);
        buildProcess.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });
      });
    }

    // Run the application
    console.log('▶️  Starting application...');

    const runArgs = ['run'];
    if (options.port) {
      runArgs.push('--urls', `http://localhost:${options.port}`);
    }

    const runProcess = spawn('dotnet', runArgs, {
      cwd: projectPath,
      stdio: 'inherit',
      shell: true
    });

    runProcess.on('error', (error) => {
      console.error('❌ Failed to run application:', error);
      process.exit(1);
    });

    runProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ Application exited with code ${code}`);
        process.exit(code || 1);
      }
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping application...');
      runProcess.kill('SIGINT');
    });
  } catch (error) {
    console.error('❌ Failed to run application:', error);
    throw error;
  }
}
