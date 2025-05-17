
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeCheck, MessageSquare, Clock, ZapIcon, ThumbsUp } from "lucide-react";

interface TeamPerformanceOverviewProps {
  metrics: {
    totalConversations: number;
    avgResponseTime: string;
    usagePercent: number;
    apiCalls: number;
    satisfaction: number;
  };
}

const TeamPerformanceOverview: React.FC<TeamPerformanceOverviewProps> = ({ metrics }) => {
  const items = [
    {
      title: "Conversations",
      value: metrics.totalConversations,
      icon: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
      description: "Total handled"
    },
    {
      title: "Avg. Response",
      value: metrics.avgResponseTime,
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      description: "Response time"
    },
    {
      title: "Usage",
      value: `${metrics.usagePercent}%`,
      icon: <ZapIcon className="h-4 w-4 text-muted-foreground" />,
      description: "Of quota used"
    },
    {
      title: "Satisfaction",
      value: `${metrics.satisfaction}%`,
      icon: <ThumbsUp className="h-4 w-4 text-muted-foreground" />,
      description: "User rating"
    },
  ];

  return (
    <>
      {items.map((item) => (
        <Card key={item.title} className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                {item.icon}
                <span className="text-sm font-medium">{item.title}</span>
              </div>
              {item.value === `${metrics.satisfaction}%` && metrics.satisfaction >= 90 && (
                <BadgeCheck className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold">
                {item.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export default TeamPerformanceOverview;
