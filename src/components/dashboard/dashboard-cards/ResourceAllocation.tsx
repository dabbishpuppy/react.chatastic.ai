
import React from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface ResourceAllocationProps {
  metrics: {
    usagePercent: number;
    apiCalls: number;
    totalConversations: number;
  };
}

const ResourceAllocation: React.FC<ResourceAllocationProps> = ({ metrics }) => {
  const data = [
    {
      name: "CPU",
      value: metrics.usagePercent,
      fill: "#9b87f5",
    },
    {
      name: "Memory",
      value: metrics.usagePercent - 10, // Simulating different usage
      fill: "#10b981",
    },
    {
      name: "Storage",
      value: (metrics.usagePercent - 20) < 0 ? 5 : metrics.usagePercent - 20, // Prevent negative
      fill: "#f97316",
    },
    {
      name: "API Limit",
      value: (metrics.apiCalls / 200), // Scaled for visualization
      fill: "#0ea5e9",
    },
  ];

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          barSize={36}
        >
          <XAxis 
            dataKey="name" 
            scale="point" 
            padding={{ left: 10, right: 10 }} 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            formatter={(value) => [`${value}%`, "Usage"]} 
            labelStyle={{ color: "#333" }}
            contentStyle={{ 
              backgroundColor: "white", 
              border: "1px solid #e2e8f0", 
              borderRadius: "0.375rem",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          />
          <Bar dataKey="value" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ResourceAllocation;
