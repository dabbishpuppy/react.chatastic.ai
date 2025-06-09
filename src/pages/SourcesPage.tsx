
import React, { useState, useEffect } from 'react';
import AgentPageLayout from './AgentPageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useParams } from 'react-router-dom';
import EnhancedWebsiteCrawlFormV4 from '@/components/sources/websites/components/EnhancedWebsiteCrawlFormV4';
import RetrainAgentButton from '@/components/sources/RetrainAgentButton';
import SourcesList from '@/components/sources/SourcesList';

interface SourcesPageProps {
  sourceType?: string;
}

const SourcesPage: React.FC = () => {
  const { agentId } = useParams();
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    // Set active tab based on URL parameter (if provided)
    if (window.location.hash) {
      const tab = window.location.hash.substring(1);
      setActiveTab(tab);
    }
  }, []);

  return (
    <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Knowledge Sources">
      <div className="p-8 bg-[#f5f5f5] min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header with retrain button */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Knowledge Sources</h1>
              <p className="text-gray-600 mt-2">
                Manage your agent's knowledge sources. First crawl websites, then retrain the agent to create chunks.
              </p>
            </div>
            <RetrainAgentButton 
              onTrainingComplete={() => {
                // Refresh sources after training
                window.location.reload();
              }}
            />
          </div>

          {/* Source type tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="all">All Sources</TabsTrigger>
                <TabsTrigger value="websites">Websites</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-6">
              <SourcesList />
            </TabsContent>

            <TabsContent value="websites" className="space-y-6">
              <EnhancedWebsiteCrawlFormV4 />
              <SourcesList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default SourcesPage;
