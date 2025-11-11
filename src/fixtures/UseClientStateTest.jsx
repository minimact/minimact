import { useState, useClientState } from '@minimact/core';

function SearchBox() {
  const [query, setQuery] = useClientState('');
  const [results, setResults] = useState([]);

  const handleSearch = () => {
    setResults([
      { id: 1, title: 'Result 1' },
      { id: 2, title: 'Result 2' }
    ]);
  };

  return (
    <div className="search-box">
      <input
        value={query}
        onInput={(e) => setQuery(e.target.value)}
        placeholder="Type to search..."
      />
      <button onClick={handleSearch}>Search</button>
      <p>You typed <span data-client-scope>{query.length}</span> chars</p>
      <ul>
        {results.map(r => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
    </div>
  );
}
