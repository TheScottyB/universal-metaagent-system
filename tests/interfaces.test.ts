/**
 * Test suite for verifying core interface definitions
 */

import {
  AgentState,
  AgentType,
  EnvironmentType,
  ResourceLevel,
  CommunicationProtocol,
  TaskPriority,
} from '../src/interfaces/types';

describe('Core Interfaces', () => {
  describe('Enums', () => {
    it('should define AgentState enum with all lifecycle states', () => {
      expect(AgentState.CREATED).toBe('created');
      expect(AgentState.INITIALIZING).toBe('initializing');
      expect(AgentState.RUNNING).toBe('running');
      expect(AgentState.SUSPENDED).toBe('suspended');
      expect(AgentState.TERMINATING).toBe('terminating');
      expect(AgentState.TERMINATED).toBe('terminated');
      expect(AgentState.ERROR).toBe('error');
    });

    it('should define EnvironmentType enum with all supported environments', () => {
      expect(EnvironmentType.BROWSER).toBe('browser');
      expect(EnvironmentType.NODE_JS).toBe('nodejs');
      expect(EnvironmentType.DOCKER).toBe('docker');
      expect(EnvironmentType.CLOUD_AWS).toBe('cloud_aws');
      expect(EnvironmentType.CLOUD_GCP).toBe('cloud_gcp');
      expect(EnvironmentType.CLOUD_AZURE).toBe('cloud_azure');
      expect(EnvironmentType.EMBEDDED).toBe('embedded');
      expect(EnvironmentType.TERMINAL).toBe('terminal');
      expect(EnvironmentType.UNKNOWN).toBe('unknown');
    });

    it('should define AgentType enum with all agent types', () => {
      expect(AgentType.BASIC).toBe('basic');
      expect(AgentType.WORKER).toBe('worker');
      expect(AgentType.COORDINATOR).toBe('coordinator');
      expect(AgentType.SPECIALIST).toBe('specialist');
      expect(AgentType.REMOTE).toBe('remote');
      expect(AgentType.PROXY).toBe('proxy');
    });

    it('should define ResourceLevel enum with all resource levels', () => {
      expect(ResourceLevel.MINIMAL).toBe('minimal');
      expect(ResourceLevel.LOW).toBe('low');
      expect(ResourceLevel.MEDIUM).toBe('medium');
      expect(ResourceLevel.HIGH).toBe('high');
      expect(ResourceLevel.UNLIMITED).toBe('unlimited');
    });

    it('should define CommunicationProtocol enum with all protocols', () => {
      expect(CommunicationProtocol.HTTP).toBe('http');
      expect(CommunicationProtocol.WEBSOCKET).toBe('websocket');
      expect(CommunicationProtocol.TCP).toBe('tcp');
      expect(CommunicationProtocol.IPC).toBe('ipc');
      expect(CommunicationProtocol.MCP).toBe('mcp');
      expect(CommunicationProtocol.SDK_NATIVE).toBe('sdk_native');
    });

    it('should define TaskPriority enum with numeric values', () => {
      expect(TaskPriority.LOW).toBe(1);
      expect(TaskPriority.NORMAL).toBe(2);
      expect(TaskPriority.HIGH).toBe(3);
      expect(TaskPriority.CRITICAL).toBe(4);
    });
  });

  describe('Type Imports', () => {
    it('should import all interface types without errors', async () => {
      // This test verifies that interface files can be imported without TypeScript errors
      // Interfaces don't exist at runtime, so we just test the import doesn't throw
      expect(() => {
        require('../src/interfaces/types');
      }).not.toThrow();
    });

    it('should import all types from types module', async () => {
      const typesModule = await import('../src/interfaces/types');
      
      // Verify key exports exist
      expect(typesModule.AgentState).toBeDefined();
      expect(typesModule.EnvironmentType).toBeDefined();
      expect(typesModule.AgentType).toBeDefined();
      expect(typesModule.ResourceLevel).toBeDefined();
      expect(typesModule.CommunicationProtocol).toBeDefined();
      expect(typesModule.TaskPriority).toBeDefined();
    });
  });

  describe('Interface Completeness', () => {
    it('should have consistent enum values count', () => {
      expect(Object.keys(AgentState)).toHaveLength(7); // 7 values
      expect(Object.keys(EnvironmentType)).toHaveLength(9); // 9 values
      expect(Object.keys(AgentType)).toHaveLength(6); // 6 values
      expect(Object.keys(ResourceLevel)).toHaveLength(5); // 5 values
      expect(Object.keys(CommunicationProtocol)).toHaveLength(6); // 6 values
      expect(Object.keys(TaskPriority)).toHaveLength(8); // 4 values with reverse mapping
    });
  });
});
