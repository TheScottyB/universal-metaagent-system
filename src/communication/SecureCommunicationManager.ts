import WebSocket from 'ws'; // WebSocket client library
import { EventEmitter } from 'eventemitter3';
import { RemoteAgentInfo } from '../registry/RemoteAgentRegistry';
import { CommunicationProtocol } from '../interfaces/types';

export interface SecureChannelOptions {
  retryInterval: number; // Time to wait before retrying failed connections
  maxRetries: number;  // Maximum number of reconnection attempts
  encryptionKey: string; // Key for encrypting messages
}

export class SecureCommunicationManager extends EventEmitter {
  private channels: Map<string, WebSocket> = new Map();
  private options: SecureChannelOptions;
  private retries: Map<string, number> = new Map();

  constructor(options: SecureChannelOptions) {
    super();
    this.options = options;
  }

  /**
   * Start secure communication channel to remote agent
   */
  connect(agentInfo: RemoteAgentInfo): void {
    if (agentInfo.protocol === CommunicationProtocol.WEBSOCKET) {
      this.connectWebSocket(agentInfo);
    } else {
      this.emit('connectionError', { agentId: agentInfo.metadata.id, error: 'Unsupported protocol' });
    }
  }

  /**
   * Connect to remote agent using WebSocket
   */
  private connectWebSocket(agentInfo: RemoteAgentInfo): void {
    if (this.channels.has(agentInfo.metadata.id)) return; // Already connected

    const ws = new WebSocket(agentInfo.endpoint);
    this.channels.set(agentInfo.metadata.id, ws);
    this.retries.set(agentInfo.metadata.id, 0);

    ws.on('open', () => {
      this.emit('connected', { agentId: agentInfo.metadata.id });
    });

    ws.on('message', (message) => {
      const decryptedMessage = this.decryptMessage(message.toString(), this.options.encryptionKey);
      this.emit('messageReceived', { agentId: agentInfo.metadata.id, message: decryptedMessage });
    });

    ws.on('error', (error) => {
      this.emit('connectionError', { agentId: agentInfo.metadata.id, error: error.message });
      this.reconnect(agentInfo);
    });

    ws.on('close', () => {
      this.channels.delete(agentInfo.metadata.id);
      this.emit('disconnected', { agentId: agentInfo.metadata.id });
      this.reconnect(agentInfo);
    });
  }

  /**
   * Send encrypted message to remote agent
   */
  sendMessage(agentId: string, message: string): void {
    const ws = this.channels.get(agentId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      this.emit('sendError', { agentId, error: 'Connection not open' });
      return;
    }

    const encryptedMessage = this.encryptMessage(message, this.options.encryptionKey);
    ws.send(encryptedMessage);
  }

  /**
   * Encrypt message
   */
  private encryptMessage(message: string, key: string): string {
    // Placeholder encryption using Base64
    return Buffer.from(message).toString('base64') + key;
  }

  /**
   * Decrypt message
   */
  private decryptMessage(encryptedMessage: string, key: string): string {
    // Placeholder decryption
    if (!encryptedMessage.endsWith(key)) {
      throw new Error('Decryption failed: invalid key');
    }
    const base64Message = encryptedMessage.slice(0, -key.length);
    return Buffer.from(base64Message, 'base64').toString('utf-8');
  }

  /**
   * Attempt to reconnect to remote agent
   */
  private reconnect(agentInfo: RemoteAgentInfo): void {
    const retries = this.retries.get(agentInfo.metadata.id) || 0;
    if (retries >= this.options.maxRetries) {
      this.emit('reconnectFailed', { agentId: agentInfo.metadata.id });
      return;
    }

    setTimeout(() => {
      this.retries.set(agentInfo.metadata.id, retries + 1);
      this.connectWebSocket(agentInfo);
    }, this.options.retryInterval);
  }

  /**
   * Shutdown all communication channels
   */
  shutdown(): void {
    this.channels.forEach((ws) => ws.close());
    this.channels.clear();
    this.removeAllListeners();
  }
}

