import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { IAgent } from '../interfaces/IAgent.js';
import {
  AgentState,
  AgentConfig,
  AgentMetadata,
  AgentType,
  Task,
  TaskResult,
} from '../interfaces/types.js';
import { LifecycleManager, LifecyclePolicy } from '../lifecycle/LifecycleManager.js';
import { OpenAISDKIntegration, SDKConfiguration } from '../sdk/OpenAISDKIntegration.js';

export abstract class BaseAgent extends EventEmitter implements IAgent {
  public readonly id: string;
  public readonly config: AgentConfig;
  
  protected state: AgentState = AgentState.CREATED;
  protected createdAt: Date = new Date();
  protected lastActiveAt: Date = new Date();
  protected assignedTasks = 0;
  protected completedTasks = 0;
  protected errorCount = 0;
  protected currentTasks: Set<string> = new Set();
  protected initializationPromise?: Promise<void>;

  constructor(config: AgentConfig) {
    super();
    this.id = uuidv4();
    this.config = { ...config };
  }

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    this.setState(AgentState.INITIALIZING);
    
    try {
      await this.onInitialize();
      this.setState(AgentState.RUNNING);
      this.emit('initialized');
    } catch (error) {
      this.setState(AgentState.ERROR);
      this.errorCount++;
      this.emit('error', error);
      throw error;
    }
  }

  async terminate(): Promise<void> {
    this.setState(AgentState.TERMINATING);
    
    try {
      // Cancel all running tasks
      for (const taskId of this.currentTasks) {
        this.currentTasks.delete(taskId);
      }
      
      await this.onTerminate();
      this.setState(AgentState.TERMINATED);
      this.emit('terminated');
      this.removeAllListeners();
    } catch (error) {
      this.setState(AgentState.ERROR);
      this.errorCount++;
      this.emit('error', error);
      throw error;
    }
  }

  async suspend(): Promise<void> {
    if (this.state !== AgentState.RUNNING) {
      throw new Error(`Cannot suspend agent in state: ${this.state}`);
    }
    
    this.setState(AgentState.SUSPENDED);
    await this.onSuspend();
    this.emit('suspended');
  }

  async resume(): Promise<void> {
    if (this.state !== AgentState.SUSPENDED) {
      throw new Error(`Cannot resume agent in state: ${this.state}`);
    }
    
    this.setState(AgentState.RUNNING);
    await this.onResume();
    this.emit('resumed');
  }

  getState(): AgentState {
    return this.state;
  }

  getMetadata(): AgentMetadata {
    return {
      id: this.id,
      type: this.config.type,
      state: this.state,
      createdAt: this.createdAt,
      lastActiveAt: this.lastActiveAt,
      environment: this.config.environment.type,
      assignedTasks: this.assignedTasks,
      completedTasks: this.completedTasks,
      errorCount: this.errorCount,
      capabilities: this.config.capabilities,
    };
  }

  isHealthy(): boolean {
    return this.state === AgentState.RUNNING && this.errorCount < 5;
  }

  async executeTask(task: Task): Promise<TaskResult> {
    if (this.state !== AgentState.RUNNING) {
      throw new Error(`Agent is not in running state: ${this.state}`);
    }

    if (this.currentTasks.size >= this.config.maxConcurrentTasks) {
      throw new Error('Agent at maximum task capacity');
    }

    if (!this.canHandleTask(task)) {
      throw new Error(`Agent cannot handle task type: ${task.type}`);
    }

    this.currentTasks.add(task.id);
    this.assignedTasks++;
    this.lastActiveAt = new Date();
    this.emit('taskStarted', task);

    const startTime = Date.now();
    let result: TaskResult;

    try {
      const taskResult = await this.onExecuteTask(task);
      result = {
        taskId: task.id,
        agentId: this.id,
        success: true,
        result: taskResult,
        duration: Date.now() - startTime,
      };
      
      this.completedTasks++;
      this.emit('taskCompleted', result);
    } catch (error) {
      this.errorCount++;
      result = {
        taskId: task.id,
        agentId: this.id,
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
      };
      
      this.emit('taskFailed', task, error as Error);
    } finally {
      this.currentTasks.delete(task.id);
    }

    return result;
  }

  canHandleTask(task: Task): boolean {
    // Check if agent has required capabilities
    const requiredCapability = task.type;
    return this.hasCapability(requiredCapability);
  }

  getCurrentLoad(): number {
    return this.currentTasks.size / this.config.maxConcurrentTasks;
  }

  getCapabilities(): string[] {
    return [...this.config.capabilities];
  }

  hasCapability(capability: string): boolean {
    return this.config.capabilities.includes(capability);
  }

  async sendMessage(targetAgentId: string, message: unknown): Promise<void> {
    // Implementation will depend on communication layer
    this.emit('messageSent', { targetAgentId, message });
  }

  onMessage(callback: (message: unknown, fromAgentId: string) => void): void {
    this.on('message', callback);
  }

  async getHealthStatus() {
    return {
      healthy: this.isHealthy(),
      uptime: Date.now() - this.createdAt.getTime(),
      lastError: undefined, // TODO: Track last error
      resourceUsage: await this.getResourceUsage(),
    };
  }

  // Protected methods for subclasses to override
  protected abstract onInitialize(): Promise<void>;
  protected abstract onTerminate(): Promise<void>;
  protected abstract onSuspend(): Promise<void>;
  protected abstract onResume(): Promise<void>;
  protected abstract onExecuteTask(task: Task): Promise<unknown>;
  protected abstract getResourceUsage(): Promise<{ cpu: number; memory: number }>;

  protected setState(newState: AgentState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('stateChanged', newState, oldState);
  }
}
