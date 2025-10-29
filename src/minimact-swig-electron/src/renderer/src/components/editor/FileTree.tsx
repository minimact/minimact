import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'

export interface ProjectFile {
  name: string
  path: string
  type: 'file' | 'directory'
  extension?: string
  children?: ProjectFile[]
}

interface FileTreeProps {
  projectPath: string
  onFileClick: (file: ProjectFile) => void
  selectedFile?: ProjectFile | null
}

interface FileTreeItemProps {
  file: ProjectFile
  level: number
  onFileClick: (file: ProjectFile) => void
  selectedFile?: ProjectFile | null
}

function FileTreeItem({ file, level, onFileClick, selectedFile }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2) // Auto-expand first 2 levels

  const handleClick = () => {
    if (file.type === 'directory') {
      setIsExpanded(!isExpanded)
    } else {
      onFileClick(file)
    }
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
    const ext = file.extension?.toLowerCase()
    let color = 'text-gray-400'

    if (ext === 'tsx' || ext === 'jsx') color = 'text-cyan-400'
    else if (ext === 'ts' || ext === 'js') color = 'text-yellow-400'
    else if (ext === 'cs') color = 'text-purple-400'
    else if (ext === 'json') color = 'text-green-400'
    else if (ext === 'css' || ext === 'scss') color = 'text-pink-400'

    return <File className={`w-4 h-4 ${color}`} />
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-700/50 transition-colors ${
          isSelected ? 'bg-blue-600/30 border-l-2 border-l-blue-500' : ''
        }`}
        style={{ paddingLeft }}
        onClick={handleClick}
      >
        {file.type === 'directory' && (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </span>
        )}
        {file.type === 'file' && <span className="w-4" />}
        {getFileIcon()}
        <span className={`text-sm truncate ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>
          {file.name}
        </span>
      </div>

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

export default function FileTree({ projectPath, onFileClick, selectedFile }: FileTreeProps) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFiles()
  }, [projectPath])

  const loadFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.api.project.scanFiles(projectPath)

      if (result.success) {
        setFiles(result.data)
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
