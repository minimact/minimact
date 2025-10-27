using AngleSharp.Dom;
using Microsoft.ClearScript;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Bridge between JavaScript and AngleSharp DOM
/// Provides DOM API to JavaScript runtime
/// </summary>
public class DOMBridge
{
    private readonly RealDOM _dom;

    public DOMBridge(RealDOM dom)
    {
        _dom = dom;
    }

    /// <summary>
    /// Get the document object for JS
    /// </summary>
    [ScriptMember("document")]
    public DocumentBridge Document => new DocumentBridge(_dom);

    /// <summary>
    /// Console implementation for JavaScript
    /// </summary>
    [ScriptMember("console")]
    public ConsoleBridge Console => new ConsoleBridge();
}

/// <summary>
/// Document bridge for JavaScript
/// </summary>
public class DocumentBridge
{
    private readonly RealDOM _dom;

    public DocumentBridge(RealDOM dom)
    {
        _dom = dom;
    }

    [ScriptMember("getElementById")]
    public ElementBridge? GetElementById(string id)
    {
        var element = _dom.GetElementById(id);
        return element != null ? new ElementBridge(element, _dom) : null;
    }

    [ScriptMember("querySelector")]
    public ElementBridge? QuerySelector(string selector)
    {
        var element = _dom.QuerySelector(selector);
        return element != null ? new ElementBridge(element, _dom) : null;
    }

    [ScriptMember("querySelectorAll")]
    public object[] QuerySelectorAll(string selector)
    {
        var elements = _dom.QuerySelectorAll(selector);
        return elements.Select(e => new ElementBridge(e, _dom)).ToArray<object>();
    }

    [ScriptMember("createElement")]
    public ElementBridge CreateElement(string tagName)
    {
        var element = _dom.CreateElement(tagName);
        return new ElementBridge(element, _dom);
    }

    [ScriptMember("createTextNode")]
    public TextNodeBridge CreateTextNode(string data)
    {
        var textNode = _dom.CreateTextNode(data);
        return new TextNodeBridge(textNode, _dom);
    }

    [ScriptMember("body")]
    public ElementBridge? Body
    {
        get
        {
            var body = _dom.Document.Body;
            return body != null ? new ElementBridge(body, _dom) : null;
        }
    }
}

/// <summary>
/// Element bridge for JavaScript
/// </summary>
public class ElementBridge
{
    private readonly IElement _element;
    private readonly RealDOM _dom;

    public ElementBridge(IElement element, RealDOM dom)
    {
        _element = element;
        _dom = dom;
    }

    [ScriptMember("id")]
    public string Id
    {
        get => _element.Id;
        set => _element.Id = value;
    }

    [ScriptMember("tagName")]
    public string TagName => _element.TagName;

    [ScriptMember("className")]
    public string ClassName
    {
        get => _element.ClassName;
        set => _element.ClassName = value;
    }

    [ScriptMember("innerHTML")]
    public string InnerHTML
    {
        get => _element.InnerHtml;
        set => _element.InnerHtml = value;
    }

    [ScriptMember("textContent")]
    public string TextContent
    {
        get => _element.TextContent;
        set => _element.TextContent = value;
    }

    [ScriptMember("getAttribute")]
    public string? GetAttribute(string name)
    {
        return _dom.GetAttribute(_element, name);
    }

    [ScriptMember("setAttribute")]
    public void SetAttribute(string name, string value)
    {
        _dom.SetAttribute(_element, name, value);
    }

    [ScriptMember("removeAttribute")]
    public void RemoveAttribute(string name)
    {
        _dom.RemoveAttribute(_element, name);
    }

    [ScriptMember("appendChild")]
    public void AppendChild(object child)
    {
        INode childNode;

        if (child is ElementBridge elementBridge)
        {
            childNode = elementBridge._element;
        }
        else if (child is TextNodeBridge textBridge)
        {
            childNode = textBridge._textNode;
        }
        else
        {
            throw new ArgumentException("Invalid child node type");
        }

        _dom.AppendChild(_element, childNode);
    }

