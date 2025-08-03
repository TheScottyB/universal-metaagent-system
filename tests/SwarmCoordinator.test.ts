import { SwarmCoordinator } from '../src/swarm/SwarmCoordinator';
import { LifecycleManager } from '../src/lifecycle/LifecycleManager';
import { AgentRegistry } from '../src/agents/AgentRegistry';
import { IAgent } from '../src/interfaces/IAgent';
import { 
  TaskResult, 
  Task, 
  AgentState, 
  AgentConfig, 
  AgentMetadata, 
  AgentType, 
  EnvironmentType, 
  ResourceLevel, 
  CommunicationProtocol,
  TaskPriority
} from '../src/interfaces/types';
import { EventEmitter } from 'eventemitter3';

// Mock Agent class that implements the full IAgent interface
class MockAgent extends EventEmitter implements IAgent {
  public readonly id: string;
  public readonly config: AgentConfig;
  private state: AgentState = AgentState.RUNNING;
  private currentLoad = 0.2;
  private healthy = true;

  constructor(id: string = 'mock-agent-1') {
    super();
    this.id = id;
    this.config = {
      type: AgentType.BASIC,
      maxConcurrentTasks: 5,
      timeout: 30000,
      retries: 3,
      capabilities: ['test-capability'],
      environment: {
        type: EnvironmentType.NODE_JS,
        cpuCores: 4,
        memoryMB: 8192,
        diskSpaceMB: 100000,
        networkBandwidthMbps: 100,
        maxConcurrentAgents: 10,
        supportedProtocols: [CommunicationProtocol.HTTP],
        resourceLevel: ResourceLevel.HIGH,
        capabilities: ['test-capability'],
        limitations: []
      }
    };
  }

  async initialize(): Promise<void> {
    this.state = AgentState.RUNNING;
  }

  async terminate(): Promise<void> {
    this.state = AgentState.TERMINATED;
  }

  async suspend(): Promise<void> {
    this.state = AgentState.SUSPENDED;
  }

  async resume(): Promise<void> {
    this.state = AgentState.RUNNING;
  }

  getState(): AgentState {
    return this.state;
  }

  getMetadata(): AgentMetadata {
    return {
      id: this.id,
      type: this.config.type,
      state: this.state,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      environment: this.config.environment.type,
      assignedTasks: 0,
      completedTasks: 0,
      errorCount: 0,
      capabilities: this.config.capabilities
    };
  }

  isHealthy(): boolean {
    return this.healthy;
  }

  async executeTask(task: Task): Promise<TaskResult> {
    return {
      taskId: task.id,
      agentId: this.id,
      success: true,
      result: 'Task completed successfully',
      duration: 100,
      metadata: {}
    };
  }

  canHandleTask(task: Task): boolean {
    return true;
  }

  getCurrentLoad(): number {
    return this.currentLoad;
  }

  getCapabilities(): string[] {
    return this.config.capabilities;
  }

  hasCapability(capability: string): boolean {
    return this.config.capabilities.includes(capability);
  }

  async sendMessage(targetAgentId: string, message: unknown): Promise<void> {
    // Mock implementation
  }

  onMessage(callback: (message: unknown, fromAgentId: string) => void): void {
    // Mock implementation
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    uptime: number;
    lastError?: Error;
    resourceUsage: { cpu: number; memory: number };
  }> {
    return {
      healthy: this.healthy,
      uptime: 10000,
      resourceUsage: { cpu: 0.3, memory: 0.5 }
    };
  }

}

// Mock classes for dependencies
const mockAgentRegistry = new AgentRegistry();
const mockLifecycleManager = new LifecycleManager('swarm-coordinator', {});


