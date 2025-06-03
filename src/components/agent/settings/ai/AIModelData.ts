
export interface AIModel {
  value: string;
  label: string;
  provider: string;
  logo: string;
  cost: string;
  description: string;
  capabilities: string[];
  speed: string;
}

export const AI_MODELS: AIModel[] = [
  { 
    value: "gpt-4o-mini", 
    label: "GPT-4o Mini", 
    provider: "OpenAI",
    logo: "/lovable-uploads/b8a1cad7-3471-42d5-bf69-9d09231a0a32.png",
    cost: "Very Low",
    description: "A fast, cost-effective model perfect for most conversational tasks. Offers excellent performance for general chat applications while being highly efficient.",
    capabilities: ["Text generation", "Conversation", "Code assistance", "Analysis"],
    speed: "Very Fast"
  },
  { 
    value: "gpt-4o", 
    label: "GPT-4o", 
    provider: "OpenAI",
    logo: "/lovable-uploads/b8a1cad7-3471-42d5-bf69-9d09231a0a32.png",
    cost: "Medium",
    description: "Our most advanced model with superior reasoning capabilities. Perfect for complex tasks requiring deep understanding and nuanced responses.",
    capabilities: ["Advanced reasoning", "Complex analysis", "Creative writing", "Code generation"],
    speed: "Fast"
  },
  { 
    value: "gpt-4-turbo", 
    label: "GPT-4 Turbo", 
    provider: "OpenAI",
    logo: "/lovable-uploads/b8a1cad7-3471-42d5-bf69-9d09231a0a32.png",
    cost: "High",
    description: "An optimized version of GPT-4, generating text faster and more efficiently. Ideal for tasks needing advanced GPT-4 capabilities with enhanced speed.",
    capabilities: ["Advanced reasoning", "Large context", "Multimodal", "Code generation"],
    speed: "Medium"
  },
  { 
    value: "claude-3-haiku", 
    label: "Claude 3 Haiku", 
    provider: "Anthropic",
    logo: "/lovable-uploads/3bf5853d-b8f1-4ab5-a42a-f41b6d66476d.png",
    cost: "Low",
    description: "Anthropic's fastest model, designed for rapid responses while maintaining high quality. Great for customer service and quick interactions.",
    capabilities: ["Fast responses", "Helpful assistant", "Safety focused", "Conversational"],
    speed: "Very Fast"
  },
  { 
    value: "claude-3-sonnet", 
    label: "Claude 3 Sonnet", 
    provider: "Anthropic",
    logo: "/lovable-uploads/3bf5853d-b8f1-4ab5-a42a-f41b6d66476d.png",
    cost: "Medium",
    description: "Balanced performance and capability model. Excellent for most business applications requiring reliable, thoughtful responses.",
    capabilities: ["Balanced reasoning", "Creative tasks", "Analysis", "Safety focused"],
    speed: "Fast"
  },
  { 
    value: "claude-3-opus", 
    label: "Claude 3 Opus", 
    provider: "Anthropic",
    logo: "/lovable-uploads/3bf5853d-b8f1-4ab5-a42a-f41b6d66476d.png",
    cost: "High",
    description: "Anthropic's most powerful model with exceptional reasoning and creative capabilities. Best for complex tasks requiring deep analysis.",
    capabilities: ["Superior reasoning", "Complex analysis", "Creative writing", "Advanced tasks"],
    speed: "Medium"
  },
  { 
    value: "gemini-1.5-flash", 
    label: "Gemini 1.5 Flash", 
    provider: "Google",
    logo: "/lovable-uploads/32094ea1-3b6a-4168-9818-027ea7db3eb2.png",
    cost: "Low",
    description: "Google's optimized model for speed and efficiency. Perfect for applications requiring quick responses with good quality.",
    capabilities: ["Fast processing", "Multimodal", "Code generation", "Analysis"],
    speed: "Very Fast"
  },
  { 
    value: "gemini-1.5-pro", 
    label: "Gemini 1.5 Pro", 
    provider: "Google",
    logo: "/lovable-uploads/32094ea1-3b6a-4168-9818-027ea7db3eb2.png",
    cost: "Medium",
    description: "Google's advanced model with enhanced reasoning and multimodal capabilities. Excellent for complex conversational applications.",
    capabilities: ["Advanced reasoning", "Multimodal", "Large context", "Complex tasks"],
    speed: "Fast"
  }
];
