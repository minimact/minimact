using Minimact.AspNetCore.Plugins;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Attributes;
using Minimact.Powered.Models;
using static Minimact.Powered.Utils.VNodeHelpers;

namespace Minimact.Powered.Plugins;

[MinimactPlugin("PoweredBadge")]
[LoopTemplate("expanded", @"{
        ""stateKey"": ""expanded"",
        ""template"": {
            ""type"": ""Element"",
            ""tag"": ""div"",
            ""propsTemplates"": {
                ""className"": {
                    ""template"": ""minimact-powered minimact-powered--{0} {1}"",
                    ""bindings"": [""state.position"", ""state.expanded ? 'expanded' : 'collapsed'""],
                    ""slots"": [0, 1],
                    ""type"": ""dynamic"",
                    ""conditionalTemplates"": {
                        ""expanded"": {
                            ""true"": ""expanded"",
                            ""false"": ""collapsed""
                        }
                    }
                }
            }
        }
    }")]
public class PoweredBadgePlugin : MinimactPlugin<PoweredBadgeState>
{
    public override string Name => "PoweredBadge";
    public override string Version => "1.0.0";
    public override string Description => "Interactive 'Powered by Minimact' badge with smooth slide-out animation";
    public override string Author => "Minimact Team";

    protected override VNode RenderTyped(PoweredBadgeState state)
    {
        // Determine positioning class
        var positionClass = state.Position switch
        {
            BadgePosition.TopLeft => "minimact-powered--top-left",
            BadgePosition.TopRight => "minimact-powered--top-right",
            BadgePosition.BottomLeft => "minimact-powered--bottom-left",
            BadgePosition.BottomRight => "minimact-powered--bottom-right",
            _ => "minimact-powered--bottom-right"
        };

        // Determine theme class
        var themeClass = state.Theme == "light" ? "minimact-powered--light" : "minimact-powered--dark";

        // Determine expanded class
        var expandedClass = state.Expanded ? "expanded" : "collapsed";

        // Link URL
        var linkUrl = state.LinkUrl ?? "https://minimact.dev";

        // Create the badge container
        var badge = Element("div", new
        {
            className = $"minimact-powered {positionClass} {themeClass} {expandedClass}",
            style = $"--animation-duration: {state.AnimationDuration}ms;",
            data_minimact_badge = "true"
        },
            // Inner content wrapper
            Element("a", new
            {
                href = linkUrl,
                target = state.OpenInNewTab ? "_blank" : "_self",
                rel = state.OpenInNewTab ? "noopener noreferrer" : null,
                className = "minimact-powered__link"
            },
                // Cactus icon (left part)
                RenderCactusIcon(),

                // Text content (slides in from right)
                Element("div", new { className = "minimact-powered__text" },
                    Element("div", new { className = "minimact-powered__title" }, "Powered by"),
                    Element("div", new { className = "minimact-powered__brand" }, "Minimact"),
                    Element("div", new { className = "minimact-powered__tagline" }, "Minimal Anticipatory Client Technology ⬇️")
                )
            )
        );

        return badge;
    }

    /// <summary>
    /// Render the cactus icon SVG
    /// Based on powered21-left.png
    /// </summary>
    private VNode RenderCactusIcon()
    {
        return Element("div", new { className = "minimact-powered__icon" },
            Element("svg", new
            {
                width = 48,
                height = 64,
                viewBox = "0 0 48 64",
                fill = "none",
                xmlns = "http://www.w3.org/2000/svg"
            },
                // Cactus body (green gradient)
                Element("defs", null,
                    Element("linearGradient", new
                    {
                        id = "cactusGradient",
                        x1 = "0%",
                        y1 = "0%",
                        x2 = "0%",
                        y2 = "100%"
                    },
                        Element("stop", new { offset = "0%", stopColor = "#4CAF50" }),
                        Element("stop", new { offset = "100%", stopColor = "#2E7D32" })
                    )
                ),

                // Main cactus body (rounded rectangle)
                Element("rect", new
                {
                    x = 14,
                    y = 10,
                    width = 20,
                    height = 45,
                    rx = 10,
                    fill = "url(#cactusGradient)"
                }),

                // Left arm
                Element("ellipse", new
                {
                    cx = 10,
                    cy = 25,
                    rx = 8,
                    ry = 12,
                    fill = "url(#cactusGradient)"
                }),

                // Right arm
                Element("ellipse", new
                {
                    cx = 38,
                    cy = 30,
                    rx = 8,
                    ry = 12,
                    fill = "url(#cactusGradient)"
                }),

                // Minimact logo (water droplet in center)
                Element("path", new
                {
                    d = "M 24 35 C 24 35, 20 40, 20 43 C 20 46, 21.8 48, 24 48 C 26.2 48, 28 46, 28 43 C 28 40, 24 35, 24 35 Z",
                    fill = "#4FC3F7",
                    opacity = 0.9
                }),

                // Sparkle effect
                Element("circle", new { cx = 26, cy = 38, r = 1.5, fill = "white", opacity = 0.8 })
            )
        );
    }

    public override PluginAssets GetAssets()
    {
        return new PluginAssets
        {
            CssFiles = new List<string> { "/plugin-assets/Powered@1.0.0/powered-badge.css" },
            Source = AssetSource.Embedded
        };
    }
}
