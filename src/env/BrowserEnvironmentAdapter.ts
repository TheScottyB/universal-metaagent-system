/**
 * BrowserEnvironmentAdapter - Environment adapter for browser runtime
 * Detects browser environment and reports Web API resource constraints
 */

import { IEnvironmentAdapter } from '../interfaces/IEnvironmentAdapter';
import {
  EnvironmentType,
  EnvironmentConstraints,
  CommunicationProtocol,
  ResourceLevel,
} from '../interfaces/types';
import { EventEmitter } from 'eventemitter3';

export class BrowserEnvironmentAdapter
  extends EventEmitter
  implements IEnvironmentAdapter
{
  public readonly supportedEnvironment = EnvironmentType.BROWSER;
  public readonly name = 'Browser Environment Adapter';

  public async canDetect(): Promise<boolean> {
    // Check if we're running in a browser environment
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  public async detect(): Promise<EnvironmentConstraints> {
    if (!(await this.canDetect())) {
      throw new Error('Not running in browser environment');
    }

    // Browser environment typically has limited resources
    const constraints: EnvironmentConstraints = {
      type: EnvironmentType.BROWSER,
      cpuCores: navigator.hardwareConcurrency || 4, // Estimate from navigator
      memoryMB: 2048, // Conservative estimate for browser memory
      diskSpaceMB: 100, // Very limited - only localStorage/IndexedDB
      networkBandwidthMbps: 50, // Estimate
      maxConcurrentAgents: 5, // Limited by browser constraints
      supportedProtocols: [
        CommunicationProtocol.HTTP,
        CommunicationProtocol.WEBSOCKET,
        CommunicationProtocol.SDK_NATIVE,
      ],
      resourceLevel: ResourceLevel.LOW,
      capabilities: [
        'dom-manipulation',
        'web-apis',
        'local-storage',
        'indexed-db',
        'service-workers',
        'web-workers',
        'webrtc',
        'geolocation',
        'notifications',
      ],
      limitations: [
        'no-file-system-access',
        'no-process-spawning',
        'limited-network-protocols',
        'cors-restrictions',
        'sandbox-restrictions',
        'memory-limitations',
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
    // Browser APIs are limited for system resource monitoring
    return {
      cpuUsage: 20, // Estimate
      memoryUsage: 60, // Estimate
      diskUsage: 10, // Limited storage
      networkLoad: 5, // Network activity estimate
    };
  }

  public getSupportedProtocols(): CommunicationProtocol[] {
    return [
      CommunicationProtocol.HTTP,
      CommunicationProtocol.WEBSOCKET,
      CommunicationProtocol.SDK_NATIVE,
    ];
  }

  public getAvailableCapabilities(): string[] {
    return [
      'dom-manipulation',
      'web-apis',
      'local-storage',
      'indexed-db',
      'service-workers',
      'web-workers',
      'webrtc',
      'geolocation',
      'notifications',
    ];
  }

  public getLimitations(): string[] {
    return [
      'no-file-system-access',
      'no-process-spawning',
      'limited-network-protocols',
      'cors-restrictions',
      'sandbox-restrictions',
      'memory-limitations',
    ];
  }

  public onResourceChange(
    callback: (constraints: EnvironmentConstraints) => void
  ): void {
    this.on('resourceChange', callback);
  }

  public startMonitoring(intervalMs: number = 10000): void {
    // Browser monitoring is limited - placeholder implementation
    console.log(`Browser monitoring started with ${intervalMs}ms interval`);
  }

  public stopMonitoring(): void {
    // Placeholder implementation
    console.log('Browser monitoring stopped');
  }

  public async getEnvironmentInfo(): Promise<{
    platform: string;
    version: string;
    architecture: string;
    runtime: string;
    additionalInfo: Record<string, unknown>;
  }> {
    return {
      platform: navigator.platform,
      version: navigator.userAgent,
      architecture: 'browser',
      runtime: `Browser ${navigator.userAgent}`,
      additionalInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints,
        screenWidth: screen.width,
        screenHeight: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
      },
    };
  }

  public estimateAgentCapacity(agentType: string): number {
    // Browser has limited capacity
    switch (agentType) {
      case 'basic':
        return 3;
      case 'worker':
        return 2;
      case 'coordinator':
        return 1;
      case 'specialist':
        return 1;
      default:
        return 2;
    }
  }

  public canSupportConcurrentAgents(count: number): boolean {
    return count <= 5; // Browser limit
  }

  public async dispose(): Promise<void> {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}
