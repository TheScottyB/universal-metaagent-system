import { EventEmitter } from 'eventemitter3';
import { IAgent } from '../interfaces/IAgent';
import {
  AgentMetadata,
  CommunicationProtocol,
  EnvironmentType,
} from '../interfaces/types';

export interface RemoteAgentInfo {
  endpoint: string;
  protocol: CommunicationProtocol;
  metadata: AgentMetadata;
  connected: boolean;
  lastHeartbeat: Date;
}

export interface RemoteAgentRegistryOptions {
  heartbeatInterval: number;
  reconnectInterval: number;
  maxRetries: number;
  connectionTimeout: number;
}

/**
 * RemoteAgentRegistry - Manages remote agents and facilitates discovery and communication
 * Supports multiple communication protocols (HTTP, WebSocket, gRPC)
 */
export class RemoteAgentRegistry extends EventEmitter {
  private remoteAgents = new Map<string, RemoteAgentInfo>();
  private options: RemoteAgentRegistryOptions;
  private heartbeatTimers = new Map<string, NodeJS.Timeout>();

  constructor(options?: Partial<RemoteAgentRegistryOptions>) {
    super();
    this.options = {
      heartbeatInterval: 30000, // 30 seconds
      reconnectInterval: 10000, // 10 seconds
      maxRetries: 5,
      connectionTimeout: 5000, // 5 seconds
      ...options,
    };
  }

  /**
   * Register a remote agent with the registry
   */
  register(agent: IAgent, info: RemoteAgentInfo): void {
    const existing = this.remoteAgents.get(agent.id);
    if (!existing) {
      this.remoteAgents.set(agent.id, info);
      this.startHeartbeat(agent.id);
      this.emit('registered', info);
    } else {
      this.updateMetadata(agent.id, info.metadata);
    }
  }

  /**
   * Unregister a remote agent
   */
  unregister(agentId: string): boolean {
    const existing = this.remoteAgents.get(agentId);
    if (existing) {
      clearInterval(this.heartbeatTimers.get(agentId));
      this.heartbeatTimers.delete(agentId);
      this.remoteAgents.delete(agentId);
      this.emit('unregistered', agentId);
      return true;
    }
    return false;
  }

  /**
   * Discover remote agents by communication protocol
   */
  discover(protocol: CommunicationProtocol): RemoteAgentInfo[] {
    return Array.from(this.remoteAgents.values()).filter(agent => agent.protocol === protocol);
  }

  /**
   * Start heartbeat for a remote agent
   */
  private startHeartbeat(agentId: string): void {
    if (!this.remoteAgents.has(agentId)) return;

    const timer = setInterval(() => {
      const agent = this.remoteAgents.get(agentId);
      if (!agent) return;

      // Simulate heartbeat check
      if (Math.random() < 0.9) { // 90% success rate
        agent.lastHeartbeat = new Date();
        this.emit('heartbeat', { agentId, success: true });
      } else {
        this.handleDisconnection(agentId);
        this.emit('heartbeat', { agentId, success: false });
      }
    }, this.options.heartbeatInterval);

    this.heartbeatTimers.set(agentId, timer);
  }

  /**
   * Handle a successful agent heartbeat
   */
  private handleHeartbeatSuccess(agentId: string): void {
    const agent = this.remoteAgents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = new Date();
      this.emit('heartbeatSuccess', agentId);
    }
  }

  /**
   * Handle agent disconnection and retries
   */
  private handleDisconnection(agentId: string): void {
    const agent = this.remoteAgents.get(agentId);
    if (!agent) return;

    clearInterval(this.heartbeatTimers.get(agentId));
    this.emit('disconnected', agentId);
    
    if (agent.connected) {
      agent.connected = false;
      this.retryConnection(agentId, this.options.maxRetries);
    }
  }

  /**
   * Retry connection with exponential backoff
   */
  private retryConnection(agentId: string, retriesLeft: number): void {
    if (retriesLeft <= 0) {
      this.emit('connectionFailed', agentId);
      return;
    }

    setTimeout(() => {
      const agent = this.remoteAgents.get(agentId);

      if (!agent) return;

      this.emit('retryingConnection', agentId);

      // Simulate reconnection attempt
      if (Math.random() < 0.5) { // 50% success rate
        agent.connected = true;
        this.emit('reconnected', agentId);
        this.startHeartbeat(agentId);
      } else {
        this.retryConnection(agentId, retriesLeft - 1);
      }
    }, this.options.reconnectInterval * (this.options.maxRetries - retriesLeft + 1)); // Exponential backoff
  }

  /**
   * Update agent metadata
   */
  private updateMetadata(agentId: string, metadata: AgentMetadata): void {
    const agent = this.remoteAgents.get(agentId);
    if (agent) {
      agent.metadata = metadata;
      this.emit('metadataUpdated', { agentId, metadata });
    }
  }

  /**
   * Shutdown and cleanup resources
   */
  shutdown(): void {
    this.heartbeatTimers.forEach(timer => clearInterval(timer));
    this.heartbeatTimers.clear();
    this.remoteAgents.clear();
    this.removeAllListeners();
  }
}
