
import { SourcePageRecord } from './types.ts';

export function validateSourcePageRecord(record: any): string[] {
  const errors: string[] = [];
  
  // Required fields
  if (!record.parent_source_id || typeof record.parent_source_id !== 'string') {
    errors.push('parent_source_id must be a non-empty string');
  }
  if (!record.customer_id || typeof record.customer_id !== 'string') {
    errors.push('customer_id must be a non-empty string');
  }
  if (!record.url || typeof record.url !== 'string') {
    errors.push('url must be a non-empty string');
  }
  
  // Text fields that must be strings
  if (record.status && typeof record.status !== 'string') {
    errors.push(`status must be a string, got ${typeof record.status}`);
  }
  if (record.priority && typeof record.priority !== 'string') {
    errors.push(`priority must be a string, got ${typeof record.priority}`);
  }
  if (record.error_message && typeof record.error_message !== 'string') {
    errors.push(`error_message must be a string, got ${typeof record.error_message}`);
  }
  if (record.content_hash && typeof record.content_hash !== 'string') {
    errors.push(`content_hash must be a string, got ${typeof record.content_hash}`);
  }
  
  // Integer fields
  if (record.retry_count !== undefined && (!Number.isInteger(record.retry_count) || record.retry_count < 0)) {
    errors.push(`retry_count must be a non-negative integer, got ${record.retry_count}`);
  }
  if (record.max_retries !== undefined && (!Number.isInteger(record.max_retries) || record.max_retries < 0)) {
    errors.push(`max_retries must be a non-negative integer, got ${record.max_retries}`);
  }
  if (record.content_size !== undefined && (!Number.isInteger(record.content_size) || record.content_size < 0)) {
    errors.push(`content_size must be a non-negative integer, got ${record.content_size}`);
  }
  if (record.chunks_created !== undefined && (!Number.isInteger(record.chunks_created) || record.chunks_created < 0)) {
    errors.push(`chunks_created must be a non-negative integer, got ${record.chunks_created}`);
  }
  if (record.duplicates_found !== undefined && (!Number.isInteger(record.duplicates_found) || record.duplicates_found < 0)) {
    errors.push(`duplicates_found must be a non-negative integer, got ${record.duplicates_found}`);
  }
  if (record.processing_time_ms !== undefined && (!Number.isInteger(record.processing_time_ms) || record.processing_time_ms < 0)) {
    errors.push(`processing_time_ms must be a non-negative integer, got ${record.processing_time_ms}`);
  }
  
  // Real/float fields
  if (record.compression_ratio !== undefined && (typeof record.compression_ratio !== 'number' || record.compression_ratio < 0)) {
    errors.push(`compression_ratio must be a non-negative number, got ${typeof record.compression_ratio}`);
  }
  
  // Timestamp fields
  if (record.created_at && !(record.created_at instanceof Date) && typeof record.created_at !== 'string') {
    errors.push(`created_at must be a Date or ISO string, got ${typeof record.created_at}`);
  }
  if (record.updated_at && !(record.updated_at instanceof Date) && typeof record.updated_at !== 'string') {
    errors.push(`updated_at must be a Date or ISO string, got ${typeof record.updated_at}`);
  }
  if (record.started_at && !(record.started_at instanceof Date) && typeof record.started_at !== 'string') {
    errors.push(`started_at must be a Date or ISO string, got ${typeof record.started_at}`);
  }
  if (record.completed_at && !(record.completed_at instanceof Date) && typeof record.completed_at !== 'string') {
    errors.push(`completed_at must be a Date or ISO string, got ${typeof record.completed_at}`);
  }
  
  return errors;
}
