import { BaseAgent } from './BaseAgent.js';
import { AgentConfig, Task } from '../interfaces/types.js';

/**
 * EphemeralAgent - Lightweight agent designed for resource-constrained environments
 * - Minimal memory footprint
 * - Fast initialization and termination
 * - No persistent state
 * - Auto-terminates after task completion or timeout
 */
export class EphemeralAgent extends BaseAgent {
  private autoTerminateTimeout?: NodeJS.Timeout;
  private readonly maxLifetime: number;

  constructor(config: AgentConfig, maxLifetime = 30000) { // 30 seconds default lifetime
    super({
      ...config,
      maxConcurrentTasks: 1, // Ephemeral agents handle one task at a time
      capabilities: config.capabilities.length > 0 ? config.capabilities : ['ephemeral', 'basic'],
    });
    this.maxLifetime = maxLifetime;
  }

  protected async onInitialize(): Promise<void> {
    // Minimal initialization for ephemeral agents
    this.scheduleAutoTermination();
    await new Promise(resolve => setTimeout(resolve, 1)); // Minimal delay
  }

  protected async onTerminate(): Promise<void> {
    if (this.autoTerminateTimeout) {
      clearTimeout(this.autoTerminateTimeout);
    }
    // Minimal cleanup
  }

  protected async onSuspend(): Promise<void> {
    // Ephemeral agents don't support suspension - they terminate instead
    await this.terminate();
  }

  protected async onResume(): Promise<void> {
    throw new Error('Ephemeral agents cannot be resumed - create a new instance instead');
  }

  protected async onExecuteTask(task: Task): Promise<unknown> {
    // Reset auto-termination timer on task execution
    this.scheduleAutoTermination();

    switch (task.type) {
      case 'ephemeral':
      case 'basic':
        return this.executeEphemeralTask(task);
      default:
        throw new Error(`Ephemeral agent cannot handle task type: ${task.type}`);
    }
  }

  protected async getResourceUsage(): Promise<{ cpu: number; memory: number }> {
    // Ephemeral agents have minimal resource usage
    return {
      cpu: 0.05, // 5% CPU usage
      memory: 0.02, // 2% memory usage
    };
  }

  private scheduleAutoTermination(): void {
    if (this.autoTerminateTimeout) {
      clearTimeout(this.autoTerminateTimeout);
    }

    this.autoTerminateTimeout = setTimeout(() => {
      this.terminate().catch(error => {
        this.emit('error', error);
      });
    }, this.maxLifetime);
  }

  private async executeEphemeralTask(task: Task): Promise<string> {
    // Ultra-fast task processing for ephemeral agents
    const processingTime = Math.random() * 50 + 10; // 10-60ms
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    const result = `Ephemeral task '${task.type}' completed quickly with minimal resources`;
    
    // Schedule termination after task completion
    setTimeout(() => {
      this.terminate().catch(error => {
        this.emit('error', error);
      });
    }, 100); // Terminate 100ms after task completion

    return result;
  }
}
