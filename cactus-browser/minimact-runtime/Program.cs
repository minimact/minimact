using System;
using System.IO;
using System.Text.Json;
using CactusBrowser.Runtime;

public class Program
{
    public static int Main(string[] args)
    {
        try
        {
            if (args.Length < 2)
            {
                Console.Error.WriteLine("Usage: minimact-runtime <command> <request.json>");
                Console.Error.WriteLine("Commands: Execute");
                return 1;
            }

            var command = args[0];
            var requestPath = args[1];
            var requestJson = File.ReadAllText(requestPath);

            string responseJson;

            switch (command)
            {
                case "Execute":
                    {
                        // Legacy command for backward compatibility
                        var request = JsonSerializer.Deserialize<RenderRequest>(requestJson);
                        if (request == null)
                        {
                            Console.Error.WriteLine("Invalid RenderRequest JSON");
                            return 1;
                        }

                        var result = ComponentExecutor.Execute(request);
                        responseJson = JsonSerializer.Serialize(result);
                        Console.WriteLine(responseJson);
                        return result.Success ? 0 : 1;
                    }

                default:
                    Console.Error.WriteLine($"Unknown command: {command}");
                    Console.Error.WriteLine("Valid commands: Execute");
                    return 1;
            }
        }
        catch (Exception ex)
        {
            var errorResponse = new
            {
                Success = false,
                Error = ex.ToString()
            };

            var errorJson = JsonSerializer.Serialize(errorResponse);
            Console.WriteLine(errorJson);
            return 1;
        }
    }
}

/// <summary>
/// Request for updating component state
/// </summary>
public class UpdateStateRequest
{
    public string ComponentId { get; set; } = "";
    public string StateKey { get; set; } = "";
    public JsonElement Value { get; set; }
}
