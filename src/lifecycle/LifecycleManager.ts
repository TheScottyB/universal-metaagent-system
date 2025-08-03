import { EventEmitter } from 'eventemitter3';
import { AgentState } from '../interfaces/types';

export interface StateTransition {
  from: AgentState;
  to: AgentState;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface LifecyclePolicy {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  checkpointInterval: number;
  autoRestart: boolean;
  gracefulShutdownMs: number;
}

/**
 * LifecycleManager - Manages agent lifecycle states and transitions
 * Provides state validation, transition history, and policy enforcement
 */
export class LifecycleManager extends EventEmitter {
  private currentState: AgentState = AgentState.CREATED;
  private stateHistory: StateTransition[] = [];
  private policy: LifecyclePolicy;
  private retryCount = 0;
  private checkpointTimer?: NodeJS.Timeout;
  private readonly agentId: string;

  // Valid state transitions
  private static readonly VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
    [AgentState.CREATED]: [AgentState.INITIALIZING, AgentState.ERROR],
    [AgentState.INITIALIZING]: [AgentState.RUNNING, AgentState.ERROR, AgentState.TERMINATED],
    [AgentState.RUNNING]: [AgentState.SUSPENDED, AgentState.TERMINATING, AgentState.ERROR],
    [AgentState.SUSPENDED]: [AgentState.RUNNING, AgentState.TERMINATING, AgentState.ERROR],
    [AgentState.TERMINATING]: [AgentState.TERMINATED, AgentState.ERROR],
    [AgentState.TERMINATED]: [], // Final state
    [AgentState.ERROR]: [AgentState.INITIALIZING, AgentState.TERMINATING, AgentState.TERMINATED],
  };

  constructor(agentId: string, policy?: Partial<LifecyclePolicy>) {
    super();
    this.agentId = agentId;
    this.policy = {
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      checkpointInterval: 60000, // 1 minute
      autoRestart: false,
      gracefulShutdownMs: 5000,
      ...policy,
    };

    this.startCheckpointing();
  }

  /**
   * Get current lifecycle state
   */
  getCurrentState(): AgentState {
    return this.currentState;
  }

  /**
   * Get complete state transition history
   */
  getStateHistory(): StateTransition[] {
    return [...this.stateHistory];
  }

  /**
   * Get lifecycle policy
   */
  getPolicy(): LifecyclePolicy {
    return { ...this.policy };
  }

  /**
   * Update lifecycle policy
   */
  updatePolicy(newPolicy: Partial<LifecyclePolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
    this.emit('policyUpdated', this.policy);
  }

  /**
   * Transition to a new state with validation
   */
  async transitionTo(
    newState: AgentState, 
    reason?: string, 
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.canTransitionTo(newState)) {
      const error = new Error(
        `Invalid state transition from ${this.currentState} to ${newState}`
      );
      this.emit('transitionError', { from: this.currentState, to: newState, error });
      return false;
    }

    const transition: StateTransition = {
      from: this.currentState,
      to: newState,
      timestamp: new Date(),
      reason,
      metadata,
    };

