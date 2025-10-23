using Markdig;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Helper class for parsing markdown content to HTML
/// </summary>
public static class MarkdownHelper
{
    private static readonly MarkdownPipeline Pipeline = new MarkdownPipelineBuilder()
        .UseAdvancedExtensions()
        .Build();

    /// <summary>
    /// Convert markdown string to HTML
    /// </summary>
    public static string ToHtml(string markdown)
    {
        if (string.IsNullOrEmpty(markdown))
        {
            return string.Empty;
        }

        return Markdown.ToHtml(markdown, Pipeline);
    }
}
