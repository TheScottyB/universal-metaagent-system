import { AgentRegistry, BasicAgent, AgentFactory } from '../src/agents';
import { 
  EnvironmentConstraints, 
  AgentType, 
  ResourceLevel, 
  EnvironmentType, 
  CommunicationProtocol,
  AgentState 
} from '../src/interfaces/types';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;
  let factory: AgentFactory;
  let testEnvironment: EnvironmentConstraints;

  beforeEach(() => {
    registry = new AgentRegistry(5000); // 5 second health check interval for tests
    factory = new AgentFactory();

    testEnvironment = {
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
  });

  afterEach(async () => {
    await registry.shutdown();
  });

  test('should register and track agents', async () => {
    const agent = await factory.createAgent(AgentType.BASIC, {}, testEnvironment);
    
    registry.register(agent);
    
    const registeredAgent = registry.getAgent(agent.id);
    expect(registeredAgent).toBe(agent);
    
    const stats = registry.getStats();
    expect(stats.total).toBe(1);
    expect(stats.byType[AgentType.BASIC]).toBe(1);
  });

  test('should unregister agents', async () => {
    const agent = await factory.createAgent(AgentType.BASIC, {}, testEnvironment);
    
    registry.register(agent);
    expect(registry.getStats().total).toBe(1);
    
    const unregistered = registry.unregister(agent.id);
    expect(unregistered).toBe(true);
    expect(registry.getStats().total).toBe(0);
  });

  test('should find agents by type', async () => {
    const basicAgent = await factory.createAgent(AgentType.BASIC, {}, testEnvironment);
    const ephemeralAgent = await factory.createAgent(AgentType.EPHEMERAL, {}, testEnvironment);
    
    registry.register(basicAgent);
    registry.register(ephemeralAgent);
    
    const basicAgents = registry.getAgentsByType(AgentType.BASIC);
    expect(basicAgents).toHaveLength(1);
    expect(basicAgents[0].agent.id).toBe(basicAgent.id);
    
    const ephemeralAgents = registry.getAgentsByType(AgentType.EPHEMERAL);
    expect(ephemeralAgents).toHaveLength(1);
    expect(ephemeralAgents[0].agent.id).toBe(ephemeralAgent.id);
  });

  test('should find agents by capabilities', async () => {
    const agent1 = await factory.createAgent(AgentType.BASIC, { 
      capabilities: ['search', 'analyze'] 
    }, testEnvironment);
    
    const agent2 = await factory.createAgent(AgentType.BASIC, { 
      capabilities: ['search', 'process'] 
    }, testEnvironment);
    
    registry.register(agent1);
    registry.register(agent2);
    
    const searchAgents = registry.findAgents({ capabilities: ['search'] });
    expect(searchAgents).toHaveLength(2);
    
    const analyzeAgents = registry.findAgents({ capabilities: ['analyze'] });
    expect(analyzeAgents).toHaveLength(1);
    expect(analyzeAgents[0].agent.id).toBe(agent1.id);
  });

  test('should find best agent for task', async () => {
    const lowLoadAgent = await factory.createAgent(AgentType.BASIC, { 
      capabilities: ['task1'] 
    }, testEnvironment);
    
    const highLoadAgent = await factory.createAgent(AgentType.BASIC, { 
      capabilities: ['task1'] 
    }, testEnvironment);
    
    registry.register(lowLoadAgent);
    registry.register(highLoadAgent);
    
    // Mock getCurrentLoad to simulate different loads
    jest.spyOn(lowLoadAgent, 'getCurrentLoad').mockReturnValue(0.2);
    jest.spyOn(highLoadAgent, 'getCurrentLoad').mockReturnValue(0.8);
    
    const bestAgent = registry.findBestAgent(['task1']);
    expect(bestAgent?.id).toBe(lowLoadAgent.id);
  });

  test('should get available agents', async () => {
    const runningAgent = await factory.createAgent(AgentType.BASIC, {}, testEnvironment);
    
    registry.register(runningAgent);
    
    // Mock health status
    jest.spyOn(runningAgent, 'isHealthy').mockReturnValue(true);
    jest.spyOn(runningAgent, 'getCurrentLoad').mockReturnValue(0.5);
    
    const availableAgents = registry.getAvailableAgents();
    expect(availableAgents).toHaveLength(1);
    expect(availableAgents[0].agent.id).toBe(runningAgent.id);
  });

  test('should emit events on agent registration', (done) => {
    const agent = factory.createAgent(AgentType.BASIC, {}, testEnvironment);
    
    registry.on('agentRegistered', (event) => {
      expect(event.agentId).toBeDefined();
      expect(event.metadata).toBeDefined();
      done();
    });
    
    agent.then(a => registry.register(a));
  });

  test('should automatically unregister terminated agents', (done) => {
    const agent = factory.createAgent(AgentType.BASIC, {}, testEnvironment);
    
    registry.on('agentUnregistered', (event) => {
      expect(event.agentId).toBeDefined();
      done();
    });
    
    agent.then(async (a) => {
      registry.register(a);
      await a.terminate(); // This should trigger auto-unregistration
    });
  });

  test('should handle agent errors', (done) => {
    const agent = factory.createAgent(AgentType.BASIC, {}, testEnvironment);
    
    registry.on('agentError', (event) => {
      expect(event.agentId).toBeDefined();
      expect(event.error).toBeDefined();
      done();
    });
    
    agent.then((a) => {
      registry.register(a);
      a.emit('error', new Error('Test error')); // Simulate an error
    });
  });
});
