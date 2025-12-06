/**
 * Test fixture for useServerTask hook
 * useServerTask creates async server operations that can be called from client
 * Supports streaming mode with async function* generators
 */

import { useServerTask, useState } from '@minimact/core';

interface SearchResult {
  id: number;
  title: string;
  description: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

export function TestUseServerTask() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [streamedContent, setStreamedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Simple async server task
  const searchProducts = useServerTask(async function (searchQuery: string): Promise<SearchResult[]> {
    // This runs on the server
    const response = await fetch(`/api/products?q=${searchQuery}`);
    return response.json();
  });

  // Server task with explicit return type
  const fetchUser = useServerTask(async function (userId: number): Promise<User> {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  });

  // Streaming server task (uses async function*)
  const streamAIResponse = useServerTask(async function* (prompt: string): AsyncGenerator<string> {
    // This streams chunks from server to client
    const response = await fetch('/api/ai/stream', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });

    const reader = response.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield new TextDecoder().decode(value);
    }
  }, { streaming: true, estimatedChunks: 50 });

  // Server task with runtime selection
  const computeHeavyTask = useServerTask(async function (data: number[]): Promise<number> {
    // Heavy computation - prefer Rust runtime
    return data.reduce((a, b) => a + b, 0);
  }, { runtime: 'rust', parallel: true });

  const handleSearch = async () => {
    setIsLoading(true);
    const searchResults = await searchProducts(query);
    setResults(searchResults);
    setIsLoading(false);
  };

  const handleStream = async () => {
    setStreamedContent('');
    for await (const chunk of streamAIResponse('Tell me a story')) {
      setStreamedContent(prev => prev + chunk);
    }
  };

  return (
    <div className="server-task-test">
      <h2>Server Task Test</h2>

      <div className="search-section">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
        />
        <button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="results">
        {results.map((result) => (
          <div key={result.id} className="result-item">
            <h3>{result.title}</h3>
            <p>{result.description}</p>
          </div>
        ))}
      </div>

      <div className="streaming-section">
        <h3>AI Streaming</h3>
        <button onClick={handleStream}>Start Stream</button>
        <div className="streamed-content">{streamedContent}</div>
      </div>
    </div>
  );
}
