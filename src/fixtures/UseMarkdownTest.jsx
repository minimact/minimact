import { useMarkdown } from '@minimact/core';

function BlogPost() {
  const [content, setContent] = useMarkdown(`
# Hello World

This is a **markdown** blog post with:
- Server-side parsing
- Safe HTML rendering
- Full reactivity
  `);

  return (
    <div className="blog-post">
      <div markdown>{content}</div>
      <button onClick={() => setContent('# Updated\n\nContent changed!')}>
        Update Content
      </button>
    </div>
  );
}
