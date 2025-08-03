import { BaseAgent } from './BaseAgent.js';
import { AgentConfig, Task } from '../interfaces/types.js';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

/**
 * LanguageAgnosticAgent - Wrapper agent that can execute agents written in other languages
 * Supports Python, Java, Ruby, Go, and other languages through process spawning
 */
export class LanguageAgnosticAgent extends BaseAgent {
  private readonly language: string;
  private readonly scriptPath: string;
  private readonly interpreterCommand: string;
  private childProcess?: ChildProcess;

  constructor(
    config: AgentConfig,
    language: string,
    scriptPath: string
  ) {
    super({
      ...config,
      capabilities: config.capabilities.length > 0 ? config.capabilities : [`${language.toLowerCase()}-agent`, 'language-agnostic'],
    });
    
    this.language = language.toLowerCase();
    this.scriptPath = scriptPath;
    this.interpreterCommand = this.getInterpreterCommand(this.language);
  }

  protected async onInitialize(): Promise<void> {
    // Verify script exists and interpreter is available
    await this.validateEnvironment();
    
    // Initialize the child process
    await this.startChildProcess();
  }

  protected async onTerminate(): Promise<void> {
    await this.stopChildProcess();
  }

  protected async onSuspend(): Promise<void> {
    if (this.childProcess) {
      this.childProcess.kill('SIGSTOP');
    }
  }

  protected async onResume(): Promise<void> {
    if (this.childProcess) {
      this.childProcess.kill('SIGCONT');
    }
  }

  protected async onExecuteTask(task: Task): Promise<unknown> {
    if (!this.childProcess) {
      throw new Error('Child process is not running');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task execution timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      const messageHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          clearTimeout(timeout);
          
          if (response.success) {
            resolve(response.result);
          } else {
            reject(new Error(response.error || 'Task execution failed'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error}`));
        }
      };

      this.childProcess!.stdout?.once('data', messageHandler);
      
      // Send task to child process
      const taskMessage = JSON.stringify({
        type: 'execute_task',
        task: task,
      });
      
      this.childProcess!.stdin?.write(taskMessage + '\n');
    });
  }

  protected async getResourceUsage(): Promise<{ cpu: number; memory: number }> {
    // Language-agnostic agents may use more resources due to process overhead
    return {
      cpu: 0.3, // 30% CPU usage
      memory: 0.2, // 20% memory usage
    };
  }

  private getInterpreterCommand(language: string): string {
    const interpreters: Record<string, string> = {
      python: 'python3',
      javascript: 'node',
      java: 'java',
      ruby: 'ruby',
      go: 'go run',
      rust: 'cargo run --',
      csharp: 'dotnet run',
      php: 'php',
      shell: 'bash',
      bash: 'bash',
      powershell: 'pwsh',
    };

    const interpreter = interpreters[language];
    if (!interpreter) {
      throw new Error(`Unsupported language: ${language}`);
    }

    return interpreter;
  }

  private async validateEnvironment(): Promise<void> {
    // Check if interpreter is available
    return new Promise((resolve, reject) => {
      const testProcess = spawn(this.interpreterCommand.split(' ')[0], ['--version'], {
        stdio: 'pipe'
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Interpreter ${this.interpreterCommand} is not available`));
        }
      });

      testProcess.on('error', (error) => {
        reject(new Error(`Failed to validate interpreter: ${error.message}`));
      });
    });
  }

  private async startChildProcess(): Promise<void> {
    const args = this.interpreterCommand.split(' ').slice(1);
    args.push(this.scriptPath);

    this.childProcess = spawn(this.interpreterCommand.split(' ')[0], args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        AGENT_ID: this.id,
        AGENT_CONFIG: JSON.stringify(this.config),
      },
    });

    this.childProcess.on('error', (error) => {
      this.emit('error', new Error(`Child process error: ${error.message}`));
    });

    this.childProcess.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM') {
        this.emit('error', new Error(`Child process exited with code ${code}, signal ${signal}`));
      }
    });

    this.childProcess.stderr?.on('data', (data) => {
      this.emit('error', new Error(`Child process stderr: ${data.toString()}`));
    });

    // Wait for initialization confirmation
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Child process initialization timeout'));
      }, 5000);

      const initHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.type === 'initialized') {
            clearTimeout(timeout);
            resolve();
          }
        } catch (error) {
          // Ignore parsing errors for non-JSON output
        }
      };

      this.childProcess!.stdout?.once('data', initHandler);
      
      // Send initialization message
      const initMessage = JSON.stringify({
        type: 'initialize',
        config: this.config,
      });
      
      this.childProcess!.stdin?.write(initMessage + '\n');
    });
  }

  private async stopChildProcess(): Promise<void> {
    if (!this.childProcess) {
      return;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.childProcess!.kill('SIGKILL');
        resolve();
      }, 3000);

      this.childProcess!.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.childProcess!.kill('SIGTERM');
    });
  }
}
