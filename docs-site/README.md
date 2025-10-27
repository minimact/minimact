# Minimact Documentation

Official documentation site for Minimact, built with [Nextra](https://nextra.site/).

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
npm start
```

## Structure

```
pages/
├── index.mdx              # Landing page
├── guide/                 # User guides
├── api/                   # API reference
├── examples.mdx           # Examples
└── architecture/          # Architecture docs
```

## Adding Documentation

1. Create `.mdx` file in appropriate directory
2. Add entry to `_meta.json` for navigation
3. Use MDX for enhanced markdown with React components

## Deployment

This site can be deployed to:
- Vercel (recommended)
- Netlify
- GitHub Pages
- Any static hosting service

```bash
npm run build
# Deploy the .next/ folder
```
