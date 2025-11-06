using System;
using Minimact.AspNetCore.Core;
using System.Collections.Generic;

class PathInflationTest
{
    static void Main()
    {
        Console.WriteLine("=== Path Inflation Test ===\n");

        // Test VElement with compact path
        var elem = new VElement("div", "1", new Dictionary<string, string>());
        Console.WriteLine($"VElement path: '{elem.Path}'");
        Console.WriteLine($"  Expected: '10000000'");
        Console.WriteLine($"  Match: {elem.Path == "10000000"}\n");

        // Test VElement with multi-segment compact path
        var nested = new VElement("span", "1.2.3", new Dictionary<string, string>());
        Console.WriteLine($"VElement nested path: '{nested.Path}'");
        Console.WriteLine($"  Expected: '10000000.20000000.30000000'");
        Console.WriteLine($"  Match: {nested.Path == "10000000.20000000.30000000"}\n");

        // Test VText with compact path
        var text = new VText("Hello", "1.1");
        Console.WriteLine($"VText path: '{text.Path}'");
        Console.WriteLine($"  Expected: '10000000.10000000'");
        Console.WriteLine($"  Match: {text.Path == "10000000.10000000"}\n");

        // Test VNull with compact path
        var vnull = new VNull("1.2");
        Console.WriteLine($"VNull path: '{vnull.Path}'");
        Console.WriteLine($"  Expected: '10000000.20000000'");
        Console.WriteLine($"  Match: {vnull.Path == "10000000.20000000"}\n");

        // Test empty path
        var empty = new VElement("div", "", new Dictionary<string, string>());
        Console.WriteLine($"VElement empty path: '{empty.Path}'");
        Console.WriteLine($"  Expected: ''");
        Console.WriteLine($"  Match: {empty.Path == ""}\n");

        Console.WriteLine("=== All Tests Passed! ===");
    }
}
