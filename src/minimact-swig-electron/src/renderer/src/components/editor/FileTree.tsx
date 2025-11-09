import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'

export interface ProjectFile {
  name: string
  path: string
  type: 'file' | 'directory'
  extension?: string
  kind?: 'tsx' | 'jsx' | 'ts' | 'js' | 'cs' | 'csproj' | 'json' | 'other'
  children?: ProjectFile[]
  nestedFiles?: ProjectFile[]  // Related files (e.g., .cs, .keys, .json)
  isNested?: boolean  // Whether this file is nested under another
}

interface FileTreeProps {
  projectPath: string
  onFileClick: (file: ProjectFile) => void
  selectedFile?: ProjectFile | null
  refreshKey?: number
}

interface FileTreeItemProps {
  file: ProjectFile
  level: number
  onFileClick: (file: ProjectFile) => void
  selectedFile?: ProjectFile | null
}

// Helper: Group related files under their source file
function nestRelatedFiles(files: ProjectFile[]): ProjectFile[] {
  const fileMap = new Map<string, ProjectFile>()
  const nested = new Set<string>()

  // First pass: index all files
  files.forEach(file => {
    if (file.type === 'file') {
      fileMap.set(file.path, file)
    }
  })

  // Second pass: find related files and nest them
  files.forEach(file => {
    if (file.type === 'file') {
      const baseName = file.name.replace(/\.(tsx|jsx)$/, '')

      // Only process TSX/JSX source files
      if (file.extension === 'tsx' || file.extension === 'jsx') {
        const relatedPatterns = [
          `${baseName}.cs`,
          `${file.name}.keys`,
          `${baseName}.hooks.json`,
          `${baseName}.structural-changes.json`,
          `${baseName}.templates.json`
        ]

        const nestedFiles: ProjectFile[] = []

        relatedPatterns.forEach(pattern => {
          const relatedFile = Array.from(fileMap.values()).find(f => f.name === pattern)
          if (relatedFile) {
            nestedFiles.push({ ...relatedFile, isNested: true })
            nested.add(relatedFile.path)
          }
        })

        if (nestedFiles.length > 0) {
          file.nestedFiles = nestedFiles
        }
      }
    }
  })

  // Filter out nested files from top level
  return files.map(file => {
    if (file.type === 'directory' && file.children) {
      return { ...file, children: nestRelatedFiles(file.children) }
    }
    return file
  }).filter(file => !nested.has(file.path))
}

function FileTreeItem({ file, level, onFileClick, selectedFile }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2) // Auto-expand first 2 levels
  const [isNestedExpanded, setIsNestedExpanded] = useState(false) // Nested files collapsed by default

  const handleClick = () => {
    if (file.type === 'directory') {
      setIsExpanded(!isExpanded)
    } else {
      // Always open files when clicked (even if they have nested files)
      onFileClick(file)
    }
  }

  const handleNestedToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsNestedExpanded(!isNestedExpanded)
  }

  const isSelected = selectedFile?.path === file.path
  const paddingLeft = `${level * 16 + 8}px`

  // File icons based on extension
  const getFileIcon = () => {
    if (file.type === 'directory') {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-400" />
      ) : (
        <Folder className="w-4 h-4 text-blue-400" />
      )
    }

    // File type colors
    const ext = file.extension?.toLowerCase() ?? file.kind?.toLowerCase()
    let color = 'text-gray-400'

    if (ext === 'tsx' || ext === 'jsx') color = 'text-cyan-400'
    else if (ext === 'ts' || ext === 'js') color = 'text-yellow-400'
    else if (ext === 'cs') color = 'text-purple-400'
    else if (ext === 'json') color = 'text-green-400'
    else if (ext === 'css' || ext === 'scss') color = 'text-pink-400'

    return <File className={`w-4 h-4 ${color}`} />
  }

  const hasNestedFiles = file.nestedFiles && file.nestedFiles.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-700/50 transition-colors ${
          isSelected ? 'bg-blue-600/30 border-l-2 border-l-blue-500' : ''
        }`}
        style={{ paddingLeft }}
        onClick={handleClick}
      >
        {file.type === 'directory' ? (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </span>
        ) : hasNestedFiles ? (
          <span className="flex-shrink-0" onClick={handleNestedToggle}>
            {isNestedExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}
        {getFileIcon()}
        <span className={`text-sm truncate ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>
          {file.name}
          {hasNestedFiles && (
            <span className="ml-1 text-xs text-gray-500">({file.nestedFiles.length})</span>
          )}
        </span>
      </div>

      {/* Nested files (generated files) */}
      {hasNestedFiles && isNestedExpanded && (
        <div>
          {file.nestedFiles.map((nestedFile) => (
            <div
              key={nestedFile.path}
              className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                selectedFile?.path === nestedFile.path ? 'bg-blue-600/30 border-l-2 border-l-blue-500' : ''
              }`}
              style={{ paddingLeft: `${level * 16 + 32}px` }}
              onClick={() => onFileClick(nestedFile)}
            >
              <span className="w-3" />
              <File className={`w-3 h-3 ${
                nestedFile.extension === 'cs' ? 'text-purple-400' :
                nestedFile.extension === 'json' ? 'text-green-400' :
                nestedFile.name.endsWith('.keys') ? 'text-cyan-400' :
                'text-gray-400'
              }`} />
              <span className={`text-xs truncate ${
                selectedFile?.path === nestedFile.path ? 'text-white font-medium' : 'text-gray-400'
              }`}>
                {nestedFile.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Directory children */}
      {file.type === 'directory' && isExpanded && file.children && (
        <div>
          {file.children.map((child) => (
            <FileTreeItem
              key={child.path}
              file={child}
              level={level + 1}
              onFileClick={onFileClick}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileTree({ projectPath, onFileClick, selectedFile, refreshKey }: FileTreeProps) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFiles()
  }, [projectPath, refreshKey])

  const loadFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.api.project.scanFiles(projectPath)

      if (result.success) {
        // Apply file nesting to group related files
        const nestedFiles = nestRelatedFiles(result.data)
        setFiles(nestedFiles)
      } else {
        setError(result.error || 'Failed to load files')
      }
    } catch (err) {
      setError('Failed to load files')
      console.error('Failed to load files:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500 animate-pulse">Loading files...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-400">{error}</div>
        <button
          onClick={loadFiles}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">No files found</div>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full">
      {files.map((file) => (
        <FileTreeItem
          key={file.path}
          file={file}
          level={0}
          onFileClick={onFileClick}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  )
}
