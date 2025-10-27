using AngleSharp;
using AngleSharp.Dom;
using AngleSharp.Html.Dom;
using AngleSharp.Html.Parser;
using System.Collections.Generic;
using System.Linq;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Real DOM implementation using AngleSharp
/// This is a real HTML DOM that the JavaScript runtime can interact with
/// </summary>
public class RealDOM
{
    private readonly IBrowsingContext _context;
    private IDocument _document;

    public RealDOM()
    {
        // Create AngleSharp browsing context
        var config = Configuration.Default;
        _context = BrowsingContext.New(config);

        // Create initial empty document
        _document = _context.GetService<IHtmlParser>()!.ParseDocument("<!DOCTYPE html><html><head></head><body></body></html>");
    }

    /// <summary>
    /// Get the document object
    /// </summary>
    public IDocument Document => _document;

    /// <summary>
    /// Get element by ID
    /// </summary>
    public IElement? GetElementById(string id)
    {
        return _document.GetElementById(id);
    }

    /// <summary>
    /// Query selector
    /// </summary>
    public IElement? QuerySelector(string selector)
    {
        return _document.QuerySelector(selector);
    }

    /// <summary>
    /// Query selector all
    /// </summary>
    public IHtmlCollection<IElement> QuerySelectorAll(string selector)
    {
        return _document.QuerySelectorAll(selector);
    }

    /// <summary>
    /// Create element
    /// </summary>
    public IElement CreateElement(string tagName)
    {
        return _document.CreateElement(tagName);
    }

    /// <summary>
    /// Create text node
    /// </summary>
    public IText CreateTextNode(string data)
    {
        return _document.CreateTextNode(data);
    }

    /// <summary>
    /// Get or set document body HTML
    /// </summary>
    public string BodyHtml
    {
        get => _document.Body?.InnerHtml ?? "";
        set
        {
            if (_document.Body != null)
            {
                _document.Body.InnerHtml = value;
            }
        }
    }

    /// <summary>
    /// Get full HTML document
    /// </summary>
    public string ToHTML()
    {
        return _document.ToHtml();
    }

    /// <summary>
    /// Load HTML into the document
    /// </summary>
    public void LoadHTML(string html)
    {
        _document = _context.GetService<IHtmlParser>()!.ParseDocument(html);
    }

    /// <summary>
    /// Get element by path (array of child indices)
    /// </summary>
    public INode? GetElementByPath(int[] path)
    {
        INode? current = _document.Body;

        foreach (var index in path)
        {
            if (current == null || current.ChildNodes.Length <= index)
                return null;

            current = current.ChildNodes[index];
        }

        return current;
    }

    /// <summary>
    /// Set attribute on element
    /// </summary>
    public void SetAttribute(IElement element, string name, string value)
    {
        element.SetAttribute(name, value);
    }

    /// <summary>
    /// Get attribute from element
    /// </summary>
    public string? GetAttribute(IElement element, string name)
    {
        return element.GetAttribute(name);
    }

    /// <summary>
    /// Remove attribute from element
    /// </summary>
    public void RemoveAttribute(IElement element, string name)
    {
        element.RemoveAttribute(name);
    }

    /// <summary>
    /// Append child to element
    /// </summary>
    public void AppendChild(INode parent, INode child)
    {
        parent.AppendChild(child);
    }

    /// <summary>
    /// Insert child before reference node
    /// </summary>
    public void InsertBefore(INode parent, INode newChild, INode? referenceChild)
    {
        parent.InsertBefore(newChild, referenceChild);
    }

    /// <summary>
    /// Remove child from parent
    /// </summary>
    public void RemoveChild(INode parent, INode child)
    {
        parent.RemoveChild(child);
    }

    /// <summary>
    /// Replace child
    /// </summary>
    public void ReplaceChild(INode parent, INode newChild, INode oldChild)
    {
        parent.ReplaceChild(newChild, oldChild);
    }

    /// <summary>
    /// Get text content of node
    /// </summary>
    public string GetTextContent(INode node)
    {
        return node.TextContent;
    }

    /// <summary>
    /// Set text content of node
    /// </summary>
    public void SetTextContent(INode node, string text)
    {
        node.TextContent = text;
    }

    /// <summary>
    /// Get inner HTML of element
    /// </summary>
    public string GetInnerHTML(IElement element)
    {
        return element.InnerHtml;
    }

    /// <summary>
    /// Set inner HTML of element
    /// </summary>
    public void SetInnerHTML(IElement element, string html)
    {
        element.InnerHtml = html;
    }

    /// <summary>
    /// Get child nodes
    /// </summary>
    public INodeList GetChildNodes(INode node)
    {
        return node.ChildNodes;
    }

    /// <summary>
    /// Clone the DOM for snapshots
    /// </summary>
    public RealDOM Clone()
    {
        var clone = new RealDOM();
        clone.LoadHTML(this.ToHTML());
        return clone;
    }

    /// <summary>
    /// Clear the body
    /// </summary>
    public void Clear()
    {
        if (_document.Body != null)
        {
            _document.Body.InnerHtml = "";
        }
    }

    /// <summary>
    /// Event delegation - get all elements with event attributes
    /// </summary>
    public List<(IElement element, string eventType, string? handlerId)> GetEventHandlers()
    {
        var handlers = new List<(IElement, string, string?)>();
        var elements = _document.QuerySelectorAll("[data-onclick], [data-onchange], [data-oninput], [onclick], [onchange], [oninput]");

        foreach (var element in elements)
        {
            // Check for data-onclick (Minimact style)
            var onclick = element.GetAttribute("data-onclick");
            if (!string.IsNullOrEmpty(onclick))
            {
                handlers.Add((element, "click", onclick));
            }

            // Check for onchange
            var onchange = element.GetAttribute("data-onchange");
            if (!string.IsNullOrEmpty(onchange))
            {
                handlers.Add((element, "change", onchange));
            }

            // Check for oninput
            var oninput = element.GetAttribute("data-oninput");
            if (!string.IsNullOrEmpty(oninput))
            {
                handlers.Add((element, "input", oninput));
            }
        }

        return handlers;
    }
}
