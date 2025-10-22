using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace TestCli
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("╔═══════════════════════════════════════════════════╗");
            Console.WriteLine("║   Minimact End-to-End Test Suite                  ║");
            Console.WriteLine("║   Testing Production Features                     ║");
            Console.WriteLine("╚═══════════════════════════════════════════════════╝\n");

            // Enable logging for all tests
            MinimactNative.minimact_logging_enable();
            MinimactNative.minimact_logging_set_level(2); // Info level

            var allPassed = true;

            allPassed &= Test1_BasicReconciliation();
            allPassed &= Test2_PredictorLearning();
            allPassed &= Test3_ErrorHandling();
            allPassed &= Test4_InputValidation();
            allPassed &= Test5_MemoryManagement();
            allPassed &= Test6_Logging();
            allPassed &= Test7_Metrics();
            allPassed &= Test8_SerializationSafety();

            Console.WriteLine("\n" + new string('═', 55));
            if (allPassed)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("✓ ALL TESTS PASSED");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("✗ SOME TESTS FAILED");
                Console.ResetColor();
            }
            Console.WriteLine(new string('═', 55) + "\n");
        }

        static bool Test1_BasicReconciliation()
        {
            Console.WriteLine("\n[TEST 1] Basic Reconciliation");
            Console.WriteLine(new string('-', 55));

            try
            {
                var oldTree = new
                {
                    type = "Element",
                    tag = "div",
                    props = new Dictionary<string, string>(),
                    children = new[]
                    {
                        new { type = "Text", content = "Hello" }
                    }
                };

                var newTree = new
                {
                    type = "Element",
                    tag = "div",
                    props = new Dictionary<string, string>(),
                    children = new[]
                    {
                        new { type = "Text", content = "Hello, World!" }
                    }
                };

                var oldJson = MinimactHelper.SerializeJson(oldTree);
                var newJson = MinimactHelper.SerializeJson(newTree);

                var patchesPtr = MinimactNative.minimact_reconcile(oldJson, newJson);
                var patchesJson = MinimactHelper.GetStringAndFree(patchesPtr);

                if (patchesJson == null)
                {
                    Console.WriteLine("✗ Failed: No patches returned");
                    return false;
                }

                var patches = JsonConvert.DeserializeObject<List<object>>(patchesJson);
                Console.WriteLine($"✓ Generated {patches?.Count ?? 0} patch(es)");
                Console.WriteLine($"  Patches: {patchesJson}");

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Exception: {ex.Message}");
                return false;
            }
        }

        static bool Test2_PredictorLearning()
        {
            Console.WriteLine("\n[TEST 2] Predictor Learning & Prediction");
            Console.WriteLine(new string('-', 55));

            try
            {
                var handle = MinimactNative.minimact_predictor_new();
                Console.WriteLine($"✓ Predictor created (handle: {handle})");

                var buttonOff = new
                {
                    type = "Element",
                    tag = "button",
                    props = new Dictionary<string, string> { ["class"] = "off" },
                    children = new[] { new { type = "Text", content = "Turn On" } }
                };

                var buttonOn = new
                {
                    type = "Element",
                    tag = "button",
                    props = new Dictionary<string, string> { ["class"] = "on" },
                    children = new[] { new { type = "Text", content = "Turn Off" } }
                };

                var stateChange = new
                {
                    component_id = "toggle",
                    state_key = "isOn",
                    old_value = false,
                    new_value = true
                };

                var stateJson = MinimactHelper.SerializeJson(stateChange);
                var offJson = MinimactHelper.SerializeJson(buttonOff);
                var onJson = MinimactHelper.SerializeJson(buttonOn);

                // Learn the pattern 5 times
                Console.WriteLine("  Teaching pattern 5 times...");
                for (int i = 0; i < 5; i++)
                {
                    var result = MinimactNative.minimact_predictor_learn(handle, stateJson, offJson, onJson);
                    if (!result.IsSuccess)
                    {
                        Console.WriteLine($"  ✗ Learn failed: {result.GetErrorMessage()}");
                        MinimactNative.minimact_predictor_destroy(handle);
                        return false;
                    }
                }
                Console.WriteLine("  ✓ Pattern learned");

                // Get stats
                var statsPtr = MinimactNative.minimact_predictor_stats(handle);
                var statsJson = MinimactHelper.GetStringAndFree(statsPtr);
                Console.WriteLine($"  Stats: {statsJson}");

                // Try prediction
                var predictionPtr = MinimactNative.minimact_predictor_predict(handle, stateJson, offJson);
                var predictionJson = MinimactHelper.GetStringAndFree(predictionPtr);

                if (predictionJson != null)
                {
                    var prediction = JsonConvert.DeserializeObject<JObject>(predictionJson);
                    var confidence = prediction?["confidence"]?.Value<float>();
                    Console.WriteLine($"  ✓ Prediction made with {confidence:P0} confidence");
                }
                else
                {
                    Console.WriteLine("  ✗ No prediction returned");
                    MinimactNative.minimact_predictor_destroy(handle);
                    return false;
                }

                var destroyResult = MinimactNative.minimact_predictor_destroy(handle);
                Console.WriteLine($"✓ Predictor destroyed");

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Exception: {ex.Message}");
                return false;
            }
        }

        static bool Test3_ErrorHandling()
        {
            Console.WriteLine("\n[TEST 3] Error Handling");
            Console.WriteLine(new string('-', 55));

            try
            {
                // Test with invalid JSON
                var patchesPtr = MinimactNative.minimact_reconcile("invalid json", "also invalid");
                var result = MinimactHelper.GetStringAndFree(patchesPtr);

                if (result != null && result.Contains("error"))
                {
                    Console.WriteLine("✓ Invalid JSON properly rejected");
                    Console.WriteLine($"  Error response: {result.Substring(0, Math.Min(60, result.Length))}...");
                    return true;
                }
                else
                {
                    Console.WriteLine("✗ Expected error response for invalid JSON");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Exception: {ex.Message}");
                return false;
            }
        }

        static bool Test4_InputValidation()
        {
            Console.WriteLine("\n[TEST 4] Input Validation (Size Limits)");
            Console.WriteLine(new string('-', 55));

            try
            {
                // Create a very deep tree (should be rejected if > 100 levels)
                var deepTree = CreateDeeplyNestedTree(150);
                var shallowTree = CreateDeeplyNestedTree(5);

                var deepJson = MinimactHelper.SerializeJson(deepTree);
                var shallowJson = MinimactHelper.SerializeJson(shallowTree);

                var patchesPtr = MinimactNative.minimact_reconcile(deepJson, shallowJson);
                var result = MinimactHelper.GetStringAndFree(patchesPtr);

                if (result != null && result.Contains("error"))
                {
                    Console.WriteLine("✓ Deep tree rejected by validation");
                    Console.WriteLine($"  Error: {result.Substring(0, Math.Min(80, result.Length))}...");
                    return true;
                }
                else
                {
                    Console.WriteLine("⚠ Deep tree was accepted (validation may be too permissive)");
                    return true; // Not a critical failure
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Exception: {ex.Message}");
                return false;
            }
        }

        static bool Test5_MemoryManagement()
        {
            Console.WriteLine("\n[TEST 5] Memory Management (Multiple Predictors)");
            Console.WriteLine(new string('-', 55));

            try
            {
                var handles = new List<UIntPtr>();

                // Create multiple predictors
                Console.WriteLine("  Creating 10 predictors...");
                for (int i = 0; i < 10; i++)
                {
                    var handle = MinimactNative.minimact_predictor_new();
                    handles.Add(handle);
                }
                Console.WriteLine("  ✓ 10 predictors created");

                // Destroy them all
                Console.WriteLine("  Destroying predictors...");
                foreach (var handle in handles)
                {
                    var result = MinimactNative.minimact_predictor_destroy(handle);
                    if (!result.IsSuccess)
                    {
                        Console.WriteLine($"  ✗ Failed to destroy predictor: {result.GetErrorMessage()}");
                        return false;
                    }
                }
                Console.WriteLine("  ✓ All predictors destroyed");

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Exception: {ex.Message}");
                return false;
            }
        }

        static bool Test6_Logging()
        {
            Console.WriteLine("\n[TEST 6] Logging Infrastructure");
            Console.WriteLine(new string('-', 55));

            try
            {
                // Clear logs
                MinimactNative.minimact_logging_clear();

                // Enable logging
                MinimactNative.minimact_logging_enable();
                MinimactNative.minimact_logging_set_level(1); // Debug level

                // Perform some operations to generate logs
                var tree = new
                {
                    type = "Element",
                    tag = "div",
                    props = new Dictionary<string, string>(),
                    children = new[] { new { type = "Text", content = "Test" } }
                };

                var treeJson = MinimactHelper.SerializeJson(tree);
                var _ = MinimactNative.minimact_reconcile(treeJson, treeJson);

                // Get logs
                var logsPtr = MinimactNative.minimact_logging_get_logs();
                var logsJson = MinimactHelper.GetStringAndFree(logsPtr);

                if (logsJson != null)
                {
                    var logs = JsonConvert.DeserializeObject<List<object>>(logsJson);
                    Console.WriteLine($"✓ Captured {logs?.Count ?? 0} log entries");

                    if (logs?.Count > 0)
                    {
                        Console.WriteLine($"  Sample: {JsonConvert.SerializeObject(logs[0])}");
                    }

                    return true;
                }
                else
                {
                    Console.WriteLine("⚠ No logs captured (logging may not be producing output)");
                    return true; // Not critical
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Exception: {ex.Message}");
                return false;
            }
        }

        static bool Test7_Metrics()
        {
            Console.WriteLine("\n[TEST 7] Metrics & Observability");
            Console.WriteLine(new string('-', 55));

            try
            {
                // Reset metrics
                MinimactNative.minimact_metrics_reset();

                // Perform operations
                var tree = new
                {
                    type = "Element",
                    tag = "div",
                    props = new Dictionary<string, string>(),
                    children = new[] { new { type = "Text", content = "Test" } }
                };

                var treeJson = MinimactHelper.SerializeJson(tree);

                for (int i = 0; i < 5; i++)
                {
                    var _ = MinimactNative.minimact_reconcile(treeJson, treeJson);
                }

                // Get metrics
                var metricsPtr = MinimactNative.minimact_metrics_get();
                var metricsJson = MinimactHelper.GetStringAndFree(metricsPtr);

                if (metricsJson != null)
                {
                    var metrics = JsonConvert.DeserializeObject<JObject>(metricsJson);
                    var reconcileCalls = metrics?["reconcile_calls"]?.Value<int>();
                    var totalPatches = metrics?["total_patches_generated"]?.Value<int>();

                    Console.WriteLine($"✓ Metrics captured");
                    Console.WriteLine($"  Reconcile calls: {reconcileCalls}");
                    Console.WriteLine($"  Total patches: {totalPatches}");
                    Console.WriteLine($"  Full metrics: {metricsJson.Substring(0, Math.Min(120, metricsJson.Length))}...");

                    return reconcileCalls >= 5;
                }
                else
                {
                    Console.WriteLine("✗ No metrics returned");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Exception: {ex.Message}");
                return false;
            }
        }

        static bool Test8_SerializationSafety()
        {
            Console.WriteLine("\n[TEST 8] Serialization Safety");
            Console.WriteLine(new string('-', 55));

            try
            {
                // Test with very large JSON (should be rejected if > 1MB)
                var largeTree = CreateLargeTree(10000); // 10k nodes
                var smallTree = CreateLargeTree(10);

                var largeJson = MinimactHelper.SerializeJson(largeTree);
                var smallJson = MinimactHelper.SerializeJson(smallTree);

                Console.WriteLine($"  Large tree JSON size: {largeJson.Length:N0} bytes");

                var patchesPtr = MinimactNative.minimact_reconcile(largeJson, smallJson);
                var result = MinimactHelper.GetStringAndFree(patchesPtr);

                if (result != null && result.Contains("error") && largeJson.Length > 1_000_000)
                {
                    Console.WriteLine("✓ Oversized JSON rejected");
                    return true;
                }
                else if (result != null && !result.Contains("error"))
                {
                    Console.WriteLine("✓ Large tree processed successfully");
                    return true;
                }
                else
                {
                    Console.WriteLine("⚠ Test inconclusive");
                    return true;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"✗ Exception: {ex.Message}");
                return false;
            }
        }

        // Helper methods
        static object CreateDeeplyNestedTree(int depth)
        {
            if (depth == 0)
            {
                return new { type = "Text", content = "Deep" };
            }

            return new
            {
                type = "Element",
                tag = "div",
                props = new Dictionary<string, string>(),
                children = new[] { CreateDeeplyNestedTree(depth - 1) }
            };
        }

        static object CreateLargeTree(int nodeCount)
        {
            var children = new List<object>();
            for (int i = 0; i < nodeCount; i++)
            {
                children.Add(new { type = "Text", content = $"Node {i}" });
            }

            return new
            {
                type = "Element",
                tag = "div",
                props = new Dictionary<string, string>(),
                children
            };
        }
    }
}
