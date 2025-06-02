
export interface ModelVersion {
  id: string;
  agentId: string;
  version: string;
  modelType: 'embedding' | 'llm' | 'reranker';
  modelName: string;
  performance: {
    accuracy: number;
    latency: number;
    throughput: number;
    cost: number;
  };
  metadata: {
    trainingDate: string;
    datasetSize: number;
    hyperparameters: Record<string, any>;
    validationMetrics: Record<string, number>;
  };
  status: 'active' | 'deprecated' | 'testing';
  deployedAt?: string;
  deprecatedAt?: string;
}

export interface ModelComparisonResult {
  modelA: ModelVersion;
  modelB: ModelVersion;
  metrics: {
    accuracyDiff: number;
    latencyDiff: number;
    throughputDiff: number;
    costDiff: number;
  };
  recommendation: 'use_a' | 'use_b' | 'needs_more_testing';
  reasoning: string[];
}

export class RAGModelManagement {
  private static modelVersions = new Map<string, ModelVersion[]>();
  private static activeModels = new Map<string, ModelVersion>();

  // Register a new model version
  static registerModelVersion(model: ModelVersion): void {
    const agentModels = this.modelVersions.get(model.agentId) || [];
    agentModels.push(model);
    this.modelVersions.set(model.agentId, agentModels);

    console.log('📝 Registered model version:', {
      agentId: model.agentId,
      version: model.version,
      modelType: model.modelType,
      modelName: model.modelName
    });
  }

  // Get all model versions for an agent
  static getModelVersions(agentId: string, modelType?: string): ModelVersion[] {
    const models = this.modelVersions.get(agentId) || [];
    return modelType 
      ? models.filter(m => m.modelType === modelType)
      : models;
  }

  // Get active model for agent and type
  static getActiveModel(agentId: string, modelType: string): ModelVersion | null {
    const key = `${agentId}:${modelType}`;
    return this.activeModels.get(key) || null;
  }

  // Set active model
  static setActiveModel(agentId: string, modelVersion: ModelVersion): void {
    const key = `${agentId}:${modelVersion.modelType}`;
    
    // Mark previous model as deprecated
    const currentActive = this.activeModels.get(key);
    if (currentActive) {
      currentActive.status = 'deprecated';
      currentActive.deprecatedAt = new Date().toISOString();
    }

    // Set new active model
    modelVersion.status = 'active';
    modelVersion.deployedAt = new Date().toISOString();
    this.activeModels.set(key, modelVersion);

    console.log('🔄 Set active model:', {
      agentId,
      modelType: modelVersion.modelType,
      version: modelVersion.version
    });
  }

  // Compare two model versions
  static compareModels(modelA: ModelVersion, modelB: ModelVersion): ModelComparisonResult {
    const metrics = {
      accuracyDiff: modelB.performance.accuracy - modelA.performance.accuracy,
      latencyDiff: modelB.performance.latency - modelA.performance.latency,
      throughputDiff: modelB.performance.throughput - modelA.performance.throughput,
      costDiff: modelB.performance.cost - modelA.performance.cost
    };

    const reasoning: string[] = [];
    let recommendation: 'use_a' | 'use_b' | 'needs_more_testing' = 'needs_more_testing';

    // Accuracy comparison
    if (Math.abs(metrics.accuracyDiff) > 0.05) {
      if (metrics.accuracyDiff > 0) {
        reasoning.push(`Model B has ${(metrics.accuracyDiff * 100).toFixed(1)}% better accuracy`);
      } else {
        reasoning.push(`Model A has ${(Math.abs(metrics.accuracyDiff) * 100).toFixed(1)}% better accuracy`);
      }
    }

    // Latency comparison
    if (Math.abs(metrics.latencyDiff) > 50) {
      if (metrics.latencyDiff < 0) {
        reasoning.push(`Model B is ${Math.abs(metrics.latencyDiff)}ms faster`);
      } else {
        reasoning.push(`Model A is ${metrics.latencyDiff}ms faster`);
      }
    }

    // Cost comparison
    if (Math.abs(metrics.costDiff) > 0.1) {
      if (metrics.costDiff < 0) {
        reasoning.push(`Model B is ${Math.abs(metrics.costDiff * 100).toFixed(1)}% cheaper`);
      } else {
        reasoning.push(`Model A is ${(metrics.costDiff * 100).toFixed(1)}% cheaper`);
      }
    }

    // Make recommendation
    const accuracyWeight = 0.4;
    const latencyWeight = 0.3;
    const costWeight = 0.3;

    const scoreA = (modelA.performance.accuracy * accuracyWeight) +
                   ((1000 - modelA.performance.latency) / 1000 * latencyWeight) +
                   ((1 - modelA.performance.cost) * costWeight);

    const scoreB = (modelB.performance.accuracy * accuracyWeight) +
                   ((1000 - modelB.performance.latency) / 1000 * latencyWeight) +
                   ((1 - modelB.performance.cost) * costWeight);

    if (Math.abs(scoreB - scoreA) > 0.1) {
      recommendation = scoreB > scoreA ? 'use_b' : 'use_a';
    }

    return {
      modelA,
      modelB,
      metrics,
      recommendation,
      reasoning
    };
  }

