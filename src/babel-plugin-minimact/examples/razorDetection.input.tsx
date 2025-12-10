/**
 * Example: razorDetection.cjs - Detects Razor syntax in markdown
 */
import { useState, useRazorMarkdown } from '@minimact/core';

export function RazorDetectionExample() {
  const [userName, setUserName] = useState('John');
  const [items, setItems] = useState(['Apple', 'Banana', 'Cherry']);

  // Markdown with Razor syntax
  const [content, setContent] = useRazorMarkdown(`
# Welcome @userName!

Your items:
@foreach (var item in items)
{
  - @item
}

@if (items.Count > 0)
{
  You have **@items.Count** items.
}
else
{
  No items yet.
}
  `);

  return (
    <div markdown>
      {content}
    </div>
  );
}
