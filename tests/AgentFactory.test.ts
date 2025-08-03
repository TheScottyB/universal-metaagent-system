import { AgentFactory, BasicAgent, EphemeralAgent, LanguageAgnosticAgent } from '../src/agents';
import { EnvironmentConstraints, AgentType, TaskPriority, ResourceLevel, Task, AgentConfig, EnvironmentType, CommunicationProtocol } from '../src/interfaces/types';
import { IAgent } from '../src/interfaces/IAgent';

// Util function for sleep
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

describe('AgentFactory', () => {
  let factory: AgentFactory;

  beforeEach(() => {
    factory = new AgentFactory();
  });

  test('should create basic agent', async () => {
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

    const agent = await factory.createAgent(AgentType.BASIC, {}, environment);
    expect(agent).toBeInstanceOf(BasicAgent);
    expect(agent.getState()).toBe('running');
  });

  test('should select optimal agent type', () => {
    const task: Task = {
      id: 'example-task',
      type: 'compute',
      payload: {},
      priority: TaskPriority.HIGH,
    };

    const environment: EnvironmentConstraints = {
      type: EnvironmentType.NODE_JS,
      cpuCores: 4,
      memoryMB: 8192,
      diskSpaceMB: 10000,
      networkBandwidthMbps: 1000,
      maxConcurrentAgents: 10,
      supportedProtocols: [CommunicationProtocol.HTTP],
      resourceLevel: ResourceLevel.HIGH,
      capabilities: [],
      limitations: [],
    };

    const optimalType = factory.selectOptimalAgentType(task, environment);
    expect(optimalType).toBe(AgentType.BASIC);
  });

  test('should handle agent configuration', async () => {
    const environment: EnvironmentConstraints = {
      type: EnvironmentType.NODE_JS,
      cpuCores: 1,
      memoryMB: 1024,
      diskSpaceMB: 5000,
      networkBandwidthMbps: 100,
      maxConcurrentAgents: 2,
      supportedProtocols: [],
      resourceLevel: ResourceLevel.LOW,
      capabilities: [],
      limitations: [],
    };

    const config: Partial<AgentConfig> = {
      timeout: 10000,
    };

    const agent = await factory.createAgent(AgentType.EPHEMERAL, config, environment);
    expect(agent).toBeInstanceOf(EphemeralAgent);
    expect(agent.getConfig().timeout).toBe(10000);
  });

  test('should create language-agnostic agent', async () => {
    const environment: EnvironmentConstraints = {
      type: EnvironmentType.NODE_JS,
      cpuCores: 4,
      memoryMB: 4096,
      diskSpaceMB: 10000,
      networkBandwidthMbps: 500,
      maxConcurrentAgents: 4,
      supportedProtocols: [CommunicationProtocol.HTTP],
      resourceLevel: ResourceLevel.MEDIUM,
      capabilities: [],
      limitations: [],
    };

    const config: Partial<AgentConfig> = {
      timeout: 20000,
    };

    const agent = await factory.createLanguageAgnosticAgent('python', '/path/to/script.py', config);
    expect(agent).toBeInstanceOf(LanguageAgnosticAgent);
  });

  afterEach(async () => {
    // Clean up
    await delay(100);
  });
});

