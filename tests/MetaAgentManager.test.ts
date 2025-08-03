import { MetaAgentManager } from '../src/core/MetaAgentManager';

describe('MetaAgentManager', () => {
  it('should initialize correctly', () => {
    const manager = new MetaAgentManager();
    expect(manager).toBeDefined();
    expect(manager).toBeInstanceOf(MetaAgentManager);
  });

  it('should have an initialize method', () => {
    const manager = new MetaAgentManager();
    expect(manager.initialize).toBeDefined();
    expect(typeof manager.initialize).toBe('function');
  });
});
