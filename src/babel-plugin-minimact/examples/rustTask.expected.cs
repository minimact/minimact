using Minimact;
using Minimact.Rust;
using System.Collections.Generic;
using System.Threading.Tasks;

[Component]
public partial class RustTaskExample : MinimactComponent
{
    [State]
    private List<double> numbers = new List<double> { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

    [State]
    private double result = 0;

    // Rust FFI binding generated
    [ServerTask(Runtime = "rust", Parallel = true)]
    [RustSource(@"
pub fn compute_sum(data: Vec<f64>) -> f64 {
    use rayon::prelude::*;
    data.par_iter().map(|n| n * n).sum()
}
    ")]
    public async Task<double> computeSum(List<double> data)
    {
        return await RustInterop.Call<double>("compute_sum", data);
    }

    [ServerTask(Runtime = "rust")]
    [RustSource(@"
pub fn process_strings(items: Vec<String>) -> Vec<String> {
    items.into_iter()
        .map(|s| s.to_uppercase())
        .filter(|s| s.len() > 3)
        .collect()
}
    ")]
    public async Task<List<string>> processStrings(List<string> items)
    {
        return await RustInterop.Call<List<string>>("process_strings", items);
    }

    private async void Handle0()
    {
        result = await computeSum(numbers);
        SetState(nameof(result), result);
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("button", "1.1", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Compute"),
            new VElement("p", "1.2", new Dictionary<string, string>(), new VText($"Result: {result}", "1.2.1"))
        });
    }
}

// rustTask.cjs:
// 1. Detects { runtime: 'rust' } option
// 2. Transpiles TypeScript to Rust via typescriptToRust.cjs
// 3. Generates [RustSource] attribute with Rust code
// 4. Creates RustInterop.Call wrapper for FFI
// 5. Adds Rayon parallel iteration when { parallel: true }
