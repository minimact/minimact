import { Page } from '@minimact/spa';

export default function DefaultShell() {
  return (
    <div style="min-height: 100vh; display: flex; flex-direction: column;">
      <header style="background: #333; color: white; padding: 20px;">
        <h1 style="margin: 0;">Minimact Counter - Debug Mode Demo</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.8;">Client debug messages are being sent to the server!</p>
      </header>

      <main style="flex: 1; padding: 20px;">
        <Page />
      </main>

      <footer style="background: #f5f5f5; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
        <p style="margin: 0;">
          💡 Debug mode is enabled - Set a breakpoint in MinimactHub.cs:27 (DebugMessage)
        </p>
      </footer>
    </div>
  );
}
