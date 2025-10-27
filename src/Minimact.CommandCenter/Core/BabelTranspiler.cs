using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Transpiles TSX/JSX files to C# using Babel plugin
/// Mimics the behavior of test-single.js
/// </summary>
public class BabelTranspiler
{
    private readonly string _babelPluginDir;

    public BabelTranspiler()
    {
        // Find babel-plugin-minimact directory
        var projectRoot = FindProjectRoot();
        _babelPluginDir = Path.Combine(projectRoot, "src", "babel-plugin-minimact");

        if (!Directory.Exists(_babelPluginDir))
        {
            throw new DirectoryNotFoundException($"Babel plugin directory not found: {_babelPluginDir}");
        }
    }

    /// <summary>
    /// Transpile a TSX/JSX file to C# code
    /// </summary>
    /// <param name="tsxFilePath">Absolute path to the .tsx/.jsx file</param>
    /// <returns>Generated C# code</returns>
    public async Task<string> TranspileAsync(string tsxFilePath)
    {
        if (!File.Exists(tsxFilePath))
        {
            throw new FileNotFoundException($"TSX file not found: {tsxFilePath}");
        }

        Console.WriteLine($"[BabelTranspiler] Transpiling: {Path.GetFileName(tsxFilePath)}");

        // Escape paths for JavaScript
        var escapedPath = tsxFilePath.Replace("\\", "\\\\");
        var escapedFilename = Path.GetFileName(tsxFilePath);

        // Create Node.js script that runs Babel
        var nodeScript = $@"
            const babel = require('@babel/core');
            const fs = require('fs');
            const code = fs.readFileSync('{escapedPath}', 'utf-8');
            const result = babel.transformSync(code, {{
                presets: ['@babel/preset-typescript', '@babel/preset-react'],
                plugins: ['./index-full.cjs'],
                filename: '{escapedFilename}'
            }});
            // The C# code is in metadata, not in result.code
            const csharpCode = result.metadata?.minimactCSharp || result.code;
            console.log(csharpCode);
        ";

        // Run Node.js with the script
        var startInfo = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = $"-e \"{nodeScript.Replace("\"", "\\\"")}\"",
            WorkingDirectory = _babelPluginDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = startInfo };

        var stdout = "";
        var stderr = "";

        process.OutputDataReceived += (sender, e) =>
        {
            if (e.Data != null)
                stdout += e.Data + "\n";
        };

        process.ErrorDataReceived += (sender, e) =>
        {
            if (e.Data != null)
                stderr += e.Data + "\n";
        };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException($"Babel transpilation failed:\n{stderr}");
        }

        Console.WriteLine($"[BabelTranspiler] ✓ Transpiled successfully ({stdout.Length} chars)");

        return stdout.TrimEnd();
    }

    /// <summary>
    /// Find the project root directory (where src/ folder is)
    /// </summary>
    private string FindProjectRoot()
    {
        var currentDir = Directory.GetCurrentDirectory();

        // Try current directory first
        if (Directory.Exists(Path.Combine(currentDir, "src")))
            return currentDir;

        // Try parent directories (up to 5 levels)
        var dir = new DirectoryInfo(currentDir);
        for (int i = 0; i < 5 && dir != null; i++)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "src")))
                return dir.FullName;
            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not find project root (looking for 'src' folder)");
    }
}
