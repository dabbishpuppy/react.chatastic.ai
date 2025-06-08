
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ClassificationRule {
  id: string;
  name: string;
  description: string;
  classification: DataClassification;
  patterns: RegExp[];
  keywords: string[];
  weight: number;
}

export interface ClassificationResult {
  classification: DataClassification;
  confidence: number;
  matchedRules: string[];
  recommendations: string[];
}

export class DataClassificationService {
  private static readonly CLASSIFICATION_RULES: ClassificationRule[] = [
    {
      id: 'pii-email',
      name: 'Email Addresses',
      description: 'Contains email addresses',
      classification: 'confidential',
      patterns: [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g],
      keywords: ['email', 'e-mail'],
      weight: 0.8
    },
    {
      id: 'pii-phone',
      name: 'Phone Numbers',
      description: 'Contains phone numbers',
      classification: 'confidential',
      patterns: [/(\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g],
      keywords: ['phone', 'telephone', 'mobile'],
      weight: 0.7
    },
    {
      id: 'financial-data',
      name: 'Financial Information',
      description: 'Contains financial or payment data',
      classification: 'restricted',
      patterns: [/\b(?:\d{4}[-\s]?){3}\d{4}\b/g],
      keywords: ['credit card', 'payment', 'invoice', 'billing', 'price', 'cost'],
      weight: 0.9
    },
    {
      id: 'auth-credentials',
      name: 'Authentication Data',
      description: 'Contains passwords or API keys',
      classification: 'restricted',
      patterns: [
        /password["\s]*[:=]["\s]*[^"\s]+/gi,
        /api[_-]?key["\s]*[:=]["\s]*[A-Za-z0-9]+/gi,
        /token["\s]*[:=]["\s]*[A-Za-z0-9]+/gi
      ],
      keywords: ['password', 'api key', 'token', 'secret', 'auth'],
      weight: 1.0
    },
    {
      id: 'public-info',
      name: 'Public Information',
      description: 'General public information',
      classification: 'public',
      patterns: [],
      keywords: ['help', 'support', 'faq', 'documentation', 'guide'],
      weight: 0.3
    }
  ];

  /**
   * Classify content based on sensitivity
   */
  static classifyContent(content: string, metadata?: Record<string, any>): ClassificationResult {
    const matchedRules: string[] = [];
    let totalWeight = 0;
    let maxClassificationLevel = 0;

    const classificationLevels = {
      'public': 0,
      'internal': 1,
      'confidential': 2,
      'restricted': 3
    };

    // Check each rule against the content
    this.CLASSIFICATION_RULES.forEach(rule => {
      let ruleMatched = false;

      // Check patterns
      rule.patterns.forEach(pattern => {
        if (pattern.test(content)) {
          ruleMatched = true;
        }
      });

      // Check keywords
      const lowerContent = content.toLowerCase();
      rule.keywords.forEach(keyword => {
        if (lowerContent.includes(keyword.toLowerCase())) {
          ruleMatched = true;
        }
      });

      // Check metadata
      if (metadata) {
        const metadataString = JSON.stringify(metadata).toLowerCase();
        rule.keywords.forEach(keyword => {
          if (metadataString.includes(keyword.toLowerCase())) {
            ruleMatched = true;
          }
        });
      }

      if (ruleMatched) {
        matchedRules.push(rule.id);
        totalWeight += rule.weight;
        const ruleLevel = classificationLevels[rule.classification];
        if (ruleLevel > maxClassificationLevel) {
          maxClassificationLevel = ruleLevel;
        }
      }
    });

    // Determine final classification
    const classifications = Object.keys(classificationLevels) as DataClassification[];
    const finalClassification = classifications[maxClassificationLevel];
    
    // Calculate confidence
    const confidence = Math.min(totalWeight / 2, 1.0);

    // Generate recommendations
    const recommendations = this.generateRecommendations(finalClassification, matchedRules);

    return {
      classification: finalClassification,
      confidence,
      matchedRules,
      recommendations
    };
  }

  /**
   * Get retention policy for classification level
   */
  static getRetentionPolicy(classification: DataClassification): {
    retentionDays: number;
    requiresEncryption: boolean;
    requiresAuditLog: boolean;
    allowsThirdPartySharing: boolean;
  } {
    switch (classification) {
      case 'restricted':
        return {
          retentionDays: 90,
          requiresEncryption: true,
          requiresAuditLog: true,
          allowsThirdPartySharing: false
        };
      case 'confidential':
        return {
          retentionDays: 365,
          requiresEncryption: true,
          requiresAuditLog: true,
          allowsThirdPartySharing: false
        };
      case 'internal':
        return {
          retentionDays: 1095, // 3 years
          requiresEncryption: false,
          requiresAuditLog: true,
          allowsThirdPartySharing: false
        };
      case 'public':
        return {
          retentionDays: 2555, // 7 years
          requiresEncryption: false,
          requiresAuditLog: false,
          allowsThirdPartySharing: true
        };
    }
  }

  private static generateRecommendations(
    classification: DataClassification, 
    matchedRules: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (classification === 'restricted') {
      recommendations.push('Apply field-level encryption before storage');
      recommendations.push('Enable comprehensive audit logging');
      recommendations.push('Restrict access to authorized users only');
      recommendations.push('Consider shorter retention period');
    }

    if (classification === 'confidential') {
      recommendations.push('Enable audit logging for all access');
      recommendations.push('Consider encryption for sensitive fields');
      recommendations.push('Limit third-party integrations');
    }

    if (matchedRules.includes('auth-credentials')) {
      recommendations.push('Never store in plain text');
      recommendations.push('Use secure key management system');
      recommendations.push('Implement automatic rotation');
    }

    if (matchedRules.includes('financial-data')) {
      recommendations.push('Ensure PCI DSS compliance');
      recommendations.push('Implement tokenization where possible');
    }

    return recommendations;
  }
}
