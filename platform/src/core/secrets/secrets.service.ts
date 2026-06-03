import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface SecretsService {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

@Injectable()
export class AesSecretsService implements SecretsService {
  private readonly logger = new Logger(AesSecretsService.name);
  private readonly key: Buffer;

  constructor() {
    const b64 = process.env.KMS_KEY;
    if (!b64) {
      this.logger.warn('KMS_KEY not set — using ephemeral random key (not for production)');
      this.key = crypto.randomBytes(32);
    } else {
      this.key = Buffer.from(b64, 'base64');
      if (this.key.length !== 32) {
        throw new Error('KMS_KEY must decode to exactly 32 bytes for AES-256-GCM');
      }
    }
  }

  async encrypt(plaintext: string): Promise<string> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    // Format: base64(iv:tag:ciphertext)
    const combined = Buffer.concat([iv, tag, encrypted]);
    return combined.toString('base64');
  }

  async decrypt(ciphertext: string): Promise<string> {
    const combined = Buffer.from(ciphertext, 'base64');
    const iv = combined.subarray(0, 12);
    const tag = combined.subarray(12, 28);
    const encrypted = combined.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
