import { RAGRetrainingService } from './ragRetrainingService';
import { RAGModelManagement } from './ragModelManagement';
import { PerformanceMonitor } from '../performance/performanceMonitor';

export interface AgentHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    knowledge: 'healthy' | 'warning' | 'critical';
    models: 'healthy' | 'warning' | 'critical';
    performance: 'healthy' | 'warning' | 'critical';
    infrastructure: 'healthy' | 'warning' | 'critical';
  };
  issues: string[];
  recommendations: string[];
  lastChecked: string;
}

export interface MaintenanceTask {
  id: string;
  agentId: string;
  type: 'retraining' | 'model_update' | 'knowledge_refresh' | 'performance_optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedDuration: number; // minutes
  scheduledFor?: string;
  completedAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface AgentLifecycleStage {
  stage: 'development' | 'training' | 'validation' | 'production' | 'maintenance' | 'deprecated';
  enteredAt: string;
  metadata: Record<string, any>;
}

export class RAGAgentLifecycle {
  private static lifecycleStages = new Map<string, AgentLifecycleStage[]>();
  private static maintenanceTasks = new Map<string, MaintenanceTask[]>();
  private static healthChecks = new Map<string, AgentHealth>();

  // Track agent lifecycle stage
  static setLifecycleStage(agentId: string, stage: AgentLifecycleStage['stage'], metadata?: Record<string, any>): void {
    const stages = this.lifecycleStages.get(agentId) || [];
    
    const newStage: AgentLifecycleStage = {
      stage,
      enteredAt: new Date().toISOString(),
      metadata: metadata || {}
    };

    stages.push(newStage);
    this.lifecycleStages.set(agentId, stages);

    console.log('🔄 Agent lifecycle stage updated:', {
      agentId,
      stage,
      previousStage: stages[stages.length - 2]?.stage
    });
  }

  // Get current lifecycle stage
  static getCurrentStage(agentId: string): AgentLifecycleStage | null {
    const stages = this.lifecycleStages.get(agentId);
    return stages && stages.length > 0 ? stages[stages.length - 1] : null;
  }

  // Perform comprehensive health check
  static async performHealthCheck(agentId: string): Promise<AgentHealth> {
    console.log('🏥 Performing health check for agent:', agentId);

    const issues: string[] = [];
    const recommendations: string[] = [];
    let components = {
      knowledge: 'healthy' as 'healthy' | 'warning' | 'critical',
      models: 'healthy' as 'healthy' | 'warning' | 'critical',
      performance: 'healthy' as 'healthy' | 'warning' | 'critical',
      infrastructure: 'healthy' as 'healthy' | 'warning' | 'critical'
    };

    try {
      // Check knowledge base health
      const knowledgeHealth = await this.checkKnowledgeHealth(agentId);
      components.knowledge = knowledgeHealth.status;
      issues.push(...knowledgeHealth.issues);
      recommendations.push(...knowledgeHealth.recommendations);

      // Check model health
      const modelHealth = this.checkModelHealth(agentId);
      components.models = modelHealth.status;
      issues.push(...modelHealth.issues);
      recommendations.push(...modelHealth.recommendations);

      // Check performance health
      const performanceHealth = this.checkPerformanceHealth(agentId);
      components.performance = performanceHealth.status;
      issues.push(...performanceHealth.issues);
      recommendations.push(...performanceHealth.recommendations);

      // Check infrastructure health
      const infraHealth = this.checkInfrastructureHealth(agentId);
      components.infrastructure = infraHealth.status;
      issues.push(...infraHealth.issues);
      recommendations.push(...infraHealth.recommendations);

      // Determine overall health
      const componentValues = Object.values(components);
      const criticalCount = componentValues.filter(c => c === 'critical').length;
      const warningCount = componentValues.filter(c => c === 'warning').length;

      let overall: AgentHealth['overall'] = 'healthy';
      if (criticalCount > 0) {
        overall = 'critical';
      } else if (warningCount > 0) {
        overall = 'warning';
      }

      const health: AgentHealth = {
        overall,
        components,
        issues,
        recommendations,
        lastChecked: new Date().toISOString()
      };

      this.healthChecks.set(agentId, health);
      return health;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      
      const errorHealth: AgentHealth = {
        overall: 'critical',
        components: {
          knowledge: 'critical',
          models: 'critical',
          performance: 'critical',
          infrastructure: 'critical'
        },
        issues: ['Health check failed'],
        recommendations: ['Review agent configuration and try again'],
        lastChecked: new Date().toISOString()
      };

      this.healthChecks.set(agentId, errorHealth);
      return errorHealth;
    }
  }

