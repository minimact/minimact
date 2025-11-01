/**
 * SignalR JSON Protocol Implementation
 *
 * Implements the SignalR JSON protocol for message serialization.
 * Compatible with ASP.NET Core SignalR hubs.
 *
 * Protocol Spec: https://github.com/dotnet/aspnetcore/blob/main/src/SignalR/docs/specs/HubProtocol.md
 */

import type {
  Message,
  InvocationMessage,
  CompletionMessage,
  PingMessage,
  CloseMessage,
  MessageType
} from './types';

export class JsonProtocol {
  /**
   * Protocol name
   */
  static readonly protocolName = 'json';

  /**
   * Protocol version
   */
  static readonly protocolVersion = 1;

  /**
   * SignalR message record separator (ASCII 30)
   * Every SignalR message must be terminated with this character
   */
  private static readonly RECORD_SEPARATOR = '\x1E';

  /**
   * Write handshake request message
   * Must be sent immediately after WebSocket connection is established
   */
  static writeHandshake(): string {
    const handshake = {
      protocol: this.protocolName,
      version: this.protocolVersion
    };
    return JSON.stringify(handshake) + this.RECORD_SEPARATOR;
  }

  /**
   * Parse handshake response message
   */
  static parseHandshake(data: string): { error?: string } {
    try {
      const cleanData = data.endsWith(this.RECORD_SEPARATOR)
        ? data.slice(0, -1)
        : data;
      return JSON.parse(cleanData) as { error?: string };
    } catch (error) {
      throw new Error(`Failed to parse handshake: ${error}`);
    }
  }

  /**
   * Write invocation message (client → server RPC call)
   */
  static writeInvocation(
    invocationId: string,
    target: string,
    args: any[]
  ): InvocationMessage {
    return {
      type: 1 as MessageType.Invocation,
      invocationId,
      target,
      arguments: args
    };
  }

  /**
   * Write message without response (fire-and-forget)
   */
  static writeMessage(target: string, args: any[]): InvocationMessage {
    return {
      type: 1 as MessageType.Invocation,
      target,
      arguments: args
    };
  }

  /**
   * Write ping message (keep-alive)
   */
  static writePing(): PingMessage {
    return {
      type: 6 as MessageType.Ping
    };
  }

  /**
   * Write close message
   */
  static writeClose(error?: string): CloseMessage {
    return {
      type: 7 as MessageType.Close,
      error
    };
  }

  /**
   * Parse incoming message
   * Removes record separator if present
   */
  static parseMessage(data: string): Message {
    try {
      // Remove record separator if present
      const cleanData = data.endsWith(this.RECORD_SEPARATOR)
        ? data.slice(0, -1)
        : data;
      return JSON.parse(cleanData) as Message;
    } catch (error) {
      throw new Error(`Failed to parse message: ${error}`);
    }
  }

  /**
   * Serialize message to JSON string with SignalR record separator
   * SignalR requires all messages to end with \x1E
   */
  static serializeMessage(message: Message): string {
    return JSON.stringify(message) + this.RECORD_SEPARATOR;
  }

  /**
   * Check if message is invocation
   */
  static isInvocation(message: Message): message is InvocationMessage {
    return message.type === 1;
  }

  /**
   * Check if message is completion
   */
  static isCompletion(message: Message): message is CompletionMessage {
    return message.type === 3;
  }

  /**
   * Check if message is ping
   */
  static isPing(message: Message): message is PingMessage {
    return message.type === 6;
  }

  /**
   * Check if message is close
   */
  static isClose(message: Message): message is CloseMessage {
    return message.type === 7;
  }
}
