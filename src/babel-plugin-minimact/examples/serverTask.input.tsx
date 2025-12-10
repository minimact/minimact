/**
 * Example: serverTask.cjs - Generates C# async Task methods from useServerTask
 *
 * Output structure:
 * - [ServerTask("serverTask_0")] attribute
 * - [ServerTask("serverTask_1", Streaming = true)] for streaming
 * - Method signature: private async Task<T> ServerTask_0(params, IProgress<double> progress, CancellationToken cancellationToken)
 * - Streaming signature: private async IAsyncEnumerable<T> ServerTask_0(params, [EnumeratorCancellation] CancellationToken cancellationToken)
 *
 * Body transpilation via typescriptToCSharp.cjs:
 * - for-of → foreach
 * - fetch → _httpClient.GetStringAsync
 * - try/catch → try/catch with Exception
 * - yield → yield return
 */
import { useState, useServerTask } from '@minimact/core';

interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

export function ServerTaskExample() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Simple task - no params, returns Task<List<User>>
  const fetchUsers = useServerTask(async () => {
    const response = await fetch('/api/users');
    return await response.json();
  });

  // 2. Task with typed parameters
  const fetchUser = useServerTask(async (id: number) => {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  });

  // 3. Task with multiple parameters and complex logic
  const searchUsers = useServerTask(async (query: string, limit: number) => {
    const results: User[] = [];
    const response = await fetch(`/api/users?q=${query}&limit=${limit}`);
    const data = await response.json();

    // for-of → foreach
    for (const user of data) {
      if (user.active) {
        results.push(user);
      }
    }
    return results;
  });

  // 4. Streaming task - uses yield → IAsyncEnumerable<string>
  const streamResults = useServerTask(async function* (query: string) {
    yield 'Starting search...';

    const response = await fetch(`/api/search?q=${query}`);
    const data = await response.json();

    for (const item of data) {
      // Each yield becomes yield return in C#
      yield item.name;
    }

    yield 'Search complete!';
  }, { stream: true, estimatedChunks: 10 });

  // 5. Task with progress reporting
  const processData = useServerTask(async (items: string[]) => {
    const processed: string[] = [];

    for (let i = 0; i < items.length; i++) {
      // progress.report → progress.Report
      progress.report(i / items.length);

      processed.push(items[i].toUpperCase());
    }

    progress.report(1.0);
    return processed;
  });

  // 6. Task with cancellation support
  const longRunningTask = useServerTask(async (data: number[]) => {
    const results: number[] = [];

    for (const item of data) {
      // cancellationToken.requested → cancellationToken.IsCancellationRequested
      if (cancellationToken.requested) {
        break;
      }

      results.push(item * 2);
    }

    return results;
  });

  // 7. Task with try/catch error handling
  const safeTask = useServerTask(async (id: number) => {
    try {
      const response = await fetch(`/api/items/${id}`);
      if (!response.ok) {
        throw new Error('Item not found');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch:', error);
      return null;
    }
  });

  return (
    <div>
      <button onClick={() => fetchUsers()}>Load Users</button>
      <button onClick={() => searchUsers('john', 10)}>Search</button>
      <button onClick={() => streamResults('query')}>Stream</button>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
