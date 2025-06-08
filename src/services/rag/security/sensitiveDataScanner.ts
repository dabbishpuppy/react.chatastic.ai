
import { EncryptionService } from "../encryptionService";

export interface SensitiveDataMatch {
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'api_key' | 'password' | 'custom';
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export class SensitiveDataScanner {
  private static readonly PATTERNS = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /(\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    ssn: /\b(?:\d{3}-?\d{2}-?\d{4})\b/g,
    credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    api_key: /\b[A-Za-z0-9]{32,}\b/g,
    password: /password["\s]*[:=]["\s]*[^"\s]+/gi,
  };

  /**
   * Scan text for sensitive data patterns
   */
  static scanText(text: string, customPatterns?: Record<string, RegExp>): SensitiveDataMatch[] {
    const matches: SensitiveDataMatch[] = [];
    const patterns = { ...this.PATTERNS, ...customPatterns };

    Object.entries(patterns).forEach(([type, pattern]) => {
      let match;
      const regex = new RegExp(pattern);
      
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          type: type as SensitiveDataMatch['type'],
          value: match[0],
          confidence: this.calculateConfidence(type, match[0]),
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    });

    return matches.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Redact sensitive data from text
   */
  static redactText(text: string, matches?: SensitiveDataMatch[]): string {
    if (!matches) {
      matches = this.scanText(text);
    }

    let redactedText = text;
    
    // Process matches in reverse order to maintain indices
    matches.reverse().forEach(match => {
      const redactionLength = Math.min(match.value.length, 8);
      const redaction = '*'.repeat(redactionLength);
      
      redactedText = redactedText.substring(0, match.startIndex) + 
                    redaction + 
                    redactedText.substring(match.endIndex);
    });

    return redactedText;
  }

  /**
   * Encrypt sensitive data in place
   */
  static async encryptSensitiveFields(
    data: Record<string, any>, 
    sensitiveFields: string[]
  ): Promise<Record<string, any>> {
    const encrypted = { ...data };

    for (const field of sensitiveFields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        try {
          encrypted[field] = await EncryptionService.encryptSensitiveData(encrypted[field]);
        } catch (error) {
          console.error(`Failed to encrypt field ${field}:`, error);
        }
      }
    }

    return encrypted;
  }

  /**
   * Validate data before storage
   */
  static validateDataCompliance(data: any): {
    isCompliant: boolean;
    violations: Array<{
      field: string;
      type: string;
      message: string;
    }>;
  } {
    const violations: Array<{ field: string; type: string; message: string }> = [];

    // Check for unencrypted sensitive data
    const sensitiveMatches = this.scanText(JSON.stringify(data));
    
    sensitiveMatches.forEach(match => {
      violations.push({
        field: 'unknown',
        type: match.type,
        message: `Potentially sensitive ${match.type} data detected and should be encrypted`
      });
    });

    return {
      isCompliant: violations.length === 0,
      violations
    };
  }

  private static calculateConfidence(type: string, value: string): number {
    switch (type) {
      case 'email':
        return value.includes('@') && value.includes('.') ? 0.9 : 0.6;
      case 'phone':
        return value.replace(/\D/g, '').length === 10 ? 0.8 : 0.6;
      case 'ssn':
        return value.replace(/\D/g, '').length === 9 ? 0.9 : 0.5;
      case 'credit_card':
        return this.luhnCheck(value.replace(/\D/g, '')) ? 0.9 : 0.4;
      default:
        return 0.7;
    }
  }

  private static luhnCheck(num: string): boolean {
    let sum = 0;
    let isEven = false;
    
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
}