  // Auto-select best model for agent
  static autoSelectBestModel(agentId: string, modelType: string): ModelVersion | null {
    const models = this.getModelVersions(agentId, modelType)
      .filter(m => m.status === 'active' || m.status === 'testing');

    if (models.length === 0) return null;
    if (models.length === 1) return models[0];

    // Find best model based on weighted score
    let bestModel = models[0];
    let bestScore = this.calculateModelScore(bestModel);

    for (let i = 1; i < models.length; i++) {
      const score = this.calculateModelScore(models[i]);
      if (score > bestScore) {
        bestScore = score;
        bestModel = models[i];
      }
    }

    return bestModel;
  }

  private static calculateModelScore(model: ModelVersion): number {
    // Weighted scoring: accuracy (40%), speed (30%), cost efficiency (30%)
    const accuracyScore = model.performance.accuracy;
    const speedScore = Math.max(0, (2000 - model.performance.latency) / 2000);
    const costScore = Math.max(0, (1 - model.performance.cost));

    return (accuracyScore * 0.4) + (speedScore * 0.3) + (costScore * 0.3);
  }

  // Monitor model performance degradation
  static checkModelDegradation(agentId: string): {
    hasRegression: boolean;
    affectedModels: ModelVersion[];
    recommendations: string[];
  } {
    const models = this.getModelVersions(agentId).filter(m => m.status === 'active');
    const affectedModels: ModelVersion[] = [];
    const recommendations: string[] = [];

    for (const model of models) {
      // Check if performance has degraded significantly
      const baselineAccuracy = 0.8; // Could be stored as agent baseline
      if (model.performance.accuracy < baselineAccuracy - 0.1) {
        affectedModels.push(model);
        recommendations.push(`Model ${model.version} accuracy dropped below baseline`);
      }

      // Check latency degradation
      const baselineLatency = 500; // Could be stored as agent baseline
      if (model.performance.latency > baselineLatency * 1.5) {
        affectedModels.push(model);
        recommendations.push(`Model ${model.version} latency increased significantly`);
      }
    }

    return {
      hasRegression: affectedModels.length > 0,
      affectedModels,
      recommendations
    };
  }

  // Export model configuration
  static exportModelConfig(agentId: string): string {
    const models = this.getModelVersions(agentId);
    const activeModels = new Map();

    // Get active models for each type
    for (const model of models) {
      if (model.status === 'active') {
        activeModels.set(model.modelType, model);
      }
    }

    const config = {
      agentId,
      models: Object.fromEntries(activeModels),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(config, null, 2);
  }

  // Import model configuration
  static importModelConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      
      for (const [modelType, model] of Object.entries(config.models)) {
        this.setActiveModel(config.agentId, model as ModelVersion);
      }

      console.log('📥 Imported model configuration for agent:', config.agentId);
      return true;
    } catch (error) {
      console.error('❌ Failed to import model configuration:', error);
      return false;
    }
  }

  // Get model performance trends
  static getPerformanceTrends(agentId: string, modelType: string): {
    dates: string[];
    accuracy: number[];
    latency: number[];
    cost: number[];
  } {
    const models = this.getModelVersions(agentId, modelType)
      .sort((a, b) => new Date(a.metadata.trainingDate).getTime() - new Date(b.metadata.trainingDate).getTime());

    return {
      dates: models.map(m => m.metadata.trainingDate),
      accuracy: models.map(m => m.performance.accuracy),
      latency: models.map(m => m.performance.latency),
      cost: models.map(m => m.performance.cost)
    };
  }
}
