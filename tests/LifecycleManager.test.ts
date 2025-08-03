import { LifecycleManager, LifecyclePolicy } from '../src/lifecycle/LifecycleManager';
import { AgentState } from '../src/interfaces/types';

describe('LifecycleManager', () => {
  let lifecycleManager: LifecycleManager;
  let policy: Partial<LifecyclePolicy>;

  beforeEach(() => {
    policy = {
      maxRetries: 3,
      retryDelayMs: 100,
      timeoutMs: 5000,
      checkpointInterval: 1000,
      autoRestart: true,
      gracefulShutdownMs: 2000,
    };
    lifecycleManager = new LifecycleManager('test-agent', policy);
  });

  afterEach(() => {
    lifecycleManager.destroy();
  });

  test('should start in CREATED state', () => {
    expect(lifecycleManager.getCurrentState()).toBe(AgentState.CREATED);
  });

  test('should transition to INITIALIZING from CREATED', async () => {
    const result = await lifecycleManager.transitionTo(AgentState.INITIALIZING, 'Starting initialization');
    expect(result).toBe(true);
    expect(lifecycleManager.getCurrentState()).toBe(AgentState.INITIALIZING);
  });

  test('should reject invalid transitions', async () => {
    const result = await lifecycleManager.transitionTo(AgentState.RUNNING, 'Invalid transition');
    expect(result).toBe(false);
    expect(lifecycleManager.getCurrentState()).toBe(AgentState.CREATED);
  });

  test('should track state history', async () => {
    await lifecycleManager.transitionTo(AgentState.INITIALIZING);
    await lifecycleManager.transitionTo(AgentState.RUNNING);
    
    const history = lifecycleManager.getStateHistory();
    expect(history).toHaveLength(2);
    expect(history[0].to).toBe(AgentState.INITIALIZING);
    expect(history[1].to).toBe(AgentState.RUNNING);
  });

  test('should create checkpoints', async () => {
    await lifecycleManager.transitionTo(AgentState.INITIALIZING);
    await lifecycleManager.transitionTo(AgentState.RUNNING);
    
    const checkpoint = lifecycleManager.createCheckpoint();
    expect(checkpoint.metadata?.checkpoint).toBe(true);
    expect(checkpoint.to).toBe(AgentState.RUNNING);
  });

  test('should handle errors with retry logic', async () => {
    await lifecycleManager.transitionTo(AgentState.INITIALIZING);
    await lifecycleManager.transitionTo(AgentState.RUNNING);
    
    const error = new Error('Test error');
    await lifecycleManager.handleError(error);
    
    expect(lifecycleManager.getCurrentState()).toBe(AgentState.ERROR);
  });

  test('should perform graceful shutdown', async () => {
    await lifecycleManager.transitionTo(AgentState.INITIALIZING);
    await lifecycleManager.transitionTo(AgentState.RUNNING);
    
    const shutdownPromise = lifecycleManager.gracefulShutdown('Test shutdown');
    
    // Simulate graceful termination
    setTimeout(async () => {
      await lifecycleManager.transitionTo(AgentState.TERMINATED);
    }, 100);
    
    await shutdownPromise;
    expect(lifecycleManager.getCurrentState()).toBe(AgentState.TERMINATED);
  });

  test('should update policy', () => {
    const newPolicy: Partial<LifecyclePolicy> = {
      maxRetries: 5,
      autoRestart: false,
    };
    
    lifecycleManager.updatePolicy(newPolicy);
    const updatedPolicy = lifecycleManager.getPolicy();
    
    expect(updatedPolicy.maxRetries).toBe(5);
    expect(updatedPolicy.autoRestart).toBe(false);
  });

  test('should calculate uptime', async () => {
    await lifecycleManager.transitionTo(AgentState.INITIALIZING);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const uptime = lifecycleManager.getUptime();
    expect(uptime).toBeGreaterThan(0);
  });

  test('should generate statistics', async () => {
    await lifecycleManager.transitionTo(AgentState.INITIALIZING);
    await lifecycleManager.transitionTo(AgentState.RUNNING);
    
    const stats = lifecycleManager.getStatistics();
    expect(stats.currentState).toBe(AgentState.RUNNING);
    expect(stats.stateChanges).toBe(2);
    expect(stats.errorCount).toBe(0);
  });

  test('should emit events on state changes', (done) => {
    lifecycleManager.on('stateChanged', (newState, oldState) => {
      expect(newState).toBe(AgentState.INITIALIZING);
      expect(oldState).toBe(AgentState.CREATED);
      done();
    });
    
    lifecycleManager.transitionTo(AgentState.INITIALIZING);
  });

  test('should force transition when needed', async () => {
    // Force an invalid transition
    await lifecycleManager.forceTransitionTo(AgentState.RUNNING, 'Emergency transition');
    
    expect(lifecycleManager.getCurrentState()).toBe(AgentState.RUNNING);
    
    const history = lifecycleManager.getStateHistory();
    expect(history[history.length - 1].reason).toContain('FORCED');
  });
});
