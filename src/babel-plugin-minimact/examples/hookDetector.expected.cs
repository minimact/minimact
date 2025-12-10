using Minimact;
using System.Collections.Generic;

// hookDetector.cjs detection results:
//
// useCounter     → isCustomHook: true  (starts with 'use', returns array)
// useForm        → isCustomHook: true  (starts with 'use', returns object)
// useModal       → isCustomHook: true  (starts with 'use', returns array with JSX)
// Counter        → isCustomHook: false (PascalCase = component)
// createCounter  → isCustomHook: false (doesn't start with 'use')
// formatNumber   → isCustomHook: false (helper function, no hooks inside)

// Generated hook classes
[Hook]
public class UseCounterHook : MinimactComponent
{
    private int initial;

    [State]
    private int count;

    public UseCounterHook(int initial)
    {
        this.initial = initial;
        this.count = initial;
    }

    public int Count => count;

    public void increment()
    {
        count = count + 1;
        SetState(nameof(count), count);
    }

    public void decrement()
    {
        count = count - 1;
        SetState(nameof(count), count);
    }
}

[Hook]
public class UseFormHook : MinimactComponent
{
    [State]
    private dynamic values;

    [State]
    private dynamic errors = new { };

    public UseFormHook(object initialValues)
    {
        this.values = initialValues;
    }

    public dynamic Values => values;
    public dynamic Errors => errors;

    public void setValue(string key, dynamic value)
    {
        // Object spread equivalent in C#
        var dict = new Dictionary<string, object>((IDictionary<string, object>)values);
        dict[key] = value;
        values = dict;
        SetState(nameof(values), values);
    }
}

[Hook]
public class UseModalHook : MinimactComponent
{
    private string title;

    [State]
    private bool isOpen = false;

    public UseModalHook(string title)
    {
        this.title = title;
    }

    public bool IsOpen => isOpen;

    public void open()
    {
        isOpen = true;
        SetState(nameof(isOpen), isOpen);
    }

    public void close()
    {
        isOpen = false;
        SetState(nameof(isOpen), isOpen);
    }

    protected override VNode Render()
    {
        return (isOpen)
            ? new VElement("div", "1", new Dictionary<string, string> { ["class"] = "modal" }, new VText($"{title}", "1.1"))
            : new VNull("1");
    }
}

// Component using hooks
[Component]
public partial class HookDetectorExample : MinimactComponent
{
    private UseCounterHook counter;
    private UseFormHook form;
    private UseModalHook modal;

    public HookDetectorExample()
    {
        counter = new UseCounterHook(0);
        form = new UseFormHook(new { name = "" });
        modal = new UseModalHook("Test Modal");
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("p", "1.1", new Dictionary<string, string>(), new VText($"Count: {counter.Count}", "1.1.1")),
            new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "counter.increment" }, "+"),
            modal.Render()
        });
    }
}

// hookDetector.cjs isCustomHook(path) checks:
// 1. Function name starts with 'use' (case sensitive)
// 2. Function name is NOT PascalCase (first letter after 'use' is lowercase)
// 3. Contains at least one React hook call (useState, useEffect, etc.)
// 4. Returns array or object (not just JSX)
//
// Returns false if:
// - Name doesn't start with 'use'
// - Name is PascalCase (UseCounter = component, not hook)
// - No hook calls inside (pure helper function)
// - Only returns JSX (that's a component)
