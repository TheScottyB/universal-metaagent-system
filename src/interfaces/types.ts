/**
 * Common types, enums, and data structures for the Universal Metaagent System
 */

// Agent lifecycle states
export enum AgentState {
  CREATED = 'created',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  SUSPENDED = 'suspended',
  TERMINATING = 'terminating',
  TERMINATED = 'terminated',
  ERROR = 'error',
}

// Environment types that the system can detect and adapt to
export enum EnvironmentType {
  BROWSER = 'browser',
  NODE_JS = 'nodejs',
  DOCKER = 'docker',
  CLOUD_AWS = 'cloud_aws',
  CLOUD_GCP = 'cloud_gcp',
  CLOUD_AZURE = 'cloud_azure',
  EMBEDDED = 'embedded',
  TERMINAL = 'terminal',
  UNKNOWN = 'unknown',
}

// Agent types that can be spawned
export enum AgentType {
  BASIC = 'basic',
  WORKER = 'worker',
  COORDINATOR = 'coordinator',
  SPECIALIST = 'specialist',
  REMOTE = 'remote',
  PROXY = 'proxy',
}

// Resource constraint levels
export enum ResourceLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  UNLIMITED = 'unlimited',
}

// Communication protocols
export enum CommunicationProtocol {
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  TCP = 'tcp',
  IPC = 'ipc',
  MCP = 'mcp',
  SDK_NATIVE = 'sdk_native',
}

// Task priority levels
export enum TaskPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

// Environment constraints that influence agent behavior
export interface EnvironmentConstraints {
  readonly type: EnvironmentType;
  readonly cpuCores: number;
  readonly memoryMB: number;
  readonly diskSpaceMB: number;
  readonly networkBandwidthMbps: number;
  readonly maxConcurrentAgents: number;
  readonly supportedProtocols: CommunicationProtocol[];
  readonly resourceLevel: ResourceLevel;
  readonly capabilities: string[];
  readonly limitations: string[];
}

// Task definition for agents
export interface Task {
  readonly id: string;
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly priority: TaskPriority;
  readonly timeout?: number;
  readonly retries?: number;
  readonly dependencies?: string[];
  readonly metadata?: Record<string, unknown>;
}

// Task result from agent execution
export interface TaskResult {
  readonly taskId: string;
  readonly agentId: string;
  readonly success: boolean;
  readonly result?: unknown;
  readonly error?: Error;
  readonly duration: number;
  readonly metadata?: Record<string, unknown>;
}

// Agent configuration
export interface AgentConfig {
  readonly type: AgentType;
  readonly maxConcurrentTasks: number;
  readonly timeout: number;
  readonly retries: number;
  readonly capabilities: string[];
  readonly environment: EnvironmentConstraints;
  readonly customConfig?: Record<string, unknown>;
}

// Agent metadata and status
export interface AgentMetadata {
  readonly id: string;
  readonly type: AgentType;
  readonly state: AgentState;
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
  readonly environment: EnvironmentType;
  readonly assignedTasks: number;
  readonly completedTasks: number;
  readonly errorCount: number;
  readonly capabilities: string[];
}

// Swarm configuration
export interface SwarmConfig {
  readonly maxAgents: number;
  readonly minAgents: number;
  readonly scaleThreshold: number;
  readonly loadBalancingStrategy:
    | 'round_robin'
    | 'least_loaded'
    | 'capability_based';
  readonly failoverEnabled: boolean;
  readonly healthCheckInterval: number;
}

// Event types for the system
export interface SystemEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly source: string;
  readonly data: Record<string, unknown>;
}

// Remote agent connection info
export interface RemoteAgentInfo {
  readonly endpoint: string;
  readonly protocol: CommunicationProtocol;
  readonly authentication: Record<string, unknown>;
  readonly capabilities: string[];
  readonly latency?: number;
}
