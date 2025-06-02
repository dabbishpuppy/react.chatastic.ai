
import { useState, useCallback, useEffect } from 'react';
import { 
  RAGRetrainingService, 
  type RetrainingConfig, 
  type RetrainingProgress 
} from '@/services/rag/management/ragRetrainingService';
import { 
  RAGModelManagement, 
  type ModelVersion, 
  type ModelComparisonResult 
} from '@/services/rag/management/ragModelManagement';
import { 
  RAGAgentLifecycle, 
  type AgentHealth, 
  type MaintenanceTask,
  type AgentLifecycleStage
} from '@/services/rag/management/ragAgentLifecycle';

export const useRAGManagement = (agentId: string) => {
  // Retraining state
  const [retrainingConfig, setRetrainingConfig] = useState<RetrainingConfig | null>(null);
  const [activeJobs, setActiveJobs] = useState<RetrainingProgress[]>([]);
  const [retrainingNeeded, setRetrainingNeeded] = useState<{
    shouldRetrain: boolean;
    reasons: string[];
    urgency: 'low' | 'medium' | 'high';
  } | null>(null);

  // Model management state
  const [modelVersions, setModelVersions] = useState<Record<string, ModelVersion[]>>({});
  const [activeModels, setActiveModels] = useState<Record<string, ModelVersion>>({});
  const [modelComparisons, setModelComparisons] = useState<ModelComparisonResult[]>([]);

  // Lifecycle state
  const [agentHealth, setAgentHealth] = useState<AgentHealth | null>(null);
  const [currentStage, setCurrentStage] = useState<AgentLifecycleStage | null>(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);

  // Loading states
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isStartingRetraining, setIsStartingRetraining] = useState(false);
  const [isExecutingTask, setIsExecutingTask] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Retraining functions
  const configureRetraining = useCallback((config: RetrainingConfig) => {
    try {
      RAGRetrainingService.configureRetraining(config);
      setRetrainingConfig(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to configure retraining';
      setError(errorMessage);
    }
  }, []);

  const checkRetrainingNeeded = useCallback(async () => {
    try {
      const result = await RAGRetrainingService.shouldRetrain(agentId);
      setRetrainingNeeded(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check retraining needs';
      setError(errorMessage);
      return null;
    }
  }, [agentId]);

  const startRetraining = useCallback(async (options?: {
    force?: boolean;
    incrementalOnly?: boolean;
  }) => {
    setIsStartingRetraining(true);
    setError(null);

    try {
      const jobId = await RAGRetrainingService.startRetraining(agentId, options);
      
      // Refresh active jobs
      const jobs = RAGRetrainingService.getActiveJobs();
      setActiveJobs(jobs);
      
      return jobId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start retraining';
      setError(errorMessage);
      throw error;
    } finally {
      setIsStartingRetraining(false);
    }
  }, [agentId]);

  const getRetrainingProgress = useCallback((jobId: string) => {
    return RAGRetrainingService.getRetrainingProgress(jobId);
  }, []);

  const cancelRetraining = useCallback(async (jobId: string) => {
    try {
      const success = await RAGRetrainingService.cancelRetraining(jobId);
      if (success) {
        // Refresh active jobs
        const jobs = RAGRetrainingService.getActiveJobs();
        setActiveJobs(jobs);
      }
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel retraining';
      setError(errorMessage);
      return false;
    }
  }, []);

  // Model management functions
  const loadModelVersions = useCallback(() => {
    try {
      const modelTypes = ['embedding', 'llm', 'reranker'];
      const versions: Record<string, ModelVersion[]> = {};
      const active: Record<string, ModelVersion> = {};

      for (const type of modelTypes) {
        versions[type] = RAGModelManagement.getModelVersions(agentId, type);
        const activeModel = RAGModelManagement.getActiveModel(agentId, type);
        if (activeModel) {
          active[type] = activeModel;
        }
      }

      setModelVersions(versions);
      setActiveModels(active);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load model versions';
      setError(errorMessage);
    }
  }, [agentId]);

  const setActiveModel = useCallback((modelVersion: ModelVersion) => {
    try {
      RAGModelManagement.setActiveModel(agentId, modelVersion);
      loadModelVersions(); // Refresh
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set active model';
      setError(errorMessage);
    }
  }, [agentId, loadModelVersions]);

  const compareModels = useCallback((modelA: ModelVersion, modelB: ModelVersion) => {
    try {
      const comparison = RAGModelManagement.compareModels(modelA, modelB);
      setModelComparisons(prev => [...prev, comparison]);
      return comparison;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to compare models';
      setError(errorMessage);
      return null;
    }
  }, []);

  const autoSelectBestModel = useCallback((modelType: string) => {
    try {
      const bestModel = RAGModelManagement.autoSelectBestModel(agentId, modelType);
      if (bestModel) {
        setActiveModel(bestModel);
      }
      return bestModel;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to auto-select best model';
      setError(errorMessage);
      return null;
    }
  }, [agentId, setActiveModel]);

  // Lifecycle functions
  const performHealthCheck = useCallback(async () => {
    setIsCheckingHealth(true);
    setError(null);

    try {
      const health = await RAGAgentLifecycle.performHealthCheck(agentId);
      setAgentHealth(health);
      return health;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to perform health check';
      setError(errorMessage);
      throw error;
    } finally {
      setIsCheckingHealth(false);
    }
  }, [agentId]);

  const setLifecycleStage = useCallback((stage: AgentLifecycleStage['stage'], metadata?: Record<string, any>) => {
    try {
      RAGAgentLifecycle.setLifecycleStage(agentId, stage, metadata);
      const newStage = RAGAgentLifecycle.getCurrentStage(agentId);
      setCurrentStage(newStage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set lifecycle stage';
      setError(errorMessage);
    }
  }, [agentId]);

  const scheduleMaintenanceTask = useCallback((task: Omit<MaintenanceTask, 'id'>) => {
    try {
      const taskId = RAGAgentLifecycle.scheduleMaintenanceTask({
        ...task,
        agentId
      });
      
      // Refresh tasks
      const tasks = RAGAgentLifecycle.getPendingTasks(agentId);
      setMaintenanceTasks(tasks);
      
      return taskId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to schedule maintenance task';
      setError(errorMessage);
      return null;
    }
  }, [agentId]);

  const executeMaintenanceTask = useCallback(async (taskId: string) => {
    setIsExecutingTask(true);
    setError(null);

    try {
      const success = await RAGAgentLifecycle.executeMaintenanceTask(taskId);
      
      if (success) {
        // Refresh tasks
        const tasks = RAGAgentLifecycle.getPendingTasks(agentId);
        setMaintenanceTasks(tasks);
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute maintenance task';
      setError(errorMessage);
      return false;
    } finally {
      setIsExecutingTask(false);
    }
  }, [agentId]);

  const autoScheduleMaintenance = useCallback(() => {
    try {
      const scheduledTasks = RAGAgentLifecycle.autoScheduleMaintenance(agentId);
      
      // Refresh tasks
      const tasks = RAGAgentLifecycle.getPendingTasks(agentId);
      setMaintenanceTasks(tasks);
      
      return scheduledTasks;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to auto-schedule maintenance';
      setError(errorMessage);
      return [];
    }
  }, [agentId]);

  // Initialize and load data
  useEffect(() => {
    loadModelVersions();
    
    // Load current stage
    const stage = RAGAgentLifecycle.getCurrentStage(agentId);
    setCurrentStage(stage);
    
    // Load pending tasks
    const tasks = RAGAgentLifecycle.getPendingTasks(agentId);
    setMaintenanceTasks(tasks);
    
    // Load active jobs
    const jobs = RAGRetrainingService.getActiveJobs();
    setActiveJobs(jobs.filter(job => job.agentId === agentId));
  }, [agentId, loadModelVersions]);

  // Periodic updates for active jobs
  useEffect(() => {
    if (activeJobs.length === 0) return;

    const interval = setInterval(() => {
      const jobs = RAGRetrainingService.getActiveJobs();
      setActiveJobs(jobs.filter(job => job.agentId === agentId));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [agentId, activeJobs.length]);

  return {
    // Retraining
    retrainingConfig,
    retrainingNeeded,
    activeJobs,
    configureRetraining,
    checkRetrainingNeeded,
    startRetraining,
    getRetrainingProgress,
    cancelRetraining,
    isStartingRetraining,

    // Model management
    modelVersions,
    activeModels,
    modelComparisons,
    loadModelVersions,
    setActiveModel,
    compareModels,
    autoSelectBestModel,

    // Lifecycle
    agentHealth,
    currentStage,
    maintenanceTasks,
    performHealthCheck,
    setLifecycleStage,
    scheduleMaintenanceTask,
    executeMaintenanceTask,
    autoScheduleMaintenance,
    isCheckingHealth,
    isExecutingTask,

    // Common
    error,
    clearError
  };
};

export default useRAGManagement;
