using Minimact;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

[Component]
public partial class TypeScriptToCSharpExample : MinimactComponent
{
    [ServerTask]
    public async Task<object> processData(List<string> items, double threshold)
    {
        // Variable declarations
        var results = new List<string>();
        var count = 0;

        // For-of → foreach
        foreach (var item in items)
        {
            // String truthiness → MinimactHelpers.ToBool()
            if (MinimactHelpers.ToBool(item))
            {
                // String methods: trim() → Trim(), toUpperCase() → ToUpper()
                var processed = item.Trim().ToUpper();

                // .length → .Length
                if (processed.Length > threshold)
                {
                    // .push() → .Add()
                    results.Add(processed);
                    count++;
                }
            }
        }

        // Try-catch preserved
        try
        {
            // fetch() → HttpClient
            var response = await HttpClient.PostAsync("/api/save",
                new StringContent(JsonSerializer.Serialize(results)));

            // .ok → .IsSuccessStatusCode
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception("Save failed");
            }
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"Error: {error}");
        }

        // Return anonymous object
        return new { results, count };
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), "Processing...");
    }
}

// typescriptToCSharp.cjs transpiles:
// - Variable declarations: const/let/var → var
// - For loops: for-of → foreach, for → for
// - Conditionals: if/else preserved, truthiness wrapped
// - Try-catch-finally: preserved structure
// - Throw statements: new Error() → new Exception()
// - Array methods: push → Add, length → Count/Length
// - String methods: trim → Trim, toUpperCase → ToUpper, etc.
// - fetch() → HttpClient.GetAsync/PostAsync
// - JSON.stringify → JsonSerializer.Serialize
// - console.log/error → Console.WriteLine/Error.WriteLine
// - Template literals: `${x}` → $"{x}"
// - Await expressions: preserved
