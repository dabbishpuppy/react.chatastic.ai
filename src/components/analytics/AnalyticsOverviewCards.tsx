
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";

interface AnalyticsCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ icon, value, label }) => {
  return (
    <Card className="flex-1">
      <CardContent className="flex items-center p-6">
        <div className="mr-4 text-muted-foreground">
          {icon}
        </div>
        <div>
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
};

const AnalyticsOverviewCards: React.FC = () => {
  // This would typically come from an API call or context
  const analyticsData = {
    totalChats: 1,
    totalMessages: 3,
    thumbsUp: 0,
    thumbsDown: 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <AnalyticsCard 
        icon={<MessageSquare size={24} />} 
        value={analyticsData.totalChats} 
        label="Total chats" 
      />
      <AnalyticsCard 
        icon={<MessageSquare size={24} />} 
        value={analyticsData.totalMessages} 
        label="Total messages" 
      />
      <AnalyticsCard 
        icon={<ThumbsUp size={24} />} 
        value={analyticsData.thumbsUp} 
        label="Messages with thumbs up" 
      />
      <AnalyticsCard 
        icon={<ThumbsDown size={24} />} 
        value={analyticsData.thumbsDown} 
        label="Messages with thumbs down" 
      />
    </div>
  );
};

export default AnalyticsOverviewCards;
