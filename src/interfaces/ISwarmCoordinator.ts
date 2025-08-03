/**
 * ISwarmCoordinator - Interface for coordinating agent swarms
 * Handles task distribution, load balancing, and swarm intelligence
 */

import { EventEmitter } from 'eventemitter3';
import { IAgent } from './IAgent.js';
import {
  Task,
  TaskResult,
  SwarmConfig,
  AgentMetadata,
  SystemEvent,
  TaskPriority,
} from './types.js';

export interface ISwarmCoordinator extends EventEmitter {
  // Configuration and setup
  readonly config: SwarmConfig;
  configure(config: Partial<SwarmConfig>): void;

  // Agent management
  addAgent(agent: IAgent): void;
  removeAgent(agentId: string): void;
  getAgent(agentId: string): IAgent | undefined;
  getAllAgents(): IAgent[];
  getActiveAgents(): IAgent[];

  // Task management and distribution
  submitTask(task: Task): Promise<TaskResult>;
  submitTasks(tasks: Task[]): Promise<TaskResult[]>;
  cancelTask(taskId: string): Promise<boolean>;
  getTaskQueue(): Task[];
  clearTaskQueue(): void;

  // Load balancing and optimization
  selectBestAgent(task: Task): IAgent | null;
  distributeLoad(): void;
  rebalanceAgents(): void;
  optimizeTaskAssignment(): void;

  // Health monitoring and failover
  startHealthMonitoring(): void;
  stopHealthMonitoring(): void;
  checkAgentHealth(agentId: string): Promise<boolean>;
  handleAgentFailure(agentId: string): Promise<void>;

  // Swarm intelligence and coordination
  broadcastMessage(message: unknown, exclude?: string[]): Promise<void>;
  coordinateTask(task: Task, participantIds: string[]): Promise<TaskResult>;
  consensusDecision(proposal: unknown, voterIds: string[]): Promise<unknown>;

  // Scaling operations
  scaleUp(targetCount: number): Promise<void>;
  scaleDown(targetCount: number): Promise<void>;
  autoScale(): Promise<void>;

  // Statistics and monitoring
  getSwarmStats(): {
    totalAgents: number;
    activeAgents: number;
    queuedTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgTaskTime: number;
    avgAgentLoad: number;
  };

  getAgentStats(agentId: string): AgentMetadata | null;
  getAllAgentStats(): AgentMetadata[];

  // Event handling
  on(event: 'taskSubmitted', listener: (task: Task) => void): this;
  on(event: 'taskCompleted', listener: (result: TaskResult) => void): this;
  on(event: 'taskFailed', listener: (task: Task, error: Error) => void): this;
  on(event: 'agentAdded', listener: (agent: IAgent) => void): this;
  on(event: 'agentRemoved', listener: (agentId: string) => void): this;
  on(
    event: 'agentFailed',
    listener: (agentId: string, error: Error) => void
  ): this;
  on(
    event: 'swarmScaled',
    listener: (newSize: number, oldSize: number) => void
  ): this;
  on(event: 'loadRebalanced', listener: () => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this;

  // Cleanup and disposal
  shutdown(): Promise<void>;
}
