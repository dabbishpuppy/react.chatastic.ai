
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Widget/Iframe", value: 1, color: "#3b82f6" }
];

const ChatsChannelChart: React.FC = () => {
  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-6">Chats by channel</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatsChannelChart;
