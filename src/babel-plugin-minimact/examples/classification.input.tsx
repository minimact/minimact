/**
 * Example: classification.cjs - Classifies JSX nodes based on dependencies
 *
 * Classifications:
 * - 'static': No dependencies (no state bindings) → compile-time VNode
 * - 'client': Only client-side dependencies (useClientState, DOM events)
 * - 'server': Only server-side dependencies (useState, useServerTask)
 * - 'hybrid': Mixed client AND server dependencies → needs runtime helpers
 *
 * Function: classifyNode(deps) → 'static' | 'client' | 'server' | 'hybrid'
 *
 * Used for:
 * - Determining which nodes can be statically rendered
 * - Splitting work between client and server
 * - Adding data-minimact-*-scope attributes
 */
import { useState, useClientState } from '@minimact/core';

export function ClassificationExample() {
  // Server state (managed on server, synced via SignalR)
  const [serverCount, setServerCount] = useState(0);
  const [serverResults, setServerResults] = useState<string[]>([]);
  const [serverData, setServerData] = useState({ name: 'John' });

  // Client state (managed locally in browser, no server roundtrip)
  const [clientQuery, setClientQuery] = useClientState('');
  const [clientFilter, setClientFilter] = useClientState('all');
  const [isHovered, setIsHovered] = useClientState(false);

  return (
    <div>
      {/* 1. STATIC: No dependencies - hardcoded content */}
      <h1>Welcome to the App</h1>
      <p>This is static text with no bindings.</p>

      {/* 2. SERVER: Only server state dependencies */}
      <section data-minimact-server-scope>
        <span>Count: {serverCount}</span>
        <p>Name: {serverData.name}</p>
        <ul>
          {serverResults.map(r => <li key={r}>{r}</li>)}
        </ul>
        <button onClick={() => setServerCount(serverCount + 1)}>
          Increment (Server)
        </button>
      </section>

      {/* 3. CLIENT: Only client state dependencies */}
      <section data-minimact-client-scope>
        <input
          value={clientQuery}
          onInput={(e) => setClientQuery(e.target.value)}
          placeholder="Search..."
        />
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
        </select>
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ background: isHovered ? 'yellow' : 'white' }}
        >
          Hover me (client-only interaction)
        </div>
      </section>

      {/* 4. HYBRID: Mixed client AND server dependencies */}
      <section data-minimact-hybrid-scope>
        {/* This binds to both clientQuery (client) and serverResults (server) */}
        <p>
          Searching "{clientQuery}" found {serverResults.length} results
        </p>

        {/* Filter controlled by client, data from server */}
        <ul>
          {serverResults
            .filter(r => clientFilter === 'all' || r.includes(clientFilter))
            .map(r => <li key={r}>{r}</li>)
          }
        </ul>

        {/* Client hover affects display of server data */}
        {isHovered && <pre>{JSON.stringify(serverData)}</pre>}
      </section>

      {/* 5. Nested classification - inner zones can differ from outer */}
      <div data-minimact-server-scope>
        Server wrapper: {serverCount}
        <div data-minimact-client-scope>
          Client inner: {clientQuery}
        </div>
      </div>
    </div>
  );
}
