import { BasicAgent } from '../src/examples/basic-agent';

describe('BasicAgent', () => {
  let agent: BasicAgent;

  beforeEach(() => {
    agent = new BasicAgent();
  });

  afterEach(async () => {
    await agent.terminate();
  });

  it('should generate a unique ID', () => {
    const agent1 = new BasicAgent();
    const agent2 = new BasicAgent();
    
    expect(agent1.getId()).toBeDefined();
    expect(agent2.getId()).toBeDefined();
    expect(agent1.getId()).not.toBe(agent2.getId());
    
    agent1.terminate();
    agent2.terminate();
  });

  it('should initialize successfully', async () => {
    const initPromise = new Promise((resolve) => {
      agent.on('initialized', resolve);
    });

    await agent.initialize();
    await initPromise;
    
    expect(true).toBe(true); // Test passes if no errors thrown
  });

  it('should execute tasks and emit events', async () => {
    const events: any[] = [];
    
    agent.on('taskStarted', (data) => events.push({ type: 'taskStarted', data }));
    agent.on('taskCompleted', (data) => events.push({ type: 'taskCompleted', data }));

    const result = await agent.execute('test task');
    
    expect(result).toContain('test task');
    expect(result).toContain('completed');
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('taskStarted');
    expect(events[1].type).toBe('taskCompleted');
  });

  it('should terminate cleanly', async () => {
    const terminatingPromise = new Promise((resolve) => {
      agent.on('terminating', resolve);
    });

    await agent.terminate();
    await terminatingPromise;
    
    expect(agent.listenerCount()).toBe(0);
  });
});
