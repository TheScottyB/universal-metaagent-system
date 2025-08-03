import { IAgentFactory } from '../src/interfaces/IAgentFactory';
import { IAgent } from '../src/interfaces/IAgent';
import {
  AgentType,
  AgentConfig,
  EnvironmentConstraints,
  Task,
  RemoteAgentInfo,
  ResourceLevel,
  TaskPriority,
  EnvironmentType,
  CommunicationProtocol,
} from '../src/interfaces/types';

// Simple implementation for testing
class SimpleAgentFactory implements IAgentFactory {
  readonly name = 'Test Agent Factory';
  readonly supportedAgentTypes: AgentType[] = [AgentType.BASIC];

  async createAgent(
    type: AgentType,
    config: Partial<AgentConfig>,
    environment: EnvironmentConstraints
  ): Promise<IAgent> {
    // Return a mock agent for testing
    return {} as IAgent;
  }

  selectOptimalAgentType(
    task: Task,
    environment: EnvironmentConstraints,
    availableTypes: AgentType[] = this.supportedAgentTypes
  ): AgentType {
    return AgentType.BASIC;
  }

  generateAgentConfig(
    type: AgentType,
    environment: EnvironmentConstraints,
    customConfig: Record<string, unknown> = {}
  ): AgentConfig {
    return {
      type,
      maxConcurrentTasks: 5,
      timeout: 300,
      retries: 2,
      capabilities: [],
      environment,
      customConfig,
    };
  }

  canCreateAgent(type: AgentType, environment: EnvironmentConstraints): boolean {
    return this.supportedAgentTypes.includes(type);
  }

  validateAgentConfig(config: AgentConfig): boolean {
    return true;
  }

  async createRemoteAgent(
    remoteInfo: RemoteAgentInfo,
    localConfig: Partial<AgentConfig> = {}
  ): Promise<IAgent> {
    return {} as IAgent;
  }

  getAgentTemplate(type: AgentType): Partial<AgentConfig> {
    return {};
  }

  getAvailableTemplates(): Record<string, Partial<AgentConfig>> {
    return {};
  }

  async createLanguageAgnosticAgent(
    language: string,
    scriptPath: string,
    config: Partial<AgentConfig>
  ): Promise<IAgent> {
    return {} as IAgent;
  }

  async createAgentBatch(
    requests: Array<{
      type: AgentType;
      config: Partial<AgentConfig>;
      environment: EnvironmentConstraints;
    }>
  ): Promise<IAgent[]> {
    return [];
  }

  async destroyAgent(agentId: string): Promise<void> {}

  async destroyAllAgents(): Promise<void> {}

  getSupportedLanguages(): string[] {
    return ['JavaScript'];
  }

  getCapabilities(): string[] {
    return ['basic'];
  }

  getFactoryStats() {
    return {
      totalCreated: 0,
      totalDestroyed: 0,
      currentActive: 0,
      errorCount: 0,
      avgCreationTime: 0,
    };
  }
}

describe('Simple Agent Factory', () => {
  let factory: SimpleAgentFactory;

  beforeEach(() => {
    factory = new SimpleAgentFactory();
  });

  test('should implement IAgentFactory interface', () => {
    expect(factory.name).toBe('Test Agent Factory');
    expect(factory.supportedAgentTypes).toContain(AgentType.BASIC);
  });

  test('should select optimal agent type', () => {
    const task: Task = {
      id: 'test-task',
      type: 'basic',
      payload: {},
      priority: TaskPriority.NORMAL,
    };

    const environment: EnvironmentConstraints = {
      type: EnvironmentType.NODE_JS,
      cpuCores: 2,
      memoryMB: 2048,
      diskSpaceMB: 10000,
      networkBandwidthMbps: 100,
      maxConcurrentAgents: 5,
      supportedProtocols: [CommunicationProtocol.HTTP],
      resourceLevel: ResourceLevel.MEDIUM,
      capabilities: [],
      limitations: [],
    };

    const selectedType = factory.selectOptimalAgentType(task, environment);
    expect(selectedType).toBe(AgentType.BASIC);
  });

  test('should generate agent config', () => {
    const environment: EnvironmentConstraints = {
      type: EnvironmentType.NODE_JS,
      cpuCores: 2,
      memoryMB: 2048,
      diskSpaceMB: 10000,
      networkBandwidthMbps: 100,
      maxConcurrentAgents: 5,
      supportedProtocols: [CommunicationProtocol.HTTP],
      resourceLevel: ResourceLevel.MEDIUM,
      capabilities: [],
      limitations: [],
    };

    const config = factory.generateAgentConfig(AgentType.BASIC, environment);
    expect(config.type).toBe(AgentType.BASIC);
    expect(config.environment).toBe(environment);
    expect(config.maxConcurrentTasks).toBe(5);
  });

  test('should validate agent creation capability', () => {
    const environment: EnvironmentConstraints = {
      type: EnvironmentType.NODE_JS,
      cpuCores: 2,
      memoryMB: 2048,
      diskSpaceMB: 10000,
      networkBandwidthMbps: 100,
      maxConcurrentAgents: 5,
      supportedProtocols: [CommunicationProtocol.HTTP],
      resourceLevel: ResourceLevel.MEDIUM,
      capabilities: [],
      limitations: [],
    };

    expect(factory.canCreateAgent(AgentType.BASIC, environment)).toBe(true);
    expect(factory.canCreateAgent(AgentType.WORKER, environment)).toBe(false);
  });
});
