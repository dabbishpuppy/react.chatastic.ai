
import React, { useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import SourcesPageLayout from "@/components/sources/SourcesPageLayout";
import SourcesMainContent from "@/components/sources/SourcesMainContent";
import { useTabNavigation } from "@/components/sources/hooks/useTabNavigation";
import { useWorkflowSystem } from "@/hooks/useWorkflowSystem";
import { useWorkflowRealtime } from "@/hooks/useWorkflowRealtime";
import { CrawlSystemManager } from "@/services/rag/enhanced/crawlSystemManager";
import { JobRecoveryService } from "@/services/rag/enhanced/jobRecoveryService";
import { JobAutomationService } from "@/services/rag/enhanced/jobAutomationService";

const SourcesPage: React.FC = () => {
  const { getTabTitle } = useTabNavigation();
  const { isInitialized, isInitializing, error } = useWorkflowSystem();
  
  // Enable workflow real-time updates
  useWorkflowRealtime();

  useEffect(() => {
    let isComponentMounted = true;

    const initializeEnhancedCrawlSystem = async () => {
      try {
        console.log('🚀 Initializing enhanced crawl system with resilience...');
        
        // Initialize the enhanced crawl system with job synchronization
        await CrawlSystemManager.initialize();
        
        // Perform initial recovery of stuck jobs
        if (isComponentMounted) {
          console.log('🔧 Running initial job recovery...');
          await JobRecoveryService.recoverStalledJobs();
        }
        
        // Start automated job recovery and monitoring
        if (isComponentMounted) {
          console.log('🤖 Starting job automation service...');
          JobAutomationService.startAutomation();
        }
        
        if (isComponentMounted) {
          console.log('✅ Enhanced crawl system with resilience initialized successfully');
        }
      } catch (error) {
        console.error('❌ Failed to initialize enhanced crawl system:', error);
      }
    };

    if (isInitialized && !isInitializing) {
      initializeEnhancedCrawlSystem();
    }

    // Cleanup function
    return () => {
      isComponentMounted = false;
      JobAutomationService.stopAutomation();
      CrawlSystemManager.shutdown();
    };
  }, [isInitialized, isInitializing]);

  if (error) {
    console.error('❌ Workflow system error:', error);
  }

  return (
    <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Sources" showPageTitle={false}>
      <SourcesPageLayout title={getTabTitle()}>
        <SourcesMainContent />
      </SourcesPageLayout>
    </AgentPageLayout>
  );
};

export default SourcesPage;
