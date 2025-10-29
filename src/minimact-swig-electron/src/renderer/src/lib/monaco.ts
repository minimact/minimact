import * as monaco from 'monaco-editor'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

type MonacoWorkerFactory = new () => Worker

const workerGetters: Record<string, MonacoWorkerFactory> = {
  json: jsonWorker,
  css: cssWorker,
  scss: cssWorker,
  less: cssWorker,
  html: htmlWorker,
  handlebars: htmlWorker,
  razor: htmlWorker,
  typescript: tsWorker,
  javascript: tsWorker
}

const globalScope = globalThis as typeof globalThis & {
  MonacoEnvironment?: {
    getWorker: (moduleId: string, label: string) => Worker
  }
}

if (!globalScope.MonacoEnvironment) {
  globalScope.MonacoEnvironment = {
    getWorker: (_moduleId, label) => {
      const WorkerConstructor = workerGetters[label] ?? editorWorker
      return new WorkerConstructor()
    }
  }
}

export { monaco }
export default monaco
