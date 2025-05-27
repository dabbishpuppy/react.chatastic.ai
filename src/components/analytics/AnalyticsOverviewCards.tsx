
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { useParams } from "react-router-dom";

interface AnalyticsCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  isLoading?: boolean;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ icon, value, label, isLoading }) => {
  return (
    <Card className="flex-1 bg-white">
      <CardContent className="flex items-center p-6">
        <div className="mr-4 text-muted-foreground">
          {icon}
        </div>
        <div>
          <div className="text-3xl font-bold">
            {isLoading ? "..." : value}
          </div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
};

interface AnalyticsOverviewCardsProps {
  selectedAgent: string;
  startDate?: string;
  endDate?: string;
}

const AnalyticsOverviewCards: React.FC<AnalyticsOverviewCardsProps> = ({ 
  selectedAgent, 
  startDate, 
  endDate 
}) => {
  const { agentId } = useParams();
  
  console.log('📊 AnalyticsOverviewCards props:', { selectedAgent, agentId, startDate, endDate });
  
  // Use the current agent from URL if "all" is selected, otherwise use the selected agent
  const targetAgentId = selectedAgent === "all" ? agentId : selectedAgent;
  
  console.log('📊 Target agent ID for analytics:', targetAgentId);
  
  const { analyticsData, isLoading } = useAnalyticsData(
    targetAgentId || "",
    startDate,
    endDate
  );

  console.log('📊 Analytics data in component:', analyticsData);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <AnalyticsCard 
        icon={<MessageSquare size={24} />} 
        value={analyticsData.totalChats} 
        label="Total chats"
        isLoading={isLoading}
      />
      <AnalyticsCard 
        icon={<MessageSquare size={24} />} 
        value={analyticsData.totalMessages} 
        label="Total messages"
        isLoading={isLoading}
      />
      <AnalyticsCard 
        icon={<ThumbsUp size={24} />} 
        value={analyticsData.thumbsUp} 
        label="Messages with thumbs up"
        isLoading={isLoading}
      />
      <AnalyticsCard 
        icon={<ThumbsDown size={24} />} 
        value={analyticsData.thumbsDown} 
        label="Messages with thumbs down"
        isLoading={isLoading}
      />
    </div>
  );
};

export default AnalyticsOverviewCards;