    try {
      await this.executeTransition(transition);
      return true;
    } catch (error) {
      this.emit('transitionError', { ...transition, error });
      return false;
    }
  }

  /**
   * Check if transition to new state is valid
   */
  canTransitionTo(newState: AgentState): boolean {
    const validTransitions = LifecycleManager.VALID_TRANSITIONS[this.currentState];
    return validTransitions.includes(newState);
  }

  /**
   * Force transition (bypass validation) - use with caution
   */
  async forceTransitionTo(
    newState: AgentState, 
    reason: string, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const transition: StateTransition = {
      from: this.currentState,
      to: newState,
      timestamp: new Date(),
      reason: `FORCED: ${reason}`,
      metadata: { ...metadata, forced: true },
    };

    await this.executeTransition(transition);
  }

  /**
   * Handle agent errors with retry logic
   */
  async handleError(error: Error): Promise<void> {
    this.retryCount++;
    
    const shouldRetry = this.retryCount <= this.policy.maxRetries && 
                       this.policy.autoRestart &&
                       this.currentState !== AgentState.TERMINATED;

    if (shouldRetry) {
      await this.transitionTo(AgentState.ERROR, `Error occurred: ${error.message}`, {
        error: error.message,
        retryCount: this.retryCount,
        willRetry: true,
      });

      // Schedule retry
      setTimeout(async () => {
        try {
          await this.transitionTo(AgentState.INITIALIZING, 'Retry after error');
        } catch (retryError) {
          this.emit('retryFailed', { error: retryError, originalError: error });
        }
      }, this.policy.retryDelayMs * Math.pow(2, this.retryCount - 1)); // Exponential backoff

    } else {
      await this.transitionTo(AgentState.ERROR, `Max retries exceeded: ${error.message}`, {
        error: error.message,
        retryCount: this.retryCount,
        willRetry: false,
      });
    }
  }

  /**
   * Perform graceful shutdown
   */
  async gracefulShutdown(reason?: string): Promise<void> {
    if (this.currentState === AgentState.TERMINATED || 
        this.currentState === AgentState.TERMINATING) {
      return;
    }

    await this.transitionTo(AgentState.TERMINATING, reason || 'Graceful shutdown requested');

    // Set timeout for forceful termination
    const forceTimeout = setTimeout(async () => {
      await this.forceTransitionTo(
        AgentState.TERMINATED, 
        'Forceful termination after graceful shutdown timeout'
      );
    }, this.policy.gracefulShutdownMs);

    // Wait for graceful termination
    const gracefulPromise = new Promise<void>((resolve) => {
      const handler = () => {
        clearTimeout(forceTimeout);
        resolve();
      };
      this.once('terminated', handler);
    });

    return gracefulPromise;
  }

  /**
   * Create checkpoint of current state
   */
  createCheckpoint(): StateTransition {
    const checkpoint: StateTransition = {
      from: this.currentState,
      to: this.currentState,
      timestamp: new Date(),
      reason: 'Checkpoint',
      metadata: {
        checkpoint: true,
        retryCount: this.retryCount,
        uptime: this.getUptime(),
      },
    };

    this.stateHistory.push(checkpoint);
    this.emit('checkpoint', checkpoint);
    return checkpoint;
  }

  /**
   * Restore from checkpoint
   */
  async restoreFromCheckpoint(checkpoint?: StateTransition): Promise<void> {
    const targetCheckpoint = checkpoint || this.getLastCheckpoint();
    
    if (!targetCheckpoint) {
      throw new Error('No checkpoint available for restoration');
    }

    await this.forceTransitionTo(
      targetCheckpoint.to,
      'Restored from checkpoint',
      { restoredFrom: targetCheckpoint.timestamp }
    );

    this.emit('restored', targetCheckpoint);
  }

  /**
   * Get agent uptime in milliseconds
   */
  getUptime(): number {
    const createdTransition = this.stateHistory.find(t => t.to === AgentState.CREATED);
    if (!createdTransition) {
      return 0;
    }
    return Date.now() - createdTransition.timestamp.getTime();
  }

  /**
   * Get time spent in current state
   */
  getTimeInCurrentState(): number {
    const lastTransition = this.stateHistory[this.stateHistory.length - 1];
    if (!lastTransition) {
      return 0;
    }
    return Date.now() - lastTransition.timestamp.getTime();
  }

  /**
   * Get last checkpoint
   */
  private getLastCheckpoint(): StateTransition | undefined {
    return this.stateHistory
      .reverse()
      .find(t => t.metadata?.checkpoint === true);
  }

  /**
   * Execute state transition
   */
  private async executeTransition(transition: StateTransition): Promise<void> {
    const oldState = this.currentState;
    this.currentState = transition.to;
    this.stateHistory.push(transition);

    // Reset retry count on successful transition to running
    if (transition.to === AgentState.RUNNING) {
      this.retryCount = 0;
    }

    // Emit events
    this.emit('stateChanged', transition.to, oldState, transition);
    this.emit(transition.to, transition);

    // Special handling for final states
    if (transition.to === AgentState.TERMINATED) {
      this.stopCheckpointing();
      this.emit('terminated', transition);
    }
  }

  /**
   * Start periodic checkpointing
   */
  private startCheckpointing(): void {
    if (this.policy.checkpointInterval > 0) {
      this.checkpointTimer = setInterval(() => {
        if (this.currentState === AgentState.RUNNING) {
          this.createCheckpoint();
        }
      }, this.policy.checkpointInterval);
    }
  }

  /**
   * Stop periodic checkpointing
   */
  private stopCheckpointing(): void {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = undefined;
    }
  }

  /**
   * Get lifecycle statistics
   */
  getStatistics() {
    const stateChanges = this.stateHistory.length;
    const errorCount = this.stateHistory.filter(t => t.to === AgentState.ERROR).length;
    const checkpointCount = this.stateHistory.filter(t => t.metadata?.checkpoint).length;
    
    const stateDurations = new Map<AgentState, number>();
    for (let i = 0; i < this.stateHistory.length - 1; i++) {
      const current = this.stateHistory[i];
      const next = this.stateHistory[i + 1];
      const duration = next.timestamp.getTime() - current.timestamp.getTime();
      
      stateDurations.set(
        current.to,
        (stateDurations.get(current.to) || 0) + duration
      );
    }

    return {
      currentState: this.currentState,
      uptime: this.getUptime(),
      timeInCurrentState: this.getTimeInCurrentState(),
      stateChanges,
      errorCount,
      retryCount: this.retryCount,
      checkpointCount,
      stateDurations: Object.fromEntries(stateDurations),
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopCheckpointing();
    this.removeAllListeners();
  }
}
