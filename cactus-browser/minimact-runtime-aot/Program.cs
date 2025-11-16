using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using CactusBrowser.Runtime;

[JsonSerializable(typeof(RenderRequest))]
[JsonSerializable(typeof(RenderResponse))]
internal partial class SourceGenerationContext : JsonSerializerContext { }

public class Program
{
    public static int Main(string[] args)
    {
        try
        {
            if (args.Length == 0)
            {
                Console.Error.WriteLine("Usage: minimact-runtime-aot <request.json>");
                return 1;
            }

            var requestPath = args[0];
            var requestJson = File.ReadAllText(requestPath);

            var request = JsonSerializer.Deserialize(
                requestJson,
                SourceGenerationContext.Default.RenderRequest
            );

            if (request == null)
            {
                Console.Error.WriteLine("Invalid request JSON");
                return 1;
            }

            var result = ComponentExecutor.Execute(request);

            var responseJson = JsonSerializer.Serialize(
                result,
                SourceGenerationContext.Default.RenderResponse
            );

            Console.WriteLine(responseJson);
            return result.Success ? 0 : 1;
        }
        catch (Exception ex)
        {
            var errorResponse = new RenderResponse
            {
                Success = false,
                VNodeJson = null,
                Html = null,
                Error = ex.ToString()
            };

            var errorJson = JsonSerializer.Serialize(
                errorResponse,
                SourceGenerationContext.Default.RenderResponse
            );

            Console.WriteLine(errorJson);
            return 1;
        }
    }
}
