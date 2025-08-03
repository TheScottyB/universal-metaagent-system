/**
 * SwarmCoordinator - Manages coordination between multiple agents in a swarm
 * Implements distributed coordination patterns like consensus, task decomposition,
 * and emergent behaviors for collective intelligence
 */

import { EventEmitter } from 'events';
import { IAgent } from '../interfaces/IAgent';
import { AgentType, TaskResult, Task, TaskPriority } from '../interfaces/types';
import { AgentRegistry } from '../agents/AgentRegistry';
import { LifecycleManager } from '../lifecycle/LifecycleManager';

export interface SwarmNode {
  id: string;
  agent: IAgent;
  capabilities: string[];
  loadFactor: number;
  reputation: number;
  lastSeen: Date;
}

export interface SwarmTask {
  id: string;
  description: string;
  requirements: string[];
  priority: number;
  subtasks?: SwarmTask[];
  assignedNodes?: string[];
  status: 'pending' | 'assigned' | 'executing' | 'completed' | 'failed';
  result?: TaskResult;
  createdAt: Date;
  deadline?: Date;
}

export interface ConsensusProposal {
  id: string;
  proposerId: string;
  type: 'task_assignment' | 'resource_allocation' | 'strategy_change';
  payload: any;
  votes: Map<string, boolean>;
  threshold: number;
  expiresAt: Date;
}

export interface SwarmMetrics {
  totalNodes: number;
  activeNodes: number;
  completedTasks: number;
  averageLoadFactor: number;
  consensusSuccessRate: number;
  averageTaskCompletionTime: number;
}

export class SwarmCoordinator extends EventEmitter {
  private nodes: Map<string, SwarmNode> = new Map();
  private tasks: Map<string, SwarmTask> = new Map();
  private proposals: Map<string, ConsensusProposal> = new Map();
  private metrics: SwarmMetrics;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private consensusTimeout = 30000; // 30 seconds
  private maxTaskRetries = 3;

  constructor(
    private agentRegistry: AgentRegistry,
    private lifecycleManager: LifecycleManager
  ) {
    super();
    this.metrics = {
      totalNodes: 0,
      activeNodes: 0,
      completedTasks: 0,
      averageLoadFactor: 0,
      consensusSuccessRate: 0,
      averageTaskCompletionTime: 0
    };
    this.startHeartbeat();
  }

  /**
   * Register an agent as a swarm node
   */
  public async registerNode(agent: IAgent, capabilities: string[]): Promise<void> {
    const nodeId = agent.id;
    const node: SwarmNode = {
      id: nodeId,
      agent,
      capabilities,
      loadFactor: 0,
      reputation: 100, // Start with perfect reputation
      lastSeen: new Date()
    };

    this.nodes.set(nodeId, node);
    this.metrics.totalNodes = this.nodes.size;
    this.updateMetrics();

    this.emit('nodeRegistered', node);
    
    // Listen for agent lifecycle events
    this.lifecycleManager.on('agentStateChanged', (agentId: string, state: string) => {
      if (agentId === nodeId) {
        this.handleAgentStateChange(nodeId, state);
      }
    });
  }

  /**
   * Unregister a swarm node
   */
  public async unregisterNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Reassign any tasks assigned to this node
    await this.reassignNodeTasks(nodeId);
    
    this.nodes.delete(nodeId);
    this.metrics.totalNodes = this.nodes.size;
    this.updateMetrics();

