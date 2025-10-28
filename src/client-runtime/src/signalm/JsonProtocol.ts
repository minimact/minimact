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
   */
  static parseMessage(data: string): Message {
    try {
      return JSON.parse(data) as Message;
    } catch (error) {
      throw new Error(`Failed to parse message: ${error}`);
    }
  }

  /**
   * Serialize message to JSON string
   */
  static serializeMessage(message: Message): string {
    return JSON.stringify(message);
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
