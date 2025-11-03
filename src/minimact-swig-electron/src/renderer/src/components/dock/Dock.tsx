import { FileText, Terminal as TerminalIcon, Activity, BarChart3 } from 'lucide-react'

export interface DockWidget {
  id: string
  name: string
  icon: React.ReactNode
  visible: boolean
  minimized: boolean
}

interface DockProps {
  widgets: DockWidget[]
  onWidgetClick: (widgetId: string) => void
}

export default function Dock({ widgets, onWidgetClick }: DockProps) {
  // Show all widgets in the dock
  const dockWidgets = widgets

  if (dockWidgets.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="floating-widget rounded-2xl px-3 py-2 flex items-center gap-2 shadow-2xl">
        {dockWidgets.map((widget) => {
          // Determine widget state
          const isActive = widget.visible && !widget.minimized
          const isMinimized = widget.minimized
          const isClosed = !widget.visible && !widget.minimized

          return (
            <button
              key={widget.id}
              onClick={() => onWidgetClick(widget.id)}
              className={`relative group w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110 ${
                isClosed
                  ? 'bg-slate-800 bg-opacity-30 opacity-40 hover:opacity-60'
                  : isMinimized
                    ? 'bg-slate-700 bg-opacity-50'
                    : 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30'
              }`}
              title={widget.name}
            >
              <div
                className={
                  isClosed
                    ? 'text-slate-600'
                    : isMinimized
                      ? 'text-slate-400'
                      : 'text-white'
                }
              >
                {widget.icon}
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"></div>
              )}

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-slate-800 text-white text-xs py-1.5 px-3 rounded-lg whitespace-nowrap shadow-xl">
                  {widget.name}
                  {isClosed && <span className="text-slate-500 ml-1">(Closed)</span>}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Helper function to get default widget icons
export function getWidgetIcon(widgetId: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    files: <FileText className="w-5 h-5" />,
    editor: <FileText className="w-5 h-5" />,
    terminal: <TerminalIcon className="w-5 h-5" />,
    inspector: <Activity className="w-5 h-5" />,
    metrics: <BarChart3 className="w-5 h-5" />
  }
  return iconMap[widgetId] || <FileText className="w-5 h-5" />
}
