import type { SessionOptions, SessionStore, Middleware, EfwRequest, EfwResponse, NextFunction } from '../types';

export class MemorySessionStore implements SessionStore {
  private sessions: Map<string, any> = new Map();

  async get(id: string): Promise<any> {
    return this.sessions.get(id);
  }

  async set(id: string, data: any): Promise<void> {
    this.sessions.set(id, data);
  }

  async destroy(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async clear(): Promise<void> {
    this.sessions.clear();
  }

  async length(): Promise<number> {
    return this.sessions.size;
  }

  async all(): Promise<Record<string, any>> {
    return Object.fromEntries(this.sessions);
  }
}

export class FileSessionStore implements SessionStore {
  private sessionsDir: string;

  constructor(sessionsDir: string = './sessions') {
    this.sessionsDir = sessionsDir;
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await Bun.$`mkdir -p ${this.sessionsDir}`;
    } catch (error) {
      console.error('Failed to create sessions directory:', error);
    }
  }

  private getSessionPath(id: string): string {
    return `${this.sessionsDir}/${id}.json`;
  }

  async get(id: string): Promise<any> {
    try {
      const filePath = this.getSessionPath(id);
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        const content = await file.text();
        const session = JSON.parse(content);
        
        if (session.expires && new Date(session.expires) < new Date()) {
          await this.destroy(id);
          return null;
        }
        
        return session.data;
      }
      
      return null;
    } catch (error) {
      console.error('Session get error:', error);
      return null;
    }
  }

  async set(id: string, data: any): Promise<void> {
    try {
      const filePath = this.getSessionPath(id);
      const session = {
        data,
        expires: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours
      };
      
      await Bun.write(filePath, JSON.stringify(session, null, 2));
    } catch (error) {
      console.error('Session set error:', error);
    }
  }

  async destroy(id: string): Promise<void> {
    try {
      const filePath = this.getSessionPath(id);
      await Bun.$`rm -f ${filePath}`;
    } catch (error) {
      console.error('Session destroy error:', error);
    }
  }
}

export class SessionManager {
  private store: SessionStore;
  private secret: string;
  private maxAge: number;
  private cookieName: string;

  constructor(options: SessionOptions) {
    this.store = options.store || new MemorySessionStore();
    this.secret = options.secret;
    this.maxAge = options.maxAge || 24 * 60 * 60 * 1000; // 24 hours
    this.cookieName = 'session-id';
  }

  private generateSessionId(): string {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private async signSessionId(sessionId: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(sessionId);
    const key = encoder.encode(this.secret);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return `${sessionId}.${signatureHex}`;
  }

  private async verifySessionId(signedSessionId: string): Promise<string | null> {
    const [sessionId, signature] = signedSessionId.split('.');
    
    if (!sessionId || !signature) {
      return null;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(sessionId);
    const key = encoder.encode(this.secret);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSignatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignature = Array.from(new Uint8Array(expectedSignatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignature) {
      return null;
    }

    return sessionId;
  }

  public middleware(): Middleware {
    return async (req: EfwRequest, res: EfwResponse, next: NextFunction) => {
      try {
        let sessionId: string | null = null;
        let session: any = null;

        const signedSessionId = req.cookies[this.cookieName];
        
        if (signedSessionId) {
          sessionId = await this.verifySessionId(signedSessionId);
          
          if (sessionId) {
            session = await this.store.get(sessionId);
          }
        }

        if (!sessionId || !session) {
          sessionId = this.generateSessionId();
          session = {};
        }

        req.session = {
          id: sessionId,
          data: session,
          
          save: async () => {
            await this.store.set(sessionId!, req.session.data);
            const signedId = await this.signSessionId(sessionId!);
            res.cookie(this.cookieName, signedId, {
              maxAge: this.maxAge,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            });
          },

          destroy: async () => {
            await this.store.destroy(sessionId!);
            res.cookie(this.cookieName, '', {
              maxAge: 0,
              httpOnly: true
            });
          },

          regenerate: async () => {
            if (sessionId) {
              await this.store.destroy(sessionId);
            }
            sessionId = this.generateSessionId();
            req.session.id = sessionId;
            await req.session.save();
          }
        };

        Object.defineProperty(req.session, 'get', {
          value: (key: string) => req.session.data[key],
          enumerable: false
        });

        Object.defineProperty(req.session, 'set', {
          value: (key: string, value: any) => {
            req.session.data[key] = value;
          },
          enumerable: false
        });

        Object.defineProperty(req.session, 'has', {
          value: (key: string) => key in req.session.data,
          enumerable: false
        });

        Object.defineProperty(req.session, 'delete', {
          value: (key: string) => {
            delete req.session.data[key];
          },
          enumerable: false
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

export function createSessionMiddleware(options: SessionOptions): Middleware {
  const sessionManager = new SessionManager(options);
  return sessionManager.middleware();
}