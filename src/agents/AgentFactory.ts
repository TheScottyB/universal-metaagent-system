import { IAgentFactory } from '../interfaces/IAgentFactory.js';
import { IAgent } from '../interfaces/IAgent.js';
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
} from '../interfaces/types.js';
import { BasicAgent } from './BasicAgent.js';
import { EphemeralAgent } from './EphemeralAgent.js';
import { LanguageAgnosticAgent } from './LanguageAgnosticAgent.js';

class AgentFactory implements IAgentFactory {
  readonly name = 'Universal Agent Factory';
  readonly supportedAgentTypes: AgentType[] = [
    AgentType.BASIC,
    AgentType.WORKER,
    AgentType.COORDINATOR,
    AgentType.SPECIALIST,
    AgentType.REMOTE,
    AgentType.PROXY,
    AgentType.EPHEMERAL,
  ];

  private stats = {
    totalCreated: 0,
    totalDestroyed: 0,
    currentActive: 0,
    errorCount: 0,
    avgCreationTime: 0,
    creationTimes: [] as number[],
  };

  private activeAgents = new Map<string, IAgent>();

async createAgent(
    type: AgentType,
    config: Partial<AgentConfig>,
    environment: EnvironmentConstraints
  ): Promise<IAgent> {
    const agentConfig = this.generateAgentConfig(type, environment, config);
    let agent: IAgent;
    const start = Date.now();

    switch (type) {
      case AgentType.BASIC:
        agent = new BasicAgent(agentConfig);
        break;
      case AgentType.EPHEMERAL:
        agent = new EphemeralAgent(agentConfig);
        break;
      default:
        throw new Error(`Agent type ${type} is not supported.`);
    }

    this.activeAgents.set(agent.id, agent);
    await agent.initialize();
    this.stats.totalCreated++;
    this.stats.currentActive++;
    const creationTime = Date.now() - start;
    this.stats.creationTimes.push(creationTime);
    this.stats.avgCreationTime = this.stats.creationTimes.reduce((a, b) => a + b, 0) / this.stats.creationTimes.length;

    return agent;
  }

selectOptimalAgentType(
    task: Task,
    environment: EnvironmentConstraints,
    availableTypes: AgentType[] = this.supportedAgentTypes
  ): AgentType {
    const scores = availableTypes.map(type => {
      let score = 0;
      
      // Adjust score based on task priority
      if (task.priority === TaskPriority.CRITICAL) {
        score += 10;
      }

      // Adjust score based on environment resource level
      switch (environment.resourceLevel) {
        case ResourceLevel.UNLIMITED:
          score += 10;
          break;
        case ResourceLevel.HIGH:
          score += 5;
          break;
        case ResourceLevel.MEDIUM:
          score += 2;
          break;
        case ResourceLevel.LOW:
          score -= 2;
          break;
        case ResourceLevel.MINIMAL:
          score -= 5;
          break;
      }

      return { type, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].type;
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
    }; // Placeholder logic
  }

  canCreateAgent(type: AgentType, environment: EnvironmentConstraints): boolean {
    return this.supportedAgentTypes.includes(type); // Placeholder logic
  }

  validateAgentConfig(config: AgentConfig): boolean {
    return true; // Placeholder logic
  }

  async createRemoteAgent(
    remoteInfo: RemoteAgentInfo,
    localConfig: Partial<AgentConfig> = {}
  ): Promise<IAgent> {
    // Placeholder for creating remote agent
    return new Promise((resolve) => {
      resolve({} as IAgent);
    });
  }

  getAgentTemplate(type: AgentType): Partial<AgentConfig> {
    return {}; // Placeholder logic
  }

  getAvailableTemplates(): Record<string, Partial<AgentConfig>> {
    return {}; // Placeholder logic
  }

  async createLanguageAgnosticAgent(
    language: string,
    scriptPath: string,
    config: Partial<AgentConfig>
  ): Promise<IAgent> {
    // Default environment for language-agnostic agents
    const defaultEnvironment: EnvironmentConstraints = {
      type: EnvironmentType.NODE_JS,
      cpuCores: 2,
      memoryMB: 2048,
      diskSpaceMB: 10000,
      networkBandwidthMbps: 100,
      maxConcurrentAgents: 5,
      supportedProtocols: [CommunicationProtocol.HTTP],
      resourceLevel: ResourceLevel.MEDIUM,
      capabilities: [`${language.toLowerCase()}-support`],
      limitations: ['external-process-dependency'],
    };

    const agentConfig = this.generateAgentConfig(
      AgentType.REMOTE, // Language-agnostic agents are treated as remote
      defaultEnvironment,
      config
    );

    const agent = new LanguageAgnosticAgent(agentConfig, language, scriptPath);
    this.activeAgents.set(agent.id, agent);
    
    const start = Date.now();
    await agent.initialize();
    
    this.stats.totalCreated++;
    this.stats.currentActive++;
    const creationTime = Date.now() - start;
    this.stats.creationTimes.push(creationTime);
    this.stats.avgCreationTime = this.stats.creationTimes.reduce((a, b) => a + b, 0) / this.stats.creationTimes.length;

    return agent;
  }

  async createAgentBatch(
    requests: Array<{
      type: AgentType;
      config: Partial<AgentConfig>;
      environment: EnvironmentConstraints;
    }>
  ): Promise<IAgent[]> {
    // Placeholder for batch creation
    return Promise.all(
      requests.map((request) =>
        this.createAgent(request.type, request.config, request.environment)
      )
    );
  }

  async destroyAgent(agentId: string): Promise<void> {
    // Placeholder for destroying an agent
  }

  async destroyAllAgents(): Promise<void> {
    // Placeholder for destroying all agents
  }

  getSupportedLanguages(): string[] {
    return ['JavaScript', 'Python', 'Java']; // Placeholder logic
  }

  getCapabilities(): string[] {
    return ['basic', 'worker', 'coordinator']; // Placeholder logic
  }

  getFactoryStats() {
    return {
      totalCreated: 0,
      totalDestroyed: 0,
      currentActive: 0,
      errorCount: 0,
      avgCreationTime: 0,
    }; // Placeholder logic
  }
}

export { AgentFactory };

