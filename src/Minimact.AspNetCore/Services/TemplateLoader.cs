using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Models;

namespace Minimact.AspNetCore.Services;

/// <summary>
/// Service for loading Babel-generated template JSON files
/// Templates are extracted at build time and loaded at runtime for predictive rendering
/// </summary>
public class TemplateLoader
{
    private readonly ILogger<TemplateLoader> _logger;
    private readonly Dictionary<string, TemplateManifest> _cache = new();

    public TemplateLoader(ILogger<TemplateLoader> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Load templates for a component from its .templates.json file
    /// Caches the result for subsequent requests
    /// </summary>
    /// <param name="componentName">Component class name (e.g., "ProductDetailsPage")</param>
    /// <param name="basePath">Base path to search for template files (defaults to Generated folder)</param>
    /// <returns>Template manifest or null if file not found</returns>
    public TemplateManifest? LoadTemplates(string componentName, string? basePath = null)
    {
        // Check cache first
        if (_cache.TryGetValue(componentName, out var cached))
        {
            return cached;
        }

        try
        {
            // Default to Generated folder (where Babel outputs templates)
            basePath ??= Path.Combine(Directory.GetCurrentDirectory(), "Generated");

            var templatePath = Path.Combine(basePath, $"{componentName}.templates.json");

            if (!File.Exists(templatePath))
            {
                _logger.LogDebug("[TemplateLoader] Template file not found: {Path}", templatePath);
                return null;
            }

            var json = File.ReadAllText(templatePath);
            var manifest = JsonSerializer.Deserialize<TemplateManifest>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (manifest == null)
            {
                _logger.LogWarning("[TemplateLoader] Failed to deserialize template file: {Path}", templatePath);
                return null;
            }

            // Cache the result
            _cache[componentName] = manifest;

            _logger.LogInformation(
                "[TemplateLoader] ✓ Loaded {Count} templates for {Component}",
                manifest.Templates?.Count ?? 0,
                componentName
            );

            return manifest;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TemplateLoader] Error loading templates for {Component}", componentName);
            return null;
        }
    }

    /// <summary>
    /// Convert template manifest to ComponentMetadata for Rust predictor
    /// </summary>
    public ComponentMetadata ToComponentMetadata(string componentId, TemplateManifest manifest)
    {
        return new ComponentMetadata
        {
            ComponentId = componentId,
            ComponentName = manifest.Component ?? string.Empty,
            Templates = manifest.Templates
        };
    }

    /// <summary>
    /// Clear the template cache (useful for hot reload scenarios)
    /// </summary>
    public void ClearCache()
    {
        _cache.Clear();
        _logger.LogInformation("[TemplateLoader] Template cache cleared");
    }

    /// <summary>
    /// Clear cache for a specific component
    /// </summary>
    public void ClearCache(string componentName)
    {
        if (_cache.Remove(componentName))
        {
            _logger.LogInformation("[TemplateLoader] Cache cleared for {Component}", componentName);
        }
    }

    /// <summary>
    /// Load templates for a parent component and all its child components
    /// Used for lifted state prediction where parent needs child templates
    /// </summary>
    /// <param name="parentComponent">The parent component instance</param>
    /// <param name="basePath">Base path to search for template files</param>
    /// <returns>Dictionary mapping component names to their templates</returns>
    public Dictionary<string, TemplateManifest> LoadAllForParent(
        MinimactComponent parentComponent,
        string? basePath = null)
    {
        var allTemplates = new Dictionary<string, TemplateManifest>();

        // Load parent's templates
        var parentName = parentComponent.GetType().Name;
        var parentTemplates = LoadTemplates(parentName, basePath);
        if (parentTemplates != null)
        {
            allTemplates["__parent"] = parentTemplates;
            _logger.LogDebug(
                "[TemplateLoader] Loaded parent templates for {Component}",
                parentName
            );
        }

        // Find and load child component templates
        if (parentComponent.CurrentVNode != null)
        {
            FindAndLoadChildTemplates(parentComponent.CurrentVNode, allTemplates, basePath);
        }

        _logger.LogInformation(
            "[TemplateLoader] ✓ Loaded templates for {Parent} and {ChildCount} child component(s)",
            parentName,
            allTemplates.Count - 1 // Subtract parent
        );

        return allTemplates;
    }

    /// <summary>
    /// Recursively find VComponentWrapper nodes and load their templates
    /// </summary>
    private void FindAndLoadChildTemplates(
        VNode node,
        Dictionary<string, TemplateManifest> allTemplates,
        string? basePath)
    {
        if (node is VComponentWrapper wrapper)
        {
            // Load templates for this child component
            if (!allTemplates.ContainsKey(wrapper.ComponentName))
            {
                var childTemplates = LoadTemplates(wrapper.ComponentType, basePath);
                if (childTemplates != null)
                {
                    allTemplates[wrapper.ComponentName] = childTemplates;
                    _logger.LogDebug(
                        "[TemplateLoader] Loaded child templates for {Component} (namespace: {Namespace})",
                        wrapper.ComponentType,
                        wrapper.ComponentName
                    );
                }
            }

            // Recursively render child to find nested components
            try
            {
                var childVNode = wrapper.RenderChild();
                FindAndLoadChildTemplates(childVNode, allTemplates, basePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "[TemplateLoader] Failed to render child component {Component} for template discovery",
                    wrapper.ComponentName
                );
            }
        }
        else if (node is VElement element)
        {
            // Recursively search element children
            foreach (var child in element.Children)
            {
                FindAndLoadChildTemplates(child, allTemplates, basePath);
            }
        }
    }
}

/// <summary>
/// Template manifest structure from Babel plugin output
/// Matches the JSON structure in ComponentName.templates.json files
/// </summary>
public class TemplateManifest
{
    /// <summary>
    /// Component name
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("component")]
    public string? Component { get; set; }

    /// <summary>
    /// Template format version
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("version")]
    public string? Version { get; set; }

    /// <summary>
    /// Timestamp when templates were generated
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("generatedAt")]
    public long GeneratedAt { get; set; }

    /// <summary>
    /// Dictionary of templates keyed by path
    /// Path examples:
    /// - "[0].h1[0].text[0]" (text template)
    /// - "[0].button[0].@style" (attribute template)
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("templates")]
    public Dictionary<string, TemplateInfo>? Templates { get; set; }
}
