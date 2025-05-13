
import React from "react";
import AgentPageLayout from "./AgentPageLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const ActionsPage: React.FC = () => {
  return (
    <AgentPageLayout defaultActiveTab="actions" defaultPageTitle="Actions">
      <div className="p-6 bg-[#f5f5f5] overflow-hidden">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg">
          <div className="mb-6 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Plus className="h-8 w-8 text-gray-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Create your first action</h2>
          <p className="text-gray-500 mb-6 max-w-md">
            Actions allow your AI agent to interact with external tools, APIs, and services.
          </p>
          <Button>Create action</Button>
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default ActionsPage;
