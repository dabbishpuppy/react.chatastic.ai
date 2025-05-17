import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DollarSign, User, LogOut } from "lucide-react";
import AgentSidebarMenu from "./sidebar/AgentSidebarMenu";
import SidebarActions from "../dashboard/SidebarActions";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Sample agent data structure - in a real implementation, this would come from a data store or API
const agentsData = [
  {
    id: "1",
    name: "Wonder AI",
    color: "bg-violet-600",
  },
  {
    id: "2",
    name: "Agora AI",
    color: "bg-amber-100",
  },
  {
    id: "3",
    name: "PristineBag AI",
    color: "bg-rose-400",
  },
  {
    id: "4",
    name: "AI Kundeservice",
    color: "bg-black",
  },
  {
    id: "5",
    name: "theballooncompany.com",
    color: "bg-white",
  }
];

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentAgent, setCurrentAgent] = useState<{id: string, name: string, color: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Find the current agent based on the URL parameter
  useEffect(() => {
    const fetchAgent = async () => {
      if (!agentId) return;
      
      setIsLoading(true);
      
      try {
        // First check the sample data for quick development
        const sampleAgent = agentsData.find(agent => agent.id === agentId);
        if (sampleAgent) {
          setCurrentAgent(sampleAgent);
          setIsLoading(false);
          return;
        }
        
        // Otherwise fetch from Supabase
        const { data, error } = await supabase
          .from('agents')
          .select('id, name, color')
          .eq('id', agentId)
          .single();
          
        if (error) {
          console.error('Error fetching agent:', error);
          toast({
            title: 'Error',
            description: 'Could not load agent information',
            variant: 'destructive'
          });
          return;
        }
        
        if (data) {
          setCurrentAgent(data);
        }
      } catch (err) {
        console.error('Exception fetching agent:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAgent();
  }, [agentId, toast]);

  return (
    <div className="flex flex-col h-full">
      {/* Agent header section */}
      {isLoading ? (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 h-7">
            <div className="w-4 h-4 bg-gray-200 rounded-sm animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      ) : currentAgent ? (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-4 h-4 ${currentAgent.color} rounded-sm flex-shrink-0`}></div>
            <span className="font-medium truncate">{currentAgent.name}</span>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200">
          <div className="text-sm text-red-500">Agent not found</div>
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto mt-1" 
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </div>
      )}
      
      <AgentSidebarMenu activeTab={activeTab} onTabChange={onTabChange} />
      <SidebarActions />
    </div>
  );
};

export default AgentSidebar;
