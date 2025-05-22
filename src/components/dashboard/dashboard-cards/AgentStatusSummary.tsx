
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Agent } from "@/types/dashboard";

interface AgentStatusSummaryProps {
  agents: Agent[];
}

const AgentStatusSummary: React.FC<AgentStatusSummaryProps> = ({ agents }) => {
  // Default values for missing metrics
  const defaultMetrics = {
    conversations: 0,
    responseTime: "0.0s",
    satisfaction: 0
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Conversations</TableHead>
          <TableHead>Response Time</TableHead>
          <TableHead>Satisfaction</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => {
          // Use optional chaining and provide default metrics if not available
          const metrics = {
            conversations: 0,
            responseTime: "0.0s",
            satisfaction: 0
          };

          return (
            <TableRow key={agent.id}>
              <TableCell className="font-medium">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${agent.color}`}></div>
                  {agent.name}
                </div>
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  agent.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {agent.status || 'inactive'}
                </span>
              </TableCell>
              <TableCell>{metrics.conversations}</TableCell>
              <TableCell>{metrics.responseTime}</TableCell>
              <TableCell className="w-[100px]">
                <div className="flex items-center">
                  <Progress
                    value={metrics.satisfaction}
                    className="h-2 mr-2"
                  />
                  <span className="text-xs font-medium">
                    {metrics.satisfaction}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default AgentStatusSummary;
