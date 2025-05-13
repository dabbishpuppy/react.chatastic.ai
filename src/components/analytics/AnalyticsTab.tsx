
import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnalyticsOverviewCards from "./AnalyticsOverviewCards";
import ChatsAreaChart from "./ChatsAreaChart";
import ChatsMapChart from "./ChatsMapChart";
import ChatsChannelChart from "./ChatsChannelChart";
import TopPagesCard from "./TopPagesCard";
import DateRangePicker from "./DateRangePicker";

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
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Select 
            value={selectedAgent} 
            onValueChange={setSelectedAgent}
          >
            <SelectTrigger className="sm:w-[180px]">
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
      <ChatsMapChart />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <TopPagesCard />
        <ChatsChannelChart />
      </div>
    </div>
  );
};

export default AnalyticsTab;
