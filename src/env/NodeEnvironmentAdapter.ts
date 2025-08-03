/**
 * NodeEnvironmentAdapter - Environment adapter for Node.js runtime
 * Detects Node.js environment and reports system resource constraints
 */

import { IEnvironmentAdapter } from '../interfaces/IEnvironmentAdapter';
import {
  EnvironmentType,
  EnvironmentConstraints,
  CommunicationProtocol,
  ResourceLevel,
} from '../interfaces/types';
import { EventEmitter } from 'eventemitter3';

export class NodeEnvironmentAdapter
  extends EventEmitter
  implements IEnvironmentAdapter
{
  public readonly supportedEnvironment = EnvironmentType.NODE_JS;
  public readonly name = 'Node.js Environment Adapter';

  private monitoringInterval?: NodeJS.Timeout;
  private lastConstraints?: EnvironmentConstraints;

  public async canDetect(): Promise<boolean> {
    // Check if we're running in Node.js
    return (
      typeof process !== 'undefined' &&
      process.versions != null &&
      process.versions.node != null
    );
  }

  public async detect(): Promise<EnvironmentConstraints> {
    if (!(await this.canDetect())) {
      throw new Error('Not running in Node.js environment');
    }

    const os = await import('os');
    const memoryGB = os.totalmem() / (1024 * 1024 * 1024);
    const cpuCores = os.cpus().length;

    // Estimate disk space (simplified)
    const diskSpaceMB = 50 * 1024; // 50GB default estimate

    // Determine resource level based on available resources
    const resourceLevel = this.determineResourceLevel(memoryGB, cpuCores);

    // Estimate network bandwidth (simplified)
    const networkBandwidthMbps = 100; // Default estimate

    const constraints: EnvironmentConstraints = {
      type: EnvironmentType.NODE_JS,
      cpuCores,
      memoryMB: Math.floor(memoryGB * 1024),
      diskSpaceMB,
      networkBandwidthMbps,
      maxConcurrentAgents: this.estimateMaxAgents(memoryGB, cpuCores),
      supportedProtocols: [
        CommunicationProtocol.HTTP,
        CommunicationProtocol.WEBSOCKET,
        CommunicationProtocol.TCP,
        CommunicationProtocol.IPC,
        CommunicationProtocol.SDK_NATIVE,
      ],
      resourceLevel,
      capabilities: [
        'file-system-access',
        'network-requests',
        'process-spawning',
        'crypto-operations',
        'database-connections',
        'cli-interface',
        'environment-variables',
        'multithreading',
      ],
      limitations: ['no-dom-access', 'no-browser-apis', 'platform-dependent'],
    };

    this.lastConstraints = constraints;
    return constraints;
  }

  public async validate(): Promise<boolean> {
    try {
      const constraints = await this.detect();
      return (
        constraints.cpuCores > 0 &&
        constraints.memoryMB > 0 &&
        constraints.maxConcurrentAgents > 0
      );
    } catch {
      return false;
    }
  }

  public async getCurrentResourceUsage(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLoad: number;
  }> {
    const os = await import('os');

    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    // CPU usage (simplified - using load average)
    const loadAvg = os.loadavg()[0]; // 1-minute load average
    const cpuCount = os.cpus().length;
    const cpuUsage = Math.min((loadAvg / cpuCount) * 100, 100);

    return {
      cpuUsage,
      memoryUsage,
      diskUsage: 50, // Simplified - would need additional libraries for accurate disk usage
      networkLoad: 10, // Simplified - would need network monitoring
    };
  }

  public getSupportedProtocols(): CommunicationProtocol[] {
    return [
      CommunicationProtocol.HTTP,
      CommunicationProtocol.WEBSOCKET,
      CommunicationProtocol.TCP,
      CommunicationProtocol.IPC,
      CommunicationProtocol.SDK_NATIVE,
    ];
  }

  public getAvailableCapabilities(): string[] {
    return [
      'file-system-access',
      'network-requests',
      'process-spawning',
      'crypto-operations',
      'database-connections',
      'cli-interface',
      'environment-variables',
      'multithreading',
    ];
  }

  public getLimitations(): string[] {
    return ['no-dom-access', 'no-browser-apis', 'platform-dependent'];
  }

  public onResourceChange(
    callback: (constraints: EnvironmentConstraints) => void
  ): void {
    this.on('resourceChange', callback);
  }

  public startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = global.setInterval(async () => {
      try {
        const newConstraints = await this.detect();

        // Check if constraints have significantly changed
        if (this.hasSignificantChange(this.lastConstraints, newConstraints)) {
          this.emit('resourceChange', newConstraints);
          this.lastConstraints = newConstraints;
        }
      } catch (error) {
        this.emit('error', error);
      }
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
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
      platform: os.platform(),
      version: process.version,
      architecture: os.arch(),
      runtime: `Node.js ${process.version}`,
      additionalInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cwd: process.cwd(),
        execPath: process.execPath,
        argv: process.argv,
        env: Object.keys(process.env).length, // Don't expose actual env vars
      },
    };
  }

  public estimateAgentCapacity(agentType: string): number {
    if (!this.lastConstraints) {
      return 1;
    }

    const { memoryMB, cpuCores } = this.lastConstraints;

    // Estimate based on agent type
    switch (agentType) {
      case 'basic':
        return Math.floor((memoryMB / 50) * (cpuCores / 2)); // 50MB per basic agent
      case 'worker':
        return Math.floor((memoryMB / 100) * cpuCores); // 100MB per worker
      case 'coordinator':
        return Math.floor(memoryMB / 200); // 200MB per coordinator
      case 'specialist':
        return Math.floor(memoryMB / 150); // 150MB per specialist
      default:
        return Math.floor(memoryMB / 100); // Default to 100MB per agent
    }
  }

  public canSupportConcurrentAgents(count: number): boolean {
    if (!this.lastConstraints) {
      return count <= 1;
    }

    return count <= this.lastConstraints.maxConcurrentAgents;
  }

  public async dispose(): Promise<void> {
    this.stopMonitoring();
    this.removeAllListeners();
  }

  private determineResourceLevel(
    memoryGB: number,
    cpuCores: number
  ): ResourceLevel {
    if (memoryGB >= 16 && cpuCores >= 8) {
      return ResourceLevel.HIGH;
    } else if (memoryGB >= 8 && cpuCores >= 4) {
      return ResourceLevel.MEDIUM;
    } else if (memoryGB >= 4 && cpuCores >= 2) {
      return ResourceLevel.LOW;
    } else {
      return ResourceLevel.MINIMAL;
    }
  }

  private estimateMaxAgents(memoryGB: number, cpuCores: number): number {
    // Conservative estimate: 100MB per agent, 1 agent per 2 CPU cores
    const memoryBased = Math.floor((memoryGB * 1024) / 100);
    const cpuBased = cpuCores * 2;

    return Math.min(memoryBased, cpuBased, 50); // Cap at 50 agents
  }

  private hasSignificantChange(
    old: EnvironmentConstraints | undefined,
    current: EnvironmentConstraints
  ): boolean {
    if (!old) return true;

    // Check for significant changes in key metrics
    const memoryChange =
      Math.abs(old.memoryMB - current.memoryMB) / old.memoryMB;
    const agentChange = Math.abs(
      old.maxConcurrentAgents - current.maxConcurrentAgents
    );

    return memoryChange > 0.1 || agentChange > 2; // 10% memory change or 2+ agent capacity change
  }
}
