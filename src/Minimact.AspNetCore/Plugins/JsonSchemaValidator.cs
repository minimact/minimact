using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;

namespace Minimact.AspNetCore.Plugins;

/// <summary>
/// Validates JSON objects against JSON Schema
/// Supports basic JSON Schema Draft 7 features
/// </summary>
public static class JsonSchemaValidator
{
    /// <summary>
    /// Validate an object against a JSON schema string
    /// </summary>
    public static bool Validate(object state, string schemaJson)
    {
        if (string.IsNullOrWhiteSpace(schemaJson))
        {
            return true; // No schema = always valid
        }

        try
        {
            var stateJson = JsonSerializer.Serialize(state);
            var stateNode = JsonNode.Parse(stateJson);
            var schemaNode = JsonNode.Parse(schemaJson);

            if (stateNode == null || schemaNode == null)
            {
                return false;
            }

            return ValidateNode(stateNode, schemaNode?.AsObject());
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static bool ValidateNode(JsonNode node, JsonObject? schema)
    {
        if (schema == null)
        {
            return true;
        }

        // Type validation
        if (schema.TryGetPropertyValue("type", out var typeNode))
        {
            var expectedType = typeNode?.ToString();
            if (!ValidateType(node, expectedType))
            {
                return false;
            }
        }

        // Required properties
        if (schema.TryGetPropertyValue("required", out var requiredNode) && requiredNode is JsonArray requiredArray)
        {
            if (node is JsonObject obj)
            {
                foreach (var requiredProp in requiredArray)
                {
                    var propName = requiredProp?.ToString();
                    if (propName != null && !obj.ContainsKey(propName))
                    {
                        return false;
                    }
                }
            }
        }

        // Properties validation
        if (schema.TryGetPropertyValue("properties", out var propertiesNode) && propertiesNode is JsonObject properties)
        {
            if (node is JsonObject obj)
            {
                foreach (var prop in properties)
                {
                    if (obj.TryGetPropertyValue(prop.Key, out var value))
                    {
                        if (prop.Value is JsonObject propSchema)
                        {
                            if (!ValidateNode(value!, propSchema))
                            {
                                return false;
                            }
                        }
                    }
                }
            }
        }

        // Enum validation
        if (schema.TryGetPropertyValue("enum", out var enumNode) && enumNode is JsonArray enumArray)
        {
            var nodeString = node.ToJsonString();
            var found = false;
            foreach (var enumValue in enumArray)
            {
                if (enumValue?.ToJsonString() == nodeString)
                {
                    found = true;
                    break;
                }
            }
            if (!found)
            {
                return false;
            }
        }

        // Numeric constraints
        if (node is JsonValue numericValue)
        {
            double numValue = 0;
            bool isNumeric = false;

            if (numericValue.TryGetValue<int>(out var intValue))
            {
                numValue = intValue;
                isNumeric = true;
            }
            else if (numericValue.TryGetValue<double>(out var doubleValue))
            {
                numValue = doubleValue;
                isNumeric = true;
            }

            if (isNumeric)
            {

                if (schema.TryGetPropertyValue("minimum", out var minNode))
                {
                    if (minNode!.AsValue().TryGetValue<double>(out var min) && numValue < min)
                    {
                        return false;
                    }
                }

                if (schema.TryGetPropertyValue("maximum", out var maxNode))
                {
                    if (maxNode!.AsValue().TryGetValue<double>(out var max) && numValue > max)
                    {
                        return false;
                    }
                }
            }
        }

        // String constraints
        if (node is JsonValue strValue && strValue.TryGetValue<string>(out var str))
        {
            if (schema.TryGetPropertyValue("minLength", out var minLengthNode))
            {
                if (minLengthNode!.AsValue().TryGetValue<int>(out var minLength) && str.Length < minLength)
                {
                    return false;
                }
            }

            if (schema.TryGetPropertyValue("maxLength", out var maxLengthNode))
            {
                if (maxLengthNode!.AsValue().TryGetValue<int>(out var maxLength) && str.Length > maxLength)
                {
                    return false;
                }
            }
        }

        // Array validation
        if (node is JsonArray array)
        {
            if (schema.TryGetPropertyValue("minItems", out var minItemsNode))
            {
                if (minItemsNode!.AsValue().TryGetValue<int>(out var minItems) && array.Count < minItems)
                {
                    return false;
                }
            }

            if (schema.TryGetPropertyValue("maxItems", out var maxItemsNode))
            {
                if (maxItemsNode!.AsValue().TryGetValue<int>(out var maxItems) && array.Count > maxItems)
                {
                    return false;
                }
            }

            if (schema.TryGetPropertyValue("items", out var itemsNode) && itemsNode is JsonObject itemSchema)
            {
                foreach (var item in array)
                {
                    if (item != null && !ValidateNode(item, itemSchema))
                    {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    private static bool ValidateType(JsonNode node, string? expectedType)
    {
        if (string.IsNullOrEmpty(expectedType))
        {
            return true;
        }

        return expectedType switch
        {
            "null" => node is JsonValue value && value.GetValueKind() == JsonValueKind.Null,
            "boolean" => node is JsonValue value && value.TryGetValue<bool>(out _),
            "number" => node is JsonValue value && (value.TryGetValue<int>(out _) || value.TryGetValue<double>(out _)),
            "integer" => node is JsonValue value && value.TryGetValue<int>(out _),
            "string" => node is JsonValue value && value.TryGetValue<string>(out _),
            "array" => node is JsonArray,
            "object" => node is JsonObject,
            _ => true
        };
    }
}

/// <summary>
/// Generates JSON Schema from C# types
/// </summary>
public static class JsonSchemaGenerator
{
    /// <summary>
    /// Generate JSON Schema from a C# type
    /// </summary>
    public static string Generate<T>()
    {
        return Generate(typeof(T));
    }

    /// <summary>
    /// Generate JSON Schema from a C# type
    /// </summary>
    public static string Generate(Type type)
    {
        var schema = new JsonObject
        {
            ["$schema"] = "http://json-schema.org/draft-07/schema#",
            ["type"] = "object"
        };

        var properties = new JsonObject();
        var required = new JsonArray();

        foreach (var prop in type.GetProperties())
        {
            var propSchema = GeneratePropertySchema(prop.PropertyType);
            properties[JsonNamingPolicy.CamelCase.ConvertName(prop.Name)] = propSchema;

            // Mark as required if not nullable
            if (!IsNullable(prop.PropertyType))
            {
                required.Add(JsonNamingPolicy.CamelCase.ConvertName(prop.Name));
            }
        }

        schema["properties"] = properties;
        if (required.Count > 0)
        {
            schema["required"] = required;
        }

        return schema.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
    }

    private static JsonNode GeneratePropertySchema(Type type)
    {
        var schema = new JsonObject();

        // Handle nullable types
        var underlyingType = Nullable.GetUnderlyingType(type) ?? type;

        if (underlyingType == typeof(string))
        {
            schema["type"] = "string";
        }
        else if (underlyingType == typeof(int) || underlyingType == typeof(long) || underlyingType == typeof(short))
        {
            schema["type"] = "integer";
        }
        else if (underlyingType == typeof(float) || underlyingType == typeof(double) || underlyingType == typeof(decimal))
        {
            schema["type"] = "number";
        }
        else if (underlyingType == typeof(bool))
        {
            schema["type"] = "boolean";
        }
        else if (underlyingType.IsArray || (underlyingType.IsGenericType && underlyingType.GetGenericTypeDefinition() == typeof(List<>)))
        {
            schema["type"] = "array";
            var elementType = underlyingType.IsArray
                ? underlyingType.GetElementType()!
                : underlyingType.GetGenericArguments()[0];
            schema["items"] = GeneratePropertySchema(elementType);
        }
        else if (underlyingType.IsClass && underlyingType != typeof(string))
        {
            schema["type"] = "object";
        }
        else
        {
            schema["type"] = "string"; // Fallback
        }

        return schema;
    }

    private static bool IsNullable(Type type)
    {
        return Nullable.GetUnderlyingType(type) != null || !type.IsValueType;
    }
}
