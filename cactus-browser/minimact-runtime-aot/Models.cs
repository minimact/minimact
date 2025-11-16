using System.Text.Json.Serialization;

namespace CactusBrowser.Runtime;

public class RenderRequest
{
    [JsonPropertyName("csharp")]
    public string CSharp { get; set; } = "";

    [JsonPropertyName("templates")]
    public object? Templates { get; set; }

    [JsonPropertyName("initialState")]
    public object? InitialState { get; set; }
}

public class RenderResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("vnodeJson")]
    public string? VNodeJson { get; set; }

    [JsonPropertyName("html")]
    public string? Html { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}
