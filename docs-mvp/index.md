---
layout: home

hero:
  name: Minimact
  text: Server-side React for ASP.NET Core
  tagline: Build reactive web apps with predictive rendering powered by Rust
  image:
    src: /logo.png
    alt: Minimact
  actions:
    - theme: brand
      text: Get Started
      link: /v1.0/guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/yourusername/minimact

features:
  - icon: 🦕
    title: Server-Side React
    details: Write React components that run on the server with automatic state synchronization to the client.

  - icon: ⚡
    title: Predictive Rendering
    details: Rust-powered reconciliation engine that predicts and pre-renders UI updates before user interactions.

  - icon: 🎯
    title: ASP.NET Core Integration
    details: Seamlessly integrates with ASP.NET Core using SignalR for real-time communication.

  - icon: 🔄
    title: Automatic State Sync
    details: State changes on the server automatically sync to the client with minimal overhead.

  - icon: 📦
    title: Component-Based
    details: Build reusable server-side components with familiar React patterns and hooks.

  - icon: 🚀
    title: High Performance
    details: Optimized for speed with differential updates and efficient patch-based rendering.
---

## Quick Start

```bash
# Install via NuGet
dotnet add package Minimact.AspNetCore

# Or clone the repository
git clone https://github.com/yourusername/minimact.git
```

## Example

```csharp
public class CounterComponent : MinimactComponent
{
    private int count = 0;

    protected override string Render()
    {
        return $@"
            <div>
                <h1>Count: {count}</h1>
                <button onclick='increment'>Increment</button>
            </div>
        ";
    }

    [ServerMethod]
    public void Increment()
    {
        count++;
        StateHasChanged();
    }
}
```
