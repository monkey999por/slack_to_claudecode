import { ClaudeExecutor } from './executor';
import { randomUUID } from 'crypto';

export interface Session {
  id: string;
  userId: string;
  channelId: string;
  status: 'idle' | 'processing' | 'error';
  createdAt: number;
  lastActivityAt: number;
  executor: ClaudeExecutor;
  sendPrompt(prompt: string): Promise<string>;
}

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, Session> = new Map();
  private timeoutMinutes: number;
  private readonly instanceId: string;

  private constructor() {
    this.instanceId = `SM-${Math.random().toString(36).substr(2, 9)}`;
    this.timeoutMinutes = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30');
    
    console.log(`🔧 SessionManager created with ID: ${this.instanceId}`);
    
    setInterval(() => {
      this.cleanupTimeoutSessions();
    }, 60000);
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async createSession(userId: string, channelId: string): Promise<Session> {
    console.log(`🔧 [${this.instanceId}] createSession called for user ${userId}`);
    const existingSession = this.sessions.get(userId);
    if (existingSession) {
      await this.endSession(userId);
    }

    console.log('Creating new Claude Code session...');
    const executor = new ClaudeExecutor();
    try {
      await executor.start();
      console.log('Claude Code session started successfully');
    } catch (error) {
      console.error('Failed to start Claude Code:', error);
      throw new Error(`Failed to start Claude Code: ${error instanceof Error ? error.message : String(error)}`);
    }

    const session: Session = {
      id: randomUUID(),
      userId,
      channelId,
      status: 'idle',
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      executor,
      sendPrompt: async function(prompt: string): Promise<string> {
        this.status = 'processing';
        this.lastActivityAt = Date.now();
        
        try {
          const response = await this.executor.sendPrompt(prompt);
          this.status = 'idle';
          return response;
        } catch (error) {
          this.status = 'error';
          throw error;
        }
      }
    };

    this.sessions.set(userId, session);
    console.log(`✅ Session saved successfully for user ${userId}`);
    console.log(`✅ Total sessions now: ${this.sessions.size}`);
    console.log(`✅ Session keys: ${Array.from(this.sessions.keys()).join(', ')}`);
    return session;
  }

  getSession(userId: string): Session | undefined {
    console.log(`🔍 [${this.instanceId}] getSession called for user ${userId}`);
    console.log(`🔍 [${this.instanceId}] Total sessions: ${this.sessions.size}`);
    console.log(`🔍 [${this.instanceId}] Session keys: ${Array.from(this.sessions.keys()).join(', ')}`);
    
    const session = this.sessions.get(userId);
    if (session) {
      console.log(`🔍 [${this.instanceId}] Found session: ${session.id}`);
      session.lastActivityAt = Date.now();
    } else {
      console.log(`🔍 [${this.instanceId}] No session found for user ${userId}`);
    }
    return session;
  }

  async endSession(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      await session.executor.stop();
      this.sessions.delete(userId);
    }
  }

  async restartSession(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      await session.executor.stop();
      session.executor = new ClaudeExecutor();
      await session.executor.start();
      session.status = 'idle';
      session.lastActivityAt = Date.now();
    }
  }

  private cleanupTimeoutSessions(): void {
    const now = Date.now();
    const timeout = this.timeoutMinutes * 60 * 1000;

    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivityAt > timeout) {
        console.log(`Cleaning up timed out session for user ${userId}`);
        this.endSession(userId).catch(console.error);
      }
    }
  }
}

