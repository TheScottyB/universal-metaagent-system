import { BaseAgent } from './BaseAgent.js';
import { AgentConfig, Task } from '../interfaces/types.js';

export class BasicAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      capabilities: config.capabilities.length > 0 ? config.capabilities : ['basic', 'simple-tasks'],
    });
  }

  protected async onInitialize(): Promise<void> {
    // Basic agent initialization - minimal setup
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate initialization
  }

  protected async onTerminate(): Promise<void> {
    // Basic cleanup
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  protected async onSuspend(): Promise<void> {
    // Nothing special needed for suspension
  }

  protected async onResume(): Promise<void> {
    // Nothing special needed for resumption
  }

  protected async onExecuteTask(task: Task): Promise<unknown> {
    // Simple task execution logic
    switch (task.type) {
      case 'basic':
      case 'simple-tasks':
        return this.executeBasicTask(task);
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }

  protected async getResourceUsage(): Promise<{ cpu: number; memory: number }> {
    // Basic agents use minimal resources
    return {
      cpu: 0.1, // 10% CPU usage
      memory: 0.05, // 5% memory usage
    };
  }

  private async executeBasicTask(task: Task): Promise<string> {
    // Simulate task processing
    const processingTime = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    return `Basic task '${task.type}' completed with payload: ${JSON.stringify(task.payload)}`;
  }
}
