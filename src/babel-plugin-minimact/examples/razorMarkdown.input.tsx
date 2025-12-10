/**
 * Example: razorMarkdown.cjs - Handles Razor markdown conversion
 */
import { useState, useRazorMarkdown } from '@minimact/core';

export function RazorMarkdownExample() {
  const [title, setTitle] = useState('Welcome');
  const [items, setItems] = useState(['First', 'Second', 'Third']);
  const [showDetails, setShowDetails] = useState(true);

  const [content, setContent] = useRazorMarkdown(`
# @title

This is a markdown document with Razor syntax.

## Items

@foreach (var item in items)
{
- **@item**
}

@if (showDetails)
{
## Details

Here are some extra details that only show when enabled.

Total items: **@items.Count**
}
  `);

  return (
    <article>
      <div markdown>{content}</div>
      <button onClick={() => setShowDetails(!showDetails)}>
        Toggle Details
      </button>
    </article>
  );
}
