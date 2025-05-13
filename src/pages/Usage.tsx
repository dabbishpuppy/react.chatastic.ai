
import React from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import UsageStats from "@/components/UsageStats";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const UsagePage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />
      
      {/* Sidebar + Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 p-4 hidden md:block">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="search"
                placeholder="Search team..."
                className="w-full border border-gray-200 py-2 pl-8 pr-4 rounded-md focus:outline-none"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Teams</h3>
            <div className="bg-gray-100 px-3 py-2 rounded-md flex items-center justify-between font-medium">
              <span>Wonderwave</span>
              <span>✓</span>
            </div>
          </div>

          <Button variant="outline" className="w-full flex items-center gap-2 justify-center">
            <Plus className="h-4 w-4" />
            <span>Create team</span>
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">Usage</h1>
            </div>
            <UsageStats />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsagePage;
