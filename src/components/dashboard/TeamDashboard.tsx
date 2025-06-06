
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import TeamPerformanceOverview from "./dashboard-cards/TeamPerformanceOverview";
import AgentStatusSummary from "./dashboard-cards/AgentStatusSummary";
import RecentActivityFeed from "./dashboard-cards/RecentActivityFeed";
import { Team } from "@/types/dashboard";

interface TeamDashboardProps {
  team: Team;
  teamsList: Team[];
}

const TeamDashboard: React.FC<TeamDashboardProps> = ({ team, teamsList }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.875rem] font-bold tracking-tight">{team.name} Dashboard</h1>
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
        {/* Agent Status Summary - with white background */}
        <Card className="col-span-2 bg-white">
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
        
        {/* Recent Activity Feed - with white background */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest activity from your agents</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivityFeed teamId={team.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamDashboard;
