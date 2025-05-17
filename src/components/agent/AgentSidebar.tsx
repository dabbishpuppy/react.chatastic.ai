
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import AgentSidebarMenu from "./sidebar/AgentSidebarMenu";
import SidebarActions from "../dashboard/SidebarActions";
import { useTeamsAndAgents, Agent } from "@/hooks/useTeamsAndAgents";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { teamsData } = useTeamsAndAgents();
  
  // Fetch agent data directly from Supabase
  useEffect(() => {
    const fetchAgentData = async () => {
      if (!agentId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        // First check if the agent is already in the teamsData
        for (const team of teamsData) {
          const foundAgent = team.agents.find(agent => agent.id.toString() === agentId);
          if (foundAgent) {
            setCurrentAgent(foundAgent);
            setIsLoading(false);
            return;
          }
        }
        
        // If not found in teamsData, fetch directly from Supabase
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .single();
          
        if (error) {
          console.error("Error fetching agent:", error);
          toast({
            title: "Error",
            description: "Failed to load agent data. Please try again.",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }
        
        if (data) {
          // Transform to match the Agent interface
          const agent: Agent = {
            id: data.id,
            name: data.name,
            image: data.image || "/placeholder.svg",
            color: data.color,
            status: data.status || "active",
            metrics: {
              conversations: data.conversations || 0,
              responseTime: data.response_time || "0.0s",
              satisfaction: data.satisfaction || 0,
            },
          };
          
          setCurrentAgent(agent);
        }
      } catch (err) {
        console.error("Error in fetching agent data:", err);
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAgentData();
  }, [agentId, teamsData, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading agent data...</p>
      </div>
    );
  }

  if (!currentAgent) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">Agent not found</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Agent header section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-4 h-4 ${currentAgent.color} rounded-sm flex-shrink-0`}></div>
          <span className="font-medium truncate">{currentAgent.name}</span>
        </div>
      </div>
      
      <AgentSidebarMenu activeTab={activeTab} onTabChange={onTabChange} />
      <SidebarActions />
    </div>
  );
};

export default AgentSidebar;
