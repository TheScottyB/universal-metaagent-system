import { AgentFactory, AgentRegistry } from '../src/agents';
import { EnvironmentDetector } from '../src/env';
import { 
  AgentType, 
  TaskPriority, 
  Task,
  EnvironmentConstraints,
  ResourceLevel 
} from '../src/interfaces/types';

describe('Agent Factory Integration Tests', () => {
  let factory: AgentFactory;
  let registry: AgentRegistry;
  let environmentDetector: EnvironmentDetector;

  beforeEach(() => {
    factory = new AgentFactory();
    registry = new AgentRegistry();
    environmentDetector = new EnvironmentDetector();
  });

  afterEach(async () => {
    await registry.shutdown();
  });

  test('should create agent based on current environment', async () => {
    const currentEnvironment = await environmentDetector.detectEnvironment();
    const constraints = await environmentDetector.getEnvironmentConstraints();

    const agent = await factory.createAgent(AgentType.BASIC, {}, constraints);
    
    expect(agent).toBeDefined();
    expect(agent.getState()).toBe('running');
    expect(agent.getMetadata().environment).toBe(currentEnvironment.type);
  });

  test('should select appropriate agent type based on resource constraints', async () => {
    const task: Task = {
      id: 'test-task',
      type: 'computation',
      payload: { data: 'test' },
      priority: TaskPriority.NORMAL,
    };

    // Test with minimal resources
    const minimalEnvironment: EnvironmentConstraints = {
      type: 'nodejs',
      cpuCores: 1,
      memoryMB: 512,
      diskSpaceMB: 1000,
      networkBandwidthMbps: 10,
      maxConcurrentAgents: 1,
      supportedProtocols: [],
      resourceLevel: ResourceLevel.MINIMAL,
      capabilities: [],
      limitations: ['low-memory'],
    };

    const minimalAgentType = factory.selectOptimalAgentType(task, minimalEnvironment);
    expect(minimalAgentType).toBe(AgentType.BASIC); // Should select basic for minimal resources

    // Test with high resources
    const highResourceEnvironment: EnvironmentConstraints = {
      type: 'nodejs',
      cpuCores: 8,
      memoryMB: 16384,
      diskSpaceMB: 100000,
      networkBandwidthMbps: 1000,
      maxConcurrentAgents: 20,
      supportedProtocols: ['http', 'websocket'],
      resourceLevel: ResourceLevel.HIGH,
      capabilities: ['gpu-acceleration'],
      limitations: [],
    };

    const highResourceAgentType = factory.selectOptimalAgentType(task, highResourceEnvironment);
    expect(highResourceAgentType).toBe(AgentType.BASIC); // Currently only basic is implemented
  });

  test('should create and manage multiple agents with registry', async () => {
    const constraints = await environmentDetector.getEnvironmentConstraints();

    // Create multiple agents
    const basicAgent = await factory.createAgent(AgentType.BASIC, {
      capabilities: ['basic-processing']
    }, constraints);

    const ephemeralAgent = await factory.createAgent(AgentType.EPHEMERAL, {
      capabilities: ['quick-tasks']
    }, constraints);

    // Register agents
    registry.register(basicAgent);
    registry.register(ephemeralAgent);

    // Test registry functionality
    const stats = registry.getStats();
    expect(stats.total).toBe(2);
    expect(stats.byType[AgentType.BASIC]).toBe(1);
    expect(stats.byType[AgentType.EPHEMERAL]).toBe(1);

    // Test finding agents by capability
    const processingAgents = registry.findAgents({ capabilities: ['basic-processing'] });
    expect(processingAgents).toHaveLength(1);
    expect(processingAgents[0].agent.id).toBe(basicAgent.id);

    const quickTaskAgents = registry.findAgents({ capabilities: ['quick-tasks'] });
    expect(quickTaskAgents).toHaveLength(1);
    expect(quickTaskAgents[0].agent.id).toBe(ephemeralAgent.id);
  });

  test('should handle agent lifecycle events', async () => {
    const constraints = await environmentDetector.getEnvironmentConstraints();
    const agent = await factory.createAgent(AgentType.BASIC, {}, constraints);

    const events: string[] = [];

    agent.on('initialized', () => events.push('initialized'));
    agent.on('stateChanged', (newState, oldState) => {
      events.push(`stateChanged:${oldState}->${newState}`);
    });
    agent.on('terminated', () => events.push('terminated'));

    registry.register(agent);
    
    // Agent is already initialized, so let's test termination
    await agent.terminate();

    expect(events).toContain('terminated');
  });

  test('should execute tasks on appropriate agents', async () => {
    const constraints = await environmentDetector.getEnvironmentConstraints();
    const agent = await factory.createAgent(AgentType.BASIC, {
      capabilities: ['basic', 'test-task']
    }, constraints);

    registry.register(agent);

    const task: Task = {
      id: 'integration-test-task',
      type: 'basic',
      payload: { message: 'Hello from integration test' },
      priority: TaskPriority.NORMAL,
    };

    const result = await agent.executeTask(task);

    expect(result.success).toBe(true);
    expect(result.taskId).toBe(task.id);
    expect(result.agentId).toBe(agent.id);
    expect(result.result).toContain('Basic task');
  });

  test('should handle batch agent creation', async () => {
    const constraints = await environmentDetector.getEnvironmentConstraints();

    const requests = [
      { type: AgentType.BASIC, config: { capabilities: ['task1'] }, environment: constraints },
      { type: AgentType.BASIC, config: { capabilities: ['task2'] }, environment: constraints },
      { type: AgentType.EPHEMERAL, config: { capabilities: ['task3'] }, environment: constraints },
    ];

    const agents = await factory.createAgentBatch(requests);

    expect(agents).toHaveLength(3);
    expect(agents[0].getCapabilities()).toContain('task1');
    expect(agents[1].getCapabilities()).toContain('task2');
    expect(agents[2].getCapabilities()).toContain('task3');

    // Register all agents
    agents.forEach(agent => registry.register(agent));

    const stats = registry.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byType[AgentType.BASIC]).toBe(2);
    expect(stats.byType[AgentType.EPHEMERAL]).toBe(1);
  });

  test('should handle factory statistics', async () => {
    const constraints = await environmentDetector.getEnvironmentConstraints();
    
    const initialStats = factory.getFactoryStats();
    expect(initialStats.totalCreated).toBe(0);

    // Create some agents
    await factory.createAgent(AgentType.BASIC, {}, constraints);
    await factory.createAgent(AgentType.EPHEMERAL, {}, constraints);

    const updatedStats = factory.getFactoryStats();
    expect(updatedStats.totalCreated).toBeGreaterThan(initialStats.totalCreated);
  });
});