  // Check knowledge base health
  private static async checkKnowledgeHealth(agentId: string): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check if retraining is needed
    const retrainingCheck = await RAGRetrainingService.shouldRetrain(agentId);
    if (retrainingCheck.shouldRetrain) {
      if (retrainingCheck.urgency === 'high') {
        status = 'critical';
        issues.push('Critical retraining needed');
        recommendations.push('Schedule immediate retraining');
      } else if (retrainingCheck.urgency === 'medium') {
        status = 'warning';
        issues.push('Retraining recommended');
        recommendations.push('Schedule retraining within 24 hours');
      }
    }

    return { status, issues, recommendations };
  }

  // Check model health
  private static checkModelHealth(agentId: string): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check for model degradation
    const degradation = RAGModelManagement.checkModelDegradation(agentId);
    if (degradation.hasRegression) {
      status = 'warning';
      issues.push('Model performance degradation detected');
      recommendations.push(...degradation.recommendations);
    }

    // Check if models exist for all required types
    const requiredTypes = ['embedding', 'llm'];
    for (const type of requiredTypes) {
      const activeModel = RAGModelManagement.getActiveModel(agentId, type);
      if (!activeModel) {
        status = 'critical';
        issues.push(`No active ${type} model`);
        recommendations.push(`Configure ${type} model for agent`);
      }
    }

