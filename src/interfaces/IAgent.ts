/**
 * IAgent - Standard interface for all agents in the Universal Metaagent System
 * Defines the contract that all agents must implement
 */

import { EventEmitter } from 'eventemitter3';
import {
  AgentState,
  AgentConfig,
  AgentMetadata,
  Task,
  TaskResult,
  SystemEvent,
} from './types';

export interface IAgent extends EventEmitter {
  // Core identification and metadata
  readonly id: string;
  readonly config: AgentConfig;

  // Lifecycle management
  initialize(): Promise<void>;
  terminate(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;

  // State management
  getState(): AgentState;
  getMetadata(): AgentMetadata;
  isHealthy(): boolean;

  // Task execution
  executeTask(task: Task): Promise<TaskResult>;
  canHandleTask(task: Task): boolean;
  getCurrentLoad(): number; // 0-1 representing current capacity usage

  // Agent capabilities
  getCapabilities(): string[];
  hasCapability(capability: string): boolean;

  // Communication and events
  sendMessage(targetAgentId: string, message: unknown): Promise<void>;
  onMessage(callback: (message: unknown, fromAgentId: string) => void): void;

  // Health and monitoring
  getHealthStatus(): Promise<{
    healthy: boolean;
    uptime: number;
    lastError?: Error;
    resourceUsage: {
      cpu: number;
      memory: number;
    };
  }>;

  // Event types this agent can emit
  on(event: 'initialized', listener: () => void): this;
  on(event: 'terminated', listener: () => void): this;
  on(event: 'suspended', listener: () => void): this;
  on(event: 'resumed', listener: () => void): this;
  on(event: 'taskStarted', listener: (task: Task) => void): this;
  on(event: 'taskCompleted', listener: (result: TaskResult) => void): this;
  on(event: 'taskFailed', listener: (task: Task, error: Error) => void): this;
  on(
    event: 'stateChanged',
    listener: (newState: AgentState, oldState: AgentState) => void
  ): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(
    event: 'message',
    listener: (message: unknown, fromAgentId: string) => void
  ): this;
  on(event: string, listener: (...args: unknown[]) => void): this;
}
