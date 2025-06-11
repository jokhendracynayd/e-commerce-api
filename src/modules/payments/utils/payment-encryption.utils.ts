import * as crypto from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentEncryptionUtil {
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;
  
  constructor(private configService: ConfigService) {
    // Get encryption key from environment variables
    const key = this.configService.get<string>('PAYMENT_ENCRYPTION_KEY');
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const isProduction = nodeEnv === 'production';
    
    if (!key) {
      if (isProduction) {
        // Fail fast in production if encryption key is missing
        throw new InternalServerErrorException(
          'PAYMENT_ENCRYPTION_KEY is required in production environment. Please set this environment variable.'
        );
      } else {
        // For development, generate a temporary key with warning
        this.encryptionKey = crypto.randomBytes(32); // 256 bits
        console.warn(
          'WARNING: Generated temporary encryption key for development. ' + 
          'This is insecure for production use. ' +
          'Set PAYMENT_ENCRYPTION_KEY environment variable in production.'
        );
      }
    } else {
      // Use the configured key
      try {
        this.encryptionKey = Buffer.from(key, 'hex');
        
        // Validate that the key is the correct length for AES-256
        if (this.encryptionKey.length !== 32) {
          throw new Error(`Invalid key length: ${this.encryptionKey.length} bytes. Expected: 32 bytes.`);
        }
      } catch (error) {
        const errorMsg = 'Invalid PAYMENT_ENCRYPTION_KEY format. Must be a valid hex string representing 32 bytes (256 bits).';
        if (isProduction) {
          throw new InternalServerErrorException(errorMsg);
        } else {
          console.error(errorMsg);
          // Fall back to a random key in development
          this.encryptionKey = crypto.randomBytes(32);
          console.warn('Using randomly generated key instead. DO NOT use in production!');
        }
      }
    }
  }
  
  /**
   * Encrypts sensitive payment data
   * @param data Object containing sensitive data
   * @returns Encrypted string
   */
  encrypt(data: Record<string, any>): string {
    try {
      // Create initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(
        this.algorithm, 
        this.encryptionKey, 
        iv
      );
      
      // Encrypt the data
      const jsonData = JSON.stringify(data);
      let encrypted = cipher.update(jsonData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the auth tag (for GCM mode)
      const authTag = cipher.getAuthTag();
      
      // Combine IV, encrypted data, and auth tag for storage
      const result = {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag.toString('hex'),
      };
      
      return JSON.stringify(result);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new InternalServerErrorException('Failed to encrypt sensitive payment data');
    }
  }
  
  /**
   * Decrypts sensitive payment data
   * @param encryptedString Encrypted string from encrypt method
   * @returns Original data object
   */
  decrypt(encryptedString: string): Record<string, any> {
    try {
      // Parse the encrypted string
      const encrypted = JSON.parse(encryptedString);
      
      // Extract components
      const iv = Buffer.from(encrypted.iv, 'hex');
      const authTag = Buffer.from(encrypted.authTag, 'hex');
      const encryptedText = encrypted.encryptedData;
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        this.encryptionKey, 
        iv
      );
      
      // Set auth tag
      decipher.setAuthTag(authTag);
      
      // Decrypt
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new InternalServerErrorException('Failed to decrypt sensitive payment data');
    }
  }
  
  /**
   * Masks sensitive card data for logging
   * @param cardNumber Full card number
   * @returns Masked card number (e.g., ******1234)
   */
  maskCardNumber(cardNumber: string): string {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return '';
    }
    
    const visibleDigits = 4;
    const maskedPart = cardNumber.slice(0, -visibleDigits).replace(/./g, '*');
    const visiblePart = cardNumber.slice(-visibleDigits);
    
    return maskedPart + visiblePart;
  }
} 