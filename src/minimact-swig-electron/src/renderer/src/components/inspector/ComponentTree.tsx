import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Component } from 'lucide-react'

interface ComponentTreeNode {
  componentId: string
  componentName: string
  children: ComponentTreeNode[]
}

interface ComponentTreeProps {
  onComponentSelect: (componentId: string) => void
  selectedComponentId?: string
}

export default function ComponentTree({ onComponentSelect, selectedComponentId }: ComponentTreeProps) {
  const [tree, setTree] = useState<ComponentTreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Fetch component tree from server
    const fetchTree = async () => {
      try {
        const result = await window.api.signalr.getComponentTree()
        if (result.success) {
          setTree(result.data)
          // Auto-expand root nodes
          if (result.data.length > 0) {
            setExpandedNodes(new Set(result.data.map((node: ComponentTreeNode) => node.componentId)))
          }
        }
      } catch (error) {
        console.error('Failed to fetch component tree:', error)
      }
    }

    fetchTree()

    // Poll for updates (in production, use SignalR events)
    const interval = setInterval(fetchTree, 2000)
    return () => clearInterval(interval)
  }, [])

  const toggleNode = (componentId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(componentId)) {
      newExpanded.delete(componentId)
    } else {
      newExpanded.add(componentId)
    }
    setExpandedNodes(newExpanded)
  }

  const renderNode = (node: ComponentTreeNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.componentId)
    const isSelected = selectedComponentId === node.componentId
    const hasChildren = node.children.length > 0

    return (
      <div key={node.componentId}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-900/50 border-l-2 border-blue-400' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onComponentSelect(node.componentId)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.componentId)
              }}
              className="p-0.5 hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <Component className="w-4 h-4 text-green-400" />
          <span className="text-sm text-gray-100 font-mono">{node.componentName}</span>
          {hasChildren && (
            <span className="text-xs text-gray-500 ml-auto">({node.children.length})</span>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Component className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No components found</p>
          <p className="text-xs mt-1">Start the app to see components</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-900 text-gray-100 overflow-y-auto">
      <div className="py-2">{tree.map((node) => renderNode(node))}</div>
    </div>
  )
}
