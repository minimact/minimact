import { app, shell, BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import splashPage from '../../resources/splash.html?asset'

// Import services
import { ProjectManager, TranspilerService } from '@minimact/swig-shared'
import { ProcessController } from './services/ProcessController'
import { SignalRClient } from './services/SignalRClient'

// Import IPC handlers
import { registerProjectHandlers } from './ipc/project'
import { registerTranspilerHandlers } from './ipc/transpiler'
import { registerProcessHandlers } from './ipc/process'
import { registerFileHandlers } from './ipc/file'
import { registerTemplateHandlers } from './ipc/template'
import { registerSignalRHandlers } from './ipc/signalr'
import { registerModulesHandlers } from './ipc/modules'

// Initialize services
const projectManager = new ProjectManager(app.getPath('userData'))
const transpilerService = new TranspilerService()
const processController = new ProcessController()
const signalRClient = new SignalRClient()

// Register IPC handlers
registerProjectHandlers(projectManager)
registerTranspilerHandlers(transpilerService)
registerProcessHandlers(processController)
registerFileHandlers()
registerTemplateHandlers(signalRClient)
registerSignalRHandlers()
registerModulesHandlers()

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let splashHideTimeout: NodeJS.Timeout | null = null

const SPLASH_DELAY_MS = 3000

function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ] as MenuItemConstructorOptions[])
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' as const } : { role: 'quit' as const }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? ([{ role: 'pasteAndMatchStyle' as const }, { role: 'delete' as const }, { role: 'selectAll' as const }] as MenuItemConstructorOptions[])
          : ([{ role: 'delete' as const }, { role: 'selectAll' as const }] as MenuItemConstructorOptions[]))
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { type: 'separator' as const },
        {
          role: 'toggleDevTools' as const,
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I'
        },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? ([{ type: 'separator' as const }, { role: 'front' as const }, { type: 'separator' as const }, { role: 'window' as const }] as MenuItemConstructorOptions[])
          : ([{ role: 'close' as const }] as MenuItemConstructorOptions[]))
      ]
    },
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Minimact Docs',
          click: () => shell.openExternal('https://github.com/minimact/minimact')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 490,
    height: 700,
    frame: false,
    resizable: false,
    transparent: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#050b12',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: false
    }
  })

  splashWindow.once('ready-to-show', () => {
    splashWindow?.show()
  })

  splashWindow.on('closed', () => {
    splashWindow = null
  })

  splashWindow.loadFile(splashPage)
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    // Show main window and close splash after delay
    splashHideTimeout = setTimeout(() => {
      if (splashWindow) {
        splashWindow.close()
      }
      mainWindow?.maximize()
      mainWindow?.show()
      mainWindow?.focus()
    }, SPLASH_DELAY_MS)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    if (splashHideTimeout) {
      clearTimeout(splashHideTimeout)
      splashHideTimeout = null
    }
    mainWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.minimact.swig')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createApplicationMenu()
  createSplashWindow()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  processController.stop()
})
