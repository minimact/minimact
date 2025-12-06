/**
 * Test fixture for useMarkdown and useRazorMarkdown hooks
 * useMarkdown parses markdown content on the server
 * useRazorMarkdown supports Razor syntax within markdown
 */

import { useMarkdown, useRazorMarkdown, useState } from '@minimact/core';

export function TestUseMarkdown() {
  const [selectedDoc, setSelectedDoc] = useState('intro');

  // Basic markdown - parsed on server, rendered as HTML
  const introContent = useMarkdown(`
# Welcome to Our App

This is a **bold** statement and this is *italic*.

## Features

- Fast server-side rendering
- Predictive updates
- Real-time sync

### Code Example

\`\`\`typescript
const [count, setCount] = useState(0);
\`\`\`

> This is a blockquote with some important information.

[Learn more](https://example.com/docs)
  `);

  // Markdown with dynamic content via template literals
  const dynamicContent = useMarkdown(`
# Documentation for ${selectedDoc}

Last updated: ${new Date().toLocaleDateString()}

---

${selectedDoc === 'intro' ? '## Introduction\nStart here!' : ''}
${selectedDoc === 'api' ? '## API Reference\nAll the APIs.' : ''}
${selectedDoc === 'examples' ? '## Examples\nCode samples.' : ''}
  `);

  // Razor markdown - supports @variable, @foreach, @if
  const razorContent = useRazorMarkdown(`
# Product Catalog

@foreach(var product in Model.Products)
{
## @product.Name

Price: **$@product.Price**

@if(product.InStock)
{
*Available now!*
}
else
{
~~Out of stock~~
}

---
}

## Summary

Total products: @Model.Products.Count
  `);

  // Markdown from external source (fetched)
  const [externalMd, setExternalMd] = useState('');
  const externalContent = useMarkdown(externalMd, {
    sanitize: true,
    allowedTags: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'code', 'pre', 'ul', 'li']
  });

  const handleLoadExternal = async () => {
    const response = await fetch('/docs/readme.md');
    const text = await response.text();
    setExternalMd(text);
  };

  return (
    <div className="markdown-test">
      <h2>Markdown Test</h2>

      <section className="doc-selector">
        <button
          onClick={() => setSelectedDoc('intro')}
          className={selectedDoc === 'intro' ? 'active' : ''}
        >
          Introduction
        </button>
        <button
          onClick={() => setSelectedDoc('api')}
          className={selectedDoc === 'api' ? 'active' : ''}
        >
          API
        </button>
        <button
          onClick={() => setSelectedDoc('examples')}
          className={selectedDoc === 'examples' ? 'active' : ''}
        >
          Examples
        </button>
      </section>

      <section className="static-markdown">
        <h3>Static Markdown</h3>
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: introContent }}
        />
      </section>

      <section className="dynamic-markdown">
        <h3>Dynamic Markdown (selected: {selectedDoc})</h3>
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: dynamicContent }}
        />
      </section>

      <section className="razor-markdown">
        <h3>Razor Markdown</h3>
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: razorContent }}
        />
      </section>

      <section className="external-markdown">
        <h3>External Markdown</h3>
        <button onClick={handleLoadExternal}>Load External Docs</button>
        {externalMd && (
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: externalContent }}
          />
        )}
      </section>
    </div>
  );
}
