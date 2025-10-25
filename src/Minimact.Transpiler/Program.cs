using System.CommandLine;
using Minimact.Transpiler.Core;

namespace Minimact.Transpiler;

/// <summary>
/// Minimact C# to TypeScript Transpiler
///
/// Converts C# worker code to equivalent TypeScript for browser execution
/// while keeping the same algorithms available for MockClient testing.
/// </summary>
public class Program
{
    public static async Task<int> Main(string[] args)
    {
        var inputOption = new Option<DirectoryInfo>(
            "--input",
            "Input directory containing C# source files")
        {
            IsRequired = true
        };

        var outputOption = new Option<DirectoryInfo>(
            "--output",
            "Output directory for generated TypeScript files")
        {
            IsRequired = true
        };

        var watchOption = new Option<bool>(
            "--watch",
            "Watch for file changes and auto-regenerate");

        var rootCommand = new RootCommand("Minimact C# to TypeScript Transpiler")
        {
            inputOption,
            outputOption,
            watchOption
        };

        rootCommand.SetHandler(async (input, output, watch) =>
        {
            var transpiler = new CSharpToTypeScriptTranspiler();

            if (watch)
            {
                await transpiler.WatchAndTranspileAsync(input, output);
            }
            else
            {
                await transpiler.TranspileAsync(input, output);
            }
        }, inputOption, outputOption, watchOption);

        return await rootCommand.InvokeAsync(args);
    }
}