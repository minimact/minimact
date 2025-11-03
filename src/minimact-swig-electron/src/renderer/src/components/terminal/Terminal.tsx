import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

interface TerminalProps {
  onData?: (data: string) => void
}

export default function Terminal({ onData }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    // Create terminal instance
    const xterm = new XTerm({
      theme: {
        background: '#000000',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
        selectionBackground: '#264f78',
        selectionForeground: '#ffffff'
      },
      fontFamily: '"Cascadia Code", "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      tabStopWidth: 4,
      allowProposedApi: true,
      allowTransparency: false
    })

    // Create fit addon
    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)

    // Open terminal in DOM
    xterm.open(terminalRef.current)

    // Fit terminal to container
    fitAddon.fit()

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)

    // Handle terminal input (if needed)
    if (onData) {
      xterm.onData((data) => {
        onData(data)
      })
    }

    // Store refs
    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Welcome message
    xterm.writeln('\x1b[1;32m● Minimact Swig Terminal\x1b[0m')
    xterm.writeln('\x1b[90m─────────────────────────────────────────────────────────\x1b[0m')
    xterm.writeln('Build and run output will appear here...')
    xterm.writeln('')

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      xterm.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
  }, [onData])

  // Expose write method via window for IPC callbacks
  useEffect(() => {
    const handleProcessOutput = (event: Event) => {
      if (xtermRef.current && event instanceof CustomEvent) {
        xtermRef.current.write(event.detail)
      }
    }

    // Register listener for process output (via IPC)
    // Note: This will be connected when ProcessController streams output
    window.addEventListener('process:output', handleProcessOutput)

    return () => {
      window.removeEventListener('process:output', handleProcessOutput)
    }
  }, [])

  return (
    <div className="h-full w-full bg-black" style={{ userSelect: 'text' }}>
      <div ref={terminalRef} className="h-full w-full" style={{ userSelect: 'text' }} />
    </div>
  )
}

// Helper function to write to terminal from outside the component
export function writeToTerminal(message: string) {
  const event = new CustomEvent('process:output', { detail: message })
  window.dispatchEvent(event)
}
