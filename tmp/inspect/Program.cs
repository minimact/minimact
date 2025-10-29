using System;
using System.IO;
using System.Linq;
using System.Reflection;

var assemblyPath = args.Length > 0 ? args[0] : Path.GetFullPath("../../src/Minimact.AspNetCore/bin/Release/net8.0/Minimact.AspNetCore.dll");

var runtimeDir = Path.GetDirectoryName(typeof(object).Assembly.Location)!;
var runtimeAssemblies = Directory.GetFiles(runtimeDir, "*.dll");
var resolver = new PathAssemblyResolver(runtimeAssemblies.Append(assemblyPath));
using var mlc = new MetadataLoadContext(resolver);
var asm = mlc.LoadFromAssemblyPath(assemblyPath);
Console.WriteLine($"Assembly: {asm.FullName}");
foreach (var type in asm.GetTypes().Where(t => t.FullName?.Contains("Minimact") == true))
{
    Console.WriteLine(type.FullName);
}
