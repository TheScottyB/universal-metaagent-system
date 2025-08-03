/**
 * EmbeddedEnvironmentAdapter - Environment adapter for embedded systems
 * Example implementation for TI-83 calculator or similar constrained environments
 */

import { IEnvironmentAdapter } from '../interfaces/IEnvironmentAdapter';
import {
  EnvironmentType,
  EnvironmentConstraints,
  CommunicationProtocol,
  ResourceLevel,
} from '../interfaces/types';
import { EventEmitter } from 'eventemitter3';

export class EmbeddedEnvironmentAdapter
  extends EventEmitter
  implements IEnvironmentAdapter
{
  public readonly supportedEnvironment = EnvironmentType.EMBEDDED;
  public readonly name = 'Embedded Environment Adapter';

  public async canDetect(): Promise<boolean> {
    // Detection logic for embedded systems
    // This is a simplified example - real implementation would check hardware specs
    const os = await import('os');
    const totalMem = os.totalmem();
    const memoryGB = totalMem / (1024 * 1024 * 1024);

    // Assume embedded if very low memory (< 1GB) and specific architecture
    return memoryGB < 1 && (os.arch() === 'arm' || os.arch() === 'mips');
  }

  public async detect(): Promise<EnvironmentConstraints> {
    if (!(await this.canDetect())) {
      throw new Error('Not running in embedded environment');
    }

    // Embedded systems have very limited resources
    const constraints: EnvironmentConstraints = {
      type: EnvironmentType.EMBEDDED,
      cpuCores: 1, // Single core typical for embedded
      memoryMB: 512, // Very limited memory
      diskSpaceMB: 1024, // Limited storage
      networkBandwidthMbps: 1, // Very limited or no network
      maxConcurrentAgents: 1, // Only one agent due to resource constraints
      supportedProtocols: [
        CommunicationProtocol.IPC, // Inter-process communication
        // Very limited network protocols
      ],
      resourceLevel: ResourceLevel.MINIMAL,
      capabilities: [
        'basic-computation',
        'sensor-access',
        'gpio-control',
        'low-power-operation',
        'real-time-processing',
      ],
      limitations: [
        'extremely-limited-memory',
        'no-graphics',
        'no-network',
        'single-tasking',
        'low-cpu-power',
        'no-file-system',
        'battery-dependent',
      ],
    };

    return constraints;
  }

  public async validate(): Promise<boolean> {
    return this.canDetect();
  }

  public async getCurrentResourceUsage(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLoad: number;
  }> {
    // Embedded systems typically don't have sophisticated monitoring
    return {
      cpuUsage: 80, // Often running at high utilization
      memoryUsage: 90, // Memory is typically very constrained
      diskUsage: 60, // Limited storage
      networkLoad: 0, // Often no network
    };
  }

  public getSupportedProtocols(): CommunicationProtocol[] {
    return [CommunicationProtocol.IPC];
  }

  public getAvailableCapabilities(): string[] {
    return [
      'basic-computation',
      'sensor-access',
      'gpio-control',
      'low-power-operation',
      'real-time-processing',
    ];
  }

  public getLimitations(): string[] {
    return [
      'extremely-limited-memory',
      'no-graphics',
      'no-network',
      'single-tasking',
      'low-cpu-power',
      'no-file-system',
      'battery-dependent',
    ];
  }

  public onResourceChange(
    callback: (constraints: EnvironmentConstraints) => void
  ): void {
    this.on('resourceChange', callback);
  }

  public startMonitoring(intervalMs: number = 30000): void {
    // Very infrequent monitoring to conserve battery
    console.log(`Embedded monitoring started with ${intervalMs}ms interval`);
  }

  public stopMonitoring(): void {
    console.log('Embedded monitoring stopped');
  }

  public async getEnvironmentInfo(): Promise<{
    platform: string;
    version: string;
    architecture: string;
    runtime: string;
    additionalInfo: Record<string, unknown>;
  }> {
    const os = await import('os');

    return {
      platform: 'Embedded System',
      version: 'Unknown',
      architecture: os.arch(),
      runtime: 'Embedded Runtime',
      additionalInfo: {
        type: 'ti-83-calculator', // Example embedded system
        batteryLevel: 'unknown',
        sensorCount: 0,
        gpiopins: 16,
        clockSpeed: '6MHz',
        ram: '512KB',
        rom: '1MB',
      },
    };
  }

  public estimateAgentCapacity(agentType: string): number {
    // Embedded systems can typically only run one simple agent
    return agentType === 'basic' ? 1 : 0;
  }

  public canSupportConcurrentAgents(count: number): boolean {
    return count <= 1; // Only one agent at a time
  }

  public async dispose(): Promise<void> {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}
