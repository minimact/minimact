using System;
using System.Collections.Generic;
using Minimact;

namespace MinimactExample
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== Minimact C# Example ===\n");

            // Example 1: Simple reconciliation
            Console.WriteLine("Example 1: Basic Reconciliation");
            BasicReconciliation();

            Console.WriteLine("\n" + new string('-', 50) + "\n");

            // Example 2: Predictor learning and prediction
            Console.WriteLine("Example 2: Predictor with Learning");
            PredictorExample();

            Console.WriteLine("\n" + new string('-', 50) + "\n");

            // Example 3: Counter component simulation
            Console.WriteLine("Example 3: Counter Component Simulation");
            CounterSimulation();
        }

        static void BasicReconciliation()
        {
            // Create old tree: <div>Hello</div>
            var oldTree = new VNode
            {
                Type = "Element",
                Element = new VElement
                {
                    Tag = "div",
                    Props = new Dictionary<string, string>(),
                    Children = new List<VNode>
                    {
                        new VNode
                        {
                            Type = "Text",
                            Text = new VText { Content = "Hello" }
                        }
                    }
                }
            };

            // Create new tree: <div>Hello, World!</div>
            var newTree = new VNode
            {
                Type = "Element",
                Element = new VElement
                {
                    Tag = "div",
                    Props = new Dictionary<string, string>(),
                    Children = new List<VNode>
                    {
                        new VNode
                        {
                            Type = "Text",
                            Text = new VText { Content = "Hello, World!" }
                        }
                    }
                }
            };

            var patches = Reconciler.Reconcile(oldTree, newTree);

            Console.WriteLine($"Generated {patches.Length} patch(es):");
            foreach (var patch in patches)
            {
                Console.WriteLine($"  - {patch.Op} at path [{string.Join(", ", patch.Path ?? new List<int>())}]");
                if (patch.Content != null)
                {
                    Console.WriteLine($"    Content: {patch.Content}");
                }
            }
        }

        static void PredictorExample()
        {
            using var predictor = new Predictor(minConfidence: 0.7f, maxPatternsPerKey: 100);

            // Simulate a toggle button state
            var buttonOff = CreateButton("off", "Turn On");
            var buttonOn = CreateButton("on", "Turn Off");

            var stateChange = new StateChange
            {
                ComponentId = "toggle-button",
                StateKey = "isOn",
                OldValue = false,
                NewValue = true
            };

            // Teach the predictor this pattern 5 times
            Console.WriteLine("Teaching predictor the toggle pattern...");
            for (int i = 0; i < 5; i++)
            {
                predictor.Learn(stateChange, buttonOff, buttonOn);
            }

            var stats = predictor.GetStats();
            Console.WriteLine($"Predictor stats: {stats.UniqueStateKeys} unique keys, " +
                            $"{stats.TotalPatterns} patterns, {stats.TotalObservations} observations");

            // Now try to predict
            Console.WriteLine("\nAttempting prediction...");
            var prediction = predictor.Predict(stateChange, buttonOff);

            if (prediction != null)
            {
                Console.WriteLine($"✓ Prediction successful! Confidence: {prediction.Confidence:P0}");
                Console.WriteLine($"  Predicted {prediction.PredictedPatches.Count} patch(es)");
                foreach (var patch in prediction.PredictedPatches)
                {
                    Console.WriteLine($"    - {patch.Op}");
                }
            }
            else
            {
                Console.WriteLine("✗ No prediction available");
            }
        }

        static void CounterSimulation()
        {
            using var predictor = new Predictor();

            Console.WriteLine("Simulating a counter component from 0 to 5...\n");

            VNode? previousTree = null;

            for (int i = 0; i <= 5; i++)
            {
                var currentTree = CreateCounterTree(i);

                if (previousTree != null)
                {
                    // Learn the state change pattern
                    var stateChange = new StateChange
                    {
                        ComponentId = "counter",
                        StateKey = "count",
                        OldValue = i - 1,
                        NewValue = i
                    };

                    predictor.Learn(stateChange, previousTree, currentTree);

                    // Try to predict the next state
                    if (i < 5)
                    {
                        var nextStateChange = new StateChange
                        {
                            ComponentId = "counter",
                            StateKey = "count",
                            OldValue = i,
                            NewValue = i + 1
                        };

                        var prediction = predictor.Predict(nextStateChange, currentTree);
                        if (prediction != null)
                        {
                            Console.WriteLine($"Count {i} -> {i + 1}: Predicted with {prediction.Confidence:P0} confidence");
                        }
                        else
                        {
                            Console.WriteLine($"Count {i} -> {i + 1}: No prediction yet");
                        }
                    }
                }

                previousTree = currentTree;
            }

            var finalStats = predictor.GetStats();
            Console.WriteLine($"\nFinal stats: {finalStats.TotalObservations} observations, " +
                            $"{finalStats.TotalPatterns} unique patterns");
        }

        static VNode CreateButton(string state, string label)
        {
            return new VNode
            {
                Type = "Element",
                Element = new VElement
                {
                    Tag = "button",
                    Props = new Dictionary<string, string>
                    {
                        ["class"] = $"btn-{state}"
                    },
                    Children = new List<VNode>
                    {
                        new VNode
                        {
                            Type = "Text",
                            Text = new VText { Content = label }
                        }
                    }
                }
            };
        }

        static VNode CreateCounterTree(int count)
        {
            return new VNode
            {
                Type = "Element",
                Element = new VElement
                {
                    Tag = "div",
                    Props = new Dictionary<string, string>
                    {
                        ["class"] = "counter"
                    },
                    Children = new List<VNode>
                    {
                        new VNode
                        {
                            Type = "Text",
                            Text = new VText { Content = $"Count: {count}" }
                        }
                    }
                }
            };
        }
    }
}
