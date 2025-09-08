"use strict";

import * as crypto from 'crypto';

export class PaytmChecksum {
  private static readonly IV = '@@@@&&&&####$$$$';

  /**
   * Encrypt input using AES-128-CBC
   */
  static encrypt(input: string, key: string): string {
    const cipher = crypto.createCipheriv('AES-128-CBC', key, PaytmChecksum.IV);
    let encrypted = cipher.update(input, 'binary', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  /**
   * Decrypt encrypted input using AES-128-CBC
   */
  static decrypt(encrypted: string, key: string): string {
    const decipher = crypto.createDecipheriv('AES-128-CBC', key, PaytmChecksum.IV);
    let decrypted = decipher.update(encrypted, 'base64', 'binary');
    try {
      decrypted += decipher.final('binary');
    } catch (e) {
      console.log(e);
    }
    return decrypted;
  }

  /**
   * Generate signature for Paytm API requests
   * Supports both object and string parameters
   */
  static generateSignature(params: Record<string, any> | string, key: string): Promise<string> {
    if (typeof params !== "object" && typeof params !== "string") {
      const error = "string or object expected, " + (typeof params) + " given.";
      return Promise.reject(error);
    }
    
    if (typeof params !== "string") {
      params = PaytmChecksum.getStringByParams(params);
    }
    
    return PaytmChecksum.generateSignatureByString(params as string, key);
  }

  /**
   * Verify signature for Paytm API responses
   * Supports both object and string parameters
   */
  static verifySignature(params: Record<string, any> | string, key: string, checksum: string): Promise<boolean> {
    if (typeof params !== "object" && typeof params !== "string") {
      const error = "string or object expected, " + (typeof params) + " given.";
      return Promise.reject(error);
    }
    
    if (typeof params === "object" && params.hasOwnProperty("CHECKSUMHASH")) {
      delete (params as any).CHECKSUMHASH;
    }
    
    if (typeof params !== "string") {
      params = PaytmChecksum.getStringByParams(params);
    }
    
    return PaytmChecksum.verifySignatureByString(params as string, key, checksum);
  }

  /**
   * Generate signature by string using Paytm's official method
   */
  static async generateSignatureByString(params: string, key: string): Promise<string> {
    const salt = await PaytmChecksum.generateRandomString(4);
    return PaytmChecksum.calculateChecksum(params, key, salt);
  }

  /**
   * Verify signature by string using Paytm's official method
   */
  static verifySignatureByString(params: string, key: string, checksum: string): Promise<boolean> {
    const paytm_hash = PaytmChecksum.decrypt(checksum, key);
    const salt = paytm_hash.substr(paytm_hash.length - 4);
    return Promise.resolve(paytm_hash === PaytmChecksum.calculateHash(params, salt));
  }

  /**
   * Generate random string for salt
   */
  static generateRandomString(length: number): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes((length * 3.0) / 4.0, (err, buf) => {
        if (!err) {
          const salt = buf.toString("base64");
          resolve(salt);
        } else {
          console.log("error occurred in generateRandomString: " + err);
          reject(err);
        }
      });
    });
  }

  /**
   * Convert params object to string using Paytm's method
   * Sorts keys and joins values with pipe separator
   */
  static getStringByParams(params: Record<string, any>): string {
    const data: Record<string, string> = {};
    Object.keys(params).sort().forEach((key) => {
      data[key] = (params[key] !== null && params[key] !== undefined) ? String(params[key]) : "";
    });
    return Object.values(data).join('|');
  }

  /**
   * Calculate hash using Paytm's method
   */
  static calculateHash(params: string, salt: string): string {
    const finalString = params + "|" + salt;
    return crypto.createHash('sha256').update(finalString).digest('hex') + salt;
  }

  /**
   * Calculate checksum using Paytm's method
   */
  static calculateChecksum(params: string, key: string, salt: string): string {
    const hashString = PaytmChecksum.calculateHash(params, salt);
    return PaytmChecksum.encrypt(hashString, key);
  }
}
