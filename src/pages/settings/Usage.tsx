
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageSquare, Users, Zap } from "lucide-react";

const UsageSettings = () => {
  const usageData = [
    {
      name: "Messages",
      used: 25430,
      limit: 50000,
      icon: MessageSquare,
      color: "bg-blue-500"
    },
    {
      name: "Agents",
      used: 5,
      limit: 10,
      icon: Users,
      color: "bg-green-500"
    },
    {
      name: "API Calls",
      used: 12850,
      limit: 100000,
      icon: Zap,
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-2xl font-bold mb-6">Usage & Limits</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {usageData.map((item) => {
          const percentage = (item.used / item.limit) * 100;
          const Icon = item.icon;
          
          return (
            <Card key={item.name}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className={`p-2 rounded-lg ${item.color} text-white`}>
                    <Icon size={16} />
                  </div>
                  {item.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">{item.used.toLocaleString()}</span>
                    <Badge variant={percentage > 80 ? "destructive" : "secondary"}>
                      {percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-sm text-gray-500">
                    of {item.limit.toLocaleString()} limit
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={20} />
            Usage History
          </CardTitle>
          <CardDescription>
            Track your usage over the past 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">Current Period</span>
              <span className="text-green-600 font-medium">Mar 1 - Mar 31, 2024</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">25,430</p>
                <p className="text-sm text-gray-500">Messages Sent</p>
              </div>
              <div>
                <p className="text-2xl font-bold">12,850</p>
                <p className="text-sm text-gray-500">API Calls</p>
              </div>
              <div>
                <p className="text-2xl font-bold">98.5%</p>
                <p className="text-sm text-gray-500">Uptime</p>
              </div>
              <div>
                <p className="text-2xl font-bold">1.2s</p>
                <p className="text-sm text-gray-500">Avg Response</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageSettings;
