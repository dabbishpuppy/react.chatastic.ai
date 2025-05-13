
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Calendar, ChartBar, CircleX } from "lucide-react";

// Sample data for the charts
const usageHistoryData = [
  { day: "May 1", value: 0 },
  { day: "May 2", value: 0 },
  { day: "May 3", value: 0 },
  { day: "May 4", value: 0 },
  { day: "May 5", value: 0 },
  { day: "May 6", value: 0 },
  { day: "May 7", value: 10 },
  { day: "May 8", value: 3 },
  { day: "May 9", value: 0 },
  { day: "May 10", value: 0 },
  { day: "May 11", value: 0 },
  { day: "May 12", value: 0 },
  { day: "May 13", value: 0 },
];

const creditsByAgentData = [
  { name: "AI Kundeservice", value: 9, color: "#AF8CFF" },
  { name: "Agora AI", value: 1, color: "#3B82F6" },
  { name: "Wonder AI", value: 0, color: "#22C55E" },
  { name: "PristineBag AI", value: 0, color: "#F87171" },
  { name: "theballooncompany.com", value: 0, color: "#FAC858" },
];

const UsageStats = () => {
  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Usage</h1>
        <div className="flex gap-4">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              <SelectItem value="ai-kundeservice">AI Kundeservice</SelectItem>
              <SelectItem value="agora-ai">Agora AI</SelectItem>
              <SelectItem value="wonder-ai">Wonder AI</SelectItem>
              <SelectItem value="pristinebag-ai">PristineBag AI</SelectItem>
              <SelectItem value="ballooncompany">theballooncompany.com</SelectItem>
            </SelectContent>
          </Select>
          
          <button className="flex items-center gap-2 px-4 py-2 rounded border bg-background hover:bg-accent/50 transition-colors">
            <Calendar className="h-4 w-4" />
            <span>2025-05-01 ~ 2025-05-13</span>
            <CircleX className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Usage metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Credits used */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-gray-100 flex items-center justify-center">
                <span className="text-gray-400">⟳</span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">10</span>
                  <span className="text-gray-500">/ 2100</span>
                </div>
                <p className="text-muted-foreground">Credits used</p>
              </div>
            </div>
            <Progress className="h-1.5 mt-4" value={0.5} />
          </CardContent>
        </Card>
        
        {/* Agents used */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-blue-500 flex items-center justify-center">
                <span className="text-blue-500">⟳</span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">5</span>
                  <span className="text-gray-500">/ 2</span>
                </div>
                <p className="text-muted-foreground">Agents used</p>
              </div>
            </div>
            <Progress className="h-1.5 mt-4" value={100} />
          </CardContent>
        </Card>
      </div>

      {/* Usage history */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-6">Usage history</h2>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageHistoryData}>
                <CartesianGrid vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border rounded shadow-md">
                          <p className="font-medium">{payload[0].value} credits</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="#3B82F6" barSize={20} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Credits used per agent */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-6">Credits used per agent</h2>
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={creditsByAgentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {creditsByAgentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border rounded shadow-md">
                            <p className="font-medium">{payload[0].name}: {payload[0].value} credits</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2">
              <ul className="space-y-3">
                {creditsByAgentData.map((agent, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: agent.color }}
                      ></div>
                      <span>{agent.name}</span>
                    </div>
                    <span className="font-medium">{agent.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageStats;