    return { status, issues, recommendations };
  }

  // Check performance health
  private static checkPerformanceHealth(agentId: string): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Mock performance data since getAgentPerformance doesn't exist
    // In a real implementation, this would fetch actual performance metrics
    const mockPerformance = {
      averageResponseTime: Math.random() * 3000 + 1000, // 1-4 seconds
      averageRelevanceScore: Math.random() * 0.4 + 0.6  // 0.6-1.0
    };

    // Check response time
    if (mockPerformance.averageResponseTime > 5000) {
      status = 'critical';
      issues.push('Response time too high');
      recommendations.push('Optimize model configuration');
    } else if (mockPerformance.averageResponseTime > 2000) {
      status = 'warning';
      issues.push('Response time elevated');
      recommendations.push('Monitor performance trends');
    }

    // Check relevance score
    if (mockPerformance.averageRelevanceScore < 0.6) {
      status = 'critical';
      issues.push('Low relevance scores');
      recommendations.push('Retrain with better data');
    } else if (mockPerformance.averageRelevanceScore < 0.7) {
      status = 'warning';
      issues.push('Declining relevance scores');
      recommendations.push('Consider knowledge base updates');
    }

    return { status, issues, recommendations };
  }

  // Check infrastructure health
  private static checkInfrastructureHealth(agentId: string): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // This would check actual infrastructure metrics in a real implementation
    // For now, we'll assume healthy infrastructure

    return { status, issues, recommendations };
  }

  // Schedule maintenance task
  static scheduleMaintenanceTask(task: Omit<MaintenanceTask, 'id'>): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullTask: MaintenanceTask = {
      id: taskId,
      ...task
    };

    const tasks = this.maintenanceTasks.get(task.agentId) || [];
    tasks.push(fullTask);
    this.maintenanceTasks.set(task.agentId, tasks);

    console.log('📅 Scheduled maintenance task:', {
      taskId,
      agentId: task.agentId,
      type: task.type,
      priority: task.priority
    });

    return taskId;
  }

  // Get pending maintenance tasks
  static getPendingTasks(agentId: string): MaintenanceTask[] {
    const tasks = this.maintenanceTasks.get(agentId) || [];
    return tasks.filter(t => t.status === 'pending')
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }

  // Execute maintenance task
  static async executeMaintenanceTask(taskId: string): Promise<boolean> {
    // Find the task
    let task: MaintenanceTask | null = null;
    let agentId: string = '';

    for (const [aid, tasks] of this.maintenanceTasks.entries()) {
      const found = tasks.find(t => t.id === taskId);
      if (found) {
        task = found;
        agentId = aid;
        break;
      }
    }

    if (!task) {
      console.error('❌ Maintenance task not found:', taskId);
      return false;
    }

    try {
      task.status = 'in_progress';
      console.log('🔧 Executing maintenance task:', taskId);

      // Execute based on task type
      switch (task.type) {
        case 'retraining':
          await RAGRetrainingService.startRetraining(agentId);
          break;
        case 'model_update':
          await this.updateModels(agentId);
          break;
        case 'knowledge_refresh':
          await this.refreshKnowledge(agentId);
          break;
        case 'performance_optimization':
          await this.optimizePerformance(agentId);
          break;
      }

      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      
      console.log('✅ Maintenance task completed:', taskId);
      return true;

    } catch (error) {
      console.error('❌ Maintenance task failed:', taskId, error);
      task.status = 'failed';
      return false;
    }
  }

  // Auto-schedule maintenance based on health check
  static autoScheduleMaintenance(agentId: string): MaintenanceTask[] {
    const health = this.healthChecks.get(agentId);
    if (!health) return [];

    const scheduledTasks: MaintenanceTask[] = [];

    // Schedule tasks based on health issues
    if (health.components.knowledge === 'critical') {
      const taskId = this.scheduleMaintenanceTask({
        agentId,
        type: 'retraining',
        priority: 'critical',
        description: 'Critical knowledge base issues detected',
        estimatedDuration: 60,
        status: 'pending'
      });
      scheduledTasks.push(this.getTaskById(taskId)!);
    }

    if (health.components.models === 'warning') {
      const taskId = this.scheduleMaintenanceTask({
        agentId,
        type: 'model_update',
        priority: 'medium',
        description: 'Model performance optimization needed',
        estimatedDuration: 30,
        status: 'pending'
      });
      scheduledTasks.push(this.getTaskById(taskId)!);
    }

    if (health.components.performance === 'critical') {
      const taskId = this.scheduleMaintenanceTask({
        agentId,
        type: 'performance_optimization',
        priority: 'high',
        description: 'Critical performance issues detected',
        estimatedDuration: 45,
        status: 'pending'
      });
      scheduledTasks.push(this.getTaskById(taskId)!);
    }

    return scheduledTasks;
  }

  // Utility methods
  private static getTaskById(taskId: string): MaintenanceTask | null {
    for (const tasks of this.maintenanceTasks.values()) {
      const task = tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return null;
  }

  private static async updateModels(agentId: string): Promise<void> {
    // Auto-select best models for the agent
    const embeddingModel = RAGModelManagement.autoSelectBestModel(agentId, 'embedding');
    if (embeddingModel) {
      RAGModelManagement.setActiveModel(agentId, embeddingModel);
    }

    const llmModel = RAGModelManagement.autoSelectBestModel(agentId, 'llm');
    if (llmModel) {
      RAGModelManagement.setActiveModel(agentId, llmModel);
    }
  }

  private static async refreshKnowledge(agentId: string): Promise<void> {
    // Trigger incremental retraining
    await RAGRetrainingService.startRetraining(agentId, { incrementalOnly: true });
  }

  private static async optimizePerformance(agentId: string): Promise<void> {
    // Performance optimization tasks
    console.log('🚀 Optimizing performance for agent:', agentId);
    // This would include cache optimization, model tuning, etc.
  }

  // Get agent lifecycle summary
  static getLifecycleSummary(agentId: string): {
    currentStage: AgentLifecycleStage | null;
    health: AgentHealth | null;
    pendingTasks: MaintenanceTask[];
    stageHistory: AgentLifecycleStage[];
  } {
    return {
      currentStage: this.getCurrentStage(agentId),
      health: this.healthChecks.get(agentId) || null,
      pendingTasks: this.getPendingTasks(agentId),
      stageHistory: this.lifecycleStages.get(agentId) || []
    };
  }
}
