import crypto from 'crypto';
import bs58 from 'bs58';

class CryptoHandler {
  static ALGORITHM = 'aes-256-gcm';
  static IV_LENGTH = 12;
  static SALT_LENGTH = 16;
  static TAG_LENGTH = 16;
  static KEY_LENGTH = 32;

  static deriveKeyFromWallet(walletKey) {
    // Consistently derive a key from the wallet address
    const normalized = bs58.decode(walletKey);
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
  }

  static async encrypt(data, walletKey) {
    try {
      // Get deterministic key
      const key = this.deriveKeyFromWallet(walletKey);
      
      // Generate IV
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipheriv(
        this.ALGORITHM, 
        Buffer.from(key), 
        iv
      );
      
      // Encrypt data
      const jsonString = JSON.stringify(data);
      const encryptedBuffer = Buffer.concat([
        cipher.update(jsonString, 'utf8'),
        cipher.final()
      ]);
      
      // Get auth tag
      const authTag = cipher.getAuthTag();
      
      // Create components object
      const components = {
        i: iv.toString('base64'),        // IV
        t: authTag.toString('base64'),   // Auth Tag
        d: encryptedBuffer.toString('base64') // Data
      };
      
      // Return as base64 string
      return Buffer.from(JSON.stringify(components)).toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  static async decrypt(encryptedData, walletKey) {
    try {
      
      // Get deterministic key
      const key = this.deriveKeyFromWallet(walletKey);
      
      // Parse components
      const components = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
      
      // Convert components back to buffers
      const iv = Buffer.from(components.i, 'base64');
      const authTag = Buffer.from(components.t, 'base64');
      const data = Buffer.from(components.d, 'base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.ALGORITHM, 
        Buffer.from(key), 
        iv
      );
      
      // Set auth tag
      decipher.setAuthTag(authTag);
      
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final()
      ]);
      
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      console.error('Decryption error:', {
        error,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Helper method to verify encryption/decryption
  static async test(walletKey) {
    const testData = { test: 'data' };
    
    const encrypted = await this.encrypt(testData, walletKey);
    
    const decrypted = await this.decrypt(encrypted, walletKey);
    
    return decrypted;
  }
}

export default CryptoHandler;