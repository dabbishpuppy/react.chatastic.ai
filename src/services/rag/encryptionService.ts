
export class EncryptionService {
  // Client-side encryption for sensitive data
  static async encryptSensitiveData(data: string, key?: string): Promise<string> {
    try {
      // Use Web Crypto API for client-side encryption
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key || this.getDefaultKey()),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const cryptoKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('wonderwave-salt'), // In production, use random salt
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        encoder.encode(data)
      );

      // Combine IV and encrypted data
      const result = new Uint8Array(iv.length + encryptedData.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encryptedData), iv.length);

      return btoa(String.fromCharCode(...result));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  // Client-side decryption
  static async decryptSensitiveData(encryptedData: string, key?: string): Promise<string> {
    try {
      const data = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      const iv = data.slice(0, 12);
      const encrypted = data.slice(12);

      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key || this.getDefaultKey()),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const cryptoKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('wonderwave-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        encrypted
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  // Get default encryption key (in production, this should come from secure storage)
  private static getDefaultKey(): string {
    return 'wonderwave-default-key-32-chars!!'; // 32 characters for AES-256
  }

  // Validate if data appears to be encrypted
  static isEncrypted(data: string): boolean {
    try {
      // Basic check for base64 format
      return btoa(atob(data)) === data;
    } catch {
      return false;
    }
  }

  // Hash sensitive data for comparison (one-way)
  static async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
