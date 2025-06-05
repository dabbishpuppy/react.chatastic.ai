
import React, { useState } from "react";
import WebsiteSourcesList from "../components/WebsiteSourcesList";
import EnhancedWebsiteCrawlFormV3 from "../components/EnhancedWebsiteCrawlFormV3";
import TrainingProgressModal from "../components/TrainingProgressModal";
import { useWebsiteSourceOperations } from "../hooks/useWebsiteSourceOperations";
import { useTrainingNotificationsSimplified } from "@/hooks/useTrainingNotificationsSimplified";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

const WebsiteTabContainer: React.FC = () => {
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  
  const handleRefetch = () => {
    console.log('Refetch triggered');
  };
  
  const handleRemoveFromState = (sourceId: string) => {
    console.log('Remove from state:', sourceId);
  };

  const {
    handleEdit,
    handleExclude,
    handleDelete,
    handleRecrawl
  } = useWebsiteSourceOperations(handleRefetch, handleRemoveFromState);

  const { trainingProgress, startTraining, isConnected } = useTrainingNotificationsSimplified();

  // Handle crawl completion - automatically start training
  const handleCrawlCompleted = async (parentSourceId: string) => {
    console.log('🎉 Crawl completed, starting training for:', parentSourceId);
    
    // Start training and open progress modal
    const sessionId = await startTraining();
    if (sessionId) {
      setIsTrainingModalOpen(true);
    }
  };

  // Handle manual training start
  const handleStartTraining = async () => {
    const sessionId = await startTraining();
    if (sessionId) {
      setIsTrainingModalOpen(true);
    }
  };

  // Close training modal
  const handleCloseTrainingModal = () => {
    setIsTrainingModalOpen(false);
  };

  return (
    <div className="space-y-6 mt-4">
      <EnhancedWebsiteCrawlFormV3 
        onCrawlStarted={(parentSourceId) => {
          console.log('Crawl started for:', parentSourceId);
        }}
        onCrawlCompleted={handleCrawlCompleted}
      />
      
      {/* Manual Training Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleStartTraining}
          className="flex items-center gap-2"
          disabled={!isConnected}
        >
          <GraduationCap className="h-4 w-4" />
          Start Training
        </Button>
      </div>
      
      <WebsiteSourcesList
        onEdit={handleEdit}
        onExclude={handleExclude}
        onDelete={handleDelete}
        onRecrawl={handleRecrawl}
        loading={false}
        error={null}
      />

      {/* Training Progress Modal */}
      <TrainingProgressModal
        isOpen={isTrainingModalOpen}
        onClose={handleCloseTrainingModal}
        progress={trainingProgress}
      />
    </div>
  );
};

export default WebsiteTabContainer;
