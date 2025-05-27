
import React, { useState } from "react";
import AnalyticsOverviewCards from "./AnalyticsOverviewCards";
import ChatsAreaChart from "./ChatsAreaChart";
import ChatsMapChart from "./ChatsMapChart";
import DateRangePicker from "./DateRangePicker";
import ChatsChannelChart from "./ChatsChannelChart";

const AnalyticsTab: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: "2025-05-06",
    endDate: "2025-05-12"
  });

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  const clearDateRange = () => {
    setDateRange({
      startDate: "",
      endDate: ""
    });
  };

  return (
    <div className="bg-[#f5f5f5] min-h-screen p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <DateRangePicker 
          startDate={dateRange.startDate} 
          endDate={dateRange.endDate}
          onDateRangeChange={handleDateRangeChange}
          onClear={clearDateRange}
        />
      </div>

      <AnalyticsOverviewCards 
        selectedAgent="current"
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
      />
      <ChatsAreaChart />
      <ChatsChannelChart />
      <ChatsMapChart />
    </div>
  );
};

export default AnalyticsTab;
