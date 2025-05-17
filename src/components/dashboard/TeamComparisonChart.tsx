
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

interface TeamComparisonChartProps {
  teams: Array<{
    name: string;
    metrics: {
      totalConversations: number;
      satisfaction: number;
      apiCalls: number;
    }
  }>;
}

const TeamComparisonChart: React.FC<TeamComparisonChartProps> = ({ teams }) => {
  const data = teams.map(team => ({
    name: team.name,
    conversations: team.metrics.totalConversations,
    satisfaction: team.metrics.satisfaction,
    apiCalls: Math.round(team.metrics.apiCalls / 100) // Scale down for better visualization
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" />
        <YAxis yAxisId="left" orientation="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Legend />
        <Bar yAxisId="left" dataKey="conversations" name="Conversations" fill="#9b87f5" />
        <Bar yAxisId="left" dataKey="satisfaction" name="Satisfaction %" fill="#10b981" />
        <Bar yAxisId="left" dataKey="apiCalls" name="API Calls (hundreds)" fill="#f97316" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TeamComparisonChart;