    [ScriptMember("insertBefore")]
    public void InsertBefore(object newChild, object? referenceChild)
    {
        INode newChildNode;
        INode? refChildNode = null;

        if (newChild is ElementBridge newElementBridge)
        {
            newChildNode = newElementBridge._element;
        }
        else if (newChild is TextNodeBridge newTextBridge)
        {
            newChildNode = newTextBridge._textNode;
        }
        else
        {
            throw new ArgumentException("Invalid new child node type");
        }

        if (referenceChild is ElementBridge refElementBridge)
        {
            refChildNode = refElementBridge._element;
        }
        else if (referenceChild is TextNodeBridge refTextBridge)
        {
            refChildNode = refTextBridge._textNode;
        }

        _dom.InsertBefore(_element, newChildNode, refChildNode);
    }

    [ScriptMember("removeChild")]
    public void RemoveChild(object child)
    {
        INode childNode;

        if (child is ElementBridge elementBridge)
        {
            childNode = elementBridge._element;
        }
        else if (child is TextNodeBridge textBridge)
        {
            childNode = textBridge._textNode;
        }
        else
        {
            throw new ArgumentException("Invalid child node type");
        }

        _dom.RemoveChild(_element, childNode);
    }

    [ScriptMember("childNodes")]
    public object[] ChildNodes
    {
        get
        {
            var nodes = _dom.GetChildNodes(_element);
            return nodes.Select<INode, object>(node =>
            {
                if (node is IElement elem)
                {
                    return new ElementBridge(elem, _dom);
                }
                else if (node is IText text)
                {
                    return new TextNodeBridge(text, _dom);
                }
                else
                {
                    return new NodeBridge(node, _dom);
                }
            }).ToArray();
        }
    }

    [ScriptMember("children")]
    public object[] Children
    {
        get
        {
            return _element.Children.Select(e => new ElementBridge(e, _dom)).ToArray<object>();
        }
    }

    public IElement InternalElement => _element;
}

/// <summary>
/// Text node bridge for JavaScript
/// </summary>
public class TextNodeBridge
{
    internal readonly IText _textNode;
    private readonly RealDOM _dom;

    public TextNodeBridge(IText textNode, RealDOM dom)
    {
        _textNode = textNode;
        _dom = dom;
    }

    [ScriptMember("textContent")]
    public string TextContent
    {
        get => _textNode.TextContent;
        set => _textNode.TextContent = value;
    }

    [ScriptMember("nodeType")]
    public int NodeType => 3; // TEXT_NODE

    public IText InternalNode => _textNode;
}

/// <summary>
/// Generic node bridge
/// </summary>
public class NodeBridge
{
    private readonly INode _node;
    private readonly RealDOM _dom;

    public NodeBridge(INode node, RealDOM dom)
    {
        _node = node;
        _dom = dom;
    }

    [ScriptMember("textContent")]
    public string TextContent
    {
        get => _node.TextContent;
        set => _node.TextContent = value;
    }

    [ScriptMember("nodeType")]
    public int NodeType => (int)_node.NodeType;
}

/// <summary>
/// Console implementation for JavaScript
/// </summary>
public class ConsoleBridge
{
    [ScriptMember("log")]
    public void Log(params object[] args)
    {
        Console.WriteLine("[JS] " + string.Join(" ", args));
    }

    [ScriptMember("error")]
    public void Error(params object[] args)
    {
        Console.Error.WriteLine("[JS ERROR] " + string.Join(" ", args));
    }

    [ScriptMember("warn")]
    public void Warn(params object[] args)
    {
        Console.WriteLine("[JS WARN] " + string.Join(" ", args));
    }

    [ScriptMember("info")]
    public void Info(params object[] args)
    {
        Console.WriteLine("[JS INFO] " + string.Join(" ", args));
    }
}
