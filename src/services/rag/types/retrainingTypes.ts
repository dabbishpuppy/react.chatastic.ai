
export interface DatabaseSource {
  id: string;
  title: string;
  content?: string;
  source_type: string;
  metadata?: Record<string, any>;
}

export interface RetrainingProgress {
  totalSources: number;
  processedSources: number;
  totalChunks: number;
  processedChunks: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentSource?: string;
  errorMessage?: string;
}

export interface SourceProcessingStatus {
  processed: boolean;
  hasAttempted: boolean;
  reason: string;
}

export interface RetrainingStatus {
  needed: boolean;
  unprocessedSources: number;
  reasons: string[];
  status: 'up_to_date' | 'needs_processing' | 'needs_reprocessing' | 'has_failures' | 'no_sources';
  message: string;
  sourceDetails?: Array<{
    id: string;
    title: string;
    type: string;
    reason: string;
    status: string;
  }>;
}
