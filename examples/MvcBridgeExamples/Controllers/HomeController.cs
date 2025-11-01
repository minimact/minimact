using Microsoft.AspNetCore.Mvc;

namespace MvcBridgeExamples.Controllers;

/// <summary>
/// Home controller - serves landing page
/// </summary>
public class HomeController : Controller
{
    public IActionResult Index()
    {
        return Content(@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>MVC Bridge Examples - Minimact</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 60px;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 3rem;
        }
        .examples {
            display: grid;
            gap: 20px;
        }
        .example-card {
            padding: 30px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            text-decoration: none;
            color: inherit;
            transition: all 0.3s ease;
            background: #fafafa;
        }
        .example-card:hover {
            border-color: #667eea;
            transform: translateY(-4px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
            background: white;
        }
        .example-card h2 {
            color: #333;
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
        }
        .example-card p {
            color: #666;
            font-size: 1rem;
        }
        .features {
            display: inline-flex;
            gap: 10px;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        .feature-tag {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        .footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #999;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class=""container"">
        <h1>🌵 MVC Bridge Examples</h1>
        <p class=""subtitle"">Minimact + ASP.NET MVC Integration</p>

        <div class=""examples"">
            <a href=""/Examples/Counter"" class=""example-card"">
                <h2>🔢 Counter</h2>
                <p>A simple counter demonstrating mutable state with MVC ViewModels.</p>
                <div class=""features"">
                    <span class=""feature-tag"">Mutable State</span>
                    <span class=""feature-tag"">Immutable Props</span>
                    <span class=""feature-tag"">Basic Example</span>
                </div>
            </a>

            <a href=""/Examples/TodoList"" class=""example-card"">
                <h2>✅ Todo List</h2>
                <p>A todo list demonstrating complex mutable state with nested objects.</p>
                <div class=""features"">
                    <span class=""feature-tag"">Complex State</span>
                    <span class=""feature-tag"">Arrays</span>
                    <span class=""feature-tag"">Filtering</span>
                </div>
            </a>
        </div>

        <div class=""footer"">
            <p>Built with ❤️ using <a href=""https://github.com/minimact/minimact"" target=""_blank"">Minimact</a></p>
            <p style=""margin-top: 10px; font-size: 0.9rem;"">The Posthydrationist Framework 🌵</p>
        </div>
    </div>
</body>
</html>
        ", "text/html");
    }
}
