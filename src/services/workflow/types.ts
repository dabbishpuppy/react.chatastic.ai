
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
  page_id?: string;
  event_type: string;
  from_status?: string;
  to_status: string;
  metadata: Record<string, any>;
  created_at: string;
  processed_at?: string;
  error_message?: string;
}

export interface BackgroundJob {
  id: string;
  job_type: string;
  source_id: string;
  page_id?: string;
  job_key: string;
  priority: number;
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEventPayload {
  event_id: string;
  source_id: string;
  page_id?: string;
  event_type: string;
  to_status: string;
  metadata: Record<string, any>;
}
