/**
 * IEnvironmentAdapter - Interface for detecting and reporting environmental constraints
 * Adapters implement environment-specific detection logic
 */

import {
  EnvironmentType,
  EnvironmentConstraints,
  CommunicationProtocol,
  ResourceLevel,
} from './types.js';

export interface IEnvironmentAdapter {
  // Environment identification
  readonly supportedEnvironment: EnvironmentType;
  readonly name: string;

  // Detection and validation
  canDetect(): Promise<boolean>;
  detect(): Promise<EnvironmentConstraints>;
  validate(): Promise<boolean>;

  // Resource monitoring
  getCurrentResourceUsage(): Promise<{
    cpuUsage: number; // 0-100 percentage
    memoryUsage: number; // 0-100 percentage
    diskUsage: number; // 0-100 percentage
    networkLoad: number; // 0-100 percentage
  }>;

  // Environment capabilities
  getSupportedProtocols(): CommunicationProtocol[];
  getAvailableCapabilities(): string[];
  getLimitations(): string[];

  // Dynamic resource monitoring
  onResourceChange(
    callback: (constraints: EnvironmentConstraints) => void
  ): void;
  startMonitoring(intervalMs?: number): void;
  stopMonitoring(): void;

  // Environment-specific utilities
  getEnvironmentInfo(): Promise<{
    platform: string;
    version: string;
    architecture: string;
    runtime: string;
    additionalInfo: Record<string, unknown>;
  }>;

  // Resource estimation for agent planning
  estimateAgentCapacity(agentType: string): number;
  canSupportConcurrentAgents(count: number): boolean;

  // Cleanup and disposal
  dispose(): Promise<void>;
}
