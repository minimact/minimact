/**
 * SignalR JSON Protocol Implementation
 *
 * Implements the SignalR JSON protocol for message serialization.
 * Compatible with ASP.NET Core SignalR hubs.
 *
 * Protocol Spec: https://github.com/dotnet/aspnetcore/blob/main/src/SignalR/docs/specs/HubProtocol.md
 */
import type { Message, InvocationMessage, CompletionMessage, PingMessage, CloseMessage } from './types';
export declare class JsonProtocol {
    /**
     * Protocol name
     */
    static readonly protocolName = "json";
    /**
     * Protocol version
     */
    static readonly protocolVersion = 1;
    /**
     * Write invocation message (client → server RPC call)
     */
    static writeInvocation(invocationId: string, target: string, args: any[]): InvocationMessage;
    /**
     * Write message without response (fire-and-forget)
     */
    static writeMessage(target: string, args: any[]): InvocationMessage;
    /**
     * Write ping message (keep-alive)
     */
    static writePing(): PingMessage;
    /**
     * Write close message
     */
    static writeClose(error?: string): CloseMessage;
    /**
     * Parse incoming message
     */
    static parseMessage(data: string): Message;
    /**
     * Serialize message to JSON string
     */
    static serializeMessage(message: Message): string;
    /**
     * Check if message is invocation
     */
    static isInvocation(message: Message): message is InvocationMessage;
    /**
     * Check if message is completion
     */
    static isCompletion(message: Message): message is CompletionMessage;
    /**
     * Check if message is ping
     */
    static isPing(message: Message): message is PingMessage;
    /**
     * Check if message is close
     */
    static isClose(message: Message): message is CloseMessage;
}
