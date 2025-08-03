import { RemoteAgentRegistry } from '../src/registry/RemoteAgentRegistry';
import { RemoteExecutionManager } from '../src/registry/RemoteExecutionManager';
import { SecureCommunicationManager, SecureChannelOptions } from '../src/communication/SecureCommunicationManager';
import { Task, CommunicationProtocol, AgentMetadata, AgentState } from '../src/interfaces/types';

const mockAgentMetadata: AgentMetadata = {
  id: 'agent-123',
  type: 'mock',
  state: AgentState.RUNNING,
  createdAt: new Date(),
  lastActiveAt: new Date(),
  environment: 'mock-environment',
  assignedTasks: 0,
  completedTasks: 0,
  errorCount: 0,
  capabilities: ['mock-capability'],
};

const mockAgentInfo = {
  endpoint: 'ws://mockendpoint',
  protocol: CommunicationProtocol.WEBSOCKET,
  metadata: mockAgentMetadata,
  connected: true,
  lastHeartbeat: new Date(),
};

// Test cases

describe('Remote Agent Operations', () => {
  let registry: RemoteAgentRegistry;
  let executionManager: RemoteExecutionManager;
  let communicationManager: SecureCommunicationManager;
  let communicationOptions: SecureChannelOptions;

  beforeEach(() => {
    registry = new RemoteAgentRegistry();
    executionManager = new RemoteExecutionManager(registry);
    communicationOptions = {
      retryInterval: 1000,
      maxRetries: 3,
      encryptionKey: 'testKey',
    };
    communicationManager = new SecureCommunicationManager(communicationOptions);
  });

  test('should register a remote agent', () => {
    registry.register({ id: 'agent-123' } as any, mockAgentInfo);
    const agents = registry.discover(CommunicationProtocol.WEBSOCKET);
    expect(agents).toHaveLength(1);
    expect(agents[0].metadata.id).toBe('agent-123');
  });

  test('should manage task distribution', async () => {
    registry.register({ id: 'agent-123' } as any, mockAgentInfo);
    const task: Task = {
      id: 'task-1',
      type: 'execute',
      payload: {},
      priority: 1,
    };
    await executionManager.distributeTask(task);
    expect(executionManager.listenerCount('taskCompleted')).toBeGreaterThan(0);
  });

  test('should handle secure communication', async () => {
    communicationManager.connect(mockAgentInfo);
    communicationManager.on('connected', (data) => {
      expect(data.agentId).toBe('agent-123');
      communicationManager.shutdown();
    });
  });

  test('should retry connection', (done) => {
    communicationManager.connect(mockAgentInfo);
    communicationManager.on('reconnectFailed', (data) => {
      expect(data.agentId).toBe('agent-123');
      done();
    });
    communicationManager.on('connectionError', (data) => {
      expect(data.agentId).toBe('agent-123');
    });
  });

  afterEach(() => {
    registry.shutdown();
    communicationManager.shutdown();
  });
});

