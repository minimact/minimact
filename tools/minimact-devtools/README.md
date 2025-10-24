# Minimact DevTools 🔭🌵

**PostgreSQL Inspector for the DOM**

Chrome DevTools extension that lets you query, inspect, and debug Minimact applications like a relational database.

---

## Features

### 🔍 SQL Console
Query the DOM with SQL-like syntax:
```javascript
useDomQuery()
  .from('.card')
  .where(c => c.state.hover && c.isIntersecting)
  .orderBy(c => c.history.changeCount, 'DESC')
  .limit(10)
```

### 🎯 Element Inspector
See every tracker, state, and prediction for any element in real-time.

### ⏱️ Timeline Viewer
Visualize state changes over time. Rewind and replay like a VCR.

### 🔮 Prediction Visualizer
See what Minimact predicts will happen next, with confidence scores.

### 📊 Performance Profiler
Measure query performance, tracker overhead, and cache hit rates.

### 🌐 Server Sync Monitor
Watch SignalR messages flow between client and server.

---

## Installation

### From Source
```bash
npm install
npm run build
```

Then load `dist/` as an unpacked extension in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

### From Chrome Web Store
Coming soon!

---

## Usage

1. Open Chrome DevTools (F12)
2. Navigate to the **"Minimact"** tab
3. Start querying!

---

## Architecture

```
┌─────────────────────────────────┐
│     Chrome DevTools Panel       │
│   (React UI with live updates)  │
└─────────────────────────────────┘
              ↕
┌─────────────────────────────────┐
│     Background Service Worker   │
│   (Message passing coordinator) │
└─────────────────────────────────┘
              ↕
┌─────────────────────────────────┐
│      Injected DevTools Agent    │
│  (Hooks into Minimact registry) │
└─────────────────────────────────┘
              ↕
┌─────────────────────────────────┐
│       Your Minimact App         │
└─────────────────────────────────┘
```

---

## The Vision

Minimact treats the DOM as a **living, queryable database**. This DevTools extension gives you a window into that database.

- See what SQL would see
- Query like PostgreSQL
- Debug like you're inspecting a database schema

**The DOM is now a database. 🗃️⚡**

---

## License

MIT
