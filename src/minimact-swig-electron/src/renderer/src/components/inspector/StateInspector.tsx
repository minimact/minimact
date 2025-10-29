import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Edit2, Check, X } from 'lucide-react'

interface ComponentStateSnapshot {
  componentId: string
  componentName: string
  state: Record<string, any>
  refs: Record<string, any>
  domElementStates: Record<string, any>
  queryResults: Record<string, any>
  effects: Array<{ index: number; deps: any[] | undefined; hasCleanup: boolean }>
  templates: any[]
  timestamp: number
}

interface StateInspectorProps {
  componentId?: string
}

export default function StateInspector({ componentId }: StateInspectorProps) {
  const [snapshot, setSnapshot] = useState<ComponentStateSnapshot | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['state']))
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  useEffect(() => {
    if (!componentId) return

    // Request component state snapshot
    const fetchSnapshot = async () => {
      try {
        const result = await window.api.signalr.getComponentState(componentId)
        if (result.success) {
          setSnapshot(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch component state:', error)
      }
    }

    fetchSnapshot()

    // Poll for updates (in production, use SignalR events)
    const interval = setInterval(fetchSnapshot, 1000)
    return () => clearInterval(interval)
  }, [componentId])

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const startEdit = (key: string, value: any) => {
    setEditingKey(key)
    setEditValue(JSON.stringify(value, null, 2))
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!componentId || !editingKey) return

    try {
      const parsedValue = JSON.parse(editValue)
      await window.api.signalr.updateComponentState(componentId, editingKey, parsedValue)
      setEditingKey(null)
      setEditValue('')
    } catch (error) {
      console.error('Failed to update state:', error)
      alert('Invalid JSON value')
    }
  }

  if (!componentId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Select a component to inspect its state</p>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Loading component state...</p>
      </div>
    )
  }

  const renderValue = (value: any): string => {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (Array.isArray(value)) return `Array(${value.length})`
    if (typeof value === 'object') return `Object {${Object.keys(value).length}}`
    return String(value)
  }

  const renderSection = (
    title: string,
    sectionKey: string,
    data: Record<string, any>,
    editable = false
  ) => {
    const isExpanded = expandedSections.has(sectionKey)
    const entries = Object.entries(data)

    if (entries.length === 0) return null

    return (
      <div className="border-b border-gray-700">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="font-semibold text-sm text-blue-400">{title}</span>
          <span className="text-xs text-gray-500">({entries.length})</span>
        </button>

        {isExpanded && (
          <div className="px-4 py-2 space-y-1">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 py-1 hover:bg-gray-800 rounded px-2">
                <span className="text-purple-400 text-sm font-mono min-w-[120px]">{key}:</span>

                {editingKey === `${sectionKey}.${key}` ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 bg-gray-700 text-gray-100 px-2 py-1 rounded text-sm font-mono"
                      autoFocus
                    />
                    <button
                      onClick={saveEdit}
                      className="p-1 bg-green-600 hover:bg-green-700 rounded transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-green-400 text-sm font-mono flex-1">
                      {renderValue(value)}
                    </span>
                    {editable && (
                      <button
                        onClick={() => startEdit(`${sectionKey}.${key}`, value)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                      >
                        <Edit2 className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <h3 className="text-lg font-bold text-green-400">{snapshot.componentName}</h3>
        <p className="text-xs text-gray-500">{snapshot.componentId}</p>
        <p className="text-xs text-gray-500 mt-1">
          Last updated: {new Date(snapshot.timestamp).toLocaleTimeString()}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderSection('State', 'state', snapshot.state, true)}
        {renderSection('Refs', 'refs', snapshot.refs)}
        {renderSection('DOM Element States', 'domElementStates', snapshot.domElementStates)}
        {renderSection('Query Results', 'queryResults', snapshot.queryResults)}

        {/* Effects */}
        {snapshot.effects.length > 0 && (
          <div className="border-b border-gray-700">
            <button
              onClick={() => toggleSection('effects')}
              className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              {expandedSections.has('effects') ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <span className="font-semibold text-sm text-blue-400">Effects</span>
              <span className="text-xs text-gray-500">({snapshot.effects.length})</span>
            </button>

            {expandedSections.has('effects') && (
              <div className="px-4 py-2 space-y-2">
                {snapshot.effects.map((effect) => (
                  <div key={effect.index} className="bg-gray-800 rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-purple-400 text-sm font-mono">Effect #{effect.index}</span>
                      {effect.hasCleanup && (
                        <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                          has cleanup
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      Deps:{' '}
                      {effect.deps === undefined ? (
                        <span className="text-yellow-400">runs on every render</span>
                      ) : effect.deps.length === 0 ? (
                        <span className="text-green-400">runs once ([])</span>
                      ) : (
                        <span className="text-gray-300">[{effect.deps.length} dependencies]</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates */}
        {snapshot.templates.length > 0 && (
          <div className="border-b border-gray-700">
            <button
              onClick={() => toggleSection('templates')}
              className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              {expandedSections.has('templates') ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <span className="font-semibold text-sm text-blue-400">Loop Templates</span>
              <span className="text-xs text-gray-500">({snapshot.templates.length})</span>
            </button>

            {expandedSections.has('templates') && (
              <div className="px-4 py-2 space-y-2">
                {snapshot.templates.map((template, idx) => (
                  <div key={idx} className="bg-gray-800 rounded p-2">
                    <div className="text-purple-400 text-sm font-mono mb-1">
                      {template.stateKey}
                    </div>
                    <div className="text-xs text-gray-400 space-y-0.5">
                      <div>Array: {template.arrayBinding}</div>
                      <div>
                        Item: {template.itemVar}
                        {template.indexVar && `, Index: ${template.indexVar}`}
                      </div>
                      {template.keyBinding && <div>Key: {template.keyBinding}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
