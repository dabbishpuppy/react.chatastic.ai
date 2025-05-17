
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Agent {
  id: string; // Changed from number to string to match Supabase UUID
  name: string;
  image: string;
  color: string;
}

interface AgentCardsProps {
  teamName: string;
  agents: Agent[];
}

const AgentCards = ({ teamName, agents }: AgentCardsProps) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{teamName}'s Agents</h1>
        <Button>New agent</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {agents.map(agent => (
          <Link to={`/agent/${agent.id}`} key={agent.id}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <div className={`h-40 ${agent.color} flex items-center justify-center`}>
                <img 
                  src={agent.image} 
                  alt={agent.name} 
                  className="w-16 h-16 object-contain" 
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium text-center truncate">{agent.name}</h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AgentCards;
