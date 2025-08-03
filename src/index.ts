/**
 * Universal Metaagent System
 * Entry point for the metaagent orchestration system
 */

export * from './interfaces/index.js';
export * from './core/index.js';
export * from './env/index.js';
export * from './agents/index.js';

// Main orchestrator export
export { MetaAgentManager } from './core/MetaAgentManager.js';

console.log('Universal Metaagent System initialized');
