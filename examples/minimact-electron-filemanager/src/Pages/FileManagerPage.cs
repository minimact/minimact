using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Minimact.AspNetCore.Plugins;

namespace Minimact.Components;

[Component]
public partial class FileManagerPage : MinimactComponent
{
    [State]
    private string currentPath = "";

    [State]
    private dynamic directoryData = null;

    [State]
    private dynamic fileStats = null;

    [State]
    private bool loading = false;

    [State]
    private dynamic error = null;

    [State]
    private dynamic selectedFile = null;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var chartData = (((IEnumerable<dynamic>)fileStats?.ExtensionStats)?.Select(stat => new { name = stat.extension, count = stat.count, size = stat.totalSize })?.Cast<dynamic>().ToList()) ?? (new List<dynamic> {  });

        return new VElement("div", new Dictionary<string, string> { ["class"] = "file-manager" }, new VNode[]
        {
            new VElement("style", new Dictionary<string, string>(), new VNode[]
            {
                new VText($"{(@"
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #1a1a1a;
          color: #e0e0e0;
        }

        .file-manager {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 20px;
          gap: 20px;
        }

        .header {
          background: #2a2a2a;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #3a3a3a;
        }

        .header h1 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #fff;
        }

        .path-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #1a1a1a;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #3a3a3a;
        }

        .path-bar button {
          background: #3a3a3a;
          border: none;
          color: #e0e0e0;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }

        .path-bar button:hover {
          background: #4a4a4a;
        }

        .path-bar button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .current-path {
          flex: 1;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          color: #888;
        }

        .stats-summary {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }

        .stat-item {
          background: #1a1a1a;
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid #3a3a3a;
          font-size: 13px;
        }

        .stat-label {
          color: #888;
          margin-right: 8px;
        }

        .stat-value {
          color: #4a9eff;
          font-weight: 600;
        }

        .content {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 20px;
          flex: 1;
          min-height: 0;
        }

        .file-list-panel {
          background: #2a2a2a;
          border-radius: 12px;
          border: 1px solid #3a3a3a;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .file-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .file-item {
          display: grid;
          grid-template-columns: 40px 1fr 120px 180px;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          align-items: center;
        }

        .file-item:hover {
          background: #3a3a3a;
        }

        .file-item.selected {
          background: #2a4a7a;
        }

        .file-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #3a3a3a;
          border-radius: 6px;
          font-size: 18px;
        }

        .file-name {
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          font-size: 13px;
          color: #888;
          text-align: right;
        }

        .file-date {
          font-size: 12px;
          color: #666;
          font-family: 'Courier New', monospace;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .panel {
          background: #2a2a2a;
          border-radius: 12px;
          border: 1px solid #3a3a3a;
          padding: 20px;
        }

        .panel h2 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #fff;
        }

        .chart-container {
          min-height: 300px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #888;
        }

        .error {
          background: #4a2a2a;
          border: 1px solid #6a3a3a;
          border-radius: 8px;
          padding: 16px;
          color: #ff6b6b;
        }

        .empty {
          text-align: center;
          padding: 40px;
          color: #666;
        }
      ")}")
            }),
            new VText($"{(null)}"),
            MinimactHelpers.createElement("div", new { className = "header" }, new VElement("h1", new Dictionary<string, string>(), "📁 Minimact File Manager"), new VElement("div", new Dictionary<string, string> { ["class"] = "path-bar" }, new VNode[]
                {
                    new VElement("button", new Dictionary<string, string> { ["disabled"] = $"{!directoryData?.ParentPath}", ["onclick"] = "handleGoUp" }, "⬆️ Up"),
                    new VElement("span", new Dictionary<string, string> { ["class"] = "current-path" }, new VNode[]
                    {
                        new VText($"{((currentPath) ?? ("Loading..."))}")
                    })
                }), (new MObject(directoryData)) ? MinimactHelpers.createElement("div", new { className = "stats-summary" }, new VElement("div", new Dictionary<string, string> { ["class"] = "stat-item" }, new VNode[]
                    {
                        new VElement("span", new Dictionary<string, string> { ["class"] = "stat-label" }, "Directories:"),
                        new VElement("span", new Dictionary<string, string> { ["class"] = "stat-value" }, new VNode[]
                        {
                            new VText($"{(directoryData.totalDirectories)}")
                        })
                    }), new VElement("div", new Dictionary<string, string> { ["class"] = "stat-item" }, new VNode[]
                    {
                        new VElement("span", new Dictionary<string, string> { ["class"] = "stat-label" }, "Files:"),
                        new VElement("span", new Dictionary<string, string> { ["class"] = "stat-value" }, new VNode[]
                        {
                            new VText($"{(directoryData.totalFiles)}")
                        })
                    }), (new MObject(fileStats)) ? new VElement("div", new Dictionary<string, string> { ["class"] = "stat-item" }, new VNode[]
                    {
                        new VElement("span", new Dictionary<string, string> { ["class"] = "stat-label" }, "Total Size:"),
                        new VElement("span", new Dictionary<string, string> { ["class"] = "stat-value" }, new VNode[]
                        {
                            new VText($"{(formatFileSize(fileStats.totalSize))}")
                        })
                    }) : null) : null),
            new VText($"{(null)}"),
            new VElement("div", new Dictionary<string, string> { ["class"] = "content" }, new VNode[]
            {
                new VText($"{(null)}"),
                MinimactHelpers.createElement("div", new { className = "file-list-panel" }, (new MObject(loading)) ? new VElement("div", new Dictionary<string, string> { ["class"] = "loading" }, "Loading...") : null, (new MObject(error)) ? new VElement("div", new Dictionary<string, string> { ["class"] = "error" }, new VNode[]
                    {
                        new VText("Error:"),
                        new VText($"{(error)}")
                    }) : null, (((!loading) && (!error)) != null ? (directoryData) : null) ? MinimactHelpers.createElement("div", new { className = "file-list" }, (directoryData.items.Count == 0) ? new VElement("div", new Dictionary<string, string> { ["class"] = "empty" }, "Empty directory") : ((IEnumerable<dynamic>)directoryData.items).Select((item, index) => new VElement("div", new Dictionary<string, string> { ["key"] = $"{index}", ["class"] = $"{$"file-item {((selectedFile?.Path == item.path) ? "selected" : "")}"}", ["onclick"] = "Handle0:{item}:{index}" }, new VNode[]
{
    new VElement("div", new Dictionary<string, string> { ["class"] = "file-icon" }, new VNode[]
    {
        new VText($"{((item.type == "directory") ? "📁" : "📄")}")
    }),
    new VElement("div", new Dictionary<string, string> { ["class"] = "file-name" }, new VNode[]
    {
        new VText($"{(item.name)}")
    }),
    new VElement("div", new Dictionary<string, string> { ["class"] = "file-size" }, new VNode[]
    {
        new VText($"{(formatFileSize(item.size))}")
    }),
    new VElement("div", new Dictionary<string, string> { ["class"] = "file-date" }, new VNode[]
    {
        new VText($"{(formatDate(item.modified))}")
    })
})).ToList()) : null),
                new VText($"{(null)}"),
                MinimactHelpers.createElement("div", new { className = "sidebar" }, null, ((fileStats) && (chartData.Count > 0)) ? new VElement("div", new Dictionary<string, string> { ["class"] = "panel" }, new VNode[]
                    {
                        new VElement("h2", new Dictionary<string, string>(), "📊 File Types"),
                        new VElement("div", new Dictionary<string, string> { ["class"] = "chart-container" }, new VNode[]
                        {
                            new PluginNode("BarChart", new { data = chartData, width = 360, height = 250, margin = new { top = 10, right = 10, bottom = 40, left = 40 }, xAxisDataKey = "name", yAxisDataKey = "count", barFill = "#4a9eff", backgroundColor = "#1a1a1a", axisColor = "#666", gridColor = "#2a2a2a" })
                        })
                    }) : null, null, (new MObject(selectedFile)) ? new VElement("div", new Dictionary<string, string> { ["class"] = "panel" }, new VNode[]
                    {
                        new VElement("h2", new Dictionary<string, string>(), "📄 File Info"),
                        new VElement("div", new Dictionary<string, string> { ["style"] = "font-size: 13px; line-height: 1.8" }, new VNode[]
                        {
                            new VElement("div", new Dictionary<string, string>(), new VNode[]
                            {
                                new VElement("strong", new Dictionary<string, string>(), "Name:"),
                                new VText($"{(selectedFile.name)}")
                            }),
                            new VElement("div", new Dictionary<string, string>(), new VNode[]
                            {
                                new VElement("strong", new Dictionary<string, string>(), "Type:"),
                                new VText($"{((selectedFile.extension) ?? ("Unknown"))}")
                            }),
                            new VElement("div", new Dictionary<string, string>(), new VNode[]
                            {
                                new VElement("strong", new Dictionary<string, string>(), "Size:"),
                                new VText($"{(formatFileSize(selectedFile.size))}")
                            }),
                            new VElement("div", new Dictionary<string, string>(), new VNode[]
                            {
                                new VElement("strong", new Dictionary<string, string>(), "Modified:"),
                                new VText($"{(formatDate(selectedFile.modified))}")
                            }),
                            new VElement("div", new Dictionary<string, string> { ["style"] = "margin-top: 12px; font-size: 11px; color: #666; word-break: break-all" }, new VNode[]
                            {
                                new VText($"{(selectedFile.path)}")
                            })
                        })
                    }) : null)
            })
        });
    }

    [OnStateChanged("currentPath")]
    private void Effect_0()
    {
        loadDirectory(currentPath);
    }

    public void Handle0(dynamic item, dynamic index)
    {
        handleItemClick(item);
    }

    private async Task loadDirectory(string path)
    {
SetState(nameof(loading), true);
SetState(nameof(error), null);
try {
    var dirResponse = await new HttpClient().GetAsync($"/api/desktop/directory?path={Uri.EscapeDataString(path)}");
    if (!dirResponse.IsSuccessStatusCode) {
    throw new Exception("Failed to load directory");
}
    var dirData = await dirResponse.Content.ReadFromJsonAsync<dynamic>();
    SetState(nameof(directoryData), dirData);
    var statsResponse = await new HttpClient().GetAsync($"/api/desktop/file-stats?path={Uri.EscapeDataString(path)}");
    if (statsResponse.IsSuccessStatusCode) {
    var stats = await statsResponse.Content.ReadFromJsonAsync<dynamic>();
    SetState(nameof(fileStats), stats);
}
    SetState(nameof(currentPath), dirData.currentPath);
} catch (Exception err) {
    SetState(nameof(error), err.Message);
} finally {
    SetState(nameof(loading), false);
}
    }

    private void handleItemClick(dynamic item)
    {
if (item.type == "directory") {
    SetState(nameof(currentPath), item.path);
    SetState(nameof(selectedFile), null);
} else {
    SetState(nameof(selectedFile), item);
}
    }

    private void handleGoUp()
    {
if (directoryData?.ParentPath) {
    SetState(nameof(currentPath), directoryData.parentPath);
    SetState(nameof(selectedFile), null);
}
    }

    private string formatFileSize(double bytes)
    {
if (bytes == 0) {
    return "-";
}
var k = 1024;
var sizes = new List<object> { "Bytes", "KB", "MB", "GB" };
var i = (int)Math.Floor(Math.Log(bytes) / Math.Log(k));
return (int)Math.Round(bytes / Math.Pow(k, i) * 100) / 100 + " " + sizes[i];
    }

    private string formatDate(string dateString)
    {
var date = DateTime.Parse(dateString);
return date.ToString("g");
    }
}
