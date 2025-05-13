
import React from "react";
import AgentPageLayout from "./AgentPageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TextTab from "@/components/sources/TextTab";
import FilesTab from "@/components/sources/FilesTab";
import WebsiteTab from "@/components/sources/WebsiteTab";
import QATab from "@/components/sources/QATab";

const SourcesPage: React.FC = () => {
  return (
    <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Sources">
      <div className="p-6">
        <Tabs defaultValue="text">
          <TabsList>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="website">Website</TabsTrigger>
            <TabsTrigger value="qa">Q&A</TabsTrigger>
          </TabsList>
          <TabsContent value="text">
            <TextTab />
          </TabsContent>
          <TabsContent value="files">
            <FilesTab />
          </TabsContent>
          <TabsContent value="website">
            <WebsiteTab />
          </TabsContent>
          <TabsContent value="qa">
            <QATab />
          </TabsContent>
        </Tabs>
      </div>
    </AgentPageLayout>
  );
};

export default SourcesPage;
