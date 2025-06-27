import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export interface HashOptions {
  saltLength?: number;
  iterations?: number;
  keyLength?: number;
  algorithm?: 'sha256' | 'sha512';
}

export class PasswordHasher {
  private static readonly DEFAULT_OPTIONS: Required<HashOptions> = {
    saltLength: 32,
    iterations: 100000,
    keyLength: 64,
    algorithm: 'sha256'
  };

  static async hash(password: string, options: HashOptions = {}): Promise<string> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const salt = randomBytes(opts.saltLength);
    
    const hash = await this.pbkdf2(password, salt, opts.iterations, opts.keyLength, opts.algorithm);
    
    return `${opts.algorithm}:${opts.iterations}:${salt.toString('base64')}:${hash.toString('base64')}`;
  }

  static async verify(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const [algorithm, iterations, salt, hash] = hashedPassword.split(':');
      
      if (!algorithm || !iterations || !salt || !hash) {
        throw new Error('Invalid hash format');
      }

      const saltBuffer = Buffer.from(salt, 'base64');
      const hashBuffer = Buffer.from(hash, 'base64');
      
      const computedHash = await this.pbkdf2(
        password,
        saltBuffer,
        parseInt(iterations, 10),
        hashBuffer.length,
        algorithm as 'sha256' | 'sha512'
      );

      return timingSafeEqual(hashBuffer, computedHash);
    } catch (error) {
      return false;
    }
  }

  static hashSync(password: string, options: HashOptions = {}): string {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const salt = randomBytes(opts.saltLength);
    
    const hash = this.pbkdf2Sync(password, salt, opts.iterations, opts.keyLength, opts.algorithm);
    
    return `${opts.algorithm}:${opts.iterations}:${salt.toString('base64')}:${hash.toString('base64')}`;
  }

  static verifySync(password: string, hashedPassword: string): boolean {
    try {
      const [algorithm, iterations, salt, hash] = hashedPassword.split(':');
      
      if (!algorithm || !iterations || !salt || !hash) {
        throw new Error('Invalid hash format');
      }

      const saltBuffer = Buffer.from(salt, 'base64');
      const hashBuffer = Buffer.from(hash, 'base64');
      
      const computedHash = this.pbkdf2Sync(
        password,
        saltBuffer,
        parseInt(iterations, 10),
        hashBuffer.length,
        algorithm as 'sha256' | 'sha512'
      );

      return timingSafeEqual(hashBuffer, computedHash);
    } catch (error) {
      return false;
    }
  }

  private static async pbkdf2(
    password: string,
    salt: Buffer,
    iterations: number,
    keyLength: number,
    algorithm: 'sha256' | 'sha512'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const crypto = require('crypto');
      crypto.pbkdf2(password, salt, iterations, keyLength, algorithm, (err: Error | null, derivedKey: Buffer) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  private static pbkdf2Sync(
    password: string,
    salt: Buffer,
    iterations: number,
    keyLength: number,
    algorithm: 'sha256' | 'sha512'
  ): Buffer {
    const crypto = require('crypto');
    return crypto.pbkdf2Sync(password, salt, iterations, keyLength, algorithm);
  }

  static generatePassword(length: number = 12, includeSymbols: boolean = true): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charset = lowercase + uppercase + numbers;
    if (includeSymbols) {
      charset += symbols;
    }
    
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  static checkStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else feedback.push('Consider using 12+ characters for better security');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeating characters');

    return {
      score,
      feedback,
      isStrong: score >= 5
    };
  }
}