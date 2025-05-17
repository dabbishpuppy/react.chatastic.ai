
import React from "react";
import { Trophy, MessageSquare, User } from "lucide-react";

interface TopPerformingAgentsProps {
  agents: Array<{
    id: string; // Changed from number to string to match Supabase UUID
    name: string;
    image: string;
    color: string;
    status: string;
    metrics: {
      conversations: number;
      responseTime: string;
      satisfaction: number;
    };
  }>;
}

const TopPerformingAgents: React.FC<TopPerformingAgentsProps> = ({ agents }) => {
  // Sort agents by satisfaction score (descending)
  const sortedAgents = [...agents].sort((a, b) => 
    b.metrics.satisfaction - a.metrics.satisfaction
  );

  return (
    <div className="space-y-6">
      {sortedAgents.map((agent, index) => (
        <div key={agent.id} className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 text-primary">
              {index === 0 ? (
                <Trophy className="h-4 w-4 text-amber-500" />
              ) : index === 1 ? (
                <Trophy className="h-4 w-4 text-gray-400" />
              ) : index === 2 ? (
                <Trophy className="h-4 w-4 text-amber-700" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${agent.color}`}></div>
                <p className="font-medium">{agent.name}</p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {agent.metrics.conversations}
                </span>
                <span>•</span>
                <span>{agent.metrics.responseTime}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold">{agent.metrics.satisfaction}%</div>
            <div className="text-xs text-muted-foreground">Satisfaction</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopPerformingAgents;
