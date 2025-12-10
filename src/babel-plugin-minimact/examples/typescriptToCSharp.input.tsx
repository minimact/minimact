/**
 * Example: typescriptToCSharp.cjs - Transpiles TS async functions to C# async Tasks
 *
 * Transpilation features:
 * - Block statements → C# block syntax
 * - Variable declarations → var
 * - for-of → foreach
 * - for-await-of → await foreach (streaming)
 * - while → while
 * - if/else → if/else with MinimactHelpers.ToBool() for non-boolean conditions
 * - try/catch/finally → try/catch/finally with Exception
 * - throw → throw new Exception()
 * - break/continue → break/continue
 * - yield → yield return (streaming)
 * - Template literals → $"interpolated"
 * - Operators: ===→==, !==→!=
 * - Array methods: .map→.Select, .filter→.Where, .reduce→.Aggregate, etc.
 * - String methods: .trim→.Trim, .toLowerCase→.ToLower, .toUpperCase→.ToUpper, .split→.Split
 * - Math methods: Math.floor→Math.Floor, Math.ceil→Math.Ceiling, etc.
 * - JSON: JSON.stringify→JsonSerializer.Serialize, JSON.parse→JsonSerializer.Deserialize
 * - Console: console.log→Console.WriteLine, console.error→Console.Error.WriteLine
 * - fetch → await _httpClient.GetStringAsync()
 * - Optional chaining: ?.
 * - progress.report() → progress.Report()
 * - cancellationToken.requested → cancellationToken.IsCancellationRequested
 */
import { useServerTask } from '@minimact/core';

export function TypeScriptToCSharpExample() {
  // Complex async function with various TS constructs
  const processData = useServerTask(async (items: string[], threshold: number) => {
    // Variable declarations → var
    const results: string[] = [];
    let count = 0;

    // For-of loop → foreach
    for (const item of items) {
      // If statement with string truthiness → MinimactHelpers.ToBool()
      if (item) {
        // String methods → .Trim().ToUpper()
        const processed = item.trim().toUpperCase();

        // Comparison → ==
        if (processed.length > threshold) {
          results.push(processed);
          count++;
        }
      }
    }

    // Try-catch → try/catch with Exception
    try {
      // fetch → await _httpClient.GetStringAsync()
      const response = await fetch('/api/save');

      // JSON.stringify → JsonSerializer.Serialize
      const body = JSON.stringify(results);

      if (!response.ok) {
        // throw new Error → throw new Exception
        throw new Error('Save failed');
      }
    } catch (error) {
      // console.error → Console.Error.WriteLine
      console.error('Error:', error);
    }

    // Math methods → Math.Floor, Math.Max, etc.
    const floorValue = Math.floor(count / 2);
    const maxValue = Math.max(count, threshold);

    // Template literal → $"interpolated"
    const message = `Processed ${count} items with threshold ${threshold}`;
    console.log(message);

    // Return object → new { Props }
    return { results, count };
  });

  // Streaming server task with yield
  const streamResults = useServerTask(async function* (query: string) {
    // yield → yield return
    yield 'Starting search...';

    const results = await fetch(`/api/search?q=${query}`);
    const data = await results.json();

    for (const item of data) {
      yield item.name;
    }

    yield 'Complete!';
  }, { stream: true });

  // Server task with progress and cancellation
  const heavyTask = useServerTask(async (data: number[]) => {
    for (let i = 0; i < data.length; i++) {
      // progress.report → progress.Report
      progress.report(i / data.length);

      // cancellationToken.requested → cancellationToken.IsCancellationRequested
      if (cancellationToken.requested) {
        break;
      }

      // Array methods → LINQ
      const filtered = data.filter(x => x > 0);
      const mapped = data.map(x => x * 2);
      const found = data.find(x => x === 42);
      const hasAny = data.some(x => x > 100);
      const allPositive = data.every(x => x >= 0);
      const sum = data.reduce((acc, x) => acc + x, 0);
    }

    return data.length;
  });

  // Optional chaining → ?.
  const safeTask = useServerTask(async (user: any) => {
    const name = user?.profile?.name;
    const email = user?.contact?.email;
    return { name, email };
  });

  return <div>Processing...</div>;
}
