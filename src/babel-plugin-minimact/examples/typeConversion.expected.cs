using Minimact;
using System;
using System.Collections.Generic;
using System.Numerics;
using System.Threading.Tasks;

// TypeScript → C# type mapping reference:
//
// Primitives:
//   string        → string
//   number        → double
//   boolean       → bool
//   bigint        → BigInteger
//
// Special:
//   any           → dynamic
//   unknown       → object
//   never         → void (or throws)
//   void          → void
//   null          → null
//   undefined     → null
//
// Arrays:
//   string[]      → List<string>
//   number[]      → List<double>
//   Array<T>      → List<T>
//   T[]           → List<T>
//
// Collections:
//   Record<K,V>   → Dictionary<K, V>
//   Map<K,V>      → Dictionary<K, V>
//   Set<T>        → HashSet<T>
//
// Functions:
//   () => void         → Action
//   (x: T) => R        → Func<T, R>
//   () => Promise<T>   → Func<Task<T>>
//
// Tuples:
//   [A, B, C]     → (A, B, C)  // C# ValueTuple
//
// Union:
//   A | B         → dynamic (or common base)
//   T | null      → T? (nullable)
//
// Modifiers:
//   optional?     → nullable or default
//   readonly      → readonly

[Component]
public partial class TypeConversionExample : MinimactComponent
{
    // string[] → List<string>
    [State]
    private List<string> items = new List<string>();

    // number → double
    [State]
    private double count = 0;

    // Record<string, any> → Dictionary<string, dynamic>
    [State]
    private Dictionary<string, dynamic> data = new Dictionary<string, dynamic>();

    // () => void → Action
    [State]
    private Action callback = () => { };

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), "Type conversion demo");
    }
}

// typeConversion.cjs provides:
// - tsTypeToCSharpType(tsType) - converts TS AST type node to C# string
// - inferType(valueNode) - infers C# type from value (literal, array, object)
//
// Examples:
//   tsTypeToCSharpType(TSStringKeyword)     → "string"
//   tsTypeToCSharpType(TSNumberKeyword)     → "double"
//   tsTypeToCSharpType(TSArrayType(string)) → "List<string>"
//   inferType(NumericLiteral(42))           → "int"
//   inferType(StringLiteral("x"))           → "string"
//   inferType(ArrayExpression([]))          → "List<object>"
