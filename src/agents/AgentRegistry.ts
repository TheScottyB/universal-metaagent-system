import { EventEmitter } from 'eventemitter3';
import { IAgent } from '../interfaces/IAgent';
import {
  AgentState,
  AgentMetadata,
  AgentType,
  EnvironmentType,
} from '../interfaces/types';

export interface AgentRegistryEntry {
  agent: IAgent;
  metadata: AgentMetadata;
  registeredAt: Date;
  lastHealthCheck: Date;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
}

export interface AgentQueryOptions {
  type?: AgentType;
  state?: AgentState;
  environment?: EnvironmentType;
  capabilities?: string[];
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  minLoad?: number;
  maxLoad?: number;
}

/**
 * AgentRegistry - Central registry for tracking and discovering agents
 * Provides capabilities for agent discovery, health monitoring, and lifecycle management
 */
export class AgentRegistry extends EventEmitter {
  private agents = new Map<string, AgentRegistryEntry>();
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly healthCheckIntervalMs: number;

  constructor(healthCheckIntervalMs = 10000) { // 10 seconds default
    super();
    this.healthCheckIntervalMs = healthCheckIntervalMs;
    this.startHealthChecking();
  }

  /**
   * Register an agent with the registry
   */
  register(agent: IAgent): void {
    const entry: AgentRegistryEntry = {
      agent,
      metadata: agent.getMetadata(),
      registeredAt: new Date(),
      lastHealthCheck: new Date(),
      healthStatus: 'unknown',
    };

    this.agents.set(agent.id, entry);

    // Listen for agent state changes
    agent.on('stateChanged', (newState, oldState) => {
      this.updateAgentMetadata(agent.id);
      this.emit('agentStateChanged', { agentId: agent.id, newState, oldState });
    });

    agent.on('terminated', () => {
      this.unregister(agent.id);
    });

    agent.on('error', (error) => {
      this.updateHealthStatus(agent.id, 'unhealthy');
      this.emit('agentError', { agentId: agent.id, error });
    });

    this.emit('agentRegistered', { agentId: agent.id, metadata: entry.metadata });
  }

  /**
   * Unregister an agent from the registry
   */
  unregister(agentId: string): boolean {
    const entry = this.agents.get(agentId);
    if (!entry) {
      return false;
    }

    this.agents.delete(agentId);
    this.emit('agentUnregistered', { agentId, metadata: entry.metadata });
    return true;
  }

  /**
   * Get a specific agent by ID
   */
  getAgent(agentId: string): IAgent | undefined {
    return this.agents.get(agentId)?.agent;
  }

  /**
   * Get agent registry entry by ID
   */
  getAgentEntry(agentId: string): AgentRegistryEntry | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Find agents matching specific criteria
   */
  findAgents(options: AgentQueryOptions = {}): AgentRegistryEntry[] {
    const results: AgentRegistryEntry[] = [];

    for (const entry of this.agents.values()) {
      if (this.matchesQuery(entry, options)) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentRegistryEntry[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentType): AgentRegistryEntry[] {
    return this.findAgents({ type });
  }

  /**
   * Get healthy agents
   */
  getHealthyAgents(): AgentRegistryEntry[] {
    return this.findAgents({ healthStatus: 'healthy' });
  }

  /**
   * Get available agents (running and healthy with low load)
   */
  getAvailableAgents(maxLoad = 0.8): AgentRegistryEntry[] {
    return this.findAgents({
      state: AgentState.RUNNING,
      healthStatus: 'healthy',
      maxLoad,
    });
  }

  /**
   * Find best agent for a task based on capabilities and load
   */
  findBestAgent(requiredCapabilities: string[] = []): IAgent | undefined {
    const candidates = this.getAvailableAgents()
      .filter(entry => 
        requiredCapabilities.every(cap => 
          entry.metadata.capabilities.includes(cap)
        )
      )
      .sort((a, b) => a.agent.getCurrentLoad() - b.agent.getCurrentLoad());

    return candidates[0]?.agent;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const total = this.agents.size;
    const byState = new Map<AgentState, number>();
    const byType = new Map<AgentType, number>();
    const byHealth = new Map<string, number>();

    for (const entry of this.agents.values()) {
      // Count by state
      const state = entry.metadata.state;
      byState.set(state, (byState.get(state) || 0) + 1);

      // Count by type
      const type = entry.metadata.type;
      byType.set(type, (byType.get(type) || 0) + 1);

      // Count by health
      const health = entry.healthStatus;
      byHealth.set(health, (byHealth.get(health) || 0) + 1);
    }

    return {
      total,
      byState: Object.fromEntries(byState),
      byType: Object.fromEntries(byType),
      byHealth: Object.fromEntries(byHealth),
    };
  }

  /**
   * Terminate and cleanup all agents
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const terminationPromises = Array.from(this.agents.values()).map(entry =>
      entry.agent.terminate().catch(error => {
        this.emit('error', error);
      })
    );

    await Promise.all(terminationPromises);
    this.agents.clear();
    this.removeAllListeners();
  }

  private matchesQuery(entry: AgentRegistryEntry, options: AgentQueryOptions): boolean {
    const { agent, metadata, healthStatus } = entry;

    if (options.type && metadata.type !== options.type) {
      return false;
    }

    if (options.state && metadata.state !== options.state) {
      return false;
    }

    if (options.environment && metadata.environment !== options.environment) {
      return false;
    }

    if (options.healthStatus && healthStatus !== options.healthStatus) {
      return false;
    }

    if (options.capabilities) {
      const hasAllCapabilities = options.capabilities.every(cap =>
        metadata.capabilities.includes(cap)
      );
      if (!hasAllCapabilities) {
        return false;
      }
    }

    const currentLoad = agent.getCurrentLoad();
    if (options.minLoad !== undefined && currentLoad < options.minLoad) {
      return false;
    }

    if (options.maxLoad !== undefined && currentLoad > options.maxLoad) {
      return false;
    }

    return true;
  }

  private updateAgentMetadata(agentId: string): void {
    const entry = this.agents.get(agentId);
    if (entry) {
      entry.metadata = entry.agent.getMetadata();
    }
  }

  private updateHealthStatus(agentId: string, status: 'healthy' | 'unhealthy' | 'unknown'): void {
    const entry = this.agents.get(agentId);
    if (entry) {
      entry.healthStatus = status;
      entry.lastHealthCheck = new Date();
    }
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      const healthPromises = Array.from(this.agents.entries()).map(async ([agentId, entry]) => {
        try {
          const healthStatus = await entry.agent.getHealthStatus();
          this.updateHealthStatus(agentId, healthStatus.healthy ? 'healthy' : 'unhealthy');
        } catch (error) {
          this.updateHealthStatus(agentId, 'unhealthy');
          this.emit('healthCheckError', { agentId, error });
        }
      });

      await Promise.allSettled(healthPromises);
    }, this.healthCheckIntervalMs);
  }
}
