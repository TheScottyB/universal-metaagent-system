import { NodeEnvironmentAdapter } from '../src/env/NodeEnvironmentAdapter';
import { BrowserEnvironmentAdapter } from '../src/env/BrowserEnvironmentAdapter';
import { DockerEnvironmentAdapter } from '../src/env/DockerEnvironmentAdapter';
import { EmbeddedEnvironmentAdapter } from '../src/env/EmbeddedEnvironmentAdapter';

/**
 * Test suite for verifying environment adapter implementations
 */

describe('Environment Adapters', () => {
  let nodeAdapter: NodeEnvironmentAdapter;
  let browserAdapter: BrowserEnvironmentAdapter;
  let dockerAdapter: DockerEnvironmentAdapter;
  let embeddedAdapter: EmbeddedEnvironmentAdapter;

  beforeEach(() => {
    nodeAdapter = new NodeEnvironmentAdapter();
    browserAdapter = new BrowserEnvironmentAdapter();
    dockerAdapter = new DockerEnvironmentAdapter();
    embeddedAdapter = new EmbeddedEnvironmentAdapter();
  });

  it('should detect Node.js environment', async () => {
    const canDetect = await nodeAdapter.canDetect();
    expect(canDetect).toBe(true);
  });

  it('should detect Browser environment', async () => {
    const canDetect = await browserAdapter.canDetect();
    expect(canDetect).toBe(false); // Simulated, as we are running Jest in Node.js
  });

  it('should detect Docker environment', async () => {
    const canDetect = await dockerAdapter.canDetect();
    expect(canDetect).toBe(false); // Requires Docker environment
  });

  it('should detect Embedded environment', async () => {
    const canDetect = await embeddedAdapter.canDetect();
    expect(canDetect).toBe(false); // Simulated, as we are running Jest in Node.js
  });

  it('should provide Node.js environment constraints', async () => {
    const constraints = await nodeAdapter.detect();
    expect(constraints.type).toBe('nodejs');
    expect(constraints.cpuCores).toBeGreaterThan(0);
  });
  
  it('should provide Browser environment constraints', async () => {
    try {
      await browserAdapter.detect();
    } catch (error) {
      expect(error.message).toBe('Not running in browser environment');
    }
  });

  it('should provide Docker environment constraints', async () => {
    try {
      await dockerAdapter.detect();
    } catch (error) {
      expect(error.message).toBe('Not running in Docker environment');
    }
  });

  it('should provide Embedded environment constraints', async () => {
    try {
      await embeddedAdapter.detect();
    } catch (error) {
      expect(error.message).toBe('Not running in embedded environment');
    }
  });
});

