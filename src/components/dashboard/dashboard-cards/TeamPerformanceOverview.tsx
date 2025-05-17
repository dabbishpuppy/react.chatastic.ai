
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, BarChart2, Activity } from "lucide-react";

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
  const cards = [
    {
      title: "Total Conversations",
      value: metrics.totalConversations.toLocaleString(),
      description: "Conversations this month",
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
      change: "+12%",
      trend: "up"
    },
    {
      title: "Avg Response Time",
      value: metrics.avgResponseTime,
      description: "Response latency",
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      change: "-0.2s",
      trend: "down"
    },
    {
      title: "Satisfaction",
      value: `${metrics.satisfaction}%`,
      description: "User satisfaction",
      icon: <Activity className="h-4 w-4 text-muted-foreground" />,
      change: "+2%",
      trend: "up"
    },
    {
      title: "API Calls",
      value: metrics.apiCalls.toLocaleString(),
      description: "This month",
      icon: <BarChart2 className="h-4 w-4 text-muted-foreground" />,
      change: "+8%",
      trend: "up"
    }
  ];

  return (
    <>
      {cards.map((card, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
            <div className="mt-2 flex items-center text-xs">
              <span className={`mr-1 ${card.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {card.change}
              </span>
              <span className="text-muted-foreground">from last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export default TeamPerformanceOverview;
