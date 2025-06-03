
export interface AIModel {
  value: string;
  label: string;
  provider: string;
  logo: string;
  description: string;
  cost: string;
  speed: string;
  capabilities: string[];
  contextWindow?: string;
  creditsPerMessage?: string;
}

export const AI_MODELS: AIModel[] = [
  // OpenAI Models
  {
    value: "gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    logo: "/lovable-uploads/f35c0c57-c12e-4257-88ab-6767216c0856.png",
    description: "OpenAI's most advanced multimodal model with enhanced reasoning capabilities for text, vision, and audio processing.",
    cost: "High",
    speed: "Fast",
    capabilities: ["Text Generation", "Vision", "Code", "Reasoning", "Multimodal"],
    contextWindow: "128K tokens",
    creditsPerMessage: "15-30 credits"
  },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "OpenAI", 
    logo: "/lovable-uploads/f35c0c57-c12e-4257-88ab-6767216c0856.png",
    description: "A smaller, faster, and more cost-effective version of GPT-4o with excellent performance for most tasks.",
    cost: "Low",
    speed: "Very Fast",
    capabilities: ["Text Generation", "Vision", "Code", "Reasoning"],
    contextWindow: "128K tokens",
    creditsPerMessage: "1-3 credits"
  },
  {
    value: "gpt-4",
    label: "GPT-4",
    provider: "OpenAI",
    logo: "/lovable-uploads/f35c0c57-c12e-4257-88ab-6767216c0856.png", 
    description: "OpenAI's powerful large language model with advanced reasoning and comprehensive knowledge.",
    cost: "High",
    speed: "Medium",
    capabilities: ["Text Generation", "Code", "Reasoning", "Analysis"],
    contextWindow: "8K tokens",
    creditsPerMessage: "20-40 credits"
  },
  {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    provider: "OpenAI",
    logo: "/lovable-uploads/f35c0c57-c12e-4257-88ab-6767216c0856.png",
    description: "An optimized version of GPT-4 with improved speed and efficiency while maintaining high quality output.",
    cost: "Medium",
    speed: "Fast", 
    capabilities: ["Text Generation", "Code", "Reasoning", "Large Context"],
    contextWindow: "128K tokens",
    creditsPerMessage: "10-20 credits"
  },

  // Claude 4 Models (Latest)
  {
    value: "claude-opus-4-20250514",
    label: "Claude 4 Opus",
    provider: "Anthropic",
    logo: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop&crop=center",
    description: "Anthropic's most capable and intelligent model with superior reasoning capabilities and advanced analysis.",
    cost: "Very High",
    speed: "Medium",
    capabilities: ["Text Generation", "Code", "Advanced Reasoning", "Analysis", "Creative Writing"],
    contextWindow: "200K tokens",
    creditsPerMessage: "25-50 credits"
  },
  {
    value: "claude-sonnet-4-20250514",
    label: "Claude 4 Sonnet",
    provider: "Anthropic",
    logo: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop&crop=center",
    description: "A high-performance model with exceptional reasoning and efficiency, balancing capability with speed.",
    cost: "High",
    speed: "Fast",
    capabilities: ["Text Generation", "Code", "Reasoning", "Creative Writing", "Analysis"],
    contextWindow: "200K tokens",
    creditsPerMessage: "15-30 credits"
  },
  {
    value: "claude-3-5-haiku-20241022",
    label: "Claude 3.5 Haiku",
    provider: "Anthropic",
    logo: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop&crop=center",
    description: "The fastest Claude model optimized for quick responses while maintaining quality output.",
    cost: "Low",
    speed: "Very Fast",
    capabilities: ["Text Generation", "Code", "Quick Responses", "Reasoning"],
    contextWindow: "200K tokens",
    creditsPerMessage: "1-5 credits"
  },

  // Claude 3 Models
  {
    value: "claude-3-5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    logo: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop&crop=center",
    description: "Anthropic's most capable Claude 3 model with excellent reasoning, coding, and creative writing abilities.",
    cost: "Medium",
    speed: "Fast",
    capabilities: ["Text Generation", "Code", "Reasoning", "Creative Writing"],
    contextWindow: "200K tokens",
    creditsPerMessage: "8-15 credits"
  },
  {
    value: "claude-3-opus-20240229",
    label: "Claude 3 Opus",
    provider: "Anthropic",
    logo: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop&crop=center",
    description: "The most powerful Claude 3 model with exceptional performance on complex tasks requiring deep understanding.",
    cost: "High",
    speed: "Medium",
    capabilities: ["Text Generation", "Code", "Advanced Reasoning", "Complex Analysis"],
    contextWindow: "200K tokens",
    creditsPerMessage: "15-30 credits"
  },
  {
    value: "claude-3-haiku-20240307",
    label: "Claude 3 Haiku",
    provider: "Anthropic",
    logo: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop&crop=center",
    description: "The fastest and most cost-effective Claude 3 model, ideal for simple tasks and quick responses.",
    cost: "Very Low",
    speed: "Very Fast",
    capabilities: ["Text Generation", "Simple Reasoning", "Quick Tasks"],
    contextWindow: "200K tokens",
    creditsPerMessage: "0.5-2 credits"
  },

  // Google Gemini Models
  {
    value: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    provider: "Google",
    logo: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=100&h=100&fit=crop&crop=center",
    description: "Google's latest and most advanced Gemini model with multimodal capabilities and improved reasoning.",
    cost: "Medium",
    speed: "Very Fast",
    capabilities: ["Text Generation", "Vision", "Code", "Multimodal", "Reasoning"],
    contextWindow: "1M tokens",
    creditsPerMessage: "5-12 credits"
  },
  {
    value: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    provider: "Google",
    logo: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=100&h=100&fit=crop&crop=center",
    description: "Google's most capable Gemini model with advanced reasoning and massive context window support.",
    cost: "High",
    speed: "Medium",
    capabilities: ["Text Generation", "Vision", "Code", "Long Context", "Reasoning"],
    contextWindow: "2M tokens",
    creditsPerMessage: "10-25 credits"
  },
  {
    value: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    provider: "Google",
    logo: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=100&h=100&fit=crop&crop=center",
    description: "A fast and efficient Gemini model optimized for speed while maintaining good performance across tasks.",
    cost: "Low",
    speed: "Very Fast",
    capabilities: ["Text Generation", "Vision", "Code", "Quick Responses"],
    contextWindow: "1M tokens",
    creditsPerMessage: "2-8 credits"
  }
];
