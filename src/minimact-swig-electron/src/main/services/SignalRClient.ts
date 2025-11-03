import * as signalR from '@microsoft/signalr';
import { net } from 'electron';

/**
 * SignalRClient - Connects to running Minimact app for telemetry
 *
 * Responsibilities:
 * - Connect to target app's MinimactHub
 * - Listen for component/state/performance events
 * - Send control commands
 */
export class SignalRClient {
  private connection: signalR.HubConnection | null = null;
  private eventHandlers: Map<string, Array<(...args: any[]) => void>> = new Map();

  /**
   * Connect to SignalR hub
   */
  async connect(url: string): Promise<void> {
    console.log(`[SignalRClient] Attempting to connect to: ${url}`);

    if (this.connection) {
      await this.disconnect();
    }

    // Create a custom fetch function using Electron's net module
    const electronFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      return new Promise((resolve, reject) => {
        // Create request with method in options
        const request = net.request({
          url: urlStr,
          method: init?.method || 'GET'
        });

        // Set headers
        if (init?.headers) {
          const headers = init.headers as Record<string, string>;
          Object.entries(headers).forEach(([key, value]) => {
            request.setHeader(key, value);
          });
        }

        request.on('response', (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          response.on('end', () => {
            const body = Buffer.concat(chunks).toString();
            resolve(new Response(body, {
              status: response.statusCode,
              headers: response.headers as any
            }));
          });
        });

        request.on('error', reject);

        if (init?.body) {
          request.write(init.body);
        }

        request.end();
      });
    };

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        transport: signalR.HttpTransportType.WebSockets,
        // @ts-ignore - Use Electron's net module for HTTP requests
        httpClient: {
          async send(request: signalR.HttpRequest): Promise<signalR.HttpResponse> {
            console.log(`[HttpClient] ${request.method} ${request.url}`);
            console.log(`[HttpClient] Headers:`, request.headers);
            const response = await electronFetch(request.url!, {
              method: request.method,
              headers: request.headers as any,
              body: request.content
            });
            const text = await response.text();
            console.log(`[HttpClient] Response: ${response.status} ${response.statusText}`);
            console.log(`[HttpClient] Body:`, text.substring(0, 200));
            return {
              statusCode: response.status,
              statusText: response.statusText,
              content: text
            };
          },
          getCookieString(url: string): string {
            return '';
          }
        }
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Debug)
      .build();

    // Register existing event handlers
    for (const [event, handlers] of this.eventHandlers.entries()) {
      for (const handler of handlers) {
        this.connection.on(event, handler);
      }
    }

    try {
      await this.connection.start();
      console.log(`[SignalRClient] Successfully connected to: ${url}`);
    } catch (error) {
      console.error(`[SignalRClient] Failed to connect to: ${url}`, error);
      throw error;
    }
  }

  /**
   * Disconnect from SignalR hub
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  /**
   * Register event handler
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    this.eventHandlers.get(event)!.push(callback);

    if (this.connection) {
      this.connection.on(event, callback);
    }
  }

  /**
   * Unregister event handler
   */
  off(event: string, callback: (...args: any[]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }

    if (this.connection) {
      this.connection.off(event, callback);
    }
  }

  /**
   * Invoke server method
   */
  async invoke(method: string, ...args: any[]): Promise<any> {
    if (!this.connection) {
      throw new Error('Not connected to SignalR hub');
    }

    return await this.connection.invoke(method, ...args);
  }

  /**
   * Check connection state
   */
  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}
