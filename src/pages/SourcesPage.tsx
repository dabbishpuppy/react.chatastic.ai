
import React, { useState } from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentSidebar from "@/components/agent/AgentSidebar";
import FilesTab from "@/components/sources/FilesTab";
import TextTab from "@/components/sources/TextTab";
import QATab from "@/components/sources/QATab";
import WebsiteTab from "@/components/sources/WebsiteTab";
import { Button } from "@/components/ui/button";
import { FileText, FileUp, Link, Globe, HelpCircle, Notebook } from "lucide-react";

const SourcesPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [activeTab, setActiveTab] = useState("sources");
  const [selectedTab, setSelectedTab] = useState("files");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 border-r overflow-y-auto bg-white">
          <div className="p-6">
            <h1 className="text-2xl font-bold">Playground</h1>
          </div>
          <AgentSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">Sources</h1>

            <Tabs defaultValue="files" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="website" className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Website
                </TabsTrigger>
                <TabsTrigger value="qa" className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Q&A
                </TabsTrigger>
                <TabsTrigger value="notion" className="flex items-center gap-2">
                  <Notebook className="h-5 w-5" />
                  Notion
                </TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="space-y-4">
                <FilesTab />
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <TextTab />
              </TabsContent>

              <TabsContent value="website" className="space-y-4">
                <WebsiteTab />
              </TabsContent>

              <TabsContent value="qa" className="space-y-4">
                <QATab />
              </TabsContent>

              <TabsContent value="notion" className="space-y-4">
                <div className="p-8 text-center">
                  <Notebook className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Notion Integration</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-4">
                    Connect your Notion workspace to import pages and databases as sources.
                  </p>
                  <Button className="bg-black hover:bg-gray-800">
                    Connect Notion
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourcesPage;
