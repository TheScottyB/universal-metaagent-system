/**
 * IAgentFactory - Interface for creating agents based on environmental constraints
 * Factories handle the complex logic of choosing and configuring appropriate agents
 */

import { IAgent } from './IAgent.js';
import {
  AgentType,
  AgentConfig,
  EnvironmentConstraints,
  Task,
  RemoteAgentInfo,
} from './types.js';

export interface IAgentFactory {
  // Factory identification
  readonly name: string;
  readonly supportedAgentTypes: AgentType[];

  // Agent creation
  createAgent(
    type: AgentType,
    config: Partial<AgentConfig>,
    environment: EnvironmentConstraints
  ): Promise<IAgent>;

  // Intelligent agent selection
  selectOptimalAgentType(
    task: Task,
    environment: EnvironmentConstraints,
    availableTypes?: AgentType[]
  ): AgentType;

  // Configuration generation
  generateAgentConfig(
    type: AgentType,
    environment: EnvironmentConstraints,
    customConfig?: Record<string, unknown>
  ): AgentConfig;

  // Agent type validation
  canCreateAgent(type: AgentType, environment: EnvironmentConstraints): boolean;
  validateAgentConfig(config: AgentConfig): boolean;

  // Remote agent support
  createRemoteAgent(
    remoteInfo: RemoteAgentInfo,
    localConfig?: Partial<AgentConfig>
  ): Promise<IAgent>;

  // Agent templates and presets
  getAgentTemplate(type: AgentType): Partial<AgentConfig>;
  getAvailableTemplates(): Record<string, Partial<AgentConfig>>;

  // Language-agnostic agent support
  createLanguageAgnosticAgent(
    language: string,
    scriptPath: string,
    config: Partial<AgentConfig>
  ): Promise<IAgent>;

  // Batch operations
  createAgentBatch(
    requests: Array<{
      type: AgentType;
      config: Partial<AgentConfig>;
      environment: EnvironmentConstraints;
    }>
  ): Promise<IAgent[]>;

  // Agent lifecycle management
  destroyAgent(agentId: string): Promise<void>;
  destroyAllAgents(): Promise<void>;

  // Factory capabilities
  getSupportedLanguages(): string[];
  getCapabilities(): string[];

  // Metrics and monitoring
  getFactoryStats(): {
    totalCreated: number;
    totalDestroyed: number;
    currentActive: number;
    errorCount: number;
    avgCreationTime: number;
  };
}
