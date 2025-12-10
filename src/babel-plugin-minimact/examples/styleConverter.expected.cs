using Minimact;
using System.Collections.Generic;

[Component]
public partial class StyleConverterExample : MinimactComponent
{
    [State]
    private bool isActive = true;

    [State]
    private int size = 16;

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            // Static style object → CSS string
            // { color: 'red', fontSize: '14px' } → "color: red; font-size: 14px"
            new VElement("div", "1.1", new Dictionary<string, string>
            {
                ["style"] = "color: red; font-size: 14px"
            }, "Static styles"),

            // Numeric values get 'px' suffix (except unitless properties)
            // { marginTop: 20, padding: 10 } → "margin-top: 20px; padding: 10px"
            new VElement("div", "1.2", new Dictionary<string, string>
            {
                ["style"] = "margin-top: 20px; padding: 10px; border-radius: 5px"
            }, "Numeric values"),

            // camelCase → kebab-case
            // { backgroundColor: 'blue' } → "background-color: blue"
            // { WebkitTransform: '...' } → "-webkit-transform: ..."
            new VElement("div", "1.3", new Dictionary<string, string>
            {
                ["style"] = "background-color: blue; border-bottom-width: 2px; z-index: 100; -webkit-transform: rotate(45deg)"
            }, "CamelCase conversion"),

            // Dynamic styles use string interpolation
            new VElement("div", "1.4", new Dictionary<string, string>
            {
                ["style"] = $"color: {(isActive ? "green" : "gray")}; font-size: {size}px; opacity: {(isActive ? 1 : 0.5)}"
            }, "Dynamic styles")
        });
    }
}

// styleConverter.cjs provides convertStyleObjectToCss(objectExpression):
//
// Conversions:
//   camelCase → kebab-case:
//     fontSize      → font-size
//     marginTop     → margin-top
//     backgroundColor → background-color
//     borderBottomWidth → border-bottom-width
//
//   Vendor prefixes:
//     WebkitTransform → -webkit-transform
//     MozTransition   → -moz-transition
//     msFilter        → -ms-filter
//
//   Numeric values:
//     20 → "20px" (for most properties)
//     Exceptions (no px): zIndex, opacity, flex, fontWeight, lineHeight, order
//
//   String values:
//     'red' → "red" (quotes stripped)
//     "14px" → "14px"
//
// Dynamic values:
//   When value is expression (not literal), uses string interpolation
//   { color: isActive ? 'green' : 'gray' }
//   → ["style"] = $"color: {(isActive ? \"green\" : \"gray\")}"
