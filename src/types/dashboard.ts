
export interface Agent {
  id: string;
  name: string;
  image: string;
  color: string;
  status: string;
  team_id: string;
}

export interface Team {
  id: string;
  name: string;
  isActive: boolean;
  agents: Agent[];
  metrics: {
    totalConversations: number;
    avgResponseTime: string;
    usagePercent: number;
    apiCalls: number;
    satisfaction: number;
  };
}
