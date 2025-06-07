
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: 'general' | 'support' | 'sales' | 'technical' | 'creative';
  agentId?: string;
  isDefault: boolean;
}

export interface PromptContext {
  query: string;
  context: string;
  agentName: string;
  agentInstructions: string;
  sources?: Array<{
    name: string;
    url?: string;
  }>;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  metadata?: Record<string, any>;
}

export class PromptTemplateSystem {
  private static templates = new Map<string, PromptTemplate>();
  private static initialized = false;

  /**
   * Initialize with default templates
   */
  static initialize(): void {
    if (this.initialized) return;

    // Add default templates
    this.addTemplate({
      id: 'general-rag',
      name: 'General RAG Assistant',
      description: 'Standard template for general question answering',
      template: `You are {{agentName}}, an AI assistant. {{agentInstructions}}

Based on the following context information, please answer the user's question accurately and helpfully.

Context:
{{context}}

User Question: {{query}}

Please provide a comprehensive answer based on the context provided. If you cannot find relevant information in the context, say so clearly.

{{#if sources}}
Sources used:
{{#each sources}}
- {{name}}{{#if url}} ({{url}}){{/if}}
{{/each}}
{{/if}}`,
      variables: ['agentName', 'agentInstructions', 'context', 'query', 'sources'],
      category: 'general',
      isDefault: true
    });

    this.addTemplate({
      id: 'support-rag',
      name: 'Customer Support Assistant',
      description: 'Template optimized for customer support scenarios',
      template: `You are {{agentName}}, a helpful customer support assistant. {{agentInstructions}}

Based on the support documentation and context below, help resolve the customer's inquiry.

Support Context:
{{context}}

Customer Question: {{query}}

Please provide a clear, step-by-step solution. If the issue requires escalation or cannot be resolved with the available information, guide the customer on next steps.

{{#if conversationHistory}}
Previous conversation:
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}
{{/if}}`,
      variables: ['agentName', 'agentInstructions', 'context', 'query', 'conversationHistory'],
      category: 'support',
      isDefault: false
    });

    this.addTemplate({
      id: 'sales-rag',
      name: 'Sales Assistant',
      description: 'Template for sales and product information queries',
      template: `You are {{agentName}}, a knowledgeable sales assistant. {{agentInstructions}}

Using the product information and sales materials below, help the customer understand our offerings.

Product Information:
{{context}}

Customer Inquiry: {{query}}

Focus on how our products/services can benefit the customer. Be persuasive but honest, and always provide value.`,
      variables: ['agentName', 'agentInstructions', 'context', 'query'],
      category: 'sales',
      isDefault: false
    });

    this.addTemplate({
      id: 'technical-rag',
      name: 'Technical Documentation Assistant',
      description: 'Template for technical documentation and API queries',
      template: `You are {{agentName}}, a technical documentation assistant. {{agentInstructions}}

Based on the technical documentation below, provide accurate and detailed answers.

Technical Documentation:
{{context}}

Technical Question: {{query}}

Provide clear, technical explanations with code examples where appropriate. Include relevant warnings or best practices.`,
      variables: ['agentName', 'agentInstructions', 'context', 'query'],
      category: 'technical',
      isDefault: false
    });

    this.initialized = true;
  }

  /**
   * Add a new template
   */
  static addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get template by ID
   */
  static getTemplate(id: string): PromptTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Get all templates
   */
  static getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * Get default template
   */
  static getDefaultTemplate(): PromptTemplate | null {
    return this.getAllTemplates().find(template => template.isDefault) || null;
  }

  /**
   * Generate prompt from template
   */
  static generatePrompt(
    templateId: string,
    context: PromptContext
  ): string {
    this.initialize();

    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let prompt = template.template;

    // Replace simple variables
    prompt = prompt.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      const value = (context as any)[variable];
      return value !== undefined ? String(value) : match;
    });

    // Handle conditional blocks
    prompt = this.processConditionals(prompt, context);

    // Handle loops
    prompt = this.processLoops(prompt, context);

    return prompt.trim();
  }

  /**
   * Process conditional blocks ({{#if condition}})
   */
  private static processConditionals(prompt: string, context: PromptContext): string {
    const conditionalRegex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return prompt.replace(conditionalRegex, (match, condition, content) => {
      const value = (context as any)[condition];
      return value && (Array.isArray(value) ? value.length > 0 : true) ? content : '';
    });
  }

  /**
   * Process loop blocks ({{#each array}})
   */
  private static processLoops(prompt: string, context: PromptContext): string {
    const loopRegex = /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return prompt.replace(loopRegex, (match, arrayName, content) => {
      const array = (context as any)[arrayName];
      if (!Array.isArray(array)) return '';

      return array.map(item => {
        let itemContent = content;
        
        // Replace item properties
        if (typeof item === 'object') {
          for (const [key, value] of Object.entries(item)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            itemContent = itemContent.replace(regex, String(value));
          }
        } else {
          // Handle primitive arrays
          itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
        }
        
        return itemContent;
      }).join('');
    });
  }

  /**
   * Validate template syntax
   */
  static validateTemplate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unmatched braces
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Unmatched template braces');
    }

    // Check for unmatched conditionals
    const ifBlocks = (template.match(/\{\{#if/g) || []).length;
    const endIfBlocks = (template.match(/\{\{\/if\}\}/g) || []).length;
    
    if (ifBlocks !== endIfBlocks) {
      errors.push('Unmatched if/endif blocks');
    }

    // Check for unmatched loops
    const eachBlocks = (template.match(/\{\{#each/g) || []).length;
    const endEachBlocks = (template.match(/\{\{\/each\}\}/g) || []).length;
    
    if (eachBlocks !== endEachBlocks) {
      errors.push('Unmatched each/endeach blocks');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract variables from template
   */
  static extractVariables(template: string): string[] {
    const variables = new Set<string>();
    const variableRegex = /\{\{(\w+)\}\}/g;
    
    let match;
    while ((match = variableRegex.exec(template)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }
}

// Initialize default templates
PromptTemplateSystem.initialize();
