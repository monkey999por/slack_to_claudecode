import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface ClaudeExecutorOptions {
  claudePath?: string;
  workingDirectory?: string;
}

export class ClaudeExecutor extends EventEmitter {
  private process: ChildProcess | null = null;
  private claudePath: string;
  private workingDirectory: string;
  private outputBuffer: string = '';

  constructor(options: ClaudeExecutorOptions = {}) {
    super();
    this.claudePath = options.claudePath || process.env.CLAUDE_CODE_PATH || 'claude';
    this.workingDirectory = options.workingDirectory || process.env.CLAUDE_WORKING_DIRECTORY || process.cwd();
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Starting Claude Code: ${this.claudePath}`);
        console.log(`Working directory: ${this.workingDirectory}`);
        
        this.process = spawn(this.claudePath, [], {
          cwd: this.workingDirectory,
          env: { ...process.env },
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.process.stdout?.on('data', (data: Buffer) => {
          const output = data.toString();
          console.log(`📤 Claude stdout (${output.length} chars):`, JSON.stringify(output.slice(0, 200)));
          this.outputBuffer += output;
          this.emit('output', output);
        });

        this.process.stderr?.on('data', (data: Buffer) => {
          const error = data.toString();
          console.error('📤 Claude stderr:', JSON.stringify(error));
          this.emit('error', error);
        });

        this.process.on('error', (error) => {
          console.error('Claude Code process error:', error);
          reject(error);
        });

        this.process.on('spawn', () => {
          console.log('✅ Claude Code process spawned successfully');
          resolve();
        });

        this.process.on('exit', (code, signal) => {
          console.log(`⚠️ Claude Code process exited with code ${code}, signal ${signal}`);
          this.emit('exit', { code, signal });
          this.process = null;
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async sendPrompt(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('Claude process not running'));
        return;
      }

      console.log(`Sending prompt: ${prompt.slice(0, 100)}...`);
      
      this.outputBuffer = '';
      let responseBuffer = '';
      let timeoutId: NodeJS.Timeout;

      const outputHandler = (data: string) => {
        console.log(`Received output: ${data.slice(0, 100)}...`);
        responseBuffer += data;
        
        // Check if response looks complete (simple heuristic)
        if (data.includes('\n\n') || data.includes('claude')) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            this.removeListener('output', outputHandler);
            this.removeListener('error', errorHandler);
            resolve(responseBuffer);
          }, 1000);
        }
      };

      const errorHandler = (error: string) => {
        console.error(`Claude executor error: ${error}`);
        clearTimeout(timeoutId);
        this.removeListener('output', outputHandler);
        this.removeListener('error', errorHandler);
        reject(new Error(error));
      };

      this.on('output', outputHandler);
      this.on('error', errorHandler);

      // Add overall timeout
      const overallTimeout = setTimeout(() => {
        this.removeListener('output', outputHandler);
        this.removeListener('error', errorHandler);
        if (responseBuffer.length > 0) {
          resolve(responseBuffer);
        } else {
          reject(new Error('Timeout waiting for Claude response'));
        }
      }, 30000); // 30 second timeout

      try {
        console.log(`📥 Writing to Claude stdin: ${JSON.stringify(prompt + '\n')}`);
        const written = this.process.stdin.write(prompt + '\n');
        console.log(`📥 Write successful: ${written}`);
      } catch (writeError) {
        console.error('📥 Write error:', writeError);
        clearTimeout(overallTimeout);
        reject(writeError);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.on('exit', () => {
        this.process = null;
        resolve();
      });

      this.process.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  isRunning(): boolean {
    return this.process !== null;
  }
}