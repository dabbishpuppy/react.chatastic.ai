
import React from "react";
import { LineChart } from "lucide-react";
import UsageStats from "@/components/UsageStats";

const UsageSettings = () => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-6">
        <LineChart className="h-5 w-5 text-gray-500" />
        <h2 className="text-2xl font-bold">Usage</h2>
      </div>
      
      <UsageStats />
    </div>
  );
};

export default UsageSettings;
