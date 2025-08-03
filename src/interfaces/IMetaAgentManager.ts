/**
 * IMetaAgentManager - Interface for managing metaagent swarms and environments
 * Coordinators implement the overarching management logic for agent orchestration
 */

import { IAgent } from './IAgent.js';
import { IEnvironmentAdapter } from './IEnvironmentAdapter.js';
import { IAgentFactory } from './IAgentFactory.js';
import { ISwarmCoordinator } from './ISwarmCoordinator.js';
import {
  EnvironmentConstraints,
  SwarmConfig,
  AgentConfig,
  SystemEvent,
} from './types.js';

export interface IMetaAgentManager {
  // Core components composition
  readonly environmentAdapter: IEnvironmentAdapter;
  readonly agentFactory: IAgentFactory;
  readonly swarmCoordinator: ISwarmCoordinator;

  // Initialization and setup
  initialize(): Promise<void>;
  configure(config: Partial<SwarmConfig>): void;

  // Environment and resource management
  getEnvironmentConstraints(): Promise<EnvironmentConstraints>;
  startResourceMonitoring(): void;
  stopResourceMonitoring(): void;

  // Agent orchestration
  spawnAgent(config: AgentConfig): Promise<IAgent>;
  terminateAgent(agentId: string): Promise<void>;

  // Event handling and communication
  on(event: 'agentSpawned', listener: (agent: IAgent) => void): this;
  on(event: 'agentTerminated', listener: (agentId: string) => void): this;
  on(
    event: 'environmentChanged',
    listener: (constraints: EnvironmentConstraints) => void
  ): this;
  on(event: 'systemEvent', listener: (event: SystemEvent) => void): this;

  // Management utilities
  getAllAgents(): IAgent[];
  getAgentById(agentId: string): IAgent | undefined;
  getAgentStats(): {
    total: number;
    active: number;
    terminated: number;
    errors: number;
  };

  // Swarm coordination and scaling
  scaleSwarm(desiredAgentCount: number): Promise<void>;
  balanceLoads(): void;
  scheduleHealthChecks(): void;

  // Diagnostics and reporting
  exportDiagnostics(): Promise<string>;
  reportAnomalies(): Promise<SystemEvent[]>;
  logSystemStatus(): void;

  // Cleanup and shutdown
  shutdown(): Promise<void>;
}
