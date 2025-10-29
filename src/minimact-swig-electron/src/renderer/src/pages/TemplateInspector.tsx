import { useState, useEffect } from 'react'
import { RefreshCw, Settings, Search, Filter } from 'lucide-react'
import TemplateTreeView from '../components/templates/TemplateTreeView'
import type { ComponentTemplates } from '../types/template'

export default function TemplateInspector() {
  const [componentName, setComponentName] = useState<string>('TodoList')
  const [templates, setTemplates] = useState<ComponentTemplates | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'loop' | 'static' | 'dynamic' | 'conditional'>('all')

  useEffect(() => {
    handleRefresh()
  }, [])

  const loadMockData = () => {
    // Mock data for development - will be replaced with SignalR data
    const mockTemplates: ComponentTemplates = {
      component: 'TodoList',
      version: '1.0',
      generatedAt: Date.now(),
      templates: {
        '[0].h1[0].text[0]': {
          template: 'Todo List',
          bindings: [],
          slots: [],
          type: 'static'
        },
        'div[0].text[0]': {
          template: '{0}',
          bindings: ['__complex__'],
          slots: [],
          type: 'dynamic'
        }
      },
      loopTemplates: {
        todos: {
          stateKey: 'todos',
          arrayBinding: 'todos',
          itemVar: 'todo',
          indexVar: 'index',
          keyBinding: 'item.id',
          itemTemplate: {
            type: 'Element',
            tag: 'li',
            propsTemplates: {
              className: {
                template: '{0}',
                bindings: ['item.done'],
                slots: [0],
                conditionalTemplates: {
                  true: 'done',
                  false: 'pending'
                },
                conditionalBindingIndex: 0,
                type: 'conditional'
              }
            },
            childrenTemplates: [
              {
                type: 'Element',
                tag: 'span',
                propsTemplates: null,
                childrenTemplates: [
                  {
                    type: 'Text',
                    template: '{0}',
                    bindings: ['item.text'],
                    slots: [0]
                  }
                ]
              },
              {
                type: 'Element',
                tag: 'button',
                propsTemplates: null,
                childrenTemplates: [
                  {
                    type: 'conditional',
                    template: '{0}',
                    bindings: ['item.done'],
                    slots: [0],
                    conditionalTemplates: {
                      true: '✓',
                      false: '○'
                    },
                    conditionalBindingIndex: 0
                  }
                ]
              }
            ]
          }
        }
      }
    }

    setTemplates(mockTemplates)
    setComponentName(mockTemplates.component)
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      // Get all components from connected app
      const componentsResult = await window.api.template.getComponents()

      if (componentsResult.success && componentsResult.data) {
        // For now, load the first component
        const components = componentsResult.data
        if (components.length > 0) {
          const firstComponent = components[0]
          const metadataResult = await window.api.template.getMetadata(firstComponent.id)

          if (metadataResult.success && metadataResult.data) {
            setTemplates(metadataResult.data.templates)
            setComponentName(metadataResult.data.componentName)
          }
        }
      } else {
        // Fall back to mock data if not connected
        console.warn('Not connected to Minimact app, using mock data')
        loadMockData()
      }
    } catch (error) {
      console.error('Failed to refresh templates:', error)
      // Fall back to mock data on error
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  const handleCopyTemplate = (key: string, template: any) => {
    const json = JSON.stringify(template, null, 2)
    navigator.clipboard.writeText(json)
    // TODO: Show toast notification
    console.log('Copied template to clipboard:', key)
  }

  const handlePreviewTemplate = (key: string, template: any) => {
    // TODO: Open preview modal
    console.log('Preview template:', key, template)
  }

  const filterTemplates = () => {
    if (!templates) return { templates: {}, loopTemplates: {} }

    let filteredTemplates = { ...templates.templates }
    let filteredLoopTemplates = { ...templates.loopTemplates }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredTemplates = Object.fromEntries(
        Object.entries(filteredTemplates).filter(([key, template]) => {
          if (key.toLowerCase().includes(query)) return true
          if ('template' in template && template.template?.toLowerCase().includes(query)) return true
          if ('bindings' in template && template.bindings?.some((b) => b.toLowerCase().includes(query)))
            return true
          return false
        })
      )

      if (filteredLoopTemplates) {
        filteredLoopTemplates = Object.fromEntries(
          Object.entries(filteredLoopTemplates).filter(
            ([key, template]) =>
              key.toLowerCase().includes(query) ||
              template.stateKey.toLowerCase().includes(query) ||
              template.arrayBinding.toLowerCase().includes(query)
          )
        )
      }
    }

    // Apply type filter
    if (filterType !== 'all') {
      if (filterType === 'loop') {
        filteredTemplates = {}
      } else {
        filteredTemplates = Object.fromEntries(
          Object.entries(filteredTemplates).filter(([_, template]) => template.type === filterType)
        )
        filteredLoopTemplates = {}
      }
    }

    return { templates: filteredTemplates, loopTemplates: filteredLoopTemplates }
  }

  const { templates: filteredTemplates, loopTemplates: filteredLoopTemplates } = filterTemplates()

  const templateCount =
    Object.keys(filteredTemplates).length + Object.keys(filteredLoopTemplates || {}).length

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-green-400">Template Inspector</h1>
            <p className="text-xs text-gray-400">Component: {componentName}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded transition-colors flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button className="p-2 hover:bg-gray-700 rounded transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates, bindings, or paths..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as 'all' | 'loop' | 'static' | 'dynamic' | 'conditional')
            }
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Templates</option>
            <option value="loop">Loop Templates</option>
            <option value="static">Static Templates</option>
            <option value="dynamic">Dynamic Templates</option>
            <option value="conditional">Conditional Templates</option>
          </select>
        </div>

        {/* Template Count */}
        <div className="px-3 py-2 bg-gray-700 rounded text-xs text-gray-300">
          {templateCount} template{templateCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : templates ? (
          <TemplateTreeView
            templates={filteredTemplates}
            loopTemplates={filteredLoopTemplates}
            onCopyTemplate={handleCopyTemplate}
            onPreviewTemplate={handlePreviewTemplate}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">No component selected</p>
              <p className="text-sm">Connect to a Minimact app to inspect templates</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
