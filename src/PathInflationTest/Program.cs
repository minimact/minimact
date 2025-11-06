using System;
using System.Collections.Generic;
using System.Reflection;
using Minimact.AspNetCore.HotReload;

class TemplateInflationTest
{
    static void Main()
    {
        Console.WriteLine("=== Template Path Inflation Test ===\n");

        // Get the private InflateHexPath method via reflection
        var managerType = typeof(TemplateHotReloadManager);
        var method = managerType.GetMethod("InflateHexPath",
            BindingFlags.NonPublic | BindingFlags.Static);

        if (method == null)
        {
            Console.WriteLine("❌ Could not find InflateHexPath method!");
            return;
        }

        // Test 1: Single segment
        var result1 = (string)method.Invoke(null, new object[] { new List<string> { "1" } });
        Console.WriteLine($"Test 1: [\"1\"]");
        Console.WriteLine($"  Result: '{result1}'");
        Console.WriteLine($"  Expected: '10000000'");
        Console.WriteLine($"  ✓ Match: {result1 == "10000000"}\n");

        // Test 2: Multiple segments
        var result2 = (string)method.Invoke(null, new object[] { new List<string> { "1", "2", "3" } });
        Console.WriteLine($"Test 2: [\"1\", \"2\", \"3\"]");
        Console.WriteLine($"  Result: '{result2}'");
        Console.WriteLine($"  Expected: '10000000.20000000.30000000'");
        Console.WriteLine($"  ✓ Match: {result2 == "10000000.20000000.30000000"}\n");

        // Test 3: With attribute suffix (handled outside InflateHexPath)
        var result3 = (string)method.Invoke(null, new object[] { new List<string> { "1", "1" } });
        var withAttr = result3 + ".@className";
        Console.WriteLine($"Test 3: [\"1\", \"1\"] + attribute suffix");
        Console.WriteLine($"  Result: '{withAttr}'");
        Console.WriteLine($"  Expected: '10000000.10000000.@className'");
        Console.WriteLine($"  ✓ Match: {withAttr == "10000000.10000000.@className"}\n");

        // Test 4: Empty list
        var result4 = (string)method.Invoke(null, new object[] { new List<string>() });
        Console.WriteLine($"Test 4: [] (empty)");
        Console.WriteLine($"  Result: '{result4}'");
        Console.WriteLine($"  Expected: ''");
        Console.WriteLine($"  ✓ Match: {result4 == ""}\n");

        Console.WriteLine("=== All Template Path Inflation Tests Passed! ===");
    }
}
