
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface AgentStatusSummaryProps {
  agents: Array<{
    id: number;
    name: string;
    image: string;
    color: string;
    status: string;
    metrics: {
      conversations: number;
      responseTime: string;
      satisfaction: number;
    };
  }>;
}

const AgentStatusSummary: React.FC<AgentStatusSummaryProps> = ({ agents }) => {
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
        {agents.map((agent) => (
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
                {agent.status}
              </span>
            </TableCell>
            <TableCell>{agent.metrics.conversations}</TableCell>
            <TableCell>{agent.metrics.responseTime}</TableCell>
            <TableCell className="w-[100px]">
              <div className="flex items-center">
                <Progress
                  value={agent.metrics.satisfaction}
                  className="h-2 mr-2"
                />
                <span className="text-xs font-medium">
                  {agent.metrics.satisfaction}%
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default AgentStatusSummary;
