/**
 * Example: expressions.cjs - JS to C# expression conversion
 *
 * Features covered:
 * - Literals: string, number, boolean, null, undefined
 * - Identifiers and member expressions
 * - Binary/unary/logical operators (===, !==, &&, ||, !)
 * - Ternary conditional
 * - Array expressions with spread
 * - Object expressions
 * - Template literals → C# string interpolation
 * - Arrow functions → C# lambdas
 * - Method calls: .map()→.Select(), .filter()→.Where(), .reduce()→.Aggregate()
 * - String methods: toUpperCase, toLowerCase, trim, includes, indexOf, etc.
 * - Number methods: toFixed, toLocaleString
 * - Math methods: Math.max, Math.min, Math.floor, etc.
 * - Date: new Date() → DateTime
 * - Promise: Promise.resolve → Task.FromResult
 * - fetch → HttpClient
 * - console.log → Console.WriteLine
 * - setTimeout → Task.Delay
 * - Error → Exception
 * - Optional chaining: obj?.prop → obj?.Prop
 * - ref.current → ref (unwrap)
 * - state.key → GetState<dynamic>("key")
 * - setState(key, value) → SetState(key, value)
 */
import { useState, useRef } from '@minimact/core';

export function ExpressionsExample() {
  const [count, setCount] = useState(0);
  const [price, setPrice] = useState(19.99);
  const [name, setName] = useState('John');
  const [items, setItems] = useState(['a', 'b', 'c']);
  const [user, setUser] = useState({ firstName: 'John', lastName: 'Doe' });
  const inputRef = useRef(null);

  // --- Literals ---
  const str = "hello";
  const num = 42;
  const bool = true;
  const nil = null;
  const undef = undefined; // → null in C#

  // --- Binary operators ---
  const sum = count + 1;
  const product = count * price;
  const isEqual = count === 0; // → count == 0
  const isNotEqual = count !== 0; // → count != 0
  const isGreater = count > 5;
  const complex = (count + 1) * (price - 5);

  // --- Unary operators ---
  const negated = !bool;
  const negative = -count;

  // --- Logical operators ---
  const and = count > 0 && name.length > 0; // → && with null checks
  const or = name || 'default'; // → name ?? "default"

  // --- Ternary ---
  const status = count > 0 ? 'positive' : 'zero';

  // --- Array expressions ---
  const arr = [1, 2, 3]; // → new List<object> { 1, 2, 3 }
  const strArr = ['a', 'b']; // → new List<string> { "a", "b" }
  const spread = [...items, 'd']; // → items.Concat(new[] { "d" }).ToList()

  // --- Object expressions ---
  const obj = { x: 1, y: 2 }; // → new { x = 1, y = 2 }
  const hyphenObj = { 'data-id': 1 }; // → new Dictionary<string, object> { ["data-id"] = 1 }

  // --- Template literals ---
  const greeting = `Hello, ${name}!`; // → $"Hello, {name}!"
  const multiExpr = `${count} items at $${price}`; // → $"{count} items at ${price}"

  // --- String methods ---
  const upper = name.toUpperCase(); // → name.ToUpper()
  const lower = name.toLowerCase(); // → name.ToLower()
  const trimmed = name.trim(); // → name.Trim()
  const hasA = name.includes('a'); // → name.Contains("a")
  const idx = name.indexOf('o'); // → name.IndexOf("o")
  const starts = name.startsWith('J'); // → name.StartsWith("J")
  const ends = name.endsWith('n'); // → name.EndsWith("n")
  const sub = name.substring(0, 2); // → name.Substring(0, 2)
  const padded = String(count).padStart(3, '0'); // → count.ToString().PadLeft(3, '0')

  // --- Number methods ---
  const fixed = price.toFixed(2); // → price.ToString("F2")
  const locale = price.toLocaleString(); // → price.ToString("g")
  const complexFixed = (price * count).toFixed(2); // → (price * count).ToString("F2")

  // --- Math methods ---
  const max = Math.max(count, 10); // → Math.Max(count, 10)
  const min = Math.min(count, 0); // → Math.Min(count, 0)
  const floor = Math.floor(price); // → (int)Math.Floor(price)
  const ceil = Math.ceil(price); // → (int)Math.Ceil(price)
  const round = Math.round(price); // → (int)Math.Round(price)
  const pow = Math.pow(count, 2); // → Math.Pow(count, 2)
  const rand = Math.random(); // → new Random().NextDouble()

  // --- Array methods ---
  const mapped = items.map(x => x.toUpperCase()); // → items.Select(x => x.ToUpper()).ToList()
  const filtered = items.filter(x => x !== 'b'); // → items.Where(x => x != "b").ToList()
  const filterBool = items.filter(Boolean); // → items.Where(x => x != null).ToList()
  const reduced = items.reduce((acc, x) => acc + x, ''); // → items.Aggregate("", (acc, x) => acc + x)
  const itemCount = items.length; // → MinimactHelpers.GetLength(items)

  // --- Date ---
  const now = new Date(); // → DateTime.Now
  const parsed = new Date('2024-01-01'); // → DateTime.Parse("2024-01-01")
  const timestamp = Date.now(); // → DateTimeOffset.Now.ToUnixTimeMilliseconds()

  // --- Error ---
  const err = new Error('Something went wrong'); // → new Exception("Something went wrong")

  // --- Console ---
  const log = () => console.log('Debug:', count); // → Console.WriteLine("Debug:" + count)

  // --- setTimeout ---
  const delayed = () => setTimeout(() => setCount(count + 1), 1000);
  // → Task.Delay(1000).ContinueWith(_ => { SetState(nameof(count), count + 1); })

  // --- encodeURIComponent ---
  const encoded = encodeURIComponent(name); // → Uri.EscapeDataString(name)

  // --- Optional chaining ---
  const email = user?.email; // → user?.Email
  const optMap = items?.map(x => x); // → ((IEnumerable<dynamic>)items)?.Select(...)

  // --- ref.current unwrapping ---
  const inputValue = inputRef.current; // → inputRef (no .current in C#)

  // --- state proxy ---
  // state.key → GetState<dynamic>("key")
  // setState("key", value) → SetState("key", value)

  // --- Promise/Task ---
  const resolved = Promise.resolve(42); // → Task.FromResult(42)
  const rejected = Promise.reject('error'); // → Task.FromException(new Exception("error"))

  // --- Object.keys ---
  const keys = Object.keys(user); // → ((IDictionary<string, object>)user).Keys

  // --- String() conversion ---
  const str2 = String(count); // → count.ToString()

  return (
    <div>
      <p>Count: {count}</p>
      <p>Price: ${price.toFixed(2)}</p>
      <p>Name: {name.toUpperCase()}</p>
      <p>Items: {itemCount}</p>
      <p>Optional: {user?.email}</p>
      <p>Greeting: {greeting}</p>
      <p>Status: {status}</p>
    </div>
  );
}
