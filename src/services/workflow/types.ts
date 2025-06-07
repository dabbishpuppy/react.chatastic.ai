
export type SourceStatus = 
  | 'CREATED'
  | 'CRAWLING' 
  | 'COMPLETED'
  | 'TRAINING'
  | 'TRAINED'
  | 'PENDING_REMOVAL'
  | 'REMOVED'
  | 'ERROR';

export type PageStatus = 
  | 'CREATED'
  | 'CRAWLING'
  | 'COMPLETED' 
  | 'TRAINING'
  | 'TRAINED'
  | 'PENDING_REMOVAL'
  | 'REMOVED'
  | 'ERROR';

export interface WorkflowEvent {
  id: string;
  source_id: string;
  page_id?: string | null;
  event_type: string;
  from_status?: string | null;
  to_status: string;
  metadata: Record<string, any>;
  created_at: string;
  processed_at?: string | null;
  error_message?: string | null;
}

export interface BackgroundJob {
  id: string;
  job_type: string;
  source_id: string;
  page_id?: string | null;
  job_key: string | null;
  priority: number;
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEventPayload {
  event_id: string;
  source_id: string;
  page_id?: string | null;
  event_type: string;
  to_status: string;
  metadata: Record<string, any>;
}
