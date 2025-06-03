
export interface AIModel {
  value: string;
  label: string;
  provider: string;
  logo: string;
  description: string;
  cost: string;
  speed: string;
  capabilities: string[];
}

export const AI_MODELS: AIModel[] = [
  {
    value: "gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    logo: "/lovable-uploads/f35c0c57-c12e-4257-88ab-6767216c0856.png",
    description: "OpenAI's most advanced multimodal model with enhanced reasoning capabilities for text, vision, and audio processing.",
    cost: "High",
    speed: "Fast",
    capabilities: ["Text Generation", "Vision", "Code", "Reasoning", "Multimodal"]
  },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "OpenAI", 
    logo: "/lovable-uploads/f35c0c57-c12e-4257-88ab-6767216c0856.png",
    description: "A smaller, faster, and more cost-effective version of GPT-4o with excellent performance for most tasks.",
    cost: "Low",
    speed: "Very Fast",
    capabilities: ["Text Generation", "Vision", "Code", "Reasoning"]
  },
  {
    value: "gpt-4",
    label: "GPT-4",
    provider: "OpenAI",
    logo: "/lovable-uploads/f35c0c57-c12e-4257-88ab-6767216c0856.png", 
    description: "OpenAI's powerful large language model with advanced reasoning and comprehensive knowledge.",
    cost: "High",
    speed: "Medium",
    capabilities: ["Text Generation", "Code", "Reasoning", "Analysis"]
  },
  {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    provider: "OpenAI",
    logo: "/lovable-uploads/f35c0c57-c12e-4257-88ab-6767216c0856.png",
    description: "An optimized version of GPT-4 with improved speed and efficiency while maintaining high quality output.",
    cost: "Medium",
    speed: "Fast", 
    capabilities: ["Text Generation", "Code", "Reasoning", "Large Context"]
  },
  {
    value: "claude-3-5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    logo: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop&crop=center",
    description: "Anthropic's most capable model with excellent reasoning, coding, and creative writing abilities.",
    cost: "Medium",
    speed: "Fast",
    capabilities: ["Text Generation", "Code", "Reasoning", "Creative Writing"]
  }
];
