import { OpenAISDKIntegration, SDKConfiguration } from '../src/sdk/OpenAISDKIntegration';

describe('OpenAI SDK Integration', () => {
  let sdkIntegration: OpenAISDKIntegration;
  let config: SDKConfiguration;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.openai.com',
      enableTracing: true,
      enableTelemetry: true,
      batchSize: 10,
      flushInterval: 1000,
    };
    sdkIntegration = new OpenAISDKIntegration(config);
  });

  afterEach(async () => {
    await sdkIntegration.shutdown();
  });

  test('should initialize successfully', async () => {
    await sdkIntegration.initialize();
    expect(sdkIntegration.isInitialized()).toBe(true);
  });

  test('should create execution context', async () => {
    await sdkIntegration.initialize();
    
    const context = sdkIntegration.createExecutionContext('test-agent', 'test-task');
    expect(context.agentId).toBe('test-agent');
    expect(context.taskId).toBe('test-task');
    expect(context.traceId).toBeDefined();
    expect(context.spanId).toBeDefined();
  });

  test('should start and end traces', async () => {
    await sdkIntegration.initialize();
    sdkIntegration.createExecutionContext('test-agent');
    
    const trace = sdkIntegration.startTrace('test_event', { data: 'test' });
    expect(trace.id).toBeDefined();
    expect(trace.event).toBe('test_event');
    expect(trace.agentId).toBe('test-agent');
    
    sdkIntegration.endTrace(trace.id, { result: 'success' });
    expect(trace.duration).toBeDefined();
  });

  test('should add telemetry data', async () => {
    await sdkIntegration.initialize();
    sdkIntegration.createExecutionContext('test-agent');
    
    sdkIntegration.addTelemetry({
      event: 'test_metric',
      value: 42,
    });
    
    const stats = sdkIntegration.getTraceStatistics();
    expect(stats.telemetryQueueSize).toBeGreaterThan(0);
  });

  test('should execute remote tasks', async () => {
    await sdkIntegration.initialize();
    sdkIntegration.createExecutionContext('test-agent');
    
    const taskData = { task: 'process_data', input: 'test_input' };
    const result = await sdkIntegration.executeRemoteTask(taskData);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('should offload to OpenAI', async () => {
    await sdkIntegration.initialize();
    sdkIntegration.createExecutionContext('test-agent');
    
    const prompt = 'Explain quantum computing';
    const response = await sdkIntegration.offloadToOpenAI(prompt, {}, { model: 'gpt-4' });
    
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response).toContain('OpenAI response');
  });

  test('should handle OpenAI errors', async () => {
    await sdkIntegration.initialize();
    sdkIntegration.createExecutionContext('test-agent');
    
    const prompt = 'This should cause an error';
    
    await expect(
      sdkIntegration.offloadToOpenAI(prompt, {}, { model: 'gpt-4' })
    ).rejects.toThrow('Simulated OpenAI API error');
  });

  test('should get agent traces', async () => {
    await sdkIntegration.initialize();
    sdkIntegration.createExecutionContext('test-agent');
    
    sdkIntegration.startTrace('event1');
    sdkIntegration.startTrace('event2');
    
    const traces = sdkIntegration.getAgentTraces('test-agent');
    expect(traces).toHaveLength(2);
    expect(traces[0].agentId).toBe('test-agent');
    expect(traces[1].agentId).toBe('test-agent');
  });

  test('should generate trace statistics', async () => {
    await sdkIntegration.initialize();
    sdkIntegration.createExecutionContext('test-agent');
    
    const trace1 = sdkIntegration.startTrace('event1');
    const trace2 = sdkIntegration.startTrace('event2');
    
    sdkIntegration.endTrace(trace1.id);
    sdkIntegration.endTrace(trace2.id);
    
    const stats = sdkIntegration.getTraceStatistics();
    expect(stats.totalTraces).toBe(2);
    expect(stats.completedTraces).toBe(2);
    expect(stats.pendingTraces).toBe(0);
    expect(stats.averageDuration).toBeGreaterThan(0);
  });

  test('should export traces', async () => {
    await sdkIntegration.initialize();
    sdkIntegration.createExecutionContext('test-agent');
    
    sdkIntegration.startTrace('event1');
    
    const jsonExport = sdkIntegration.exportTraces('json');
    expect(jsonExport).toContain('event1');
    expect(() => JSON.parse(jsonExport)).not.toThrow();
    
    const csvExport = sdkIntegration.exportTraces('csv');
    expect(csvExport).toContain('id,agentId,timestamp,event,duration');
    expect(csvExport).toContain('event1');
  });

  test('should update configuration', async () => {
    await sdkIntegration.initialize();
    
    const newConfig = {
      enableTracing: false,
      batchSize: 20,
    };
    
    sdkIntegration.updateConfiguration(newConfig);
    
    // Tracing should be disabled now
    expect(() => {
      sdkIntegration.startTrace('test');
    }).toThrow('Tracing is disabled');
  });

  test('should flush traces and telemetry', async () => {
    await sdkIntegration.initialize();
    sdkIntegration.createExecutionContext('test-agent');
    
    sdkIntegration.startTrace('event1');
    sdkIntegration.addTelemetry({ metric: 'test' });
    
    await sdkIntegration.flush();
    
    // After flush, traces should be empty (in real implementation they'd be sent)
    const stats = sdkIntegration.getTraceStatistics();
    expect(stats.totalTraces).toBe(0);
    expect(stats.telemetryQueueSize).toBe(0);
  });

  test('should emit events', (done) => {
    let eventCount = 0;
    const expectedEvents = ['traceStarted', 'telemetryAdded'];
    
    const checkCompletion = () => {
      eventCount++;
      if (eventCount === expectedEvents.length) {
        done();
      }
    };
    
    sdkIntegration.on('traceStarted', checkCompletion);
    sdkIntegration.on('telemetryAdded', checkCompletion);
    
    sdkIntegration.initialize().then(() => {
      sdkIntegration.createExecutionContext('test-agent');
      sdkIntegration.startTrace('test_event');
      sdkIntegration.addTelemetry({ test: 'data' });
    });
  });
});
