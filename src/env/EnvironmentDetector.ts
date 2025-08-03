/**
 * EnvironmentDetector - Utility class for selecting the right environment adapter
 * Automatically detects the runtime environment and initializes the suitable adapter
 */

import { IEnvironmentAdapter } from '../interfaces/IEnvironmentAdapter';
import { NodeEnvironmentAdapter } from './NodeEnvironmentAdapter';
// Import other adapters here (Browser, Docker, etc.)

export class EnvironmentDetector {
  public static async detect(): Promise<IEnvironmentAdapter> {
    const adapters: IEnvironmentAdapter[] = [
      new NodeEnvironmentAdapter(),
      // Instantiate other environment adapters here
    ];

    for (const adapter of adapters) {
      if (await adapter.canDetect()) {
        return adapter;
      }
    }

    throw new Error('Unsupported environment - no suitable adapter found');
  }
}