describe('SwarmCoordinator', () => {
  let coordinator: SwarmCoordinator;

  beforeEach(() => {
    coordinator = new SwarmCoordinator(mockAgentRegistry, mockLifecycleManager);
  });

  afterEach(() => {
    coordinator.shutdown();
  });

  test('should register a node successfully', async () => {
    const agent = new MockAgent();
    const onNodeRegistered = jest.fn();
    coordinator.on('nodeRegistered', onNodeRegistered);

    await coordinator.registerNode(agent, ['test-capability']);

    expect(onNodeRegistered).toHaveBeenCalled();
    expect(coordinator.getNodes()).toHaveLength(1);
  });

  test('should unregister a node successfully', async () => {
    const agent = new MockAgent();
    await coordinator.registerNode(agent, ['test-capability']);
    const onNodeUnregistered = jest.fn();
    coordinator.on('nodeUnregistered', onNodeUnregistered);

    await coordinator.unregisterNode(agent.id);

    expect(onNodeUnregistered).toHaveBeenCalledWith(agent.id);
    expect(coordinator.getNodes()).toHaveLength(0);
  });

  test('should submit and assign a task', async () => {
    const agent = new MockAgent();
    await coordinator.registerNode(agent, ['test-capability']);
    const taskSubmitted = jest.fn();
    const taskAssigned = jest.fn();
    coordinator.on('taskSubmitted', taskSubmitted);
    coordinator.on('taskAssigned', taskAssigned);

    const taskId = await coordinator.submitTask({
      description: 'A test task',
      requirements: ['test-capability'],
      priority: 1,
    });

    expect(taskSubmitted).toHaveBeenCalled();
    expect(taskAssigned).toHaveBeenCalled();

    const tasks = coordinator.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(taskId);
  });

  test('should handle task execution and completion', async () => {
    const agent = new MockAgent();
    await coordinator.registerNode(agent, ['test-capability']);
    
    const taskCompleted = jest.fn();
    coordinator.on('taskCompleted', taskCompleted);
    
    await coordinator.submitTask({
      description: 'A test task',
      requirements: ['test-capability'],
      priority: 1,
    });
    
    // Wait a bit for async task processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(taskCompleted).toHaveBeenCalled();
  });

  test('should manage swarm metrics appropriately', async () => {
    const agent = new MockAgent();
    await coordinator.registerNode(agent, ['test-capability']);
    const metricsBefore = coordinator.getMetrics();

    await coordinator.submitTask({
      description: 'A test task',
      requirements: ['test-capability'],
      priority: 1,
    });

    // Wait for task to complete asynchronously
    await new Promise(resolve => setTimeout(resolve, 50));

    const metricsAfter = coordinator.getMetrics();
    expect(metricsAfter.totalNodes).toBe(1); // Should be 1 after registering an agent
    expect(metricsAfter.completedTasks).toBe(metricsBefore.completedTasks + 1); // Should increment after task completion
  });

  test('should handle task decomposition for complex tasks', async () => {
    const agent = new MockAgent();
    await coordinator.registerNode(agent, ['data_processing', 'analysis']);
    
    const taskSubmitted = jest.fn();
    coordinator.on('taskSubmitted', taskSubmitted);

    await coordinator.submitTask({
      description: 'A complex task that needs both data processing and analysis - ' + 'x'.repeat(220), // Make description > 200 chars to trigger decomposition
      requirements: ['data_processing', 'analysis'],
      priority: 1,
    });

    // Wait for task processing
    await new Promise(resolve => setTimeout(resolve, 50));

    const tasks = coordinator.getTasks();
    // Should have the original task plus subtasks (decomposition occurs when description > 200 chars OR requirements > 2 OR priority >= 7)
    expect(tasks.length).toBeGreaterThan(1);
    expect(taskSubmitted).toHaveBeenCalled();
  });

  test('should handle consensus for high priority tasks', async () => {
    const agent1 = new MockAgent('agent-1');
    const agent2 = new MockAgent('agent-2');
    await coordinator.registerNode(agent1, ['critical']); // Nodes need to have 'critical' capability
    await coordinator.registerNode(agent2, ['critical']);
    
    const consensusStarted = jest.fn();
    coordinator.on('consensusStarted', consensusStarted);

    await coordinator.submitTask({
      description: 'High priority task',
      requirements: ['critical'],
      priority: 9, // High priority that should trigger consensus
    });

    // Wait for consensus processing
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait longer than consensus simulation

    expect(consensusStarted).toHaveBeenCalled();
  });

  test('should handle task assignment failure when no suitable nodes', async () => {
    const agent = new MockAgent();
    await coordinator.registerNode(agent, ['other-capability']); // Different capability
    
    const taskAssignmentFailed = jest.fn();
    coordinator.on('taskAssignmentFailed', taskAssignmentFailed);

    await coordinator.submitTask({
      description: 'Task requiring unavailable capability',
      requirements: ['unavailable-capability'],
      priority: 1,
    });

    // Wait for task processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(taskAssignmentFailed).toHaveBeenCalled();
  });

  test('should properly shutdown and clean up resources', async () => {
    const agent = new MockAgent();
    await coordinator.registerNode(agent, ['test-capability']);
    
    const swarmShutdown = jest.fn();
    coordinator.on('swarmShutdown', swarmShutdown);

    await coordinator.shutdown();

    expect(swarmShutdown).toHaveBeenCalled();
  });

});