    this.emit('nodeUnregistered', nodeId);
  }

  /**
   * Submit a task to the swarm for execution
   */
  public async submitTask(task: Omit<SwarmTask, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const swarmTask: SwarmTask = {
      ...task,
      id: taskId,
      status: 'pending',
      createdAt: new Date()
    };

    this.tasks.set(taskId, swarmTask);
    this.emit('taskSubmitted', swarmTask);

    // Decompose task if it's complex
    if (this.shouldDecomposeTask(swarmTask)) {
      await this.decomposeTask(swarmTask);
    } else {
      await this.assignTask(swarmTask);
    }

    return taskId;
  }

  /**
   * Decompose a complex task into subtasks
   */
  private async decomposeTask(task: SwarmTask): Promise<void> {
    // Simple heuristic-based decomposition
    const subtasks: SwarmTask[] = [];
    
    if (task.requirements.includes('data_processing') && task.requirements.includes('analysis')) {
      // Split into data processing and analysis phases
      subtasks.push({
        id: `${task.id}_data`,
        description: `Data processing for: ${task.description}`,
        requirements: ['data_processing'],
        priority: task.priority,
        status: 'pending',
        createdAt: new Date()
      });
      
      subtasks.push({
        id: `${task.id}_analysis`,
        description: `Analysis for: ${task.description}`,
        requirements: ['analysis'],
        priority: task.priority,
        status: 'pending',
        createdAt: new Date()
      });
    } else if (task.requirements.length > 2) {
      // Split by requirements
      for (let i = 0; i < task.requirements.length; i++) {
        subtasks.push({
          id: `${task.id}_sub_${i}`,
          description: `Subtask ${i + 1}: ${task.description}`,
          requirements: [task.requirements[i]],
          priority: task.priority,
          status: 'pending',
          createdAt: new Date()
        });
      }
    }

    if (subtasks.length > 0) {
      task.subtasks = subtasks;
      for (const subtask of subtasks) {
        this.tasks.set(subtask.id, subtask);
        await this.assignTask(subtask);
      }
    } else {
      await this.assignTask(task);
    }
  }

  /**
   * Assign a task to the most suitable node(s)
   */
  private async assignTask(task: SwarmTask): Promise<void> {
    const suitableNodes = this.findSuitableNodes(task);
    
    if (suitableNodes.length === 0) {
      this.emit('taskAssignmentFailed', task, 'No suitable nodes available');
      return;
    }

    // Use consensus for critical tasks
    if (task.priority >= 8 || task.requirements.includes('critical')) {
      await this.assignTaskWithConsensus(task, suitableNodes);
    } else {
      // Direct assignment for regular tasks
      const bestNode = suitableNodes[0];
      await this.directAssignTask(task, bestNode);
    }
  }

  /**
   * Find nodes suitable for a task based on capabilities and load
   */
  private findSuitableNodes(task: SwarmTask): SwarmNode[] {
    const suitableNodes = Array.from(this.nodes.values())
      .filter(node => {
        // Check if node has required capabilities
        const hasCapabilities = task.requirements.every(req => 
          node.capabilities.some(cap => cap.includes(req))
        );
        
        // Check if node is not overloaded
        const notOverloaded = node.loadFactor < 0.8;
        
        // Check if node has good reputation
        const goodReputation = node.reputation > 50;
        
        return hasCapabilities && notOverloaded && goodReputation;
      })
      .sort((a, b) => {
        // Score based on load factor, reputation, and capability match
        const scoreA = this.calculateNodeScore(a, task);
        const scoreB = this.calculateNodeScore(b, task);
        return scoreB - scoreA;
      });

    return suitableNodes;
  }

  /**
   * Calculate fitness score for a node for a specific task
   */
  private calculateNodeScore(node: SwarmNode, task: SwarmTask): number {
    let score = 0;
    
    // Capability match score (0-40 points)
    const capabilityMatch = task.requirements.reduce((acc, req) => {
      return acc + (node.capabilities.some(cap => cap.includes(req)) ? 1 : 0);
    }, 0) / task.requirements.length;
    score += capabilityMatch * 40;
    
    // Load factor score (0-30 points) - lower load is better
    score += (1 - node.loadFactor) * 30;
    
    // Reputation score (0-30 points)
    score += (node.reputation / 100) * 30;
    
    return score;
  }

  /**
   * Assign task using distributed consensus
   */
  private async assignTaskWithConsensus(task: SwarmTask, candidates: SwarmNode[]): Promise<void> {
    const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const proposal: ConsensusProposal = {
      id: proposalId,
      proposerId: 'coordinator',
      type: 'task_assignment',
      payload: { taskId: task.id, candidateNodes: candidates.map(n => n.id) },
      votes: new Map(),
      threshold: Math.ceil(this.nodes.size * 0.6), // 60% consensus
      expiresAt: new Date(Date.now() + this.consensusTimeout)
    };

    this.proposals.set(proposalId, proposal);
    this.emit('consensusStarted', proposal);

    // Simulate voting from nodes
    setTimeout(() => this.simulateVoting(proposal), 1000);
    
    // Set timeout for consensus
    setTimeout(() => this.resolveConsensus(proposalId), this.consensusTimeout);
  }

  /**
   * Simulate voting from nodes (in a real implementation, nodes would vote independently)
   */
  private simulateVoting(proposal: ConsensusProposal): void {
    for (const [nodeId, node] of this.nodes) {
      // Simulate vote based on node's capacity and reputation
      const vote = node.loadFactor < 0.7 && node.reputation > 60 && Math.random() > 0.2;
      proposal.votes.set(nodeId, vote);
    }
  }

  /**
   * Resolve consensus and execute decision
   */
  private async resolveConsensus(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return;

    const yesVotes = Array.from(proposal.votes.values()).filter(v => v).length;
    const consensusReached = yesVotes >= proposal.threshold;

    this.emit('consensusResolved', proposalId, consensusReached, yesVotes, proposal.threshold);

    if (consensusReached && proposal.type === 'task_assignment') {
      const task = this.tasks.get(proposal.payload.taskId);
      const candidateNodes = proposal.payload.candidateNodes.map((id: string) => this.nodes.get(id)).filter(Boolean);
      
      if (task && candidateNodes.length > 0) {
        await this.directAssignTask(task, candidateNodes[0]);
      }
    }

    this.proposals.delete(proposalId);
    this.updateConsensusMetrics(consensusReached);
  }

  /**
   * Directly assign task to a node
   */
  private async directAssignTask(task: SwarmTask, node: SwarmNode): Promise<void> {
    task.status = 'assigned';
    task.assignedNodes = [node.id];
    
    // Update node load
    node.loadFactor = Math.min(1.0, node.loadFactor + 0.1);
    
    this.emit('taskAssigned', task, node);

    try {
      // Execute task on the agent
      const agentTask: Task = {
        id: task.id,
        type: 'swarm_task',
        payload: {
          description: task.description,
          requirements: task.requirements
        },
        priority: task.priority as TaskPriority
      };

      task.status = 'executing';
      const result = await node.agent.executeTask(agentTask);
      
      task.status = 'completed';
      task.result = result;
      node.loadFactor = Math.max(0, node.loadFactor - 0.1);
      node.reputation = Math.min(100, node.reputation + 2); // Increase reputation
      
      this.metrics.completedTasks++;
      this.emit('taskCompleted', task, result);
      
    } catch (error) {
      task.status = 'failed';
      node.loadFactor = Math.max(0, node.loadFactor - 0.1);
      node.reputation = Math.max(0, node.reputation - 5); // Decrease reputation
      
      this.emit('taskFailed', task, error);
      
      // Retry with different node if retries available
      if (!task.assignedNodes || task.assignedNodes.length < this.maxTaskRetries) {
        setTimeout(() => this.retryTask(task), 5000);
      }
    }
  }

  /**
   * Retry a failed task
   */
  private async retryTask(task: SwarmTask): Promise<void> {
    task.status = 'pending';
    const previousNodes = task.assignedNodes || [];
    
    // Find different nodes for retry
    const suitableNodes = this.findSuitableNodes(task)
      .filter(node => !previousNodes.includes(node.id));
    
    if (suitableNodes.length > 0) {
      await this.directAssignTask(task, suitableNodes[0]);
    } else {
      this.emit('taskRetryFailed', task, 'No alternative nodes available');
    }
  }

  /**
   * Reassign tasks from a failed or removed node
   */
  private async reassignNodeTasks(nodeId: string): Promise<void> {
    const nodeTasks = Array.from(this.tasks.values())
      .filter(task => task.assignedNodes?.includes(nodeId) && 
                     (task.status === 'assigned' || task.status === 'executing'));

    for (const task of nodeTasks) {
      task.status = 'pending';
      task.assignedNodes = task.assignedNodes?.filter(id => id !== nodeId);
      await this.assignTask(task);
    }
  }

  /**
   * Handle agent state changes
   */
  private handleAgentStateChange(nodeId: string, state: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.lastSeen = new Date();
    
    if (state === 'terminated' || state === 'error') {
      this.reassignNodeTasks(nodeId);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkNodeHealth();
      this.updateMetrics();
    }, 10000); // Every 10 seconds
  }

  /**
   * Check health of all nodes
   */
  private checkNodeHealth(): void {
    const now = new Date();
    const staleThreshold = 60000; // 1 minute

    for (const [nodeId, node] of this.nodes) {
      if (now.getTime() - node.lastSeen.getTime() > staleThreshold) {
        this.emit('nodeStale', nodeId);
        // Could implement automatic cleanup here
      }
    }
  }

  /**
   * Update swarm metrics
   */
  private updateMetrics(): void {
    this.metrics.totalNodes = this.nodes.size;
    this.metrics.activeNodes = Array.from(this.nodes.values())
      .filter(node => Date.now() - node.lastSeen.getTime() < 60000).length;
    
    if (this.nodes.size > 0) {
      this.metrics.averageLoadFactor = Array.from(this.nodes.values())
        .reduce((sum, node) => sum + node.loadFactor, 0) / this.nodes.size;
    }
  }

  /**
   * Update consensus success rate metrics
   */
  private updateConsensusMetrics(success: boolean): void {
    // Simple moving average for consensus success rate
    this.metrics.consensusSuccessRate = 
      (this.metrics.consensusSuccessRate * 0.9) + (success ? 0.1 : 0);
  }

  /**
   * Check if task should be decomposed
   */
  private shouldDecomposeTask(task: SwarmTask): boolean {
    return task.requirements.length > 2 || 
           task.priority >= 7 || 
           task.description.length > 200;
  }

  /**
   * Get current swarm metrics
   */
  public getMetrics(): SwarmMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all active nodes
   */
  public getNodes(): SwarmNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all tasks
   */
  public getTasks(): SwarmTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get active consensus proposals
   */
  public getActiveProposals(): ConsensusProposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Shutdown the swarm coordinator
   */
  public async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Gracefully stop all active tasks
    const activeTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'executing');
    
    for (const task of activeTasks) {
      task.status = 'failed';
      this.emit('taskCancelled', task);
    }

    this.emit('swarmShutdown');
  }
}
