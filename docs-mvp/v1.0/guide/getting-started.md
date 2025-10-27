# Getting Started

Welcome to Minimact! This guide will help you set up your first server-side React application with ASP.NET Core.

## Installation

Install Minimact via NuGet:

```bash
dotnet add package Minimact.AspNetCore
```

Or install the CLI globally:

```bash
npm install -g minimact-cli
```

## Create Your First Project

Using the CLI:

```bash
minimact new my-app
cd my-app
minimact dev
```

Or manually add to an existing ASP.NET Core project:

```bash
dotnet new web -n MyMinimactApp
cd MyMinimactApp
dotnet add package Minimact.AspNetCore
```

## Basic Setup

### 1. Configure Program.cs

```csharp
using Minimact.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();

var app = builder.Build();

// Use Minimact middleware
app.UseMinimact();

// Map Minimact hub
app.MapMinimactHub("/minimact");

app.Run();
```

### 2. Create Your First Component

Create a file `Counter.tsx`:

```tsx
import { useState } from 'minimact';

export function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <h1>Count: {count}</h1>
            <button onClick={() => setCount(count + 1)}>
                Increment
            </button>
        </div>
    );
}
```

### 3. Transpile to C#

```bash
minimact transpile Counter.tsx
```

This generates `Counter.cs`:

```csharp
public class Counter : MinimactComponent
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

### 4. Register the Component

In your `Program.cs`:

```csharp
builder.Services.AddMinimact(options =>
{
    options.RegisterComponent<Counter>();
});
```

## Running Your App

```bash
dotnet run
```

Navigate to `http://localhost:5000` and you should see your counter!

## What's Next?

- Learn about [Core Concepts](/guide/concepts)
- Explore [Predictive Rendering](/guide/predictive-rendering)
- Check out the [API Reference](/api/hooks)
