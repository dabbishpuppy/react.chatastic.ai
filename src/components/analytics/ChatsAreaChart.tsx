
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { date: "5/6", chats: 0 },
  { date: "5/7", chats: 0.1 },
  { date: "5/8", chats: 1 },
  { date: "5/9", chats: 0.1 },
  { date: "5/10", chats: 0 },
  { date: "5/11", chats: 0 },
  { date: "5/12", chats: 0 },
];

const ChatsAreaChart: React.FC = () => {
  return (
    <Card className="mb-8 bg-white">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-6">Chats</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="chatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => value.toString()}
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
              />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="chats" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#chatGradient)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatsAreaChart;
