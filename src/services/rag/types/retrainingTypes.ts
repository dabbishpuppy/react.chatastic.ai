
export interface RetrainingProgress {
  totalSources: number;
  processedSources: number;
  totalChunks: number;
  processedChunks: number;
  currentSource?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface DatabaseSource {
  id: string;
  title: string;
  content: string | null;
  source_type: string;
  metadata: any;
}

export interface RetrainingStatus {
  needed: boolean;
  unprocessedSources: number;
  reasons: string[];
  status: 'up_to_date' | 'needs_processing' | 'needs_reprocessing' | 'no_sources';
  message: string;
}

export interface SourceProcessingStatus {
  processed: boolean;
  hasAttempted: boolean;
  reason: string;
}
