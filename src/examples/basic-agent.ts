/**
 * Basic example demonstrating OpenAI Agents SDK integration
 * This will be used as a reference for building our metaagent system
 */

import { Agent } from '@openai/agents';
import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';

export class BasicAgent extends EventEmitter {
  private id: string;
  private agent?: Agent;

  constructor() {
    super();
    this.id = uuidv4();
  }

  public getId(): string {
    return this.id;
  }

  public async initialize(): Promise<void> {
    try {
      // Note: This is a placeholder - actual Agent instantiation will depend on SDK setup
      // eslint-disable-next-line no-console
      console.log(`Initializing basic agent with ID: ${this.id}`);
      this.emit('initialized', { id: this.id });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize agent:', error);
      this.emit('error', error);
    }
  }

  public async execute(task: string): Promise<string> {
    // eslint-disable-next-line no-console
    console.log(`Agent ${this.id} executing task: ${task}`);
    this.emit('taskStarted', { id: this.id, task });

    // Simulate task execution
    await new Promise(resolve => global.setTimeout(resolve, 100));

    const result = `Task "${task}" completed by agent ${this.id}`;
    this.emit('taskCompleted', { id: this.id, task, result });

    return result;
  }

  public async terminate(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`Terminating agent ${this.id}`);
    this.emit('terminating', { id: this.id });
    this.removeAllListeners();
  }
}
