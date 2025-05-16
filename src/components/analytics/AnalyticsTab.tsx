
import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnalyticsOverviewCards from "./AnalyticsOverviewCards";
import ChatsAreaChart from "./ChatsAreaChart";
import ChatsMapChart from "./ChatsMapChart";
import DateRangePicker from "./DateRangePicker";
import ChatsChannelChart from "./ChatsChannelChart";

const AnalyticsTab: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [dateRange, setDateRange] = useState({
    startDate: "2025-05-06",
    endDate: "2025-05-12"
  });

  const clearDateRange = () => {
    // In a real app, you would reset to default dates or remove the filter
    console.log("Clear date range");
  };

  return (
    <div className="bg-[#f5f5f5] min-h-screen p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="flex gap-4">
          <Select 
            value={selectedAgent} 
            onValueChange={setSelectedAgent}
          >
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Select agent" />
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
          
          <DateRangePicker 
            startDate={dateRange.startDate} 
            endDate={dateRange.endDate}
            onClear={clearDateRange}
          />
        </div>
      </div>

      <AnalyticsOverviewCards />
      <ChatsAreaChart />
      <ChatsChannelChart />
      <ChatsMapChart />
    </div>
  );
};

export default AnalyticsTab;
