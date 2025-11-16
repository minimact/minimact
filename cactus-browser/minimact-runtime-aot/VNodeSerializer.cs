using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using Minimact.AspNetCore.Core;

namespace CactusBrowser.Runtime;

public static class VNodeSerializer
{
    public static string Serialize(VNode vnode)
    {
        var json = SerializeNode(vnode);
        return JsonSerializer.Serialize(json, new JsonSerializerOptions
        {
            WriteIndented = true
        });
    }

    private static JsonNode SerializeNode(VNode vnode)
    {
        return vnode switch
        {
            VElement element => new JsonObject
            {
                ["type"] = "VElement",
                ["tag"] = element.Tag,
                ["path"] = element.Path,
                ["props"] = SerializeProps(element.Props),
                ["children"] = new JsonArray(element.Children.Select(SerializeNode).ToArray())
            },
            VText text => new JsonObject
            {
                ["type"] = "VText",
                ["content"] = text.Content,
                ["path"] = text.Path
            },
            VNull vnull => new JsonObject
            {
                ["type"] = "VNull",
                ["path"] = vnull.Path
            },
            _ => new JsonObject { ["type"] = "Unknown" }
        };
    }

    private static JsonObject SerializeProps(System.Collections.Generic.Dictionary<string, string> props)
    {
        var obj = new JsonObject();
        foreach (var (key, value) in props)
        {
            obj[key] = value;
        }
        return obj;
    }
}
