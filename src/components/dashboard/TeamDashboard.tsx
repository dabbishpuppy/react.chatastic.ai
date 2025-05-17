import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import TeamPerformanceOverview from "./dashboard-cards/TeamPerformanceOverview";
import AgentStatusSummary from "./dashboard-cards/AgentStatusSummary";
import RecentActivityFeed from "./dashboard-cards/RecentActivityFeed";
import ResourceAllocation from "./dashboard-cards/ResourceAllocation";
import TeamComparisonChart from "./TeamComparisonChart";

interface TeamDashboardProps {
  team: {
    id: string;
    name: string;
    isActive: boolean;
    agents: any[];
    metrics: {
      totalConversations: number;
      avgResponseTime: string;
      usagePercent: number;
      apiCalls: number;
      satisfaction: number;
    };
  };
  teamsList: any[];
}

const TeamDashboard: React.FC<TeamDashboardProps> = ({ team, teamsList }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{team.name} Dashboard</h2>
          <p className="text-muted-foreground">
            Overview and performance metrics for your team.
          </p>
        </div>
      </div>
      
      {/* Team Performance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TeamPerformanceOverview metrics={team.metrics} />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Agent Status Summary */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Agent Status</CardTitle>
            <CardDescription>
              Performance metrics for individual agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentStatusSummary agents={team.agents} />
          </CardContent>
        </Card>
        
        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest activity from your agents</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivityFeed teamId={team.id} />
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Resource Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Allocation</CardTitle>
            <CardDescription>
              Current resource utilization
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResourceAllocation metrics={team.metrics} />
          </CardContent>
        </Card>
        
        {/* Team Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Team Comparison</CardTitle>
            <CardDescription>
              How your team compares to others
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  conversations: { theme: { light: "#9b87f5", dark: "#9b87f5" }, label: "Conversations" },
                  satisfaction: { theme: { light: "#10b981", dark: "#10b981" }, label: "Satisfaction" },
                  apiCalls: { theme: { light: "#f97316", dark: "#f97316" }, label: "API Calls (hundreds)" }
                }}
              >
                <TeamComparisonChart teams={teamsList} />
                <ChartTooltip />
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamDashboard;
