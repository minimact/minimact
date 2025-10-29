import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Type,
  RefreshCw,
  GitBranch,
  Tag,
  Copy,
  Eye
} from 'lucide-react'
import type {
  TemplateNode,
  LoopTemplate,
  ElementTemplate,
  ConditionalTemplate
} from '../../types/template'

interface TemplateTreeNodeProps {
  label: string
  icon: React.ReactNode
  children?: React.ReactNode
  defaultExpanded?: boolean
  onCopy?: () => void
  onPreview?: () => void
}

function TemplateTreeNode({
  label,
  icon,
  children,
  defaultExpanded = false,
  onCopy,
  onPreview
}: TemplateTreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const hasChildren = children !== undefined && children !== null

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 py-1 px-2 hover:bg-gray-700 rounded group">
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-200"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}

        <div className="text-gray-400">{icon}</div>

        <span className="text-sm text-gray-200 flex-1">{label}</span>

        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          {onCopy && (
            <button
              onClick={onCopy}
              className="p-1 hover:bg-gray-600 rounded"
              title="Copy JSON"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
          {onPreview && (
            <button
              onClick={onPreview}
              className="p-1 hover:bg-gray-600 rounded"
              title="Preview"
            >
              <Eye className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {expanded && hasChildren && <div className="ml-6 border-l border-gray-700 pl-2">{children}</div>}
    </div>
  )
}

interface TemplateTreeViewProps {
  templates: Record<string, TemplateNode>
  loopTemplates?: Record<string, LoopTemplate>
  onCopyTemplate?: (key: string, template: any) => void
  onPreviewTemplate?: (key: string, template: any) => void
}

export default function TemplateTreeView({
  templates,
  loopTemplates,
  onCopyTemplate,
  onPreviewTemplate
}: TemplateTreeViewProps) {
  const renderConditionalBranches = (conditional: ConditionalTemplate) => {
    return Object.entries(conditional.conditionalTemplates || {}).map(([key, value]) => (
      <TemplateTreeNode key={key} label={`${key} → "${value}"`} icon={<GitBranch className="w-4 h-4" />} />
    ))
  }

  const renderElementTemplate = (element: ElementTemplate, key: string) => {
    return (
      <TemplateTreeNode
        key={key}
        label={`Element: ${element.tag}`}
        icon={<Tag className="w-4 h-4" />}
        defaultExpanded
      >
        {element.propsTemplates && (
          <TemplateTreeNode label="Props" icon={<Type className="w-4 h-4" />} defaultExpanded>
            {Object.entries(element.propsTemplates).map(([propKey, propTemplate]) => (
              <TemplateTreeNode
                key={propKey}
                label={`${propKey} (${propTemplate.type})`}
                icon={<Type className="w-4 h-4" />}
              >
                {'template' in propTemplate && (
                  <div className="text-xs text-gray-400 py-1">
                    Template: <code className="text-green-400">{propTemplate.template}</code>
                  </div>
                )}
                {'bindings' in propTemplate && propTemplate.bindings && propTemplate.bindings.length > 0 && (
                  <div className="text-xs text-gray-400 py-1">
                    Bindings: <code className="text-blue-400">[{propTemplate.bindings.join(', ')}]</code>
                  </div>
                )}
                {propTemplate.type === 'conditional' && 'conditionalTemplates' in propTemplate && (
                  <div className="mt-1">{renderConditionalBranches(propTemplate as ConditionalTemplate)}</div>
                )}
              </TemplateTreeNode>
            ))}
          </TemplateTreeNode>
        )}

        {element.childrenTemplates && element.childrenTemplates.length > 0 && (
          <TemplateTreeNode label="Children" icon={<Type className="w-4 h-4" />} defaultExpanded>
            {element.childrenTemplates.map((child, idx) => {
              if (child.type === 'Element') {
                return renderElementTemplate(child as ElementTemplate, `child-${idx}`)
              } else if (child.type === 'Text') {
                return (
                  <TemplateTreeNode
                    key={`text-${idx}`}
                    label={`Text: "${child.template}"`}
                    icon={<Type className="w-4 h-4" />}
                  >
                    {child.bindings && child.bindings.length > 0 && (
                      <div className="text-xs text-gray-400 py-1">
                        Bindings: <code className="text-blue-400">[{child.bindings.join(', ')}]</code>
                      </div>
                    )}
                  </TemplateTreeNode>
                )
              } else if (child.type === 'conditional') {
                return (
                  <TemplateTreeNode
                    key={`conditional-${idx}`}
                    label={`Conditional`}
                    icon={<GitBranch className="w-4 h-4" />}
                  >
                    {child.bindings && (
                      <div className="text-xs text-gray-400 py-1">
                        Bindings: <code className="text-blue-400">[{child.bindings.join(', ')}]</code>
                      </div>
                    )}
                    {'conditionalTemplates' in child && renderConditionalBranches(child)}
                  </TemplateTreeNode>
                )
              }
              return null
            })}
          </TemplateTreeNode>
        )}
      </TemplateTreeNode>
    )
  }

  const renderLoopTemplate = (key: string, loopTemplate: LoopTemplate) => {
    return (
      <TemplateTreeNode
        key={key}
        label={`Loop Template: "${loopTemplate.stateKey}"`}
        icon={<FileText className="w-4 h-4 text-purple-400" />}
        defaultExpanded
        onCopy={() => onCopyTemplate?.(key, loopTemplate)}
        onPreview={() => onPreviewTemplate?.(key, loopTemplate)}
      >
        <div className="space-y-1 py-1">
          <div className="text-xs text-gray-400">
            State Key: <code className="text-green-400">{loopTemplate.stateKey}</code>
          </div>
          <div className="text-xs text-gray-400">
            Array Binding: <code className="text-blue-400">{loopTemplate.arrayBinding}</code>
          </div>
          <div className="text-xs text-gray-400">
            Item Variable: <code className="text-yellow-400">{loopTemplate.itemVar}</code>
          </div>
          {loopTemplate.indexVar && (
            <div className="text-xs text-gray-400">
              Index Variable: <code className="text-yellow-400">{loopTemplate.indexVar}</code>
            </div>
          )}
          {loopTemplate.keyBinding && (
            <div className="text-xs text-gray-400">
              Key Binding: <code className="text-blue-400">{loopTemplate.keyBinding}</code>
            </div>
          )}
        </div>

        <TemplateTreeNode label="Item Template" icon={<Tag className="w-4 h-4" />} defaultExpanded>
          {renderElementTemplate(loopTemplate.itemTemplate, 'item-template')}
        </TemplateTreeNode>
      </TemplateTreeNode>
    )
  }

  const renderTemplate = (key: string, template: TemplateNode) => {
    if (template.type === 'static') {
      return (
        <TemplateTreeNode
          key={key}
          label={`Static Template: "${key}"`}
          icon={<Type className="w-4 h-4 text-gray-400" />}
          onCopy={() => onCopyTemplate?.(key, template)}
        >
          <div className="text-xs text-gray-400 py-1">
            Template: <code className="text-green-400">"{template.template}"</code>
          </div>
        </TemplateTreeNode>
      )
    }

    if (template.type === 'dynamic') {
      return (
        <TemplateTreeNode
          key={key}
          label={`Dynamic Template: "${key}"`}
          icon={<RefreshCw className="w-4 h-4 text-blue-400" />}
          onCopy={() => onCopyTemplate?.(key, template)}
        >
          <div className="text-xs text-gray-400 py-1">
            Template: <code className="text-green-400">{template.template}</code>
          </div>
          <div className="text-xs text-gray-400 py-1">
            Bindings: <code className="text-blue-400">[{template.bindings.join(', ')}]</code>
          </div>
          {template.slots && (
            <div className="text-xs text-gray-400 py-1">
              Slots: <code className="text-yellow-400">[{template.slots.join(', ')}]</code>
            </div>
          )}
        </TemplateTreeNode>
      )
    }

    if (template.type === 'conditional') {
      return (
        <TemplateTreeNode
          key={key}
          label={`Conditional Template: "${key}"`}
          icon={<GitBranch className="w-4 h-4 text-yellow-400" />}
          defaultExpanded
          onCopy={() => onCopyTemplate?.(key, template)}
        >
          <div className="text-xs text-gray-400 py-1">
            Template: <code className="text-green-400">{template.template}</code>
          </div>
          <div className="text-xs text-gray-400 py-1">
            Bindings: <code className="text-blue-400">[{template.bindings.join(', ')}]</code>
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Branches:</div>
            {renderConditionalBranches(template)}
          </div>
        </TemplateTreeNode>
      )
    }

    if (template.type === 'complex') {
      return (
        <TemplateTreeNode
          key={key}
          label={`Complex Template: "${key}"`}
          icon={<RefreshCw className="w-4 h-4 text-orange-400" />}
          onCopy={() => onCopyTemplate?.(key, template)}
        >
          <div className="text-xs text-gray-400 py-1">
            Template: <code className="text-green-400">{template.template}</code>
          </div>
          <div className="text-xs text-orange-400 py-1">
            ⚠️ Warning: Requires server evaluation
          </div>
        </TemplateTreeNode>
      )
    }

    return null
  }

  return (
    <div className="space-y-2">
      {loopTemplates &&
        Object.entries(loopTemplates).map(([key, template]) => renderLoopTemplate(key, template))}

      {Object.entries(templates).map(([key, template]) => renderTemplate(key, template))}

      {Object.keys(templates).length === 0 && !loopTemplates && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No templates found</p>
          <p className="text-xs mt-1">Connect to a Minimact app to see templates</p>
        </div>
      )}
    </div>
  )
}
